/**
 * User Routes
 * GAMIFY-002: REST endpoints for user progress and activities
 */

import { Router } from 'express'
import { getUserProgress, recordActivity, getBadgeDefinitions, getXPConfig, getLevelThresholds, useStreakFreeze, recoverStreak } from '../services/userProgress.js'
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
 * - levelInfo: Object with level, name, currentXP, nextLevelXP, progress
 * - badges: Object with badge definitions for UI display
 * - xpConfig: XP rewards for different actions
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
      levelInfo: result.levelInfo,
      badges: getBadgeDefinitions(),
      xpConfig: getXPConfig()
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
 * - action: string - 'question_asked' | 'socratic_answered' | 'socratic_perfect' | 'deep_level_used'
 *
 * Response:
 * - progress: Updated progress object
 * - xpEarned: Total XP earned from this action
 * - xpBreakdown: Array of { type, xp } showing what contributed to XP
 * - levelInfo: Current level information
 * - leveledUp: Boolean indicating if user leveled up
 * - newBadges: Array of newly unlocked badge IDs
 * - newBadgeDetails: Badge definitions for newly unlocked badges
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
    const validActions = ['question_asked', 'socratic_answered', 'socratic_perfect', 'deep_level_used']
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
      xpEarned: result.xpEarned,
      xpBreakdown: result.xpBreakdown,
      levelInfo: result.levelInfo,
      leveledUp: result.leveledUp,
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

/**
 * POST /api/user/streak/freeze
 * Use a streak freeze to protect the current streak
 *
 * Request body:
 * - clientId: string - The client identifier
 *
 * Response:
 * - success: boolean
 * - progress: Updated progress object
 * - error: Error message if failed
 */
router.post('/streak/freeze', async (req, res) => {
  try {
    const { clientId } = req.body

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

    logger.info('USER', 'Using streak freeze', { clientId: sanitizedId })

    const result = await useStreakFreeze(sanitizedId)

    if (result.error) {
      const statusCode = result.error === 'NO_FREEZE_AVAILABLE' ? 400 : 500
      return res.status(statusCode).json({
        success: false,
        error: result.error
      })
    }

    return res.json({
      success: true,
      progress: result.progress
    })
  } catch (error) {
    logger.error('USER', 'Unexpected error using streak freeze', { error: error.message })
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

/**
 * POST /api/user/streak/recover
 * Recover a broken streak by paying XP
 *
 * Request body:
 * - clientId: string - The client identifier
 *
 * Response:
 * - success: boolean
 * - progress: Updated progress object
 * - recoveredStreak: The streak count that was recovered
 * - xpCost: XP spent on recovery
 * - error: Error message if failed
 */
router.post('/streak/recover', async (req, res) => {
  try {
    const { clientId } = req.body
    const xpCost = 50 // Fixed cost for streak recovery

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

    logger.info('USER', 'Recovering streak', { clientId: sanitizedId })

    const result = await recoverStreak(sanitizedId, xpCost)

    if (result.error) {
      const statusCode = ['INSUFFICIENT_XP', 'RECOVERY_WINDOW_EXPIRED', 'NO_STREAK_TO_RECOVER'].includes(result.error) ? 400 : 500
      return res.status(statusCode).json({
        success: false,
        error: result.error
      })
    }

    return res.json({
      success: true,
      progress: result.progress,
      recoveredStreak: result.recoveredStreak,
      xpCost
    })
  } catch (error) {
    logger.error('USER', 'Unexpected error recovering streak', { error: error.message })
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
