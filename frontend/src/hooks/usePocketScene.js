/**
 * usePocketScene Hook
 * WB019: Manages pocket connection scene generation and state
 *
 * This hook handles:
 * - Generating unique scene images when pieces form pocket portals
 * - Tracking generation state and errors
 * - Determining when scenes should be regenerated (evolution thresholds)
 * - Caching scene data in local state
 *
 * Scene Generation Thresholds:
 * - Initial scene: 3 pieces (pocket forms)
 * - Enhanced scene: 5 pieces (first evolution)
 * - Legendary scene: 7 pieces (second evolution)
 */

import { useState, useCallback, useRef } from 'react'
import { getClientId } from '../utils/clientId'

/**
 * API base URL from environment
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

/**
 * Piece count thresholds that trigger scene regeneration
 * Each threshold represents an evolution milestone
 */
const SCENE_THRESHOLDS = [3, 5, 7]

/**
 * Evolution level based on piece count
 */
const EVOLUTION_LEVELS = {
  3: 'initial',
  5: 'enhanced',
  7: 'legendary',
}

/**
 * Get evolution level for a given piece count
 *
 * @param {number} pieceCount - Number of pieces in pocket
 * @returns {string} Evolution level
 */
function getEvolutionLevel(pieceCount) {
  if (pieceCount >= 7) return 'legendary'
  if (pieceCount >= 5) return 'enhanced'
  return 'initial'
}

/**
 * usePocketScene - Hook for managing pocket connection scene generation
 *
 * @returns {Object} Hook state and methods
 */
export default function usePocketScene() {
  // Generation state
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  // Track which pockets are currently generating
  const generatingPocketsRef = useRef(new Set())

  // Cache of generated scenes by pocket ID
  const [sceneCache, setSceneCache] = useState({})

  /**
   * Generate a connection scene for a pocket
   *
   * @param {string} pocketId - Unique identifier for the pocket
   * @param {Array} pieces - Array of pieces in the pocket
   * @param {string} category - Category of the pocket (ocean, space, etc.)
   * @param {string} zone - Zone of the pocket (nature, civilization, arcane)
   * @returns {Promise<Object|null>} Generated scene data or null on failure
   */
  const generateScene = useCallback(async (pocketId, pieces, category, zone) => {
    // Prevent duplicate generation requests
    if (generatingPocketsRef.current.has(pocketId)) {
      return null
    }

    // Validate inputs
    if (!pocketId || !pieces || pieces.length < 3) {
      console.warn('[usePocketScene] Invalid inputs for scene generation')
      return null
    }

    try {
      generatingPocketsRef.current.add(pocketId)
      setGenerating(true)
      setError(null)

      const clientId = getClientId()
      const evolutionLevel = getEvolutionLevel(pieces.length)

      // Prepare piece data for the API
      // Include piece names, images, and topics for scene context
      const pieceData = pieces.map(piece => ({
        id: piece.id,
        name: piece.name || piece.topicName,
        imageUrl: piece.imageUrl,
        icon: piece.icon,
      }))

      const response = await fetch(`${API_BASE}/api/world/pocket/generate-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          pocketId,
          pocket: {
            zone,
            pieces: pieceData,
            category,
          },
          forceRegenerate: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate scene')
      }

      const data = await response.json()

      if (!data.scene || !data.scene.imageUrl) {
        throw new Error('Scene generation returned invalid data')
      }

      // Create scene object with metadata
      const sceneData = {
        imageUrl: data.scene.imageUrl,
        generatedAt: new Date().toISOString(),
        evolutionLevel,
        pieceCountAtGeneration: pieces.length,
        pocketId,
        category,
      }

      // Update cache
      setSceneCache(prev => ({
        ...prev,
        [pocketId]: sceneData,
      }))

      return sceneData
    } catch (err) {
      console.error('[usePocketScene] Error generating scene:', err.message)
      setError(err.message)
      return null
    } finally {
      generatingPocketsRef.current.delete(pocketId)
      setGenerating(false)
    }
  }, [])

  /**
   * Check if a pocket's scene should be regenerated
   *
   * Regeneration triggers:
   * 1. Pocket has no scene and has 3+ pieces
   * 2. Pocket crosses a threshold (3 -> 5 -> 7)
   *
   * @param {Object} pocket - Pocket data
   * @param {Array} pocket.pieces - Pieces in the pocket
   * @param {Object} [pocket.connectionScene] - Existing scene data
   * @returns {boolean} True if scene should be regenerated
   */
  const shouldRegenerateScene = useCallback((pocket) => {
    if (!pocket || !pocket.pieces) {
      return false
    }

    const currentCount = pocket.pieces.length

    // No scene yet - should generate if threshold met
    if (!pocket.connectionScene) {
      return currentCount >= SCENE_THRESHOLDS[0]
    }

    // Check if we've crossed a threshold since last generation
    const prevCount = pocket.connectionScene.pieceCountAtGeneration || 0

    // Find if we've crossed any threshold
    return SCENE_THRESHOLDS.some(threshold =>
      currentCount >= threshold && prevCount < threshold
    )
  }, [])

  /**
   * Get the next evolution threshold for a pocket
   *
   * @param {number} currentCount - Current piece count
   * @returns {number|null} Next threshold or null if at max
   */
  const getNextThreshold = useCallback((currentCount) => {
    for (const threshold of SCENE_THRESHOLDS) {
      if (currentCount < threshold) {
        return threshold
      }
    }
    return null // Already at max evolution
  }, [])

  /**
   * Get pieces needed until next scene evolution
   *
   * @param {number} currentCount - Current piece count
   * @returns {number} Pieces needed (0 if at max)
   */
  const getPiecesUntilNextEvolution = useCallback((currentCount) => {
    const nextThreshold = getNextThreshold(currentCount)
    if (!nextThreshold) return 0
    return nextThreshold - currentCount
  }, [getNextThreshold])

  /**
   * Check if a pocket is currently generating
   *
   * @param {string} pocketId - Pocket ID to check
   * @returns {boolean} True if generating
   */
  const isGeneratingPocket = useCallback((pocketId) => {
    return generatingPocketsRef.current.has(pocketId)
  }, [])

  /**
   * Get cached scene for a pocket
   *
   * @param {string} pocketId - Pocket ID
   * @returns {Object|null} Cached scene or null
   */
  const getCachedScene = useCallback((pocketId) => {
    return sceneCache[pocketId] || null
  }, [sceneCache])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Clear all cached scenes (useful for testing)
   */
  const clearCache = useCallback(() => {
    setSceneCache({})
  }, [])

  return {
    // State
    generating,
    error,
    sceneCache,

    // Actions
    generateScene,
    shouldRegenerateScene,
    getNextThreshold,
    getPiecesUntilNextEvolution,
    isGeneratingPocket,
    getCachedScene,
    clearError,
    clearCache,

    // Constants (exported for external use)
    SCENE_THRESHOLDS,
    getEvolutionLevel,
  }
}

// Export thresholds and utility functions for use in other components
export { SCENE_THRESHOLDS, EVOLUTION_LEVELS, getEvolutionLevel }
