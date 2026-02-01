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
 *
 * API Endpoints:
 * - GET /api/world/living - Fetch current world state
 * - POST /api/world/living/initialize - Create barren world
 * - POST /api/world/living/evolve - Evolve world with new topic
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { getClientId } from '../utils/clientId'

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
 * Parse hotspots from composition map
 *
 * @param {Object|null} compositionMap - World composition map
 * @returns {Array} Array of hotspot objects
 */
function parseHotspots(compositionMap) {
  if (!compositionMap || !compositionMap.regions) {
    return []
  }

  return compositionMap.regions.map(region => ({
    x: region.x,
    y: region.y,
    topicName: region.topicName,
    layer: region.layer,
  }))
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
  const hotspots = parseHotspots(worldState?.compositionMap)

  return {
    // State
    worldState,
    worldImageUrl,
    isLoading,
    isEvolving,
    tier,
    hotspots,
    error,

    // Actions
    evolveWorld,
    initializeWorld,
    resetWorld,
  }
}
