/**
 * useLivingWorld Hook
 *
 * Manages the Living World feature state and evolution.
 * The world evolves visually as the user learns new topics.
 *
 * Features:
 * - Fetch current world state on mount
 * - Initialize barren world for new users
 * - Evolve world when topics are learned
 * - Parse hotspots from composition map
 * - Quiz reaction system for tree animations
 *
 * API Endpoints:
 * - GET /api/world/living - Fetch current world state
 * - POST /api/world/living/initialize - Create barren world
 * - POST /api/world/living/evolve - Evolve world with new topic
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { getClientId } from '../utils/clientId'
import { calculateTreeLevel, groupTopicsByZone, getZoneForCategory } from '../components/MagicalTree/treeUtils'

/**
 * API base URL from environment
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

/**
 * Max retry attempts for transient failures
 */
const MAX_RETRIES = 2

/**
 * Delay between retry attempts (ms)
 */
const RETRY_DELAY = 1000

/**
 * Check if a status code indicates a transient error
 *
 * @param {number} status - HTTP status code
 * @returns {boolean} True if error is transient and should be retried
 */
function isTransientError(status) {
  return status >= 500 && status < 600
}

/**
 * Sleep for specified milliseconds
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Parse hotspots from world state evolutions
 *
 * The backend stores learned topics in the `evolutions` array with:
 * - topicName: string
 * - placementHint: string (e.g., "midground center")
 *
 * We generate pseudo-positions from the placement hints and distribute
 * hotspots across the canvas to avoid overlap.
 *
 * @param {Object|null} worldState - World state object
 * @returns {Array} Array of hotspot objects with x, y, topicName, layer
 */
function parseHotspots(worldState) {
  // Support legacy compositionMap.regions format
  if (worldState?.compositionMap?.regions) {
    return worldState.compositionMap.regions.map(region => ({
      x: region.x,
      y: region.y,
      topicName: region.topicName,
      layer: region.layer,
    }))
  }

  // Parse from evolutions array (new format)
  const evolutions = worldState?.evolutions
  if (!Array.isArray(evolutions) || evolutions.length === 0) {
    return []
  }

  // Distribute hotspots across the canvas based on index
  // Use a grid-like pattern with some randomness for visual interest
  return evolutions.map((evolution, index) => {
    const { topicName, placementHint } = evolution

    // Parse layer from placementHint (e.g., "midground center" -> "midground")
    const hintLower = (placementHint || '').toLowerCase()
    let layer = 'midground'
    if (hintLower.includes('foreground')) layer = 'foreground'
    else if (hintLower.includes('background')) layer = 'background'

    // Generate position based on index with some distribution
    // Use golden ratio for better distribution
    const goldenRatio = 0.618033988749895
    const baseX = ((index * goldenRatio) % 1) * 70 + 15 // 15-85% range
    const baseY = ((index * goldenRatio * 1.5) % 1) * 50 + 25 // 25-75% range

    // Add small random offset for natural feel (seeded by topic name)
    const seed = topicName ? topicName.charCodeAt(0) : index
    const offsetX = ((seed % 10) - 5) * 2
    const offsetY = (((seed * 7) % 10) - 5) * 2

    return {
      x: Math.round(Math.max(10, Math.min(90, baseX + offsetX))),
      y: Math.round(Math.max(15, Math.min(85, baseY + offsetY))),
      topicName: topicName || `Topic ${index + 1}`,
      layer,
    }
  })
}

/**
 * useLivingWorld - Hook for managing the Living World feature
 *
 * @returns {Object} Hook state and methods
 */
export default function useLivingWorld() {
  // World state from API
  const [worldState, setWorldState] = useState(null)

  // Loading state for initial fetch
  const [isLoading, setIsLoading] = useState(true)

  // Evolution in progress
  const [isEvolving, setIsEvolving] = useState(false)

  // Error state
  const [error, setError] = useState(null)

  // Quiz reaction state for tree animations
  const [pendingQuizReaction, setPendingQuizReaction] = useState(null)

  // Track if initial fetch has been done
  const initialFetchDone = useRef(false)

  /**
   * Fetch with retry logic for transient errors
   *
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @param {number} retries - Number of retries remaining
   * @returns {Promise<Response>} Fetch response
   */
  const fetchWithRetry = useCallback(async (url, options, retries = MAX_RETRIES) => {
    const response = await fetch(url, options)

    if (!response.ok && isTransientError(response.status) && retries > 0) {
      await sleep(RETRY_DELAY)
      return fetchWithRetry(url, options, retries - 1)
    }

    return response
  }, [])

  /**
   * Fetch current world state
   *
   * @returns {Promise<Object|null>} World state or null
   */
  const fetchWorldState = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const clientId = getClientId()
      const response = await fetchWithRetry(
        `${API_BASE}/api/world/living?clientId=${clientId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      // 404 is expected for new users - not an error
      if (response.status === 404) {
        setWorldState(null)
        return null
      }

      if (!response.ok) {
        throw new Error('Failed to fetch world state')
      }

      const data = await response.json()
      setWorldState(data.worldState)
      return data.worldState
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithRetry])

  /**
   * Initialize a new barren world
   *
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const initializeWorld = useCallback(async () => {
    try {
      setError(null)

      const clientId = getClientId()
      const response = await fetch(
        `${API_BASE}/api/world/living/initialize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clientId }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to initialize world')
      }

      const data = await response.json()
      setWorldState(data.worldState)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  /**
   * Evolve the world with a new topic
   *
   * @param {string} topicName - Name of the learned topic
   * @param {string} summary - Brief summary of the topic
   * @returns {Promise<{success: boolean, changesApplied?: Object, error?: string}>}
   */
  const evolveWorld = useCallback(async (topicName, summary) => {
    try {
      setIsEvolving(true)
      setError(null)

      const clientId = getClientId()
      const response = await fetch(
        `${API_BASE}/api/world/living/evolve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId,
            topicName,
            summary,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to evolve world')
      }

      const data = await response.json()
      setWorldState(data.worldState)

      return {
        success: true,
        changesApplied: data.changesApplied,
      }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setIsEvolving(false)
    }
  }, [])

  /**
   * Trigger a quiz reaction on the tree
   *
   * Creates a reaction object with type, options, and timestamp.
   * The reaction is stored in pendingQuizReaction state for the
   * TreeQuizReaction component to display.
   *
   * @param {string} type - Reaction type ('pass' | 'perfect' | 'boss_victory' | 'streak' | 'fail')
   * @param {Object} options - Additional options (score, topicName, streakCount)
   */
  const triggerQuizReaction = useCallback((type, options = {}) => {
    setPendingQuizReaction({
      type,
      ...options,
      timestamp: Date.now(),
    })
  }, [])

  /**
   * Clear the pending quiz reaction
   *
   * Called when the reaction animation completes or needs to be dismissed.
   */
  const clearQuizReaction = useCallback(() => {
    setPendingQuizReaction(null)
  }, [])

  /**
   * Reset the living world back to an uninitialized state
   *
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const resetWorld = useCallback(async () => {
    try {
      setError(null)

      const clientId = getClientId()
      const response = await fetch(
        `${API_BASE}/api/world/living/reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clientId }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to reset living world')
      }

      setWorldState(null)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  // Fetch world state on mount
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true
      fetchWorldState()
    }
  }, [fetchWorldState])

  // Derived state
  // Backend uses `worldImageUrl` (WB023). Keep `imageUrl` as a legacy fallback.
  const worldImageUrl = worldState?.worldImageUrl || worldState?.imageUrl || null
  const tier = worldState?.tier || null
  const hotspots = parseHotspots(worldState)

  // Tree-related derived state
  const topicsLearned = worldState?.topicsLearned || []
  const topicCount = topicsLearned.length

  // Calculate tree level from topic count
  const treeLevel = useMemo(() => {
    return calculateTreeLevel(topicCount)
  }, [topicCount])

  // Convert evolutions to topics with zone for tree branches
  const branches = useMemo(() => {
    const evolutions = worldState?.evolutions || []

    // Convert evolutions to topic format for groupTopicsByZone
    const topics = evolutions.map((evolution, index) => ({
      id: `topic-${index}`,
      name: evolution.topicName,
      topicName: evolution.topicName,
      category: evolution.category || 'general',
      earnedAt: evolution.timestamp || new Date().toISOString(),
    }))

    return groupTopicsByZone(topics)
  }, [worldState?.evolutions])

  return {
    // State
    worldState,
    worldImageUrl,
    isLoading,
    isEvolving,
    tier,
    hotspots,
    error,

    // Tree-specific state
    treeLevel,
    branches,
    topicCount,
    topicsLearned,

    // Quiz reaction state
    pendingQuizReaction,

    // Actions
    evolveWorld,
    initializeWorld,
    resetWorld,

    // Quiz reaction actions
    triggerQuizReaction,
    clearQuizReaction,
  }
}
