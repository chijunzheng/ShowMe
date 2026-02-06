/**
 * useKnowledgeGraph Hook
 *
 * Manages the knowledge graph state for the Constellation feature.
 * Handles persistence, API calls, and graph mutations.
 *
 * Features:
 * - Load/save graph from localStorage with migration support
 * - Fetch relationship discovery from API
 * - Add new topic nodes with automatic relationship detection
 * - Update mastery levels after quiz
 * - Manage clusters and knowledge gaps
 *
 * Storage Key: showme_knowledge_graph
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  migrateFromStorage,
  loadGraphFromStorage,
  saveGraphToStorage,
  determineCategory,
  createInitialClusters,
} from '../utils/graphMigration'
import { getExplorerRank } from '../components/ExplorerRank/explorerRankUtils'
import logger from '../utils/logger'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Storage key for old topic format (used for migration)
 */
const LEGACY_STORAGE_KEY = 'showme_topics'

/**
 * API base URL from environment
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

/**
 * Debounce delay for saving to storage (ms)
 */
const SAVE_DEBOUNCE_MS = 500

/**
 * Minimum nodes required for gap analysis
 */
const MIN_NODES_FOR_GAPS = 3

/**
 * Minimum nodes required for reclustering
 */
const MIN_NODES_FOR_CLUSTER = 2

/**
 * Recluster debounce in milliseconds
 */
export const RECLUSTER_DEBOUNCE_MS = 2500

/**
 * Node count limit for auto reclustering
 */
export const SMALL_GRAPH_RECLUSTER_LIMIT = 40

/**
 * Cluster configuration for category-based grouping
 */
const CLUSTER_CONFIG = {
  mathematics: { icon: '\u{1F522}', color: '#3B82F6' }, // number emoji
  science: { icon: '\u{1F52C}', color: '#10B981' }, // microscope
  history: { icon: '\u{1F4DC}', color: '#F59E0B' }, // scroll
  geography: { icon: '\u{1F30D}', color: '#06B6D4' }, // globe
  language: { icon: '\u{1F4DA}', color: '#8B5CF6' }, // books
  arts: { icon: '\u{1F3A8}', color: '#EC4899' }, // palette
  technology: { icon: '\u{1F4BB}', color: '#6366F1' }, // laptop
  astronomy: { icon: '\u{1F30C}', color: '#7C3AED' }, // milky way
  nature: { icon: '\u{1F33F}', color: '#22C55E' }, // herb
  'marine biology': { icon: '\u{1F433}', color: '#0EA5E9' }, // whale
  civilization: { icon: '\u{1F3DB}\u{FE0F}', color: '#F59E0B' }, // classical building
  arcane: { icon: '\u{1F52E}', color: '#8B5CF6' }, // crystal ball
  general: { icon: '\u{1F4A1}', color: '#64748B' }, // light bulb
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Filter out gaps that do not have any valid connections.
 *
 * @param {Array} gaps
 * @returns {Array}
 */
export function filterGapsWithConnections(gaps) {
  return (gaps || []).filter((gap) => {
    const connectsTo = Array.isArray(gap?.connectsTo) ? gap.connectsTo : []
    const relatedIds = Array.isArray(gap?.relatedNodeIds) ? gap.relatedNodeIds : []
    return connectsTo.length > 0 || relatedIds.length > 0
  })
}

/**
 * Decide whether to auto recluster based on size and debounce.
 *
 * @param {Object} params
 * @param {number} params.nodeCount
 * @param {number} params.lastReclusterAt
 * @param {number} params.now
 * @param {number} params.limit
 * @param {number} params.debounceMs
 * @returns {boolean}
 */
export function shouldAutoRecluster({
  nodeCount,
  lastReclusterAt,
  now,
  limit = SMALL_GRAPH_RECLUSTER_LIMIT,
  debounceMs = RECLUSTER_DEBOUNCE_MS,
}) {
  if (nodeCount > limit) return false
  if (now - lastReclusterAt < debounceMs) return false
  return true
}

/**
 * Get cluster icon for a category
 *
 * @param {string} category - Category name
 * @returns {string} Emoji icon
 */
function getClusterIcon(category) {
  const config = CLUSTER_CONFIG[category?.toLowerCase()]
  return config?.icon || CLUSTER_CONFIG.general.icon
}

/**
 * Get cluster color for a category
 *
 * @param {string} category - Category name
 * @returns {string} Hex color
 */
function getClusterColor(category) {
  const config = CLUSTER_CONFIG[category?.toLowerCase()]
  return config?.color || CLUSTER_CONFIG.general.color
}

/**
 * Normalize a topic name for fuzzy matching.
 *
 * @param {string} name - Topic name
 * @returns {string} Normalized name
 */
function normalizeTopicName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Normalize a category into a consistent cluster id
 *
 * @param {string} category - Category name
 * @returns {string} Cluster id
 */
function toClusterId(category) {
  const safeCategory = String(category || 'general')
    .toLowerCase()
    .replace(/\s+/g, '_')
  return `cluster_${safeCategory}`
}

/**
 * Format category as a human-friendly cluster name
 *
 * @param {string} category - Category name
 * @returns {string} Display name
 */
function formatClusterName(category) {
  if (!category) return 'General'
  return String(category)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Normalize graph categories (e.g., for new mappings like marine biology)
 *
 * @param {Object} graphData - Graph data from storage
 * @returns {Object} Normalized graph data
 */
function normalizeGraphCategories(graphData) {
  if (!graphData || !Array.isArray(graphData.nodes)) {
    return graphData
  }

  let changed = false

  const updatedNodes = graphData.nodes.map((node) => {
    if (!node) return node

    const rawCategory = typeof node.category === 'string'
      ? node.category.toLowerCase()
      : ''
    const hasKnownCategory = Boolean(CLUSTER_CONFIG[rawCategory])
    const shouldRecompute = !rawCategory || !hasKnownCategory || rawCategory === 'general' || rawCategory === 'nature'

    if (!shouldRecompute) {
      return node
    }

    const derived = determineCategory({ name: node.name, topicName: node.name })
    if (derived && derived !== rawCategory) {
      changed = true
      return { ...node, category: derived }
    }

    if (!rawCategory && derived) {
      changed = true
      return { ...node, category: derived }
    }

    return node
  })

  if (!changed) {
    return graphData
  }

  return {
    ...graphData,
    nodes: updatedNodes,
    clusters: createInitialClusters(updatedNodes),
  }
}

/**
 * Get brightness level from mastery score
 *
 * @param {number} mastery - 0-1 mastery score
 * @returns {'dim' | 'glow' | 'bright' | 'brilliant'} Brightness level
 */
function getBrightness(mastery) {
  if (mastery >= 0.75) return 'brilliant'
  if (mastery >= 0.5) return 'bright'
  if (mastery >= 0.25) return 'glow'
  return 'dim'
}

/**
 * Extract concepts from slide content
 * Used as fallback when concepts array is empty
 *
 * @param {Array} slides - Array of slide objects
 * @returns {string[]} Array of concept strings
 */
function extractConceptsFromSlides(slides) {
  if (!Array.isArray(slides) || slides.length === 0) {
    return []
  }

  const concepts = new Set()

  slides.forEach((slide) => {
    if (!slide) return

    // Extract from title
    if (slide.title) {
      const words = slide.title.toLowerCase().split(/\s+/)
      words.forEach((word) => {
        // Only include words longer than 4 characters
        if (word.length > 4) {
          concepts.add(word)
        }
      })
    }
  })

  return Array.from(concepts).slice(0, 10)
}

/**
 * Create default empty graph structure
 *
 * @returns {Object} Empty graph with default explorer rank
 */
function createEmptyGraph() {
  return {
    nodes: [],
    edges: [],
    clusters: [],
    gaps: [],
    explorerRank: {
      level: 1,
      title: 'Stargazer',
      icon: '\u{1F52D}',
      topicsToNextRank: 3,
    },
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook for managing the knowledge graph
 *
 * @returns {Object} Graph state and methods
 */
export default function useKnowledgeGraph() {
  // Graph state
  const [graph, setGraph] = useState(createEmptyGraph())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Track if initial load has completed
  const initialLoadDone = useRef(false)

  // Debounced save timer
  const saveTimerRef = useRef(null)

  // Track last recluster to avoid thrashing
  const lastReclusterAtRef = useRef(0)

  // ============================================================================
  // STORAGE OPERATIONS
  // ============================================================================

  /**
   * Save graph to localStorage with debouncing
   *
   * @param {Object} graphData - Graph data to save
   */
  const saveToStorage = useCallback((graphData) => {
    // Clear any pending save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    // Debounce the save
    saveTimerRef.current = setTimeout(() => {
      try {
        const success = saveGraphToStorage(graphData, LEGACY_STORAGE_KEY)
        if (success) {
          logger.debug('STORAGE', 'Graph saved to localStorage', {
            nodesCount: graphData.nodes.length,
          })
        }
      } catch (err) {
        logger.error('STORAGE', 'Failed to save graph', { error: err.message })
      }
    }, SAVE_DEBOUNCE_MS)
  }, [])

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Load graph from storage on mount
   * Handles migration from old format if needed
   */
  useEffect(() => {
    if (initialLoadDone.current) {
      return
    }

    const loadGraph = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // First try to load existing graph
        const existingGraph = loadGraphFromStorage(LEGACY_STORAGE_KEY)

        if (existingGraph) {
          logger.info('STORAGE', 'Loaded existing knowledge graph', {
            nodesCount: existingGraph.nodes.length,
          })

          // Recalculate explorer rank based on current node count
          const normalizedGraph = normalizeGraphCategories(existingGraph)
          const explorerRank = getExplorerRank(normalizedGraph.nodes.length)

          setGraph({
            ...normalizedGraph,
            explorerRank,
          })
        } else {
          // Try to migrate from old format
          logger.debug('STORAGE', 'No existing graph, checking for migration')
          const migration = migrateFromStorage(LEGACY_STORAGE_KEY)

          if (migration.migrated && migration.graph) {
            logger.info('STORAGE', 'Migrated from old format', {
              nodesCount: migration.graph.nodes.length,
            })
            setGraph(migration.graph)
          } else if (migration.graph) {
            // Already in new format but loaded via migration path
            setGraph(migration.graph)
          } else {
            // No data at all - start fresh
            logger.debug('STORAGE', 'No data to migrate, starting fresh')
            setGraph(createEmptyGraph())
          }
        }
      } catch (err) {
        logger.error('STORAGE', 'Failed to load knowledge graph', {
          error: err.message,
        })
        setError('Failed to load knowledge graph')
        setGraph(createEmptyGraph())
      } finally {
        setIsLoading(false)
        initialLoadDone.current = true
      }
    }

    loadGraph()
  }, [])

  /**
   * Save graph whenever it changes (after initial load)
   */
  useEffect(() => {
    if (!initialLoadDone.current || isLoading) {
      return
    }

    // Only save if we have data
    if (graph.nodes.length > 0) {
      saveToStorage(graph)
    }
  }, [graph, isLoading, saveToStorage])

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  // ============================================================================
  // API OPERATIONS
  // ============================================================================

  /**
   * Discover relationships for a new topic via API
   *
   * @param {Object} newNode - New node with id, name, concepts
   * @param {Array} existingNodes - Existing nodes to find relationships with
   * @returns {Promise<{relationships: Array, suggestedCluster: string}>}
   */
  const discoverRelationships = useCallback(async (newNode, existingNodes) => {
    // Skip API call if no existing nodes
    if (existingNodes.length === 0) {
      return { relationships: [], suggestedCluster: 'general' }
    }

    try {
      const response = await fetch(`${API_BASE}/api/graph/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newTopic: {
            id: newNode.id,
            name: newNode.name,
            concepts: newNode.concepts,
          },
          existingNodes: existingNodes.map((n) => ({
            id: n.id,
            name: n.name,
            concepts: n.concepts,
          })),
        }),
      })

      if (!response.ok) {
        logger.warn('STORAGE', 'Relationship discovery API returned error', {
          status: response.status,
        })
        return { relationships: [], suggestedCluster: 'general' }
      }

      const data = await response.json()
      return {
        relationships: data.relationships || [],
        suggestedCluster: data.suggestedCluster || 'general',
      }
    } catch (err) {
      logger.warn('STORAGE', 'Relationship discovery failed', {
        error: err.message,
      })
      return { relationships: [], suggestedCluster: 'general' }
    }
  }, [])

  // ============================================================================
  // GRAPH MUTATIONS
  // ============================================================================

  /**
   * Re-cluster topics using a provided node list.
   *
   * @param {Array} nodesToCluster
   */
  const reclusterWithNodes = useCallback(async (nodesToCluster) => {
    if (!nodesToCluster || nodesToCluster.length < MIN_NODES_FOR_CLUSTER) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/graph/cluster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: nodesToCluster }),
      })

      if (!response.ok) {
        logger.warn('STORAGE', 'Cluster API returned error', {
          status: response.status,
        })
        return
      }

      const data = await response.json()

      setGraph((prev) => ({
        ...prev,
        clusters: data.clusters || [],
      }))

      logger.info('STORAGE', 'Reclustered topics', {
        clustersCount: data.clusters?.length || 0,
      })
    } catch (err) {
      logger.warn('STORAGE', 'Recluster failed', { error: err.message })
    }
  }, [])

  /**
   * Add a new topic node to the graph
   * Discovers relationships with existing topics via API
   *
   * @param {Object} topicData - Topic data from slideshow
   * @returns {Promise<Object>} The created or existing node
   */
  const addTopic = useCallback(
    async (topicData) => {
      const { id, name, concepts = [], slides = [] } = topicData

      // Check if topic already exists (case-insensitive name match)
      const normalizedName = normalizeTopicName(name)
      const existing = graph.nodes.find(
        (n) => normalizeTopicName(n.name) === normalizedName
      )
      if (existing) {
        logger.debug('STORAGE', 'Topic already exists', { name })
        return existing
      }

      // Create new node
      const newNode = {
        id: id || generateId('node'),
        name,
        concepts:
          concepts.length > 0 ? concepts : extractConceptsFromSlides(slides),
        mastery: 0.25, // Initial mastery from viewing content
        brightness: 'dim',
        position: null, // Will be set by layout algorithm
        followUps: [],
        unlockedAt: Date.now(),
        lastReviewedAt: Date.now(),
        category: null, // Will be set by API or category detection
      }

      // Discover relationships via API
      const { relationships, suggestedCluster } = await discoverRelationships(
        newNode,
        graph.nodes
      )

      // Set category from API suggestion or determine locally
      newNode.category = suggestedCluster || determineCategory(topicData)

      // Update graph state immutably
      setGraph((prev) => {
        const updatedNodes = [...prev.nodes, newNode]
        const updatedEdges = [...prev.edges, ...relationships]

        // Update cluster membership
        let updatedClusters = [...prev.clusters]
        const clusterCategory = newNode.category?.toLowerCase() || 'general'
        const clusterIndex = updatedClusters.findIndex(
          (c) => c.name.toLowerCase() === clusterCategory
        )

        if (clusterIndex >= 0) {
          // Add node to existing cluster (immutably)
          updatedClusters = updatedClusters.map((cluster, idx) =>
            idx === clusterIndex
              ? { ...cluster, nodeIds: [...cluster.nodeIds, newNode.id] }
              : cluster
          )
        } else {
          // Create new cluster
          updatedClusters = [
            ...updatedClusters,
            {
              id: toClusterId(clusterCategory),
              name: formatClusterName(clusterCategory),
              icon: getClusterIcon(clusterCategory),
              nodeIds: [newNode.id],
              color: getClusterColor(clusterCategory),
            },
          ]
        }

        // Update explorer rank
        const explorerRank = getExplorerRank(updatedNodes.length)

        logger.info('STORAGE', 'Added topic to knowledge graph', {
          name: newNode.name,
          totalNodes: updatedNodes.length,
          newEdges: relationships.length,
        })

        return {
          ...prev,
          nodes: updatedNodes,
          edges: updatedEdges,
          clusters: updatedClusters,
          explorerRank,
        }
      })

      const now = Date.now()
      const nextNodeCount = graph.nodes.length + 1
      if (shouldAutoRecluster({
        nodeCount: nextNodeCount,
        lastReclusterAt: lastReclusterAtRef.current,
        now,
      })) {
        lastReclusterAtRef.current = now
        void reclusterWithNodes([...graph.nodes, newNode])
      }

      return newNode
    },
    [graph.nodes, discoverRelationships, reclusterWithNodes]
  )


  /**
   * Update mastery level for a topic after quiz
   *
   * @param {string} nodeId - Node ID
   * @param {number} score - Quiz score (0-1)
   */
  const updateMastery = useCallback((nodeId, score) => {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => {
        if (node.id !== nodeId) return node

        // Weighted average with existing mastery
        // 60% existing + 40% new score for gradual progression
        const newMastery = Math.min(1, node.mastery * 0.6 + score * 0.4)

        logger.debug('STORAGE', 'Updated mastery', {
          nodeId,
          oldMastery: node.mastery,
          newMastery,
          score,
        })

        return {
          ...node,
          mastery: newMastery,
          brightness: getBrightness(newMastery),
          lastReviewedAt: Date.now(),
        }
      }),
    }))
  }, [])

  /**
   * Add a follow-up connection between topics
   *
   * @param {string} parentId - Parent topic ID
   * @param {string} childId - Follow-up topic ID
   */
  const addFollowUp = useCallback((parentId, childId) => {
    setGraph((prev) => {
      // Check if edge already exists
      const edgeExists = prev.edges.some(
        (e) =>
          (e.from === parentId && e.to === childId) ||
          (e.from === childId && e.to === parentId)
      )

      // Update nodes to track follow-up relationship
      const updatedNodes = prev.nodes.map((node) => {
        if (node.id !== parentId) return node
        if (node.followUps.includes(childId)) return node
        return {
          ...node,
          followUps: [...node.followUps, childId],
        }
      })

      // Create new edge if it doesn't exist
      const newEdge = edgeExists
        ? []
        : [
            {
              id: `edge_${parentId}_${childId}`,
              from: parentId,
              to: childId,
              type: 'extends',
              strength: 0.8, // Strong - direct follow-up
              discovered: true,
              explanation: 'Follow-up question',
            },
          ]

      return {
        ...prev,
        nodes: updatedNodes,
        edges: [...prev.edges, ...newEdge],
      }
    })
  }, [])

  /**
   * Resolve a suggested gap after the topic is generated.
   * Removes matching gaps and connects the new node to suggested sources.
   *
   * @param {Object} params
   * @param {string} params.topicName - Newly created topic name
   * @param {string} params.suggestedName - Suggested topic name from gap
   * @param {string} params.nodeId - Created node id
   * @param {string[]} params.connectsTo - Node IDs to connect
   */
  const resolveSuggestedGap = useCallback((params) => {
    const {
      topicName,
      suggestedName,
      nodeId,
      connectsTo = [],
    } = params || {}
    if (!topicName && !suggestedName) return

    const normalizedNames = [topicName, suggestedName]
      .filter(Boolean)
      .map((name) => normalizeTopicName(name))

    setGraph((prev) => {
      const updatedGaps = prev.gaps.filter((gap) => {
        const normalizedGap = normalizeTopicName(gap.suggestedTopic)
        return !normalizedNames.includes(normalizedGap)
      })

      if (!Array.isArray(connectsTo) || connectsTo.length === 0) {
        return {
          ...prev,
          gaps: updatedGaps,
        }
      }

      const targetNode =
        (nodeId && prev.nodes.find((n) => n.id === nodeId)) ||
        prev.nodes.find((n) =>
          normalizedNames.includes(normalizeTopicName(n.name))
        )

      if (!targetNode) {
        return {
          ...prev,
          gaps: updatedGaps,
        }
      }

      const updatedNodes = prev.nodes.map((node) => {
        if (node.id !== targetNode.id) return node
        const nextFollowUps = Array.isArray(node.followUps)
          ? node.followUps
          : []
        const nextSet = new Set(nextFollowUps)
        connectsTo.forEach((sourceId) => {
          if (sourceId && sourceId !== node.id) {
            nextSet.add(sourceId)
          }
        })
        return {
          ...node,
          followUps: Array.from(nextSet),
        }
      })

      const updatedEdges = [...prev.edges]
      connectsTo.forEach((sourceId) => {
        if (!sourceId || sourceId === targetNode.id) return
        const exists = updatedEdges.some(
          (edge) =>
            (edge.from === sourceId && edge.to === targetNode.id) ||
            (edge.from === targetNode.id && edge.to === sourceId)
        )
        if (!exists) {
          updatedEdges.push({
            id: `edge_${sourceId}_${targetNode.id}`,
            from: sourceId,
            to: targetNode.id,
            type: 'extends',
            strength: 0.8,
            discovered: true,
            explanation: 'Suggested gap connection',
          })
        }
      })

      return {
        ...prev,
        gaps: updatedGaps,
        nodes: updatedNodes,
        edges: updatedEdges,
      }
    })
  }, [])

  /**
   * Delete a topic node from the graph
   * Removes the node, all connected edges, and updates clusters
   *
   * @param {string} nodeId - Node ID to delete
   */
  const deleteTopic = useCallback((nodeId) => {
    setGraph((prev) => {
      // Filter out the node
      const updatedNodes = prev.nodes.filter((n) => n.id !== nodeId)

      // Filter edges where from or to matches nodeId
      const updatedEdges = prev.edges.filter(
        (e) => e.from !== nodeId && e.to !== nodeId
      )

      // Filter nodeId from each cluster's nodeIds array; remove empty clusters
      const updatedClusters = prev.clusters
        .map((cluster) => ({
          ...cluster,
          nodeIds: cluster.nodeIds.filter((id) => id !== nodeId),
        }))
        .filter((cluster) => cluster.nodeIds.length > 0)

      // Clean nodeId from other nodes' followUps arrays
      const cleanedNodes = updatedNodes.map((node) => {
        if (!node.followUps.includes(nodeId)) return node
        return {
          ...node,
          followUps: node.followUps.filter((id) => id !== nodeId),
        }
      })

      // Recalculate explorer rank
      const explorerRank = getExplorerRank(cleanedNodes.length)

      logger.info('STORAGE', 'Deleted topic from knowledge graph', {
        nodeId,
        remainingNodes: cleanedNodes.length,
      })

      // Filter gaps that reference the deleted node
      const gapRetainsNode = (ids) => {
        if (!Array.isArray(ids) || ids.length === 0) return true
        return ids.every((id) => id !== nodeId)
      }

      const updatedGaps = prev.gaps.filter((gap) =>
        gapRetainsNode(gap.relatedNodeIds) && gapRetainsNode(gap.connectsTo)
      )

      return {
        ...prev,
        nodes: cleanedNodes,
        edges: updatedEdges,
        clusters: updatedClusters,
        gaps: updatedGaps,
        explorerRank,
      }
    })
  }, [])

  /**
   * Delete a topic by name (convenience wrapper)
   *
   * @param {string} name - Topic name to delete
   */
  const deleteTopicByName = useCallback(
    (name) => {
      const node = graph.nodes.find(
        (n) => n.name.toLowerCase() === name?.toLowerCase()
      )
      if (node) {
        deleteTopic(node.id)
      }
    },
    [graph.nodes, deleteTopic]
  )

  /**
   * Reconcile graph nodes with current topics from sidebar
   * Removes stale nodes from localStorage that no longer exist in the topics array
   *
   * @param {string[]} topicNames - Array of topic name strings from sidebar
   */
  const reconcileWithTopics = useCallback((topicNames) => {
    setGraph((prev) => {
      // Create case-insensitive lookup of valid topic names
      const validNames = new Set(
        topicNames.map((name) => name?.toLowerCase()).filter(Boolean)
      )

      // Keep only nodes whose name matches a valid topic (case-insensitive)
      const updatedNodes = prev.nodes.filter((node) =>
        validNames.has(node.name?.toLowerCase())
      )

      // Extract IDs of remaining nodes for edge/cluster cleanup
      const validNodeIds = new Set(updatedNodes.map((n) => n.id))

      // Remove orphaned edges (where from or to references a deleted node)
      const updatedEdges = prev.edges.filter(
        (edge) => validNodeIds.has(edge.from) && validNodeIds.has(edge.to)
      )

      // Remove empty clusters and filter out deleted nodes from cluster nodeIds
      const updatedClusters = prev.clusters
        .map((cluster) => ({
          ...cluster,
          nodeIds: cluster.nodeIds.filter((id) => validNodeIds.has(id)),
        }))
        .filter((cluster) => cluster.nodeIds.length > 0)

      // Clean up gaps that reference deleted nodes
      const gapWithinNodes = (ids) => {
        if (!Array.isArray(ids) || ids.length === 0) return true
        return ids.every((id) => validNodeIds.has(id))
      }

      const updatedGaps = prev.gaps.filter((gap) =>
        gapWithinNodes(gap.relatedNodeIds) && gapWithinNodes(gap.connectsTo)
      )

      // Clean nodeId references from remaining nodes' followUps arrays
      const cleanedNodes = updatedNodes.map((node) => {
        const validFollowUps = node.followUps.filter((id) =>
          validNodeIds.has(id)
        )
        if (validFollowUps.length === node.followUps.length) {
          return node
        }
        return {
          ...node,
          followUps: validFollowUps,
        }
      })

      // Recalculate explorer rank from remaining node count
      const explorerRank = getExplorerRank(cleanedNodes.length)

      const removedCount = prev.nodes.length - cleanedNodes.length

      if (removedCount > 0) {
        logger.info('STORAGE', 'Reconciled knowledge graph with topics', {
          removedNodes: removedCount,
          remainingNodes: cleanedNodes.length,
        })
      }

      return {
        ...prev,
        nodes: cleanedNodes,
        edges: updatedEdges,
        clusters: updatedClusters,
        gaps: updatedGaps,
        explorerRank,
      }
    })
  }, [])

  /**
   * Mark an edge as discovered (user explored the connection)
   *
   * @param {string} edgeId - Edge ID
   */
  const discoverEdge = useCallback((edgeId) => {
    setGraph((prev) => ({
      ...prev,
      edges: prev.edges.map((edge) =>
        edge.id === edgeId ? { ...edge, discovered: true } : edge
      ),
    }))
  }, [])

  /**
   * Refresh knowledge gaps from API
   * Requires at least MIN_NODES_FOR_GAPS nodes
   */
  const refreshGaps = useCallback(async () => {
    if (graph.nodes.length < MIN_NODES_FOR_GAPS) {
      logger.debug('STORAGE', 'Not enough nodes for gap analysis', {
        current: graph.nodes.length,
        required: MIN_NODES_FOR_GAPS,
      })
      return []
    }

    try {
      const response = await fetch(`${API_BASE}/api/graph/gaps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graph }),
      })

      if (!response.ok) {
        logger.warn('STORAGE', 'Gap analysis API returned error', {
          status: response.status,
        })
        return []
      }

      const data = await response.json()
      const existingNames = new Set(
        graph.nodes.map((node) => normalizeTopicName(node.name))
      )
      const rawGaps = data.gaps || []
      const dedupedGaps = rawGaps.filter((gap) => {
        const normalized = normalizeTopicName(gap.suggestedTopic)
        return normalized && !existingNames.has(normalized)
      })
      const filteredGaps = filterGapsWithConnections(dedupedGaps)
      const skippedDuplicates = rawGaps.length - dedupedGaps.length
      const skippedDisconnected = dedupedGaps.length - filteredGaps.length

      setGraph((prev) => ({
        ...prev,
        gaps: filteredGaps,
      }))

      logger.info('STORAGE', 'Refreshed knowledge gaps', {
        gapsCount: filteredGaps.length,
        skippedDuplicates,
        skippedDisconnected,
      })

      return filteredGaps
    } catch (err) {
      logger.warn('STORAGE', 'Gap refresh failed', { error: err.message })
      return []
    }
  }, [graph])

  /**
   * Re-cluster all topics via API
   * Requires at least MIN_NODES_FOR_CLUSTER nodes
   */
  const recluster = useCallback(async () => {
    if (graph.nodes.length < MIN_NODES_FOR_CLUSTER) {
      logger.debug('STORAGE', 'Not enough nodes for reclustering', {
        current: graph.nodes.length,
        required: MIN_NODES_FOR_CLUSTER,
      })
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/graph/cluster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: graph.nodes }),
      })

      if (!response.ok) {
        logger.warn('STORAGE', 'Cluster API returned error', {
          status: response.status,
        })
        return
      }

      const data = await response.json()

      setGraph((prev) => ({
        ...prev,
        clusters: data.clusters || [],
      }))

      logger.info('STORAGE', 'Reclustered topics', {
        clustersCount: data.clusters?.length || 0,
      })
    } catch (err) {
      logger.warn('STORAGE', 'Recluster failed', { error: err.message })
    }
  }, [graph.nodes])

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get a node by ID
   *
   * @param {string} nodeId - Node ID to find
   * @returns {Object|undefined} Node object or undefined
   */
  const getNode = useCallback(
    (nodeId) => {
      return graph.nodes.find((n) => n.id === nodeId)
    },
    [graph.nodes]
  )

  /**
   * Get a node by name (case-insensitive)
   *
   * @param {string} name - Topic name to find
   * @returns {Object|undefined} Node object or undefined
   */
  const getNodeByName = useCallback(
    (name) => {
      return graph.nodes.find(
        (n) => n.name.toLowerCase() === name?.toLowerCase()
      )
    },
    [graph.nodes]
  )

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const topicCount = useMemo(() => graph.nodes.length, [graph.nodes])
  const clusterCount = useMemo(() => graph.clusters.length, [graph.clusters])
  const edgeCount = useMemo(() => graph.edges.length, [graph.edges])

  /**
   * Get nodes that need review (older than 7 days)
   */
  const staleNodes = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return graph.nodes.filter((n) => n.lastReviewedAt < sevenDaysAgo)
  }, [graph.nodes])

  // ============================================================================
  // RETURN VALUE
  // ============================================================================

  return {
    // State
    graph,
    nodes: graph.nodes,
    edges: graph.edges,
    clusters: graph.clusters,
    gaps: graph.gaps,
    explorerRank: graph.explorerRank,
    isLoading,
    error,

    // Computed values
    topicCount,
    clusterCount,
    edgeCount,
    staleNodes,

    // Mutation methods
    addTopic,
    updateMastery,
    addFollowUp,
    discoverEdge,
    refreshGaps,
    recluster,
    deleteTopic,
    deleteTopicByName,
    reconcileWithTopics,
    resolveSuggestedGap,

    // Query methods
    getNode,
    getNodeByName,
  }
}
