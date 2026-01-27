/**
 * Knowledge Graph Routes
 * v2.0: REST endpoints for knowledge graph operations
 */

import { Router } from 'express'
import { getKnowledgeGraph, addGraphNode, addSuggestedNodes, getGraphStats, CATEGORY_COLORS } from '../services/knowledgeGraph.js'
import { classifyTopic } from '../services/gemini.js'
import { sanitizeId } from '../utils/sanitize.js'
import logger from '../utils/logger.js'

const router = Router()

/**
 * GET /api/graph
 * Get user's knowledge graph
 *
 * Query params:
 * - clientId: string - The client identifier
 *
 * Response:
 * - graph: { nodes, edges }
 * - stats: Graph statistics
 * - categoryColors: Color mapping for categories
 */
router.get('/', async (req, res) => {
  try {
    const { clientId } = req.query

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId'
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      return res.status(400).json({
        error: idError,
        field: 'clientId'
      })
    }

    const [graphResult, statsResult] = await Promise.all([
      getKnowledgeGraph(sanitizedId),
      getGraphStats(sanitizedId)
    ])

    if (graphResult.error) {
      return res.status(500).json({ error: graphResult.error })
    }

    return res.json({
      graph: graphResult.graph,
      stats: statsResult.stats,
      categoryColors: CATEGORY_COLORS
    })
  } catch (error) {
    logger.error('GRAPH', 'Unexpected error getting graph', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/graph/classify
 * Classify a topic and add it to the knowledge graph
 *
 * Request body:
 * - clientId: string - The client identifier
 * - topicName: string - The topic to classify
 * - topicId: string - Unique ID for the topic
 *
 * Response:
 * - classification: { category, relatedTo, parentConcept, childConcepts, suggestedNext }
 * - graph: Updated knowledge graph
 */
router.post('/classify', async (req, res) => {
  try {
    const { clientId, topicName, topicId } = req.body

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId'
      })
    }

    if (!topicName || typeof topicName !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid topicName',
        field: 'topicName'
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      return res.status(400).json({
        error: idError,
        field: 'clientId'
      })
    }

    // Get existing topics from graph
    const { graph } = await getKnowledgeGraph(sanitizedId)
    const existingTopics = graph?.nodes
      ?.filter(n => n.explored)
      ?.map(n => n.label) || []

    // Classify the topic
    logger.info('GRAPH', 'Classifying topic', { clientId: sanitizedId, topicName })
    const classification = await classifyTopic({
      topicName,
      existingTopics
    })

    if (classification.error) {
      logger.warn('GRAPH', 'Classification failed, using defaults', { error: classification.error })
    }

    // Create node ID
    const nodeId = topicId || `topic_${topicName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`

    // Add node to graph
    const nodeResult = await addGraphNode(
      sanitizedId,
      {
        id: nodeId,
        label: topicName,
        category: classification.category,
        parentConcept: classification.parentConcept,
        childConcepts: classification.childConcepts
      },
      classification.relatedTo
    )

    // Add suggested nodes
    if (classification.suggestedNext.length > 0) {
      await addSuggestedNodes(
        sanitizedId,
        classification.suggestedNext.map(label => ({
          label,
          fromNodeId: nodeId
        }))
      )
    }

    // Get updated graph
    const updatedGraph = await getKnowledgeGraph(sanitizedId)

    return res.json({
      classification,
      graph: updatedGraph.graph
    })
  } catch (error) {
    logger.error('GRAPH', 'Unexpected error classifying topic', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/graph/suggestions
 * Get AI-powered topic suggestions based on the graph
 *
 * Query params:
 * - clientId: string - The client identifier
 *
 * Response:
 * - suggestions: Array of suggested topics with context
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { clientId } = req.query

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId'
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      return res.status(400).json({
        error: idError,
        field: 'clientId'
      })
    }

    const { graph } = await getKnowledgeGraph(sanitizedId)

    if (!graph || graph.nodes.length === 0) {
      return res.json({
        suggestions: [
          { label: 'How does WiFi work?', type: 'starter', context: 'Popular first topic' },
          { label: 'Why is the sky blue?', type: 'starter', context: 'Science favorite' },
          { label: 'How do computers think?', type: 'starter', context: 'Technology basics' }
        ]
      })
    }

    // Get suggested (unexplored) nodes from the graph
    const suggestedNodes = graph.nodes
      .filter(n => n.suggested && !n.explored)
      .slice(0, 5)
      .map(n => ({
        label: n.label,
        type: 'suggested',
        context: 'Based on your explorations'
      }))

    // Get child concepts from explored nodes
    const childSuggestions = []
    for (const node of graph.nodes.filter(n => n.explored)) {
      if (node.childConcepts) {
        for (const child of node.childConcepts.slice(0, 2)) {
          // Check if not already explored
          const isExplored = graph.nodes.some(n =>
            n.explored && n.label?.toLowerCase() === child.toLowerCase()
          )
          if (!isExplored) {
            childSuggestions.push({
              label: child,
              type: 'deeper',
              context: `Go deeper into ${node.label}`
            })
          }
        }
      }
    }

    const allSuggestions = [...suggestedNodes, ...childSuggestions.slice(0, 3)]

    return res.json({
      suggestions: allSuggestions.slice(0, 6)
    })
  } catch (error) {
    logger.error('GRAPH', 'Unexpected error getting suggestions', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
