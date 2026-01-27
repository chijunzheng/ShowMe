/**
 * World State Service
 * WB006: Track world building state including pieces, XP, tier, and streak
 * WB014: XP and tier progression for World Builder gamification
 *
 * Data Schema (worldState collection):
 * - clientId: string
 * - pieces: array of WorldPiece objects
 * - totalXP: number
 * - tier: 'barren' | 'sprouting' | 'growing' | 'thriving' | 'legendary'
 * - streak: number
 * - arcaneUnlocked: boolean (unlocks after 20 topics)
 * - topicsCompleted: number
 * - lastXPAward: { amount: number, source: string, timestamp: Date }
 * - tierHistory: array of { tier: string, achievedAt: Date }
 * - createdAt: Date
 * - updatedAt: Date
 *
 * WorldPiece Schema:
 * - id: string
 * - topicId: string
 * - topicName: string
 * - zone: 'nature' | 'civilization' | 'arcane'
 * - imageUrl: string
 * - prompt: string
 * - position: { x: number, y: number }
 * - unlockedAt: Date
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
    logger.info('WORLD', 'Firestore connected')
    return db
  } catch (error) {
    logger.error('WORLD', 'Failed to connect to Firestore', { error: error.message })
    return null
  }
}

const COLLECTION_NAME = 'worldState'

// Tier thresholds - XP required to reach each tier
const TIERS = {
  barren: 0,
  sprouting: 100,
  growing: 300,
  thriving: 600,
  legendary: 1000
}

// Export TIER_THRESHOLDS as an alias for API consistency
export const TIER_THRESHOLDS = TIERS

// Ordered array of tier names for progression calculation
const TIER_ORDER = ['barren', 'sprouting', 'growing', 'thriving', 'legendary']

// Number of topics required to unlock the arcane zone
const ARCANE_UNLOCK_THRESHOLD = 20

// XP rewards for different actions (WB014)
export const XP_REWARDS = {
  QUIZ_PASS: 25,           // Base XP for passing quiz
  QUIZ_PERFECT: 40,        // Perfect score bonus (replaces QUIZ_PASS)
  QUICK_MODE: 5,           // Quick answer (no quiz)
  STREAK_BONUS: 5          // Per day of streak
}

/**
 * Get the tier for a given XP amount
 * @param {number} xp - Total XP
 * @returns {string} Tier name
 */
export function getTierForXP(xp) {
  // Find the highest tier that the XP qualifies for
  let currentTier = 'barren'

  for (const tier of TIER_ORDER) {
    if (xp >= TIERS[tier]) {
      currentTier = tier
    } else {
      break
    }
  }

  return currentTier
}

/**
 * Check if XP change results in a tier upgrade
 * @param {number} oldXP - Previous XP amount
 * @param {number} newXP - New XP amount after addition
 * @returns {{ upgraded: boolean, oldTier: string, newTier: string } | null}
 */
export function checkTierUpgrade(oldXP, newXP) {
  const oldTier = getTierForXP(oldXP)
  const newTier = getTierForXP(newXP)

  if (oldTier !== newTier) {
    return {
      upgraded: true,
      oldTier,
      newTier
    }
  }

  return null
}

/**
 * Calculate tier from total XP (alias for getTierForXP for API consistency)
 * @param {number} totalXP - The user's total XP
 * @returns {string} The tier name (barren | sprouting | growing | thriving | legendary)
 */
export function calculateTier(totalXP) {
  return getTierForXP(totalXP)
}

/**
 * Get XP needed for next tier
 * @param {number} totalXP - The user's total XP
 * @returns {{ nextTier: string | null, xpNeeded: number, xpProgress: number, xpTotal: number }}
 */
export function xpToNextTier(totalXP) {
  const currentTier = getTierForXP(totalXP)
  const currentTierIndex = TIER_ORDER.indexOf(currentTier)

  // Check if at max tier
  if (currentTierIndex >= TIER_ORDER.length - 1) {
    return {
      nextTier: null,
      xpNeeded: 0,
      xpProgress: totalXP - TIERS[currentTier],
      xpTotal: 0 // No more to achieve
    }
  }

  const nextTier = TIER_ORDER[currentTierIndex + 1]
  const nextTierThreshold = TIERS[nextTier]
  const currentTierThreshold = TIERS[currentTier]

  return {
    nextTier,
    xpNeeded: nextTierThreshold - totalXP,
    xpProgress: totalXP - currentTierThreshold,
    xpTotal: nextTierThreshold - currentTierThreshold
  }
}

/**
 * Create a new world state with default values for a new user
 * @param {string} clientId
 * @returns {Object} Default world state
 */
function createDefaultWorldState(clientId) {
  return {
    clientId,
    pieces: [],
    totalXP: 0,
    tier: 'barren',
    streak: 0,
    arcaneUnlocked: false,
    topicsCompleted: 0,
    lastXPAward: null,
    tierHistory: [{ tier: 'barren', achievedAt: new Date() }],
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

/**
 * Initialize a new world state for a user
 * Creates a new world state document in Firestore
 * @param {string} clientId
 * @returns {Promise<{ worldState: Object | null, error: string | null }>}
 */
export async function initializeWorldState(clientId) {
  const firestore = getFirestore()
  if (!firestore) {
    return { worldState: null, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const worldState = createDefaultWorldState(clientId)
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    await docRef.set(worldState)

    logger.info('WORLD', 'World state initialized', { clientId, tier: worldState.tier })

    return { worldState, error: null }
  } catch (error) {
    logger.error('WORLD', 'Failed to initialize world state', { clientId, error: error.message })
    return { worldState: null, error: error.message }
  }
}

/**
 * Get world state for a user, creating a default one if it doesn't exist
 * @param {string} clientId
 * @returns {Promise<{ worldState: Object | null, error: string | null }>}
 */
export async function getWorldState(clientId) {
  const firestore = getFirestore()
  if (!firestore) {
    return { worldState: null, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    if (!doc.exists) {
      // Return default world state for new users (create it lazily)
      return { worldState: createDefaultWorldState(clientId), error: null }
    }

    const data = doc.data()

    // Convert Firestore timestamps to JS Dates
    return {
      worldState: {
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        pieces: (data.pieces || []).map(piece => ({
          ...piece,
          unlockedAt: piece.unlockedAt?.toDate?.() || piece.unlockedAt
        }))
      },
      error: null
    }
  } catch (error) {
    logger.error('WORLD', 'Failed to get world state', { clientId, error: error.message })
    return { worldState: null, error: error.message }
  }
}

/**
 * Add a world piece after quiz pass
 * @param {string} clientId
 * @param {Object} piece - WorldPiece object to add
 * @param {string} piece.id - Unique piece ID
 * @param {string} piece.topicId - ID of the topic
 * @param {string} piece.topicName - Name of the topic
 * @param {string} piece.zone - 'nature' | 'civilization' | 'arcane'
 * @param {string} piece.imageUrl - URL of the piece image
 * @param {string} piece.prompt - Prompt used to generate the image
 * @param {Object} piece.position - { x: number, y: number } position on the island
 * @returns {Promise<{ worldState: Object | null, arcaneJustUnlocked: boolean, error: string | null }>}
 */
export async function addWorldPiece(clientId, piece) {
  const firestore = getFirestore()
  if (!firestore) {
    return { worldState: null, arcaneJustUnlocked: false, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    let worldState
    if (!doc.exists) {
      // Create new world state if it doesn't exist
      worldState = createDefaultWorldState(clientId)
    } else {
      worldState = doc.data()
    }

    // Validate piece zone
    const validZones = ['nature', 'civilization', 'arcane']
    if (!validZones.includes(piece.zone)) {
      return { worldState: null, arcaneJustUnlocked: false, error: `Invalid zone. Must be one of: ${validZones.join(', ')}` }
    }

    // Check if arcane zone is accessible
    if (piece.zone === 'arcane' && !worldState.arcaneUnlocked) {
      return { worldState: null, arcaneJustUnlocked: false, error: 'Arcane zone is not unlocked yet' }
    }

    // Add the piece with unlock timestamp
    const newPiece = {
      ...piece,
      unlockedAt: new Date()
    }

    worldState.pieces = [...(worldState.pieces || []), newPiece]
    worldState.topicsCompleted = (worldState.topicsCompleted || 0) + 1
    worldState.updatedAt = new Date()

    // WB017: Check if arcane should be unlocked and track if it just got unlocked
    let arcaneJustUnlocked = false
    if (!worldState.arcaneUnlocked && worldState.topicsCompleted >= ARCANE_UNLOCK_THRESHOLD) {
      worldState.arcaneUnlocked = true
      arcaneJustUnlocked = true
      logger.info('WORLD', 'Arcane zone unlocked', { clientId, topicsCompleted: worldState.topicsCompleted })
    }

    await docRef.set(worldState)

    logger.info('WORLD', 'World piece added', {
      clientId,
      pieceId: piece.id,
      zone: piece.zone,
      topicsCompleted: worldState.topicsCompleted,
      arcaneJustUnlocked
    })

    return { worldState, arcaneJustUnlocked, error: null }
  } catch (error) {
    logger.error('WORLD', 'Failed to add world piece', { clientId, error: error.message })
    return { worldState: null, arcaneJustUnlocked: false, error: error.message }
  }
}

/**
 * Add XP to a user's world state and check for tier upgrades
 * @param {string} clientId
 * @param {number} amount - Amount of XP to add
 * @returns {Promise<{ worldState: Object | null, tierUpgrade: Object | null, error: string | null }>}
 */
export async function addXP(clientId, amount) {
  const firestore = getFirestore()
  if (!firestore) {
    return { worldState: null, tierUpgrade: null, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  if (typeof amount !== 'number' || amount < 0) {
    return { worldState: null, tierUpgrade: null, error: 'XP amount must be a non-negative number' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    let worldState
    if (!doc.exists) {
      // Create new world state if it doesn't exist
      worldState = createDefaultWorldState(clientId)
    } else {
      worldState = doc.data()
    }

    const oldXP = worldState.totalXP || 0
    const newXP = oldXP + amount

    // Check for tier upgrade
    const tierUpgrade = checkTierUpgrade(oldXP, newXP)

    // Update world state
    worldState.totalXP = newXP
    worldState.tier = getTierForXP(newXP)
    worldState.updatedAt = new Date()

    await docRef.set(worldState)

    logger.info('WORLD', 'XP added', {
      clientId,
      amount,
      totalXP: newXP,
      tier: worldState.tier,
      upgraded: !!tierUpgrade
    })

    return { worldState, tierUpgrade, error: null }
  } catch (error) {
    logger.error('WORLD', 'Failed to add XP', { clientId, error: error.message })
    return { worldState: null, tierUpgrade: null, error: error.message }
  }
}

/**
 * Award XP based on quiz performance and check for tier upgrade
 * WB014: XP earned from quizzes with tier progression
 *
 * @param {string} clientId - The client identifier
 * @param {number} score - The quiz score achieved
 * @param {number} maxScore - The maximum possible score
 * @param {number} streak - Current streak count (defaults to 0)
 * @returns {Promise<{
 *   newXP: number,
 *   totalXP: number,
 *   tierUpgrade: { from: string, to: string } | null,
 *   newTier: string,
 *   error: string | null
 * }>}
 */
export async function awardQuizXP(clientId, score, maxScore, streak = 0) {
  const firestore = getFirestore()
  if (!firestore) {
    return {
      newXP: 0,
      totalXP: 0,
      tierUpgrade: null,
      newTier: 'barren',
      error: 'FIRESTORE_NOT_AVAILABLE'
    }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    let worldState
    if (!doc.exists) {
      worldState = createDefaultWorldState(clientId)
    } else {
      const data = doc.data()
      worldState = {
        ...data,
        tierHistory: data.tierHistory || [{ tier: 'barren', achievedAt: new Date() }]
      }
    }

    // Calculate XP to award based on quiz performance
    let xpEarned = 0
    const isPerfect = score === maxScore && maxScore > 0
    const passed = score > 0 // Any correct answer counts as passed

    if (passed) {
      if (isPerfect) {
        // Perfect score gets bonus XP (replaces base XP, not additional)
        xpEarned = XP_REWARDS.QUIZ_PERFECT
      } else {
        xpEarned = XP_REWARDS.QUIZ_PASS
      }
    }

    // Add streak bonus if applicable
    if (streak > 0) {
      xpEarned += streak * XP_REWARDS.STREAK_BONUS
    }

    const previousTotalXP = worldState.totalXP || 0
    const previousTier = worldState.tier || 'barren'
    const newTotalXP = previousTotalXP + xpEarned
    const newTier = getTierForXP(newTotalXP)

    // Check for tier upgrade
    let tierUpgrade = null
    if (newTier !== previousTier) {
      const previousTierIndex = TIER_ORDER.indexOf(previousTier)
      const newTierIndex = TIER_ORDER.indexOf(newTier)

      // Only report upgrade if new tier is higher
      if (newTierIndex > previousTierIndex) {
        tierUpgrade = { from: previousTier, to: newTier }

        // Add to tier history
        worldState.tierHistory = worldState.tierHistory || []
        worldState.tierHistory.push({
          tier: newTier,
          achievedAt: new Date()
        })
      }
    }

    // Update world state
    const now = new Date()
    worldState.totalXP = newTotalXP
    worldState.tier = newTier
    worldState.lastXPAward = {
      amount: xpEarned,
      source: isPerfect ? 'quiz_perfect' : 'quiz_pass',
      timestamp: now
    }
    worldState.updatedAt = now

    // Save to Firestore
    await docRef.set(worldState)

    logger.info('WORLD', 'Quiz XP awarded', {
      clientId,
      score,
      maxScore,
      xpEarned,
      totalXP: newTotalXP,
      tier: newTier,
      tierUpgrade: tierUpgrade ? `${tierUpgrade.from} -> ${tierUpgrade.to}` : null
    })

    return {
      newXP: xpEarned,
      totalXP: newTotalXP,
      tierUpgrade,
      newTier,
      error: null
    }
  } catch (error) {
    logger.error('WORLD', 'Failed to award quiz XP', { clientId, error: error.message })
    return {
      newXP: 0,
      totalXP: 0,
      tierUpgrade: null,
      newTier: 'barren',
      error: error.message
    }
  }
}

/**
 * Update streak count for a user
 * @param {string} clientId
 * @param {number} streak - New streak count
 * @returns {Promise<{ worldState: Object | null, error: string | null }>}
 */
export async function updateStreak(clientId, streak) {
  const firestore = getFirestore()
  if (!firestore) {
    return { worldState: null, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  if (typeof streak !== 'number' || streak < 0) {
    return { worldState: null, error: 'Streak must be a non-negative number' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    let worldState
    if (!doc.exists) {
      worldState = createDefaultWorldState(clientId)
    } else {
      worldState = doc.data()
    }

    worldState.streak = streak
    worldState.updatedAt = new Date()

    await docRef.set(worldState)

    logger.info('WORLD', 'Streak updated', { clientId, streak })

    return { worldState, error: null }
  } catch (error) {
    logger.error('WORLD', 'Failed to update streak', { clientId, error: error.message })
    return { worldState: null, error: error.message }
  }
}

/**
 * Get tier definitions and thresholds
 * @returns {Object} Tier configuration
 */
export function getTierDefinitions() {
  return {
    tiers: TIERS,
    order: TIER_ORDER,
    arcaneUnlockThreshold: ARCANE_UNLOCK_THRESHOLD
  }
}

/**
 * Check if the arcane zone should be unlocked and unlock it if threshold is met
 * WB017: Arcane zone unlock after completing 20 topics
 *
 * @param {string} clientId - The client identifier
 * @returns {Promise<{
 *   unlocked: boolean,
 *   justUnlocked: boolean,
 *   message: string | null,
 *   topicsCompleted: number,
 *   topicsNeeded: number,
 *   error: string | null
 * }>}
 */
export async function checkArcaneUnlock(clientId) {
  const firestore = getFirestore()
  if (!firestore) {
    return {
      unlocked: false,
      justUnlocked: false,
      message: null,
      topicsCompleted: 0,
      topicsNeeded: ARCANE_UNLOCK_THRESHOLD,
      error: 'FIRESTORE_NOT_AVAILABLE'
    }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    let worldState
    if (!doc.exists) {
      worldState = createDefaultWorldState(clientId)
    } else {
      worldState = doc.data()
    }

    const topicsCompleted = worldState.topicsCompleted || 0
    const wasUnlocked = worldState.arcaneUnlocked || false

    // Check if we should unlock the arcane zone
    if (!wasUnlocked && topicsCompleted >= ARCANE_UNLOCK_THRESHOLD) {
      // Unlock arcane zone
      worldState.arcaneUnlocked = true
      worldState.updatedAt = new Date()
      await docRef.set(worldState)

      logger.info('WORLD', 'Arcane zone unlocked via check', { clientId, topicsCompleted })

      return {
        unlocked: true,
        justUnlocked: true,
        message: 'The Arcane zone awakens!',
        topicsCompleted,
        topicsNeeded: 0,
        error: null
      }
    }

    // Return current state
    return {
      unlocked: wasUnlocked,
      justUnlocked: false,
      message: null,
      topicsCompleted,
      topicsNeeded: wasUnlocked ? 0 : Math.max(0, ARCANE_UNLOCK_THRESHOLD - topicsCompleted),
      error: null
    }
  } catch (error) {
    logger.error('WORLD', 'Failed to check arcane unlock', { clientId, error: error.message })
    return {
      unlocked: false,
      justUnlocked: false,
      message: null,
      topicsCompleted: 0,
      topicsNeeded: ARCANE_UNLOCK_THRESHOLD,
      error: error.message
    }
  }
}

/**
 * Award XP for quick mode completion (no quiz, no world piece)
 * WB015: Quick mode awards small XP but no world piece
 *
 * @param {string} clientId - The client identifier
 * @returns {Promise<{
 *   xpEarned: number,
 *   totalXP: number,
 *   tier: string,
 *   tierUpgrade: { from: string, to: string } | null,
 *   message: string,
 *   error: string | null
 * }>}
 */
export async function awardQuickModeXP(clientId) {
  const firestore = getFirestore()
  if (!firestore) {
    return {
      xpEarned: 0,
      totalXP: 0,
      tier: 'barren',
      tierUpgrade: null,
      message: '',
      error: 'FIRESTORE_NOT_AVAILABLE'
    }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    let worldState
    if (!doc.exists) {
      worldState = createDefaultWorldState(clientId)
    } else {
      const data = doc.data()
      worldState = {
        ...data,
        tierHistory: data.tierHistory || [{ tier: 'barren', achievedAt: new Date() }]
      }
    }

    // Award quick mode XP (no world piece)
    const xpEarned = XP_REWARDS.QUICK_MODE
    const previousTotalXP = worldState.totalXP || 0
    const previousTier = worldState.tier || 'barren'
    const newTotalXP = previousTotalXP + xpEarned
    const newTier = getTierForXP(newTotalXP)

    // Check for tier upgrade
    let tierUpgrade = null
    if (newTier !== previousTier) {
      const previousTierIndex = TIER_ORDER.indexOf(previousTier)
      const newTierIndex = TIER_ORDER.indexOf(newTier)

      // Only report upgrade if new tier is higher
      if (newTierIndex > previousTierIndex) {
        tierUpgrade = { from: previousTier, to: newTier }

        // Add to tier history
        worldState.tierHistory = worldState.tierHistory || []
        worldState.tierHistory.push({
          tier: newTier,
          achievedAt: new Date()
        })
      }
    }

    // Update world state (note: topicsCompleted NOT incremented, no piece added)
    const now = new Date()
    worldState.totalXP = newTotalXP
    worldState.tier = newTier
    worldState.lastXPAward = {
      amount: xpEarned,
      source: 'quick_mode',
      timestamp: now
    }
    worldState.updatedAt = now

    // Save to Firestore
    await docRef.set(worldState)

    logger.info('WORLD', 'Quick mode XP awarded', {
      clientId,
      xpEarned,
      totalXP: newTotalXP,
      tier: newTier,
      tierUpgrade: tierUpgrade ? `${tierUpgrade.from} -> ${tierUpgrade.to}` : null
    })

    return {
      xpEarned,
      totalXP: newTotalXP,
      tier: newTier,
      tierUpgrade,
      message: 'Complete a full lesson with quiz to unlock world pieces!',
      error: null
    }
  } catch (error) {
    logger.error('WORLD', 'Failed to award quick mode XP', { clientId, error: error.message })
    return {
      xpEarned: 0,
      totalXP: 0,
      tier: 'barren',
      tierUpgrade: null,
      message: '',
      error: error.message
    }
  }
}

export default {
  getWorldState,
  initializeWorldState,
  addWorldPiece,
  addXP,
  awardQuizXP,
  awardQuickModeXP,
  updateStreak,
  getTierForXP,
  calculateTier,
  xpToNextTier,
  checkTierUpgrade,
  getTierDefinitions,
  checkArcaneUnlock,
  XP_REWARDS,
  TIER_THRESHOLDS
}
