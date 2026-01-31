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
let firestoreUnavailable = false
let warnedLocalFallback = false
const localProgress = new Map()

function shouldUseLocalProgress() {
  if (process.env.SHOWME_LOCAL_PROGRESS === '1') return true
  if (process.env.NODE_ENV === 'production') return false
  if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCLOUD_PROJECT) return true
  return firestoreUnavailable
}

function isFirestoreUnavailableError(error) {
  if (!error) return false
  if (typeof error.code === 'number' && [5, 7, 14, 16].includes(error.code)) return true
  const message = String(error.message || '')
  return /NOT_FOUND|PERMISSION_DENIED|UNAUTHENTICATED|UNAVAILABLE|credentials|default credentials|Unable to detect a Project Id|Project Id|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT/i.test(message)
}

function markFirestoreUnavailable(error) {
  if (process.env.NODE_ENV === 'production') return
  if (!isFirestoreUnavailableError(error)) return
  if (!firestoreUnavailable) {
    firestoreUnavailable = true
  }
  if (!warnedLocalFallback) {
    warnedLocalFallback = true
    logger.warn('PROGRESS', 'Falling back to local progress store', { error: error?.message })
  }
}

function getFirestore() {
  if (db) return db

  try {
    db = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
    })
    logger.info('PROGRESS', 'Firestore connected')
    return db
  } catch (error) {
    markFirestoreUnavailable(error)
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

function getLocalProgress(clientId) {
  if (localProgress.has(clientId)) {
    return localProgress.get(clientId)
  }
  const progress = createDefaultProgress(clientId)
  localProgress.set(clientId, progress)
  return progress
}

function setLocalProgress(clientId, progress) {
  localProgress.set(clientId, progress)
}

function normalizeProgress(data, clientId) {
  const base = createDefaultProgress(clientId)
  if (!data || typeof data !== 'object') {
    return base
  }

  const merged = { ...base, ...data, clientId }

  return {
    ...merged,
    lastActiveDate: merged.lastActiveDate?.toDate?.() || merged.lastActiveDate,
    createdAt: merged.createdAt?.toDate?.() || merged.createdAt,
    updatedAt: merged.updatedAt?.toDate?.() || merged.updatedAt,
    badges: Array.isArray(merged.badges) ? merged.badges : [],
    badgeUnlockDates: Object.fromEntries(
      Object.entries(merged.badgeUnlockDates || {}).map(([k, v]) => [k, v?.toDate?.() || v])
    )
  }
}

function applyActivityUpdate(progress, action, now) {
  const updated = {
    ...progress,
    badges: Array.isArray(progress.badges) ? [...progress.badges] : [],
    badgeUnlockDates: { ...(progress.badgeUnlockDates || {}) },
  }

  // Update streak
  if (updated.lastActiveDate) {
    if (isNextDay(updated.lastActiveDate, now)) {
      // Next day - increment streak
      updated.streakCount += 1
      if (updated.streakCount > updated.longestStreak) {
        updated.longestStreak = updated.streakCount
      }
    } else if (!isSameDay(updated.lastActiveDate, now)) {
      // Gap day - reset streak to 1
      updated.streakCount = 1
    }
    // Same day - no change to streak
  } else {
    // First activity ever
    updated.streakCount = 1
    updated.longestStreak = 1
  }

  // Update based on action
  switch (action) {
    case 'question_asked':
      updated.totalQuestions += 1
      updated.points += POINTS.QUESTION_ASKED
      break
    case 'socratic_answered':
      updated.totalSocraticAnswers += 1
      updated.points += POINTS.SOCRATIC_ANSWERED
      break
    case 'deep_level_used':
      updated.deepLevelUsed = true
      updated.points += POINTS.DEEP_LEVEL_USED
      break
    default:
      logger.warn('PROGRESS', 'Unknown action type', { action })
  }

  updated.lastActiveDate = now
  updated.updatedAt = now

  // Check for new badge unlocks
  const newBadges = checkBadgeUnlocks(updated)

  // Add new badges with unlock dates
  for (const badgeId of newBadges) {
    updated.badges.push(badgeId)
    updated.badgeUnlockDates[badgeId] = now
  }

  return { progress: updated, newBadges }
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
  if (shouldUseLocalProgress()) {
    return { progress: getLocalProgress(clientId), error: null }
  }

  const firestore = getFirestore()
  if (!firestore) {
    if (process.env.NODE_ENV !== 'production') {
      firestoreUnavailable = true
      return { progress: getLocalProgress(clientId), error: null }
    }
    return { progress: null, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    if (!doc.exists) {
      // Return default progress for new users (don't create yet)
      return { progress: createDefaultProgress(clientId), error: null }
    }

    return {
      progress: normalizeProgress(doc.data(), clientId),
      error: null
    }
  } catch (error) {
    markFirestoreUnavailable(error)
    if (shouldUseLocalProgress()) {
      return { progress: getLocalProgress(clientId), error: null }
    }
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
  if (shouldUseLocalProgress()) {
    const now = new Date()
    const { progress, newBadges } = applyActivityUpdate(getLocalProgress(clientId), action, now)
    setLocalProgress(clientId, progress)
    return { progress, newBadges, error: null }
  }

  const firestore = getFirestore()
  if (!firestore) {
    if (process.env.NODE_ENV !== 'production') {
      firestoreUnavailable = true
      const now = new Date()
      const { progress, newBadges } = applyActivityUpdate(getLocalProgress(clientId), action, now)
      setLocalProgress(clientId, progress)
      return { progress, newBadges, error: null }
    }
    return { progress: null, newBadges: [], error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    let progress
    if (!doc.exists) {
      progress = createDefaultProgress(clientId)
    } else {
      progress = normalizeProgress(doc.data(), clientId)
    }

    const now = new Date()
    const { progress: updatedProgress, newBadges } = applyActivityUpdate(progress, action, now)

    // Save to Firestore
    await docRef.set(updatedProgress)

    logger.info('PROGRESS', 'Activity recorded', {
      clientId,
      action,
      streakCount: updatedProgress.streakCount,
      points: updatedProgress.points,
      newBadges
    })

    return { progress: updatedProgress, newBadges, error: null }
  } catch (error) {
    markFirestoreUnavailable(error)
    if (shouldUseLocalProgress()) {
      const now = new Date()
      const { progress, newBadges } = applyActivityUpdate(getLocalProgress(clientId), action, now)
      setLocalProgress(clientId, progress)
      return { progress, newBadges, error: null }
    }
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
