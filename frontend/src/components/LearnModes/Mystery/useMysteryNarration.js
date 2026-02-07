/**
 * useMysteryNarration - TTS narration hook for Mystery Lab
 *
 * Provides narration functionality with caching and rate limiting.
 * Manages audio playback lifecycle and prefetching.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import logger from '../../../utils/logger'
import { toApiUrl } from '../../../utils/api'

// API configuration
const TTS_ENDPOINT = toApiUrl('/api/voice/speak')
const RATE_LIMIT_MS = 3000 // Minimum 3 seconds between API calls

/**
 * Custom hook for Mystery Lab TTS narration
 * @returns {Object} Narration controls and state
 */
export default function useMysteryNarration() {
  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Refs for persistence across renders
  const audioRef = useRef(null)
  const cacheRef = useRef(new Map()) // cacheKey -> audioUrl
  const lastRequestTimeRef = useRef(0)

  /**
   * Stop current playback
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      // Clear event listeners to prevent memory leak
      audioRef.current.onplay = null
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current = null
    }
    setIsPlaying(false)
  }, [])

  /**
   * Play TTS audio with caching and rate limiting
   * @param {string} text - Text to narrate
   * @param {string} cacheKey - Unique key for caching (optional)
   * @returns {Promise<boolean>} True if narration started successfully
   */
  const narrate = useCallback(async (text, cacheKey = null) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      logger.warn('MYSTERY_TTS', 'Invalid text provided for narration')
      return false
    }

    // Stop current playback first
    stop()

    // Clear any previous error
    setError(null)

    // Use text as cache key if no custom key provided
    const effectiveCacheKey = cacheKey || text

    try {
      // Check cache first
      const cachedAudioUrl = cacheRef.current.get(effectiveCacheKey)
      if (cachedAudioUrl) {
        logger.debug('MYSTERY_TTS', 'Using cached audio', { cacheKey: effectiveCacheKey })
        return playAudio(cachedAudioUrl)
      }

      // Rate limit check - enforce minimum delay between API calls
      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTimeRef.current
      if (timeSinceLastRequest < RATE_LIMIT_MS) {
        const delayNeeded = RATE_LIMIT_MS - timeSinceLastRequest
        logger.debug('MYSTERY_TTS', 'Rate limit delay', { delayMs: delayNeeded })
        await new Promise(resolve => setTimeout(resolve, delayNeeded))
      }

      // Fetch TTS audio from backend
      setIsLoading(true)
      lastRequestTimeRef.current = Date.now()

      logger.debug('MYSTERY_TTS', 'Fetching TTS audio', { textLength: text.length })

      const response = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const errorMessage = response.status === 429
          ? 'Rate limited by server'
          : `TTS request failed with status ${response.status}`
        logger.warn('MYSTERY_TTS', errorMessage)
        setError(errorMessage)
        setIsLoading(false)
        return false
      }

      const data = await response.json()

      if (!data?.audioUrl) {
        const errorMessage = 'No audio URL in response'
        logger.warn('MYSTERY_TTS', errorMessage)
        setError(errorMessage)
        setIsLoading(false)
        return false
      }

      // Cache the audio URL
      cacheRef.current.set(effectiveCacheKey, data.audioUrl)
      logger.debug('MYSTERY_TTS', 'Audio cached', { cacheKey: effectiveCacheKey })

      setIsLoading(false)
      return playAudio(data.audioUrl)
    } catch (error) {
      const errorMessage = `Narration failed: ${error.message}`
      logger.error('MYSTERY_TTS', errorMessage, { error: error.message })
      setError(errorMessage)
      setIsLoading(false)
      return false
    }
  }, [stop])

  /**
   * Play audio from URL using Audio element
   * @param {string} audioUrl - Data URI or URL to audio
   * @returns {boolean} True if playback started
   */
  const playAudio = (audioUrl) => {
    try {
      const audio = new Audio(audioUrl)

      // Set up event handlers
      audio.onplay = () => {
        setIsPlaying(true)
        logger.debug('MYSTERY_TTS', 'Audio playback started')
      }

      audio.onended = () => {
        setIsPlaying(false)
        audioRef.current = null
        logger.debug('MYSTERY_TTS', 'Audio playback ended')
      }

      audio.onerror = (error) => {
        const errorMessage = 'Audio playback error'
        logger.error('MYSTERY_TTS', errorMessage, { error })
        setError(errorMessage)
        setIsPlaying(false)
        audioRef.current = null
      }

      // Store reference and play
      audioRef.current = audio
      audio.play()
      return true
    } catch (error) {
      logger.error('MYSTERY_TTS', 'Failed to create Audio element', { error: error.message })
      return false
    }
  }

  /**
   * Prefetch TTS audio without playing
   * @param {string} text - Text to prefetch
   * @param {string} cacheKey - Unique key for caching (optional)
   * @returns {Promise<boolean>} True if prefetch successful
   */
  const prefetch = useCallback(async (text, cacheKey = null) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return false
    }

    const effectiveCacheKey = cacheKey || text

    // Skip if already cached
    if (cacheRef.current.has(effectiveCacheKey)) {
      logger.debug('MYSTERY_TTS', 'Already cached, skipping prefetch', { cacheKey: effectiveCacheKey })
      return true
    }

    try {
      // Rate limit check
      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTimeRef.current
      if (timeSinceLastRequest < RATE_LIMIT_MS) {
        const delayNeeded = RATE_LIMIT_MS - timeSinceLastRequest
        logger.debug('MYSTERY_TTS', 'Prefetch rate limit delay', { delayMs: delayNeeded })
        await new Promise(resolve => setTimeout(resolve, delayNeeded))
      }

      // Fetch TTS audio
      lastRequestTimeRef.current = Date.now()

      logger.debug('MYSTERY_TTS', 'Prefetching TTS audio', { textLength: text.length })

      const response = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        logger.warn('MYSTERY_TTS', 'Prefetch failed', { status: response.status })
        return false
      }

      const data = await response.json()

      if (!data?.audioUrl) {
        logger.warn('MYSTERY_TTS', 'No audio URL in prefetch response')
        return false
      }

      // Cache the audio URL
      cacheRef.current.set(effectiveCacheKey, data.audioUrl)
      logger.debug('MYSTERY_TTS', 'Audio prefetched and cached', { cacheKey: effectiveCacheKey })
      return true
    } catch (error) {
      logger.error('MYSTERY_TTS', 'Prefetch failed', { error: error.message })
      return false
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
      // Keep cache for session - don't clear it
    }
  }, [stop])

  return {
    narrate,
    stop,
    prefetch,
    isPlaying,
    isLoading,
    error,
  }
}
