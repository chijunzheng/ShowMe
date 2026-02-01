/**
 * World State Service
 * WB006: Track world building state including pieces, XP, tier, and streak
 * WB014: XP and tier progression for World Builder gamification
 * WB020: Piece Evolution tracking
 * WB021: Pocket Connection Scenes
 *
 * Data Schema (worldState collection):
 * - clientId: string
 * - pieces: array of WorldPiece objects
 * - pockets: array of Pocket objects (connected groups of related pieces)
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
 * - evolutionTier: 'seedling' | 'growing' | 'flourishing' | 'legendary' (WB020)
 * - relatedTopics: string[] - Topics semantically related to this piece (WB020)
 * - evolvedAt: { growing?: Date, flourishing?: Date, legendary?: Date } (WB020)
 * - lastReviewedAt: Date - Updated after each review quiz (defaults to unlockedAt)
 * - reviewCount: number - Total times reviewed (default 0)
 * - lastReviewScore: number - Most recent review score (0-100)
 *
 * Pocket Schema (WB021):
 * - id: string
 * - zone: 'nature' | 'civilization' | 'arcane'
 * - pieceIds: string[] - IDs of pieces in this pocket
 * - connectionScene: {
 *     imageUrl: string,
 *     generatedAt: Date,
 *     pieceCountAtGeneration: number,
 *     evolutionLevel: 'initial' | 'enhanced' | 'legendary'
 *   } | null
 * - createdAt: Date
 * - updatedAt: Date
 */

import { Firestore } from '@google-cloud/firestore'
import logger from '../utils/logger.js'

// Initialize Firestore
let db = null
let firestoreUnavailable = false
let warnedLocalFallback = false
const localWorldState = new Map()

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

function shouldUseLocalWorld() {
  if (process.env.SHOWME_LOCAL_WORLD === '1') return true
  if (process.env.NODE_ENV === 'production') return false
  return firestoreUnavailable
}

function isFirestoreUnavailableError(error) {
  if (!error) return false
  if (typeof error.code === 'number' && [5, 7, 16].includes(error.code)) return true
  const message = String(error.message || '')
  return /NOT_FOUND|PERMISSION_DENIED|UNAUTHENTICATED|credentials|default credentials/i.test(message)
}

function markFirestoreUnavailable(error) {
  if (process.env.NODE_ENV === 'production') return
  if (!isFirestoreUnavailableError(error)) return
  if (!firestoreUnavailable) {
    firestoreUnavailable = true
  }
  if (!warnedLocalFallback) {
    warnedLocalFallback = true
    logger.warn('WORLD', 'Falling back to local world store', { error: error?.message })
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
  STREAK_BONUS: 5,         // Per day of streak
  REVIEW_PASS: 10,         // XP for passing a review quiz (66%+)
  REVIEW_PERFECT: 15       // XP for perfect review score (100%)
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
    pockets: [], // WB021: Groups of related pieces
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

function getLocalWorldState(clientId) {
  if (localWorldState.has(clientId)) {
    return localWorldState.get(clientId)
  }
  const worldState = createDefaultWorldState(clientId)
  localWorldState.set(clientId, worldState)
  return worldState
}

function setLocalWorldState(clientId, worldState) {
  localWorldState.set(clientId, worldState)
}

function normalizeWorldState(data) {
  if (!data || typeof data !== 'object') {
    return data
  }
  return {
    ...data,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    pieces: (data.pieces || []).map(piece => {
      const unlockedAt = piece.unlockedAt?.toDate?.() || piece.unlockedAt
      return {
        ...piece,
        unlockedAt,
        // WB020: Normalize evolution fields
        evolutionTier: piece.evolutionTier || 'seedling',
        relatedTopics: piece.relatedTopics || [],
        evolvedAt: piece.evolvedAt ? {
          growing: piece.evolvedAt.growing?.toDate?.() || piece.evolvedAt.growing,
          flourishing: piece.evolvedAt.flourishing?.toDate?.() || piece.evolvedAt.flourishing,
          legendary: piece.evolvedAt.legendary?.toDate?.() || piece.evolvedAt.legendary
        } : {},
        // Review tracking fields - default lastReviewedAt to unlockedAt for migration
        lastReviewedAt: piece.lastReviewedAt?.toDate?.() || piece.lastReviewedAt || unlockedAt,
        reviewCount: piece.reviewCount ?? 0,
        lastReviewScore: piece.lastReviewScore ?? null
      }
    }),
    // WB021: Normalize pocket fields
    pockets: (data.pockets || []).map(pocket => ({
      ...pocket,
      createdAt: pocket.createdAt?.toDate?.() || pocket.createdAt,
      updatedAt: pocket.updatedAt?.toDate?.() || pocket.updatedAt,
      connectionScene: pocket.connectionScene ? {
        ...pocket.connectionScene,
        generatedAt: pocket.connectionScene.generatedAt?.toDate?.() || pocket.connectionScene.generatedAt
      } : null
    }))
  }
}

async function loadWorldState(clientId) {
  if (shouldUseLocalWorld()) {
    return { worldState: getLocalWorldState(clientId), error: null }
  }

  const firestore = getFirestore()
  if (!firestore) {
    if (process.env.NODE_ENV !== 'production') {
      firestoreUnavailable = true
      return { worldState: getLocalWorldState(clientId), error: null }
    }
    return { worldState: null, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { worldState: createDefaultWorldState(clientId), error: null }
    }

    const data = doc.data()
    return { worldState: normalizeWorldState(data), error: null }
  } catch (error) {
    markFirestoreUnavailable(error)
    if (shouldUseLocalWorld()) {
      return { worldState: getLocalWorldState(clientId), error: null }
    }
    return { worldState: null, error: error.message }
  }
}

async function persistWorldState(clientId, worldState) {
  if (shouldUseLocalWorld()) {
    setLocalWorldState(clientId, worldState)
    return { error: null }
  }

  const firestore = getFirestore()
  if (!firestore) {
    if (process.env.NODE_ENV !== 'production') {
      firestoreUnavailable = true
      setLocalWorldState(clientId, worldState)
      return { error: null }
    }
    return { error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    await docRef.set(worldState)
    return { error: null }
  } catch (error) {
    markFirestoreUnavailable(error)
    if (shouldUseLocalWorld()) {
      setLocalWorldState(clientId, worldState)
      return { error: null }
    }
    return { error: error.message }
  }
}

/**
 * Initialize a new world state for a user
 * Creates a new world state document in Firestore
 * @param {string} clientId
 * @returns {Promise<{ worldState: Object | null, error: string | null }>}
 */
export async function initializeWorldState(clientId) {
  const worldState = createDefaultWorldState(clientId)
  const result = await persistWorldState(clientId, worldState)

  if (result.error) {
    logger.error('WORLD', 'Failed to initialize world state', { clientId, error: result.error })
    return { worldState: null, error: result.error }
  }

  logger.info('WORLD', 'World state initialized', { clientId, tier: worldState.tier })

  return { worldState, error: null }
}

/**
 * Reset world state for a user (clears pieces, XP, tier, streak, etc.)
 * @param {string} clientId
 * @returns {Promise<{ worldState: Object | null, error: string | null }>}
 */
export async function resetWorldState(clientId) {
  const worldState = createDefaultWorldState(clientId)
  const result = await persistWorldState(clientId, worldState)

  if (result.error) {
    logger.error('WORLD', 'Failed to reset world state', { clientId, error: result.error })
    return { worldState: null, error: result.error }
  }

  logger.info('WORLD', 'World state reset', { clientId, tier: worldState.tier })

  return { worldState, error: null }
}

/**
 * Get world state for a user, creating a default one if it doesn't exist
 * @param {string} clientId
 * @returns {Promise<{ worldState: Object | null, error: string | null }>}
 */
export async function getWorldState(clientId) {
  const result = await loadWorldState(clientId)
  if (result.error) {
    logger.error('WORLD', 'Failed to get world state', { clientId, error: result.error })
    return { worldState: null, error: result.error }
  }

  return { worldState: result.worldState, error: null }
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
  const loadResult = await loadWorldState(clientId)
  if (loadResult.error) {
    return { worldState: null, arcaneJustUnlocked: false, error: loadResult.error }
  }

  try {
    let worldState = loadResult.worldState || createDefaultWorldState(clientId)

    // Validate piece zone
    const validZones = ['nature', 'civilization', 'arcane']
    if (!validZones.includes(piece.zone)) {
      return { worldState: null, arcaneJustUnlocked: false, error: `Invalid zone. Must be one of: ${validZones.join(', ')}` }
    }

    // Allow arcane pieces even before unlock; zone visibility is handled in the UI.
    if (piece.zone === 'arcane' && !worldState.arcaneUnlocked) {
      logger.info('WORLD', 'Arcane piece added before unlock', { clientId, pieceId: piece.id })
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

    const persistResult = await persistWorldState(clientId, worldState)
    if (persistResult.error) {
      return { worldState: null, arcaneJustUnlocked: false, error: persistResult.error }
    }

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
  if (typeof amount !== 'number' || amount < 0) {
    return { worldState: null, tierUpgrade: null, error: 'XP amount must be a non-negative number' }
  }

  const loadResult = await loadWorldState(clientId)
  if (loadResult.error) {
    return { worldState: null, tierUpgrade: null, error: loadResult.error }
  }

  try {
    let worldState = loadResult.worldState || createDefaultWorldState(clientId)

    const oldXP = worldState.totalXP || 0
    const newXP = oldXP + amount

    // Check for tier upgrade
    const tierUpgrade = checkTierUpgrade(oldXP, newXP)

    // Update world state
    worldState.totalXP = newXP
    worldState.tier = getTierForXP(newXP)
    worldState.updatedAt = new Date()

    const persistResult = await persistWorldState(clientId, worldState)
    if (persistResult.error) {
      return { worldState: null, tierUpgrade: null, error: persistResult.error }
    }

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
  const loadResult = await loadWorldState(clientId)
  if (loadResult.error) {
    return {
      newXP: 0,
      totalXP: 0,
      tierUpgrade: null,
      newTier: 'barren',
      error: loadResult.error
    }
  }

  try {
    let worldState = loadResult.worldState || createDefaultWorldState(clientId)
    worldState = {
      ...worldState,
      tierHistory: worldState.tierHistory || [{ tier: 'barren', achievedAt: new Date() }]
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
    const persistResult = await persistWorldState(clientId, worldState)
    if (persistResult.error) {
      return {
        newXP: 0,
        totalXP: 0,
        tierUpgrade: null,
        newTier: 'barren',
        error: persistResult.error
      }
    }

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
  if (typeof streak !== 'number' || streak < 0) {
    return { worldState: null, error: 'Streak must be a non-negative number' }
  }

  const loadResult = await loadWorldState(clientId)
  if (loadResult.error) {
    return { worldState: null, error: loadResult.error }
  }

  try {
    const worldState = loadResult.worldState || createDefaultWorldState(clientId)

    worldState.streak = streak
    worldState.updatedAt = new Date()

    const persistResult = await persistWorldState(clientId, worldState)
    if (persistResult.error) {
      return { worldState: null, error: persistResult.error }
    }

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
  const loadResult = await loadWorldState(clientId)
  if (loadResult.error) {
    return {
      unlocked: false,
      justUnlocked: false,
      message: null,
      topicsCompleted: 0,
      topicsNeeded: ARCANE_UNLOCK_THRESHOLD,
      error: loadResult.error
    }
  }

  try {
    const worldState = loadResult.worldState || createDefaultWorldState(clientId)

    const topicsCompleted = worldState.topicsCompleted || 0
    const wasUnlocked = worldState.arcaneUnlocked || false

    // Check if we should unlock the arcane zone
    if (!wasUnlocked && topicsCompleted >= ARCANE_UNLOCK_THRESHOLD) {
      // Unlock arcane zone
      worldState.arcaneUnlocked = true
      worldState.updatedAt = new Date()
      const persistResult = await persistWorldState(clientId, worldState)
      if (persistResult.error) {
        return {
          unlocked: false,
          justUnlocked: false,
          message: null,
          topicsCompleted: 0,
          topicsNeeded: ARCANE_UNLOCK_THRESHOLD,
          error: persistResult.error
        }
      }

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
  const loadResult = await loadWorldState(clientId)
  if (loadResult.error) {
    return {
      xpEarned: 0,
      totalXP: 0,
      tier: 'barren',
      tierUpgrade: null,
      message: '',
      error: loadResult.error
    }
  }

  try {
    let worldState = loadResult.worldState || createDefaultWorldState(clientId)
    worldState = {
      ...worldState,
      tierHistory: worldState.tierHistory || [{ tier: 'barren', achievedAt: new Date() }]
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
    const persistResult = await persistWorldState(clientId, worldState)
    if (persistResult.error) {
      return {
        xpEarned: 0,
        totalXP: 0,
        tier: 'barren',
        tierUpgrade: null,
        message: '',
        error: persistResult.error
      }
    }

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

/**
 * Evolve a piece to a new tier and update its related topics
 * WB020: Piece Evolution
 *
 * @param {string} clientId - The client identifier
 * @param {string} pieceId - The ID of the piece to evolve
 * @param {string} newTier - The new evolution tier: 'seedling' | 'growing' | 'flourishing' | 'legendary'
 * @param {string[]} relatedTopics - Updated list of related topics
 * @returns {Promise<{
 *   piece: Object | null,
 *   previousTier: string,
 *   error: string | null
 * }>}
 */
export async function evolvePiece(clientId, pieceId, newTier, relatedTopics) {
  // Validate inputs
  const validTiers = ['seedling', 'growing', 'flourishing', 'legendary']
  if (!validTiers.includes(newTier)) {
    return { piece: null, previousTier: null, error: 'INVALID_TIER' }
  }

  if (!Array.isArray(relatedTopics)) {
    return { piece: null, previousTier: null, error: 'INVALID_RELATED_TOPICS' }
  }

  const loadResult = await loadWorldState(clientId)
  if (loadResult.error) {
    return { piece: null, previousTier: null, error: loadResult.error }
  }

  try {
    const worldState = loadResult.worldState || createDefaultWorldState(clientId)

    // Find the piece
    const pieceIndex = worldState.pieces.findIndex(p => p.id === pieceId)
    if (pieceIndex === -1) {
      return { piece: null, previousTier: null, error: 'PIECE_NOT_FOUND' }
    }

    const piece = worldState.pieces[pieceIndex]
    const previousTier = piece.evolutionTier || 'seedling'

    // Update the piece
    const now = new Date()
    const evolvedAt = piece.evolvedAt || {}

    // Record when each tier was reached
    if (newTier !== previousTier) {
      evolvedAt[newTier] = now
    }

    const updatedPiece = {
      ...piece,
      evolutionTier: newTier,
      relatedTopics: [...new Set(relatedTopics)], // Deduplicate
      evolvedAt
    }

    // Update the piece in the array
    worldState.pieces[pieceIndex] = updatedPiece
    worldState.updatedAt = now

    // Persist
    const persistResult = await persistWorldState(clientId, worldState)
    if (persistResult.error) {
      return { piece: null, previousTier: null, error: persistResult.error }
    }

    logger.info('WORLD', 'Piece evolved', {
      clientId,
      pieceId,
      topicName: piece.topicName,
      previousTier,
      newTier,
      relatedCount: relatedTopics.length
    })

    return {
      piece: updatedPiece,
      previousTier,
      error: null
    }
  } catch (error) {
    logger.error('WORLD', 'Failed to evolve piece', { clientId, pieceId, error: error.message })
    return { piece: null, previousTier: null, error: error.message }
  }
}

/**
 * Update or create a pocket and its connection scene
 * WB021: Pocket Connection Scenes
 *
 * @param {string} clientId - The client identifier
 * @param {string} pocketId - The pocket ID (can be new or existing)
 * @param {Object} pocketData - Pocket data to update/create
 * @param {string} pocketData.zone - The zone: 'nature' | 'civilization' | 'arcane'
 * @param {string[]} pocketData.pieceIds - IDs of pieces in this pocket
 * @param {Object} [sceneData] - Optional scene data to save
 * @param {string} sceneData.imageUrl - Generated scene image URL
 * @param {number} sceneData.pieceCountAtGeneration - Number of pieces when scene was generated
 * @param {string} sceneData.evolutionLevel - Scene evolution level
 * @returns {Promise<{
 *   pocket: Object | null,
 *   isNew: boolean,
 *   error: string | null
 * }>}
 */
export async function updatePocketScene(clientId, pocketId, pocketData, sceneData = null) {
  // Validate inputs
  const validZones = ['nature', 'civilization', 'arcane']
  if (!pocketData || !validZones.includes(pocketData.zone)) {
    return { pocket: null, isNew: false, error: 'INVALID_ZONE' }
  }

  if (!Array.isArray(pocketData.pieceIds) || pocketData.pieceIds.length < 3) {
    return { pocket: null, isNew: false, error: 'INSUFFICIENT_PIECES' }
  }

  const loadResult = await loadWorldState(clientId)
  if (loadResult.error) {
    return { pocket: null, isNew: false, error: loadResult.error }
  }

  try {
    const worldState = loadResult.worldState || createDefaultWorldState(clientId)

    // Ensure pockets array exists
    if (!worldState.pockets) {
      worldState.pockets = []
    }

    const now = new Date()

    // Check if pocket exists
    const existingIndex = worldState.pockets.findIndex(p => p.id === pocketId)
    const isNew = existingIndex === -1

    let pocket

    if (isNew) {
      // Create new pocket
      pocket = {
        id: pocketId,
        zone: pocketData.zone,
        pieceIds: pocketData.pieceIds,
        connectionScene: sceneData ? {
          imageUrl: sceneData.imageUrl,
          generatedAt: now,
          pieceCountAtGeneration: sceneData.pieceCountAtGeneration || pocketData.pieceIds.length,
          evolutionLevel: sceneData.evolutionLevel || 'initial'
        } : null,
        createdAt: now,
        updatedAt: now
      }
      worldState.pockets.push(pocket)
    } else {
      // Update existing pocket
      pocket = worldState.pockets[existingIndex]
      pocket.zone = pocketData.zone
      pocket.pieceIds = pocketData.pieceIds
      pocket.updatedAt = now

      // Update scene if provided
      if (sceneData) {
        pocket.connectionScene = {
          imageUrl: sceneData.imageUrl,
          generatedAt: now,
          pieceCountAtGeneration: sceneData.pieceCountAtGeneration || pocketData.pieceIds.length,
          evolutionLevel: sceneData.evolutionLevel || 'initial'
        }
      }

      worldState.pockets[existingIndex] = pocket
    }

    worldState.updatedAt = now

    // Persist
    const persistResult = await persistWorldState(clientId, worldState)
    if (persistResult.error) {
      return { pocket: null, isNew: false, error: persistResult.error }
    }

    logger.info('WORLD', isNew ? 'Pocket created' : 'Pocket updated', {
      clientId,
      pocketId,
      zone: pocketData.zone,
      pieceCount: pocketData.pieceIds.length,
      hasScene: !!sceneData
    })

    return {
      pocket,
      isNew,
      error: null
    }
  } catch (error) {
    logger.error('WORLD', 'Failed to update pocket scene', { clientId, pocketId, error: error.message })
    return { pocket: null, isNew: false, error: error.message }
  }
}

/**
 * Get a specific pocket by ID
 *
 * @param {string} clientId - The client identifier
 * @param {string} pocketId - The pocket ID
 * @returns {Promise<{ pocket: Object | null, error: string | null }>}
 */
export async function getPocket(clientId, pocketId) {
  const loadResult = await loadWorldState(clientId)
  if (loadResult.error) {
    return { pocket: null, error: loadResult.error }
  }

  const worldState = loadResult.worldState
  if (!worldState || !worldState.pockets) {
    return { pocket: null, error: null }
  }

  const pocket = worldState.pockets.find(p => p.id === pocketId)
  return { pocket: pocket || null, error: null }
}

/**
 * Get all pockets for a user
 *
 * @param {string} clientId - The client identifier
 * @returns {Promise<{ pockets: Object[], error: string | null }>}
 */
export async function getAllPockets(clientId) {
  const loadResult = await loadWorldState(clientId)
  if (loadResult.error) {
    return { pockets: [], error: loadResult.error }
  }

  const worldState = loadResult.worldState
  return {
    pockets: worldState?.pockets || [],
    error: null
  }
}

/**
 * Record a review completion for a piece and award XP
 * Updates lastReviewedAt, increments reviewCount, and stores lastReviewScore
 *
 * @param {string} clientId - The client identifier
 * @param {string} pieceId - The ID of the piece being reviewed
 * @param {number} score - The review score (0-100)
 * @returns {Promise<{
 *   piece: Object | null,
 *   xpAwarded: number,
 *   refreshed: boolean,
 *   totalXP: number,
 *   tierUpgrade: { from: string, to: string } | null,
 *   message: string,
 *   error: string | null
 * }>}
 */
export async function recordReview(clientId, pieceId, score) {
  // Validate score
  if (typeof score !== 'number' || score < 0 || score > 100) {
    return {
      piece: null,
      xpAwarded: 0,
      refreshed: false,
      totalXP: 0,
      tierUpgrade: null,
      message: '',
      error: 'Score must be a number between 0 and 100'
    }
  }

  const loadResult = await loadWorldState(clientId)
  if (loadResult.error) {
    return {
      piece: null,
      xpAwarded: 0,
      refreshed: false,
      totalXP: 0,
      tierUpgrade: null,
      message: '',
      error: loadResult.error
    }
  }

  try {
    let worldState = loadResult.worldState || createDefaultWorldState(clientId)
    worldState = {
      ...worldState,
      tierHistory: worldState.tierHistory || [{ tier: 'barren', achievedAt: new Date() }]
    }

    // Find the piece
    const pieceIndex = worldState.pieces.findIndex(p => p.id === pieceId)
    if (pieceIndex === -1) {
      return {
        piece: null,
        xpAwarded: 0,
        refreshed: false,
        totalXP: 0,
        tierUpgrade: null,
        message: '',
        error: 'PIECE_NOT_FOUND'
      }
    }

    const piece = worldState.pieces[pieceIndex]
    const now = new Date()

    // Calculate XP award based on score
    // Pass threshold is 66%, perfect is 100%
    let xpAwarded = 0
    let refreshed = false
    let message = ''

    if (score >= 66) {
      refreshed = true
      if (score === 100) {
        xpAwarded = XP_REWARDS.REVIEW_PERFECT
        message = 'Perfect review! Knowledge refreshed!'
      } else {
        xpAwarded = XP_REWARDS.REVIEW_PASS
        message = 'Great job! Knowledge refreshed!'
      }
    } else {
      message = 'Keep practicing! Try again to refresh this topic.'
    }

    // Update the piece with review data
    const updatedPiece = {
      ...piece,
      lastReviewedAt: now,
      reviewCount: (piece.reviewCount ?? 0) + 1,
      lastReviewScore: score
    }
    worldState.pieces[pieceIndex] = updatedPiece

    // Award XP if earned
    const previousTotalXP = worldState.totalXP || 0
    const previousTier = worldState.tier || 'barren'
    const newTotalXP = previousTotalXP + xpAwarded
    const newTier = getTierForXP(newTotalXP)

    // Check for tier upgrade
    let tierUpgrade = null
    if (newTier !== previousTier) {
      const previousTierIndex = TIER_ORDER.indexOf(previousTier)
      const newTierIndex = TIER_ORDER.indexOf(newTier)

      if (newTierIndex > previousTierIndex) {
        tierUpgrade = { from: previousTier, to: newTier }
        worldState.tierHistory = worldState.tierHistory || []
        worldState.tierHistory.push({
          tier: newTier,
          achievedAt: now
        })
      }
    }

    // Update world state
    worldState.totalXP = newTotalXP
    worldState.tier = newTier
    if (xpAwarded > 0) {
      worldState.lastXPAward = {
        amount: xpAwarded,
        source: score === 100 ? 'review_perfect' : 'review_pass',
        timestamp: now
      }
    }
    worldState.updatedAt = now

    // Persist changes
    const persistResult = await persistWorldState(clientId, worldState)
    if (persistResult.error) {
      return {
        piece: null,
        xpAwarded: 0,
        refreshed: false,
        totalXP: 0,
        tierUpgrade: null,
        message: '',
        error: persistResult.error
      }
    }

    logger.info('WORLD', 'Review recorded', {
      clientId,
      pieceId,
      topicName: piece.topicName,
      score,
      xpAwarded,
      refreshed,
      reviewCount: updatedPiece.reviewCount,
      tierUpgrade: tierUpgrade ? `${tierUpgrade.from} -> ${tierUpgrade.to}` : null
    })

    return {
      piece: updatedPiece,
      xpAwarded,
      refreshed,
      totalXP: newTotalXP,
      tierUpgrade,
      message,
      error: null
    }
  } catch (error) {
    logger.error('WORLD', 'Failed to record review', { clientId, pieceId, error: error.message })
    return {
      piece: null,
      xpAwarded: 0,
      refreshed: false,
      totalXP: 0,
      tierUpgrade: null,
      message: '',
      error: error.message
    }
  }
}

/**
 * Get pieces that need review (haven't been reviewed within the threshold)
 *
 * @param {string} clientId - The client identifier
 * @param {number} daysThreshold - Number of days after which a piece needs review (default 7)
 * @returns {Promise<{
 *   pieces: Array<Object>,
 *   count: number,
 *   error: string | null
 * }>}
 */
export async function getPiecesNeedingReview(clientId, daysThreshold = 7) {
  // Validate threshold
  if (typeof daysThreshold !== 'number' || daysThreshold < 0) {
    return { pieces: [], count: 0, error: 'daysThreshold must be a non-negative number' }
  }

  const loadResult = await loadWorldState(clientId)
  if (loadResult.error) {
    return { pieces: [], count: 0, error: loadResult.error }
  }

  try {
    const worldState = loadResult.worldState
    if (!worldState || !worldState.pieces || worldState.pieces.length === 0) {
      return { pieces: [], count: 0, error: null }
    }

    const now = new Date()
    const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000

    // Filter pieces that need review
    const piecesNeedingReview = worldState.pieces
      .map(piece => {
        // Use lastReviewedAt if available, otherwise fall back to unlockedAt
        const lastReviewDate = piece.lastReviewedAt || piece.unlockedAt
        if (!lastReviewDate) {
          // If neither date exists, include the piece as needing review
          return { ...piece, daysSinceReview: Infinity }
        }

        const reviewDate = lastReviewDate instanceof Date ? lastReviewDate : new Date(lastReviewDate)
        const timeSinceReview = now.getTime() - reviewDate.getTime()
        const daysSinceReview = Math.floor(timeSinceReview / (24 * 60 * 60 * 1000))

        return { ...piece, daysSinceReview }
      })
      .filter(piece => {
        const lastReviewDate = piece.lastReviewedAt || piece.unlockedAt
        if (!lastReviewDate) return true

        const reviewDate = lastReviewDate instanceof Date ? lastReviewDate : new Date(lastReviewDate)
        const timeSinceReview = now.getTime() - reviewDate.getTime()

        return timeSinceReview > thresholdMs
      })
      // Sort by staleness (oldest first)
      .sort((a, b) => b.daysSinceReview - a.daysSinceReview)

    logger.info('WORLD', 'Retrieved pieces needing review', {
      clientId,
      daysThreshold,
      totalPieces: worldState.pieces.length,
      needingReview: piecesNeedingReview.length
    })

    return {
      pieces: piecesNeedingReview,
      count: piecesNeedingReview.length,
      error: null
    }
  } catch (error) {
    logger.error('WORLD', 'Failed to get pieces needing review', { clientId, error: error.message })
    return { pieces: [], count: 0, error: error.message }
  }
}

export default {
  getWorldState,
  initializeWorldState,
  resetWorldState,
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
  evolvePiece,
  updatePocketScene,
  getPocket,
  getAllPockets,
  recordReview,
  getPiecesNeedingReview,
  XP_REWARDS,
  TIER_THRESHOLDS
}
