/**
 * Knowledge Graph API Routes
 * KC001: Knowledge Constellation graph operations
 *
 * Endpoints for graph operations:
 * - POST /api/graph - Get/validate full graph for user
 * - POST /api/graph/discover - Find relationships for new topic
 * - POST /api/graph/gaps - Analyze gaps in knowledge
 * - POST /api/graph/cluster - Re-cluster all topics
 * - POST /api/graph/placement - Determine follow-up placement
 * - POST /api/graph/path - Get learning path to goal
 */

import { Router } from 'express'
import {
  discoverRelationships,
  identifyKnowledgeGaps,
  clusterKnowledge,
  determineFollowUpPlacement,
  suggestLearningPath
} from '../services/geminiGraph.js'
import logger from '../utils/logger.js'

const router = Router()

/**
 * POST /api/graph
 *
 * Returns the user's knowledge graph (validation/enrichment endpoint).
 * Graph data is passed in request body (stateless server).
 *
 * Note: In a real app, this would fetch from a database.
 * For now, client sends their graph for processing.
 *
 * Request body:
 * - graph: KnowledgeGraph - The user's knowledge graph
 *
 * Response:
 * - success: boolean
 * - graph: KnowledgeGraph - The validated/enriched graph
 */
router.post('/', async (req, res) => {
  try {
    const { graph } = req.body

    if (!graph) {
      return res.status(400).json({
        error: 'Graph data required',
        field: 'graph'
      })
    }

    // Validate graph structure
    if (!graph.nodes || !Array.isArray(graph.nodes)) {
      return res.status(400).json({
        error: 'Graph must contain nodes array',
        field: 'graph.nodes'
      })
    }

    logger.info('GRAPH', 'Validating graph', { nodeCount: graph.nodes.length })

    // Return the graph as-is (client-side storage)
    // Could add server-side validation/enrichment here
    res.json({
      success: true,
      graph
    })
  } catch (error) {
    logger.error('GRAPH', 'Error in POST /graph', { error: error.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/graph/discover
 *
 * Discover relationships between a new topic and existing nodes.
 * Called when a user learns a new topic.
 *
 * Request body:
 * - newTopic: { id, name, concepts } - The new topic to integrate
 * - existingNodes: KnowledgeNode[] - Existing nodes in the graph
 *
 * Response:
 * - success: boolean
 * - relationships: Relationship[] - Discovered relationships
 * - suggestedCluster: string - Recommended cluster for the topic
 */
router.post('/discover', async (req, res) => {
  try {
    const { newTopic, existingNodes } = req.body

    // Validate newTopic
    if (!newTopic) {
      return res.status(400).json({
        error: 'newTopic is required',
        field: 'newTopic'
      })
    }

    if (!newTopic.name || typeof newTopic.name !== 'string') {
      return res.status(400).json({
        error: 'newTopic must have a name string',
        field: 'newTopic.name'
      })
    }

    // Validate existingNodes is an array if provided
    const nodes = existingNodes || []
    if (!Array.isArray(nodes)) {
      return res.status(400).json({
        error: 'existingNodes must be an array',
        field: 'existingNodes'
      })
    }

    logger.info('GRAPH', 'Discovering relationships', {
      topic: newTopic.name,
      existingNodeCount: nodes.length
    })

    const result = await discoverRelationships(newTopic, nodes)

    if (result.error) {
      logger.error('GRAPH', 'Discovery failed', { error: result.error })

      // Map specific errors to appropriate status codes
      if (result.error === 'RATE_LIMITED') {
        return res.status(429)
          .set('Retry-After', '60')
          .json({ error: 'Rate limit exceeded', retryAfter: 60 })
      }

      return res.status(500).json({ error: 'Failed to discover relationships' })
    }

    logger.info('GRAPH', 'Relationships discovered', {
      relationshipCount: result.relationships?.length || 0,
      suggestedCluster: result.suggestedCluster
    })

    res.json({
      success: true,
      relationships: result.relationships || [],
      suggestedCluster: result.suggestedCluster || null
    })
  } catch (error) {
    logger.error('GRAPH', 'Error discovering relationships', { error: error.message })
    res.status(500).json({ error: 'Failed to discover relationships' })
  }
})

/**
 * POST /api/graph/gaps
 *
 * Identify knowledge gaps in the user's graph.
 * Suggests new topics that would strengthen understanding.
 *
 * Request body:
 * - graph: KnowledgeGraph - The user's knowledge graph
 *
 * Response:
 * - success: boolean
 * - gaps: KnowledgeGap[] - Identified gaps with suggestions
 */
router.post('/gaps', async (req, res) => {
  try {
    const { graph } = req.body

    // Validate graph
    if (!graph) {
      return res.status(400).json({
        error: 'Graph is required',
        field: 'graph'
      })
    }

    if (!graph.nodes || !Array.isArray(graph.nodes)) {
      return res.status(400).json({
        error: 'Graph must contain nodes array',
        field: 'graph.nodes'
      })
    }

    // Need at least a few nodes to identify gaps
    if (graph.nodes.length < 2) {
      return res.json({
        success: true,
        gaps: [],
        message: 'Need more topics to identify gaps'
      })
    }

    logger.info('GRAPH', 'Identifying knowledge gaps', {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges?.length || 0
    })

    const result = await identifyKnowledgeGaps(graph)

    if (result.error) {
      logger.error('GRAPH', 'Gap analysis failed', { error: result.error })

      if (result.error === 'RATE_LIMITED') {
        return res.status(429)
          .set('Retry-After', '60')
          .json({ error: 'Rate limit exceeded', retryAfter: 60 })
      }

      return res.status(500).json({ error: 'Failed to identify gaps' })
    }

    logger.info('GRAPH', 'Gaps identified', {
      gapCount: result.gaps?.length || 0
    })

    res.json({
      success: true,
      gaps: result.gaps || []
    })
  } catch (error) {
    logger.error('GRAPH', 'Error identifying gaps', { error: error.message })
    res.status(500).json({ error: 'Failed to identify gaps' })
  }
})

/**
 * POST /api/graph/cluster
 *
 * Re-cluster all topics into constellations.
 * Creates meaningful groupings based on topic relationships.
 *
 * Request body:
 * - nodes: KnowledgeNode[] - All nodes to cluster
 *
 * Response:
 * - success: boolean
 * - clusters: Cluster[] - The clustering result
 */
router.post('/cluster', async (req, res) => {
  try {
    const { nodes } = req.body

    // Validate nodes
    if (!nodes) {
      return res.status(400).json({
        error: 'Nodes array is required',
        field: 'nodes'
      })
    }

    if (!Array.isArray(nodes)) {
      return res.status(400).json({
        error: 'Nodes must be an array',
        field: 'nodes'
      })
    }

    // Need at least 2 nodes to cluster
    if (nodes.length < 2) {
      return res.json({
        success: true,
        clusters: nodes.length === 1
          ? [{ id: 'default', name: 'Knowledge', nodeIds: [nodes[0].id] }]
          : [],
        message: 'Not enough nodes to cluster'
      })
    }

    logger.info('GRAPH', 'Clustering knowledge', { nodeCount: nodes.length })

    const result = await clusterKnowledge(nodes)

    if (result.error) {
      logger.error('GRAPH', 'Clustering failed', { error: result.error })

      if (result.error === 'RATE_LIMITED') {
        return res.status(429)
          .set('Retry-After', '60')
          .json({ error: 'Rate limit exceeded', retryAfter: 60 })
      }

      return res.status(500).json({ error: 'Failed to cluster topics' })
    }

    logger.info('GRAPH', 'Clustering complete', {
      clusterCount: result.clusters?.length || 0
    })

    res.json({
      success: true,
      clusters: result.clusters || []
    })
  } catch (error) {
    logger.error('GRAPH', 'Error clustering', { error: error.message })
    res.status(500).json({ error: 'Failed to cluster topics' })
  }
})

/**
 * POST /api/graph/placement
 *
 * Determine where a follow-up question should be placed.
 * Helps decide if a question creates a new node or extends existing one.
 *
 * Request body:
 * - query: string - The follow-up question
 * - context: { currentTopic, graph } - Current context
 *
 * Response:
 * - success: boolean
 * - placement: 'extend' | 'new_node' | 'bridge' - Where to place
 * - reasoning: string - Explanation of the decision
 */
router.post('/placement', async (req, res) => {
  try {
    const { query, context } = req.body

    // Validate query
    if (!query) {
      return res.status(400).json({
        error: 'Query is required',
        field: 'query'
      })
    }

    if (typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query must be a string',
        field: 'query'
      })
    }

    const trimmedQuery = query.trim()
    if (trimmedQuery.length === 0) {
      return res.status(400).json({
        error: 'Query cannot be empty',
        field: 'query'
      })
    }

    // Limit query length
    if (trimmedQuery.length > 500) {
      return res.status(400).json({
        error: 'Query must be 500 characters or less',
        field: 'query'
      })
    }

    logger.info('GRAPH', 'Determining placement', {
      queryLength: trimmedQuery.length,
      hasContext: !!context
    })

    const result = await determineFollowUpPlacement(trimmedQuery, context || {})

    if (result.error) {
      logger.error('GRAPH', 'Placement determination failed', { error: result.error })

      if (result.error === 'RATE_LIMITED') {
        return res.status(429)
          .set('Retry-After', '60')
          .json({ error: 'Rate limit exceeded', retryAfter: 60 })
      }

      return res.status(500).json({ error: 'Failed to determine placement' })
    }

    logger.info('GRAPH', 'Placement determined', {
      placement: result.placement
    })

    res.json({
      success: true,
      placement: result.placement || 'new_node',
      reasoning: result.reasoning || ''
    })
  } catch (error) {
    logger.error('GRAPH', 'Error determining placement', { error: error.message })
    res.status(500).json({ error: 'Failed to determine placement' })
  }
})

/**
 * POST /api/graph/path
 *
 * Suggest a learning path to reach a goal topic.
 * Shows what topics to learn and in what order.
 *
 * Request body:
 * - graph: KnowledgeGraph - The user's current knowledge
 * - goal: string - Target topic/skill to learn
 *
 * Response:
 * - success: boolean
 * - path: PathStep[] - Ordered steps to reach the goal
 * - newTopicsNeeded: string[] - Topics not yet in graph
 */
router.post('/path', async (req, res) => {
  try {
    const { graph, goal } = req.body

    // Validate goal
    if (!goal) {
      return res.status(400).json({
        error: 'Goal is required',
        field: 'goal'
      })
    }

    if (typeof goal !== 'string') {
      return res.status(400).json({
        error: 'Goal must be a string',
        field: 'goal'
      })
    }

    const trimmedGoal = goal.trim()
    if (trimmedGoal.length === 0) {
      return res.status(400).json({
        error: 'Goal cannot be empty',
        field: 'goal'
      })
    }

    // Limit goal length
    if (trimmedGoal.length > 200) {
      return res.status(400).json({
        error: 'Goal must be 200 characters or less',
        field: 'goal'
      })
    }

    // Validate graph
    if (!graph) {
      return res.status(400).json({
        error: 'Graph is required',
        field: 'graph'
      })
    }

    if (!graph.nodes || !Array.isArray(graph.nodes)) {
      return res.status(400).json({
        error: 'Graph must contain nodes array',
        field: 'graph.nodes'
      })
    }

    logger.info('GRAPH', 'Suggesting learning path', {
      goal: trimmedGoal,
      nodeCount: graph.nodes.length
    })

    const result = await suggestLearningPath(graph, trimmedGoal)

    if (result.error) {
      logger.error('GRAPH', 'Path suggestion failed', { error: result.error })

      if (result.error === 'RATE_LIMITED') {
        return res.status(429)
          .set('Retry-After', '60')
          .json({ error: 'Rate limit exceeded', retryAfter: 60 })
      }

      return res.status(500).json({ error: 'Failed to suggest path' })
    }

    logger.info('GRAPH', 'Path suggested', {
      stepCount: result.path?.length || 0,
      newTopicsCount: result.newTopicsNeeded?.length || 0
    })

    res.json({
      success: true,
      path: result.path || [],
      newTopicsNeeded: result.newTopicsNeeded || []
    })
  } catch (error) {
    logger.error('GRAPH', 'Error suggesting path', { error: error.message })
    res.status(500).json({ error: 'Failed to suggest path' })
  }
})

export default router
