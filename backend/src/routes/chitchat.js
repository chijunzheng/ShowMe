import express from 'express'
import { sanitizeQuery } from '../utils/sanitize.js'
import { isGeminiAvailable, generateChitchatResponse } from '../services/gemini.js'

const router = express.Router()

const FALLBACK_RESPONSE = "Hey! What would you like to learn today?"

/**
 * POST /api/chitchat
 * Generate a short chitchat response without triggering slide generation.
 *
 * Request body:
 * - query (required): The user's message
 * - activeTopicName (optional): Current topic name for context
 *
 * Response:
 * - responseText: Short, friendly reply
 * - available: Whether Gemini generated the response
 */
router.post('/', async (req, res) => {
  try {
    const { query, activeTopicName = '' } = req.body || {}

    const { sanitized: sanitizedQuery, error: queryError } = sanitizeQuery(query)
    if (queryError) {
      return res.status(400).json({
        error: queryError,
        field: 'query'
      })
    }

    if (!isGeminiAvailable()) {
      return res.json({
        responseText: FALLBACK_RESPONSE,
        available: false,
      })
    }

    const result = await generateChitchatResponse(sanitizedQuery, { activeTopicName })
    if (result.error || !result.responseText) {
      return res.json({
        responseText: FALLBACK_RESPONSE,
        available: false,
        error: result.error || 'EMPTY_RESPONSE',
      })
    }

    res.json({
      responseText: result.responseText,
      available: true,
    })
  } catch (error) {
    console.error('[Chitchat] Error generating response:', error)
    res.status(500).json({ error: 'Failed to generate chitchat response' })
  }
})

export default router
