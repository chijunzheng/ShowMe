/**
 * Knowledge Graph Service
 * v2.0: Manages user's knowledge graph data
 *
 * Stores and retrieves the personalized knowledge graph showing
 * connections between topics the user has explored.
 *
 * This service supports two storage modes:
 * - Cloud: Uses Firestore when GOOGLE_CLOUD_PROJECT is configured
 * - Memory: Falls back to in-memory storage for development
 */

import { Firestore } from '@google-cloud/firestore'
import logger from '../utils/logger.js'

// Storage mode constants
const STORAGE_MODE = {
  CLOUD: 'cloud',
  MEMORY: 'memory'
}

// Singleton instances
let db = null
let currentMode = null

// In-memory storage for development/fallback
// Map<clientId, GraphObject>
const memoryGraphStore = new Map()

function getFirestore() {
  if (db) return db

  // Skip Firestore if not configured
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    return null
  }

  try {
    db = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    })
    return db
  } catch (error) {
    logger.error('GRAPH', 'Failed to connect to Firestore', { error: error.message })
    return null
  }
}

/**
 * Determine the current storage mode
 * @returns {string} 'cloud' or 'memory'
 */
function getStorageMode() {
  if (currentMode) return currentMode

  const firestore = getFirestore()
  if (firestore) {
    currentMode = STORAGE_MODE.CLOUD
    logger.info('GRAPH', 'Using cloud storage mode (Firestore)')
  } else {
    currentMode = STORAGE_MODE.MEMORY
    logger.info('GRAPH', 'Using in-memory storage mode (development fallback)')
  }

  return currentMode
}

/**
 * Check if using in-memory mode
 * @returns {boolean}
 */
function isMemoryMode() {
  return getStorageMode() === STORAGE_MODE.MEMORY
}

const COLLECTION_NAME = 'knowledgeGraphs'

// Category colors for visualization
export const CATEGORY_COLORS = {
  Science: '#8B5CF6',    // Purple
  Technology: '#3B82F6', // Blue
  History: '#A16207',    // Brown
  Art: '#EAB308',        // Yellow
  Nature: '#22C55E',     // Green
  Space: '#1E3A8A',      // Dark Blue
  Math: '#EF4444',       // Red
  Language: '#F97316',   // Orange
  Health: '#EC4899',     // Pink
  Society: '#6366F1',    // Indigo
  General: '#6B7280',    // Gray
}

/**
 * Create default empty knowledge graph
 * @param {string} clientId
 * @returns {Object}
 */
function createDefaultGraph(clientId) {
  return {
    clientId,
    nodes: [],
    edges: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

/**
 * Get user's knowledge graph
 * @param {string} clientId
 * @returns {Promise<{graph: Object|null, error: string|null}>}
 */
export async function getKnowledgeGraph(clientId) {
  // Use in-memory storage if cloud not available
  if (isMemoryMode()) {
    const graph = memoryGraphStore.get(clientId) || createDefaultGraph(clientId)
    return { graph, error: null }
  }

  const firestore = getFirestore()
  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { graph: createDefaultGraph(clientId), error: null }
    }

    const data = doc.data()
    return {
      graph: {
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
      },
      error: null
    }
  } catch (error) {
    logger.error('GRAPH', 'Failed to get knowledge graph', { clientId, error: error.message })
    return { graph: null, error: error.message }
  }
}

/**
 * Apply node addition logic to a graph object
 * @param {Object} graph - The graph object to modify
 * @param {Object} node - Node data to add
 * @param {string[]} relatedTo - IDs of related nodes
 * @returns {Object} Updated graph
 */
function applyNodeToGraph(graph, node, relatedTo = []) {
  // Check if node already exists
  const existingNodeIndex = graph.nodes.findIndex(n => n.id === node.id)

  const now = new Date()
  const nodeWithMeta = {
    ...node,
    color: CATEGORY_COLORS[node.category] || CATEGORY_COLORS.General,
    exploredAt: now,
    explored: true
  }

  if (existingNodeIndex >= 0) {
    // Update existing node
    graph.nodes[existingNodeIndex] = {
      ...graph.nodes[existingNodeIndex],
      ...nodeWithMeta
    }
  } else {
    // Add new node
    graph.nodes.push(nodeWithMeta)
  }

  // Add edges for related topics
  for (const relatedId of relatedTo) {
    // Check if related node exists in graph
    const relatedNode = graph.nodes.find(n =>
      n.id === relatedId ||
      n.label?.toLowerCase() === relatedId.toLowerCase()
    )

    if (relatedNode) {
      // Check if edge already exists
      const edgeExists = graph.edges.some(e =>
        (e.from === node.id && e.to === relatedNode.id) ||
        (e.from === relatedNode.id && e.to === node.id)
      )

      if (!edgeExists) {
        graph.edges.push({
          from: node.id,
          to: relatedNode.id,
          type: 'related'
        })
      }
    }
  }

  graph.updatedAt = now
  return graph
}

/**
 * Add a node to the knowledge graph
 * @param {string} clientId
 * @param {Object} node - Node data { id, label, category, explored, parentConcept, childConcepts }
 * @param {string[]} relatedTo - IDs of existing nodes this connects to
 * @returns {Promise<{graph: Object|null, error: string|null}>}
 */
export async function addGraphNode(clientId, node, relatedTo = []) {
  // Use in-memory storage if cloud not available
  if (isMemoryMode()) {
    try {
      let graph = memoryGraphStore.get(clientId) || createDefaultGraph(clientId)
      graph = applyNodeToGraph(graph, node, relatedTo)
      memoryGraphStore.set(clientId, graph)

      logger.info('GRAPH', 'Node added to knowledge graph (memory)', {
        clientId,
        nodeId: node.id,
        category: node.category,
        edgesAdded: relatedTo.length
      })

      return { graph, error: null }
    } catch (error) {
      logger.error('GRAPH', 'Failed to add graph node (memory)', { clientId, error: error.message })
      return { graph: null, error: error.message }
    }
  }

  const firestore = getFirestore()
  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    let graph
    if (!doc.exists) {
      graph = createDefaultGraph(clientId)
    } else {
      graph = doc.data()
    }

    graph = applyNodeToGraph(graph, node, relatedTo)

    await docRef.set(graph)

    logger.info('GRAPH', 'Node added to knowledge graph', {
      clientId,
      nodeId: node.id,
      category: node.category,
      edgesAdded: relatedTo.length
    })

    return { graph, error: null }
  } catch (error) {
    logger.error('GRAPH', 'Failed to add graph node', { clientId, error: error.message })
    return { graph: null, error: error.message }
  }
}

/**
 * Apply suggested nodes logic to a graph object
 * @param {Object} graph - The graph object to modify
 * @param {Object[]} suggestions - Array of { label, fromNodeId }
 * @returns {Object} Updated graph
 */
function applySuggestionsToGraph(graph, suggestions) {
  const now = new Date()

  for (const suggestion of suggestions) {
    const suggestedId = `suggested_${suggestion.label.toLowerCase().replace(/\s+/g, '_')}`

    // Check if this suggestion already exists
    const exists = graph.nodes.some(n =>
      n.id === suggestedId ||
      n.label?.toLowerCase() === suggestion.label.toLowerCase()
    )

    if (!exists) {
      // Add suggested node (not explored)
      graph.nodes.push({
        id: suggestedId,
        label: suggestion.label,
        explored: false,
        suggested: true,
        category: 'General', // Will be classified when explored
        color: '#9CA3AF', // Gray for suggested
        createdAt: now
      })

      // Add edge from source node
      if (suggestion.fromNodeId) {
        graph.edges.push({
          from: suggestion.fromNodeId,
          to: suggestedId,
          type: 'suggested'
        })
      }
    }
  }

  graph.updatedAt = now
  return graph
}

/**
 * Add suggested nodes (unexplored) to the graph
 * @param {string} clientId
 * @param {Object[]} suggestions - Array of { label, fromNodeId }
 * @returns {Promise<{graph: Object|null, error: string|null}>}
 */
export async function addSuggestedNodes(clientId, suggestions) {
  // Use in-memory storage if cloud not available
  if (isMemoryMode()) {
    try {
      let graph = memoryGraphStore.get(clientId)

      if (!graph) {
        // Create a new graph if it doesn't exist (for memory mode)
        graph = createDefaultGraph(clientId)
      }

      graph = applySuggestionsToGraph(graph, suggestions)
      memoryGraphStore.set(clientId, graph)

      return { graph, error: null }
    } catch (error) {
      logger.error('GRAPH', 'Failed to add suggested nodes (memory)', { clientId, error: error.message })
      return { graph: null, error: error.message }
    }
  }

  const firestore = getFirestore()
  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    let graph
    if (!doc.exists) {
      // Create a new graph if it doesn't exist
      graph = createDefaultGraph(clientId)
    } else {
      graph = doc.data()
    }

    graph = applySuggestionsToGraph(graph, suggestions)
    await docRef.set(graph)

    return { graph, error: null }
  } catch (error) {
    logger.error('GRAPH', 'Failed to add suggested nodes', { clientId, error: error.message })
    return { graph: null, error: error.message }
  }
}

/**
 * Get graph statistics
 * @param {string} clientId
 * @returns {Promise<{stats: Object|null, error: string|null}>}
 */
export async function getGraphStats(clientId) {
  const { graph, error } = await getKnowledgeGraph(clientId)

  if (error || !graph) {
    return { stats: null, error }
  }

  const exploredNodes = graph.nodes.filter(n => n.explored)
  const suggestedNodes = graph.nodes.filter(n => n.suggested && !n.explored)

  // Count categories
  const categoryCount = {}
  for (const node of exploredNodes) {
    categoryCount[node.category] = (categoryCount[node.category] || 0) + 1
  }

  return {
    stats: {
      totalNodes: graph.nodes.length,
      exploredCount: exploredNodes.length,
      suggestedCount: suggestedNodes.length,
      edgeCount: graph.edges.length,
      categoryBreakdown: categoryCount,
      topCategory: Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    },
    error: null
  }
}

/**
 * Get the current storage mode
 * @returns {string} 'cloud' or 'memory'
 */
export function getCurrentStorageMode() {
  return getStorageMode()
}

/**
 * Clear in-memory storage (for testing)
 * Only affects memory mode storage
 */
export function clearMemoryStore() {
  memoryGraphStore.clear()
  logger.debug('GRAPH', 'In-memory store cleared')
}

export default {
  getKnowledgeGraph,
  addGraphNode,
  addSuggestedNodes,
  getGraphStats,
  getCurrentStorageMode,
  clearMemoryStore,
  CATEGORY_COLORS
}
