/**
 * Topic and slide storage utilities
 * Handles localStorage persistence for topics and their slides
 */

import logger from './logger.js'
import {
  STORAGE_KEYS,
  STORAGE_VERSIONS,
  STORAGE_LIMITS,
  EXPLANATION_LEVEL,
  FALLBACK_SLIDE_IMAGE_URL,
  API_ENDPOINTS,
} from '../constants/appConfig.js'

const TOPIC_SLIDES_STORAGE_PREFIX = STORAGE_KEYS.TOPIC_SLIDES_PREFIX
const TOPICS_STORAGE_KEY = STORAGE_KEYS.TOPICS
const CLIENT_ID_STORAGE_KEY = STORAGE_KEYS.CLIENT_ID
const TOPICS_STORAGE_VERSION = STORAGE_VERSIONS.TOPICS
const TOPIC_SLIDES_STORAGE_VERSION = STORAGE_VERSIONS.TOPIC_SLIDES
const MAX_CACHED_TOPICS = STORAGE_LIMITS.MAX_CACHED_TOPICS

/**
 * Build a localStorage key for a topic's slide archive.
 * @param {string} topicId - Topic ID
 * @param {string} [versionId] - Optional version ID for per-version storage
 * @returns {string} Storage key for topic slides
 */
export function getTopicSlidesStorageKey(topicId, versionId) {
  if (versionId) {
    return `${TOPIC_SLIDES_STORAGE_PREFIX}${topicId}_${versionId}`
  }
  return `${TOPIC_SLIDES_STORAGE_PREFIX}${topicId}`
}

/**
 * Get or create a stable client ID for server-side slide storage.
 * @returns {string|null} Stable client ID or null when unavailable
 */
export function getStoredClientId() {
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
export function sanitizeSlidesForStorage(slides, topicId) {
  if (!Array.isArray(slides)) {
    return []
  }
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
export async function persistSlidesToServer(topicId, slides, versionId, options = {}) {
  const clientId = getStoredClientId()
  if (!clientId || !topicId || !Array.isArray(slides) || slides.length === 0) {
    return
  }

  if (options.skipRemote) {
    return
  }

  try {
    const response = await fetch(`${API_ENDPOINTS.SLIDES_BASE}/save`, {
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
 * @returns {boolean} Whether persistence succeeded
 */
export function persistTopicSlides(topicId, slides, versionId, options = {}) {
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
export function extractValidSlidesFromPayload(parsed) {
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
export function loadTopicSlidesFromStorage(topicId, versionId) {
  if (!topicId) return null

  try {
    const storageKey = getTopicSlidesStorageKey(topicId, versionId)
    const stored = localStorage.getItem(storageKey)
    if (!stored) {
      return null
    }

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
export function loadLatestVersionedSlides(topicId) {
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
export function loadSlidesForTopic(topic) {
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
export function removeStaleTopicSlides(validTopicIds) {
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
export function removeTopicSlides(topicId) {
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
 * Creates a header slide object for a topic (F040, F043)
 * Header slides display the topic icon and name as a divider
 * @param {Object} topic - Topic object with id, name, icon
 * @returns {Object} Header slide object
 */
export function createHeaderSlide(topic) {
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
 * CORE027: Load persisted topics from localStorage
 * Handles corrupted data, schema validation, and migration.
 * @returns {Object} { topics: Array, hadPersistedData: boolean }
 */
export function loadPersistedTopics() {
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
export function saveTopicsToStorage(topics) {
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
