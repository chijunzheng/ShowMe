/**
 * Custom hook for slide audio/TTS functionality
 * Handles TTS requests, caching, prefetching, and rate limiting
 */
import { useRef, useCallback } from 'react'
import logger from '../utils/logger.js'
import { TTS_PREFETCH_CONFIG, SLIDE_TIMING } from '../constants/appConfig.js'

const DEFAULT_SLIDE_DURATION = SLIDE_TIMING.DEFAULT_DURATION_MS

/**
 * Hook for managing slide audio (TTS narration)
 * @param {Object} options - Configuration options
 * @param {Function} options.onPersistSlideAudio - Callback to persist audio URL to slide
 * @returns {Object} Slide audio state and controls
 */
export default function useSlideAudio({ onPersistSlideAudio } = {}) {
  // Audio caching refs
  const slideAudioCacheRef = useRef(new Map())
  const slideAudioRequestRef = useRef(new Map())
  const slideAudioFailureRef = useRef(new Set())

  // Rate limiting refs
  const ttsRateLimitUntilRef = useRef(0)
  const lastTtsRequestTimeRef = useRef(0)

  // Prefetch tracking
  const ttsPrefetchBatchRef = useRef(0)

  // Callback ref for persistence
  const onPersistSlideAudioRef = useRef(onPersistSlideAudio)
  onPersistSlideAudioRef.current = onPersistSlideAudio

  /**
   * Get cached audio for a slide
   * @param {string} slideId - The slide ID
   * @returns {Object|null} Cached audio payload or null
   */
  const getCachedSlideAudio = useCallback((slideId) => {
    if (!slideId) return null
    return slideAudioCacheRef.current.get(slideId) || null
  }, [])

  /**
   * Request TTS audio for a slide
   * @param {Object} slide - The slide to get audio for
   * @returns {Promise<Object|null>} Audio payload or null
   */
  const requestSlideAudio = useCallback(async (slide) => {
    if (!slide || slide.type === 'header') return null
    if (!slide.subtitle || typeof slide.subtitle !== 'string') return null
    if (slideAudioFailureRef.current.has(slide.id)) return null

    // Check cache first
    const cached = getCachedSlideAudio(slide.id)
    if (cached) return cached

    // Check if slide already has persisted audioUrl
    if (slide.audioUrl && typeof slide.audioUrl === 'string' && slide.audioUrl.startsWith('data:')) {
      const persistedPayload = { audioUrl: slide.audioUrl, duration: slide.duration || DEFAULT_SLIDE_DURATION }
      slideAudioCacheRef.current.set(slide.id, persistedPayload)
      logger.debug('AUDIO', 'Using persisted audioUrl from slide', { slideId: slide.id })
      return persistedPayload
    }

    // Check if request is already in flight
    const inFlight = slideAudioRequestRef.current.get(slide.id)
    if (inFlight) return inFlight

    // Check rate limit backoff
    const now = Date.now()
    if (now < ttsRateLimitUntilRef.current) {
      logger.debug('AUDIO', 'Skipping TTS request due to rate limit backoff', {
        slideId: slide.id,
        retryAfter: Math.ceil((ttsRateLimitUntilRef.current - now) / 1000),
      })
      return null
    }

    // Enforce minimum interval between requests
    const timeSinceLastRequest = now - lastTtsRequestTimeRef.current
    if (timeSinceLastRequest < TTS_PREFETCH_CONFIG.MIN_REQUEST_INTERVAL_MS) {
      logger.debug('AUDIO', 'Skipping TTS request - too soon after last request', {
        slideId: slide.id,
        waitMs: TTS_PREFETCH_CONFIG.MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest,
      })
      return null
    }

    // Update last request time before making request
    lastTtsRequestTimeRef.current = now

    const requestPromise = (async () => {
      try {
        const response = await fetch('/api/voice/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: slide.subtitle }),
        })

        // Handle rate limiting
        if (response.status === 429) {
          ttsRateLimitUntilRef.current = Date.now() + TTS_PREFETCH_CONFIG.RATE_LIMIT_BACKOFF_MS
          logger.warn('AUDIO', 'TTS rate limited, backing off', {
            slideId: slide.id,
            backoffMs: TTS_PREFETCH_CONFIG.RATE_LIMIT_BACKOFF_MS,
          })
          return null
        }

        if (!response.ok) {
          slideAudioFailureRef.current.add(slide.id)
          logger.warn('AUDIO', 'Slide narration TTS request failed', {
            status: response.status,
            slideId: slide.id,
          })
          return null
        }

        const data = await response.json()
        if (!data?.audioUrl) {
          if (data?.error?.includes('Rate limit') || data?.error?.includes('rate')) {
            ttsRateLimitUntilRef.current = Date.now() + TTS_PREFETCH_CONFIG.RATE_LIMIT_BACKOFF_MS
            logger.warn('AUDIO', 'TTS upstream rate limited, backing off', { slideId: slide.id })
            return null
          }
          slideAudioFailureRef.current.add(slide.id)
          return null
        }

        const duration = Number.isFinite(data.duration) && data.duration > 0
          ? data.duration
          : (slide.duration || DEFAULT_SLIDE_DURATION)
        const audioPayload = { audioUrl: data.audioUrl, duration }
        slideAudioCacheRef.current.set(slide.id, audioPayload)

        // Persist audioUrl back to slide
        if (onPersistSlideAudioRef.current) {
          onPersistSlideAudioRef.current(slide.id, data.audioUrl, duration)
        }

        return audioPayload
      } catch (error) {
        slideAudioFailureRef.current.add(slide.id)
        logger.warn('AUDIO', 'Slide narration TTS request failed', {
          error: error.message,
          slideId: slide.id,
        })
        return null
      } finally {
        slideAudioRequestRef.current.delete(slide.id)
      }
    })()

    slideAudioRequestRef.current.set(slide.id, requestPromise)
    return requestPromise
  }, [getCachedSlideAudio])

  /**
   * Prefetch audio for a single slide (fire and forget)
   * @param {Object} slide - The slide to prefetch
   */
  const prefetchSlideAudio = useCallback((slide) => {
    if (!slide || slide.type === 'header') return
    if (slideAudioFailureRef.current.has(slide.id)) return
    if (slideAudioCacheRef.current.has(slide.id)) return
    void requestSlideAudio(slide)
  }, [requestSlideAudio])

  /**
   * Prefetch audio for a batch of slides with rate limiting
   * @param {Array} slides - Array of slides to prefetch
   */
  const prefetchSlideNarrationBatch = useCallback((slides = []) => {
    if (!Array.isArray(slides) || slides.length === 0) return

    const batchId = Date.now()
    ttsPrefetchBatchRef.current = batchId

    const queue = slides.filter((slide) =>
      slide &&
      slide.type !== 'header' &&
      slide.type !== 'suggestions' &&
      typeof slide.subtitle === 'string' &&
      slide.subtitle.trim().length > 0
    )

    let index = 0
    let inFlight = 0

    const pump = () => {
      if (ttsPrefetchBatchRef.current !== batchId) return

      while (inFlight < TTS_PREFETCH_CONFIG.MAX_CONCURRENCY && index < queue.length) {
        const slide = queue[index++]
        if (!slide || slideAudioFailureRef.current.has(slide.id)) continue
        if (getCachedSlideAudio(slide.id)) continue
        if (slideAudioRequestRef.current.has(slide.id)) continue

        inFlight += 1
        requestSlideAudio(slide)
          .finally(() => {
            inFlight -= 1
            if (ttsPrefetchBatchRef.current !== batchId) return
            if (index < queue.length || inFlight > 0) {
              setTimeout(pump, TTS_PREFETCH_CONFIG.DELAY_MS)
            }
          })
      }
    }

    pump()
  }, [getCachedSlideAudio, requestSlideAudio])

  /**
   * Get the duration for a slide (from cache or default)
   * @param {Object} slide - The slide
   * @returns {number} Duration in milliseconds
   */
  const getSlideDuration = useCallback((slide) => {
    if (!slide) return DEFAULT_SLIDE_DURATION
    const cached = getCachedSlideAudio(slide.id)
    return cached?.duration || slide.duration || DEFAULT_SLIDE_DURATION
  }, [getCachedSlideAudio])

  /**
   * Check if a slide's audio has failed to load
   * @param {string} slideId - The slide ID
   * @returns {boolean} True if audio failed
   */
  const hasSlideAudioFailed = useCallback((slideId) => {
    return slideAudioFailureRef.current.has(slideId)
  }, [])

  /**
   * Get retry delay for rate limiting
   * @returns {number} Delay in milliseconds before next request can be made
   */
  const getRetryDelayMs = useCallback(() => {
    const now = Date.now()
    const backoffRemaining = Math.max(0, ttsRateLimitUntilRef.current - now)
    const minIntervalRemaining = Math.max(
      0,
      TTS_PREFETCH_CONFIG.MIN_REQUEST_INTERVAL_MS - (now - lastTtsRequestTimeRef.current)
    )
    return Math.max(backoffRemaining, minIntervalRemaining)
  }, [])

  /**
   * Clear the prefetch batch (cancels pending prefetches)
   */
  const cancelPrefetchBatch = useCallback(() => {
    ttsPrefetchBatchRef.current = 0
  }, [])

  return {
    // Functions
    requestSlideAudio,
    prefetchSlideAudio,
    prefetchSlideNarrationBatch,
    getCachedSlideAudio,
    getSlideDuration,
    hasSlideAudioFailed,
    getRetryDelayMs,
    cancelPrefetchBatch,

    // Refs for direct access (needed for playback logic)
    slideAudioCacheRef,
    slideAudioFailureRef,
    ttsRateLimitUntilRef,
    lastTtsRequestTimeRef,
  }
}
