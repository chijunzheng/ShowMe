/**
 * Graph Migration Utility
 *
 * Converts existing topic data to the new Knowledge Graph format.
 * Preserves learning progress, quiz scores, and relationships.
 *
 * Migration is idempotent - safe to run multiple times.
 * Old data is preserved as backup and not deleted.
 */

import { calculateBrightness } from '../types/knowledgeGraph'
import logger from './logger.js'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Storage key suffix for backup during migration
 */
const MIGRATION_BACKUP_SUFFIX = '_backup'

/**
 * Explorer rank definitions (duplicated for JS context)
 * Matches the TypeScript definitions in knowledgeGraph.ts
 */
const EXPLORER_RANKS = [
  { level: 1, title: 'Stargazer', icon: '\u{1F52D}', minTopics: 0 },
  { level: 2, title: 'Space Cadet', icon: '\u{1F680}', minTopics: 3 },
  { level: 3, title: 'Navigator', icon: '\u{1F9ED}', minTopics: 8 },
  { level: 4, title: 'Explorer', icon: '\u{1F30C}', minTopics: 15 },
  { level: 5, title: 'Voyager', icon: '\u{1F6F8}', minTopics: 25 },
  { level: 6, title: 'Astronaut', icon: '\u{1F9D1}\u{200D}\u{1F680}', minTopics: 38 },
  { level: 7, title: 'Pioneer', icon: '\u{2B50}', minTopics: 52 },
  { level: 8, title: 'Star Captain', icon: '\u{1F6F0}\u{FE0F}', minTopics: 68 },
  { level: 9, title: 'Celestial Sage', icon: '\u{1F320}', minTopics: 84 },
  { level: 10, title: 'Cosmic Pioneer', icon: '\u{1FA90}', minTopics: 100 },
  { level: 11, title: 'Galactic Legend', icon: '\u{1F30C}', minTopics: 110 },
  { level: 12, title: 'Legendary Luminary', icon: '\u{2600}\u{FE0F}', minTopics: 120 },
]

/**
 * Cluster configuration for category-based grouping
 */
const CLUSTER_CONFIG = {
  mathematics: { icon: '\u{1F522}', color: '#3B82F6' },
  science: { icon: '\u{1F52C}', color: '#10B981' },
  history: { icon: '\u{1F4DC}', color: '#F59E0B' },
  geography: { icon: '\u{1F30D}', color: '#06B6D4' },
  language: { icon: '\u{1F4DA}', color: '#8B5CF6' },
  arts: { icon: '\u{1F3A8}', color: '#EC4899' },
  technology: { icon: '\u{1F4BB}', color: '#6366F1' },
  astronomy: { icon: '\u{1F30C}', color: '#7C3AED' },
  nature: { icon: '\u{1F33F}', color: '#22C55E' },
  civilization: { icon: '\u{1F3DB}\u{FE0F}', color: '#F59E0B' },
  arcane: { icon: '\u{1F52E}', color: '#8B5CF6' },
  general: { icon: '\u{1F4A1}', color: '#64748B' },
}

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generate a unique ID for nodes and edges
 *
 * @param {string} prefix - Prefix for the ID (e.g., 'node', 'edge')
 * @returns {string} Unique identifier
 */
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// ============================================================================
// CONCEPT EXTRACTION
// ============================================================================

/**
 * Extract key concepts from topic slides.
 * Analyzes slide content to identify main concepts covered.
 *
 * @param {Object} topic - Topic object with slides
 * @returns {string[]} Array of concept strings (max 10)
 */
export function extractConcepts(topic) {
  if (!topic) {
    return []
  }

  const concepts = new Set()

  // Extract from topic name
  if (topic.topicName || topic.name) {
    const name = topic.topicName || topic.name
    const words = name.toLowerCase().split(/\s+/)
    words.forEach((word) => {
      // Only include words longer than 3 characters
      if (word.length > 3 && isValidConceptWord(word)) {
        concepts.add(word)
      }
    })
  }

  // Extract from slide titles and content
  if (Array.isArray(topic.slides)) {
    topic.slides.forEach((slide) => {
      if (!slide) return

      // Get concepts from slide title
      if (slide.title) {
        const titleWords = slide.title.toLowerCase().split(/\s+/)
        titleWords.forEach((word) => {
          if (word.length > 4 && isValidConceptWord(word)) {
            concepts.add(word)
          }
        })
      }

      // Get key terms from narration (look for emphasized terms)
      if (slide.narration || slide.subtitle) {
        const text = slide.narration || slide.subtitle
        const textLower = text.toLowerCase()
        // Extract potential key terms (nouns, technical terms)
        const matches = textLower.match(/\b[a-z]{5,}\b/g) || []
        matches.forEach((term) => {
          if (isValidConceptWord(term)) {
            concepts.add(term)
          }
        })
      }
    })
  }

  // Limit to top 10 most relevant concepts
  return Array.from(concepts).slice(0, 10)
}

/**
 * Check if a word is a valid concept (not a common stop word)
 *
 * @param {string} word - Word to check
 * @returns {boolean} Whether the word is a valid concept
 */
function isValidConceptWord(word) {
  const stopWords = new Set([
    'about', 'above', 'after', 'again', 'against', 'being', 'below',
    'between', 'could', 'during', 'every', 'from', 'further', 'having',
    'itself', 'might', 'other', 'should', 'their', 'there', 'these',
    'those', 'through', 'under', 'until', 'where', 'which', 'while',
    'would', 'yourself', 'because', 'before', 'called', 'really',
  ])
  return !stopWords.has(word)
}

// ============================================================================
// MASTERY CALCULATION
// ============================================================================

/**
 * Calculate mastery level from quiz performance.
 * Checks multiple possible locations for quiz data.
 *
 * @param {Object} topic - Topic with quiz data
 * @returns {number} 0-1 mastery score
 */
export function calculateMastery(topic) {
  if (!topic) {
    return 0.25
  }

  const scores = []

  // Check direct quizScore property (0-100 or 0-1)
  if (typeof topic.quizScore === 'number') {
    // Normalize if score is 0-100 range
    const score = topic.quizScore > 1 ? topic.quizScore / 100 : topic.quizScore
    scores.push(Math.max(0, Math.min(1, score)))
  }

  // Check quizResults object
  if (topic.quizResults && typeof topic.quizResults.score === 'number') {
    const score = topic.quizResults.score > 1
      ? topic.quizResults.score / 100
      : topic.quizResults.score
    scores.push(Math.max(0, Math.min(1, score)))
  }

  // Check mastery property directly
  if (typeof topic.mastery === 'number') {
    const score = topic.mastery > 1 ? topic.mastery / 100 : topic.mastery
    scores.push(Math.max(0, Math.min(1, score)))
  }

  // Check correctAnswers / totalQuestions
  if (
    typeof topic.correctAnswers === 'number' &&
    typeof topic.totalQuestions === 'number' &&
    topic.totalQuestions > 0
  ) {
    scores.push(topic.correctAnswers / topic.totalQuestions)
  }

  // If no quiz data found, use default based on whether topic has been viewed
  if (scores.length === 0) {
    // If topic has slides, assume some basic familiarity
    const hasSlides = Array.isArray(topic.slides) && topic.slides.length > 0
    return hasSlides ? 0.25 : 0
  }

  // Average all available scores
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

/**
 * Calculate brightness level from mastery score.
 * Wrapper for the TypeScript function with additional validation.
 *
 * @param {number} mastery - 0-1 mastery score
 * @returns {'dim' | 'glow' | 'bright' | 'brilliant'} Brightness level
 */
export function calculateBrightnessFromMastery(mastery) {
  // Validate input
  if (typeof mastery !== 'number' || Number.isNaN(mastery)) {
    return 'dim'
  }

  // Use the TypeScript utility function
  return calculateBrightness(mastery)
}

// ============================================================================
// CATEGORY DETERMINATION
// ============================================================================

/**
 * Determine category from topic data.
 * Maps old zone/category to new cluster categories.
 *
 * @param {Object} topic - Topic object
 * @returns {string} Category name
 */
export function determineCategory(topic) {
  if (!topic) {
    return 'general'
  }

  // Check existing category/zone
  if (topic.category) {
    const normalized = topic.category.toLowerCase()
    if (CLUSTER_CONFIG[normalized]) {
      return normalized
    }
  }

  if (topic.zone) {
    const normalized = topic.zone.toLowerCase()
    if (CLUSTER_CONFIG[normalized]) {
      return normalized
    }
  }

  // Try to infer from topic name
  const name = (topic.topicName || topic.name || '').toLowerCase()

  // Category inference based on keywords
  // Order matters - more specific patterns first to avoid false matches
  // (e.g., "software" matches before "war" in history)
  if (/\b(tech|computer|program|code|software|internet|robot)\b/.test(name)) {
    return 'technology'
  }
  if (/\b(math|number|calcul|algebra|geometry|arithmetic|equation)\b/.test(name)) {
    return 'mathematics'
  }
  if (/\b(science|physics|biology|molecule|cell)\b|chem|atom/.test(name)) {
    return 'science'
  }
  if (/\b(history|ancient|civilization|empire|dynasty|medieval)\b|\bwar\b/.test(name)) {
    return 'history'
  }
  if (/\b(geography|country|continent|ocean|river|mountain|climate)\b/.test(name)) {
    return 'geography'
  }
  if (/\b(language|grammar|writing|reading|literature|poem|story)\b/.test(name)) {
    return 'language'
  }
  if (/\b(art|music|paint|draw|sculpture|composer|artist)\b/.test(name)) {
    return 'arts'
  }
  if (/\b(space|planet|star|galaxy|universe|asteroid|comet|orbit)\b/.test(name)) {
    return 'astronomy'
  }
  if (/\b(animal|plant|nature|environment|ecosystem|forest|ocean)\b/.test(name)) {
    return 'nature'
  }

  return 'general'
}

// ============================================================================
// FOLLOW-UP EXTRACTION
// ============================================================================

/**
 * Extract follow-up IDs from topic slides.
 *
 * @param {Object} topic - Topic with slides
 * @returns {string[]} Array of follow-up IDs
 */
function extractFollowUpIds(topic) {
  if (!topic || !Array.isArray(topic.slides)) {
    return []
  }

  const followUpIds = new Set()

  topic.slides.forEach((slide) => {
    if (!slide) return

    // Check for isFollowUp marker with followUpId
    if (slide.isFollowUp && slide.followUpId) {
      followUpIds.add(slide.followUpId)
    }

    // Check for parentId (this slide is a child)
    if (slide.parentId) {
      followUpIds.add(slide.parentId)
    }

    // Check for followUpQuestion marker
    if (slide.followUpQuestion) {
      const slideId = slide.id || slide.followUpId
      if (slideId) {
        followUpIds.add(slideId)
      }
    }
  })

  return Array.from(followUpIds)
}

// ============================================================================
// NODE CONVERSION
// ============================================================================

/**
 * Convert a single topic to a KnowledgeNode.
 *
 * @param {Object} topic - Old topic format
 * @returns {Object} KnowledgeNode object
 */
export function topicToNode(topic) {
  if (!topic) {
    return null
  }

  const now = Date.now()
  const mastery = calculateMastery(topic)

  return {
    id: topic.id || topic.topicId || generateId('node'),
    name: topic.topicName || topic.name || 'Unknown Topic',
    concepts: extractConcepts(topic),
    mastery,
    brightness: calculateBrightnessFromMastery(mastery),
    position: null, // Will be set by layout algorithm
    followUps: extractFollowUpIds(topic),
    unlockedAt: topic.createdAt || topic.unlockedAt || now,
    lastReviewedAt: topic.lastAccessedAt || topic.lastReviewedAt || now,
    category: determineCategory(topic),
  }
}

// ============================================================================
// EDGE CREATION
// ============================================================================

/**
 * Create basic edges from related topics.
 * These are initial edges that will be refined by Gemini later.
 *
 * @param {Object[]} topics - Array of old topics
 * @param {Object[]} nodes - Converted nodes
 * @returns {Object[]} Initial edges
 */
export function createInitialEdges(topics, nodes) {
  if (!Array.isArray(topics) || !Array.isArray(nodes)) {
    return []
  }

  const edges = []
  const nodeMap = new Map(nodes.map((n) => [n.name.toLowerCase(), n]))
  const nodeIdMap = new Map(nodes.map((n) => [n.id, n]))

  topics.forEach((topic) => {
    if (!topic) return

    const topicName = (topic.topicName || topic.name || '').toLowerCase()
    const sourceNode = nodeMap.get(topicName) || nodeIdMap.get(topic.id)
    if (!sourceNode) return

    // Create edges from relatedTopics array
    const related = topic.relatedTopics || []
    related.forEach((relatedName) => {
      if (!relatedName) return

      const targetNode = nodeMap.get(relatedName.toLowerCase())
      if (targetNode && sourceNode.id !== targetNode.id) {
        edges.push({
          id: `edge_${sourceNode.id}_${targetNode.id}`,
          from: sourceNode.id,
          to: targetNode.id,
          type: 'extends', // Default type, Gemini will refine
          strength: 0.5, // Medium confidence until Gemini confirms
          discovered: true, // User already explored these
          explanation: 'Migrated relationship',
        })
      }
    })

    // Create edges for follow-ups
    sourceNode.followUps.forEach((followUpId) => {
      const followUpNode = nodeIdMap.get(followUpId)
      if (followUpNode) {
        edges.push({
          id: `edge_${sourceNode.id}_${followUpNode.id}`,
          from: sourceNode.id,
          to: followUpNode.id,
          type: 'extends',
          strength: 0.8, // Strong - direct follow-up
          discovered: true,
          explanation: 'Follow-up question',
        })
      }
    })
  })

  // Deduplicate edges (keep first occurrence)
  const edgeMap = new Map()
  edges.forEach((edge) => {
    // Create a normalized key that treats A->B and B->A as the same
    const sortedIds = [edge.from, edge.to].sort()
    const key = `${sortedIds[0]}-${sortedIds[1]}`
    if (!edgeMap.has(key)) {
      edgeMap.set(key, edge)
    }
  })

  return Array.from(edgeMap.values())
}

// ============================================================================
// CLUSTER CREATION
// ============================================================================

/**
 * Create initial clusters by category.
 * Groups nodes by their category into clusters.
 *
 * @param {Object[]} nodes - All nodes
 * @returns {Object[]} Initial clusters
 */
export function createInitialClusters(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return []
  }

  const categoryMap = new Map()

  nodes.forEach((node) => {
    if (!node) return
    const category = node.category || 'general'
    if (!categoryMap.has(category)) {
      categoryMap.set(category, [])
    }
    categoryMap.get(category).push(node.id)
  })

  const clusters = []
  categoryMap.forEach((nodeIds, category) => {
    const config = CLUSTER_CONFIG[category] || CLUSTER_CONFIG.general
    clusters.push({
      id: `cluster_${category}`,
      name: category.charAt(0).toUpperCase() + category.slice(1),
      icon: config.icon,
      nodeIds,
      color: config.color,
    })
  })

  return clusters
}

// ============================================================================
// EXPLORER RANK CALCULATION
// ============================================================================

/**
 * Calculate explorer rank from topic count.
 *
 * @param {number} topicCount - Number of topics
 * @returns {Object} ExplorerRank object
 */
function calculateExplorerRankFromCount(topicCount) {
  // Validate input
  const count = typeof topicCount === 'number' && topicCount >= 0 ? topicCount : 0

  let currentRank = EXPLORER_RANKS[0]
  let nextRank = EXPLORER_RANKS[1] || null

  for (let i = EXPLORER_RANKS.length - 1; i >= 0; i--) {
    if (count >= EXPLORER_RANKS[i].minTopics) {
      currentRank = EXPLORER_RANKS[i]
      nextRank = EXPLORER_RANKS[i + 1] || null
      break
    }
  }

  return {
    level: currentRank.level,
    title: currentRank.title,
    icon: currentRank.icon,
    topicsToNextRank: nextRank ? Math.max(0, nextRank.minTopics - count) : 0,
  }
}

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

/**
 * Migrate full topic data to Knowledge Graph format.
 *
 * @param {Object[]} oldTopics - Array of old topic objects
 * @returns {Object} KnowledgeGraph object
 */
export function migrateToGraphModel(oldTopics) {
  // Handle empty or invalid input
  if (!Array.isArray(oldTopics) || oldTopics.length === 0) {
    logger.debug('STORAGE', 'Migration: No topics to migrate')
    return {
      nodes: [],
      edges: [],
      clusters: [],
      gaps: [],
      explorerRank: calculateExplorerRankFromCount(0),
    }
  }

  logger.info('STORAGE', 'Starting graph migration', {
    topicCount: oldTopics.length,
  })

  // Convert topics to nodes (filter out any null results)
  const nodes = oldTopics
    .map((topic) => topicToNode(topic))
    .filter((node) => node !== null)

  // Create edges from relationships
  const edges = createInitialEdges(oldTopics, nodes)

  // Create clusters by category
  const clusters = createInitialClusters(nodes)

  // Calculate explorer rank
  const explorerRank = calculateExplorerRankFromCount(nodes.length)

  logger.info('STORAGE', 'Graph migration complete', {
    nodesCount: nodes.length,
    edgesCount: edges.length,
    clustersCount: clusters.length,
  })

  return {
    nodes,
    edges,
    clusters,
    gaps: [], // Gaps will be populated by Gemini later
    explorerRank,
  }
}

// ============================================================================
// MIGRATION DETECTION
// ============================================================================

/**
 * Check if data needs migration.
 * Returns true if the data is in old format.
 *
 * @param {any} data - Stored data
 * @returns {boolean} Whether migration is needed
 */
export function needsMigration(data) {
  // Empty data doesn't need migration
  if (!data) {
    return false
  }

  // If it's already a graph format with expected fields
  if (data.nodes && data.edges && data.clusters) {
    return false
  }

  // If it's an array of topics (old format)
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0]
    // Check if first item looks like old topic format
    return Boolean(first && (first.topicName || first.name || first.slides))
  }

  // Check for wrapped format { topics: [...] }
  if (data.topics && Array.isArray(data.topics) && data.topics.length > 0) {
    const first = data.topics[0]
    return Boolean(first && (first.topicName || first.name || first.slides))
  }

  return false
}

// ============================================================================
// STORAGE MIGRATION
// ============================================================================

/**
 * Migrate data from localStorage.
 * Reads old format and writes new format back.
 * Keeps backup of old data.
 *
 * @param {string} storageKey - localStorage key for topics
 * @returns {{ migrated: boolean, graph: Object | null, error: string | null }}
 */
export function migrateFromStorage(storageKey = 'showme_topics') {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      logger.debug('STORAGE', 'No data to migrate from storage key', { storageKey })
      return { migrated: false, graph: null, error: null }
    }

    let data
    try {
      data = JSON.parse(raw)
    } catch (parseError) {
      logger.error('STORAGE', 'Failed to parse storage data', {
        storageKey,
        error: parseError.message,
      })
      return { migrated: false, graph: null, error: 'Failed to parse storage data' }
    }

    // Check if migration is needed
    if (!needsMigration(data)) {
      // Already in new format or empty
      if (data.nodes) {
        logger.debug('STORAGE', 'Data already in graph format')
        return { migrated: false, graph: data, error: null }
      }
      logger.debug('STORAGE', 'No migration needed')
      return { migrated: false, graph: null, error: null }
    }

    // Extract topics from various formats
    let topics
    if (Array.isArray(data)) {
      topics = data
    } else if (data.topics && Array.isArray(data.topics)) {
      topics = data.topics
    } else {
      logger.warn('STORAGE', 'Unexpected data format, cannot extract topics')
      return { migrated: false, graph: null, error: 'Unexpected data format' }
    }

    // Perform migration
    const graph = migrateToGraphModel(topics)

    // Save migrated data to new storage key
    const graphStorageKey = `${storageKey}_graph`
    localStorage.setItem(graphStorageKey, JSON.stringify(graph))

    // Keep backup of old data (don't delete original)
    const backupKey = `${storageKey}${MIGRATION_BACKUP_SUFFIX}`
    localStorage.setItem(backupKey, raw)

    logger.info('STORAGE', 'Migration complete, data backed up', {
      graphStorageKey,
      backupKey,
      nodesCount: graph.nodes.length,
    })

    return { migrated: true, graph, error: null }
  } catch (error) {
    logger.error('STORAGE', 'Migration failed with error', {
      error: error.message,
    })
    return { migrated: false, graph: null, error: error.message }
  }
}

/**
 * Rollback migration by removing the new format data.
 * Does NOT restore old data (it was never deleted).
 *
 * @param {string} storageKey - Original localStorage key
 */
export function rollbackMigration(storageKey = 'showme_topics') {
  try {
    const graphStorageKey = `${storageKey}_graph`
    localStorage.removeItem(graphStorageKey)
    logger.info('STORAGE', 'Migration rolled back', { graphStorageKey })
  } catch (error) {
    logger.error('STORAGE', 'Rollback failed', { error: error.message })
  }
}

/**
 * Check if a valid graph exists in storage.
 *
 * @param {string} storageKey - Original localStorage key
 * @returns {boolean} Whether a valid graph exists
 */
export function hasGraphInStorage(storageKey = 'showme_topics') {
  try {
    const graphStorageKey = `${storageKey}_graph`
    const raw = localStorage.getItem(graphStorageKey)
    if (!raw) {
      return false
    }
    const data = JSON.parse(raw)
    return Boolean(data && data.nodes && data.edges && data.clusters)
  } catch {
    return false
  }
}

/**
 * Load the graph from storage.
 *
 * @param {string} storageKey - Original localStorage key
 * @returns {Object | null} KnowledgeGraph or null
 */
export function loadGraphFromStorage(storageKey = 'showme_topics') {
  try {
    const graphStorageKey = `${storageKey}_graph`
    const raw = localStorage.getItem(graphStorageKey)
    if (!raw) {
      return null
    }
    const data = JSON.parse(raw)
    if (data && data.nodes && data.edges && data.clusters) {
      return data
    }
    return null
  } catch (error) {
    logger.error('STORAGE', 'Failed to load graph from storage', {
      error: error.message,
    })
    return null
  }
}

/**
 * Save the graph to storage.
 *
 * @param {Object} graph - KnowledgeGraph object
 * @param {string} storageKey - Original localStorage key
 * @returns {boolean} Whether save succeeded
 */
export function saveGraphToStorage(graph, storageKey = 'showme_topics') {
  if (!graph || !graph.nodes || !graph.edges || !graph.clusters) {
    logger.warn('STORAGE', 'Invalid graph structure, not saving')
    return false
  }

  try {
    const graphStorageKey = `${storageKey}_graph`
    localStorage.setItem(graphStorageKey, JSON.stringify(graph))
    logger.debug('STORAGE', 'Graph saved to storage', {
      nodesCount: graph.nodes.length,
    })
    return true
  } catch (error) {
    logger.error('STORAGE', 'Failed to save graph to storage', {
      error: error.message,
    })
    return false
  }
}
