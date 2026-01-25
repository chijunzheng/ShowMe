/**
 * User Routes
 * GAMIFY-002: REST endpoints for user progress and activities
 */

import { Router } from 'express'
import { getUserProgress, recordActivity, getBadgeDefinitions } from '../services/userProgress.js'
import { sanitizeId } from '../utils/sanitize.js'
import logger from '../utils/logger.js'

const router = Router()

/**
 * GET /api/user/progress
 * Get user progress by clientId
 *
 * Query params:
 * - clientId: string - The client identifier
 *
 * Response:
 * - progress: Object with totalQuestions, streakCount, points, badges, etc.
 * - badges: Object with badge definitions for UI display
 */
router.get('/progress', async (req, res) => {
  try {
    const { clientId } = req.query

    // Validate clientId
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

    logger.info('USER', 'Getting progress', { clientId: sanitizedId })

    const result = await getUserProgress(sanitizedId)

    if (result.error) {
      logger.error('USER', 'Failed to get progress', { error: result.error })
      return res.status(500).json({ error: result.error })
    }

    return res.json({
      progress: result.progress,
      badges: getBadgeDefinitions()
    })
  } catch (error) {
    logger.error('USER', 'Unexpected error getting progress', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/user/activity
 * Record a user activity and update progress
 *
 * Request body:
 * - clientId: string - The client identifier
 * - action: string - 'question_asked' | 'socratic_answered' | 'deep_level_used'
 *
 * Response:
 * - progress: Updated progress object
 * - newBadges: Array of newly unlocked badge IDs
 * - badges: Badge definitions for newly unlocked badges
 */
router.post('/activity', async (req, res) => {
  try {
    const { clientId, action } = req.body

    // Validate clientId
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

    // Validate action
    const validActions = ['question_asked', 'socratic_answered', 'deep_level_used']
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
        field: 'action'
      })
    }

    logger.info('USER', 'Recording activity', { clientId: sanitizedId, action })

    const result = await recordActivity(sanitizedId, action)

    if (result.error) {
      logger.error('USER', 'Failed to record activity', { error: result.error })
      return res.status(500).json({ error: result.error })
    }

    // Include badge definitions for any newly unlocked badges
    const badgeDefinitions = getBadgeDefinitions()
    const newBadgeDetails = result.newBadges.map(badgeId => badgeDefinitions[badgeId])

    return res.json({
      progress: result.progress,
      newBadges: result.newBadges,
      newBadgeDetails
    })
  } catch (error) {
    logger.error('USER', 'Unexpected error recording activity', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/user/badges
 * Get all badge definitions
 *
 * Response:
 * - badges: Object with all badge definitions keyed by ID
 */
router.get('/badges', (req, res) => {
  return res.json({
    badges: getBadgeDefinitions()
  })
})

export default router
