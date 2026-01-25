import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import FunFactCard from './components/FunFactCard'
import SuggestionCard from './components/SuggestionCard'
import Toast from './components/Toast'
import TopicHeader from './components/TopicHeader'
import SectionDivider from './components/SectionDivider'
import TopicSidebar from './components/TopicSidebar'
import HighlightOverlay from './components/HighlightOverlay'
import LevelCard from './components/LevelCard'
import RegenerateDropdown from './components/RegenerateDropdown'
import StreamingSubtitle from './components/StreamingSubtitle'
import { useWebSocket, PROGRESS_TYPES } from './hooks/useWebSocket'
import logger from './utils/logger'
import { playMicOnSound, playRecordingCompleteSound, playAchievementSound } from './utils/soundEffects'
import SocraticMode from './components/SocraticMode'
import StreakCounter from './components/StreakCounter'
import AchievementToast from './components/AchievementToast'
import Confetti from './components/Confetti'
import useUserProgress from './hooks/useUserProgress'

// App states
const UI_STATE = {
  HOME: 'home',
  LISTENING: 'listening',
  GENERATING: 'generating',
  SLIDESHOW: 'slideshow',
  SOCRATIC: 'socratic', // SOCRATIC-003: Socratic questioning after slideshow
  ERROR: 'error',
}

// Explanation level options
const EXPLANATION_LEVEL = {
  SIMPLE: 'simple',
  STANDARD: 'standard',
  DEEP: 'deep',
}

// Level card configuration
const LEVEL_CONFIG = {
  [EXPLANATION_LEVEL.SIMPLE]: {
    icon: '🌱',
    title: 'Simple',
    description: 'Everyday language, no jargon',
  },
  [EXPLANATION_LEVEL.STANDARD]: {
    icon: '📚',
    title: 'Standard',
    description: 'Balanced with key concepts',
  },
  [EXPLANATION_LEVEL.DEEP]: {
    icon: '🔬',
    title: 'Deep',
    description: 'Technical depth and nuance',
  },
}

// Generation timeout configuration (F053)
const GENERATION_TIMEOUT = {
  // Time before showing "Still working..." message (15 seconds)
  STILL_WORKING_MS: 15000,
  // Maximum time before allowing user to cancel (60 seconds)
  MAX_TIMEOUT_MS: 60000,
  // Delay before refreshing fun fact (60 seconds)
  FUN_FACT_REFRESH_DELAY_MS: 60000,
}

// Local progress stage for TTS loading (not from WebSocket)
const LOCAL_PROGRESS = {
  TTS_LOADING: 'tts_loading',
}

const GENERATION_PROGRESS_PERCENT = {
  [PROGRESS_TYPES.START]: 10,
  [PROGRESS_TYPES.SCRIPT_READY]: 35,
  [PROGRESS_TYPES.IMAGES_GENERATING]: 65,
  [PROGRESS_TYPES.AUDIO_GENERATING]: 85,
  [LOCAL_PROGRESS.TTS_LOADING]: 92,
  [PROGRESS_TYPES.COMPLETE]: 100,
  [PROGRESS_TYPES.ERROR]: 100,
}

// Microphone permission states
const PERMISSION_STATE = {
  PROMPT: 'prompt',
  GRANTED: 'granted',
  DENIED: 'denied',
}

// Maximum number of topics with slides cached in memory (LRU eviction beyond this)
const MAX_CACHED_TOPICS = 12

// Maximum number of versions per topic to prevent unbounded storage growth
const MAX_VERSIONS_PER_TOPIC = 5

// CORE027: localStorage key for persisting topics across page refresh
const TOPICS_STORAGE_KEY = 'showme_topics'
// CORE027: localStorage key prefix for per-topic slide storage
const TOPIC_SLIDES_STORAGE_PREFIX = 'showme_topic_slides_'
// CORE027: localStorage key for stable client ID (server-side slide storage)
const CLIENT_ID_STORAGE_KEY = 'showme_client_id'

const SLIDES_API_BASE = '/api/slides'

const FALLBACK_SLIDE_IMAGE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#f0f0f0" width="400" height="300"/><text x="200" y="150" text-anchor="middle" fill="#999">Image unavailable</text></svg>'
const FALLBACK_SLIDE_IMAGE_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(FALLBACK_SLIDE_IMAGE_SVG)}`

// CORE027: Storage version for schema migration
// Version 3 adds versions array support for regeneration feature
const TOPICS_STORAGE_VERSION = 3
const TOPIC_SLIDES_STORAGE_VERSION = 1

// Default questions (fallback when API fails or rate limited)
const DEFAULT_QUESTIONS = [
  "How do black holes work?",
  "Why do we dream?",
  "How does WiFi work?",
]

// Display greetings - matches voice greetings for consistency
const DISPLAY_GREETINGS = [
  "What would you like to learn today?",
  "Ready to explore something new?",
  "What's on your curious mind?",
  "Let's discover something together!",
  "What would you like to understand?",
  "Ready for a learning adventure?",
]

// Home screen headlines - randomly selected on each visit
const HOME_HEADLINES = [
  "What do you want me to show you?",
  "What would you like to learn?",
  "What are you curious about?",
  "What should we explore today?",
  "What do you want to understand?",
  "What can I explain for you?",
]

// Pause duration between slide transitions (ms)
// This gives users a brief mental break between concepts
const SLIDE_TRANSITION_PAUSE_MS = 400

// Audio configuration constants
const AUDIO_CONFIG = {
  // Number of bars in the waveform visualization
  WAVEFORM_BARS: 20,
  // Silence detection threshold (0-255 range from analyser)
  SILENCE_THRESHOLD: 15,
  // Duration of silence before triggering generation (ms)
  SILENCE_DURATION: 1500,
  // Minimum detected speech duration to treat recording as valid (ms)
  MIN_SPEECH_DURATION_MS: 300,
  // Minimum speech frames (50ms per frame) before sending to STT
  MIN_SPEECH_FRAMES: 5,
  // Retry listening when no speech is detected
  NO_SPEECH_RETRY_MAX: 2,
  NO_SPEECH_RETRY_DELAY_MS: 350,
  // Audio analyser FFT size (must be power of 2)
  FFT_SIZE: 256,
  // Animation frame interval for waveform updates (ms)
  ANIMATION_INTERVAL: 50,
  // Minimum audio size in bytes (~0.5s of audio)
  MIN_AUDIO_SIZE: 5000,
  // Maximum audio size in bytes (matches backend 10MB limit)
  MAX_AUDIO_SIZE: 10 * 1024 * 1024,
}

const TTS_PREFETCH_CONFIG = {
  MAX_CONCURRENCY: 1,        // Reduced from 2 to avoid rate limits
  DELAY_MS: 2000,            // Increased to 2s between requests for 20 RPM (10 per model)
  MAX_PREFETCH_AHEAD: 1,     // Only prefetch next 1 slide to minimize concurrent requests
  RATE_LIMIT_BACKOFF_MS: 10000, // Wait 10s after rate limit before retrying
  MIN_REQUEST_INTERVAL_MS: 3000, // Minimum 3s between any TTS requests (20 RPM = 3s/request)
}

// Voice agent script templates
const VOICE_AGENT_SCRIPT = {
  GENERATION_START: "",
  PREPARING_FOLLOW_UP: "Preparing your follow-up now.",
  // Dynamic slides ready message based on topic and count
  getSlidesReadyMessage: (topicName, slideCount) => {
    if (topicName && slideCount > 1) {
      return `Slides about ${topicName} are ready.`
    } else if (slideCount > 1) {
      return "Your slides are ready."
    }
    return "Your explanation is ready."
  },
  // Suggestions slide TTS disabled to conserve quota.
}

/**
 * Build a localStorage key for a topic's slide archive.
 * @param {string} topicId - Topic ID
 * @param {string} [versionId] - Optional version ID for per-version storage
 * @returns {string} Storage key for topic slides
 */
function getTopicSlidesStorageKey(topicId, versionId) {
  if (versionId) {
    return `${TOPIC_SLIDES_STORAGE_PREFIX}${topicId}_${versionId}`
  }
  return `${TOPIC_SLIDES_STORAGE_PREFIX}${topicId}`
}

/**
 * Get or create a stable client ID for server-side slide storage.
 * @returns {string|null} Stable client ID or null when unavailable
 */
function getStoredClientId() {
  if (typeof window === 'undefined') return null
  try {
    const existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY)
    if (existing) return existing

    const fallback = `client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    const generated = window.crypto?.randomUUID ? window.crypto.randomUUID() : fallback
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, generated)
    return generated
  } catch (error) {
    logger.warn('STORAGE', 'Failed to access client ID storage', {
      error: error.message,
    })
    return null
  }
}

/**
 * Normalize slides for storage (strip large audio payloads).
 * @param {Array} slides - Slide objects
 * @param {string} topicId - Topic ID for fallback association
 * @returns {Array} Sanitized slides for storage
 */
function sanitizeSlidesForStorage(slides, topicId) {
  if (!Array.isArray(slides)) {
    console.log('[DEBUG SANITIZE] Input not array:', { topicId, slides })
    return []
  }
  console.log('[DEBUG SANITIZE] Processing slides:', { topicId, inputCount: slides.length })
  return slides
    .filter((slide) => slide && typeof slide === 'object')
    .map((slide, index) => ({
      // Use fallback ID if missing to ensure slide is always persisted
      id: slide.id || `slide_${topicId}_${index}_${Date.now()}`,
      // Use placeholder image if missing - slide content is more important than image
      imageUrl: slide.imageUrl || FALLBACK_SLIDE_IMAGE_URL,
      subtitle: slide.subtitle || '',
      duration: slide.duration || 5000,
      topicId: slide.topicId || topicId,
      // F091: Preserve conclusion slide marker
      ...(slide.isConclusion && { isConclusion: true }),
      // Persist audioUrl for instant playback of historical slides
      ...(slide.audioUrl && { audioUrl: slide.audioUrl }),
      // Preserve slide type for section dividers and other special slides
      ...(slide.type && { type: slide.type }),
      // Preserve parent relationship for follow-up slides
      ...(slide.parentId && { parentId: slide.parentId }),
    }))
    // Only filter out completely invalid slides (no content at all)
    .filter((slide) => slide.id && (slide.subtitle || slide.imageUrl))
}

/**
 * Persist slides to the backend for durable storage.
 * @param {string} topicId - Topic ID
 * @param {Array} slides - Sanitized slides
 * @param {string} [versionId] - Optional version ID
 * @param {Object} [options] - Persistence options
 */
async function persistSlidesToServer(topicId, slides, versionId, options = {}) {
  const clientId = getStoredClientId()
  if (!clientId || !topicId || !Array.isArray(slides) || slides.length === 0) {
    return
  }

  if (options.skipRemote) {
    return
  }

  try {
    const response = await fetch(`${SLIDES_API_BASE}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        topicId,
        versionId,
        slides,
      }),
    })

    if (!response.ok) {
      logger.warn('STORAGE', 'Failed to persist slides to server', {
        status: response.status,
        topicId,
        versionId,
      })
    }
  } catch (error) {
    logger.warn('STORAGE', 'Slides server persistence failed', {
      error: error.message,
      topicId,
      versionId,
    })
  }
}

/**
 * Persist slides for a topic into localStorage.
 * @param {string} topicId - Topic ID
 * @param {Array} slides - Slide objects to store
 * @param {string} [versionId] - Optional version ID for per-version storage
 * @param {Object} [options] - Persistence options
 */
function persistTopicSlides(topicId, slides, versionId, options = {}) {
  const storageKey = getTopicSlidesStorageKey(topicId, versionId)
  console.log('[DEBUG PERSIST] Saving slides:', { topicId, versionId, storageKey, slidesCount: slides?.length })
  if (!topicId || !Array.isArray(slides)) {
    logger.warn('STORAGE', 'Cannot persist slides: invalid input', { topicId, slidesType: typeof slides })
    return false
  }

  const sanitizedSlides = sanitizeSlidesForStorage(slides, topicId)
  if (sanitizedSlides.length === 0) {
    logger.warn('STORAGE', 'No valid slides to persist after sanitization', {
      topicId,
      originalCount: slides.length
    })
    return false
  }

  void persistSlidesToServer(topicId, sanitizedSlides, versionId, options)

  const payload = {
    version: TOPIC_SLIDES_STORAGE_VERSION,
    slides: sanitizedSlides,
    savedAt: Date.now(),
  }

  try {
    const key = getTopicSlidesStorageKey(topicId, versionId)
    localStorage.setItem(key, JSON.stringify(payload))
    // Verify the save worked
    const verification = localStorage.getItem(key)
    console.log('[DEBUG PERSIST] Saved and verified:', {
      key,
      savedSuccessfully: !!verification,
      payloadSize: JSON.stringify(payload).length
    })
    logger.debug('STORAGE', 'Slides persisted successfully', {
      topicId,
      versionId,
      slidesCount: sanitizedSlides.length,
    })
    return true
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      logger.warn('STORAGE', 'Slides archive quota exceeded, skipping storage', {
        topicId,
        versionId,
        slidesCount: sanitizedSlides.length,
      })
    } else {
      logger.error('STORAGE', 'Failed to persist topic slides', {
        topicId,
        versionId,
        error: error.message,
      })
    }
    return false
  }
}

/**
 * Validate and normalize slide payloads loaded from storage.
 * @param {Object} parsed - Parsed storage payload
 * @returns {Array|null} Valid slides or null
 */
function extractValidSlidesFromPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return null

  const version = parsed.version || 0
  if (version > TOPIC_SLIDES_STORAGE_VERSION) return null

  const slides = Array.isArray(parsed.slides) ? parsed.slides : null
  if (!slides) return null

  // Lenient validation - only require slide to have id and some content
  const validSlides = slides.filter((slide) =>
    slide &&
    typeof slide === 'object' &&
    slide.id &&
    (slide.subtitle || slide.imageUrl)
  )

  return validSlides.length > 0 ? validSlides : null
}

/**
 * Load cached slides for a topic from localStorage.
 * @param {string} topicId - Topic ID
 * @param {string} [versionId] - Optional version ID for per-version storage
 * @returns {Array|null} Slides array or null when unavailable
 */
function loadTopicSlidesFromStorage(topicId, versionId) {
  if (!topicId) return null

  try {
    const storageKey = getTopicSlidesStorageKey(topicId, versionId)
    console.log('[DEBUG LOAD] Looking for slides:', { topicId, versionId, storageKey })
    const stored = localStorage.getItem(storageKey)
    if (!stored) {
      console.log('[DEBUG LOAD] NOT FOUND:', storageKey)
      return null
    }
    console.log('[DEBUG LOAD] FOUND:', { storageKey, size: stored.length })

    const parsed = JSON.parse(stored)
    return extractValidSlidesFromPayload(parsed)
  } catch (error) {
    logger.warn('STORAGE', 'Failed to load topic slides', {
      topicId,
      versionId,
      error: error.message,
    })
    return null
  }
}

/**
 * Find the most recent versioned slide archive for a topic.
 * @param {string} topicId - Topic ID
 * @returns {Object|null} { slides, key, savedAt } or null
 */
function loadLatestVersionedSlides(topicId) {
  if (!topicId) return null

  try {
    const prefix = `${TOPIC_SLIDES_STORAGE_PREFIX}${topicId}_`
    const keys = Object.keys(localStorage)
    let latest = null

    keys.forEach((key) => {
      if (!key.startsWith(prefix)) return
      const stored = localStorage.getItem(key)
      if (!stored) return

      let parsed
      try {
        parsed = JSON.parse(stored)
      } catch {
        return
      }

      const slides = extractValidSlidesFromPayload(parsed)
      if (!slides) return

      const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : 0
      if (!latest || savedAt > latest.savedAt) {
        latest = { slides, key, savedAt }
      }
    })

    return latest
  } catch (error) {
    logger.warn('STORAGE', 'Failed to scan versioned slides', {
      topicId,
      error: error.message,
    })
    return null
  }
}

/**
 * Load slides for a topic, trying version-specific storage first, then legacy.
 * This is the canonical way to load slides for a topic - use this instead of
 * calling loadTopicSlidesFromStorage directly.
 * @param {Object} topic - Topic object with id, versions, and currentVersionIndex
 * @returns {Array|null} Slides array or null when unavailable
 */
function loadSlidesForTopic(topic) {
  if (!topic?.id) return null

  // Try version-specific storage first
  const currentVersion = topic.versions?.[topic.currentVersionIndex ?? 0]
  if (currentVersion?.id) {
    const versionedSlides = loadTopicSlidesFromStorage(topic.id, currentVersion.id)
    if (versionedSlides) {
      logger.debug('STORAGE', 'Loaded slides from versioned storage', {
        topicId: topic.id,
        versionId: currentVersion.id,
        slidesCount: versionedSlides.length,
      })
      return versionedSlides
    }
  }

  // If current version is missing, try any other known versions
  if (Array.isArray(topic.versions)) {
    for (const version of topic.versions) {
      if (!version?.id || version.id === currentVersion?.id) continue
      const otherSlides = loadTopicSlidesFromStorage(topic.id, version.id)
      if (otherSlides) {
        logger.debug('STORAGE', 'Loaded slides from alternate version', {
          topicId: topic.id,
          versionId: version.id,
          slidesCount: otherSlides.length,
        })
        return otherSlides
      }
    }
  }

  // Fall back to legacy (non-versioned) storage
  const legacySlides = loadTopicSlidesFromStorage(topic.id)
  if (legacySlides) {
    logger.debug('STORAGE', 'Loaded slides from legacy storage', {
      topicId: topic.id,
      slidesCount: legacySlides.length,
    })
    return legacySlides
  }

  // Last resort: scan versioned keys for this topic (handles mismatched metadata)
  const fallback = loadLatestVersionedSlides(topic.id)
  if (fallback?.slides) {
    logger.debug('STORAGE', 'Loaded slides from version scan fallback', {
      topicId: topic.id,
      storageKey: fallback.key,
      slidesCount: fallback.slides.length,
    })
    return fallback.slides
  }

  logger.debug('STORAGE', 'No slides found in storage', {
    topicId: topic.id,
    versionId: currentVersion?.id,
    hasVersions: !!topic.versions?.length,
  })

  return null
}

/**
 * Remove slide archives for topics that no longer exist.
 * @param {Set<string>} validTopicIds - Active topic IDs
 */
function removeStaleTopicSlides(validTopicIds) {
  console.log('[DEBUG CLEANUP] Valid topic IDs:', Array.from(validTopicIds))
  try {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (!key.startsWith(TOPIC_SLIDES_STORAGE_PREFIX)) return
      // Extract topicId from key, handling both legacy and versioned formats:
      // - Legacy: showme_topic_slides_{topicId}
      // - Versioned: showme_topic_slides_{topicId}_{versionId} where versionId starts with "v_"
      const afterPrefix = key.slice(TOPIC_SLIDES_STORAGE_PREFIX.length)
      // Find the first occurrence of "_v_" which marks the start of a versionId
      const versionSeparatorIndex = afterPrefix.indexOf('_v_')
      const topicId = versionSeparatorIndex !== -1
        ? afterPrefix.slice(0, versionSeparatorIndex)
        : afterPrefix
      const isValid = validTopicIds.has(topicId)
      console.log('[DEBUG CLEANUP] Checking key:', { key, extractedTopicId: topicId, isValid, willRemove: !isValid })
      if (!validTopicIds.has(topicId)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    logger.warn('STORAGE', 'Failed to clean up stale topic slides', {
      error: error.message,
    })
  }
}

/**
 * Remove cached slides for a specific topic, including all versioned storage keys.
 * @param {string} topicId - Topic ID to remove slides for
 */
function removeTopicSlides(topicId) {
  try {
    // Remove legacy (non-versioned) key
    const legacyKey = getTopicSlidesStorageKey(topicId)
    localStorage.removeItem(legacyKey)

    // Also remove any versioned keys for this topic
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (!key.startsWith(TOPIC_SLIDES_STORAGE_PREFIX)) return
      // Check if this key belongs to the target topicId
      const afterPrefix = key.slice(TOPIC_SLIDES_STORAGE_PREFIX.length)
      const versionSeparatorIndex = afterPrefix.indexOf('_v_')
      const extractedTopicId = versionSeparatorIndex !== -1
        ? afterPrefix.slice(0, versionSeparatorIndex)
        : afterPrefix
      if (extractedTopicId === topicId) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    logger.warn('STORAGE', 'Failed to remove topic slides', {
      topicId,
      error: error.message,
    })
  }
}

/**
 * CORE027: Load persisted topics from localStorage
 * Handles corrupted data, schema validation, and migration.
 * @returns {Object} { topics: Array, hadPersistedData: boolean }
 */
function loadPersistedTopics() {
  // Debug: list all slide-related keys in localStorage
  const allKeys = Object.keys(localStorage)
  const slideKeys = allKeys.filter(k => k.startsWith(TOPIC_SLIDES_STORAGE_PREFIX))
  console.log('[DEBUG STARTUP] All slide keys in localStorage:', slideKeys)

  try {
    const stored = localStorage.getItem(TOPICS_STORAGE_KEY)
    if (!stored) {
      return { topics: [], hadPersistedData: false }
    }

    const parsed = JSON.parse(stored)

    // Validate storage structure
    if (!parsed || typeof parsed !== 'object') {
      logger.warn('STORAGE', 'Invalid storage structure, resetting')
      localStorage.removeItem(TOPICS_STORAGE_KEY)
      return { topics: [], hadPersistedData: false }
    }

    // Check version for future schema migration
    const version = parsed.version || 0
    if (version > TOPICS_STORAGE_VERSION) {
      logger.warn('STORAGE', 'Storage version newer than supported, resetting', {
        storedVersion: version,
        supportedVersion: TOPICS_STORAGE_VERSION,
      })
      localStorage.removeItem(TOPICS_STORAGE_KEY)
      return { topics: [], hadPersistedData: false }
    }

    const topics = parsed.topics
    if (!Array.isArray(topics)) {
      logger.warn('STORAGE', 'Topics not an array, resetting')
      localStorage.removeItem(TOPICS_STORAGE_KEY)
      return { topics: [], hadPersistedData: false }
    }

    // Validate each topic has required fields
    const validTopics = topics.filter((topic) => {
      if (!topic || typeof topic !== 'object') return false
      if (!topic.id || typeof topic.id !== 'string') return false
      if (!topic.name || typeof topic.name !== 'string') return false
      // Icon is optional but should be string if present
      if (topic.icon && typeof topic.icon !== 'string') return false
      // Legacy storage may include slides array
      if (topic.slides && !Array.isArray(topic.slides)) return false
      return true
    })

    const now = Date.now()
    const normalizedTopics = validTopics.map((topic) => {
      // Handle legacy slides migration (v1->v2)
      if (Array.isArray(topic.slides) && topic.slides.length > 0) {
        // Legacy schema migration: move slides to per-topic storage
        persistTopicSlides(topic.id, topic.slides)
      }

      const createdAt = typeof topic.createdAt === 'number' ? topic.createdAt : now
      const lastAccessedAt = typeof topic.lastAccessedAt === 'number'
        ? topic.lastAccessedAt
        : createdAt

      // Migration to v3: Add versions array support
      // If topic already has versions array, preserve it; otherwise create one
      let versions = topic.versions
      let currentVersionIndex = topic.currentVersionIndex ?? 0
      const query = topic.query || topic.name // Use name as fallback query

      // Validate versions array - filter out any without valid IDs
      if (Array.isArray(versions)) {
        versions = versions.filter((v) => v && typeof v.id === 'string' && v.id.length > 0)
      }

      if (!Array.isArray(versions) || versions.length === 0) {
        // Migrate from non-versioned to versioned format
        // Create initial version from existing data
        versions = [{
          id: `v_${topic.id}_${now}`,
          explanationLevel: topic.explanationLevel || EXPLANATION_LEVEL.STANDARD,
          slides: null, // Will be loaded from storage
          createdAt: createdAt,
        }]
        currentVersionIndex = 0
      }

      // Ensure currentVersionIndex is within bounds
      if (currentVersionIndex >= versions.length) {
        currentVersionIndex = versions.length - 1
      }

      return {
        id: topic.id,
        name: topic.name,
        icon: topic.icon,
        query, // Store original query for regeneration
        createdAt,
        lastAccessedAt,
        versions,
        currentVersionIndex,
        // Keep slides at topic level for backward compatibility during transition
        slides: null,
        headerSlide: createHeaderSlide({
          id: topic.id,
          name: topic.name,
          icon: topic.icon,
        }),
      }
    })

    const topicsByAccess = [...normalizedTopics].sort(
      (a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0)
    )
    const cachedTopicIds = new Set(
      topicsByAccess.slice(0, MAX_CACHED_TOPICS).map((topic) => topic.id)
    )

    const restoredTopics = normalizedTopics.map((topic) => {
      console.log('[DEBUG RESTORE] Topic:', {
        id: topic.id,
        name: topic.name,
        versions: topic.versions?.map(v => ({ id: v.id, level: v.explanationLevel })),
        currentVersionIndex: topic.currentVersionIndex
      })
      if (!cachedTopicIds.has(topic.id)) return topic

      // Load slides using the canonical helper that tries versioned storage first
      const cachedSlides = loadSlidesForTopic(topic)

      if (cachedSlides) {
        // Update the current version with loaded slides
        const updatedVersions = topic.versions.map((v, idx) =>
          idx === topic.currentVersionIndex ? { ...v, slides: cachedSlides } : v
        )
        return { ...topic, slides: cachedSlides, versions: updatedVersions }
      }

      return topic
    })

    if (restoredTopics.length > 0) {
      logger.info('STORAGE', 'Restored topics from localStorage', {
        count: restoredTopics.length,
        topicNames: restoredTopics.map((t) => t.name),
      })
    }

    return {
      topics: restoredTopics,
      hadPersistedData: restoredTopics.length > 0,
    }
  } catch (error) {
    // JSON parse error or other issue - reset to clean state
    logger.error('STORAGE', 'Failed to load persisted topics', {
      error: error.message,
    })
    localStorage.removeItem(TOPICS_STORAGE_KEY)
    return { topics: [], hadPersistedData: false }
  }
}

/**
 * CORE027: Save topics to localStorage
 * Stores topic metadata only (slides are persisted separately).
 * @param {Array} topics - Array of topic objects to persist
 */
function saveTopicsToStorage(topics) {
  try {
    if (!topics || topics.length === 0) {
      localStorage.removeItem(TOPICS_STORAGE_KEY)
      removeStaleTopicSlides(new Set())
      logger.debug('STORAGE', 'Cleared topics from localStorage (no topics)')
      return
    }

    const topicsForStorage = topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      icon: topic.icon,
      query: topic.query, // Preserve original query for regeneration
      createdAt: topic.createdAt,
      lastAccessedAt: topic.lastAccessedAt,
      // Store versions metadata (slides are persisted separately per version)
      // Filter out any versions without a valid id to prevent load issues
      versions: (topic.versions || [])
        .filter((v) => v && typeof v.id === 'string' && v.id.length > 0)
        .map((v) => ({
          id: v.id,
          explanationLevel: v.explanationLevel,
          createdAt: v.createdAt,
          // slides are loaded separately from per-topic storage
        })),
      currentVersionIndex: topic.currentVersionIndex ?? 0,
      // headerSlide and slides are reconstructed or loaded separately
    }))

    const storageData = {
      version: TOPICS_STORAGE_VERSION,
      topics: topicsForStorage,
      savedAt: Date.now(),
    }

    const serialized = JSON.stringify(storageData)

    // Check storage quota (rough estimate, localStorage is typically 5-10MB)
    const sizeKB = serialized.length / 1024
    if (sizeKB > 4096) {
      // 4MB warning threshold
      logger.warn('STORAGE', 'Topics storage approaching quota limit', {
        sizeKB: sizeKB.toFixed(2),
      })
    }

    localStorage.setItem(TOPICS_STORAGE_KEY, serialized)
    removeStaleTopicSlides(new Set(topics.map((topic) => topic.id)))
    logger.debug('STORAGE', 'Saved topics to localStorage', {
      count: topics.length,
      sizeKB: sizeKB.toFixed(2),
    })
  } catch (error) {
    // Handle quota exceeded or other storage errors
    if (error.name === 'QuotaExceededError') {
      logger.error('STORAGE', 'localStorage quota exceeded')

      // H2: Recovery strategy - try saving a minimal metadata payload
      try {
        const minimalData = {
          version: TOPICS_STORAGE_VERSION,
          topics: topics.map((topic) => ({
            id: topic.id,
            name: topic.name,
            icon: topic.icon,
            query: topic.query,
            createdAt: topic.createdAt,
            lastAccessedAt: topic.lastAccessedAt,
            versions: (topic.versions || []).map((v) => ({
              id: v.id,
              explanationLevel: v.explanationLevel,
              createdAt: v.createdAt,
            })),
            currentVersionIndex: topic.currentVersionIndex ?? 0,
          })),
          savedAt: Date.now(),
        }
        localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(minimalData))
        logger.warn('STORAGE', 'Saved minimal topic metadata due to quota limit', {
          count: topics.length,
        })
      } catch (retryError) {
        // Still failed even with minimal data - give up
        logger.error('STORAGE', 'Unable to persist topics even with reduced data', {
          error: retryError.message,
        })
      }
    } else {
      logger.error('STORAGE', 'Failed to save topics', {
        error: error.message,
      })
    }
  }
}

/**
 * Creates a header slide object for a topic (F040, F043)
 * Header slides display the topic icon and name as a divider
 * @param {Object} topic - Topic object with id, name, icon
 * @returns {Object} Header slide object
 */
function createHeaderSlide(topic) {
  return {
    id: `header_${topic.id}`,
    type: 'header',
    topicId: topic.id,
    topicName: topic.name,
    topicIcon: topic.icon,
    // Header slides don't have imageUrl, audioUrl, subtitle, or duration
    // They are rendered using the TopicHeader component
  }
}

/**
 * Create a section divider slide that marks a follow-up section.
 * Displayed as a "chapter card" showing the follow-up question.
 * @param {string} topicId - Parent topic ID
 * @param {string} question - The follow-up question text
 * @returns {Object} Section divider slide object
 */
function createSectionDivider(topicId, question) {
  return {
    id: `section_${topicId}_${Date.now()}`,
    type: 'section',
    topicId,
    question,
    // Section dividers don't have imageUrl, audioUrl, or duration
    // They are rendered using the SectionDivider component
  }
}

/**
 * Get slides from the current version of a topic.
 * Falls back to topic.slides for backward compatibility.
 * @param {Object|null} topic - Topic object with versions array
 * @returns {Array} Slides for the current version
 */
function getCurrentVersionSlides(topic) {
  if (!topic) return []

  // Check if topic has versions array
  if (topic.versions && topic.versions.length > 0) {
    const versionIndex = topic.currentVersionIndex ?? 0
    const currentVersion = topic.versions[versionIndex]
    if (currentVersion && currentVersion.slides && currentVersion.slides.length > 0) {
      return currentVersion.slides
    }
  }

  // Fallback to topic-level slides for backward compatibility
  return topic.slides || []
}

/**
 * Get the current version's explanation level.
 * Falls back to topic.explanationLevel or standard for backward compatibility.
 * @param {Object|null} topic - Topic object with versions array
 * @returns {string} Current explanation level
 */
function getCurrentVersionLevel(topic) {
  if (!topic) return EXPLANATION_LEVEL.STANDARD

  // Check if topic has versions array
  if (topic.versions && topic.versions.length > 0) {
    const versionIndex = topic.currentVersionIndex ?? 0
    const currentVersion = topic.versions[versionIndex]
    if (currentVersion && currentVersion.explanationLevel) {
      return currentVersion.explanationLevel
    }
  }

  // Fallback to topic-level explanationLevel
  return topic.explanationLevel || EXPLANATION_LEVEL.STANDARD
}

/**
 * Build the slide list for a topic, including its header divider.
 * Uses the current version's slides if versions are available.
 * @param {Object|null} topic - Topic object with headerSlide and versions
 * @returns {Array} Slides for the topic in display order
 */
function buildTopicSlides(topic) {
  if (!topic) return []
  const slides = []
  const headerSlide = topic.headerSlide || createHeaderSlide(topic)
  if (headerSlide) {
    slides.push(headerSlide)
  }

  // Get slides from current version (or fallback to topic.slides)
  const versionSlides = getCurrentVersionSlides(topic)
  if (versionSlides.length > 0) {
    slides.push(...versionSlides)
  }

  // NOTE: Suggestions are now shown in SocraticFeedback instead of as a slide
  // This allows Socratic mode to trigger after the last content slide
  return slides
}

const TRIVIAL_TRANSCRIPT_TOKENS = new Set([
  'yes', 'yeah', 'yep', 'no', 'nope', 'ok', 'okay', 'uh', 'um', 'hmm', 'hm',
  'mmm', 'mm', 'uhh', 'umm', 'er', 'ah', 'oops', 'sorry', 'please', 'thanks',
  'thank', 'hi', 'hello', 'stop', 'cancel',
])

const SHORT_QUESTION_WORDS = new Set([
  'why', 'how', 'what', 'when', 'where', 'who', 'which',
])

function isTrivialTranscription(text) {
  if (!text || typeof text !== 'string') return true
  const cleaned = text.trim().toLowerCase()
  if (!cleaned) return true
  const normalized = cleaned.replace(/[^a-z0-9\s]/g, ' ')
  const tokens = normalized.split(/\s+/).filter(Boolean)
  if (!tokens.length) return true
  if (tokens.every((token) => TRIVIAL_TRANSCRIPT_TOKENS.has(token))) return true
  // Only filter single-character transcriptions (likely noise)
  // Allow 2-3 char words as they can be valid acronyms (LLM, API, GPU) or short words
  if (tokens.length === 1 && tokens[0].length <= 1) {
    return true
  }
  return false
}

function App() {
  // CORE027: Load persisted topics on initial mount
  // This uses a lazy initializer to only run once on mount
  const [initialData] = useState(() => loadPersistedTopics())

  const [uiState, setUiState] = useState(UI_STATE.HOME)
  // CORE027: isColdStart is false if we restored topics from localStorage
  const [isColdStart, setIsColdStart] = useState(() => !initialData.hadPersistedData)
  // Random greeting picked once per session for variety
  const [displayGreeting] = useState(() => DISPLAY_GREETINGS[Math.floor(Math.random() * DISPLAY_GREETINGS.length)])
  // Random home headline picked once per session
  const [homeHeadline] = useState(() => HOME_HEADLINES[Math.floor(Math.random() * HOME_HEADLINES.length)])
  // Selected explanation level (session default, also stored per-topic)
  const [selectedLevel, setSelectedLevel] = useState(EXPLANATION_LEVEL.STANDARD)
  // Show text input fallback on home screen
  const [showTextFallback, setShowTextFallback] = useState(false)
  // Suggested questions - using static defaults
  const [suggestedQuestions, setSuggestedQuestions] = useState(DEFAULT_QUESTIONS)
  const [currentIndex, setCurrentIndex] = useState(0)
  // CORE032: Vertical navigation state for 2D slides
  const [currentChildIndex, setCurrentChildIndex] = useState(null)
  const [isFollowUpDrawerOpen, setIsFollowUpDrawerOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [liveTranscription, setLiveTranscription] = useState('')
  const [lastTranscription, setLastTranscription] = useState('')
  const [textInput, setTextInput] = useState('')
  const [engagement, setEngagement] = useState(null)
  const [questionQueue, setQuestionQueue] = useState([])

  // Error handling state (F052)
  const [errorMessage, setErrorMessage] = useState('')
  const [lastFailedQuery, setLastFailedQuery] = useState('')

  // Regeneration state - tracks if we're regenerating a topic at a different level
  const [isRegenerating, setIsRegenerating] = useState(false)
  const regeneratingTopicIdRef = useRef(null)

  // Generation timeout state (F053)
  const [isStillWorking, setIsStillWorking] = useState(false)
  const [isPreparingFollowUp, setIsPreparingFollowUp] = useState(false)
  const [isSlideRevealPending, setIsSlideRevealPending] = useState(false)
  // Loading state for historical topic navigation (waiting for TTS)
  const [isLoadingTopicAudio, setIsLoadingTopicAudio] = useState(false)
  const [loadingTopicProgress, setLoadingTopicProgress] = useState(0)
  const abortControllerRef = useRef(null)
  const stillWorkingTimerRef = useRef(null)
  const currentQueryRef = useRef(null) // Track current query for fun fact refresh

  // F015: Generation progress state from WebSocket
  const [generationProgress, setGenerationProgress] = useState({
    stage: null,  // Current stage name from PROGRESS_TYPES
    message: '',  // Human-readable progress message
    slidesReady: 0,  // Number of slides ready
    totalSlides: 0,  // Total number of slides being generated
  })

  // GAMIFY-003: User progress and gamification
  const {
    progress: userProgress,
    badges: badgeDefinitions,
    newBadges,
    clearNewBadges,
    recordQuestionAsked,
    recordSocraticAnswered,
    recordDeepLevelUsed
  } = useUserProgress()

  // POLISH-001: Celebration state
  const [showConfetti, setShowConfetti] = useState(false)
  const [currentToastBadge, setCurrentToastBadge] = useState(null)

  // SOCRATIC-003: State for Socratic mode data
  const [socraticSlides, setSocraticSlides] = useState([])
  const [socraticTopicName, setSocraticTopicName] = useState('')
  const [socraticLanguage, setSocraticLanguage] = useState('en')

  const generationProgressPercent = useMemo(() => {
    if (!generationProgress.stage) return 0
    return GENERATION_PROGRESS_PERCENT[generationProgress.stage] ?? 0
  }, [generationProgress.stage])

  /**
   * F015: Handle WebSocket progress messages
   * Updates the generation progress state based on incoming messages
   * F072: Logs each generation stage with timing
   */
  const handleWebSocketProgress = useCallback((message) => {
    // Ignore non-progress messages (connected, registered, etc.)
    if (message.type === 'connected' || message.type === 'registered') {
      return
    }

    // Map progress types to user-friendly messages
    const progressMessages = {
      [PROGRESS_TYPES.START]: 'Starting generation...',
      [PROGRESS_TYPES.SCRIPT_READY]: 'Script ready, creating visuals...',
      [PROGRESS_TYPES.IMAGES_GENERATING]: 'Generating diagrams...',
      [PROGRESS_TYPES.AUDIO_GENERATING]: 'Creating narration...',
      [PROGRESS_TYPES.COMPLETE]: 'Complete!',
      [PROGRESS_TYPES.ERROR]: 'Error occurred',
    }

    // F072: Log generation pipeline stages
    const stageMessage = message.data?.stage || progressMessages[message.type] || message.type
    if (message.type === PROGRESS_TYPES.ERROR) {
      logger.error('GENERATION', `Pipeline error: ${stageMessage}`, {
        stage: message.type,
        data: message.data,
      })
    } else {
      logger.info('GENERATION', `Stage: ${stageMessage}`, {
        stage: message.type,
        slidesReady: message.data?.slidesCount || 0,
      })
    }

    const totalSlides = message.data?.slidesCount || 0
    setGenerationProgress(prev => ({
      stage: message.type,
      message: message.data?.stage || progressMessages[message.type] || '',
      slidesReady: message.type === PROGRESS_TYPES.COMPLETE ? totalSlides : prev.slidesReady,
      totalSlides: totalSlides || prev.totalSlides,  // Keep previous if not provided
    }))
  }, [])

  /**
   * F015: Handle WebSocket errors
   * F069: Logs WebSocket errors with context
   */
  const handleWebSocketError = useCallback((error) => {
    // F069: Log WebSocket errors (non-critical - generation still works via HTTP)
    logger.warn('WS', 'Connection error (non-critical, HTTP fallback available)', {
      error: error?.message || 'Unknown error',
    })
  }, [])

  // F015: Initialize WebSocket connection for progress updates
  const {
    isConnected: wsConnected,
    clientId: wsClientId,
  } = useWebSocket({
    onProgress: handleWebSocketProgress,
    onError: handleWebSocketError,
    autoConnect: true,
  })

  /**
   * Topics state structure (F041):
   * Array of topic objects, each containing:
   * - id: Unique topic identifier
   * - name: Display name for the topic
   * - icon: Emoji icon for the topic
   * - headerSlide: The header/divider slide for this topic (F040, F043)
   * - slides: Array of content slides for this topic when cached
   * - createdAt: Timestamp for topic ordering
   * - lastAccessedAt: Timestamp for slide cache eviction ordering
   *
   * Topics are ordered by creation time (oldest first).
   * Slides are cached in memory for a limited number of recently accessed topics.
   * CORE027: Initial state loaded from localStorage if available.
   */
  const [topics, setTopics] = useState(() => initialData.topics)
  const [activeTopicId, setActiveTopicId] = useState(() => {
    // Start with no active topic - user begins on HOME screen
    // Topic becomes active when user views its slides or creates new content
    return null
  })

  /**
   * Get the currently active topic (selected for viewing/follow-ups)
   * Returns null when no topic is selected (e.g., on HOME screen)
   */
  const activeTopic = useMemo(() => {
    if (topics.length === 0 || !activeTopicId) return null
    return topics.find((topic) => topic.id === activeTopicId) || null
  }, [topics, activeTopicId])

  /**
   * Slides to display in the main content (current topic only).
   * CORE032: Split into top-level visible slides and child slides for 2D navigation
   */
  const allTopicSlides = useMemo(() => buildTopicSlides(activeTopic), [activeTopic])
  
  const visibleSlides = useMemo(() => {
    // Only show top-level slides (no parentId) in the main horizontal flow
    return allTopicSlides.filter(s => !s.parentId)
  }, [allTopicSlides])

  // Ref to track visibleSlides without triggering effect cleanup
  const visibleSlidesRef = useRef(visibleSlides)
  useEffect(() => {
    visibleSlidesRef.current = visibleSlides
  }, [visibleSlides])

  const activeChildSlides = useMemo(() => {
    const currentParent = visibleSlides[currentIndex]
    if (!currentParent) return []
    return allTopicSlides.filter(s => s.parentId === currentParent.id)
  }, [allTopicSlides, visibleSlides, currentIndex])

  const displayedSlide = useMemo(() => {
    if (currentChildIndex !== null && activeChildSlides[currentChildIndex]) {
      return activeChildSlides[currentChildIndex]
    }
    return visibleSlides[currentIndex]
  }, [visibleSlides, currentIndex, activeChildSlides, currentChildIndex])
  const parentSlide = visibleSlides[currentIndex] || null

  /**
   * Limit in-memory slides to a recent-access cache to avoid unbounded growth.
   * @param {Array} topicList - Topics to prune
   * @param {string|null} keepTopicId - Topic ID to preserve in cache
   * @returns {Array} Topics with slides evicted beyond cache size
   */
  const pruneSlideCache = useCallback((topicList, keepTopicId) => {
    const cachedTopics = topicList.filter(
      (topic) => Array.isArray(topic.slides) && topic.slides.length > 0
    )

    if (cachedTopics.length <= MAX_CACHED_TOPICS) {
      return topicList
    }

    const sortedByAccess = [...cachedTopics].sort(
      (a, b) => (a.lastAccessedAt || 0) - (b.lastAccessedAt || 0)
    )

    const toEvict = new Set()
    const evictCount = cachedTopics.length - MAX_CACHED_TOPICS
    for (const topic of sortedByAccess) {
      if (toEvict.size >= evictCount) break
      if (topic.id === keepTopicId) continue
      toEvict.add(topic.id)
    }

    if (toEvict.size === 0) {
      return topicList
    }

    return topicList.map((topic) =>
      toEvict.has(topic.id)
        ? { ...topic, slides: null }
        : topic
    )
  }, [])

  /**
   * Fetch slides for a topic/version from the backend and hydrate local state.
   * @param {string} topicId - Topic ID
   * @param {string} [versionId] - Version ID to load
   * @param {number} [versionIndex] - Version index to hydrate
   * @returns {Promise<Array|null>} Loaded slides or null
   */
  const fetchSlidesFromServer = useCallback(async (topicId, versionId, versionIndex) => {
    if (!topicId) return null
    const clientId = getStoredClientId()
    if (!clientId) return null

    const key = `${topicId}_${versionId || 'current'}`
    const inFlight = slideServerFetchRef.current.get(key)
    if (inFlight) return inFlight

    const requestPromise = (async () => {
      try {
        const response = await fetch(`${SLIDES_API_BASE}/load`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, topicId, versionId }),
        })

        if (!response.ok) {
          logger.warn('STORAGE', 'Slide load from server failed', {
            status: response.status,
            topicId,
            versionId,
          })
          return null
        }

        const data = await response.json()
        const slides = Array.isArray(data.slides) ? data.slides : null
        if (!slides || slides.length === 0) {
          return null
        }

        const now = Date.now()
        setTopics((prev) => {
          const updated = prev.map((topic) => {
            if (topic.id !== topicId) return topic
            const targetIndex = Number.isInteger(versionIndex)
              ? versionIndex
              : (topic.currentVersionIndex ?? 0)
            const updatedVersions = Array.isArray(topic.versions)
              ? topic.versions.map((v, idx) =>
                  idx === targetIndex ? { ...v, slides } : v
                )
              : topic.versions
            return {
              ...topic,
              slides,
              versions: updatedVersions,
              lastAccessedAt: now,
            }
          })
          return pruneSlideCache(updated, topicId)
        })

        // Cache locally to avoid repeated server fetches
        persistTopicSlides(topicId, slides, versionId, { skipRemote: true })
        return slides
      } catch (error) {
        logger.warn('STORAGE', 'Slide load from server failed', {
          error: error.message,
          topicId,
          versionId,
        })
        return null
      } finally {
        slideServerFetchRef.current.delete(key)
      }
    })()

    slideServerFetchRef.current.set(key, requestPromise)
    return requestPromise
  }, [pruneSlideCache])

  /**
   * Keep the active topic aligned when topics change.
   * Only auto-select fallback if activeTopicId was set to a value that no longer exists.
   * Do NOT auto-select if activeTopicId is intentionally null (HOME screen).
   */
  useEffect(() => {
    if (topics.length === 0) {
      if (activeTopicId !== null) {
        setActiveTopicId(null)
        setCurrentIndex(0)
      }
      return
    }

    // Only check for stale topic ID if one was actually set
    // null is a valid state meaning "no topic selected" (HOME screen)
    if (activeTopicId !== null) {
      const hasActive = topics.some((topic) => topic.id === activeTopicId)
      if (!hasActive) {
        // The active topic was deleted - fall back to most recent
        const fallbackId = topics[topics.length - 1].id
        setActiveTopicId(fallbackId)
        setCurrentIndex(0)
      }
    }
  }, [topics, activeTopicId])

  // Ensure the active topic has slides loaded and update its access timestamp.
  const lastActiveTopicIdRef = useRef(null)
  useEffect(() => {
    if (!activeTopicId) {
      lastActiveTopicIdRef.current = null
      return
    }

    const active = topics.find((topic) => topic.id === activeTopicId)
    if (!active) return

    const needsSlides = !active.slides || active.slides.length === 0
    const isNewActive = lastActiveTopicIdRef.current !== activeTopicId
    // Use loadSlidesForTopic to try version-specific storage first, then legacy
    const cachedSlides = needsSlides ? loadSlidesForTopic(active) : null
    const currentVersionId = active.versions?.[active.currentVersionIndex ?? 0]?.id

    if (needsSlides && !cachedSlides) {
      void fetchSlidesFromServer(activeTopicId, currentVersionId)
    }

    if (!isNewActive && !cachedSlides) return
    const now = Date.now()

    setTopics((prev) => {
      const updated = prev.map((topic) => {
        if (topic.id !== activeTopicId) return topic
        const versionIndex = topic.currentVersionIndex ?? 0
        const updatedVersions = cachedSlides && Array.isArray(topic.versions)
          ? topic.versions.map((v, idx) => (
              idx === versionIndex ? { ...v, slides: cachedSlides } : v
            ))
          : topic.versions
        return {
          ...topic,
          slides: cachedSlides || topic.slides,
          versions: updatedVersions,
          lastAccessedAt: now,
        }
      })
      return pruneSlideCache(updated, activeTopicId)
    })

    lastActiveTopicIdRef.current = activeTopicId
  }, [activeTopicId, topics, pruneSlideCache, fetchSlidesFromServer])

  // Toast notification state for queue feedback (F047)
  const [toast, setToast] = useState({ visible: false, message: '' })

  // Voice input state
  const [isListening, setIsListening] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [permissionState, setPermissionState] = useState(PERMISSION_STATE.PROMPT)
  // Mic starts disabled; enabled on level selection or raise-hand
  const [isMicEnabled, setIsMicEnabled] = useState(false)
  // Auto-listen enabled by default; starts in LISTENING state when mic is enabled
  const [allowAutoListen, setAllowAutoListen] = useState(true)
  const [isSlideNarrationPlaying, setIsSlideNarrationPlaying] = useState(false)
  const [isSlideNarrationReady, setIsSlideNarrationReady] = useState(false)
  const [isSlideNarrationLoading, setIsSlideNarrationLoading] = useState(false)
  // Raise-hand state for gated listening
  const [isRaiseHandPending, setIsRaiseHandPending] = useState(false)
  const emptyTranscriptRetryRef = useRef(0)
  const isListeningRef = useRef(false)
  const isMicEnabledRef = useRef(false)
  const allowAutoListenRef = useRef(true)
  const isRaiseHandPendingRef = useRef(false)
  const selectedLevelRef = useRef(EXPLANATION_LEVEL.STANDARD)
  const isPlayingRef = useRef(false)
  const handleQuestionRef = useRef(null)

  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])

  useEffect(() => {
    isMicEnabledRef.current = isMicEnabled
  }, [isMicEnabled])

  useEffect(() => {
    allowAutoListenRef.current = allowAutoListen
  }, [allowAutoListen])

  useEffect(() => {
    isRaiseHandPendingRef.current = isRaiseHandPending
  }, [isRaiseHandPending])

  useEffect(() => {
    selectedLevelRef.current = selectedLevel
  }, [selectedLevel])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    setIsFollowUpDrawerOpen(false)
  }, [currentIndex, activeChildSlides.length])

  // Audio refs - these persist across renders without causing re-renders
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const animationFrameRef = useRef(null)
  const lastSpeechTimeRef = useRef(null)
  const speechStartedAtRef = useRef(null)
  const speechFrameCountRef = useRef(0)
  const isProcessingRecordingRef = useRef(false)
  const isStartingListeningRef = useRef(false)
  const startListeningRef = useRef(null)
  const stopListeningRef = useRef(null)

  // Track whether slideshow just finished (for auto-trigger of queued questions - F048)
  const hasFinishedSlideshowRef = useRef(false)
  // State version to trigger re-renders for Socratic mode
  const [slideshowFinished, setSlideshowFinished] = useState(false)

  // Voice agent queue state
  const [voiceAgentQueue, setVoiceAgentQueue] = useState([])
  const [isVoiceAgentSpeaking, setIsVoiceAgentSpeaking] = useState(false)
  const voiceAgentBusyRef = useRef(false)
  const voiceAgentAudioRef = useRef(null)
  const voiceAgentQueueRef = useRef([])
  const resumeListeningAfterVoiceAgentRef = useRef(false)
  const spokenFunFactRef = useRef(null)
  // JIT TTS: Pre-fetched audio URLs keyed by queue item id
  const prefetchedTtsRef = useRef(new Map())

  useEffect(() => {
    voiceAgentQueueRef.current = voiceAgentQueue
  }, [voiceAgentQueue])


  // Audio playback ref for slide narration (F037)
  const slideAudioRef = useRef(null)
  const lastSlideIdRef = useRef(null)
  const ttsPrefetchBatchRef = useRef(0)
  const resumeListeningAfterSlideRef = useRef(false)
  const slideAudioCacheRef = useRef(new Map())
  const slideAudioRequestRef = useRef(new Map())
  const slideAudioFailureRef = useRef(new Set())
  // Callback ref to persist audioUrl back to slide (set later to avoid circular deps)
  const persistSlideAudioRef = useRef(null)
  // Track rate limit backoff - timestamp when we can retry after rate limit
  const ttsRateLimitUntilRef = useRef(0)
  // Track last TTS request time - enforce minimum interval between requests
  const lastTtsRequestTimeRef = useRef(0)

  // Track if we should pause after the current slide (raise-hand flow)
  const pauseAfterCurrentSlideRef = useRef(false)
  // Track the transition timeout for cleanup when slide changes or unmounts
  const slideTransitionTimeoutRef = useRef(null)
  // CORE036: Track if the last navigation was manual (for streaming subtitles)
  const wasManualNavRef = useRef(false)

  const raiseHandRequestRef = useRef(false)

  // Track in-flight slide fetches from the server to avoid duplicate requests
  const slideServerFetchRef = useRef(new Map())

  // CORE022: Interrupt resume point - stores position when user interrupts slideshow
  // Format: { topicId: string, slideIndex: number } or null when no interrupt occurred
  const [interruptResumePoint, setInterruptResumePoint] = useState(null)

  // CORE024: Highlight position for annotation highlights on slide questions
  // Format: { x: number, y: number } as percentages (0-100), or null when not showing
  const [highlightPosition, setHighlightPosition] = useState(null)

  // CORE023: Audio ref for slide question response playback
  const slideResponseAudioRef = useRef(null)

  // Default slide duration in milliseconds (used when slide.duration is not available)
  const DEFAULT_SLIDE_DURATION = 5000

  // Ref to track previous UI state for logging transitions
  const prevUiStateRef = useRef(uiState)

  /**
   * F070: Log UI state transitions
   * Tracks changes between LISTENING, GENERATING, SLIDESHOW, ERROR states
   */
  useEffect(() => {
    if (prevUiStateRef.current !== uiState) {
      logger.info('UI', `State transition: ${prevUiStateRef.current} -> ${uiState}`, {
        from: prevUiStateRef.current,
        to: uiState,
      })
      prevUiStateRef.current = uiState
    }
  }, [uiState])

  // Clear stale transcription text when returning to listening without active recording.
  useEffect(() => {
    if (uiState === UI_STATE.LISTENING && !isListening) {
      setLiveTranscription('')
    }
  }, [uiState, isListening])

  // POLISH-001: Handle new badge unlocks with celebration
  useEffect(() => {
    if (newBadges && newBadges.length > 0) {
      // Show the first badge toast
      setCurrentToastBadge(newBadges[0])
      setShowConfetti(true)
      playAchievementSound()
    }
  }, [newBadges])

  // POLISH-001: Handle toast dismissal
  const handleToastDismiss = useCallback(() => {
    setCurrentToastBadge(null)
    clearNewBadges()
  }, [clearNewBadges])

  // POLISH-001: Handle confetti completion
  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false)
  }, [])

  /**
   * Returns the currently playing audio element, if any.
   * Used to avoid overlapping narration with voice-agent speech.
   */
  const getActiveAudioElement = useCallback(() => {
    const candidates = [
      voiceAgentAudioRef.current,
      slideResponseAudioRef.current,
      slideAudioRef.current,
    ]

    return candidates.find((audio) =>
      audio && !audio.paused && !audio.ended
    ) || null
  }, [])

  /**
   * Wait for the current audio to finish before continuing.
   * This enforces "finish the current sentence" behavior.
   */
  const waitForActiveAudioToEnd = useCallback(() => {
    const activeAudio = getActiveAudioElement()
    if (!activeAudio) {
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      const handleDone = () => {
        activeAudio.removeEventListener('ended', handleDone)
        activeAudio.removeEventListener('pause', handleDone)
        resolve()
      }

      activeAudio.addEventListener('ended', handleDone)
      activeAudio.addEventListener('pause', handleDone)
    })
  }, [getActiveAudioElement])

  /**
   * Persist audioUrl back to slide in topics state and localStorage.
   * This allows historical slides to play instantly without re-fetching TTS.
   */
  const persistSlideAudio = useCallback((slideId, audioUrl, duration) => {
    if (!slideId || !audioUrl) return

    setTopics((prev) => {
      let updated = false
      const newTopics = prev.map((topic) => {
        if (!topic.slides) return topic
        const slideIndex = topic.slides.findIndex((s) => s.id === slideId)
        if (slideIndex === -1) return topic

        // Update the slide with audioUrl
        updated = true
        const newSlides = [...topic.slides]
        newSlides[slideIndex] = {
          ...newSlides[slideIndex],
          audioUrl,
          duration: duration || newSlides[slideIndex].duration,
        }

        // Also persist to localStorage
        const versionId = topic.versions?.[topic.currentVersionIndex ?? 0]?.id
        persistTopicSlides(topic.id, newSlides, versionId)

        return { ...topic, slides: newSlides }
      })
      return updated ? newTopics : prev
    })
  }, [])

  // Set persist callback ref so requestSlideAudio can call it
  useEffect(() => {
    persistSlideAudioRef.current = persistSlideAudio
  }, [persistSlideAudio])

  const getCachedSlideAudio = useCallback((slideId) => {
    if (!slideId) return null
    return slideAudioCacheRef.current.get(slideId) || null
  }, [])

  const requestSlideAudio = useCallback(async (slide) => {
    if (!slide || slide.type === 'header') return null
    if (!slide.subtitle || typeof slide.subtitle !== 'string') return null
    if (slideAudioFailureRef.current.has(slide.id)) return null

    // Check cache first - if already fetched, return immediately
    const cached = getCachedSlideAudio(slide.id)
    if (cached) return cached

    // Check if slide already has persisted audioUrl (from localStorage)
    // This means we've fetched TTS before and saved it with the slide
    if (slide.audioUrl && typeof slide.audioUrl === 'string' && slide.audioUrl.startsWith('data:')) {
      const persistedPayload = { audioUrl: slide.audioUrl, duration: slide.duration || DEFAULT_SLIDE_DURATION }
      slideAudioCacheRef.current.set(slide.id, persistedPayload)
      logger.debug('AUDIO', 'Using persisted audioUrl from slide', { slideId: slide.id })
      return persistedPayload
    }

    // Check if request is already in flight - return that promise to await it
    const inFlight = slideAudioRequestRef.current.get(slide.id)
    if (inFlight) return inFlight

    // Check rate limit backoff - only for NEW requests
    const now = Date.now()
    if (now < ttsRateLimitUntilRef.current) {
      logger.debug('AUDIO', 'Skipping TTS request due to rate limit backoff', {
        slideId: slide.id,
        retryAfter: Math.ceil((ttsRateLimitUntilRef.current - now) / 1000),
      })
      return null
    }

    // Enforce minimum interval between NEW requests (prevents burst)
    const timeSinceLastRequest = now - lastTtsRequestTimeRef.current
    if (timeSinceLastRequest < TTS_PREFETCH_CONFIG.MIN_REQUEST_INTERVAL_MS) {
      logger.debug('AUDIO', 'Skipping TTS request - too soon after last request', {
        slideId: slide.id,
        waitMs: TTS_PREFETCH_CONFIG.MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest,
      })
      return null
    }

    // Update last request time BEFORE making request to prevent concurrent requests
    lastTtsRequestTimeRef.current = now

    const requestPromise = (async () => {
      try {
        const response = await fetch('/api/voice/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: slide.subtitle }),
        })

        // Handle rate limiting - don't permanently fail, just backoff
        if (response.status === 429) {
          ttsRateLimitUntilRef.current = Date.now() + TTS_PREFETCH_CONFIG.RATE_LIMIT_BACKOFF_MS
          logger.warn('AUDIO', 'TTS rate limited, backing off', {
            slideId: slide.id,
            backoffMs: TTS_PREFETCH_CONFIG.RATE_LIMIT_BACKOFF_MS,
          })
          // Don't add to failure set - can retry after backoff
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
          // Check if the response indicates rate limiting from upstream API
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

        // Persist audioUrl back to slide so historical slides play instantly
        if (persistSlideAudioRef.current) {
          persistSlideAudioRef.current(slide.id, data.audioUrl, duration)
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
  }, [DEFAULT_SLIDE_DURATION, getCachedSlideAudio])

  const prefetchSlideAudio = useCallback((slide) => {
    if (!slide || slide.type === 'header') return
    if (slideAudioFailureRef.current.has(slide.id)) return
    if (slideAudioCacheRef.current.has(slide.id)) return
    void requestSlideAudio(slide)
  }, [requestSlideAudio])

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

  const getSlideDuration = useCallback((slide) => {
    if (!slide) return DEFAULT_SLIDE_DURATION
    const cached = getCachedSlideAudio(slide.id)
    return cached?.duration || slide.duration || DEFAULT_SLIDE_DURATION
  }, [DEFAULT_SLIDE_DURATION, getCachedSlideAudio])

  const interruptActiveAudio = useCallback(() => {
    if (voiceAgentAudioRef.current) {
      voiceAgentAudioRef.current.pause()
      voiceAgentAudioRef.current = null
    }
    if (slideAudioRef.current) {
      slideAudioRef.current.pause()
      slideAudioRef.current = null
    }
    if (slideResponseAudioRef.current) {
      slideResponseAudioRef.current.pause()
      slideResponseAudioRef.current = null
    }

    voiceAgentBusyRef.current = false
    resumeListeningAfterVoiceAgentRef.current = false
    resumeListeningAfterSlideRef.current = false
    setIsVoiceAgentSpeaking(false)
    setIsSlideNarrationPlaying(false)
    setIsSlideNarrationLoading(false)
    setIsSlideNarrationReady(true)
    setHighlightPosition(null)

    if (slideTransitionTimeoutRef.current) {
      clearTimeout(slideTransitionTimeoutRef.current)
      slideTransitionTimeoutRef.current = null
    }
  }, [])

  /**
   * Queue a voice-agent line to be spoken via Gemini TTS.
   * If options.audioUrl is provided, uses pre-generated audio instead of fetching.
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
      audioUrl: options.audioUrl || null, // Pre-generated audio URL (skips /api/voice/speak)
    }

    setVoiceAgentQueue((prev) => {
      if (entry.priority === 'high') {
        return [entry, ...prev]
      }
      return [...prev, entry]
    })
  }, [])

  /**
   * Helper to fetch TTS audio for a queue item.
   * Returns the audioUrl on success, or null on failure.
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
    if (now < ttsRateLimitUntilRef.current) {
      logger.debug('AUDIO', 'Skipping voice agent TTS due to rate limit backoff', {
        itemId: item.id,
      })
      return null
    }

    // Enforce minimum interval between requests
    const timeSinceLastRequest = now - lastTtsRequestTimeRef.current
    if (timeSinceLastRequest < TTS_PREFETCH_CONFIG.MIN_REQUEST_INTERVAL_MS) {
      logger.debug('AUDIO', 'Skipping voice agent TTS - too soon after last request', {
        itemId: item.id,
      })
      return null
    }

    // Update last request time BEFORE making request
    lastTtsRequestTimeRef.current = now

    try {
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: item.text }),
      })

      // Handle rate limiting
      if (response.status === 429) {
        ttsRateLimitUntilRef.current = Date.now() + TTS_PREFETCH_CONFIG.RATE_LIMIT_BACKOFF_MS
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
        // Check for upstream rate limiting
        if (data?.error?.includes('Rate limit') || data?.error?.includes('rate')) {
          ttsRateLimitUntilRef.current = Date.now() + TTS_PREFETCH_CONFIG.RATE_LIMIT_BACKOFF_MS
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
  }, [])

  /**
   * JIT TTS: Pre-fetch audio for the next item in queue.
   * Called when starting to play the current item.
   */
  const prefetchNextItemTts = useCallback(async (currentItemId) => {
    const queue = voiceAgentQueueRef.current
    const currentIndex = queue.findIndex((item) => item.id === currentItemId)
    const nextItem = queue[currentIndex + 1]

    if (!nextItem) {
      return // No next item to prefetch
    }

    // Skip if next item already has audio or is already being prefetched
    if (nextItem.audioUrl || prefetchedTtsRef.current.has(nextItem.id)) {
      return
    }

    logger.info('AUDIO', 'JIT TTS: Pre-fetching audio for next item', {
      nextItemId: nextItem.id,
    })

    const audioUrl = await fetchTtsForItem(nextItem)
    if (audioUrl) {
      // Store in prefetch cache - will be used when this item's turn comes
      prefetchedTtsRef.current.set(nextItem.id, audioUrl)
      logger.info('AUDIO', 'JIT TTS: Pre-fetch complete', {
        nextItemId: nextItem.id,
      })
    }
  }, [fetchTtsForItem])

  /**
   * Process queued voice-agent messages sequentially with JIT TTS.
   * TTS is fetched for the NEXT item while the CURRENT item is playing,
   * naturally staggering requests to avoid rate limits.
   */
  useEffect(() => {
    if (voiceAgentBusyRef.current || voiceAgentQueue.length === 0) {
      return
    }

    const currentItem = voiceAgentQueue[0]

    const finishItem = (success = true) => {
      setIsVoiceAgentSpeaking(false)
      voiceAgentBusyRef.current = false
      voiceAgentAudioRef.current = null

      // Clean up prefetch cache for this item
      prefetchedTtsRef.current.delete(currentItem.id)

      const shouldResumeListening = resumeListeningAfterVoiceAgentRef.current
      resumeListeningAfterVoiceAgentRef.current = false

      // Default: only call onComplete when playback succeeded (avoids loops on 429),
      // unless the item explicitly allows completion on error.
      if ((success || currentItem.completeOnError) && currentItem.onComplete) {
        currentItem.onComplete()
      }
      setVoiceAgentQueue((prev) => prev.filter((item) => item.id !== currentItem.id))

      if (
        shouldResumeListening &&
        isMicEnabled &&
        allowAutoListen &&
        !isRaiseHandPending &&
        !isSlideNarrationPlaying &&
        !isProcessingRecordingRef.current
      ) {
        startListeningRef.current?.()
      }
    }

    const playVoiceAgentLine = async () => {
      voiceAgentBusyRef.current = true

      if (uiState === UI_STATE.SLIDESHOW && isPlaying) {
        pauseAfterCurrentSlideRef.current = true
      }

      if (isListening) {
        resumeListeningAfterVoiceAgentRef.current = true
        stopListeningRef.current?.()
      }

      if (currentItem.waitForAudio) {
        await waitForActiveAudioToEnd()
      }

      // Re-check that item is still in queue after waiting
      if (!voiceAgentQueueRef.current.some((item) => item.id === currentItem.id)) {
        voiceAgentBusyRef.current = false
        return
      }

      try {
        // Get audio URL: check prefetch cache first, then item's audioUrl, then fetch
        let audioUrl = prefetchedTtsRef.current.get(currentItem.id)
          || currentItem.audioUrl

        if (!audioUrl) {
          // Need to fetch TTS for current item (first item or prefetch failed)
          audioUrl = await fetchTtsForItem(currentItem)
        }

        if (!audioUrl) {
          // TTS failed - skip this item
          finishItem(false)
          return
        }

        // Clean up prefetch cache entry now that we're using it
        prefetchedTtsRef.current.delete(currentItem.id)

        const audio = new Audio(audioUrl)
        voiceAgentAudioRef.current = audio
        setIsVoiceAgentSpeaking(true)

        // JIT TTS: Start pre-fetching the NEXT item's audio while this one plays
        prefetchNextItemTts(currentItem.id)

        const handleDone = () => {
          finishItem()
        }

        audio.addEventListener('ended', handleDone, { once: true })
        audio.addEventListener('error', () => finishItem(false), { once: true })

        audio.play().catch((error) => {
          logger.warn('AUDIO', 'Voice agent playback blocked', { error: error.message })
          finishItem(false)
        })
      } catch (error) {
        logger.warn('AUDIO', 'Voice agent playback failed', { error: error.message })
        finishItem(false)
      }
    }

    playVoiceAgentLine()
  }, [
    voiceAgentQueue,
    waitForActiveAudioToEnd,
    uiState,
    isPlaying,
    isListening,
    isMicEnabled,
    allowAutoListen,
    isRaiseHandPending,
    isSlideNarrationPlaying,
    fetchTtsForItem,
    prefetchNextItemTts,
  ])

  /**
   * CORE027: Persist topic metadata to localStorage whenever they change.
   * Slides are stored separately per topic to allow cache eviction.
   * Note: We use a ref to track if this is the initial render to avoid
   * unnecessary saves on mount.
   */
  const isInitialMountRef = useRef(true)
  useEffect(() => {
    // Skip the initial mount since we just loaded from storage
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return
    }

    // Save topics to localStorage whenever they change
    saveTopicsToStorage(topics)
  }, [topics])


  // Navigation helper functions with bounds checking (F044)
  // CORE032: 2D Navigation Logic
  const goToNextSlide = useCallback(() => {
    wasManualNavRef.current = true // CORE036: Mark as manual navigation
    setCurrentIndex((prev) => {
      const nextIndex = Math.min(visibleSlides.length - 1, prev + 1)
      if (nextIndex !== prev) {
        setCurrentChildIndex(null) // Reset vertical position when moving horizontally
      }
      return nextIndex
    })
  }, [visibleSlides.length])

  const goToPrevSlide = useCallback(() => {
    wasManualNavRef.current = true // CORE036: Mark as manual navigation
    setCurrentIndex((prev) => {
      const nextIndex = Math.max(0, prev - 1)
      if (nextIndex !== prev) {
        setCurrentChildIndex(null)
      }
      return nextIndex
    })
  }, [])

  const goToChildNext = useCallback(() => {
    if (activeChildSlides.length === 0) return
    wasManualNavRef.current = true // CORE036: Mark as manual navigation
    setCurrentChildIndex((prev) => {
      if (prev === null) return 0
      return Math.min(activeChildSlides.length - 1, prev + 1)
    })
  }, [activeChildSlides.length])

  const goToChildPrev = useCallback(() => {
    wasManualNavRef.current = true // CORE036: Mark as manual navigation
    setCurrentChildIndex((prev) => {
      if (prev === null || prev === 0) return null
      return prev - 1
    })
  }, [])

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  /**
   * Show a toast notification (F047)
   * @param {string} message - Message to display
   */
  const showToast = useCallback((message) => {
    setToast({ visible: true, message })
  }, [])

  /**
   * Hide the toast notification
   */
  const hideToast = useCallback(() => {
    setToast({ visible: false, message: '' })
  }, [])

  /**
   * Toggle a question's queue status (F047)
   * Adds if not in queue, removes if already queued
   * @param {string} question - Question to toggle
   */
  const toggleQueueStatus = useCallback((question) => {
    setQuestionQueue((prev) => {
      if (prev.includes(question)) {
        // Remove from queue - no toast for removal
        return prev.filter((q) => q !== question)
      }
      // Add to queue and show confirmation toast
      showToast('Question added to queue')
      return [...prev, question]
    })
  }, [showToast])

  /**
   * Check if a question is currently in the queue
   * @param {string} question - Question to check
   * @returns {boolean} Whether the question is queued
   */
  const isQuestionQueued = useCallback((question) => {
    return questionQueue.includes(question)
  }, [questionQueue])

  const clearFunFactRefresh = useCallback(() => {
    currentQueryRef.current = null
  }, [])

  /**
   * Refresh fun fact by fetching a new one from the engagement endpoint.
   * Called after current fun fact audio finishes playing (TTS-driven refresh).
   */
  const refreshFunFact = useCallback(() => {
    const query = currentQueryRef.current
    const signal = abortControllerRef.current?.signal

    // Don't refresh if no query or generation was cancelled
    if (!query || signal?.aborted) {
      return
    }

    logger.debug('API', 'Refreshing fun fact after audio complete', {
      endpoint: '/api/generate/engagement',
    })

    fetch('/api/generate/engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, explanationLevel: selectedLevelRef.current }),
      signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Engagement API failed: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        // Check signal again after async operation
        if (abortControllerRef.current?.signal !== signal || !data?.funFact) return
        setEngagement((prev) => {
          if (!prev) {
            return {
              funFact: data.funFact,
              suggestedQuestions: Array.isArray(data.suggestedQuestions)
                ? data.suggestedQuestions
                : [],
            }
          }
          // Only update fun fact, keep existing suggestions
          return { ...prev, funFact: data.funFact }
        })
        // Reset spoken ref so the new fun fact will be spoken
        spokenFunFactRef.current = null
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          logger.warn('API', 'Fun fact refresh failed (non-critical)', {
            error: err.message,
          })
        }
      })
  }, [])

  /**
   * Transition to slideshow after prefetching TTS for the first content slide.
   * Waits for narration to be ready before showing slides for a polished experience.
   * @param {Array} slides - The slides to display (used to find first content slide)
   * @param {number} startIndex - Index of the first slide to show (default 0)
   */
  const queueSlidesReadyTransition = useCallback(async (slides = [], startIndex = 0) => {
    // Stop any currently playing voice agent audio (e.g., fun fact)
    if (voiceAgentAudioRef.current) {
      voiceAgentAudioRef.current.pause()
      voiceAgentAudioRef.current = null
    }
    // Clear pending voice queue and stop fun fact refresh chain
    setVoiceAgentQueue([])
    setIsVoiceAgentSpeaking(false)
    voiceAgentBusyRef.current = false
    clearFunFactRefresh()

    // Find the first content slide to prefetch TTS for (skip header, section dividers)
    const firstContentSlide = slides.find((slide, idx) =>
      idx >= startIndex &&
      slide.type !== 'header' &&
      slide.type !== 'section' &&
      slide.type !== 'suggestions' &&
      slide.subtitle
    )

    if (firstContentSlide) {
      // Update progress to show TTS loading
      setGenerationProgress(prev => ({
        ...prev,
        stage: LOCAL_PROGRESS.TTS_LOADING,
        message: 'Preparing narration...',
      }))

      logger.info('GENERATION', 'Prefetching TTS for first slide before transition', {
        slideId: firstContentSlide.id,
      })

      // Wait for TTS to be ready for the first slide
      try {
        await requestSlideAudio(firstContentSlide)
        logger.info('GENERATION', 'TTS ready, transitioning to slideshow')
      } catch (err) {
        // Don't block transition if TTS fails - just log and continue
        logger.warn('GENERATION', 'TTS prefetch failed, proceeding anyway', {
          error: err?.message,
        })
      }
    }

    setIsSlideRevealPending(false)
    setUiState(UI_STATE.SLIDESHOW)
  }, [clearFunFactRefresh, requestSlideAudio])

  /**
   * Cancel ongoing generation request (F053)
   * Aborts the fetch request and returns to listening state
   */
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (stillWorkingTimerRef.current) {
      clearTimeout(stillWorkingTimerRef.current)
      stillWorkingTimerRef.current = null
    }
    clearFunFactRefresh()
    setIsStillWorking(false)
    setIsPreparingFollowUp(false)
    setIsSlideRevealPending(false)
    setVoiceAgentQueue([])
    setUiState(UI_STATE.LISTENING)
  }, [clearFunFactRefresh])

  /**
   * Retry the last failed request (F052)
   * Re-attempts the query that previously failed
   */
  const retryLastRequest = useCallback(() => {
    if (lastFailedQuery) {
      setErrorMessage('')
      setUiState(UI_STATE.LISTENING)
      // Use setTimeout to ensure state is updated before calling handleQuestion
      setTimeout(() => {
        const runHandleQuestion = handleQuestionRef.current
        if (runHandleQuestion) {
          runHandleQuestion(lastFailedQuery)
        }
      }, 0)
    }
  }, [lastFailedQuery])

  useEffect(() => {
    if (uiState !== UI_STATE.GENERATING) {
      clearFunFactRefresh()
    }
  }, [uiState, clearFunFactRefresh])

  /**
   * Speak fun facts using pre-generated audio from engagement endpoint when available.
   * Uses TTS-driven refresh: next fun fact fetched only after current audio finishes.
   */
  useEffect(() => {
    if (!engagement) return

    if (engagement.funFact?.text && engagement.funFact?.audioUrl && !spokenFunFactRef.current) {
      spokenFunFactRef.current = engagement.funFact.text
      // Only speak when pre-generated audio is provided (avoid extra TTS calls).
      // When audio finishes, wait 60s before refreshing to get next fun fact
      enqueueVoiceAgentMessage(`Fun fact: ${engagement.funFact.text}`, {
        audioUrl: engagement.funFact.audioUrl,
        onComplete: () => {
          setTimeout(refreshFunFact, GENERATION_TIMEOUT.FUN_FACT_REFRESH_DELAY_MS)
        },
      })
    }

    // Suggested questions are shown visually only (no TTS) to avoid
    // race condition where suggestions narrate after slides are ready
  }, [engagement, enqueueVoiceAgentMessage, refreshFunFact])

  // Auto-advance slideshow for non-audio slides (F044)
  // - Header slides: advance after 2 seconds (no audio)
  // - Suggestions slides: advance after duration (no audio)
  // - Regular slides with audio: handled by audio onended, NOT this timer
  // - Regular slides with failed audio: fallback timer advancement
  useEffect(() => {
    // Only run auto-advance when in slideshow state, playing, and slides exist
    if (uiState !== UI_STATE.SLIDESHOW || !isPlaying || isVoiceAgentSpeaking || visibleSlides.length === 0) {
      return
    }

    const currentSlide = displayedSlide

    // Wait for narration to be ready (header slides are always "ready")
    if (currentSlide?.type !== 'header' && currentSlide?.type !== 'suggestions' && !isSlideNarrationReady) {
      return
    }

    // For regular slides with audio playing, let audio onended handle advancement
    // This timer only handles: headers, suggestions, and audio failure fallback
    if (currentSlide?.type !== 'header' && currentSlide?.type !== 'suggestions' && isSlideNarrationPlaying) {
      return
    }

    // Get duration for current slide (in milliseconds)
    // Header slides advance faster since they're just dividers (2 seconds)
    // Add transition pause for non-header slides
    const baseDuration = currentSlide?.type === 'header'
      ? 2000
      : getSlideDuration(currentSlide)
    const duration = currentSlide?.type === 'header'
      ? baseDuration
      : baseDuration + SLIDE_TRANSITION_PAUSE_MS

    const timeoutId = setTimeout(() => {
      if (pauseAfterCurrentSlideRef.current) {
        pauseAfterCurrentSlideRef.current = false
        setIsPlaying(false)
        return
      }

      // CORE036: Reset manual nav flag for auto-advance (enables streaming subtitles)
      wasManualNavRef.current = false

      // CORE032: 2D Auto-advance Logic
      // Try to go to next child first
      if (activeChildSlides.length > 0) {
        if (currentChildIndex === null) {
          setCurrentChildIndex(0)
          return
        } else if (currentChildIndex < activeChildSlides.length - 1) {
          setCurrentChildIndex(prev => prev + 1)
          return
        }
      }

      // If no more children, go to next parent
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1
        // If we reach the end, stop playing and mark slideshow as finished (F048)
        if (nextIndex >= visibleSlides.length) {
          setIsPlaying(false)
          hasFinishedSlideshowRef.current = true
          // Trigger state update outside setter for Socratic mode
          setTimeout(() => setSlideshowFinished(true), 0)
          return prev
        }
        setCurrentChildIndex(null) // Reset child index when moving to next parent
        return nextIndex
      })
    }, duration)

    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(timeoutId)
  }, [
    uiState,
    isPlaying,
    isVoiceAgentSpeaking,
    isSlideNarrationReady,
    isSlideNarrationPlaying,
    currentIndex,
    currentChildIndex,
    activeChildSlides.length,
    visibleSlides,
    displayedSlide,
    getSlideDuration,
  ])

  // Keyboard navigation for slideshow
  // Arrow keys navigate between slides, Space bar toggles play/pause
  useEffect(() => {
    // Only enable keyboard navigation during slideshow
    if (uiState !== UI_STATE.SLIDESHOW) {
      return
    }

    const handleKeyDown = (event) => {
      // Ignore keyboard events when user is typing in an input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return
      }

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault()
          goToNextSlide()
          break
        case 'ArrowLeft':
          event.preventDefault()
          goToPrevSlide()
          break
        case 'ArrowDown':
          event.preventDefault()
          goToChildNext()
          break
        case 'ArrowUp':
          event.preventDefault()
          goToChildPrev()
          break
        case ' ':
          // Space bar toggles play/pause
          event.preventDefault()
          togglePlayPause()
          break
        default:
          break
      }
    }

    // Add event listener
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup on unmount or state change
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [uiState, goToNextSlide, goToPrevSlide, togglePlayPause])

  // Start auto-play when entering slideshow state
  useEffect(() => {
    if (uiState === UI_STATE.SLIDESHOW && visibleSlides.length > 0) {
      setIsPlaying(true)
    }
  }, [uiState, visibleSlides.length])

  // Prefetch TTS for upcoming slides (limited to avoid rate limits)
  useEffect(() => {
    if (!activeTopic || allTopicSlides.length === 0) return
    if (uiState !== UI_STATE.SLIDESHOW && uiState !== UI_STATE.GENERATING) return
    // Only prefetch next few slides from current position to avoid rate limits
    const startIndex = Math.max(0, currentIndex)
    const slidesToPrefetch = allTopicSlides.slice(startIndex, startIndex + TTS_PREFETCH_CONFIG.MAX_PREFETCH_AHEAD + 1)
    prefetchSlideNarrationBatch(slidesToPrefetch)
  }, [activeTopic, allTopicSlides, uiState, currentIndex, prefetchSlideNarrationBatch])

  /**
   * F037: Restart audio when navigating to a new slide
   * Stops current audio and starts audio for the new slide from the beginning
   * CORE023, CORE024: Also cleans up slide response audio and highlight
   */
  useEffect(() => {
    // Only manage audio in slideshow state with valid slides
    if (uiState !== UI_STATE.SLIDESHOW || visibleSlides.length === 0) {
      // Stop any playing audio when leaving slideshow
      if (slideAudioRef.current) {
        slideAudioRef.current.pause()
        slideAudioRef.current = null
      }
      lastSlideIdRef.current = null
      setIsSlideNarrationPlaying(false)
      setIsSlideNarrationReady(false)
      setIsSlideNarrationLoading(false)
      resumeListeningAfterSlideRef.current = false
      // CORE023: Stop slide response audio when leaving slideshow
      if (slideResponseAudioRef.current) {
        slideResponseAudioRef.current.pause()
        slideResponseAudioRef.current = null
      }
      // CORE024: Clear highlight when leaving slideshow
      setHighlightPosition(null)
      return
    }

    const currentSlide = displayedSlide
    const getNextSlideForPrefetch = () => {
      if (activeChildSlides.length > 0) {
        if (currentChildIndex === null) {
          return activeChildSlides[0] || visibleSlides[currentIndex + 1]
        }
        if (currentChildIndex < activeChildSlides.length - 1) {
          return activeChildSlides[currentChildIndex + 1]
        }
      }
      return visibleSlides[currentIndex + 1]
    }
    if (!currentSlide) {
      lastSlideIdRef.current = null
      setIsSlideNarrationPlaying(false)
      setIsSlideNarrationReady(false)
      setIsSlideNarrationLoading(false)
      return
    }

    const slideId = currentSlide?.id || null
    const slideChanged = slideId !== lastSlideIdRef.current
    if (slideChanged) {
      lastSlideIdRef.current = slideId
      setIsSlideNarrationPlaying(false)
      setIsSlideNarrationReady(false)
      setIsSlideNarrationLoading(false)
    }

    // CORE023, CORE024: Stop slide response audio and clear highlight when navigating
    if (slideChanged) {
      if (slideAudioRef.current) {
        slideAudioRef.current.pause()
        slideAudioRef.current = null
      }
      if (slideResponseAudioRef.current) {
        slideResponseAudioRef.current.pause()
        slideResponseAudioRef.current = null
      }
      setHighlightPosition(null)
    }

    if (currentSlide?.type === 'header') {
      setIsSlideNarrationPlaying(false)
      setIsSlideNarrationReady(true)
      prefetchSlideAudio(getNextSlideForPrefetch())
      return
    }

    // Suggestions slide - no TTS to conserve quota
    if (currentSlide?.type === 'suggestions') {
      setIsSlideNarrationPlaying(false)
      setIsSlideNarrationReady(true)
      return
    }

    if (!isPlaying || isVoiceAgentSpeaking) {
      if (slideAudioRef.current && !slideAudioRef.current.paused) {
        slideAudioRef.current.pause()
      }
      setIsSlideNarrationPlaying(false)
      return
    }

    if (isListeningRef.current) {
      resumeListeningAfterSlideRef.current = true
      stopListeningRef.current?.()
    }

    if (slideAudioRef.current && !slideChanged) {
      setIsSlideNarrationReady(true)
      if (!slideAudioRef.current.paused && !slideAudioRef.current.ended) {
        wasManualNavRef.current = false // Reset so streaming works
        setIsSlideNarrationPlaying(true)
        return
      }
      if (!slideAudioRef.current.ended) {
        slideAudioRef.current.play().then(() => {
          wasManualNavRef.current = false // Reset so streaming works
          setIsSlideNarrationPlaying(true)
        }).catch((error) => {
          logger.warn('AUDIO', 'Slide audio resume failed', {
            error: error.message,
            slideId: currentSlide.id,
          })
          setIsSlideNarrationPlaying(false)
        })
        return
      }
    }

    let cancelled = false

    const playSlideAudio = async () => {
      let audioPayload = getCachedSlideAudio(currentSlide.id)
      const getRetryDelayMs = () => {
        const now = Date.now()
        const backoffRemaining = Math.max(0, ttsRateLimitUntilRef.current - now)
        const minIntervalRemaining = Math.max(
          0,
          TTS_PREFETCH_CONFIG.MIN_REQUEST_INTERVAL_MS - (now - lastTtsRequestTimeRef.current)
        )
        return Math.max(backoffRemaining, minIntervalRemaining)
      }

      if (!audioPayload) {
        if (slideAudioFailureRef.current.has(currentSlide.id)) {
          setIsSlideNarrationPlaying(false)
          setIsSlideNarrationReady(true)
          return
        }

        setIsSlideNarrationLoading(true)
        const maxAttempts = 2
        let attempts = 0
        while (!audioPayload?.audioUrl && attempts < maxAttempts) {
          attempts += 1
          audioPayload = await requestSlideAudio(currentSlide)
          if (cancelled) return

          if (audioPayload?.audioUrl || slideAudioFailureRef.current.has(currentSlide.id)) {
            break
          }

          if (attempts >= maxAttempts) {
            break
          }

          const retryDelay = getRetryDelayMs()
          if (retryDelay <= 0) {
            break
          }

          logger.debug('AUDIO', 'Delaying slide narration TTS retry', {
            slideId: currentSlide.id,
            retryMs: retryDelay,
          })

          await new Promise((resolve) => setTimeout(resolve, retryDelay))
          if (cancelled) return
        }
        setIsSlideNarrationLoading(false)
      }

      if (cancelled) return

      if (!audioPayload?.audioUrl) {
        setIsSlideNarrationPlaying(false)
        setIsSlideNarrationReady(true)
        // Force showAll for subtitles when TTS audio fails to load
        wasManualNavRef.current = true
        return
      }

      const audio = new Audio(audioPayload.audioUrl)
      slideAudioRef.current = audio
      // Don't set isSlideNarrationPlaying yet - wait for audio to actually start
      setIsSlideNarrationReady(true)

      // F071: Log audio playback start
      logger.debug('AUDIO', 'Starting slide narration playback', {
        slideId: currentSlide.id,
        slideIndex: currentIndex,
      })

      // Start from the beginning
      audio.currentTime = 0

      // SYNC FIX: Set playing state only when audio ACTUALLY starts playing
      // This ensures StreamingSubtitle animation is synchronized with audio
      const handlePlaying = () => {
        // Reset manual nav flag so streaming subtitles work instead of showAll
        wasManualNavRef.current = false
        setIsSlideNarrationPlaying(true)
        logger.debug('AUDIO', 'Audio playing event fired - subtitle sync started', {
          slideId: currentSlide.id,
        })
      }
      audio.addEventListener('playing', handlePlaying, { once: true })

      audio.onended = () => {
        setIsSlideNarrationPlaying(false)

        // Resume listening if conditions are met
        if (
          resumeListeningAfterSlideRef.current &&
          isMicEnabledRef.current &&
          allowAutoListenRef.current &&
          !isRaiseHandPendingRef.current &&
          !isProcessingRecordingRef.current
        ) {
          startListeningRef.current?.()
        }
        resumeListeningAfterSlideRef.current = false

        // Audio-driven slide advancement: advance after narration completes with a brief pause
        // Clear any existing transition timeout first
        if (slideTransitionTimeoutRef.current) {
          clearTimeout(slideTransitionTimeoutRef.current)
        }

        // Handle pause-after-slide for raise-hand flow
        if (pauseAfterCurrentSlideRef.current) {
          pauseAfterCurrentSlideRef.current = false
          setIsPlaying(false)
          return
        }

        // Only advance if still playing
        if (isPlayingRef.current) {
          slideTransitionTimeoutRef.current = setTimeout(() => {
            // CORE036: Reset manual nav flag for auto-advance (enables streaming subtitles)
            wasManualNavRef.current = false

            if (activeChildSlides.length > 0) {
              if (currentChildIndex === null) {
                setCurrentChildIndex(0)
                return
              }
              if (currentChildIndex < activeChildSlides.length - 1) {
                setCurrentChildIndex((prev) => prev + 1)
                return
              }
            }

            setCurrentIndex((prev) => {
              const nextIndex = prev + 1
              // If we reach the end, stop playing and mark slideshow as finished
              if (nextIndex >= visibleSlides.length) {
                setIsPlaying(false)
                hasFinishedSlideshowRef.current = true
                // Trigger state update outside setter for Socratic mode
                setTimeout(() => setSlideshowFinished(true), 0)
                return prev
              }
              setCurrentChildIndex(null)
              return nextIndex
            })
          }, SLIDE_TRANSITION_PAUSE_MS)
        }
      }
      audio.onerror = () => {
        audio.removeEventListener('playing', handlePlaying)
        setIsSlideNarrationPlaying(false)
        resumeListeningAfterSlideRef.current = false
      }
      audio.play().catch((error) => {
        // F071: Log autoplay blocked error
        logger.warn('AUDIO', 'Slide audio playback failed (autoplay may be blocked)', {
          error: error.message,
          slideId: currentSlide.id,
        })
        audio.removeEventListener('playing', handlePlaying)
        setIsSlideNarrationPlaying(false)
        resumeListeningAfterSlideRef.current = false
      })

      prefetchSlideAudio(getNextSlideForPrefetch())
    }

    playSlideAudio()

    // Cleanup on unmount or when slide changes
    return () => {
      cancelled = true
      if (slideAudioRef.current) {
        slideAudioRef.current.pause()
      }
      // Clear any pending transition timeout
      if (slideTransitionTimeoutRef.current) {
        clearTimeout(slideTransitionTimeoutRef.current)
        slideTransitionTimeoutRef.current = null
      }
    }
  }, [
    uiState,
    currentIndex,
    currentChildIndex,
    activeChildSlides,
    visibleSlides,
    displayedSlide,
    isPlaying,
    isVoiceAgentSpeaking,
    requestSlideAudio,
    prefetchSlideAudio,
    getCachedSlideAudio,
    enqueueVoiceAgentMessage,
  ])

  // Auto-trigger queued questions after slideshow ends (F048)
  // This creates a seamless learning flow where users can queue questions
  // during generation and have them automatically explored
  useEffect(() => {
    // Only trigger when slideshow just finished and there are queued questions
    if (!hasFinishedSlideshowRef.current || questionQueue.length === 0) {
      return
    }

    // Small delay before auto-triggering to let user see the final slide
    const timer = setTimeout(() => {
      // Get the next question from the queue
      const nextQuestion = questionQueue[0]

      // Remove it from the queue
      setQuestionQueue((prev) => prev.slice(1))

      // Reset the flags
      hasFinishedSlideshowRef.current = false
      setSlideshowFinished(false)

      // Trigger the question
      const runHandleQuestion = handleQuestionRef.current
      if (runHandleQuestion) {
        runHandleQuestion(nextQuestion)
      }
    }, 1500) // 1.5 second delay for natural transition

    return () => clearTimeout(timer)
  }, [questionQueue])

  // SOCRATIC-003: Trigger Socratic mode when slideshow finishes (no queued questions)
  useEffect(() => {
    // Only trigger when slideshow just finished and NO queued questions
    if (!slideshowFinished || questionQueue.length > 0) {
      return
    }

    // Don't trigger if we don't have an active topic
    if (!activeTopic) {
      return
    }

    // Use ref to avoid timer cancellation when visibleSlides updates from TTS persistence
    const slides = visibleSlidesRef.current
    if (!slides || slides.length === 0) {
      return
    }

    // Delay before transitioning to Socratic mode
    const timer = setTimeout(() => {
      // Prepare Socratic mode data (use ref for latest slides)
      const currentSlides = visibleSlidesRef.current
      if (!currentSlides || currentSlides.length === 0) return

      const contentSlides = currentSlides.filter(s => s.type !== 'header')
      if (contentSlides.length > 0) {
        setSocraticSlides(contentSlides)
        setSocraticTopicName(activeTopic.name || 'this topic')
        // Detect language from first slide subtitle
        const firstSubtitle = contentSlides[0]?.subtitle || ''
        const hasChineseChars = /[\u4e00-\u9fff]/.test(firstSubtitle)
        setSocraticLanguage(hasChineseChars ? 'zh' : 'en')

        // Reset flags and transition to Socratic mode
        hasFinishedSlideshowRef.current = false
        setSlideshowFinished(false)
        setUiState(UI_STATE.SOCRATIC)
      }
    }, 2000) // 2 second delay to let user absorb final slide

    return () => clearTimeout(timer)
  }, [slideshowFinished, questionQueue, activeTopic]) // Removed visibleSlides - using ref instead

  // SOCRATIC-003: Handle Socratic mode completion
  const handleSocraticComplete = useCallback(() => {
    setUiState(UI_STATE.HOME)
    setSocraticSlides([])
  }, [])

  // SOCRATIC-003: Handle Socratic skip
  const handleSocraticSkip = useCallback(() => {
    setUiState(UI_STATE.HOME)
    setSocraticSlides([])
  }, [])

  // SOCRATIC-003: Handle follow-up from Socratic feedback
  const handleSocraticFollowUp = useCallback((question) => {
    setUiState(UI_STATE.LISTENING)
    setSocraticSlides([])
    // Record Socratic answer for gamification
    recordSocraticAnswered()
    // Trigger the follow-up question
    const runHandleQuestion = handleQuestionRef.current
    if (runHandleQuestion) {
      runHandleQuestion(question)
    }
  }, [recordSocraticAnswered])

  /**
   * Analyzes audio frequency data to calculate overall audio level.
   * Uses the AnalyserNode to get real-time frequency data and computes
   * an average that drives the waveform visualization.
   * F071: Logs silence detection events
   */
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isListening) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Calculate average audio level from frequency data (0-255 range)
    const sum = dataArray.reduce((acc, val) => acc + val, 0)
    const average = sum / dataArray.length

    // Normalize to 0-100 scale for easier UI consumption
    const normalizedLevel = Math.min(100, (average / 255) * 100 * 2)
    setAudioLevel(normalizedLevel)

    // Speech detection: if audio level exceeds threshold, user is speaking
    const isSpeaking = average > AUDIO_CONFIG.SILENCE_THRESHOLD

    if (isSpeaking) {
      // User is speaking - record the time and update transcription status
      const now = Date.now()
      lastSpeechTimeRef.current = now
      if (!speechStartedAtRef.current) {
        speechStartedAtRef.current = now
      }
      speechFrameCountRef.current += 1
      setLiveTranscription('')

      // Clear any existing silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
    } else if (lastSpeechTimeRef.current) {
      // User was speaking but is now silent - check for silence duration
      const silenceDuration = Date.now() - lastSpeechTimeRef.current

      if (silenceDuration >= AUDIO_CONFIG.SILENCE_DURATION && !silenceTimerRef.current) {
        // F071: Log silence detection triggering generation
        logger.debug('AUDIO', 'Silence detected, triggering generation', {
          silenceDurationMs: silenceDuration,
          threshold: AUDIO_CONFIG.SILENCE_DURATION,
        })
        // Silence threshold exceeded - trigger generation
        setLiveTranscription('Processing...')
        silenceTimerRef.current = setTimeout(() => {
          handleVoiceComplete()
        }, 100) // Small delay to ensure we capture any trailing audio
      }
    }

    // Continue the animation loop
    animationFrameRef.current = requestAnimationFrame(analyzeAudio)
  }, [isListening])

  /**
   * Starts the audio analysis loop when listening begins.
   * This effect manages the requestAnimationFrame cycle.
   */
  useEffect(() => {
    if (isListening && analyserRef.current) {
      analyzeAudio()
    }

    return () => {
      // Cancel animation frame on cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isListening, analyzeAudio])

  /**
   * Stops voice recording and cleans up audio resources.
   * Called when user manually stops or when silence is detected.
   * F071: Logs recording stop event
   */
  const stopListening = useCallback(() => {
    // F071: Log recording stop
    logger.info('AUDIO', 'Recording stopped')

    setIsListening(false)
    setAudioLevel(0)

    // Stop the media recorder if it's recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    // Stop all tracks in the media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Close the audio context to free resources
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Clear any pending timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    analyserRef.current = null
    mediaRecorderRef.current = null
    lastSpeechTimeRef.current = null
    speechStartedAtRef.current = null
    speechFrameCountRef.current = 0
  }, [])

  stopListeningRef.current = stopListening

  // Cleanup audio resources when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all audio resources on unmount
      // Direct cleanup without calling stopListening to avoid stale closure
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (voiceAgentAudioRef.current) {
        voiceAgentAudioRef.current.pause()
        voiceAgentAudioRef.current = null
      }
      // Cleanup generation-related refs
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (stillWorkingTimerRef.current) {
        clearTimeout(stillWorkingTimerRef.current)
      }
    }
  }, [])

  /**
   * Starts voice capture by requesting microphone permission and
   * initializing Web Audio API components for analysis and recording.
   * F071: Logs recording start and permission events
   */
  const startListening = useCallback(async () => {
    if (isStartingListeningRef.current || isListeningRef.current) {
      return
    }

    isStartingListeningRef.current = true
    logger.debug('AUDIO', 'Requesting microphone permission')

    try {
      // Request microphone permission with audio-only constraint
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Permission granted - update state
      setPermissionState(PERMISSION_STATE.GRANTED)
      streamRef.current = stream

      // F071: Log recording start with audio configuration
      logger.info('AUDIO', 'Recording started', {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: stream.getAudioTracks()[0]?.getSettings()?.sampleRate || 'unknown',
      })

      // Create audio context for real-time analysis
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = audioContext

      // Create analyser node for frequency data (drives waveform visualization)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = AUDIO_CONFIG.FFT_SIZE
      analyser.smoothingTimeConstant = 0.8 // Smooth out rapid changes
      analyserRef.current = analyser

      // Connect microphone stream to analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      // Note: We don't connect to destination to avoid feedback

      // Create MediaRecorder for capturing audio chunks
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      })
      mediaRecorderRef.current = mediaRecorder

      // Collect audio chunks as they become available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Handle recording stop
      mediaRecorder.onstop = () => {
        // Audio blob could be created here for processing:
        // const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      }

      // Reset state for new recording session before any chunks arrive
      audioChunksRef.current = []

      // Start recording with timeslice for periodic data chunks
      mediaRecorder.start(100) // Emit data every 100ms
      lastSpeechTimeRef.current = null
      speechStartedAtRef.current = null
      speechFrameCountRef.current = 0
      isProcessingRecordingRef.current = false
      setIsListening(true)
      setLiveTranscription('')
    } catch (error) {
      // Handle permission denial or other errors
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionState(PERMISSION_STATE.DENIED)
        // F071: Log permission denied
        logger.warn('AUDIO', 'Microphone permission denied by user')
      } else {
        // F071: Log other audio errors
        logger.error('AUDIO', 'Failed to access microphone', {
          errorName: error.name,
          errorMessage: error.message,
        })
      }
    } finally {
      isStartingListeningRef.current = false
    }
  }, [])

  startListeningRef.current = startListening

  /**
   * Auto-start listening when enabled and no narration is playing.
   * Only auto-listen in LISTENING state to avoid background recording.
   */
  useEffect(() => {
    if (!allowAutoListen || !isMicEnabled) return
    if (permissionState === PERMISSION_STATE.DENIED) return
    if (isListening || isRaiseHandPending || isVoiceAgentSpeaking || isSlideNarrationPlaying) return
    if (voiceAgentQueue.length > 0) return
    if (isProcessingRecordingRef.current) return
    if (uiState !== UI_STATE.LISTENING) return

    startListening()
  }, [
    allowAutoListen,
    isMicEnabled,
    permissionState,
    isListening,
    isRaiseHandPending,
    isVoiceAgentSpeaking,
    isSlideNarrationPlaying,
    voiceAgentQueue.length,
    uiState,
    startListening,
  ])

  /**
   * Handles completion of voice recording.
   * Stops recording, sends audio to STT API, and triggers generation.
   * F027: Sends audio to backend STT endpoint
   * F028: Displays transcription status and result
   * F030: Triggers generation with transcribed text
   */
  const handleVoiceComplete = useCallback(async () => {
    if (isProcessingRecordingRef.current) {
      logger.debug('AUDIO', 'Recording already processing, skipping duplicate completion')
      return
    }
    isProcessingRecordingRef.current = true
    try {
      const scheduleNoSpeechRetry = (message) => {
        if (isMicEnabledRef.current && emptyTranscriptRetryRef.current < AUDIO_CONFIG.NO_SPEECH_RETRY_MAX) {
          emptyTranscriptRetryRef.current += 1
          setLiveTranscription(message)
          const delay = AUDIO_CONFIG.NO_SPEECH_RETRY_DELAY_MS * emptyTranscriptRetryRef.current
          setTimeout(() => {
            if (!isMicEnabledRef.current) return
            raiseHandRequestRef.current = false
            startListeningRef.current?.()
          }, delay)
          return true
        }
        return false
      }

      // Capture MIME type before cleanup (refs will be cleared by stopListening)
      const recorder = mediaRecorderRef.current
      const mimeType = recorder?.mimeType || 'audio/webm'

      // Stop recording and wait for the final dataavailable before reading chunks
      if (recorder && recorder.state === 'recording') {
        await new Promise((resolve) => {
          const handleStop = () => resolve()
          recorder.addEventListener('stop', handleStop, { once: true })
          recorder.stop()
        })
      }

      // Copy chunks AFTER stop so we get the final chunk from ondataavailable
      const chunks = [...audioChunksRef.current]

      const speechStartedAt = speechStartedAtRef.current
      const speechEndedAt = lastSpeechTimeRef.current
      const speechDurationMs = speechStartedAt && speechEndedAt
        ? Math.max(0, speechEndedAt - speechStartedAt)
        : 0
      const hasSpeech = speechStartedAt
        && speechDurationMs >= AUDIO_CONFIG.MIN_SPEECH_DURATION_MS
        && speechFrameCountRef.current >= AUDIO_CONFIG.MIN_SPEECH_FRAMES

      // Clean up audio resources (this also tries to stop, but recorder is already stopped)
      stopListening()

      // Play confirmation sound to indicate recording complete
      playRecordingCompleteSound()

      if (!hasSpeech) {
        logger.warn('AUDIO', 'No speech detected, skipping transcription', {
          speechDurationMs,
          speechFrames: speechFrameCountRef.current,
        })
        if (scheduleNoSpeechRetry('Didn’t catch that. Listening again...')) return
        setLiveTranscription('No question detected. Tap to try again.')
        return
      }

      // F027: Validate audio was captured
      if (chunks.length === 0) {
        logger.warn('AUDIO', 'No audio chunks captured, cannot transcribe')
        setLiveTranscription('No audio captured. Please try again.')
        return
      }

      // Create audio blob from collected chunks
      const audioBlob = new Blob(chunks, { type: mimeType })

      // F027: Validate audio size (min ~0.5s, max 10MB matching backend)
      if (audioBlob.size < AUDIO_CONFIG.MIN_AUDIO_SIZE) {
        logger.debug('AUDIO', 'Audio too short, skipping transcription', {
          size: audioBlob.size,
          minSize: AUDIO_CONFIG.MIN_AUDIO_SIZE,
        })
        if (scheduleNoSpeechRetry('Recording too short. Listening again...')) return
        setLiveTranscription('Recording too short. Please speak longer.')
        return
      }

      if (audioBlob.size > AUDIO_CONFIG.MAX_AUDIO_SIZE) {
        logger.warn('AUDIO', 'Audio too large, skipping transcription', {
          size: audioBlob.size,
          maxSize: AUDIO_CONFIG.MAX_AUDIO_SIZE,
        })
        setLiveTranscription('Recording too long. Please try a shorter question.')
        return
      }

      logger.info('AUDIO', 'Sending audio to STT API', {
        size: `${(audioBlob.size / 1024).toFixed(2)}KB`,
        mimeType,
        chunks: chunks.length,
      })

      // F028: Show transcribing status
      setLiveTranscription('Transcribing...')

      // Create FormData with the audio blob (field name 'audio' as expected by backend)
      // Extract clean extension from MIME type (handles 'audio/webm;codecs=opus')
      const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm'
      const formData = new FormData()
      formData.append('audio', audioBlob, `recording.${extension}`)

      // F027: POST to transcription endpoint
      logger.time('API', 'transcribe-request')
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      logger.timeEnd('API', 'transcribe-request')

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        logger.error('API', 'Transcription request failed', {
          status: response.status,
          error: errorData.error,
        })

        // F028: Show user-friendly error message
        if (response.status === 503) {
          setLiveTranscription('Transcription service unavailable. Please try again.')
        } else if (response.status === 429) {
          setLiveTranscription('Too many requests. Please wait a moment.')
        } else if (response.status === 400) {
          setLiveTranscription(errorData.error || 'Invalid audio. Please try again.')
        } else {
          setLiveTranscription('Transcription failed. Please try again.')
        }
        return
      }

      // Parse successful response
      const data = await response.json()

      logger.info('AUDIO', 'Transcription received', {
        transcriptionLength: data.transcription?.length || 0,
      })

      // F028: Check for empty transcription
      if (!data.transcription || data.transcription.trim() === '') {
        logger.warn('AUDIO', 'Empty transcription received')
        if (scheduleNoSpeechRetry('Didn’t catch that. Listening again...')) return
        setLiveTranscription('No question detected. Tap to try again.')
        return
      }

      const transcription = data.transcription.trim()

      if (isTrivialTranscription(transcription)) {
        logger.warn('AUDIO', 'Trivial transcription ignored', { transcription })
        setLiveTranscription('No question detected. Please try again.')
        return
      }

      // F028: Display the transcription result
      setLastTranscription(transcription)
      setLiveTranscription(transcription)

      logger.info('AUDIO', 'Triggering generation with transcription', {
        query: transcription,
      })

      // F030: Trigger generation with the actual transcribed text
      // Use a ref to avoid stale closures while keeping this callback stable.
      const runHandleQuestion = handleQuestionRef.current || handleQuestion
      runHandleQuestion(transcription, { source: 'voice' })
    } catch (error) {
      // Handle network errors
      logger.error('API', 'Transcription network error', {
        error: error.message,
      })
      setLiveTranscription('Connection error. Please check your network.')
    } finally {
      isProcessingRecordingRef.current = false
    }
  }, [stopListening])

  /**
   * Cancel a raise-hand request or active listening session.
   */
  const cancelRaiseHand = useCallback(() => {
    raiseHandRequestRef.current = false
    setIsRaiseHandPending(false)
    isProcessingRecordingRef.current = false

    if (isListening) {
      stopListening()
      setLiveTranscription('')
    }
  }, [isListening, stopListening])

  /**
   * Raise-hand flow: interrupt narration and listen immediately.
   */
  const handleRaiseHandClick = useCallback(() => {
    if (isMicEnabled) {
      setIsMicEnabled(false)
      cancelRaiseHand()
      return
    }

    setIsMicEnabled(true)
    setAllowAutoListen(true)
    raiseHandRequestRef.current = false
    setIsRaiseHandPending(false)
    emptyTranscriptRetryRef.current = 0
    setVoiceAgentQueue([])
    interruptActiveAudio()

    if (uiState === UI_STATE.SLIDESHOW) {
      pauseAfterCurrentSlideRef.current = false
      setIsPlaying(false)

      const currentSlide = visibleSlides[currentIndex]
      if (currentSlide) {
        const resumePoint = {
          topicId: currentSlide.topicId || null,
          slideIndex: currentIndex,
        }
        setInterruptResumePoint(resumePoint)
        logger.info('AUDIO', 'Raise hand: stored resume point', {
          slideIndex: currentIndex,
          topicId: resumePoint.topicId,
        })
      }
    }

    playMicOnSound()
    startListening()
  }, [
    isMicEnabled,
    cancelRaiseHand,
    uiState,
    visibleSlides,
    currentIndex,
    startListening,
    interruptActiveAudio,
  ])

  /**
   * Classify a query to determine if it's a follow-up, new topic, slide question, or chitchat
   * CORE023: Added slide_question classification support
   * F068: Logs API request and response
   * @param {string} query - The user's question
   * @param {AbortSignal} signal - AbortController signal for cancellation (F053)
   * @returns {Promise<{classification: string, shouldEvictOldest: boolean, evictTopicId: string|null, responseText?: string}>}
   */
  const classifyQuery = async (query, signal) => {
    const activeTopicId = activeTopic?.id || null

    // F068: Start timing for classify API
    logger.time('API', 'classify-request')
    logger.info('API', 'POST /api/classify', {
      endpoint: '/api/classify',
      method: 'POST',
      activeTopicId,
    })

    // CORE023: Get current slide context for slide_question detection
    // Only include context if we're in slideshow state with a valid content slide
    const currentSlide = uiState === UI_STATE.SLIDESHOW &&
      activeTopic &&
      visibleSlides[currentIndex] &&
      visibleSlides[currentIndex].type !== 'header'
      ? {
          subtitle: visibleSlides[currentIndex].subtitle || '',
          topicName: activeTopic.name,
        }
      : null

    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          activeTopicId,
          activeTopic: activeTopic
            ? {
                name: activeTopic.name,
                icon: activeTopic.icon,
              }
            : null,
          conversationHistory: [], // Could be enhanced with actual history
          topicCount: topics.length,
          oldestTopicId: topics.length > 0 ? topics[0].id : null,
          // CORE023: Include current slide context for slide_question detection
          currentSlide,
        }),
        signal,
      })

      // F068: Log response status and timing
      logger.timeEnd('API', 'classify-request')

      if (!response.ok) {
        logger.error('API', 'Classify request failed', {
          endpoint: '/api/classify',
          status: response.status,
        })
        throw new Error(`Classify API failed: ${response.status}`)
      }

      const result = await response.json()
      logger.info('API', 'Classify response received', {
        classification: result.classification,
        status: response.status,
      })

      return result
    } catch (error) {
      // Re-throw abort errors to be handled upstream
      if (error.name === 'AbortError') {
        logger.debug('API', 'Classify request aborted by user')
        throw error
      }
      // F068: Log classification error
      logger.error('API', 'Classification request failed', {
        endpoint: '/api/classify',
        error: error.message,
      })
      // Default to new topic on error
      return {
        classification: 'new_topic',
        shouldEvictOldest: false,
        evictTopicId: null,
      }
    }
  }

  /**
   * Request a short chitchat response from the backend.
   * @param {string} query - The user's message
   * @param {AbortSignal} signal - AbortController signal for cancellation
   * @returns {Promise<{responseText: string}|null>}
   */
  const requestChitchatResponse = async (query, signal) => {
    logger.time('API', 'chitchat-request')
    logger.info('API', 'POST /api/chitchat', {
      endpoint: '/api/chitchat',
      method: 'POST',
    })

    try {
      const response = await fetch('/api/chitchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          activeTopicName: activeTopic?.name || '',
        }),
        signal,
      })

      logger.timeEnd('API', 'chitchat-request')

      if (!response.ok) {
        logger.warn('API', 'Chitchat request failed', {
          status: response.status,
        })
        return null
      }

      const result = await response.json()
      logger.info('API', 'Chitchat response received', {
        status: response.status,
      })

      return result
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.debug('API', 'Chitchat request aborted by user')
        throw error
      }
      logger.warn('API', 'Chitchat request failed', {
        error: error.message,
      })
      return null
    }
  }

  /**
   * Handle a user question (from voice or text input)
   * Classifies the query, handles follow-up vs new topic, manages slide cache
   * F015: Sends clientId to API for WebSocket progress updates
   * F039: Follow-up appends slides
   * F040: New topic creates header card
   * F041: Slide cache limits in-memory topics
   * F052: Network error shows retry option
   * F053: Generation timeout handled with AbortController
   */
  const handleQuestion = async (query, options = {}) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return
    const { source = 'text' } = options

    if (source !== 'voice' && uiState === UI_STATE.SLIDESHOW) {
      pauseAfterCurrentSlideRef.current = false
      interruptActiveAudio()
      setIsPlaying(false)
    }

    // Lower the hand after a question so listening only resumes on explicit raise.
    raiseHandRequestRef.current = false
    if (isRaiseHandPending) {
      setIsRaiseHandPending(false)
    }
    if (isMicEnabled) {
      setIsMicEnabled(false)
    }
    if (allowAutoListen) {
      setAllowAutoListen(false)
    }
    if (isListening) {
      stopListening()
    }

    if (uiState === UI_STATE.GENERATING || (isSlideRevealPending && uiState !== UI_STATE.SLIDESHOW)) {
      setQuestionQueue((prev) => [trimmedQuery, ...prev])
      showToast('Question queued')
      enqueueVoiceAgentMessage('Got it. I will answer that right after this.')
      return
    }

    if (uiState === UI_STATE.ERROR) {
      setUiState(UI_STATE.LISTENING)
    }

    setLastTranscription(trimmedQuery)
    if (source !== 'voice') {
      setLiveTranscription('')
    }
    setTextInput('')
    setErrorMessage('')

    // Create AbortController for timeout handling (F053)
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    // F072: Start timing for full generation pipeline
    logger.time('GENERATION', 'full-pipeline')

    try {
      // Classify the query to determine if it's a follow-up, new topic, slide question, or chitchat
      const classifyResult = await classifyQuery(trimmedQuery, signal)

      if (classifyResult.classification === 'chitchat') {
        try {
          const chitchatResult = await requestChitchatResponse(trimmedQuery, signal)
          const responseText = chitchatResult?.responseText ||
            classifyResult.responseText ||
            "I'm ready to help. What would you like to learn?"
          setVoiceAgentQueue([])
          enqueueVoiceAgentMessage(responseText, { priority: 'high' })
          logger.timeEnd('GENERATION', 'full-pipeline')
          return
        } catch (error) {
          if (error.name === 'AbortError') {
            setUiState(UI_STATE.LISTENING)
            return
          }
          const fallbackText = classifyResult.responseText ||
            "I'm ready to help. What would you like to learn?"
          setVoiceAgentQueue([])
          enqueueVoiceAgentMessage(fallbackText, { priority: 'high' })
          logger.timeEnd('GENERATION', 'full-pipeline')
          return
        }
      }

      // CORE032: Handle complexity for follow-ups
      if (classifyResult.classification === 'follow_up' && classifyResult.complexity) {
        const complexity = classifyResult.complexity
        logger.info('GENERATION', 'Handling follow-up with complexity', { complexity })

        if (complexity === 'trivial') {
          // Trivial: Voice only response (reuse slide_question logic or similar)
          logger.info('GENERATION', 'Trivial complexity - using verbal response')
          // Treat as slide_question for verbal-only flow
          classifyResult.classification = 'slide_question' 
          // (Fall through to slide_question handler below)
        } else if (complexity === 'complex') {
          // Complex: Voice choice/prompt
          logger.info('GENERATION', 'Complex complexity - asking for clarification')
          const complexPrompt = "That's a really big topic with many details. I can focus on the history, the mechanism, or real-world examples. Which would you like?"
          enqueueVoiceAgentMessage(complexPrompt, { priority: 'high' })
          setVoiceAgentQueue([])
          setUiState(UI_STATE.SLIDESHOW) // Return to slideshow if we were there, or listening
          logger.timeEnd('GENERATION', 'full-pipeline')
          return
        }
        // Simple/Moderate: Continue to generate/follow-up with complexity param
      }

      // CORE023, CORE024: Handle slide_question classification
      // This is a question about the current slide content - generate verbal response only
      if (classifyResult.classification === 'slide_question') {
        logger.info('API', 'Handling slide question (verbal response only)', {
          classification: 'slide_question',
        })

        // Clear the "Still working..." timer early since this is fast
        if (stillWorkingTimerRef.current) {
          clearTimeout(stillWorkingTimerRef.current)
          stillWorkingTimerRef.current = null
        }
        setIsStillWorking(false)

        // Get current slide context for the response
        const currentSlide = visibleSlides[currentIndex]
        const slideContext = {
          subtitle: currentSlide?.subtitle || '',
          topicName: activeTopic?.name || '',
        }

        // Call the respond API for verbal-only response
        // Use /api/generate/respond (it handles general verbal responses well)
        logger.time('API', 'respond-request')
        logger.info('API', 'POST /api/generate/respond', {
          endpoint: '/api/generate/respond',
          method: 'POST',
        })

        try {
          const response = await fetch('/api/generate/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: trimmedQuery,
              currentSlide: slideContext,
            }),
            signal,
          })

          logger.timeEnd('API', 'respond-request')

          if (!response.ok) {
            logger.error('API', 'Respond request failed', {
              status: response.status,
            })
            throw new Error(`Respond API failed: ${response.status}`)
          }

          const respondData = await response.json()
          logger.info('API', 'Respond API returned', {
            hasAudio: !!respondData.audioUrl,
            hasHighlight: !!respondData.highlight,
          })

          // CORE024: Show highlight overlay if coordinates were returned
          if (respondData.highlight) {
            setHighlightPosition(respondData.highlight)
            logger.debug('UI', 'Showing highlight overlay', respondData.highlight)
          }

          // CORE023: Play the verbal response audio
          if (respondData.audioUrl) {
            // Stop any existing slide response audio
            if (slideResponseAudioRef.current) {
              slideResponseAudioRef.current.pause()
            }

            const audio = new Audio(respondData.audioUrl)
            slideResponseAudioRef.current = audio

            // When audio ends, clear the highlight
            audio.onended = () => {
              logger.debug('UI', 'Slide response audio ended, clearing highlight')
              setHighlightPosition(null)
              slideResponseAudioRef.current = null
            }

            audio.onerror = () => {
              logger.warn('AUDIO', 'Slide response audio playback error')
              setHighlightPosition(null)
              slideResponseAudioRef.current = null
            }

            // Start playback
            audio.play().catch((err) => {
              logger.warn('AUDIO', 'Slide response autoplay blocked', { error: err.message })
              // Still clear highlight after expected duration if autoplay blocked
              setTimeout(() => {
                setHighlightPosition(null)
              }, respondData.duration || 3000)
            })
          } else {
            // No audio - clear highlight after a delay
            if (respondData.highlight) {
              setTimeout(() => {
                setHighlightPosition(null)
              }, respondData.duration || 3000)
            }
          }

          // Stay in slideshow state - no new slides generated
          logger.timeEnd('GENERATION', 'full-pipeline')
          setUiState(UI_STATE.SLIDESHOW)
          return // Early return - we're done handling slide_question

        } catch (error) {
          // Handle errors for slide question response
          if (error.name === 'AbortError') {
            logger.debug('API', 'Respond request aborted by user')
            setUiState(UI_STATE.LISTENING)
            return
          }
          logger.error('API', 'Slide question response failed', {
            error: error.message,
          })
          // Fall back to showing error state
          setLastFailedQuery(query)
          setErrorMessage('Could not answer your question. Please try again.')
          setUiState(UI_STATE.ERROR)
          return
        }
      }

      // Reset engagement from previous queries and transition to generating state
      setEngagement(null)
      setVoiceAgentQueue([])
      spokenFunFactRef.current = null
      clearFunFactRefresh()
      currentQueryRef.current = trimmedQuery // Store query for TTS-driven fun fact refresh
      setIsColdStart(false)
      setUiState(UI_STATE.GENERATING)

      // GAMIFY-003: Record activity for gamification
      recordQuestionAsked()
      setIsStillWorking(false)
      setIsPreparingFollowUp(false)
      setIsSlideRevealPending(false)
      enqueueVoiceAgentMessage(VOICE_AGENT_SCRIPT.GENERATION_START, { priority: 'high' })
      // F015: Reset generation progress for new query
      setGenerationProgress({ stage: null, message: '', slidesReady: 0, totalSlides: 0 })
      // Reset the slideshow finished flags when starting new generation
      hasFinishedSlideshowRef.current = false
      setSlideshowFinished(false)

      // Start "Still working..." timer (F053)
      stillWorkingTimerRef.current = setTimeout(() => {
        setIsStillWorking(true)
      }, GENERATION_TIMEOUT.STILL_WORKING_MS)

      // F068: Log engagement API request
      logger.time('API', 'engagement-request')
      logger.info('API', 'POST /api/generate/engagement', {
        endpoint: '/api/generate/engagement',
        method: 'POST',
      })

      // Start engagement call immediately for fast feedback
      const engagementPromise = fetch('/api/generate/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmedQuery, explanationLevel: selectedLevelRef.current }),
        signal,
      })
        .then((res) => {
          // F068: Log engagement response status
          logger.timeEnd('API', 'engagement-request')
          logger.info('API', 'Engagement response received', {
            status: res.status,
          })
          if (!res.ok) throw new Error(`Engagement API failed: ${res.status}`)
          return res.json()
        })
        .then((data) => {
          // Update engagement state immediately when it arrives
          if (abortControllerRef.current?.signal !== signal) return null
          setEngagement(data)
          // Return data so we can use suggestedQuestions for the suggestions slide
          return data
        })
        .catch((err) => {
          // Engagement failure is non-critical, log but continue
          // Ignore abort errors
          if (err.name !== 'AbortError') {
            // F068: Log engagement API error
            logger.warn('API', 'Engagement request failed (non-critical)', {
              error: err.message,
            })
          }
        })

      // TTS-driven refresh: fun fact refreshes after audio finishes (via onComplete callback)
      // No interval needed - refresh is triggered by refreshFunFact callback

      const isFollowUp = classifyResult.classification === 'follow_up'
      // Get parent slide for 2D navigation (follow-up slides nest under current slide)
      const followUpParentSlide = isFollowUp ? visibleSlides[currentIndex] : null
      const followUpParentId = followUpParentSlide && !['header', 'suggestions'].includes(followUpParentSlide.type)
        ? followUpParentSlide.id
        : null

      if (isFollowUp) {
        setIsPreparingFollowUp(true)
      }

      let generateData
      let newTopicData = null

      if (isFollowUp && activeTopic) {
        // F039: Follow-up query appends slides to current topic
        // F015: Include clientId for WebSocket progress updates
        // F068: Log follow-up API request
        logger.time('API', 'follow-up-request')
        logger.info('API', 'POST /api/generate/follow-up', {
          endpoint: '/api/generate/follow-up',
          method: 'POST',
          topicId: activeTopic.id,
        })

        const response = await fetch('/api/generate/follow-up', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: trimmedQuery,
            topicId: activeTopic.id,
            conversationHistory: [],
            clientId: wsClientId,
            explanationLevel: activeTopic.explanationLevel || selectedLevelRef.current,
            complexity: classifyResult.complexity, // CORE032
            parentId: followUpParentId, // CORE032: Current slide is parent when applicable
          }),
          signal,
        })

        // F068: Log follow-up response status
        logger.timeEnd('API', 'follow-up-request')
        logger.info('API', 'Follow-up response received', {
          status: response.status,
        })

        if (!response.ok) {
          logger.error('API', 'Follow-up request failed', {
            status: response.status,
          })
          throw new Error(`Follow-up API failed: ${response.status}`)
        }

        generateData = await response.json()
      } else {
        // F040: New topic - generate with header card
        // F015: Include clientId for WebSocket progress updates
        // F068: Log generate API request
        logger.time('API', 'generate-request')
        logger.info('API', 'POST /api/generate', {
          endpoint: '/api/generate',
          method: 'POST',
        })

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: trimmedQuery,
            topicId: null,
            conversationHistory: [],
            clientId: wsClientId,
            explanationLevel: selectedLevelRef.current,
          }),
          signal,
        })

        // F068: Log generate response status
        logger.timeEnd('API', 'generate-request')
        logger.info('API', 'Generate response received', {
          status: response.status,
        })

        if (!response.ok) {
          logger.error('API', 'Generate request failed', {
            status: response.status,
          })
          throw new Error(`Generate API failed: ${response.status}`)
        }

        generateData = await response.json()
        newTopicData = generateData.topic
      }

      // Clear the "Still working..." timer on success (F053)
      if (stillWorkingTimerRef.current) {
        clearTimeout(stillWorkingTimerRef.current)
        stillWorkingTimerRef.current = null
      }
      setIsStillWorking(false)
      setIsPreparingFollowUp(false)
      setIsSlideRevealPending(false)

      // Wait for engagement to complete before transitioning (if still pending)
      // Get the engagement data for suggested questions
      const engagementData = await engagementPromise

      setIsPreparingFollowUp(false)

      // Extract suggested questions for the suggestions slide
      const suggestedQuestions = engagementData?.suggestedQuestions || []

      // Update state based on whether it's a follow-up or new topic
      if (isFollowUp && activeTopic && generateData.slides?.length > 0) {
        // F039: Append new slides to current topic, navigate to first new slide
        const previousSlideCount = activeTopic.slides?.length || 0
        const previousChildCount = followUpParentId
          ? (activeTopic.slides || []).filter((slide) => slide?.parentId === followUpParentId).length
          : 0
        // Calculate the target index from actual slide counts, not stale visibleSlides
        // visibleSlides = header + top-level slides (no parentId)
        const previousTopLevelCount = (activeTopic.slides || []).filter(s => !s.parentId).length
        const firstNewTopLevelIndex = 1 + previousTopLevelCount // +1 for header slide
        const safeParentIndex = Math.min(
          currentIndex,
          Math.max(1 + previousTopLevelCount - 1, 0) // Ensure we don't exceed current slides
        )
        const now = Date.now()
        // Create section divider for top-level follow-ups (not nested children)
        const sectionDivider = !followUpParentId
          ? createSectionDivider(activeTopic.id, trimmedQuery)
          : null
        const nextSlides = [
          ...(activeTopic.slides || []),
          ...(sectionDivider ? [sectionDivider] : []),
          ...generateData.slides,
        ]

        // F073: Log follow-up slide append
        logger.info('STATE', 'Appending slides to existing topic', {
          topicId: activeTopic.id,
          topicName: activeTopic.name,
          newSlidesCount: generateData.slides.length,
          previousSlidesCount: previousSlideCount,
        })

        // Get current version ID for persistence
        const currentVersion = activeTopic.versions?.[activeTopic.currentVersionIndex ?? 0]
        persistTopicSlides(activeTopic.id, nextSlides, currentVersion?.id)

        setTopics((prev) => {
          const updated = prev.map((topic) => {
            if (topic.id !== activeTopic.id) return topic
            const versionIndex = topic.currentVersionIndex ?? 0
            const updatedVersions = Array.isArray(topic.versions)
              ? topic.versions.map((v, idx) =>
                  idx === versionIndex ? { ...v, slides: nextSlides } : v
                )
              : topic.versions
            return {
              ...topic,
              slides: nextSlides,
              versions: updatedVersions,
              suggestedQuestions,
              lastAccessedAt: now,
            }
          })
          return pruneSlideCache(updated, activeTopic.id)
        })

        // Navigate to the first new slide after appending (header + previous slides)
        if (followUpParentId) {
          setCurrentIndex(safeParentIndex)
          setCurrentChildIndex(previousChildCount)
        } else {
          setCurrentChildIndex(null)
          setCurrentIndex(firstNewTopLevelIndex)
        }
        // F072: End timing for full generation pipeline
        logger.timeEnd('GENERATION', 'full-pipeline')
        // Prefetch TTS for first new slide before transitioning
        await queueSlidesReadyTransition(generateData.slides, 0)

      } else if (newTopicData && generateData.slides?.length > 0) {
        // F040: Create new topic with header card
        const now = Date.now()
        const initialLevel = selectedLevelRef.current

        const newTopic = {
          id: newTopicData.id,
          name: newTopicData.name,
          icon: newTopicData.icon,
          query: trimmedQuery, // Store original query for regeneration feature
          headerSlide: createHeaderSlide(newTopicData),
          slides: generateData.slides,
          suggestedQuestions, // Add suggestions for end-of-slideshow card
          explanationLevel: initialLevel, // Store the level used for this topic
          createdAt: now,
          lastAccessedAt: now,
          // Initialize versions array with the first version
          versions: [{
            id: `v_${newTopicData.id}_${now}`,
            explanationLevel: initialLevel,
            slides: generateData.slides,
            createdAt: now,
          }],
          currentVersionIndex: 0,
        }

        // F073: Log new topic creation
        logger.info('STATE', 'Creating new topic', {
          topicId: newTopic.id,
          topicName: newTopic.name,
          topicIcon: newTopic.icon,
          slidesCount: generateData.slides.length,
        })

        // Persist slides with the initial version ID
        const initialVersionId = newTopic.versions[0].id
        persistTopicSlides(newTopic.id, newTopic.slides, initialVersionId)

        // Add the new topic
        setTopics((prev) => pruneSlideCache([newTopic, ...prev], newTopic.id))

        // Set the new topic as active and show its header slide
        setActiveTopicId(newTopic.id)
        setCurrentIndex(0)
        // F072: End timing for full generation pipeline
        logger.timeEnd('GENERATION', 'full-pipeline')
        // Prefetch TTS for first content slide before transitioning
        await queueSlidesReadyTransition(generateData.slides, 0)

      } else {
        // No slides returned - stay in generating state with a message
        logger.warn('GENERATION', 'No slides returned from API')
        setUiState(UI_STATE.LISTENING)
      }
    } catch (error) {
      // Clear timers on error (F053)
      if (stillWorkingTimerRef.current) {
        clearTimeout(stillWorkingTimerRef.current)
        stillWorkingTimerRef.current = null
      }
      setIsStillWorking(false)

      // Handle abort/cancellation (F053)
      if (error.name === 'AbortError') {
        // F068: Log user cancellation
        logger.debug('API', 'Request cancelled by user')
        setUiState(UI_STATE.LISTENING)
        return
      }

      // Handle network errors (F052)
      // F068: Log generation error with full context
      logger.error('API', 'Generation request failed', {
        error: error.message,
        errorName: error.name,
      })
      setLastFailedQuery(query)
      setErrorMessage('Something went wrong. Please check your connection and try again.')
      setUiState(UI_STATE.ERROR)
    }
  }

  useEffect(() => {
    handleQuestionRef.current = handleQuestion
  }, [handleQuestion])

  const handleTextSubmit = (e) => {
    e.preventDefault()
    handleQuestion(textInput)
  }

  const handleExampleClick = (question) => {
    handleQuestion(question)
  }

  /**
   * Handle "New Topic" button click from sidebar (CORE017)
   * Returns to home state to select level and start fresh topic
   */
  const handleNewTopic = useCallback(() => {
    // Transition to home state to select level
    setUiState(UI_STATE.HOME)
    setActiveTopicId(null) // Clear selection - no topic active on HOME
    setLiveTranscription('')
    setTextInput('')
    setEngagement(null)
    setShowTextFallback(false)
    // Don't reset cold start flag - that's for first-time users only
  }, [])

  /**
   * Handle suggestion click from suggestions slide
   * Triggers a follow-up query with the selected question
   */
  const handleSuggestionClick = useCallback((question) => {
    if (!question) return
    // Trigger the generation pipeline with the selected question
    handleQuestion(question, { source: 'suggestion' })
  }, [handleQuestion])

  /**
   * Handle topic navigation from sidebar (CORE017)
   * Switches the active topic and navigates to its header slide.
   * Shows loading screen while preparing TTS for first content slide.
   * @param {string} topicId - ID of the topic to navigate to
   */
  const handleNavigateToTopic = useCallback(async (topicId) => {
    if (!topicId) return
    const targetTopic = topics.find((topic) => topic.id === topicId)
    const needsSlides = !targetTopic?.slides || targetTopic.slides.length === 0
    // Use loadSlidesForTopic to try version-specific storage first, then legacy
    const cachedSlides = needsSlides ? loadSlidesForTopic(targetTopic) : null
    const now = Date.now()

    if (needsSlides && !cachedSlides) {
      const currentVersionId = targetTopic?.versions?.[targetTopic.currentVersionIndex ?? 0]?.id
      void fetchSlidesFromServer(topicId, currentVersionId)
    }

    // Get the slides we'll be showing
    const slidesToShow = cachedSlides || targetTopic?.slides || []

    // Find all content slides that need TTS
    const contentSlides = slidesToShow.filter((slide) =>
      slide.type !== 'header' &&
      slide.type !== 'section' &&
      slide.type !== 'suggestions' &&
      slide.subtitle
    )

    // Check how many slides need TTS loading
    const slidesNeedingTts = contentSlides.filter((slide) =>
      !slideAudioCacheRef.current.has(slide.id) &&
      !(slide.audioUrl && slide.audioUrl.startsWith('data:'))
    )

    const firstSlideNeedingTts = slidesNeedingTts[0] || null
    // Show loading state only for the first content slide we need to narrate
    const needsLoading = !!firstSlideNeedingTts
    if (needsLoading) {
      setIsLoadingTopicAudio(true)
      setLoadingTopicProgress(10)
    }

    setTopics((prev) => {
      const updated = prev.map((topic) => {
        if (topic.id !== topicId) return topic
        const versionIndex = topic.currentVersionIndex ?? 0
        const updatedVersions = cachedSlides && Array.isArray(topic.versions)
          ? topic.versions.map((v, idx) => (
              idx === versionIndex ? { ...v, slides: cachedSlides } : v
            ))
          : topic.versions
        return {
          ...topic,
          slides: needsSlides ? (cachedSlides || topic.slides) : topic.slides,
          versions: updatedVersions,
          lastAccessedAt: now,
          headerSlide: topic.headerSlide || createHeaderSlide(topic),
        }
      })
      return pruneSlideCache(updated, topicId)
    })

    setActiveTopicId(topicId)
    wasManualNavRef.current = true // CORE036: Mark as manual navigation
    setCurrentIndex(0)

    // If TTS needs loading, load the first content slide before showing slideshow
    if (needsLoading && firstSlideNeedingTts) {
      logger.info('AUDIO', 'Loading initial TTS for historical topic', {
        topicId,
        slideId: firstSlideNeedingTts.id,
      })

      try {
        setLoadingTopicProgress(60)
        const audioPayload = await requestSlideAudio(firstSlideNeedingTts)
        setLoadingTopicProgress(100)
        if (!audioPayload?.audioUrl) {
          logger.warn('AUDIO', 'Initial TTS not ready for historical topic', {
            topicId,
            slideId: firstSlideNeedingTts.id,
          })
        } else {
          logger.info('AUDIO', 'Initial TTS ready for historical topic', {
            topicId,
            slideId: firstSlideNeedingTts.id,
          })
        }
      } catch (err) {
        logger.warn('AUDIO', 'TTS load failed for historical topic', {
          slideId: firstSlideNeedingTts.id,
          error: err?.message,
        })
      }

      setIsLoadingTopicAudio(false)
      setLoadingTopicProgress(0)
    }

    // Switch to slideshow state
    if (uiState !== UI_STATE.SLIDESHOW && topics.length > 0) {
      setUiState(UI_STATE.SLIDESHOW)
    }
  }, [uiState, topics, pruneSlideCache, fetchSlidesFromServer, requestSlideAudio])

  /**
   * Handle topic rename from sidebar
   * @param {string} topicId - ID of the topic to rename
   * @param {string} newName - New name for the topic
   */
  const handleRenameTopic = useCallback((topicId, newName) => {
    if (!topicId || !newName) return

    setTopics((prev) =>
      prev.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              name: newName,
              // Update header slide with new name
              headerSlide: topic.headerSlide
                ? { ...topic.headerSlide, subtitle: newName }
                : null,
            }
          : topic
      )
    )
    logger.info('STATE', 'Topic renamed', { topicId, newName })
  }, [])

  /**
   * Handle topic deletion from sidebar
   * @param {string} topicId - ID of the topic to delete
   */
  const handleDeleteTopic = useCallback((topicId) => {
    if (!topicId) return

    // Remove topic from state
    setTopics((prev) => prev.filter((topic) => topic.id !== topicId))

    // Clear cached slides for this topic
    removeTopicSlides(topicId)

    // If deleting the active topic, switch to another topic or listening state
    if (activeTopicId === topicId) {
      const remainingTopics = topics.filter((topic) => topic.id !== topicId)
      if (remainingTopics.length > 0) {
        // Switch to the most recently accessed remaining topic
        const sortedByAccess = [...remainingTopics].sort(
          (a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0)
        )
        setActiveTopicId(sortedByAccess[0].id)
        setCurrentIndex(0)
      } else {
        // No topics left, go to home state
        setActiveTopicId(null)
        setUiState(UI_STATE.HOME)
        setIsColdStart(true)
      }
    }

    logger.info('STATE', 'Topic deleted', { topicId })
  }, [activeTopicId, topics])

  /**
   * Handle regeneration of a topic at a different explanation level.
   * Creates a new version with the regenerated slides while preserving previous versions.
   * @param {string} level - The explanation level to regenerate at
   */
  const handleRegenerate = useCallback(async (level) => {
    if (!activeTopic || !activeTopic.query || isRegenerating) {
      logger.warn('REGENERATE', 'Cannot regenerate: missing topic, query, or already regenerating')
      return
    }

    const topicId = activeTopic.id
    const query = activeTopic.query

    logger.info('REGENERATE', 'Starting regeneration', {
      topicId,
      query,
      newLevel: level,
      currentLevel: getCurrentVersionLevel(activeTopic),
    })

    setIsRegenerating(true)
    regeneratingTopicIdRef.current = topicId

    // Create abort controller for this request
    const abortController = new AbortController()
    const signal = abortController.signal

    try {
      // Call the generate API with the new level
      logger.time('API', 'regenerate-request')
      logger.info('API', 'POST /api/generate (regenerate)', {
        endpoint: '/api/generate',
        method: 'POST',
        topicId,
        level,
      })

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          topicId: null, // Treat as new generation for the topic
          conversationHistory: [],
          clientId: wsClientId,
          explanationLevel: level,
        }),
        signal,
      })

      logger.timeEnd('API', 'regenerate-request')
      logger.info('API', 'Regenerate response received', {
        status: response.status,
      })

      if (!response.ok) {
        throw new Error(`Regenerate API failed: ${response.status}`)
      }

      const generateData = await response.json()

      // Verify the topic hasn't changed during regeneration
      if (regeneratingTopicIdRef.current !== topicId) {
        logger.warn('REGENERATE', 'Topic changed during regeneration, discarding results')
        return
      }

      if (!generateData.slides || generateData.slides.length === 0) {
        logger.warn('REGENERATE', 'No slides returned from regeneration')
        setIsRegenerating(false)
        regeneratingTopicIdRef.current = null
        return
      }

      // Create new version with the regenerated slides
      const now = Date.now()
      const newVersion = {
        id: `v_${topicId}_${now}`,
        explanationLevel: level,
        slides: generateData.slides,
        createdAt: now,
      }

      // Update the topic with the new version
      setTopics((prev) => {
        return prev.map((topic) => {
          if (topic.id !== topicId) return topic

          // Get existing versions or create array with current slides as v1
          let versions = topic.versions ? [...topic.versions] : []

          // If no versions exist, create initial version from current slides
          if (versions.length === 0 && topic.slides && topic.slides.length > 0) {
            versions.push({
              id: `v_${topicId}_initial`,
              explanationLevel: topic.explanationLevel || EXPLANATION_LEVEL.STANDARD,
              slides: topic.slides,
              createdAt: topic.createdAt || now,
            })
          }

          // Add the new version
          versions.push(newVersion)

          // Enforce max versions limit (remove oldest, keeping most recent)
          if (versions.length > MAX_VERSIONS_PER_TOPIC) {
            versions = versions.slice(-MAX_VERSIONS_PER_TOPIC)
          }

          // Set the new version as current (last index)
          const newVersionIndex = versions.length - 1

          logger.info('REGENERATE', 'Created new version', {
            topicId,
            versionId: newVersion.id,
            level,
            totalVersions: versions.length,
            newVersionIndex,
          })

          return {
            ...topic,
            versions,
            currentVersionIndex: newVersionIndex,
            // Also update topic-level slides for backward compatibility
            slides: generateData.slides,
            explanationLevel: level,
            lastAccessedAt: now,
          }
        })
      })

      // Persist the new slides with version ID for version-specific storage
      persistTopicSlides(topicId, generateData.slides, newVersion.id)

      // Reset to first slide (header) to show the new version
      setCurrentIndex(0)

      // Show success toast
      setToast({
        visible: true,
        message: `Regenerated as ${LEVEL_CONFIG[level]?.title || level}`,
      })

      logger.info('REGENERATE', 'Regeneration complete', {
        topicId,
        newSlidesCount: generateData.slides.length,
      })
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.debug('REGENERATE', 'Regeneration aborted')
      } else {
        logger.error('REGENERATE', 'Regeneration failed', {
          error: error.message,
        })
        setToast({
          visible: true,
          message: 'Failed to regenerate. Please try again.',
        })
      }
    } finally {
      setIsRegenerating(false)
      regeneratingTopicIdRef.current = null
    }
  }, [activeTopic, isRegenerating, wsClientId])

  /**
   * Handle switching to a different version of the current topic.
   * Loads slides from storage if not available in memory.
   * @param {number} versionIndex - Index of the version to switch to
   */
  const handleVersionSwitch = useCallback(async (versionIndex) => {
    if (!activeTopic) return

    const versions = activeTopic.versions || []
    if (versionIndex < 0 || versionIndex >= versions.length) {
      logger.warn('VERSION', 'Invalid version index', { versionIndex, totalVersions: versions.length })
      return
    }

    const targetVersion = versions[versionIndex]
    logger.info('VERSION', 'Switching version', {
      topicId: activeTopic.id,
      fromIndex: activeTopic.currentVersionIndex,
      toIndex: versionIndex,
      level: targetVersion.explanationLevel,
    })

    // Load slides from storage if not available in memory
    let slides = targetVersion.slides
    if (!slides || slides.length === 0) {
      const cachedSlides = loadTopicSlidesFromStorage(activeTopic.id, targetVersion.id)
      if (cachedSlides) {
        slides = cachedSlides
        logger.debug('VERSION', 'Loaded slides from storage', {
          topicId: activeTopic.id,
          versionId: targetVersion.id,
          slidesCount: slides.length,
        })
      } else {
        const remoteSlides = await fetchSlidesFromServer(activeTopic.id, targetVersion.id, versionIndex)
        if (remoteSlides) {
          slides = remoteSlides
        } else {
          logger.warn('VERSION', 'No slides found for version', {
            topicId: activeTopic.id,
            versionId: targetVersion.id,
          })
          // Show toast to inform user
          setToast({
            visible: true,
            message: 'Version slides not available. Try regenerating.',
          })
          return
        }
      }
    }

    setTopics((prev) => {
      return prev.map((topic) => {
        if (topic.id !== activeTopic.id) return topic

        // Update the version's slides in memory if we loaded from storage
        const updatedVersions = topic.versions.map((v, idx) =>
          idx === versionIndex ? { ...v, slides } : v
        )

        return {
          ...topic,
          versions: updatedVersions,
          currentVersionIndex: versionIndex,
          // Update topic-level fields for backward compatibility
          slides,
          explanationLevel: targetVersion.explanationLevel,
          lastAccessedAt: Date.now(),
        }
      })
    })

    // Reset to first slide when switching versions
    setCurrentIndex(0)
  }, [activeTopic, fetchSlidesFromServer])

  /**
   * CORE022: Handle resuming from an interrupt point
   * Returns to the slide position where the user interrupted the slideshow
   */
  const handleResumeFromInterrupt = useCallback(() => {
    if (!interruptResumePoint) return

    const { topicId, slideIndex } = interruptResumePoint
    const resumeTopic = topics.find((topic) => topic.id === topicId)
    const hasCachedSlides = resumeTopic?.slides && resumeTopic.slides.length > 0
    // Use loadSlidesForTopic to try version-specific storage first, then legacy
    const cachedSlides = !hasCachedSlides && resumeTopic
      ? loadSlidesForTopic(resumeTopic)
      : null
    const resumeSlides = cachedSlides
      ? [createHeaderSlide(resumeTopic), ...cachedSlides]
      : buildTopicSlides(resumeTopic)

    // Validate that the slide index is still valid (topics may have changed)
    if (topicId && resumeSlides.length > 0 && slideIndex < resumeSlides.length) {
      logger.info('AUDIO', 'Resuming from interrupt point', {
        slideIndex,
        topicId,
      })
      if (cachedSlides) {
        const now = Date.now()
        setTopics((prev) => {
          const updated = prev.map((topic) =>
            topic.id === topicId
              ? { ...topic, slides: cachedSlides, lastAccessedAt: now }
              : topic
          )
          return pruneSlideCache(updated, topicId)
        })
      }
      setActiveTopicId(topicId)
      setCurrentIndex(slideIndex)
      setIsPlaying(true)
    } else {
      // Slide no longer exists (e.g., topic was removed), just clear the resume point
      logger.warn('AUDIO', 'Resume point no longer valid, clearing', {
        attemptedIndex: slideIndex,
        currentSlideCount: resumeSlides.length,
      })
    }

    // Clear the resume point after using it
    setInterruptResumePoint(null)
  }, [interruptResumePoint, topics, pruneSlideCache])

  /**
   * CORE022: Dismiss the resume point without navigating
   * User chooses to continue with current content instead of resuming
   */
  const handleDismissResumePoint = useCallback(() => {
    logger.debug('AUDIO', 'User dismissed resume point')
    setInterruptResumePoint(null)
  }, [])

  return (
    // F055, F056, F058: Responsive container with sidebar layout on desktop
    <div className="h-screen flex overflow-hidden">
      {/* GAMIFY-003: Streak counter in top-right corner (T002) */}
      <div className="fixed top-4 right-4 z-40">
        <StreakCounter streakCount={userProgress?.streakCount || 0} />
      </div>

      {/* POLISH-001: Achievement celebration components */}
      <Confetti isActive={showConfetti} onComplete={handleConfettiComplete} />
      <AchievementToast badge={currentToastBadge} onDismiss={handleToastDismiss} />

      {/* CORE016, CORE017: Topic sidebar - hidden when no topics, visible on desktop, hamburger on mobile */}
      <TopicSidebar
        topics={topics}
        activeTopic={activeTopic}
        onNavigateToTopic={handleNavigateToTopic}
        onNewTopic={handleNewTopic}
        onRenameTopic={handleRenameTopic}
        onDeleteTopic={handleDeleteTopic}
      />

      {/* Main content area - centered on wide screens when sidebar is present */}
      <div className={`
        flex-1 h-full flex flex-col items-center justify-center
        px-4 py-4 pb-24 md:pb-4
        overflow-y-auto
        ${topics.length > 0 ? 'md:ml-0' : ''}
      `}>
        {/* F055: max-width 800px centered on desktop, F056: full-width on mobile */}
        <main className="w-full max-w-4xl mx-auto">
        {/* HOME screen - level selection + voice trigger */}
        {uiState === UI_STATE.HOME && (
          <div className="flex flex-col items-center gap-8 px-4 md:px-0 animate-fade-in">
            {/* Headline */}
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {homeHeadline}
              </h1>
              <p className="text-gray-500">
                Tap a level and start talking
              </p>
            </div>

            {/* Level cards */}
            <div className="w-full max-w-md space-y-3">
              {Object.entries(LEVEL_CONFIG).map(([level, config], index) => (
                <div
                  key={level}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <LevelCard
                    level={level}
                    icon={config.icon}
                    title={config.title}
                    description={config.description}
                    isSelected={selectedLevel === level}
                    onClick={() => {
                      playMicOnSound()
                      setSelectedLevel(level)
                      // GAMIFY-003: Track deep level usage for badge
                      if (level === EXPLANATION_LEVEL.DEEP) {
                        recordDeepLevelUsed()
                      }
                      setShowTextFallback(false)
                      setIsMicEnabled(true)
                      setAllowAutoListen(true)
                      setUiState(UI_STATE.LISTENING)
                      // startListening will be triggered by auto-listen effect
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Text fallback */}
            {!showTextFallback ? (
              <button
                onClick={() => setShowTextFallback(true)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                can't talk? type here
              </button>
            ) : (
              <div className="w-full max-w-md space-y-3 animate-fade-in">
                {/* Compact level toggle for text mode */}
                <div className="flex justify-center gap-2">
                  {Object.entries(LEVEL_CONFIG).map(([level, config]) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`
                        px-3 py-1.5 text-sm rounded-full transition-all
                        ${selectedLevel === level
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }
                      `}
                    >
                      {config.icon} {config.title}
                    </button>
                  ))}
                </div>

                {/* Text input with send button */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (textInput.trim()) {
                      handleQuestion(textInput.trim())
                      setTextInput('')
                      setShowTextFallback(false)
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your question..."
                    className="flex-1 px-4 py-3 min-h-[48px] border border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim()}
                    className={`
                      px-4 py-3 rounded-xl transition-all
                      ${textInput.trim()
                        ? 'bg-primary text-white hover:bg-primary/90'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </form>

                {/* Back to voice */}
                <button
                  onClick={() => setShowTextFallback(false)}
                  className="w-full text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  🎤 Use voice instead
                </button>
              </div>
            )}
          </div>
        )}

        {uiState === UI_STATE.LISTENING && (
          <div className="flex flex-col items-center gap-6 px-4 md:px-0 animate-fade-in">
            {/* Level indicator - shows what mode they're in */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{LEVEL_CONFIG[selectedLevel]?.icon}</span>
              <span>{LEVEL_CONFIG[selectedLevel]?.title} mode</span>
            </div>

            {/* Waveform visualization - responds to audio input when listening */}
            <div className="flex items-center justify-center gap-1 h-24">
              {[...Array(AUDIO_CONFIG.WAVEFORM_BARS)].map((_, i) => {
                const baseHeight = 12
                const maxAdditionalHeight = 60
                const middleIndex = AUDIO_CONFIG.WAVEFORM_BARS / 2
                const distanceFromMiddle = Math.abs(i - middleIndex)
                const positionFactor = 1 - (distanceFromMiddle / middleIndex) * 0.5

                let height
                if (isListening && audioLevel > 0) {
                  const randomFactor = 0.8 + Math.random() * 0.4
                  height = baseHeight + (audioLevel / 100) * maxAdditionalHeight * positionFactor * randomFactor
                } else {
                  height = baseHeight + Math.sin(Date.now() / 500 + i * 0.5) * 5 + 10
                }

                return (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      isListening ? 'bg-primary' : 'bg-primary/50'
                    }`}
                    style={{ height: `${Math.max(baseHeight, Math.min(80, height))}px` }}
                  />
                )
              })}
            </div>

            {/* Live transcription or listening status */}
            <p className={`text-xl text-center max-w-md transition-all duration-300 min-h-[2rem] ${
              liveTranscription ? 'text-primary font-medium' : 'text-gray-400'
            }`}>
              {liveTranscription || (isListening ? 'Listening...' : 'Starting mic...')}
            </p>

            {/* Permission denied message */}
            {permissionState === PERMISSION_STATE.DENIED && (
              <div className="text-center">
                <p className="text-sm text-red-500 mb-2">
                  Microphone access denied. Please enable it in your browser settings.
                </p>
                <button
                  onClick={() => setUiState(UI_STATE.HOME)}
                  className="text-sm text-primary hover:underline"
                >
                  Go back and type instead
                </button>
              </div>
            )}

            {/* Cancel button */}
            <button
              onClick={() => {
                stopListening()
                setUiState(UI_STATE.HOME)
              }}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {uiState === UI_STATE.GENERATING && (
          <div className="flex flex-col items-center gap-6 px-4 md:px-0">
            {/* Loader */}
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />

            {/* Single clean status message */}
            <p className="text-lg text-gray-600">
              {isStillWorking
                ? 'Still working...'
                : generationProgress.message || 'Creating your explanation...'}
            </p>

            {/* Progress bar */}
            <div className="w-full max-w-md">
              <div
                role="progressbar"
                aria-valuenow={generationProgressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 w-full bg-gray-200 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${generationProgressPercent}%` }}
                />
              </div>
              {generationProgress.totalSlides > 0 && (
                <p className="mt-2 text-xs text-gray-500 text-center">
                  {generationProgress.slidesReady > 0
                    ? `${generationProgress.slidesReady} of ${generationProgress.totalSlides} slides ready`
                    : `${generationProgress.totalSlides} slides in progress`}
                </p>
              )}
            </div>

            {/* Cancel button - always visible during generation */}
            <button
              onClick={cancelGeneration}
              className="px-4 py-2 min-h-[44px] text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {/* Fun fact card - displays while slides are generating (F045) */}
            {engagement?.funFact && (
              <FunFactCard funFact={engagement.funFact} />
            )}
          </div>
        )}

        {/* Error state with retry button (F052) */}
        {uiState === UI_STATE.ERROR && (
          <div className="flex flex-col items-center gap-6 px-4 md:px-0">
            {/* Error icon */}
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <p className="text-lg text-gray-700 text-center">{errorMessage}</p>

            {/* Retry button - F057: 44px touch target */}
            <button
              onClick={retryLastRequest}
              className="px-6 py-3 min-h-[44px] bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Try Again
            </button>

            {/* Option to go back to home state */}
            <button
              onClick={() => setUiState(UI_STATE.HOME)}
              className="px-4 py-2 min-h-[44px] text-gray-500 hover:text-gray-700 transition-colors"
            >
              Ask a different question
            </button>
          </div>
        )}

        {/* SOCRATIC-003: Socratic questioning mode after slideshow */}
        {uiState === UI_STATE.SOCRATIC && socraticSlides.length > 0 && (
          <SocraticMode
            slides={socraticSlides}
            topicName={socraticTopicName}
            language={socraticLanguage}
            suggestedQuestions={activeTopic?.suggestedQuestions || []}
            onComplete={handleSocraticComplete}
            onFollowUp={handleSocraticFollowUp}
            onSkip={handleSocraticSkip}
          />
        )}

        {/* Loading screen for historical topic TTS */}
        {isLoadingTopicAudio && activeTopic && (
          <div className="flex flex-col items-center gap-4 px-4 md:px-0 animate-fade-in">
            <div className="w-full max-w-2xl">
              <div className="relative w-full aspect-video overflow-hidden rounded-xl shadow-lg">
                <TopicHeader
                  icon={activeTopic.icon}
                  name={activeTopic.name}
                />
                {/* Progress bar overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/30 to-transparent">
                  <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${loadingTopicProgress}%` }}
                    />
                  </div>
                  <p className="text-white text-sm text-center mt-3 font-medium">
                    Preparing narration... {loadingTopicProgress > 10 ? `${loadingTopicProgress}%` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {uiState === UI_STATE.SLIDESHOW && visibleSlides.length > 0 && !isLoadingTopicAudio && (
          <div className="flex flex-col items-center gap-4 px-4 md:px-0">
            {isPreparingFollowUp && (
              <div className="px-3 py-1 text-xs text-primary bg-primary/10 rounded-full">
                Preparing your follow-up...
              </div>
            )}
            <div className="w-full flex flex-col items-center gap-4">
              <div className="w-full relative overflow-visible">
                {/* F050: Slide content with fade transition - key triggers animation on slide change */}
                {/* F043, F044: handles both header and content slides */}
                <div
                  key={displayedSlide?.id || `slide-${currentIndex}-${currentChildIndex}`}
                  className="slide-fade w-full relative"
                >
                  <div className="relative w-full aspect-video overflow-visible">
                    {displayedSlide?.type === 'header' ? (
                      // F043: Render topic header card with TopicHeader component
                      <div className="absolute inset-0 bg-surface rounded-xl shadow-lg overflow-hidden">
                        <TopicHeader
                          icon={displayedSlide.topicIcon}
                          name={displayedSlide.topicName}
                        />
                      </div>
                    ) : displayedSlide?.type === 'section' ? (
                      // Render section divider card for follow-up sections
                      <div className="absolute inset-0 bg-surface rounded-xl shadow-lg overflow-hidden">
                        <SectionDivider question={displayedSlide.question} />
                      </div>
                    ) : displayedSlide?.type === 'suggestions' ? (
                      // Render suggestions slide with clickable question buttons
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl shadow-lg overflow-hidden flex flex-col items-center justify-center p-6 md:p-8">
                        <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6 text-center">
                          Want to learn more?
                        </h3>
                        <div className="flex flex-col gap-3 w-full max-w-md">
                          {displayedSlide?.questions?.map((question, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestionClick(question)}
                              className="w-full px-4 py-3 bg-white hover:bg-primary hover:text-white text-gray-700 rounded-lg shadow-sm border border-gray-200 hover:border-primary transition-all duration-200 text-left text-sm md:text-base"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // Regular content slide with image and subtitle
                      <>
                        {/* CORE024: Container with relative positioning for highlight overlay */}
                        <div className="absolute inset-0 bg-surface rounded-xl shadow-lg overflow-hidden">
                          <img
                            src={displayedSlide?.imageUrl || FALLBACK_SLIDE_IMAGE_URL}
                            alt="Slide diagram"
                            className="w-full h-full object-contain"
                            onError={(event) => {
                              if (event.currentTarget.dataset.fallbackApplied) return
                              event.currentTarget.dataset.fallbackApplied = 'true'
                              event.currentTarget.src = FALLBACK_SLIDE_IMAGE_URL
                            }}
                          />
                          {/* CORE024: Highlight overlay for slide questions */}
                          <HighlightOverlay
                            x={highlightPosition?.x}
                            y={highlightPosition?.y}
                            visible={highlightPosition !== null}
                          />
                        </div>
                      </>
                    )}

                    {activeChildSlides.length > 0 && (
                      <div className="hidden min-[1400px]:block absolute left-full top-0 bottom-0 translate-x-6 z-20">
                        <div className="h-full w-52 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm p-3 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500">Follow-ups</span>
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                              {activeChildSlides.length}
                            </span>
                          </div>

                          <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto pr-1">
                            <button
                              onClick={() => { wasManualNavRef.current = true; setCurrentChildIndex(null); }}
                              aria-label="Back to main slide"
                              className={`group flex h-full w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                                currentChildIndex === null
                                  ? 'border-primary/40 bg-primary/5'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="w-16 h-11 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                {parentSlide?.imageUrl ? (
                                  <img
                                    src={parentSlide.imageUrl}
                                    alt="Main slide thumbnail"
                                    className="w-full h-full object-cover"
                                    onError={(event) => {
                                      if (event.currentTarget.dataset.fallbackApplied) return
                                      event.currentTarget.dataset.fallbackApplied = 'true'
                                      event.currentTarget.src = FALLBACK_SLIDE_IMAGE_URL
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-gray-700">Main</div>
                                <div className="text-[10px] text-gray-400 line-clamp-1">
                                  {parentSlide?.subtitle || 'Overview'}
                                </div>
                              </div>
                            </button>

                            {activeChildSlides.map((slide, idx) => (
                              <button
                                key={slide.id || idx}
                                onClick={() => { wasManualNavRef.current = true; setCurrentChildIndex(idx); }}
                                aria-label={`Go to follow-up ${idx + 1}`}
                                className={`group flex h-full w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                                  currentChildIndex === idx
                                    ? 'border-primary/40 bg-primary/5'
                                    : 'border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <div className="w-16 h-11 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                  <img
                                    src={slide?.imageUrl || FALLBACK_SLIDE_IMAGE_URL}
                                    alt={`Follow-up ${idx + 1} thumbnail`}
                                    className="w-full h-full object-cover"
                                    onError={(event) => {
                                      if (event.currentTarget.dataset.fallbackApplied) return
                                      event.currentTarget.dataset.fallbackApplied = 'true'
                                      event.currentTarget.src = FALLBACK_SLIDE_IMAGE_URL
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-gray-700">Follow-up slide {idx + 1}</div>
                                  <div className="text-[10px] text-gray-400 line-clamp-1">
                                    {slide?.subtitle || 'More detail'}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subtitle - only shown for content slides */}
                  {/* CORE036: Streaming subtitles with karaoke-style word reveal */}
                  {displayedSlide?.type !== 'header' && displayedSlide?.type !== 'suggestions' && (
                    <div className="mt-4">
                      {/* F091: Show "Key Takeaways" badge for conclusion slides */}
                      {displayedSlide?.isConclusion && (
                        <div className="flex justify-center mb-2">
                          <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            Key Takeaways
                          </span>
                        </div>
                      )}
                      <p className="text-base text-center line-clamp-5">
                        <StreamingSubtitle
                          text={displayedSlide?.subtitle}
                          duration={getSlideDuration(displayedSlide)}
                          isPlaying={isSlideNarrationPlaying}
                          showAll={wasManualNavRef.current}
                          audioRef={slideAudioRef}
                        />
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {activeChildSlides.length > 0 && (
                <button
                  onClick={() => setIsFollowUpDrawerOpen(true)}
                  className="min-[1400px]:hidden inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 text-xs text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium">Follow-ups</span>
                  <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    {activeChildSlides.length}
                  </span>
                </button>
              )}

              {/* F044, F057: Progress dots - show slides for current topic with 44px touch target */}
              <div className="flex items-center gap-1 flex-wrap justify-center" role="tablist" aria-label="Slide navigation">
                {visibleSlides.map((slide, i) => {
                  // Use different styling for header, section, suggestions, and content dots
                  const isHeader = slide.type === 'header'
                  const isSection = slide.type === 'section'
                  const isSuggestions = slide.type === 'suggestions'
                  const hasChildren = allTopicSlides.some(s => s.parentId === slide.id) // Check for children
                  return (
                    <button
                      key={slide.id}
                      onClick={() => { wasManualNavRef.current = true; setCurrentIndex(i); setCurrentChildIndex(null); }}
                      role="tab"
                      aria-selected={i === currentIndex}
                      aria-label={
                        isHeader
                          ? `Go to ${slide.topicName} topic header`
                          : isSection
                          ? 'Go to follow-up section'
                          : isSuggestions
                          ? 'Go to suggested questions'
                          : `Go to slide ${i + 1} of ${visibleSlides.length}`
                      }
                      className="p-2 transition-colors cursor-pointer hover:scale-125 relative"
                    >
                      {/* Inner dot - visual indicator, outer padding provides 44px touch target */}
                      {/* Header: rectangle, Section: rounded square, Suggestions: diamond, Content: circle */}
                      <span
                        className={`block ${
                          isHeader
                            ? `w-4 h-3 rounded ${i === currentIndex ? 'bg-primary' : 'bg-gray-400'}`
                            : isSection
                            ? `w-3 h-3 rounded-sm ${i === currentIndex ? 'bg-indigo-500' : 'bg-gray-300'}`
                            : isSuggestions
                            ? `w-3 h-3 rotate-45 ${i === currentIndex ? 'bg-primary' : 'bg-gray-300'}`
                            : `w-3 h-3 rounded-full ${i === currentIndex ? 'bg-primary' : 'bg-gray-300'}`
                        }`}
                      />
                      {/* Indicator for slides with children */}
                      {hasChildren && i !== currentIndex && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-400 rounded-full" />
                      )}
                      {/* Bouncing down arrow for current slide with children - shows vertical navigation is available */}
                      {hasChildren && i === currentIndex && currentChildIndex === null && (
                        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-primary text-xs animate-bounce">
                          ▼
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Controls - arrow buttons and play/pause */}
              <div className="flex flex-col items-center gap-2">
                {/* CORE032: Vertical controls (only visible if children exist) */}
                {activeChildSlides.length > 0 && (
                  <button
                    onClick={goToChildPrev}
                    disabled={currentChildIndex === null}
                    className={`p-2 rounded-full transition-colors ${
                      currentChildIndex === null ? 'text-gray-200' : 'text-primary hover:bg-gray-100'
                    }`}
                  >
                    <span aria-hidden="true">&#9650;</span>
                  </button>
                )}

                <div className="flex items-center gap-4">
                  <button
                    onClick={goToPrevSlide}
                    disabled={currentIndex === 0}
                    aria-label="Previous slide"
                    className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                      currentIndex === 0
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:text-primary hover:bg-gray-100'
                    }`}
                  >
                    <span aria-hidden="true">&#9664;</span>
                  </button>
                  <button
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
                    className="p-3 min-w-[44px] min-h-[44px] bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
                  >
                    <span aria-hidden="true">{isPlaying ? '❚❚' : '▶'}</span>
                  </button>
                  <button
                    onClick={goToNextSlide}
                    disabled={currentIndex === visibleSlides.length - 1}
                    aria-label="Next slide"
                    className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                      currentIndex === visibleSlides.length - 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:text-primary hover:bg-gray-100'
                    }`}
                  >
                    <span aria-hidden="true">&#9654;</span>
                  </button>
                </div>

                {/* CORE032: Down arrow for children */}
                {activeChildSlides.length > 0 && (
                  <button
                    onClick={goToChildNext}
                    disabled={currentChildIndex === activeChildSlides.length - 1}
                    className={`p-2 rounded-full transition-colors ${
                      currentChildIndex === activeChildSlides.length - 1 ? 'text-gray-200' : 'text-primary hover:bg-gray-100'
                    }`}
                  >
                    <span aria-hidden="true">&#9660;</span>
                  </button>
                )}
              </div>

              {/* Queue indicator - shows number of questions waiting (F048) */}
              {questionQueue.length > 0 && (
                <p className="text-sm text-gray-400 mt-2">
                  {questionQueue.length} question{questionQueue.length > 1 ? 's' : ''} queued
                </p>
              )}

              {/* Level indicator with regenerate button and version switcher */}
              {activeTopic && (
                <div className="flex flex-col items-center gap-3 mt-4 mb-16">
                  {/* Current level indicator with regenerate dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Level:</span>
                    <span className={`
                      px-2 py-1 text-xs rounded-full bg-primary text-white
                    `}>
                      {LEVEL_CONFIG[getCurrentVersionLevel(activeTopic)]?.icon}{' '}
                      {LEVEL_CONFIG[getCurrentVersionLevel(activeTopic)]?.title}
                    </span>
                    {/* Regenerate dropdown */}
                    <RegenerateDropdown
                      levelConfig={LEVEL_CONFIG}
                      currentLevel={getCurrentVersionLevel(activeTopic)}
                      onRegenerate={handleRegenerate}
                      isRegenerating={isRegenerating}
                      disabled={!activeTopic.query}
                    />
                  </div>

                  {/* Version switcher - only shown when multiple versions exist */}
                  {activeTopic.versions && activeTopic.versions.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 mr-1">Versions:</span>
                      {activeTopic.versions.map((version, index) => {
                        const isActive = (activeTopic.currentVersionIndex ?? 0) === index
                        const levelConfig = LEVEL_CONFIG[version.explanationLevel] || LEVEL_CONFIG[EXPLANATION_LEVEL.STANDARD]
                        return (
                          <button
                            key={version.id}
                            onClick={() => handleVersionSwitch(index)}
                            className={`
                              px-2 py-1 text-xs rounded-md transition-all
                              flex items-center gap-1
                              ${isActive
                                ? 'bg-primary/10 text-primary border border-primary/30'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent'
                              }
                            `}
                            title={`${levelConfig.title} - ${new Date(version.createdAt).toLocaleString()}`}
                          >
                            <span>{levelConfig.icon}</span>
                            <span className="hidden sm:inline">{levelConfig.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Regenerating indicator */}
                  {isRegenerating && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <svg
                        className="w-3 h-3 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Regenerating slides...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {activeChildSlides.length > 0 && isFollowUpDrawerOpen && (
              <div className="xl:hidden fixed inset-0 z-50">
                <button
                  type="button"
                  aria-label="Close follow-ups drawer"
                  onClick={() => setIsFollowUpDrawerOpen(false)}
                  className="absolute inset-0 bg-black/30"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl p-4 max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-gray-700">Follow-ups</div>
                    <button
                      type="button"
                      onClick={() => setIsFollowUpDrawerOpen(false)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setCurrentChildIndex(null)
                        setIsFollowUpDrawerOpen(false)
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                        currentChildIndex === null
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-20 h-14 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                        {parentSlide?.imageUrl ? (
                          <img
                            src={parentSlide.imageUrl}
                            alt="Main slide thumbnail"
                            className="w-full h-full object-cover"
                            onError={(event) => {
                              if (event.currentTarget.dataset.fallbackApplied) return
                              event.currentTarget.dataset.fallbackApplied = 'true'
                              event.currentTarget.src = FALLBACK_SLIDE_IMAGE_URL
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-700">Main</div>
                        <div className="text-xs text-gray-400 line-clamp-2">
                          {parentSlide?.subtitle || 'Overview'}
                        </div>
                      </div>
                    </button>

                    {activeChildSlides.map((slide, idx) => (
                      <button
                        key={slide.id || idx}
                        onClick={() => {
                          setCurrentChildIndex(idx)
                          setIsFollowUpDrawerOpen(false)
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                          currentChildIndex === idx
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-20 h-14 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                          <img
                            src={slide?.imageUrl || FALLBACK_SLIDE_IMAGE_URL}
                            alt={`Follow-up ${idx + 1} thumbnail`}
                            className="w-full h-full object-cover"
                            onError={(event) => {
                              if (event.currentTarget.dataset.fallbackApplied) return
                              event.currentTarget.dataset.fallbackApplied = 'true'
                              event.currentTarget.src = FALLBACK_SLIDE_IMAGE_URL
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-700">Follow-up slide {idx + 1}</div>
                          <div className="text-xs text-gray-400 line-clamp-2">
                            {slide?.subtitle || 'More detail'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </main>

        {/* Raise hand button - only shown during slideshow */}
        {uiState === UI_STATE.SLIDESHOW && (
          <div
            className={`fixed z-50 pointer-events-none left-1/2 -translate-x-1/2 ${
              topics.length > 0 ? 'md:left-[calc(50%+128px)] xl:left-1/2' : ''
            }`}
            style={{
              // F058: Use safe area inset for notched devices, fallback to 24px
              bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
            }}
          >
            <div className="flex flex-col items-center gap-2 pointer-events-auto">
              {/* Hide raise hand button when text input is shown */}
              {!showTextFallback && (
                <>
                  {isMicEnabled && (
                    <span className="text-xs text-gray-500 bg-white/90 px-3 py-1 rounded-full shadow-sm">
                      {liveTranscription || (isListening
                        ? 'Listening...'
                        : isRaiseHandPending
                          ? 'Waiting for the current sentence...'
                          : 'Mic on')}
                    </span>
                  )}
                  <button
                    onClick={handleRaiseHandClick}
                    aria-label={isMicEnabled ? 'Lower hand' : 'Raise hand'}
                    className={`w-14 h-14 min-h-[44px] rounded-full shadow-lg text-2xl transition-all select-none flex items-center justify-center ${
                      isMicEnabled
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-primary hover:scale-105'
                    }`}
                    style={{
                      WebkitTouchCallout: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {isMicEnabled ? '🤚' : '✋'}
                  </button>
                  <button
                    onClick={() => setShowTextFallback(true)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1"
                  >
                    can't talk? type here
                  </button>
                </>
              )}

              {/* Text input for typing questions */}
              {showTextFallback && (
                <div className="w-72 bg-white rounded-xl shadow-lg p-3 animate-fade-in">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (textInput.trim()) {
                        handleQuestion(textInput.trim())
                        setTextInput('')
                        setShowTextFallback(false)
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onFocus={() => {
                        // Stop narration and auto-advance when user starts typing
                        interruptActiveAudio()
                        setIsPlaying(false)
                      }}
                      placeholder="Type your question..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-primary focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!textInput.trim()}
                      className={`
                        px-3 py-2 rounded-lg transition-all
                        ${textInput.trim()
                          ? 'bg-primary text-white hover:bg-primary/90'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }
                      `}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </form>
                  <button
                    onClick={() => setShowTextFallback(false)}
                    className="w-full text-xs text-gray-400 hover:text-gray-600 mt-2 transition-colors"
                  >
                    ✕ close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toast notification for queue feedback (F047) */}
        <Toast
          message={toast.message}
          visible={toast.visible}
          onDismiss={hideToast}
        />
      </div>

      {/* Spacer to balance sidebar and keep content centered on wide screens */}
      {topics.length > 0 && (
        <div className="hidden xl:block w-64 flex-shrink-0" aria-hidden="true" />
      )}
    </div>
  )
}

export default App
