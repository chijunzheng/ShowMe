/**
 * Knowledge Graph Types for Frontend
 * KC001: TypeScript type definitions for the Knowledge Constellation feature.
 *
 * These types mirror the backend JSDoc definitions and provide type safety
 * for the React frontend components.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Visual state of a node based on mastery level
 */
export type BrightnessLevel = 'dim' | 'glow' | 'bright' | 'brilliant'

/**
 * Type of relationship between two knowledge nodes:
 * - prerequisite: One topic is foundational to understanding another
 * - extends: One topic builds upon or deepens another
 * - contrasts: Topics show interesting differences or opposites
 * - applies: One topic is a practical application of another
 * - bridges: Topics are from different domains but share concepts
 */
export type EdgeType = 'prerequisite' | 'extends' | 'contrasts' | 'applies' | 'bridges'

/**
 * Type of knowledge gap suggestion:
 * - bridge: Connect two unrelated clusters
 * - deepen: Explore a topic in more depth
 * - unlock: Prerequisite for advanced topics
 */
export type GapType = 'bridge' | 'deepen' | 'unlock'

/**
 * A topic node in the knowledge constellation
 */
export interface KnowledgeNode {
  /** Unique node identifier (UUID) */
  id: string
  /** Topic name displayed in constellation */
  name: string
  /** Key concepts covered (for relationship matching) */
  concepts: string[]
  /** 0-1 based on quiz performance */
  mastery: number
  /** Visual state based on mastery */
  brightness: BrightnessLevel
  /** Position in constellation layout */
  position?: { x: number; y: number }
  /** Child node IDs (follow-up questions) */
  followUps: string[]
  /** Timestamp when topic was first learned */
  unlockedAt: number
  /** Timestamp of last quiz/review */
  lastReviewedAt: number
  /** Topic category for clustering */
  category?: string
}

/**
 * A relationship edge between two knowledge nodes
 */
export interface KnowledgeEdge {
  /** Unique edge identifier (UUID) */
  id: string
  /** Source node ID */
  from: string
  /** Target node ID */
  to: string
  /** Relationship type */
  type: EdgeType
  /** 0-1 confidence from Gemini */
  strength: number
  /** Has user explored this connection? */
  discovered: boolean
  /** Why these connect (from Gemini) */
  explanation: string
}

/**
 * A cluster of related topic nodes (a "constellation")
 */
export interface KnowledgeCluster {
  /** Unique cluster identifier (UUID) */
  id: string
  /** Gemini-generated name for the cluster */
  name: string
  /** Emoji representing the cluster */
  icon: string
  /** Node IDs in this cluster */
  nodeIds: string[]
  /** Hex color for visualization */
  color: string
}

/**
 * A suggested topic to learn (fills a gap in knowledge)
 */
export interface KnowledgeGap {
  /** Unique gap identifier (UUID) */
  id: string
  /** Topic name to learn */
  suggestedTopic: string
  /** Gap type (bridge, deepen, unlock) */
  type: GapType
  /** Existing node IDs this would connect to */
  connectsTo: string[]
  /** Why this topic is suggested */
  reasoning: string
  /** Intriguing question to spark interest */
  curiosityHook: string
}

/**
 * Explorer rank definition (static configuration)
 */
export interface ExplorerRankDefinition {
  /** Rank level (1-12) */
  level: number
  /** Rank title */
  title: string
  /** Rank emoji */
  icon: string
  /** Minimum topics required for this rank */
  minTopics: number
}

/**
 * User's current explorer rank with progress info
 */
export interface ExplorerRank {
  /** Current rank level (1-12) */
  level: number
  /** Rank title */
  title: string
  /** Rank emoji */
  icon: string
  /** Topics needed for next rank (0 if max) */
  topicsToNextRank: number
}

/**
 * The complete knowledge graph structure
 */
export interface KnowledgeGraph {
  /** All topic nodes */
  nodes: KnowledgeNode[]
  /** All relationship edges */
  edges: KnowledgeEdge[]
  /** Topic clusters (constellations) */
  clusters: KnowledgeCluster[]
  /** Suggested topics to learn */
  gaps: KnowledgeGap[]
  /** User's current exploration rank */
  explorerRank: ExplorerRank
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Explorer rank definitions - progression tiers based on topics learned
 */
export const EXPLORER_RANKS: ExplorerRankDefinition[] = [
  { level: 1, title: 'Stargazer', icon: '🔭', minTopics: 0 },
  { level: 2, title: 'Space Cadet', icon: '🚀', minTopics: 3 },
  { level: 3, title: 'Navigator', icon: '🧭', minTopics: 8 },
  { level: 4, title: 'Explorer', icon: '🌌', minTopics: 15 },
  { level: 5, title: 'Voyager', icon: '🛸', minTopics: 25 },
  { level: 6, title: 'Astronaut', icon: '🧑‍🚀', minTopics: 38 },
  { level: 7, title: 'Pioneer', icon: '⭐', minTopics: 52 },
  { level: 8, title: 'Star Captain', icon: '🛰️', minTopics: 68 },
  { level: 9, title: 'Celestial Sage', icon: '🌠', minTopics: 84 },
  { level: 10, title: 'Cosmic Pioneer', icon: '🪐', minTopics: 100 },
  { level: 11, title: 'Galactic Legend', icon: '🌌', minTopics: 110 },
  { level: 12, title: 'Legendary Luminary', icon: '☀️', minTopics: 120 },
]

/**
 * Brightness thresholds based on mastery score
 */
export const BRIGHTNESS_THRESHOLDS: Record<BrightnessLevel, number> = {
  brilliant: 0.75,
  bright: 0.5,
  glow: 0.25,
  dim: 0,
}

/**
 * Valid edge types for relationship validation
 */
export const VALID_EDGE_TYPES: EdgeType[] = ['prerequisite', 'extends', 'contrasts', 'applies', 'bridges']

/**
 * Valid gap types for suggestion validation
 */
export const VALID_GAP_TYPES: GapType[] = ['bridge', 'deepen', 'unlock']

/**
 * Default cluster colors for visualization
 */
export const CLUSTER_COLORS: string[] = [
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
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate explorer rank from topic count
 *
 * @param topicCount - Number of topics learned
 * @returns The explorer rank with progress info
 */
export function calculateExplorerRank(topicCount: number): ExplorerRank {
  // Validate input
  const count = typeof topicCount === 'number' && topicCount >= 0 ? topicCount : 0

  // Find the highest rank where topicCount >= minTopics
  let currentRank = EXPLORER_RANKS[0]
  let nextRank: ExplorerRankDefinition | null = EXPLORER_RANKS[1]

  for (let i = EXPLORER_RANKS.length - 1; i >= 0; i--) {
    if (count >= EXPLORER_RANKS[i].minTopics) {
      currentRank = EXPLORER_RANKS[i]
      nextRank = EXPLORER_RANKS[i + 1] || null
      break
    }
  }

  // Calculate topics needed for next rank
  const topicsToNextRank = nextRank
    ? Math.max(0, nextRank.minTopics - count)
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
 * @param mastery - Mastery score from 0 to 1
 * @returns The brightness level
 */
export function calculateBrightness(mastery: number): BrightnessLevel {
  // Validate and clamp input
  if (typeof mastery !== 'number' || Number.isNaN(mastery)) {
    return 'dim'
  }

  const clampedMastery = Math.max(0, Math.min(1, mastery))

  if (clampedMastery >= BRIGHTNESS_THRESHOLDS.brilliant) {
    return 'brilliant'
  }
  if (clampedMastery >= BRIGHTNESS_THRESHOLDS.bright) {
    return 'bright'
  }
  if (clampedMastery >= BRIGHTNESS_THRESHOLDS.glow) {
    return 'glow'
  }
  return 'dim'
}

/**
 * Display info for brightness levels
 */
export interface BrightnessDisplayInfo {
  label: string
  color: string
  glow: string
}

/**
 * Get display info for a brightness level
 *
 * @param brightness - Brightness level
 * @returns Display info for UI rendering
 */
export function getBrightnessDisplayInfo(brightness: BrightnessLevel): BrightnessDisplayInfo {
  const info: Record<BrightnessLevel, BrightnessDisplayInfo> = {
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
 * Display info for edge types
 */
export interface EdgeTypeDisplayInfo {
  label: string
  description: string
  color: string
}

/**
 * Get display info for an edge type
 *
 * @param edgeType - Edge type
 * @returns Display info for UI rendering
 */
export function getEdgeTypeDisplayInfo(edgeType: EdgeType): EdgeTypeDisplayInfo {
  const info: Record<EdgeType, EdgeTypeDisplayInfo> = {
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

  return info[edgeType]
}

/**
 * Display info for gap types
 */
export interface GapTypeDisplayInfo {
  label: string
  description: string
  icon: string
}

/**
 * Get display info for a gap type
 *
 * @param gapType - Gap type
 * @returns Display info for UI rendering
 */
export function getGapTypeDisplayInfo(gapType: GapType): GapTypeDisplayInfo {
  const info: Record<GapType, GapTypeDisplayInfo> = {
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

  return info[gapType]
}

/**
 * Check if a node is "stale" (needs review)
 *
 * @param node - The knowledge node to check
 * @param daysThreshold - Days after which a node is considered stale (default 7)
 * @returns Whether the node needs review
 */
export function isNodeStale(node: KnowledgeNode, daysThreshold = 7): boolean {
  const now = Date.now()
  const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000
  return now - node.lastReviewedAt > thresholdMs
}

/**
 * Get the number of days since a node was last reviewed
 *
 * @param node - The knowledge node
 * @returns Number of days since last review
 */
export function getDaysSinceReview(node: KnowledgeNode): number {
  const now = Date.now()
  const timeSinceReview = now - node.lastReviewedAt
  return Math.floor(timeSinceReview / (24 * 60 * 60 * 1000))
}

/**
 * Calculate overall graph mastery (average of all nodes)
 *
 * @param graph - The knowledge graph
 * @returns Average mastery (0-1) or 0 if no nodes
 */
export function calculateGraphMastery(graph: KnowledgeGraph): number {
  if (!graph.nodes.length) {
    return 0
  }
  const totalMastery = graph.nodes.reduce((sum, node) => sum + node.mastery, 0)
  return totalMastery / graph.nodes.length
}

/**
 * Get nodes that need review (sorted by staleness)
 *
 * @param graph - The knowledge graph
 * @param daysThreshold - Days after which a node needs review (default 7)
 * @returns Array of stale nodes, sorted by staleness (oldest first)
 */
export function getNodesNeedingReview(graph: KnowledgeGraph, daysThreshold = 7): KnowledgeNode[] {
  return graph.nodes
    .filter(node => isNodeStale(node, daysThreshold))
    .sort((a, b) => a.lastReviewedAt - b.lastReviewedAt)
}

/**
 * Get undiscovered edges for a node
 *
 * @param graph - The knowledge graph
 * @param nodeId - The node ID to find undiscovered edges for
 * @returns Array of undiscovered edges connected to this node
 */
export function getUndiscoveredEdges(graph: KnowledgeGraph, nodeId: string): KnowledgeEdge[] {
  return graph.edges.filter(
    edge => !edge.discovered && (edge.from === nodeId || edge.to === nodeId)
  )
}

/**
 * Get all nodes connected to a specific node
 *
 * @param graph - The knowledge graph
 * @param nodeId - The node ID to find connections for
 * @returns Array of connected node IDs
 */
export function getConnectedNodeIds(graph: KnowledgeGraph, nodeId: string): string[] {
  const connectedIds = new Set<string>()

  graph.edges.forEach(edge => {
    if (edge.from === nodeId) {
      connectedIds.add(edge.to)
    } else if (edge.to === nodeId) {
      connectedIds.add(edge.from)
    }
  })

  return Array.from(connectedIds)
}

/**
 * Find the cluster containing a specific node
 *
 * @param graph - The knowledge graph
 * @param nodeId - The node ID to find
 * @returns The cluster containing the node, or undefined if not in any cluster
 */
export function findClusterForNode(graph: KnowledgeGraph, nodeId: string): KnowledgeCluster | undefined {
  return graph.clusters.find(cluster => cluster.nodeIds.includes(nodeId))
}
