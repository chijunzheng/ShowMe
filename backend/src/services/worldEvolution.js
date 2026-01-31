/**
 * World Evolution Service
 * Living World feature: Manages world state and orchestrates evolution
 *
 * The world transforms as users learn topics:
 * - Topics are classified by zone (nature, civilization, arcane)
 * - Each topic affects a specific terrain type and composition layer
 * - The world evolves through tiers based on total topics learned
 *
 * Data Schema (evolutionWorldState):
 * - clientId: string
 * - worldImageUrl: string | null
 * - styleDescriptor: string (base style for image generation)
 * - compositionMap: { sky, background, midground, foreground }
 * - ecosystems: array of connected topic groups
 * - interconnections: array of cross-topic relationships
 * - tier: 'barren' | 'sprouting' | 'growing' | 'thriving' | 'legendary'
 * - totalTopics: number
 * - createdAt: Date
 * - updatedAt: Date
 */

import logger from '../utils/logger.js'

/**
 * World style descriptor for consistent visual generation
 */
export const WORLD_STYLE = {
  base: 'Whimsical illustrated landscape in soft watercolor style, ' +
    'fantasy world-building aesthetic, warm natural lighting, ' +
    'cohesive color palette with earth tones and subtle magical accents'
}

/**
 * Composition layer states and their progressions
 * Each layer can evolve from barren to lush as topics are added
 */
export const COMPOSITION_STATES = {
  sky: {
    initial: 'overcast',
    states: ['overcast', 'clearing', 'partly_cloudy', 'clear_blue', 'magical_aurora']
  },
  background: {
    initial: 'barren_hills',
    states: ['barren_hills', 'rocky_peaks', 'forested_mountains', 'snow_capped_peaks', 'floating_islands']
  },
  midground: {
    initial: 'empty_plains',
    states: ['empty_plains', 'scattered_brush', 'meadow_flowers', 'lush_forest', 'enchanted_grove']
  },
  foreground: {
    initial: 'cracked_earth',
    states: ['cracked_earth', 'muddy_ground', 'grassy_field', 'flowing_streams', 'crystal_waters']
  }
}

/**
 * Tier thresholds based on topic count
 */
const TIER_THRESHOLDS = {
  barren: 0,
  sprouting: 5,
  growing: 15,
  thriving: 30,
  legendary: 50
}

/**
 * Zone classification keywords
 * Used to determine which zone a topic belongs to
 */
const ZONE_KEYWORDS = {
  nature: [
    'ocean', 'sea', 'water', 'river', 'lake', 'pond', 'coral', 'reef', 'marine',
    'octopus', 'cephalopod', 'chromatophore',
    'forest', 'tree', 'plant', 'flower', 'grass', 'jungle', 'rainforest', 'woods',
    'mountain', 'volcano', 'earthquake', 'rock', 'mineral', 'cave', 'canyon',
    'weather', 'storm', 'rain', 'snow', 'wind', 'cloud', 'thunder', 'lightning',
    'animal', 'bird', 'fish', 'insect', 'mammal', 'reptile', 'amphibian',
    'desert', 'sahara', 'dune', 'oasis', 'cactus',
    'ecosystem', 'habitat', 'biome', 'nature', 'wildlife', 'environment',
    'photosynthesis', 'life', 'biology', 'evolution', 'species', 'butterfly',
    'dinosaur', 'prehistoric', 'fossil'
  ],
  civilization: [
    'empire', 'kingdom', 'nation', 'country', 'city', 'town', 'village',
    'ancient', 'egypt', 'rome', 'roman', 'greek', 'greece', 'china', 'chinese',
    'maya', 'aztec', 'inca', 'mesopotamia', 'babylon', 'persia',
    'pyramid', 'temple', 'palace', 'castle', 'fortress', 'wall', 'monument',
    'war', 'battle', 'army', 'soldier', 'weapon', 'armor',
    'king', 'queen', 'emperor', 'pharaoh', 'ruler', 'dynasty',
    'architecture', 'building', 'construction', 'structure', 'bridge',
    'invention', 'technology', 'machine', 'industry', 'factory',
    'culture', 'art', 'music', 'literature', 'history', 'civilization'
  ],
  arcane: [
    'quantum', 'particle', 'atom', 'electron', 'proton', 'neutron', 'quark',
    'physics', 'relativity', 'spacetime', 'dimension', 'string theory',
    'black hole', 'singularity', 'wormhole', 'dark matter', 'dark energy',
    'mathematics', 'equation', 'theorem', 'infinity', 'calculus',
    'philosophy', 'consciousness', 'mind', 'thought', 'abstract',
    'cosmic', 'universe', 'multiverse', 'parallel', 'alternate',
    'energy', 'force', 'field', 'wave', 'frequency', 'vibration',
    'dna', 'genetics', 'genome', 'molecular', 'cellular',
    'artificial intelligence', 'neural', 'algorithm', 'code', 'programming'
  ]
}

/**
 * Terrain effect keywords
 * Used to determine which terrain type a topic affects
 */
const TERRAIN_KEYWORDS = {
  water: ['ocean', 'sea', 'water', 'river', 'lake', 'pond', 'coral', 'reef', 'marine', 'stream', 'waterfall', 'aquatic', 'octopus', 'cephalopod', 'tide', 'tidal'],
  mountains: ['mountain', 'volcano', 'peak', 'ridge', 'cliff', 'rock', 'everest', 'alps', 'himalaya', 'cave', 'canyon'],
  forest: ['forest', 'tree', 'wood', 'jungle', 'rainforest', 'grove', 'oak', 'pine', 'leaf', 'branch', 'botanical'],
  desert: ['desert', 'sahara', 'dune', 'sand', 'arid', 'dry', 'oasis', 'cactus', 'scorching'],
  weather: ['weather', 'storm', 'rain', 'snow', 'wind', 'cloud', 'thunder', 'lightning', 'hurricane', 'tornado', 'sky', 'atmosphere'],
  life: ['life', 'animal', 'creature', 'species', 'biology', 'ecosystem', 'habitat', 'wildlife', 'photosynthesis', 'evolution', 'butterfly', 'dinosaur', 'octopus', 'cephalopod', 'chromatophore'],
  structure: ['building', 'structure', 'architecture', 'temple', 'pyramid', 'palace', 'castle', 'fortress', 'monument', 'city', 'town', 'empire', 'roman', 'egypt', 'ancient'],
  abstract: ['quantum', 'physics', 'mathematics', 'philosophy', 'abstract', 'cosmic', 'universe', 'black hole', 'dimension', 'energy', 'consciousness', 'theory']
}

/**
 * Composition layer assignment based on terrain effect
 */
const TERRAIN_TO_LAYER = {
  weather: 'sky',
  mountains: 'background',
  forest: 'midground',
  life: 'midground',
  structure: 'midground',
  desert: 'background',
  water: 'foreground',
  abstract: 'sky'
}

/**
 * In-memory store for evolution world state
 * In production, this would use Firestore like worldState.js
 */
const evolutionWorldStates = new Map()

/**
 * Create a new initial world state for a client
 * @param {string} clientId - Unique client identifier
 * @returns {Object} Initial world state object
 */
export function createInitialWorldState(clientId) {
  const now = new Date()

  return {
    clientId,
    worldImageUrl: null,
    styleDescriptor: WORLD_STYLE.base,
    topicsLearned: [],
    terrainProgress: {},
    compositionMap: {
      sky: { state: COMPOSITION_STATES.sky.initial, topics: [] },
      background: { state: COMPOSITION_STATES.background.initial, topics: [] },
      midground: { state: COMPOSITION_STATES.midground.initial, topics: [] },
      foreground: { state: COMPOSITION_STATES.foreground.initial, topics: [] }
    },
    ecosystems: [],
    interconnections: [],
    tier: 'barren',
    totalTopics: 0,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Count keyword matches in text
 * @param {string} text - Text to search
 * @param {string[]} keywords - Keywords to match
 * @returns {number} Number of matches
 */
function countKeywordMatches(text, keywords) {
  const lowerText = text.toLowerCase()
  let count = 0

  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      count++
    }
  }

  return count
}

/**
 * Extract keywords from topic and summary
 * @param {string} topicName - Topic name
 * @param {string} summary - Topic summary
 * @returns {string[]} Extracted keywords
 */
function extractKeywords(topicName, summary) {
  const text = `${topicName} ${summary || ''}`.toLowerCase()
  const keywords = []

  // Add topic name words
  const topicWords = topicName.toLowerCase().split(/\s+/)
  keywords.push(...topicWords.filter(w => w.length > 2))

  // Add significant words from summary
  if (summary) {
    const summaryWords = summary.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)

    // Filter out common words
    const commonWords = ['that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'about', 'which', 'when', 'what', 'where', 'there']
    const significantWords = summaryWords.filter(w => !commonWords.includes(w))

    keywords.push(...significantWords.slice(0, 10))
  }

  // Deduplicate
  return [...new Set(keywords)]
}

/**
 * Classify a topic's effect on the world
 * Determines zone, terrain effect, composition layer, and keywords
 *
 * @param {string} topicName - Name of the topic
 * @param {string} summary - Summary or description of the topic
 * @returns {{
 *   zone: 'nature' | 'civilization' | 'arcane',
 *   terrainEffect: 'water' | 'mountains' | 'forest' | 'desert' | 'weather' | 'life' | 'structure' | 'abstract',
 *   compositionLayer: 'sky' | 'background' | 'midground' | 'foreground',
 *   keywords: string[]
 * }}
 */
export function classifyTopicEffect(topicName, summary) {
  const text = `${topicName} ${summary || ''}`.toLowerCase()

  // Determine zone by counting keyword matches
  const zoneScores = {
    nature: countKeywordMatches(text, ZONE_KEYWORDS.nature),
    civilization: countKeywordMatches(text, ZONE_KEYWORDS.civilization),
    arcane: countKeywordMatches(text, ZONE_KEYWORDS.arcane)
  }

  // Find zone with highest score, default to nature
  let zone = 'nature'
  let maxScore = 0
  for (const [zoneName, score] of Object.entries(zoneScores)) {
    if (score > maxScore) {
      maxScore = score
      zone = zoneName
    }
  }

  // Determine terrain effect
  const terrainScores = {}
  for (const [terrainType, keywords] of Object.entries(TERRAIN_KEYWORDS)) {
    terrainScores[terrainType] = countKeywordMatches(text, keywords)
  }

  let terrainEffect = 'life' // Default
  let maxTerrainScore = 0
  for (const [terrainType, score] of Object.entries(terrainScores)) {
    if (score > maxTerrainScore) {
      maxTerrainScore = score
      terrainEffect = terrainType
    }
  }

  // Override terrain for arcane zone
  if (zone === 'arcane') {
    terrainEffect = 'abstract'
  }

  // Determine composition layer
  const compositionLayer = TERRAIN_TO_LAYER[terrainEffect] || 'midground'

  // Extract keywords
  const keywords = extractKeywords(topicName, summary)

  return {
    zone,
    terrainEffect,
    compositionLayer,
    keywords
  }
}

/**
 * Calculate world tier based on total topic count
 * @param {number} totalTopics - Total number of topics completed
 * @returns {'barren' | 'sprouting' | 'growing' | 'thriving' | 'legendary'}
 */
export function calculateTier(totalTopics) {
  // Handle edge cases
  if (totalTopics < 0) {
    return 'barren'
  }

  if (totalTopics >= TIER_THRESHOLDS.legendary) {
    return 'legendary'
  }
  if (totalTopics >= TIER_THRESHOLDS.thriving) {
    return 'thriving'
  }
  if (totalTopics >= TIER_THRESHOLDS.growing) {
    return 'growing'
  }
  if (totalTopics >= TIER_THRESHOLDS.sprouting) {
    return 'sprouting'
  }

  return 'barren'
}

/**
 * Get world state for a client, creating a new one if it doesn't exist
 * @param {string} clientId - Unique client identifier
 * @returns {Object} World state object
 */
function getOrCreateWorldState(clientId) {
  if (!evolutionWorldStates.has(clientId)) {
    const initialState = createInitialWorldState(clientId)
    evolutionWorldStates.set(clientId, initialState)
  }

  return evolutionWorldStates.get(clientId)
}

/**
 * Update composition layer state based on topic count
 * @param {Object} compositionMap - Current composition map
 * @param {string} layer - Layer to potentially update
 * @param {number} topicCount - Number of topics affecting this layer
 * @returns {string} New state for the layer
 */
function getUpdatedLayerState(layer, topicCount) {
  const layerConfig = COMPOSITION_STATES[layer]
  if (!layerConfig || !layerConfig.states) {
    return layerConfig?.initial || 'unknown'
  }

  const states = layerConfig.states
  const maxIndex = states.length - 1

  // Progress through states based on topic count (roughly 3 topics per state)
  const stateIndex = Math.min(Math.floor(topicCount / 3), maxIndex)

  return states[stateIndex]
}

/**
 * Evolve the world based on a new topic
 * Main orchestration function that:
 * 1. Gets current world state
 * 2. Classifies topic effect
 * 3. Updates composition map
 * 4. Calculates new tier
 * 5. Returns evolution result
 *
 * @param {string} clientId - Unique client identifier
 * @param {string} topicName - Name of the topic
 * @param {string} summary - Summary of the topic
 * @returns {Promise<{
 *   worldImageUrl: string | null,
 *   changesApplied: {
 *     zone: string,
 *     terrainEffect: string,
 *     layer: string,
 *     previousState: string,
 *     newState: string
 *   },
 *   tier: string,
 *   tierUpgrade: { from: string, to: string } | null
 * }>}
 */
export async function evolveWorld(clientId, topicName, summary) {
  try {
    // Get or create world state
    const worldState = getOrCreateWorldState(clientId)
    const previousTier = worldState.tier

    const normalizedTopicName = typeof topicName === 'string' ? topicName.trim() : ''
    const safeTopicName = normalizedTopicName || 'Unknown topic'
    const safeSummary = typeof summary === 'string' ? summary.trim() : ''

    // Normalize optional fields for older saved states
    if (!Array.isArray(worldState.topicsLearned)) {
      worldState.topicsLearned = []
    }
    if (!worldState.terrainProgress || typeof worldState.terrainProgress !== 'object') {
      worldState.terrainProgress = {}
    }

    // Skip duplicates (case-insensitive) to avoid re-adding the same element repeatedly
    if (normalizedTopicName) {
      const alreadyLearned = worldState.topicsLearned.some(
        (t) => typeof t === 'string' && t.toLowerCase() === normalizedTopicName.toLowerCase()
      )
      if (alreadyLearned) {
        logger.info('WORLD', 'Topic already applied to living world (skipping)', {
          clientId,
          topicName: normalizedTopicName,
        })
        return {
          worldImageUrl: worldState.worldImageUrl,
          changesApplied: {
            skipped: true,
            reason: 'TOPIC_ALREADY_APPLIED',
          },
          tier: worldState.tier,
          tierUpgrade: null,
        }
      }
    }

    // Classify the topic's effect
    const classification = classifyTopicEffect(safeTopicName, safeSummary)
    const { zone, terrainEffect, compositionLayer, keywords } = classification

    const previousTerrainCount = Number(worldState.terrainProgress[terrainEffect] || 0)
    const newTerrainCount = previousTerrainCount + 1
    worldState.terrainProgress[terrainEffect] = newTerrainCount

    // Get the affected layer
    const layer = worldState.compositionMap[compositionLayer]
    const previousState = layer.state

    // Add topic to the layer
    layer.topics.push({
      name: safeTopicName,
      summary: safeSummary,
      keywords,
      zone,
      terrainEffect,
      addedAt: new Date()
    })

    if (normalizedTopicName) {
      worldState.topicsLearned.push(normalizedTopicName)
    }

    // Update layer state based on new topic count
    const newState = getUpdatedLayerState(compositionLayer, layer.topics.length)
    layer.state = newState

    // Increment total topics
    worldState.totalTopics += 1

    // Calculate new tier
    const newTier = calculateTier(worldState.totalTopics)
    worldState.tier = newTier

    // Check for tier upgrade
    let tierUpgrade = null
    if (newTier !== previousTier) {
      tierUpgrade = {
        from: previousTier,
        to: newTier
      }
    }

    // Update timestamp
    worldState.updatedAt = new Date()

    // Save updated state
    evolutionWorldStates.set(clientId, worldState)

    logger.info('WORLD', 'World evolved', {
      clientId,
      topicName,
      zone,
      terrainEffect,
      layer: compositionLayer,
      previousState,
      newState,
      totalTopics: worldState.totalTopics,
      tier: newTier,
      tierUpgrade: tierUpgrade ? `${tierUpgrade.from} -> ${tierUpgrade.to}` : null
    })

    return {
      worldImageUrl: worldState.worldImageUrl,
      changesApplied: {
        zone,
        terrainEffect,
        layer: compositionLayer,
        previousState,
        newState,
        tierChanged: newTier !== previousTier,
        previousTier,
        newTier,
        previousTerrainCount,
        newTerrainCount
      },
      tier: newTier,
      tierUpgrade
    }
  } catch (error) {
    logger.error('WORLD', 'Failed to evolve world', {
      clientId,
      topicName,
      error: error.message
    })

    throw error
  }
}

/**
 * Get the current evolution world state for a client
 * @param {string} clientId - Unique client identifier
 * @returns {{ worldState: Object | null, error: string | null }}
 */
export function getEvolutionWorldState(clientId) {
  if (!evolutionWorldStates.has(clientId)) {
    return { worldState: null, error: null }
  }

  return {
    worldState: evolutionWorldStates.get(clientId),
    error: null
  }
}

/**
 * Reset evolution world state for a client (useful for testing)
 * @param {string} clientId - Unique client identifier
 */
export function resetEvolutionWorldState(clientId) {
  evolutionWorldStates.delete(clientId)
}

/**
 * Set/replace evolution world state for a client.
 * Used by routes to hydrate persisted state into the in-memory cache.
 *
 * @param {string} clientId
 * @param {Object} worldState
 */
export function setEvolutionWorldState(clientId, worldState) {
  if (!clientId) return
  if (!worldState || typeof worldState !== 'object') return
  evolutionWorldStates.set(clientId, worldState)
}

export default {
  createInitialWorldState,
  classifyTopicEffect,
  calculateTier,
  evolveWorld,
  getEvolutionWorldState,
  resetEvolutionWorldState,
  setEvolutionWorldState,
  WORLD_STYLE,
  COMPOSITION_STATES
}
