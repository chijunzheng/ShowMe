/**
 * useEvolution Hook
 * WB020: Manages piece evolution system for world builder gamification
 *
 * This hook handles:
 * - Checking for piece evolutions when new pieces are added
 * - Managing evolution celebration queue
 * - Processing evolution animations sequentially
 * - Updating piece tiers in world state
 *
 * Evolution Tiers:
 * - Seedling (1 topic): Basic piece, no animation
 * - Growing (3+ related): Breathing animation
 * - Flourishing (5+ related): Sway animation + particles
 * - Legendary (10+ related): Full animation + golden glow
 */

import { useState, useCallback, useRef } from 'react'
import { getClientId } from '../utils/clientId'

/**
 * API base URL from environment
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

/**
 * Evolution tier thresholds
 * Number of related topics needed to reach each tier
 */
const TIER_THRESHOLDS = {
  legendary: 10,
  flourishing: 5,
  growing: 3,
  seedling: 1,
}

/**
 * Tier progression order (lowest to highest)
 */
const TIER_ORDER = ['seedling', 'growing', 'flourishing', 'legendary']

/**
 * Determine tier based on related topic count
 *
 * @param {number} relatedCount - Number of related topics learned
 * @returns {string} Tier name (seedling, growing, flourishing, legendary)
 */
function determineTier(relatedCount) {
  if (relatedCount >= TIER_THRESHOLDS.legendary) return 'legendary'
  if (relatedCount >= TIER_THRESHOLDS.flourishing) return 'flourishing'
  if (relatedCount >= TIER_THRESHOLDS.growing) return 'growing'
  return 'seedling'
}

/**
 * Check if a tier change represents an evolution (tier went up)
 *
 * @param {string} oldTier - Previous tier
 * @param {string} newTier - New tier
 * @returns {boolean} True if piece evolved to a higher tier
 */
function isEvolution(oldTier, newTier) {
  const oldIndex = TIER_ORDER.indexOf(oldTier || 'seedling')
  const newIndex = TIER_ORDER.indexOf(newTier || 'seedling')
  return newIndex > oldIndex
}

/**
 * useEvolution - Hook for managing piece evolution system
 *
 * @returns {Object} Hook state and methods
 * @property {Array} evolutionQueue - Queue of pending evolutions
 * @property {Object|null} currentEvolution - Currently displaying evolution
 * @property {boolean} isChecking - Whether evolution check is in progress
 * @property {Function} checkEvolutions - Check for evolutions after adding a piece
 * @property {Function} processNextEvolution - Process next evolution in queue
 * @property {Function} clearEvolutions - Clear all pending evolutions
 */
export default function useEvolution() {
  // Queue of pending evolutions to celebrate
  const [evolutionQueue, setEvolutionQueue] = useState([])

  // Currently displaying evolution celebration
  const [currentEvolution, setCurrentEvolution] = useState(null)

  // Whether an evolution check is in progress
  const [isChecking, setIsChecking] = useState(false)

  // Ref to prevent duplicate checks
  const checkInProgressRef = useRef(false)

  /**
   * Check for piece evolutions after adding a new piece
   * Calls the backend API to determine if any pieces evolved
   *
   * @param {Object} newPiece - The newly added piece
   * @param {string} newPiece.id - Piece ID
   * @param {string} newPiece.name - Piece name
   * @param {string} newPiece.zone - Piece zone
   * @param {string} [newPiece.category] - Piece category for grouping
   * @returns {Promise<Object>} Evolution check result
   */
  const checkEvolutions = useCallback(async (newPiece) => {
    // Prevent duplicate checks
    if (checkInProgressRef.current) {
      console.warn('Evolution check already in progress')
      return { evolutions: [] }
    }

    if (!newPiece) {
      console.error('New piece required for evolution check')
      return { evolutions: [] }
    }

    try {
      checkInProgressRef.current = true
      setIsChecking(true)

      const response = await fetch(`${API_BASE}/api/world/check-evolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: getClientId(),
          newPiece,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to check evolutions')
      }

      const data = await response.json()

      // Process evolutions if any were found
      if (data.evolutions && data.evolutions.length > 0) {
        // Filter to only actual evolutions (tier increased)
        const validEvolutions = data.evolutions.filter((evo) =>
          isEvolution(evo.oldTier, evo.newTier)
        )

        if (validEvolutions.length > 0) {
          // Add evolutions to queue
          setEvolutionQueue((prev) => [...prev, ...validEvolutions])

          // If no current evolution, start processing
          if (!currentEvolution) {
            setCurrentEvolution(validEvolutions[0])
            setEvolutionQueue((prev) => prev.slice(1))
          }
        }

        return { evolutions: validEvolutions }
      }

      return { evolutions: [] }
    } catch (error) {
      console.error('Error checking evolutions:', error.message)
      return { evolutions: [], error: error.message }
    } finally {
      setIsChecking(false)
      checkInProgressRef.current = false
    }
  }, [currentEvolution])

  /**
   * Process the next evolution in the queue
   * Should be called after the current evolution celebration is dismissed
   */
  const processNextEvolution = useCallback(() => {
    if (evolutionQueue.length > 0) {
      // Move first item from queue to current
      setCurrentEvolution(evolutionQueue[0])
      setEvolutionQueue((prev) => prev.slice(1))
    } else {
      // No more evolutions, clear current
      setCurrentEvolution(null)
    }
  }, [evolutionQueue])

  /**
   * Clear all pending evolutions
   * Useful for cleanup or when user navigates away
   */
  const clearEvolutions = useCallback(() => {
    setEvolutionQueue([])
    setCurrentEvolution(null)
  }, [])

  /**
   * Manually trigger an evolution celebration
   * Useful for testing or offline mode
   *
   * @param {Object} evolution - Evolution data
   * @param {Object} evolution.piece - The piece that evolved
   * @param {string} evolution.oldTier - Previous tier
   * @param {string} evolution.newTier - New tier
   */
  const triggerEvolution = useCallback((evolution) => {
    if (!evolution || !evolution.piece || !evolution.newTier) {
      console.error('Invalid evolution data')
      return
    }

    if (currentEvolution) {
      // Add to queue if already showing an evolution
      setEvolutionQueue((prev) => [...prev, evolution])
    } else {
      // Show immediately if no current evolution
      setCurrentEvolution(evolution)
    }
  }, [currentEvolution])

  /**
   * Check if there are pending evolutions
   *
   * @returns {boolean} True if there are evolutions to show
   */
  const hasPendingEvolutions = useCallback(() => {
    return currentEvolution !== null || evolutionQueue.length > 0
  }, [currentEvolution, evolutionQueue])

  /**
   * Get count of pending evolutions (including current)
   *
   * @returns {number} Total pending evolutions
   */
  const getPendingCount = useCallback(() => {
    return (currentEvolution ? 1 : 0) + evolutionQueue.length
  }, [currentEvolution, evolutionQueue])

  return {
    // State
    evolutionQueue,
    currentEvolution,
    isChecking,

    // Actions
    checkEvolutions,
    processNextEvolution,
    clearEvolutions,
    triggerEvolution,

    // Utilities
    hasPendingEvolutions,
    getPendingCount,
  }
}

// Export utility functions for testing and external use
export { determineTier, isEvolution, TIER_THRESHOLDS, TIER_ORDER }
