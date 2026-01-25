/**
 * User Progress Service
 * GAMIFY-001: Track streaks, points, and achievements in Firestore
 *
 * Data Schema (userProgress collection):
 * - clientId: string
 * - totalQuestions: number
 * - totalSocraticAnswers: number
 * - streakCount: number
 * - longestStreak: number
 * - lastActiveDate: timestamp
 * - points: number
 * - badges: array of badge IDs
 * - badgeUnlockDates: map of badgeId -> timestamp
 */

import { Firestore } from '@google-cloud/firestore'
import logger from '../utils/logger.js'

// Initialize Firestore
let db = null

function getFirestore() {
  if (db) return db

  try {
    db = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    })
    logger.info('PROGRESS', 'Firestore connected')
    return db
  } catch (error) {
    logger.error('PROGRESS', 'Failed to connect to Firestore', { error: error.message })
    return null
  }
}

const COLLECTION_NAME = 'userProgress'

// Badge definitions with unlock criteria
const BADGES = {
  CURIOUS_MIND: {
    id: 'CURIOUS_MIND',
    name: 'Curious Mind',
    description: 'Asked your first question',
    icon: 'lightbulb',
    criteria: { totalQuestions: 1 }
  },
  STREAK_3: {
    id: 'STREAK_3',
    name: 'Getting Started',
    description: 'Achieved a 3-day learning streak',
    icon: 'flame-small',
    criteria: { streakCount: 3 }
  },
  STREAK_7: {
    id: 'STREAK_7',
    name: 'Dedicated Learner',
    description: 'Achieved a 7-day learning streak',
    icon: 'flame-medium',
    criteria: { streakCount: 7 }
  },
  STREAK_30: {
    id: 'STREAK_30',
    name: 'Knowledge Seeker',
    description: 'Achieved a 30-day learning streak',
    icon: 'flame-large',
    criteria: { streakCount: 30 }
  },
  DEEP_THINKER: {
    id: 'DEEP_THINKER',
    name: 'Deep Thinker',
    description: 'Explored a topic in Deep mode',
    icon: 'brain',
    criteria: { deepLevelUsed: true }
  },
  QUESTION_10: {
    id: 'QUESTION_10',
    name: 'Question Champion',
    description: 'Asked 10 questions',
    icon: 'trophy',
    criteria: { totalQuestions: 10 }
  },
  SOCRATIC_5: {
    id: 'SOCRATIC_5',
    name: 'Critical Thinker',
    description: 'Answered 5 Socratic questions',
    icon: 'thought-bubble',
    criteria: { totalSocraticAnswers: 5 }
  }
}

// Points awarded for actions
const POINTS = {
  QUESTION_ASKED: 10,
  SOCRATIC_ANSWERED: 5,
  DEEP_LEVEL_USED: 15
}

/**
 * Get the start of day for a given date (used for streak comparison)
 * @param {Date} date
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function getDateKey(date) {
  return date.toISOString().split('T')[0]
}

/**
 * Check if two dates are consecutive days
 * @param {Date} date1 - Earlier date
 * @param {Date} date2 - Later date
 * @returns {boolean}
 */
function isNextDay(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)

  d1.setHours(0, 0, 0, 0)
  d2.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24))
  return diffDays === 1
}

/**
 * Check if two dates are the same day
 * @param {Date} date1
 * @param {Date} date2
 * @returns {boolean}
 */
function isSameDay(date1, date2) {
  return getDateKey(new Date(date1)) === getDateKey(new Date(date2))
}

/**
 * Create a new progress record with default values
 * @param {string} clientId
 * @returns {Object}
 */
function createDefaultProgress(clientId) {
  return {
    clientId,
    totalQuestions: 0,
    totalSocraticAnswers: 0,
    streakCount: 0,
    longestStreak: 0,
    lastActiveDate: null,
    points: 0,
    badges: [],
    badgeUnlockDates: {},
    deepLevelUsed: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

/**
 * Check which badges should be unlocked based on current progress
 * @param {Object} progress - Current user progress
 * @returns {string[]} Array of badge IDs that should be newly unlocked
 */
function checkBadgeUnlocks(progress) {
  const newBadges = []

  for (const [badgeId, badge] of Object.entries(BADGES)) {
    // Skip if already unlocked
    if (progress.badges.includes(badgeId)) continue

    const criteria = badge.criteria
    let shouldUnlock = true

    // Check each criterion
    for (const [key, value] of Object.entries(criteria)) {
      if (typeof value === 'number') {
        if ((progress[key] || 0) < value) {
          shouldUnlock = false
          break
        }
      } else if (typeof value === 'boolean') {
        if (progress[key] !== value) {
          shouldUnlock = false
          break
        }
      }
    }

    if (shouldUnlock) {
      newBadges.push(badgeId)
    }
  }

  return newBadges
}

/**
 * Get user progress by clientId
 * @param {string} clientId
 * @returns {Promise<{progress: Object|null, error: string|null}>}
 */
export async function getUserProgress(clientId) {
  const firestore = getFirestore()
  if (!firestore) {
    return { progress: null, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    if (!doc.exists) {
      // Return default progress for new users (don't create yet)
      return { progress: createDefaultProgress(clientId), error: null }
    }

    const data = doc.data()
    return {
      progress: {
        ...data,
        lastActiveDate: data.lastActiveDate?.toDate?.() || data.lastActiveDate,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        badgeUnlockDates: Object.fromEntries(
          Object.entries(data.badgeUnlockDates || {}).map(([k, v]) => [k, v?.toDate?.() || v])
        )
      },
      error: null
    }
  } catch (error) {
    logger.error('PROGRESS', 'Failed to get user progress', { clientId, error: error.message })
    return { progress: null, error: error.message }
  }
}

/**
 * Record an activity and update user progress
 * @param {string} clientId
 * @param {string} action - 'question_asked' | 'socratic_answered' | 'deep_level_used'
 * @returns {Promise<{progress: Object|null, newBadges: string[], error: string|null}>}
 */
export async function recordActivity(clientId, action) {
  const firestore = getFirestore()
  if (!firestore) {
    return { progress: null, newBadges: [], error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    let progress
    if (!doc.exists) {
      progress = createDefaultProgress(clientId)
    } else {
      const data = doc.data()
      progress = {
        ...data,
        lastActiveDate: data.lastActiveDate?.toDate?.() || data.lastActiveDate,
        badgeUnlockDates: data.badgeUnlockDates || {}
      }
    }

    const now = new Date()

    // Update streak
    if (progress.lastActiveDate) {
      if (isNextDay(progress.lastActiveDate, now)) {
        // Next day - increment streak
        progress.streakCount += 1
        if (progress.streakCount > progress.longestStreak) {
          progress.longestStreak = progress.streakCount
        }
      } else if (!isSameDay(progress.lastActiveDate, now)) {
        // Gap day - reset streak to 1
        progress.streakCount = 1
      }
      // Same day - no change to streak
    } else {
      // First activity ever
      progress.streakCount = 1
      progress.longestStreak = 1
    }

    // Update based on action
    switch (action) {
      case 'question_asked':
        progress.totalQuestions += 1
        progress.points += POINTS.QUESTION_ASKED
        break
      case 'socratic_answered':
        progress.totalSocraticAnswers += 1
        progress.points += POINTS.SOCRATIC_ANSWERED
        break
      case 'deep_level_used':
        progress.deepLevelUsed = true
        progress.points += POINTS.DEEP_LEVEL_USED
        break
      default:
        logger.warn('PROGRESS', 'Unknown action type', { action })
    }

    progress.lastActiveDate = now
    progress.updatedAt = now

    // Check for new badge unlocks
    const newBadges = checkBadgeUnlocks(progress)

    // Add new badges with unlock dates
    for (const badgeId of newBadges) {
      progress.badges.push(badgeId)
      progress.badgeUnlockDates[badgeId] = now
    }

    // Save to Firestore
    await docRef.set(progress)

    logger.info('PROGRESS', 'Activity recorded', {
      clientId,
      action,
      streakCount: progress.streakCount,
      points: progress.points,
      newBadges
    })

    return { progress, newBadges, error: null }
  } catch (error) {
    logger.error('PROGRESS', 'Failed to record activity', { clientId, action, error: error.message })
    return { progress: null, newBadges: [], error: error.message }
  }
}

/**
 * Get badge definitions
 * @returns {Object} Badge definitions keyed by ID
 */
export function getBadgeDefinitions() {
  return BADGES
}

/**
 * Get points configuration
 * @returns {Object} Points configuration
 */
export function getPointsConfig() {
  return POINTS
}

export default {
  getUserProgress,
  recordActivity,
  getBadgeDefinitions,
  getPointsConfig
}
