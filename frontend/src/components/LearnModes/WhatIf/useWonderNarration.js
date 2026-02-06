/**
 * useWonderNarration - TTS narration hook for Wonder Lab
 *
 * Provides narration functionality with caching and rate limiting.
 * Manages audio playback lifecycle and prefetching.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import logger from '../../../utils/logger'

// API configuration
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'
const TTS_ENDPOINT = `${API_BASE}/api/voice/speak`
const RATE_LIMIT_MS = 3000 // Minimum 3 seconds between API calls

/**
 * Custom hook for Wonder Lab TTS narration
 * @returns {Object} Narration controls and state
 */
export default function useWonderNarration() {
  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Refs for persistence across renders
  const audioRef = useRef(null)
  const cacheRef = useRef(new Map()) // cacheKey -> audioUrl
  const lastRequestTimeRef = useRef(0)
  const requestIdRef = useRef(0)

  /**
   * Stop and clear the active audio element without touching request IDs.
   */
  const stopCurrentAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      // Clear event listeners to prevent memory leak
      audioRef.current.onplay = null
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current = null
    }
  }, [])

  /**
   * Play audio from URL using Audio element.
   * requestId ensures stale async operations cannot start playback.
   * @param {string} audioUrl - Data URI or URL to audio
   * @param {number} requestId - Active narration request ID
   * @returns {boolean} True if playback attempt started
   */
  const playAudio = useCallback((audioUrl, requestId) => {
    if (!audioUrl || requestId !== requestIdRef.current) {
      return false
    }

    try {
      const audio = new Audio(audioUrl)
      setIsLoading(true)

      audio.onplay = () => {
        if (requestId !== requestIdRef.current) {
          return
        }
        setIsLoading(false)
        setIsPlaying(true)
      }

      audio.onended = () => {
        if (requestId !== requestIdRef.current) {
          return
        }
        setIsPlaying(false)
        setIsLoading(false)
        if (audioRef.current === audio) {
          audioRef.current = null
        }
        logger.debug('WONDER_TTS', 'Audio playback ended')
      }

      audio.onerror = (event) => {
        if (requestId !== requestIdRef.current) {
          return
        }
        const errorMessage = 'Audio playback error'
        logger.error('WONDER_TTS', errorMessage, { error: event })
        setError(errorMessage)
        setIsPlaying(false)
        setIsLoading(false)
        if (audioRef.current === audio) {
          audioRef.current = null
        }
      }

      audioRef.current = audio
      audio.play().catch((err) => {
        if (requestId !== requestIdRef.current) {
          return
        }
        logger.error('WONDER_TTS', 'Audio play() rejected', { error: err.message })
        setIsPlaying(false)
        setIsLoading(false)
        if (audioRef.current === audio) {
          audioRef.current = null
        }
      })
      return true
    } catch (playbackError) {
      if (requestId !== requestIdRef.current) {
        return false
      }
      logger.error('WONDER_TTS', 'Failed to create Audio element', { error: playbackError.message })
      setIsPlaying(false)
      setIsLoading(false)
      return false
    }
  }, [])

  /**
   * Stop current playback and cancel in-flight narration.
   */
  const stop = useCallback(() => {
    requestIdRef.current += 1
    stopCurrentAudio()
    setIsPlaying(false)
    setIsLoading(false)
  }, [stopCurrentAudio])

  /**
   * Play TTS audio with caching and rate limiting.
   * @param {string} text - Text to narrate
   * @param {string} cacheKey - Unique key for caching (optional)
   * @returns {Promise<boolean>} True if narration started successfully
   */
  const narrate = useCallback(async (text, cacheKey = null) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      logger.warn('WONDER_TTS', 'Invalid text provided for narration')
      return false
    }

    // New request invalidates any in-flight async narration.
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const isStale = () => requestId !== requestIdRef.current

    stopCurrentAudio()
    setIsPlaying(false)
    setError(null)
    setIsLoading(true)

    const effectiveCacheKey = cacheKey || text

    try {
      const cachedAudioUrl = cacheRef.current.get(effectiveCacheKey)
      if (cachedAudioUrl) {
        logger.debug('WONDER_TTS', 'Using cached audio', { cacheKey: effectiveCacheKey })
        return playAudio(cachedAudioUrl, requestId)
      }

      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTimeRef.current
      if (timeSinceLastRequest < RATE_LIMIT_MS) {
        const delayNeeded = RATE_LIMIT_MS - timeSinceLastRequest
        logger.debug('WONDER_TTS', 'Rate limit delay', { delayMs: delayNeeded })
        await new Promise(resolve => setTimeout(resolve, delayNeeded))
      }

      if (isStale()) {
        setIsLoading(false)
        return false
      }

      setIsLoading(true)
      lastRequestTimeRef.current = Date.now()

      logger.debug('WONDER_TTS', 'Fetching TTS audio', { textLength: text.length })

      const response = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (isStale()) {
        setIsLoading(false)
        return false
      }

      if (!response.ok) {
        const errorMessage = response.status === 429
          ? 'Rate limited by server'
          : `TTS request failed with status ${response.status}`
        logger.warn('WONDER_TTS', errorMessage)
        setError(errorMessage)
        setIsLoading(false)
        return false
      }

      const data = await response.json()

      if (isStale()) {
        setIsLoading(false)
        return false
      }

      if (!data?.audioUrl) {
        const errorMessage = 'No audio URL in response'
        logger.warn('WONDER_TTS', errorMessage)
        setError(errorMessage)
        setIsLoading(false)
        return false
      }

      // Cache the audio URL
      cacheRef.current.set(effectiveCacheKey, data.audioUrl)
      logger.debug('WONDER_TTS', 'Audio cached', { cacheKey: effectiveCacheKey })

      return playAudio(data.audioUrl, requestId)
    } catch (narrationError) {
      if (isStale()) {
        return false
      }
      const errorMessage = `Narration failed: ${narrationError.message}`
      logger.error('WONDER_TTS', errorMessage, { error: narrationError.message })
      setError(errorMessage)
      setIsLoading(false)
      return false
    }
  }, [playAudio, stopCurrentAudio])

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
      logger.debug('WONDER_TTS', 'Already cached, skipping prefetch', { cacheKey: effectiveCacheKey })
      return true
    }

    try {
      // Rate limit check
      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTimeRef.current
      if (timeSinceLastRequest < RATE_LIMIT_MS) {
        const delayNeeded = RATE_LIMIT_MS - timeSinceLastRequest
        logger.debug('WONDER_TTS', 'Prefetch rate limit delay', { delayMs: delayNeeded })
        await new Promise(resolve => setTimeout(resolve, delayNeeded))
      }

      // Fetch TTS audio
      lastRequestTimeRef.current = Date.now()

      logger.debug('WONDER_TTS', 'Prefetching TTS audio', { textLength: text.length })

      const response = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        logger.warn('WONDER_TTS', 'Prefetch failed', { status: response.status })
        return false
      }

      const data = await response.json()

      if (!data?.audioUrl) {
        logger.warn('WONDER_TTS', 'No audio URL in prefetch response')
        return false
      }

      // Cache the audio URL
      cacheRef.current.set(effectiveCacheKey, data.audioUrl)
      logger.debug('WONDER_TTS', 'Audio prefetched and cached', { cacheKey: effectiveCacheKey })
      return true
    } catch (error) {
      logger.error('WONDER_TTS', 'Prefetch failed', { error: error.message })
      return false
    }
  }, [])

  /**
   * Play a pre-generated audio URL directly (no TTS fetch)
   * @param {string} audioUrl - Data URI or URL to audio
   * @returns {boolean} True if playback started
   */
  const play = useCallback((audioUrl) => {
    if (!audioUrl) return false
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    stopCurrentAudio()
    setIsPlaying(false)
    setIsLoading(false)
    setError(null)
    return playAudio(audioUrl, requestId)
  }, [playAudio, stopCurrentAudio])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
      // Keep cache for session - don't clear it
    }
  }, [stop])

  return {
    narrate,
    play,
    stop,
    prefetch,
    isPlaying,
    isLoading,
    error,
  }
}
