/**
 * useSuggestions Hook
 *
 * Fetches personalized topic suggestions based on the user's learning progress.
 * Suggestions are tailored to:
 * - Fill gaps in unexplored zones
 * - Build on existing knowledge clusters
 * - Match the current season/theme
 *
 * API Endpoint:
 * - POST /api/world/suggestions - Get personalized topic suggestions
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { getClientId } from '../utils/clientId'
import { toApiUrl } from '../utils/api'

/**
 * Extract learned topics from pieces array
 *
 * @param {Array} pieces - Array of world pieces
 * @returns {Array<string>} Array of topic names
 */
function extractLearnedTopics(pieces) {
  if (!Array.isArray(pieces) || pieces.length === 0) {
    return []
  }
  return pieces.map(piece => piece.topicName || piece.name).filter(Boolean)
}

/**
 * Count pieces per zone
 *
 * @param {Array} pieces - Array of world pieces
 * @returns {Object} Zone counts { nature: N, civilization: N, arcane: N }
 */
function countZones(pieces) {
  const counts = {
    nature: 0,
    civilization: 0,
    arcane: 0,
  }

  if (!Array.isArray(pieces)) {
    return counts
  }

  pieces.forEach(piece => {
    const zone = piece.zone?.toLowerCase()
    if (zone && Object.prototype.hasOwnProperty.call(counts, zone)) {
      counts[zone] += 1
    }
  })

  return counts
}

/**
 * Create a stable hash of pieces for change detection
 *
 * @param {Array} pieces - Array of world pieces
 * @returns {string} Hash string representing pieces state
 */
function createPiecesHash(pieces) {
  if (!Array.isArray(pieces) || pieces.length === 0) {
    return 'empty'
  }
  // Include zone and topicName so metadata changes invalidate the cache
  const entries = pieces.map(p => {
    const id = p.id || p.topicName || p.name
    const zone = p.zone || ''
    const topic = p.topicName || p.name || ''
    return `${id}:${zone}:${topic}`
  }).sort().join(',')
  return `${pieces.length}:${entries}`
}

/**
 * useSuggestions - Hook for fetching personalized topic suggestions
 *
 * @param {Object} options - Hook options
 * @param {Array} options.pieces - Array of world pieces (learning progress)
 * @param {number} options.limit - Maximum number of suggestions to fetch
 * @param {boolean} options.autoFetch - Whether to fetch on mount/changes
 * @returns {Object} Hook state and methods
 */
export default function useSuggestions({ pieces = [], limit = 5, autoFetch = true } = {}) {
  // Suggestions returned from API
  const [suggestions, setSuggestions] = useState([])

  // Metadata about suggestions (season, weakest zone, etc.)
  const [meta, setMeta] = useState(null)

  // Loading state
  const [isLoading, setIsLoading] = useState(false)

  // Error state
  const [error, setError] = useState(null)

  // Track if initial fetch has been done
  const initialFetchDone = useRef(false)

  // Track the last pieces hash to detect changes
  const lastPiecesHashRef = useRef(null)

  // Memoize pieces hash to detect actual changes
  const piecesHash = useMemo(() => createPiecesHash(pieces), [pieces])

  // Memoize request data to avoid recalculating on each render
  const requestData = useMemo(() => ({
    learnedTopics: extractLearnedTopics(pieces),
    zones: countZones(pieces),
  }), [pieces])

  /**
   * Fetch suggestions from the API
   *
   * @returns {Promise<Object|null>} Suggestions data or null on failure
   */
  const fetchSuggestions = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const clientId = getClientId()
      const response = await fetch(toApiUrl('/api/world/suggestions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          learnedTopics: requestData.learnedTopics,
          zones: requestData.zones,
          limit,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions')
      }

      const data = await response.json()

      // Update state with response
      setSuggestions(data.suggestions || [])
      setMeta(data.meta || null)

      // Update hash to track this fetch
      lastPiecesHashRef.current = piecesHash

      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [requestData, limit, piecesHash])

  /**
   * Manual refresh function
   * Forces a new fetch regardless of caching
   */
  const refresh = useCallback(() => {
    // Clear the hash to force refetch
    lastPiecesHashRef.current = null
    return fetchSuggestions()
  }, [fetchSuggestions])

  // Auto-fetch on mount and when pieces change
  useEffect(() => {
    if (!autoFetch) {
      return
    }

    // Skip if pieces haven't changed since last fetch
    if (lastPiecesHashRef.current === piecesHash && initialFetchDone.current) {
      return
    }

    // Mark initial fetch as done
    if (!initialFetchDone.current) {
      initialFetchDone.current = true
    }

    fetchSuggestions()
  }, [autoFetch, piecesHash, fetchSuggestions])

  return {
    // State
    suggestions,
    meta,
    isLoading,
    error,

    // Actions
    refresh,
  }
}

// Export utility functions for testing
export { extractLearnedTopics, countZones, createPiecesHash }
