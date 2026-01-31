/**
 * Random Topic Route
 * Generate a random educational topic for the "Surprise Me" feature
 *
 * GET /api/random-topic - Generate a random topic with category and emoji
 */

import express from 'express'
import logger from '../utils/logger.js'
import { isGeminiAvailable, generateRandomTopic } from '../services/gemini.js'

const router = express.Router()

/**
 * GET /api/random-topic
 * Generate a random educational topic
 *
 * Response:
 * - topic: The topic phrased as a question (e.g., "Why do cats purr?")
 * - category: Topic category (e.g., "Animal Behavior")
 * - emoji: A relevant emoji for the topic
 *
 * Errors:
 *   - 500: Topic generation failed
 *   - 503: Gemini API not available
 */
router.get('/', async (req, res) => {
  logger.time('API', 'random-topic-request')

  try {
    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      logger.warn('API', '[RandomTopic] Gemini API not available')
      logger.timeEnd('API', 'random-topic-request')
      return res.status(503).json({
        error: 'Random topic service temporarily unavailable',
      })
    }

    logger.info('API', '[RandomTopic] Generating random topic')

    const result = await generateRandomTopic()

    if (result.error) {
      logger.error('API', '[RandomTopic] Generation failed', {
        error: result.error,
      })
      logger.timeEnd('API', 'random-topic-request')

      if (result.error === 'RATE_LIMITED') {
        return res.status(429)
          .set('Retry-After', '60')
          .json({
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: 60,
          })
      }

      return res.status(500).json({
        error: 'Failed to generate random topic',
      })
    }

    logger.info('API', '[RandomTopic] Success', {
      topic: result.topic,
      category: result.category,
    })
    logger.timeEnd('API', 'random-topic-request')

    res.json({
      topic: result.topic,
      category: result.category,
      emoji: result.emoji,
    })
  } catch (error) {
    logger.error('API', '[RandomTopic] Request error', {
      error: error.message,
      stack: error.stack,
    })
    logger.timeEnd('API', 'random-topic-request')

    res.status(500).json({
      error: 'Internal server error',
    })
  }
})

export default router
