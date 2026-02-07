/**
 * useStoryNarration - TTS narration hook for Story Studio
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
const PANEL_PAUSE_MS = 500

/**
 * Custom hook for Story Studio TTS narration
 * @returns {Object} Narration controls and state
 */
export default function useStoryNarration() {
  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Refs for persistence across renders
  const audioRef = useRef(null)
  const cacheRef = useRef(new Map()) // cacheKey -> audioUrl
  const lastRequestTimeRef = useRef(0)
  const requestIdRef = useRef(0)
  const pendingPlaybackResolveRef = useRef(null)

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

    const pendingResolve = pendingPlaybackResolveRef.current
    if (pendingResolve) {
      pendingPlaybackResolveRef.current = null
      pendingResolve(false)
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
        logger.debug('STORY_TTS', 'Audio playback ended')
      }

      audio.onerror = (event) => {
        if (requestId !== requestIdRef.current) {
          return
        }
        const errorMessage = 'Audio playback error'
        logger.error('STORY_TTS', errorMessage, { error: event })
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
        logger.error('STORY_TTS', 'Audio play() rejected', { error: err.message })
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
      logger.error('STORY_TTS', 'Failed to create Audio element', { error: playbackError.message })
      setIsPlaying(false)
      setIsLoading(false)
      return false
    }
  }, [])

  /**
   * Play audio and resolve only when playback completes or fails.
   * Used for sequential panel narration.
   *
   * @param {string} audioUrl - Data URI or URL to audio
   * @param {number} requestId - Active narration request ID
   * @returns {Promise<boolean>} True when clip fully played, false if cancelled/failed
   */
  const playAudioBlocking = useCallback((audioUrl, requestId) => {
    if (!audioUrl || requestId !== requestIdRef.current) {
      return Promise.resolve(false)
    }

    return new Promise((resolve) => {
      let settled = false
      let audio = null

      const finalize = (success) => {
        if (settled) return
        settled = true

        if (pendingPlaybackResolveRef.current === finalize) {
          pendingPlaybackResolveRef.current = null
        }

        if (audioRef.current === audio) {
          audioRef.current.onplay = null
          audioRef.current.onended = null
          audioRef.current.onerror = null
          audioRef.current = null
        }

        setIsPlaying(false)
        setIsLoading(false)
        resolve(success)
      }

      try {
        audio = new Audio(audioUrl)
        pendingPlaybackResolveRef.current = finalize
        setIsLoading(true)

        audio.onplay = () => {
          if (requestId !== requestIdRef.current) {
            finalize(false)
            return
          }
          setIsLoading(false)
          setIsPlaying(true)
        }

        audio.onended = () => {
          if (requestId !== requestIdRef.current) {
            finalize(false)
            return
          }
          logger.debug('STORY_TTS', 'Blocking audio playback ended')
          finalize(true)
        }

        audio.onerror = (event) => {
          if (requestId !== requestIdRef.current) {
            finalize(false)
            return
          }
          const errorMessage = 'Audio playback error'
          logger.error('STORY_TTS', errorMessage, { error: event })
          setError(errorMessage)
          finalize(false)
        }

        audioRef.current = audio
        audio.play().catch((err) => {
          if (requestId !== requestIdRef.current) {
            finalize(false)
            return
          }
          logger.error('STORY_TTS', 'Audio play() rejected', { error: err.message })
          finalize(false)
        })
      } catch (playbackError) {
        logger.error('STORY_TTS', 'Failed to create Audio element for blocking playback', {
          error: playbackError.message,
        })
        finalize(false)
      }
    })
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
      logger.warn('STORY_TTS', 'Invalid text provided for narration')
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
        logger.debug('STORY_TTS', 'Using cached audio', { cacheKey: effectiveCacheKey })
        return playAudio(cachedAudioUrl, requestId)
      }

      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTimeRef.current
      if (timeSinceLastRequest < RATE_LIMIT_MS) {
        const delayNeeded = RATE_LIMIT_MS - timeSinceLastRequest
        logger.debug('STORY_TTS', 'Rate limit delay', { delayMs: delayNeeded })
        await new Promise(resolve => setTimeout(resolve, delayNeeded))
      }

      if (isStale()) {
        setIsLoading(false)
        return false
      }

      setIsLoading(true)
      lastRequestTimeRef.current = Date.now()

      logger.debug('STORY_TTS', 'Fetching TTS audio', { textLength: text.length })

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
        logger.warn('STORY_TTS', errorMessage)
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
        logger.warn('STORY_TTS', errorMessage)
        setError(errorMessage)
        setIsLoading(false)
        return false
      }

      // Cache the audio URL
      cacheRef.current.set(effectiveCacheKey, data.audioUrl)
      logger.debug('STORY_TTS', 'Audio cached', { cacheKey: effectiveCacheKey })

      return playAudio(data.audioUrl, requestId)
    } catch (narrationError) {
      if (isStale()) {
        return false
      }
      const errorMessage = `Narration failed: ${narrationError.message}`
      logger.error('STORY_TTS', errorMessage, { error: narrationError.message })
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
      logger.debug('STORY_TTS', 'Already cached, skipping prefetch', { cacheKey: effectiveCacheKey })
      return true
    }

    try {
      // Rate limit check
      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTimeRef.current
      if (timeSinceLastRequest < RATE_LIMIT_MS) {
        const delayNeeded = RATE_LIMIT_MS - timeSinceLastRequest
        logger.debug('STORY_TTS', 'Prefetch rate limit delay', { delayMs: delayNeeded })
        await new Promise(resolve => setTimeout(resolve, delayNeeded))
      }

      // Fetch TTS audio
      lastRequestTimeRef.current = Date.now()

      logger.debug('STORY_TTS', 'Prefetching TTS audio', { textLength: text.length })

      const response = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        logger.warn('STORY_TTS', 'Prefetch failed', { status: response.status })
        return false
      }

      const data = await response.json()

      if (!data?.audioUrl) {
        logger.warn('STORY_TTS', 'No audio URL in prefetch response')
        return false
      }

      // Cache the audio URL
      cacheRef.current.set(effectiveCacheKey, data.audioUrl)
      logger.debug('STORY_TTS', 'Audio prefetched and cached', { cacheKey: effectiveCacheKey })
      return true
    } catch (error) {
      logger.error('STORY_TTS', 'Prefetch failed', { error: error.message })
      return false
    }
  }, [])

  /**
   * Narrate panel captions sequentially with short pauses.
   *
   * @param {string[]} captions - Ordered panel captions
   * @param {string} chapterId - Identifier used for cache keys
   * @returns {Promise<boolean>} True when finished, false if cancelled/failed
   */
  const narratePanels = useCallback(async (captions = [], chapterId = 'chapter') => {
    const normalizedCaptions = Array.isArray(captions)
      ? captions
        .filter((caption) => typeof caption === 'string' && caption.trim().length > 0)
        .map((caption) => caption.trim())
        .slice(0, 4)
      : []

    if (normalizedCaptions.length === 0) {
      return false
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const isStale = () => requestId !== requestIdRef.current

    stopCurrentAudio()
    setError(null)
    setIsPlaying(false)
    setIsLoading(false)

    for (let panelIndex = 0; panelIndex < normalizedCaptions.length; panelIndex += 1) {
      if (isStale()) {
        setIsLoading(false)
        return false
      }

      const panelText = normalizedCaptions[panelIndex]
      const cacheKey = `${chapterId}-panel-${panelIndex + 1}`
      const prefetched = await prefetch(panelText, cacheKey)

      if (isStale()) {
        setIsLoading(false)
        return false
      }

      if (!prefetched) {
        setIsLoading(false)
        return false
      }

      const audioUrl = cacheRef.current.get(cacheKey)
      if (!audioUrl) {
        setIsLoading(false)
        return false
      }

      const played = await playAudioBlocking(audioUrl, requestId)
      if (!played || isStale()) {
        setIsLoading(false)
        return false
      }

      if (panelIndex < normalizedCaptions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, PANEL_PAUSE_MS))
      }
    }

    setIsPlaying(false)
    setIsLoading(false)
    return !isStale()
  }, [playAudioBlocking, prefetch, stopCurrentAudio])

  /**
   * Cache a pre-generated audio URL directly without TTS fetch
   * @param {string} audioUrl - Pre-generated audio URL to cache
   * @param {string} cacheKey - Unique key for caching
   * @returns {boolean} True if cached successfully
   */
  const cacheAudio = useCallback((audioUrl, cacheKey) => {
    if (!audioUrl || !cacheKey) return false
    cacheRef.current.set(cacheKey, audioUrl)
    logger.debug('STORY_TTS', 'Audio URL cached directly', { cacheKey })
    return true
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
    narratePanels,
    play,
    stop,
    prefetch,
    cacheAudio,
    isPlaying,
    isLoading,
    error,
  }
}
