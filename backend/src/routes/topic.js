/**
 * Topic Route
 * F087: Automatic topic name generation
 *
 * POST /api/topic/name - Generate a short topic name from a user query
 */

import express from 'express'
import logger from '../utils/logger.js'
import { sanitizeQuery } from '../utils/sanitize.js'
import { isGeminiAvailable, generateTopicName } from '../services/gemini.js'

const router = express.Router()

/**
 * POST /api/topic/name
 * Generate a short, relevant topic name from a user query
 *
 * Request body:
 * - query (required): The user's question (string)
 *
 * Response:
 * - topicName: Generated topic name (2-4 words, no question words)
 *
 * Errors:
 *   - 400: Empty or invalid query
 *   - 500: Topic name generation failed
 *   - 503: Gemini API not available
 */
router.post('/name', async (req, res) => {
  logger.time('API', 'topic-name-request')

  try {
    const { query } = req.body

    // Validate and sanitize the query using shared utility
    const { sanitized: sanitizedQuery, error: queryError } = sanitizeQuery(query)
    if (queryError) {
      logger.warn('API', '[Topic] Invalid query', { error: queryError })
      logger.timeEnd('API', 'topic-name-request')
      return res.status(400).json({
        error: queryError,
        field: 'query',
      })
    }

    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      logger.warn('API', '[Topic] Gemini API not available')
      logger.timeEnd('API', 'topic-name-request')
      return res.status(503).json({
        error: 'Topic name service temporarily unavailable',
      })
    }

    logger.info('API', '[Topic] Generating topic name', {
      queryLength: sanitizedQuery.length,
    })

    // Generate the topic name
    const result = await generateTopicName(sanitizedQuery)

    if (result.error) {
      logger.error('API', '[Topic] Generation failed', {
        error: result.error,
      })
      logger.timeEnd('API', 'topic-name-request')

      // Map error types to appropriate HTTP status codes
      if (result.error === 'EMPTY_RESPONSE') {
        return res.status(500).json({
          error: 'Failed to generate topic name',
        })
      }

      if (result.error === 'RATE_LIMITED') {
        return res.status(429)
          .set('Retry-After', '60')
          .json({
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: 60,
          })
      }

      return res.status(500).json({
        error: 'Topic name generation failed',
      })
    }

    logger.info('API', '[Topic] Success', {
      topicName: result.topicName,
    })
    logger.timeEnd('API', 'topic-name-request')

    // Return the generated topic name
    res.json({
      topicName: result.topicName,
    })
  } catch (error) {
    logger.error('API', '[Topic] Request error', {
      error: error.message,
      stack: error.stack,
    })
    logger.timeEnd('API', 'topic-name-request')

    res.status(500).json({
      error: 'Internal server error',
    })
  }
})

export default router
