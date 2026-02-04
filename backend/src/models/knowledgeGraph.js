/**
 * Knowledge Graph Data Model
 * KC001: Core data structures for the Knowledge Constellation feature.
 *
 * Topics become "stars" in the constellation, connected by relationship "edges".
 * This module defines the types and helper functions for managing the knowledge graph.
 *
 * Replaces the Living World and MagicalTree systems with a unified graph-based
 * approach to visualizing and tracking learning progress.
 */

// ============================================================================
// TYPE DEFINITIONS (JSDoc)
// ============================================================================

/**
 * @typedef {'dim' | 'glow' | 'bright' | 'brilliant'} BrightnessLevel
 * Visual state of a node based on mastery level
 */

/**
 * @typedef {'prerequisite' | 'extends' | 'contrasts' | 'applies' | 'bridges'} EdgeType
 * Type of relationship between two knowledge nodes:
 * - prerequisite: One topic is foundational to understanding another
 * - extends: One topic builds upon or deepens another
 * - contrasts: Topics show interesting differences or opposites
 * - applies: One topic is a practical application of another
 * - bridges: Topics are from different domains but share concepts
 */

/**
 * @typedef {'bridge' | 'deepen' | 'unlock'} GapType
 * Type of knowledge gap suggestion:
 * - bridge: Connect two unrelated clusters
 * - deepen: Explore a topic in more depth
 * - unlock: Prerequisite for advanced topics
 */

/**
 * @typedef {Object} KnowledgeNode
 * @property {string} id - Unique node identifier (UUID)
 * @property {string} name - Topic name displayed in constellation
 * @property {string[]} concepts - Key concepts covered (for relationship matching)
 * @property {number} mastery - 0-1 based on quiz performance
 * @property {BrightnessLevel} brightness - Visual state based on mastery
 * @property {{x: number, y: number}} [position] - Position in constellation layout
 * @property {string[]} followUps - Child node IDs (follow-up questions)
 * @property {number} unlockedAt - Timestamp when topic was first learned
 * @property {number} lastReviewedAt - Timestamp of last quiz/review
 * @property {string} [category] - Topic category for clustering
 */

/**
 * @typedef {Object} KnowledgeEdge
 * @property {string} id - Unique edge identifier (UUID)
 * @property {string} from - Source node ID
 * @property {string} to - Target node ID
 * @property {EdgeType} type - Relationship type
 * @property {number} strength - 0-1 confidence from Gemini
 * @property {boolean} discovered - Has user explored this connection?
 * @property {string} explanation - Why these connect (from Gemini)
 */

/**
 * @typedef {Object} KnowledgeCluster
 * @property {string} id - Unique cluster identifier (UUID)
 * @property {string} name - Gemini-generated name for the cluster
 * @property {string} icon - Emoji representing the cluster
 * @property {string[]} nodeIds - Node IDs in this cluster
 * @property {string} color - Hex color for visualization
 */

/**
 * @typedef {Object} KnowledgeGap
 * @property {string} id - Unique gap identifier (UUID)
 * @property {string} suggestedTopic - Topic name to learn
 * @property {GapType} type - Gap type (bridge, deepen, unlock)
 * @property {string[]} connectsTo - Existing node IDs this would connect to
 * @property {string} reasoning - Why this topic is suggested
 * @property {string} curiosityHook - Intriguing question to spark interest
 */

/**
 * @typedef {Object} ExplorerRankDefinition
 * @property {number} level - Rank level (1-7)
 * @property {string} title - Rank title
 * @property {string} icon - Rank emoji
 * @property {number} minTopics - Minimum topics required for this rank
 */

/**
 * @typedef {Object} ExplorerRank
 * @property {number} level - Current rank level (1-7)
 * @property {string} title - Rank title
 * @property {string} icon - Rank emoji
 * @property {number} topicsToNextRank - Topics needed for next rank (0 if max)
 */

/**
 * @typedef {Object} KnowledgeGraph
 * @property {KnowledgeNode[]} nodes - All topic nodes
 * @property {KnowledgeEdge[]} edges - All relationship edges
 * @property {KnowledgeCluster[]} clusters - Topic clusters (constellations)
 * @property {KnowledgeGap[]} gaps - Suggested topics to learn
 * @property {ExplorerRank} explorerRank - User's current exploration rank
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Explorer rank definitions - progression tiers based on topics learned
 * @type {ExplorerRankDefinition[]}
 */
export const EXPLORER_RANKS = [
  { level: 1, title: 'Stargazer', icon: '🔭', minTopics: 0 },
  { level: 2, title: 'Observer', icon: '👁️', minTopics: 3 },
  { level: 3, title: 'Navigator', icon: '🧭', minTopics: 8 },
  { level: 4, title: 'Cartographer', icon: '🗺️', minTopics: 15 },
  { level: 5, title: 'Astronomer', icon: '⭐', minTopics: 25 },
  { level: 6, title: 'Cosmologist', icon: '🌌', minTopics: 40 },
  { level: 7, title: 'Pioneer', icon: '🚀', minTopics: 60 },
]

/**
 * Brightness thresholds based on mastery score
 * @type {Object.<string, number>}
 */
export const BRIGHTNESS_THRESHOLDS = {
  brilliant: 0.75,
  bright: 0.5,
  glow: 0.25,
  dim: 0,
}

/**
 * Valid edge types for relationship validation
 * @type {EdgeType[]}
 */
export const VALID_EDGE_TYPES = ['prerequisite', 'extends', 'contrasts', 'applies', 'bridges']

/**
 * Valid gap types for suggestion validation
 * @type {GapType[]}
 */
export const VALID_GAP_TYPES = ['bridge', 'deepen', 'unlock']

/**
 * Default cluster colors for visualization
 * @type {string[]}
 */
export const CLUSTER_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#EF4444', // Red
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate explorer rank from topic count
 *
 * @param {number} topicCount - Number of topics learned
 * @returns {ExplorerRank} The explorer rank with progress info
 */
export function calculateExplorerRank(topicCount) {
  // Validate input
  if (typeof topicCount !== 'number' || topicCount < 0) {
    topicCount = 0
  }

  // Find the highest rank where topicCount >= minTopics
  let currentRank = EXPLORER_RANKS[0]
  let nextRank = EXPLORER_RANKS[1]

  for (let i = EXPLORER_RANKS.length - 1; i >= 0; i--) {
    if (topicCount >= EXPLORER_RANKS[i].minTopics) {
      currentRank = EXPLORER_RANKS[i]
      nextRank = EXPLORER_RANKS[i + 1] || null
      break
    }
  }

  // Calculate topics needed for next rank
  const topicsToNextRank = nextRank
    ? Math.max(0, nextRank.minTopics - topicCount)
    : 0

  return {
    level: currentRank.level,
    title: currentRank.title,
    icon: currentRank.icon,
    topicsToNextRank,
  }
}

/**
 * Calculate brightness level from mastery score
 *
 * @param {number} mastery - Mastery score from 0 to 1
 * @returns {BrightnessLevel} The brightness level
 */
export function calculateBrightness(mastery) {
  // Validate input
  if (typeof mastery !== 'number' || Number.isNaN(mastery)) {
    return 'dim'
  }

  // Clamp to valid range
  mastery = Math.max(0, Math.min(1, mastery))

  if (mastery >= BRIGHTNESS_THRESHOLDS.brilliant) {
    return 'brilliant'
  }
  if (mastery >= BRIGHTNESS_THRESHOLDS.bright) {
    return 'bright'
  }
  if (mastery >= BRIGHTNESS_THRESHOLDS.glow) {
    return 'glow'
  }
  return 'dim'
}

/**
 * Generate a unique ID for graph elements
 *
 * @returns {string} A unique identifier
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create a new KnowledgeNode from topic data
 *
 * @param {Object} topicData - Topic data to create node from
 * @param {string} topicData.name - Topic name (required)
 * @param {string[]} [topicData.concepts] - Key concepts covered
 * @param {number} [topicData.mastery] - Initial mastery level (0-1)
 * @param {{x: number, y: number}} [topicData.position] - Position in constellation
 * @param {string} [topicData.category] - Topic category
 * @returns {KnowledgeNode} A properly structured KnowledgeNode
 */
export function createNode(topicData) {
  // Validate required fields
  if (!topicData || typeof topicData.name !== 'string' || topicData.name.trim() === '') {
    throw new Error('Topic name is required and must be a non-empty string')
  }

  const now = Date.now()
  const mastery = typeof topicData.mastery === 'number'
    ? Math.max(0, Math.min(1, topicData.mastery))
    : 0

  return {
    id: topicData.id || generateId(),
    name: topicData.name.trim(),
    concepts: Array.isArray(topicData.concepts)
      ? topicData.concepts.filter(c => typeof c === 'string' && c.trim() !== '')
      : [],
    mastery,
    brightness: calculateBrightness(mastery),
    position: topicData.position && typeof topicData.position.x === 'number' && typeof topicData.position.y === 'number'
      ? { x: topicData.position.x, y: topicData.position.y }
      : undefined,
    followUps: Array.isArray(topicData.followUps)
      ? topicData.followUps.filter(id => typeof id === 'string')
      : [],
    unlockedAt: now,
    lastReviewedAt: now,
    category: typeof topicData.category === 'string' ? topicData.category.trim() : undefined,
  }
}

/**
 * Create a new KnowledgeEdge
 *
 * @param {string} from - Source node ID
 * @param {string} to - Target node ID
 * @param {EdgeType} type - Relationship type
 * @param {number} strength - Confidence level (0-1)
 * @param {string} explanation - Why these nodes connect
 * @returns {KnowledgeEdge} A properly structured KnowledgeEdge
 */
export function createEdge(from, to, type, strength, explanation) {
  // Validate required fields
  if (typeof from !== 'string' || from.trim() === '') {
    throw new Error('Source node ID (from) is required')
  }
  if (typeof to !== 'string' || to.trim() === '') {
    throw new Error('Target node ID (to) is required')
  }
  if (!VALID_EDGE_TYPES.includes(type)) {
    throw new Error(`Invalid edge type. Must be one of: ${VALID_EDGE_TYPES.join(', ')}`)
  }

  return {
    id: generateId(),
    from: from.trim(),
    to: to.trim(),
    type,
    strength: typeof strength === 'number'
      ? Math.max(0, Math.min(1, strength))
      : 0.5,
    discovered: false,
    explanation: typeof explanation === 'string' ? explanation.trim() : '',
  }
}

/**
 * Create a new KnowledgeCluster
 *
 * @param {Object} clusterData - Cluster data
 * @param {string} clusterData.name - Cluster name
 * @param {string} [clusterData.icon] - Emoji icon
 * @param {string[]} [clusterData.nodeIds] - Node IDs in cluster
 * @param {string} [clusterData.color] - Hex color
 * @returns {KnowledgeCluster} A properly structured KnowledgeCluster
 */
export function createCluster(clusterData) {
  // Validate required fields
  if (!clusterData || typeof clusterData.name !== 'string' || clusterData.name.trim() === '') {
    throw new Error('Cluster name is required')
  }

  return {
    id: generateId(),
    name: clusterData.name.trim(),
    icon: typeof clusterData.icon === 'string' ? clusterData.icon : '✨',
    nodeIds: Array.isArray(clusterData.nodeIds)
      ? clusterData.nodeIds.filter(id => typeof id === 'string')
      : [],
    color: typeof clusterData.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(clusterData.color)
      ? clusterData.color
      : CLUSTER_COLORS[0],
  }
}

/**
 * Create a new KnowledgeGap suggestion
 *
 * @param {Object} gapData - Gap data
 * @param {string} gapData.suggestedTopic - Suggested topic name
 * @param {GapType} gapData.type - Gap type
 * @param {string[]} gapData.connectsTo - Node IDs this would connect to
 * @param {string} gapData.reasoning - Why this is suggested
 * @param {string} gapData.curiosityHook - Intriguing question
 * @returns {KnowledgeGap} A properly structured KnowledgeGap
 */
export function createGap(gapData) {
  // Validate required fields
  if (!gapData || typeof gapData.suggestedTopic !== 'string' || gapData.suggestedTopic.trim() === '') {
    throw new Error('Suggested topic is required')
  }
  if (!VALID_GAP_TYPES.includes(gapData.type)) {
    throw new Error(`Invalid gap type. Must be one of: ${VALID_GAP_TYPES.join(', ')}`)
  }

  return {
    id: generateId(),
    suggestedTopic: gapData.suggestedTopic.trim(),
    type: gapData.type,
    connectsTo: Array.isArray(gapData.connectsTo)
      ? gapData.connectsTo.filter(id => typeof id === 'string')
      : [],
    reasoning: typeof gapData.reasoning === 'string' ? gapData.reasoning.trim() : '',
    curiosityHook: typeof gapData.curiosityHook === 'string' ? gapData.curiosityHook.trim() : '',
  }
}

/**
 * Create an empty KnowledgeGraph
 *
 * @returns {KnowledgeGraph} An empty graph with default explorer rank
 */
export function createEmptyGraph() {
  return {
    nodes: [],
    edges: [],
    clusters: [],
    gaps: [],
    explorerRank: calculateExplorerRank(0),
  }
}

/**
 * Update node mastery and recalculate brightness
 *
 * @param {KnowledgeNode} node - Node to update
 * @param {number} newMastery - New mastery level (0-1)
 * @returns {KnowledgeNode} Updated node (immutable - returns new object)
 */
export function updateNodeMastery(node, newMastery) {
  if (!node || typeof node.id !== 'string') {
    throw new Error('Valid node is required')
  }

  const mastery = typeof newMastery === 'number'
    ? Math.max(0, Math.min(1, newMastery))
    : node.mastery || 0

  return {
    ...node,
    mastery,
    brightness: calculateBrightness(mastery),
    lastReviewedAt: Date.now(),
  }
}

/**
 * Mark an edge as discovered
 *
 * @param {KnowledgeEdge} edge - Edge to mark
 * @returns {KnowledgeEdge} Updated edge (immutable - returns new object)
 */
export function markEdgeDiscovered(edge) {
  if (!edge || typeof edge.id !== 'string') {
    throw new Error('Valid edge is required')
  }

  return {
    ...edge,
    discovered: true,
  }
}

/**
 * Add a node to a cluster
 *
 * @param {KnowledgeCluster} cluster - Cluster to update
 * @param {string} nodeId - Node ID to add
 * @returns {KnowledgeCluster} Updated cluster (immutable - returns new object)
 */
export function addNodeToCluster(cluster, nodeId) {
  if (!cluster || typeof cluster.id !== 'string') {
    throw new Error('Valid cluster is required')
  }
  if (typeof nodeId !== 'string' || nodeId.trim() === '') {
    throw new Error('Valid node ID is required')
  }

  // Avoid duplicates
  if (cluster.nodeIds.includes(nodeId)) {
    return cluster
  }

  return {
    ...cluster,
    nodeIds: [...cluster.nodeIds, nodeId],
  }
}

/**
 * Get display info for a brightness level
 *
 * @param {BrightnessLevel} brightness - Brightness level
 * @returns {{ label: string, color: string, glow: string }} Display info
 */
export function getBrightnessDisplayInfo(brightness) {
  const info = {
    dim: {
      label: 'Learning',
      color: '#94A3B8', // slate-400
      glow: 'none',
    },
    glow: {
      label: 'Growing',
      color: '#FCD34D', // amber-300
      glow: '0 0 10px rgba(252, 211, 77, 0.5)',
    },
    bright: {
      label: 'Strong',
      color: '#FBBF24', // amber-400
      glow: '0 0 20px rgba(251, 191, 36, 0.7)',
    },
    brilliant: {
      label: 'Mastered',
      color: '#F59E0B', // amber-500
      glow: '0 0 30px rgba(245, 158, 11, 0.9)',
    },
  }

  return info[brightness] || info.dim
}

/**
 * Get display info for an edge type
 *
 * @param {EdgeType} edgeType - Edge type
 * @returns {{ label: string, description: string, color: string }} Display info
 */
export function getEdgeTypeDisplayInfo(edgeType) {
  const info = {
    prerequisite: {
      label: 'Foundation',
      description: 'This topic helps you understand the other',
      color: '#3B82F6', // blue-500
    },
    extends: {
      label: 'Builds On',
      description: 'This topic goes deeper into the other',
      color: '#8B5CF6', // violet-500
    },
    contrasts: {
      label: 'Compare',
      description: 'These topics have interesting differences',
      color: '#EC4899', // pink-500
    },
    applies: {
      label: 'Real World',
      description: 'One topic is used in practice by the other',
      color: '#10B981', // emerald-500
    },
    bridges: {
      label: 'Connection',
      description: 'These topics share concepts across different areas',
      color: '#F59E0B', // amber-500
    },
  }

  return info[edgeType] || { label: 'Related', description: 'These topics are connected', color: '#6B7280' }
}

/**
 * Get display info for a gap type
 *
 * @param {GapType} gapType - Gap type
 * @returns {{ label: string, description: string, icon: string }} Display info
 */
export function getGapTypeDisplayInfo(gapType) {
  const info = {
    bridge: {
      label: 'Bridge',
      description: 'Connect different areas of knowledge',
      icon: '🌉',
    },
    deepen: {
      label: 'Deepen',
      description: 'Explore this topic in more depth',
      icon: '🔬',
    },
    unlock: {
      label: 'Unlock',
      description: 'Learn this to unlock advanced topics',
      icon: '🔑',
    },
  }

  return info[gapType] || { label: 'Learn', description: 'Expand your knowledge', icon: '📚' }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Constants
  EXPLORER_RANKS,
  BRIGHTNESS_THRESHOLDS,
  VALID_EDGE_TYPES,
  VALID_GAP_TYPES,
  CLUSTER_COLORS,
  // Helper functions
  calculateExplorerRank,
  calculateBrightness,
  generateId,
  createNode,
  createEdge,
  createCluster,
  createGap,
  createEmptyGraph,
  updateNodeMastery,
  markEdgeDiscovered,
  addNodeToCluster,
  getBrightnessDisplayInfo,
  getEdgeTypeDisplayInfo,
  getGapTypeDisplayInfo,
}
