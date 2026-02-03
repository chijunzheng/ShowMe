/**
 * useQuizMysteryBox Hook - Mystery Box Rewards System
 *
 * Manages the mystery box reward calculation, opening ceremony state,
 * and phase transitions for the gamification system.
 *
 * Phases:
 * - hidden: Box not visible, initial state
 * - appearing: Box fading in with scale animation
 * - shaking: Box wobbling to build anticipation
 * - opening: Box lid opening with glow effect
 * - revealed: Contents displayed, rewards shown
 *
 * Usage:
 *   const {
 *     phase,
 *     rewards,
 *     isOpen,
 *     hasBox,
 *     calculateRewards,
 *     startOpeningCeremony,
 *     skipToReveal,
 *     reset,
 *     timing,
 *   } = useQuizMysteryBox()
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  MYSTERY_BOX_TIMING,
  getBoxTierFromScore,
  calculateXpBonus,
  selectPowerUp,
  upgradeTier,
} from './mysteryBoxConfig'

/**
 * Valid phase values for the mystery box opening ceremony.
 */
const PHASES = {
  HIDDEN: 'hidden',
  APPEARING: 'appearing',
  SHAKING: 'shaking',
  OPENING: 'opening',
  REVEALED: 'revealed',
}

/**
 * Piece rarity mapping based on tier.
 * Higher tiers have better chance of rare pieces.
 */
const TIER_RARITY_MAP = {
  bronze: ['common', 'common', 'common', 'rare'],
  silver: ['common', 'common', 'rare', 'rare'],
  gold: ['common', 'rare', 'rare', 'epic'],
  legendary: ['rare', 'epic', 'epic', 'legendary'],
}

/**
 * Selects a piece rarity based on the tier.
 *
 * @param {Object} tier - The mystery box tier
 * @returns {string} A rarity string: 'common', 'rare', 'epic', or 'legendary'
 */
function selectPieceRarity(tier) {
  if (!tier || !tier.id) {
    return 'common'
  }

  const rarityPool = TIER_RARITY_MAP[tier.id] || TIER_RARITY_MAP.bronze
  const randomIndex = Math.floor(Math.random() * rarityPool.length)
  return rarityPool[randomIndex]
}

/**
 * Hook for managing mystery box rewards and opening ceremony.
 *
 * @returns {Object} Mystery box state and control functions
 */
export default function useQuizMysteryBox() {
  // State
  const [phase, setPhase] = useState(PHASES.HIDDEN)
  const [rewards, setRewards] = useState(null)
  const [hasBox, setHasBox] = useState(false)

  // Timer refs for cleanup
  const timersRef = useRef([])

  // Ref to track hasBox immediately (sync updates for use in same render)
  const hasBoxRef = useRef(false)

  // Ref to track current phase for immediate checking in callbacks
  const phaseRef = useRef(PHASES.HIDDEN)

  /**
   * Clear all pending timers.
   */
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((timerId) => clearTimeout(timerId))
    timersRef.current = []
  }, [])

  /**
   * Add a timer to be tracked for cleanup.
   */
  const addTimer = useCallback((callback, delay) => {
    const timerId = setTimeout(callback, delay)
    timersRef.current.push(timerId)
    return timerId
  }, [])

  /**
   * Calculate rewards based on quiz score percentage.
   *
   * @param {number} percentage - Score as percentage (0-100)
   * @param {Object} options - Optional modifiers
   * @param {boolean} options.bossVictory - Whether boss was defeated (upgrades tier)
   * @returns {Object|null} Calculated rewards or null if below threshold
   */
  const calculateRewards = useCallback((percentage, options = {}) => {
    const { bossVictory = false } = options

    // Get base tier from score
    let tier = getBoxTierFromScore(percentage)

    // No mystery box if below threshold
    if (!tier) {
      setHasBox(false)
      hasBoxRef.current = false
      setRewards(null)
      return null
    }

    // Upgrade tier if boss was defeated
    if (bossVictory) {
      tier = upgradeTier(tier)
    }

    // Calculate reward components
    const xpBonus = calculateXpBonus(tier)
    const powerUp = selectPowerUp(tier)
    const pieceRarity = selectPieceRarity(tier)

    const calculatedRewards = {
      tier,
      xpBonus,
      powerUp,
      pieceRarity,
    }

    setRewards(calculatedRewards)
    setHasBox(true)
    hasBoxRef.current = true

    return calculatedRewards
  }, [])

  /**
   * Start the opening ceremony animation sequence.
   * Progresses through phases: appearing -> shaking -> opening -> revealed
   */
  const startOpeningCeremony = useCallback(() => {
    // Do nothing if no box to open (use ref for immediate check)
    if (!hasBoxRef.current) {
      return
    }

    // Clear any existing timers
    clearAllTimers()

    // Start with appearing phase
    setPhase(PHASES.APPEARING)
    phaseRef.current = PHASES.APPEARING

    // Progress to shaking after appear delay
    addTimer(() => {
      setPhase(PHASES.SHAKING)
      phaseRef.current = PHASES.SHAKING
    }, MYSTERY_BOX_TIMING.appearDelay)

    // Progress to opening after shakes duration
    addTimer(() => {
      setPhase(PHASES.OPENING)
      phaseRef.current = PHASES.OPENING
    }, MYSTERY_BOX_TIMING.appearDelay + MYSTERY_BOX_TIMING.shakesDuration)

    // Progress to revealed after open duration
    addTimer(() => {
      setPhase(PHASES.REVEALED)
      phaseRef.current = PHASES.REVEALED
    }, MYSTERY_BOX_TIMING.appearDelay + MYSTERY_BOX_TIMING.shakesDuration + MYSTERY_BOX_TIMING.openDuration)
  }, [clearAllTimers, addTimer])

  /**
   * Skip directly to the revealed phase.
   * Useful for impatient users or accessibility.
   */
  const skipToReveal = useCallback(() => {
    // Only skip if currently in a pre-reveal phase (use ref for immediate check)
    if (phaseRef.current === PHASES.HIDDEN || phaseRef.current === PHASES.REVEALED) {
      return
    }

    // Clear all pending timers
    clearAllTimers()

    // Jump to revealed
    setPhase(PHASES.REVEALED)
    phaseRef.current = PHASES.REVEALED
  }, [clearAllTimers])

  /**
   * Reset the mystery box state to initial values.
   * Clears all timers, rewards, and phases.
   */
  const reset = useCallback(() => {
    clearAllTimers()
    setPhase(PHASES.HIDDEN)
    phaseRef.current = PHASES.HIDDEN
    setRewards(null)
    setHasBox(false)
    hasBoxRef.current = false
  }, [clearAllTimers])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [clearAllTimers])

  // Derive isOpen from phase
  const isOpen = phase === PHASES.OPENING || phase === PHASES.REVEALED

  // Sync phase to ref whenever state changes (for edge cases where ref gets stale)
  phaseRef.current = phase

  return {
    // State - use getter to provide current ref value for synchronous access
    get phase() {
      return phaseRef.current
    },
    rewards,
    isOpen,
    hasBox,
    timing: MYSTERY_BOX_TIMING,

    // Actions
    calculateRewards,
    startOpeningCeremony,
    skipToReveal,
    reset,
  }
}
