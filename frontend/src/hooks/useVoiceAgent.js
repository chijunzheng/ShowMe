/**
 * Custom hook for voice agent queue management
 * Handles queuing, TTS fetching, and sequential playback of voice agent messages
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import logger from '../utils/logger.js'
import { TTS_PREFETCH_CONFIG } from '../constants/appConfig.js'

/**
 * Hook for managing voice agent message queue with TTS
 * @param {Object} options - Configuration options
 * @param {Function} options.waitForActiveAudioToEnd - Function to wait for current audio
 * @param {Object} options.ttsRateLimitUntilRef - Ref tracking TTS rate limit backoff
 * @param {Object} options.lastTtsRequestTimeRef - Ref tracking last TTS request time
 * @returns {Object} Voice agent state and controls
 */
export default function useVoiceAgent({
  waitForActiveAudioToEnd,
  ttsRateLimitUntilRef,
  lastTtsRequestTimeRef,
} = {}) {
  // Queue state
  const [voiceAgentQueue, setVoiceAgentQueue] = useState([])
  const [isVoiceAgentSpeaking, setIsVoiceAgentSpeaking] = useState(false)

  // Refs
  const voiceAgentBusyRef = useRef(false)
  const voiceAgentAudioRef = useRef(null)
  const voiceAgentQueueRef = useRef([])
  const prefetchedTtsRef = useRef(new Map())

  // Keep ref in sync with state
  useEffect(() => {
    voiceAgentQueueRef.current = voiceAgentQueue
  }, [voiceAgentQueue])

  /**
   * Fetch TTS audio for a queue item
   * @param {Object} item - Queue item with text to synthesize
   * @returns {Promise<string|null>} Audio URL or null
   */
  const fetchTtsForItem = useCallback(async (item) => {
    // If item already has audio, return it
    if (item.audioUrl) {
      return item.audioUrl
    }

    // Check if we already pre-fetched for this item
    const prefetched = prefetchedTtsRef.current.get(item.id)
    if (prefetched) {
      return prefetched
    }

    // Check rate limit backoff
    const now = Date.now()
    if (ttsRateLimitUntilRef?.current && now < ttsRateLimitUntilRef.current) {
      logger.debug('AUDIO', 'Skipping voice agent TTS due to rate limit backoff', {
        itemId: item.id,
      })
      return null
    }

    // Enforce minimum interval between requests
    if (lastTtsRequestTimeRef?.current) {
      const timeSinceLastRequest = now - lastTtsRequestTimeRef.current
      if (timeSinceLastRequest < TTS_PREFETCH_CONFIG.MIN_REQUEST_INTERVAL_MS) {
        logger.debug('AUDIO', 'Skipping voice agent TTS - too soon after last request', {
          itemId: item.id,
        })
        return null
      }
    }

    // Update last request time before making request
    if (lastTtsRequestTimeRef) {
      lastTtsRequestTimeRef.current = now
    }

    try {
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: item.text }),
      })

      // Handle rate limiting
      if (response.status === 429) {
        if (ttsRateLimitUntilRef) {
          ttsRateLimitUntilRef.current = Date.now() + TTS_PREFETCH_CONFIG.RATE_LIMIT_BACKOFF_MS
        }
        logger.warn('AUDIO', 'Voice agent TTS rate limited, backing off', {
          itemId: item.id,
        })
        return null
      }

      if (!response.ok) {
        logger.warn('AUDIO', 'Voice agent TTS request failed', {
          status: response.status,
          itemId: item.id,
        })
        return null
      }

      const data = await response.json()
      if (!data?.audioUrl) {
        if (data?.error?.includes('Rate limit') || data?.error?.includes('rate')) {
          if (ttsRateLimitUntilRef) {
            ttsRateLimitUntilRef.current = Date.now() + TTS_PREFETCH_CONFIG.RATE_LIMIT_BACKOFF_MS
          }
          return null
        }
        return null
      }

      return data.audioUrl
    } catch (error) {
      logger.warn('AUDIO', 'Voice agent TTS fetch failed', {
        error: error.message,
        itemId: item.id,
      })
      return null
    }
  }, [ttsRateLimitUntilRef, lastTtsRequestTimeRef])

  /**
   * Pre-fetch audio for the next item in queue
   * @param {string} currentItemId - ID of the currently playing item
   */
  const prefetchNextItemTts = useCallback(async (currentItemId) => {
    const queue = voiceAgentQueueRef.current
    const currentIndex = queue.findIndex((item) => item.id === currentItemId)
    const nextItem = queue[currentIndex + 1]

    if (!nextItem) {
      return // No next item to prefetch
    }

    // Skip if next item already has audio or is being prefetched
    if (nextItem.audioUrl || prefetchedTtsRef.current.has(nextItem.id)) {
      return
    }

    logger.info('AUDIO', 'JIT TTS: Pre-fetching audio for next item', {
      nextItemId: nextItem.id,
    })

    const audioUrl = await fetchTtsForItem(nextItem)
    if (audioUrl) {
      prefetchedTtsRef.current.set(nextItem.id, audioUrl)
      logger.info('AUDIO', 'JIT TTS: Pre-fetch complete', {
        nextItemId: nextItem.id,
      })
    }
  }, [fetchTtsForItem])

  /**
   * Queue a voice agent message
   * @param {string} text - Text to speak
   * @param {Object} options - Message options
   */
  const enqueueVoiceAgentMessage = useCallback((text, options = {}) => {
    if (!text || typeof text !== 'string') return
    const trimmed = text.trim()
    if (!trimmed) return

    const entry = {
      id: `va_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: trimmed,
      priority: options.priority || 'normal',
      waitForAudio: options.waitForAudio !== false,
      onComplete: typeof options.onComplete === 'function' ? options.onComplete : null,
      completeOnError: options.completeOnError === true,
      audioUrl: options.audioUrl || null,
    }

    setVoiceAgentQueue((prev) => {
      if (entry.priority === 'high') {
        return [entry, ...prev]
      }
      return [...prev, entry]
    })
  }, [])

  /**
   * Clear the voice agent queue
   */
  const clearVoiceAgentQueue = useCallback(() => {
    setVoiceAgentQueue([])
    prefetchedTtsRef.current.clear()
  }, [])

  /**
   * Stop the currently playing voice agent audio
   */
  const stopVoiceAgentAudio = useCallback(() => {
    if (voiceAgentAudioRef.current) {
      voiceAgentAudioRef.current.pause()
      voiceAgentAudioRef.current = null
    }
    voiceAgentBusyRef.current = false
    setIsVoiceAgentSpeaking(false)
  }, [])

  /**
   * Interrupt all voice agent playback and clear queue
   */
  const interruptVoiceAgent = useCallback(() => {
    stopVoiceAgentAudio()
    clearVoiceAgentQueue()
  }, [stopVoiceAgentAudio, clearVoiceAgentQueue])

  return {
    // State
    voiceAgentQueue,
    isVoiceAgentSpeaking,

    // Queue management
    enqueueVoiceAgentMessage,
    clearVoiceAgentQueue,
    setVoiceAgentQueue,
    setIsVoiceAgentSpeaking,

    // Playback control
    stopVoiceAgentAudio,
    interruptVoiceAgent,

    // TTS functions
    fetchTtsForItem,
    prefetchNextItemTts,

    // Refs for external access
    voiceAgentBusyRef,
    voiceAgentAudioRef,
    voiceAgentQueueRef,
    prefetchedTtsRef,
  }
}
