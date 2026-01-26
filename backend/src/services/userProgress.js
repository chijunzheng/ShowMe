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

// XP awarded for actions (renamed from POINTS for clarity)
const XP_REWARDS = {
  QUESTION_ASKED: 10,         // Complete a topic slideshow
  SOCRATIC_ANSWERED: 15,      // Answer any Socratic question
  SOCRATIC_PERFECT: 25,       // Perfect Socratic answer (5 stars)
  DEEP_LEVEL_USED: 20,        // Use Deep explanation level
  DAILY_LOGIN: 5,             // First activity of the day
  FIRST_QUESTION_OF_DAY: 10,  // First question of the day (bonus)
}

// Level thresholds (XP required for each level)
const LEVEL_THRESHOLDS = [
  { level: 1, name: 'Curious', minXP: 0 },
  { level: 2, name: 'Curious', minXP: 20 },
  { level: 3, name: 'Curious', minXP: 45 },
  { level: 4, name: 'Curious', minXP: 75 },
  { level: 5, name: 'Curious', minXP: 100 },
  { level: 6, name: 'Explorer', minXP: 150 },
  { level: 7, name: 'Explorer', minXP: 220 },
  { level: 8, name: 'Explorer', minXP: 310 },
  { level: 9, name: 'Explorer', minXP: 400 },
  { level: 10, name: 'Explorer', minXP: 500 },
  { level: 11, name: 'Scholar', minXP: 650 },
  { level: 12, name: 'Scholar', minXP: 850 },
  { level: 13, name: 'Scholar', minXP: 1100 },
  { level: 14, name: 'Scholar', minXP: 1350 },
  { level: 15, name: 'Scholar', minXP: 1500 },
  { level: 16, name: 'Expert', minXP: 2000 },
  { level: 17, name: 'Expert', minXP: 2750 },
  { level: 18, name: 'Expert', minXP: 3500 },
  { level: 19, name: 'Expert', minXP: 4250 },
  { level: 20, name: 'Expert', minXP: 5000 },
  { level: 21, name: 'Master', minXP: 6000 },
]

/**
 * Calculate level info from XP
 * @param {number} xp - Total XP
 * @returns {{level: number, name: string, currentXP: number, nextLevelXP: number, progress: number}}
 */
function calculateLevel(xp) {
  let currentLevel = LEVEL_THRESHOLDS[0]
  let nextLevel = LEVEL_THRESHOLDS[1]

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i].minXP) {
      currentLevel = LEVEL_THRESHOLDS[i]
      nextLevel = LEVEL_THRESHOLDS[i + 1] || null
    } else {
      break
    }
  }

  const currentXP = xp - currentLevel.minXP
  const nextLevelXP = nextLevel ? nextLevel.minXP - currentLevel.minXP : 0
  const progress = nextLevel ? Math.min(100, Math.round((currentXP / nextLevelXP) * 100)) : 100

  return {
    level: currentLevel.level,
    name: currentLevel.name,
    currentXP,
    nextLevelXP,
    totalXP: xp,
    progress
  }
}

// Keep backward compat alias
const POINTS = XP_REWARDS

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
    lastQuestionDate: null,
    questionsToday: 0,
    points: 0,
    badges: [],
    badgeUnlockDates: {},
    deepLevelUsed: false,
    // v2.0: Streak freeze feature
    streakFreezeAvailable: 1, // Weekly allowance
    streakFreezeLastReset: null, // When freeze was last reset (weekly)
    streakFreezeUsedThisWeek: false,
    lastStreakBroken: null, // When streak was last broken (for recovery)
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
 * @returns {Promise<{progress: Object|null, levelInfo: Object|null, error: string|null}>}
 */
export async function getUserProgress(clientId) {
  const firestore = getFirestore()
  if (!firestore) {
    return { progress: null, levelInfo: null, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    let progress
    if (!doc.exists) {
      // Return default progress for new users (don't create yet)
      progress = createDefaultProgress(clientId)
    } else {
      const data = doc.data()
      progress = {
        ...data,
        lastActiveDate: data.lastActiveDate?.toDate?.() || data.lastActiveDate,
        lastQuestionDate: data.lastQuestionDate?.toDate?.() || data.lastQuestionDate,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        badgeUnlockDates: Object.fromEntries(
          Object.entries(data.badgeUnlockDates || {}).map(([k, v]) => [k, v?.toDate?.() || v])
        )
      }
    }

    // Calculate level info
    const levelInfo = calculateLevel(progress.points || 0)

    return {
      progress,
      levelInfo,
      error: null
    }
  } catch (error) {
    logger.error('PROGRESS', 'Failed to get user progress', { clientId, error: error.message })
    return { progress: null, levelInfo: null, error: error.message }
  }
}

/**
 * Record an activity and update user progress
 * @param {string} clientId
 * @param {string} action - 'question_asked' | 'socratic_answered' | 'socratic_perfect' | 'deep_level_used'
 * @param {Object} options - Additional options like socraticScore
 * @returns {Promise<{progress: Object|null, newBadges: string[], xpEarned: number, levelInfo: Object|null, leveledUp: boolean, error: string|null}>}
 */
export async function recordActivity(clientId, action, options = {}) {
  const firestore = getFirestore()
  if (!firestore) {
    return { progress: null, newBadges: [], xpEarned: 0, levelInfo: null, leveledUp: false, error: 'FIRESTORE_NOT_AVAILABLE' }
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
        lastQuestionDate: data.lastQuestionDate?.toDate?.() || data.lastQuestionDate,
        badgeUnlockDates: data.badgeUnlockDates || {},
        questionsToday: data.questionsToday || 0
      }
    }

    const now = new Date()
    const previousXP = progress.points || 0
    const previousLevel = calculateLevel(previousXP)
    let xpEarned = 0
    const xpBreakdown = []

    // Check if this is a new day (for daily bonuses)
    const isNewDay = !progress.lastActiveDate || !isSameDay(progress.lastActiveDate, now)
    const isFirstQuestionToday = !progress.lastQuestionDate || !isSameDay(progress.lastQuestionDate, now)

    // Reset questionsToday if new day
    if (isNewDay) {
      progress.questionsToday = 0
    }

    // Award daily login bonus (once per day)
    if (isNewDay) {
      xpEarned += XP_REWARDS.DAILY_LOGIN
      xpBreakdown.push({ type: 'daily_login', xp: XP_REWARDS.DAILY_LOGIN })
    }

    // Update streak
    if (progress.lastActiveDate) {
      if (isNextDay(progress.lastActiveDate, now)) {
        // Next day - increment streak
        progress.streakCount += 1
        if (progress.streakCount > progress.longestStreak) {
          progress.longestStreak = progress.streakCount
        }
      } else if (!isSameDay(progress.lastActiveDate, now)) {
        // Gap day - streak is broken
        // Store previous streak for recovery option
        if (progress.streakCount > 1) {
          progress.previousStreakCount = progress.streakCount
          progress.lastStreakBroken = now
        }
        // Reset streak to 1
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
        progress.questionsToday += 1
        xpEarned += XP_REWARDS.QUESTION_ASKED
        xpBreakdown.push({ type: 'question_asked', xp: XP_REWARDS.QUESTION_ASKED })

        // First question of day bonus
        if (isFirstQuestionToday) {
          xpEarned += XP_REWARDS.FIRST_QUESTION_OF_DAY
          xpBreakdown.push({ type: 'first_question_of_day', xp: XP_REWARDS.FIRST_QUESTION_OF_DAY })
        }
        progress.lastQuestionDate = now
        break

      case 'socratic_answered':
        progress.totalSocraticAnswers += 1
        xpEarned += XP_REWARDS.SOCRATIC_ANSWERED
        xpBreakdown.push({ type: 'socratic_answered', xp: XP_REWARDS.SOCRATIC_ANSWERED })
        break

      case 'socratic_perfect':
        // Perfect Socratic answer (5 stars) - uses higher reward
        progress.totalSocraticAnswers += 1
        xpEarned += XP_REWARDS.SOCRATIC_PERFECT
        xpBreakdown.push({ type: 'socratic_perfect', xp: XP_REWARDS.SOCRATIC_PERFECT })
        break

      case 'deep_level_used':
        progress.deepLevelUsed = true
        xpEarned += XP_REWARDS.DEEP_LEVEL_USED
        xpBreakdown.push({ type: 'deep_level_used', xp: XP_REWARDS.DEEP_LEVEL_USED })
        break

      default:
        logger.warn('PROGRESS', 'Unknown action type', { action })
    }

    // Apply XP earned
    progress.points = (progress.points || 0) + xpEarned
    progress.lastActiveDate = now
    progress.updatedAt = now

    // Calculate new level
    const newLevelInfo = calculateLevel(progress.points)
    const leveledUp = newLevelInfo.level > previousLevel.level

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
      xpEarned,
      totalXP: progress.points,
      level: newLevelInfo.level,
      leveledUp,
      streakCount: progress.streakCount,
      newBadges
    })

    return {
      progress,
      newBadges,
      xpEarned,
      xpBreakdown,
      levelInfo: newLevelInfo,
      leveledUp,
      error: null
    }
  } catch (error) {
    logger.error('PROGRESS', 'Failed to record activity', { clientId, action, error: error.message })
    return { progress: null, newBadges: [], xpEarned: 0, levelInfo: null, leveledUp: false, error: error.message }
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
 * Get XP rewards configuration
 * @returns {Object} XP rewards configuration
 */
export function getXPConfig() {
  return XP_REWARDS
}

/**
 * Get points configuration (alias for backward compat)
 * @returns {Object} Points configuration
 */
export function getPointsConfig() {
  return POINTS
}

/**
 * Get level thresholds
 * @returns {Array} Level threshold definitions
 */
export function getLevelThresholds() {
  return LEVEL_THRESHOLDS
}

/**
 * Check if streak freeze should be reset (weekly)
 * @param {Date} lastReset - Last reset date
 * @returns {boolean}
 */
function shouldResetStreakFreeze(lastReset) {
  if (!lastReset) return true
  const now = new Date()
  const weekInMs = 7 * 24 * 60 * 60 * 1000
  return (now - new Date(lastReset)) >= weekInMs
}

/**
 * Use a streak freeze to protect streak
 * @param {string} clientId
 * @returns {Promise<{success: boolean, progress: Object|null, error: string|null}>}
 */
export async function useStreakFreeze(clientId) {
  const firestore = getFirestore()
  if (!firestore) {
    return { success: false, progress: null, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { success: false, progress: null, error: 'USER_NOT_FOUND' }
    }

    const data = doc.data()
    const progress = {
      ...data,
      lastActiveDate: data.lastActiveDate?.toDate?.() || data.lastActiveDate,
      streakFreezeLastReset: data.streakFreezeLastReset?.toDate?.() || data.streakFreezeLastReset
    }

    // Check if freeze should be reset (weekly)
    if (shouldResetStreakFreeze(progress.streakFreezeLastReset)) {
      progress.streakFreezeAvailable = 1
      progress.streakFreezeUsedThisWeek = false
      progress.streakFreezeLastReset = new Date()
    }

    // Check if freeze is available
    if (progress.streakFreezeAvailable <= 0 || progress.streakFreezeUsedThisWeek) {
      return { success: false, progress, error: 'NO_FREEZE_AVAILABLE' }
    }

    // Use the freeze
    progress.streakFreezeAvailable -= 1
    progress.streakFreezeUsedThisWeek = true
    progress.lastActiveDate = new Date() // Extend the streak protection
    progress.updatedAt = new Date()

    await docRef.set(progress)

    logger.info('PROGRESS', 'Streak freeze used', {
      clientId,
      remainingFreezes: progress.streakFreezeAvailable,
      streakCount: progress.streakCount
    })

    return { success: true, progress, error: null }
  } catch (error) {
    logger.error('PROGRESS', 'Failed to use streak freeze', { clientId, error: error.message })
    return { success: false, progress: null, error: error.message }
  }
}

/**
 * Recover a broken streak by paying XP
 * @param {string} clientId
 * @param {number} xpCost - XP cost for recovery (default 50)
 * @returns {Promise<{success: boolean, progress: Object|null, recoveredStreak: number, error: string|null}>}
 */
export async function recoverStreak(clientId, xpCost = 50) {
  const firestore = getFirestore()
  if (!firestore) {
    return { success: false, progress: null, recoveredStreak: 0, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { success: false, progress: null, recoveredStreak: 0, error: 'USER_NOT_FOUND' }
    }

    const data = doc.data()
    const progress = {
      ...data,
      lastActiveDate: data.lastActiveDate?.toDate?.() || data.lastActiveDate,
      lastStreakBroken: data.lastStreakBroken?.toDate?.() || data.lastStreakBroken
    }

    // Check if recovery is available (within 24 hours of streak break)
    const now = new Date()
    if (!progress.lastStreakBroken) {
      return { success: false, progress, recoveredStreak: 0, error: 'NO_STREAK_TO_RECOVER' }
    }

    const hoursSinceBroken = (now - new Date(progress.lastStreakBroken)) / (1000 * 60 * 60)
    if (hoursSinceBroken > 24) {
      return { success: false, progress, recoveredStreak: 0, error: 'RECOVERY_WINDOW_EXPIRED' }
    }

    // Check if user has enough XP
    if ((progress.points || 0) < xpCost) {
      return { success: false, progress, recoveredStreak: 0, error: 'INSUFFICIENT_XP' }
    }

    // Get the previous streak count (stored when broken)
    const previousStreak = progress.previousStreakCount || 1

    // Recover the streak
    progress.points -= xpCost
    progress.streakCount = previousStreak
    progress.lastActiveDate = now
    progress.lastStreakBroken = null
    progress.previousStreakCount = null
    progress.updatedAt = now

    await docRef.set(progress)

    logger.info('PROGRESS', 'Streak recovered', {
      clientId,
      recoveredStreak: previousStreak,
      xpCost,
      remainingXP: progress.points
    })

    return {
      success: true,
      progress,
      recoveredStreak: previousStreak,
      error: null
    }
  } catch (error) {
    logger.error('PROGRESS', 'Failed to recover streak', { clientId, error: error.message })
    return { success: false, progress: null, recoveredStreak: 0, error: error.message }
  }
}

/**
 * Calculate level from XP (exported for API use)
 */
export { calculateLevel }

export default {
  getUserProgress,
  recordActivity,
  getBadgeDefinitions,
  getXPConfig,
  getLevelThresholds,
  calculateLevel,
  getPointsConfig,
  useStreakFreeze,
  recoverStreak
}
