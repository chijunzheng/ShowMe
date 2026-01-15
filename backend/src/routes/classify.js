import express from 'express'
// import { classifyQuery } from '../services/gemini.js'

const router = express.Router()

/**
 * POST /api/classify
 * Classify query as follow_up or new_topic
 */
router.post('/', async (req, res) => {
  try {
    const { query, activeTopicId, activeTopic, conversationHistory = [], topicCount = 0 } = req.body

    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    // If no active topic, it's always a new topic
    if (!activeTopicId) {
      return res.json({
        classification: 'new_topic',
        reasoning: 'No active topic exists',
        shouldEvictOldest: false,
      })
    }

    // TODO: Implement actual classification with Gemini
    // For now, use simple heuristic

    const isFollowUp = false // Placeholder

    const response = {
      classification: isFollowUp ? 'follow_up' : 'new_topic',
      reasoning: 'Placeholder classification reasoning',
      shouldEvictOldest: !isFollowUp && topicCount >= 3,
    }

    if (response.shouldEvictOldest) {
      response.evictTopicId = 'oldest_topic_id' // Placeholder
    }

    res.json(response)
  } catch (error) {
    console.error('Classification error:', error)
    res.status(500).json({ error: 'Failed to classify query' })
  }
})

export default router
