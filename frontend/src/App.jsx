import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import FunFactCard from './components/FunFactCard'
import SuggestionCard from './components/SuggestionCard'
import Toast from './components/Toast'
import TopicHeader from './components/TopicHeader'
import TopicSidebar from './components/TopicSidebar'
import HighlightOverlay from './components/HighlightOverlay'
import LevelCard from './components/LevelCard'
import { useWebSocket, PROGRESS_TYPES } from './hooks/useWebSocket'
import logger from './utils/logger'

// App states
const UI_STATE = {
  HOME: 'home',
  LISTENING: 'listening',
  GENERATING: 'generating',
  SLIDESHOW: 'slideshow',
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

// Microphone permission states
const PERMISSION_STATE = {
  PROMPT: 'prompt',
  GRANTED: 'granted',
  DENIED: 'denied',
}

// Maximum number of topics with slides cached in memory (LRU eviction beyond this)
const MAX_CACHED_TOPICS = 12

// CORE027: localStorage key for persisting topics across page refresh
const TOPICS_STORAGE_KEY = 'showme_topics'
// CORE027: localStorage key prefix for per-topic slide storage
const TOPIC_SLIDES_STORAGE_PREFIX = 'showme_topic_slides_'

// CORE027: Storage version for schema migration
const TOPICS_STORAGE_VERSION = 2
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

// Audio configuration constants
const AUDIO_CONFIG = {
  // Number of bars in the waveform visualization
  WAVEFORM_BARS: 20,
  // Silence detection threshold (0-255 range from analyser)
  SILENCE_THRESHOLD: 15,
  // Duration of silence before triggering generation (ms)
  SILENCE_DURATION: 1500,
  // Audio analyser FFT size (must be power of 2)
  FFT_SIZE: 256,
  // Animation frame interval for waveform updates (ms)
  ANIMATION_INTERVAL: 50,
  // Minimum audio size in bytes (~0.5s of audio)
  MIN_AUDIO_SIZE: 5000,
  // Maximum audio size in bytes (matches backend 10MB limit)
  MAX_AUDIO_SIZE: 10 * 1024 * 1024,
}

// Voice agent script templates
const VOICE_AGENT_SCRIPT = {
  GENERATION_START: "Got it. Give me a moment.",
  PREPARING_FOLLOW_UP: "Preparing your follow-up now.",
  // Dynamic slides ready message based on topic and count
  getSlidesReadyMessage: (topicName, slideCount) => {
    if (topicName && slideCount > 1) {
      return `I've prepared ${slideCount} slides about ${topicName}. Let's explore!`
    } else if (slideCount > 1) {
      return `Your ${slideCount} slides are ready. Let's explore!`
    }
    return "Your explanation is ready. Let's take a look!"
  },
  // Suggestions slide messages - randomly selected for variety
  SUGGESTIONS_MESSAGES: [
    "Want to learn more? Here are some questions you might enjoy.",
    "Curious for more? Try one of these questions.",
    "Ready to keep exploring? Here are some ideas.",
  ],
  getRandomSuggestionsMessage: () => {
    const messages = VOICE_AGENT_SCRIPT.SUGGESTIONS_MESSAGES
    return messages[Math.floor(Math.random() * messages.length)]
  },
}

/**
 * Build a localStorage key for a topic's slide archive.
 * @param {string} topicId - Topic ID
 * @returns {string} Storage key for topic slides
 */
function getTopicSlidesStorageKey(topicId) {
  return `${TOPIC_SLIDES_STORAGE_PREFIX}${topicId}`
}

/**
 * Normalize slides for storage (strip large audio payloads).
 * @param {Array} slides - Slide objects
 * @param {string} topicId - Topic ID for fallback association
 * @returns {Array} Sanitized slides for storage
 */
function sanitizeSlidesForStorage(slides, topicId) {
  if (!Array.isArray(slides)) return []
  return slides
    .filter((slide) => slide && typeof slide === 'object')
    .map((slide, index) => ({
      // Use fallback ID if missing to ensure slide is always persisted
      id: slide.id || `slide_${topicId}_${index}_${Date.now()}`,
      // Use placeholder image if missing - slide content is more important than image
      imageUrl: slide.imageUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23f0f0f0" width="400" height="300"/><text x="200" y="150" text-anchor="middle" fill="%23999">Image unavailable</text></svg>',
      subtitle: slide.subtitle || '',
      duration: slide.duration || 5000,
      topicId: slide.topicId || topicId,
      // F091: Preserve conclusion slide marker
      ...(slide.isConclusion && { isConclusion: true }),
      // audioUrl intentionally omitted to reduce storage size
    }))
    // Only filter out completely invalid slides (no content at all)
    .filter((slide) => slide.id && (slide.subtitle || slide.imageUrl))
}

/**
 * Persist slides for a topic into localStorage.
 * @param {string} topicId - Topic ID
 * @param {Array} slides - Slide objects to store
 */
function persistTopicSlides(topicId, slides) {
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

  const payload = {
    version: TOPIC_SLIDES_STORAGE_VERSION,
    slides: sanitizedSlides,
    savedAt: Date.now(),
  }

  try {
    localStorage.setItem(getTopicSlidesStorageKey(topicId), JSON.stringify(payload))
    logger.debug('STORAGE', 'Slides persisted successfully', {
      topicId,
      slidesCount: sanitizedSlides.length,
    })
    return true
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      logger.warn('STORAGE', 'Slides archive quota exceeded, skipping storage', {
        topicId,
        slidesCount: sanitizedSlides.length,
      })
    } else {
      logger.error('STORAGE', 'Failed to persist topic slides', {
        topicId,
        error: error.message,
      })
    }
    return false
  }
}

/**
 * Load cached slides for a topic from localStorage.
 * @param {string} topicId - Topic ID
 * @returns {Array|null} Slides array or null when unavailable
 */
function loadTopicSlidesFromStorage(topicId) {
  if (!topicId) return null

  try {
    const stored = localStorage.getItem(getTopicSlidesStorageKey(topicId))
    if (!stored) return null

    const parsed = JSON.parse(stored)
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
  } catch (error) {
    logger.warn('STORAGE', 'Failed to load topic slides', {
      topicId,
      error: error.message,
    })
    return null
  }
}

/**
 * Remove slide archives for topics that no longer exist.
 * @param {Set<string>} validTopicIds - Active topic IDs
 */
function removeStaleTopicSlides(validTopicIds) {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (!key.startsWith(TOPIC_SLIDES_STORAGE_PREFIX)) return
      const topicId = key.slice(TOPIC_SLIDES_STORAGE_PREFIX.length)
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
 * Remove cached slides for a specific topic.
 * @param {string} topicId - Topic ID to remove slides for
 */
function removeTopicSlides(topicId) {
  try {
    const key = getTopicSlidesStorageKey(topicId)
    localStorage.removeItem(key)
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
      if (Array.isArray(topic.slides) && topic.slides.length > 0) {
        // Legacy schema migration: move slides to per-topic storage
        persistTopicSlides(topic.id, topic.slides)
      }

      const createdAt = typeof topic.createdAt === 'number' ? topic.createdAt : now
      const lastAccessedAt = typeof topic.lastAccessedAt === 'number'
        ? topic.lastAccessedAt
        : createdAt

      return {
        id: topic.id,
        name: topic.name,
        icon: topic.icon,
        createdAt,
        lastAccessedAt,
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
      const cachedSlides = loadTopicSlidesFromStorage(topic.id)
      return cachedSlides ? { ...topic, slides: cachedSlides } : topic
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
      createdAt: topic.createdAt,
      lastAccessedAt: topic.lastAccessedAt,
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
            createdAt: topic.createdAt,
            lastAccessedAt: topic.lastAccessedAt,
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
 * Build the slide list for a topic, including its header divider.
 * @param {Object|null} topic - Topic object with headerSlide and slides
 * @returns {Array} Slides for the topic in display order
 */
function buildTopicSlides(topic) {
  if (!topic) return []
  const slides = []
  const headerSlide = topic.headerSlide || createHeaderSlide(topic)
  if (headerSlide) {
    slides.push(headerSlide)
  }
  if (topic.slides && topic.slides.length > 0) {
    slides.push(...topic.slides)
  }
  // Add suggestions slide at the end if questions exist
  if (topic.suggestedQuestions && topic.suggestedQuestions.length > 0) {
    slides.push({
      id: `suggestions_${topic.id}`,
      type: 'suggestions',
      topicId: topic.id,
      questions: topic.suggestedQuestions,
    })
  }
  return slides
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
  // Selected explanation level (session default, also stored per-topic)
  const [selectedLevel, setSelectedLevel] = useState(EXPLANATION_LEVEL.STANDARD)
  // Show text input fallback on home screen
  const [showTextFallback, setShowTextFallback] = useState(false)
  // Dynamic suggested questions - fetched from API based on topic history
  const [suggestedQuestions, setSuggestedQuestions] = useState(DEFAULT_QUESTIONS)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [hasDynamicSuggestions, setHasDynamicSuggestions] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [liveTranscription, setLiveTranscription] = useState('')
  const [lastTranscription, setLastTranscription] = useState('')
  const [textInput, setTextInput] = useState('')
  const [engagement, setEngagement] = useState(null)
  const [questionQueue, setQuestionQueue] = useState([])

  // Error handling state (F052)
  const [errorMessage, setErrorMessage] = useState('')
  const [lastFailedQuery, setLastFailedQuery] = useState('')

  // Generation timeout state (F053)
  const [isStillWorking, setIsStillWorking] = useState(false)
  const [isPreparingFollowUp, setIsPreparingFollowUp] = useState(false)
  const [isSlideRevealPending, setIsSlideRevealPending] = useState(false)
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
   */
  const visibleSlides = useMemo(() => buildTopicSlides(activeTopic), [activeTopic])

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
    const cachedSlides = needsSlides ? loadTopicSlidesFromStorage(activeTopicId) : null

    if (!isNewActive && !cachedSlides) return
    const now = Date.now()

    setTopics((prev) => {
      const updated = prev.map((topic) => {
        if (topic.id !== activeTopicId) return topic
        return {
          ...topic,
          slides: cachedSlides || topic.slides,
          lastAccessedAt: now,
        }
      })
      return pruneSlideCache(updated, activeTopicId)
    })

    lastActiveTopicIdRef.current = activeTopicId
  }, [activeTopicId, topics, pruneSlideCache])

  // Toast notification state for queue feedback (F047)
  const [toast, setToast] = useState({ visible: false, message: '' })

  // Voice input state
  const [isListening, setIsListening] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [permissionState, setPermissionState] = useState(PERMISSION_STATE.PROMPT)
  // Mic enabled by default - voice-first experience
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  // Auto-listen enabled by default - mic starts listening on app load
  const [allowAutoListen, setAllowAutoListen] = useState(true)
  const [isSlideNarrationPlaying, setIsSlideNarrationPlaying] = useState(false)
  const [isSlideNarrationReady, setIsSlideNarrationReady] = useState(false)
  const [isSlideNarrationLoading, setIsSlideNarrationLoading] = useState(false)
  // Raise-hand state for gated listening
  const [isRaiseHandPending, setIsRaiseHandPending] = useState(false)
  const isListeningRef = useRef(false)
  const isMicEnabledRef = useRef(true)
  const allowAutoListenRef = useRef(true)
  const isRaiseHandPendingRef = useRef(false)
  const selectedLevelRef = useRef(EXPLANATION_LEVEL.STANDARD)

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

  // Audio refs - these persist across renders without causing re-renders
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const animationFrameRef = useRef(null)
  const lastSpeechTimeRef = useRef(null)
  const isProcessingRecordingRef = useRef(false)
  const isStartingListeningRef = useRef(false)
  const startListeningRef = useRef(null)
  const stopListeningRef = useRef(null)

  // Track whether slideshow just finished (for auto-trigger of queued questions - F048)
  const hasFinishedSlideshowRef = useRef(false)

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
  // Track which suggestions slide we've already spoken for (to avoid repeating)
  const spokenSuggestionsSlideRef = useRef(null)

  useEffect(() => {
    voiceAgentQueueRef.current = voiceAgentQueue
  }, [voiceAgentQueue])


  // Audio playback ref for slide narration (F037)
  const slideAudioRef = useRef(null)
  const resumeListeningAfterSlideRef = useRef(false)
  const slideAudioCacheRef = useRef(new Map())
  const slideAudioRequestRef = useRef(new Map())
  const slideAudioFailureRef = useRef(new Set())

  // Track if we should pause after the current slide (raise-hand flow)
  const pauseAfterCurrentSlideRef = useRef(false)

  const raiseHandRequestRef = useRef(false)

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

  const getCachedSlideAudio = useCallback((slideId) => {
    if (!slideId) return null
    return slideAudioCacheRef.current.get(slideId) || null
  }, [])

  const requestSlideAudio = useCallback(async (slide) => {
    if (!slide || slide.type === 'header') return null
    if (!slide.subtitle || typeof slide.subtitle !== 'string') return null
    if (slideAudioFailureRef.current.has(slide.id)) return null

    const cached = getCachedSlideAudio(slide.id)
    if (cached) return cached

    const inFlight = slideAudioRequestRef.current.get(slide.id)
    if (inFlight) return inFlight

    const requestPromise = (async () => {
      try {
        const response = await fetch('/api/voice/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: slide.subtitle }),
        })

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
          slideAudioFailureRef.current.add(slide.id)
          return null
        }

        const duration = Number.isFinite(data.duration) && data.duration > 0
          ? data.duration
          : (slide.duration || DEFAULT_SLIDE_DURATION)
        const audioPayload = { audioUrl: data.audioUrl, duration }
        slideAudioCacheRef.current.set(slide.id, audioPayload)
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

  const getSlideDuration = useCallback((slide) => {
    if (!slide) return DEFAULT_SLIDE_DURATION
    const cached = getCachedSlideAudio(slide.id)
    return cached?.duration || slide.duration || DEFAULT_SLIDE_DURATION
  }, [DEFAULT_SLIDE_DURATION, getCachedSlideAudio])

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

    try {
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: item.text }),
      })

      if (!response.ok) {
        logger.warn('AUDIO', 'Voice agent TTS request failed', {
          status: response.status,
          itemId: item.id,
        })
        return null
      }

      const data = await response.json()
      if (!data?.audioUrl) {
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

      // Only call onComplete if playback succeeded (prevents infinite loop on 429)
      if (success && currentItem.onComplete) {
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

  // Fetch suggested questions when topics change
  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true)
      try {
        const topicNames = topics
          .map(t => t.name)
          .filter(name => name && name.trim().length > 0)

        const response = await fetch('/api/topic/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topicNames }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.questions && data.questions.length > 0) {
            setSuggestedQuestions(data.questions)
            setHasDynamicSuggestions(true)
          } else {
            setSuggestedQuestions(DEFAULT_QUESTIONS)
            setHasDynamicSuggestions(false)
          }
        } else {
          setSuggestedQuestions(DEFAULT_QUESTIONS)
          setHasDynamicSuggestions(false)
        }
      } catch (error) {
        logger.warn('API', 'Failed to fetch suggestions', { error: error.message })
        setSuggestedQuestions(DEFAULT_QUESTIONS)
        setHasDynamicSuggestions(false)
      } finally {
        setIsLoadingSuggestions(false)
      }
    }

    fetchSuggestions()
  }, [topics])

  // Navigation helper functions with bounds checking (F044)
  const goToNextSlide = useCallback(() => {
    setCurrentIndex((prev) => Math.min(visibleSlides.length - 1, prev + 1))
  }, [visibleSlides.length])

  const goToPrevSlide = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
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
   * Transition to slideshow with "slides ready" narration.
   * Interrupts any playing fun fact audio to avoid blocking the transition.
   * @param {string} topicName - Name of the topic for the announcement
   * @param {number} slideCount - Number of slides generated
   */
  const queueSlidesReadyTransition = useCallback((topicName, slideCount) => {
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

    setIsSlideRevealPending(true)
    const readyMessage = VOICE_AGENT_SCRIPT.getSlidesReadyMessage(topicName, slideCount)
    enqueueVoiceAgentMessage(readyMessage, {
      priority: 'high',
      onComplete: () => {
        setIsSlideRevealPending(false)
        setUiState(UI_STATE.SLIDESHOW)
      },
    })
  }, [enqueueVoiceAgentMessage, clearFunFactRefresh])

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
        handleQuestion(lastFailedQuery)
      }, 0)
    }
  }, [lastFailedQuery])

  useEffect(() => {
    if (uiState !== UI_STATE.GENERATING) {
      clearFunFactRefresh()
    }
  }, [uiState, clearFunFactRefresh])

  /**
   * Speak fun facts using pre-generated audio from engagement endpoint.
   * Audio is generated server-side to eliminate the round-trip to /api/voice/speak.
   * Uses TTS-driven refresh: next fun fact fetched only after current audio finishes.
   */
  useEffect(() => {
    if (!engagement) return

    if (engagement.funFact?.text && !spokenFunFactRef.current) {
      spokenFunFactRef.current = engagement.funFact.text
      // Use pre-generated audio if available, otherwise fall back to TTS fetch
      // When audio finishes, wait 60s before refreshing to get next fun fact
      enqueueVoiceAgentMessage(`Fun fact: ${engagement.funFact.text}`, {
        audioUrl: engagement.funFact.audioUrl || null,
        onComplete: () => {
          setTimeout(refreshFunFact, GENERATION_TIMEOUT.FUN_FACT_REFRESH_DELAY_MS)
        },
      })
    }

    // Suggested questions are shown visually only (no TTS) to avoid
    // race condition where suggestions narrate after slides are ready
  }, [engagement, enqueueVoiceAgentMessage, refreshFunFact])

  // Auto-advance slideshow when playing (F044)
  // Uses slide.duration if available, otherwise falls back to DEFAULT_SLIDE_DURATION
  // Header slides advance faster since they're just dividers
  useEffect(() => {
    // Only run auto-advance when in slideshow state, playing, and slides exist
    if (uiState !== UI_STATE.SLIDESHOW || !isPlaying || isVoiceAgentSpeaking || visibleSlides.length === 0) {
      return
    }

    const currentSlide = visibleSlides[currentIndex]

    if (currentSlide?.type !== 'header' && !isSlideNarrationReady) {
      return
    }

    // Get duration for current slide (in milliseconds)
    // Header slides should advance faster since they're just dividers (2 seconds)
    const duration = currentSlide?.type === 'header'
      ? 2000
      : getSlideDuration(currentSlide)

    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => {
        if (pauseAfterCurrentSlideRef.current) {
          pauseAfterCurrentSlideRef.current = false
          setIsPlaying(false)
          return prev
        }

        const nextIndex = prev + 1
        // If we reach the end, stop playing and mark slideshow as finished (F048)
        if (nextIndex >= visibleSlides.length) {
          setIsPlaying(false)
          hasFinishedSlideshowRef.current = true
          return prev
        }
        return nextIndex
      })
    }, duration)

    // Cleanup interval on unmount or when dependencies change
    return () => clearInterval(intervalId)
  }, [
    uiState,
    isPlaying,
    isVoiceAgentSpeaking,
    isSlideNarrationReady,
    currentIndex,
    visibleSlides,
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

    const currentSlide = visibleSlides[currentIndex]
    setIsSlideNarrationReady(false)
    setIsSlideNarrationLoading(false)

    // Stop previous audio if playing
    if (slideAudioRef.current) {
      slideAudioRef.current.pause()
      slideAudioRef.current = null
    }

    // CORE023, CORE024: Stop slide response audio and clear highlight when navigating
    if (slideResponseAudioRef.current) {
      slideResponseAudioRef.current.pause()
      slideResponseAudioRef.current = null
    }
    setHighlightPosition(null)

    if (currentSlide?.type === 'header') {
      setIsSlideNarrationPlaying(false)
      setIsSlideNarrationReady(true)
      prefetchSlideAudio(visibleSlides[currentIndex + 1])
      return
    }

    // Suggestions slide - play random TTS message via voice agent
    if (currentSlide?.type === 'suggestions') {
      setIsSlideNarrationPlaying(false)
      setIsSlideNarrationReady(true)
      // Only speak once per suggestions slide (check by slide ID)
      if (isPlaying && spokenSuggestionsSlideRef.current !== currentSlide.id) {
        spokenSuggestionsSlideRef.current = currentSlide.id
        enqueueVoiceAgentMessage(VOICE_AGENT_SCRIPT.getRandomSuggestionsMessage())
      }
      return
    }

    if (!isPlaying || isVoiceAgentSpeaking) {
      setIsSlideNarrationPlaying(false)
      return
    }

    if (isListeningRef.current) {
      resumeListeningAfterSlideRef.current = true
      stopListeningRef.current?.()
    }

    let cancelled = false

    const playSlideAudio = async () => {
      let audioPayload = getCachedSlideAudio(currentSlide.id)

      if (!audioPayload) {
        if (slideAudioFailureRef.current.has(currentSlide.id)) {
          setIsSlideNarrationPlaying(false)
          setIsSlideNarrationReady(true)
          return
        }

        setIsSlideNarrationLoading(true)
        audioPayload = await requestSlideAudio(currentSlide)
        if (cancelled) return
        setIsSlideNarrationLoading(false)
      }

      if (cancelled) return

      if (!audioPayload?.audioUrl) {
        setIsSlideNarrationPlaying(false)
        setIsSlideNarrationReady(true)
        return
      }

      const audio = new Audio(audioPayload.audioUrl)
      slideAudioRef.current = audio
      setIsSlideNarrationPlaying(true)
      setIsSlideNarrationReady(true)

      // F071: Log audio playback start
      logger.debug('AUDIO', 'Starting slide narration playback', {
        slideId: currentSlide.id,
        slideIndex: currentIndex,
      })

      // Start from the beginning
      audio.currentTime = 0
      audio.onended = () => {
        setIsSlideNarrationPlaying(false)
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
      }
      audio.onerror = () => {
        setIsSlideNarrationPlaying(false)
        resumeListeningAfterSlideRef.current = false
      }
      audio.play().catch((error) => {
        // F071: Log autoplay blocked error
        logger.warn('AUDIO', 'Slide audio playback failed (autoplay may be blocked)', {
          error: error.message,
          slideId: currentSlide.id,
        })
        setIsSlideNarrationPlaying(false)
        resumeListeningAfterSlideRef.current = false
      })

      prefetchSlideAudio(visibleSlides[currentIndex + 1])
    }

    playSlideAudio()

    // Cleanup on unmount or when slide changes
    return () => {
      cancelled = true
      if (slideAudioRef.current) {
        slideAudioRef.current.pause()
      }
    }
  }, [
    uiState,
    currentIndex,
    visibleSlides,
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

      // Reset the flag
      hasFinishedSlideshowRef.current = false

      // Trigger the question
      handleQuestion(nextQuestion)
    }, 1500) // 1.5 second delay for natural transition

    return () => clearTimeout(timer)
  }, [questionQueue])

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
      lastSpeechTimeRef.current = Date.now()
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
   * Skip auto-listen on HOME screen - user must explicitly select a level.
   */
  useEffect(() => {
    if (!allowAutoListen || !isMicEnabled) return
    if (permissionState === PERMISSION_STATE.DENIED) return
    if (isListening || isRaiseHandPending || isVoiceAgentSpeaking || isSlideNarrationPlaying) return
    if (voiceAgentQueue.length > 0) return
    if (isProcessingRecordingRef.current) return
    if (uiState === UI_STATE.ERROR || uiState === UI_STATE.HOME) return

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

      // Clean up audio resources (this also tries to stop, but recorder is already stopped)
      stopListening()

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
        setLiveTranscription('Could not understand the audio. Please try again.')
        return
      }

      const transcription = data.transcription.trim()

      // F028: Display the transcription result
      setLastTranscription(transcription)
      setLiveTranscription(transcription)

      logger.info('AUDIO', 'Triggering generation with transcription', {
        query: transcription,
      })

      // F030: Trigger generation with the actual transcribed text
      // Note: handleQuestion is intentionally not in deps to avoid re-renders;
      // it uses current state at call time which is the desired behavior
      handleQuestion(transcription, { source: 'voice' })
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
   * Raise-hand flow: wait for the current sentence to finish, then listen.
   */
  const handleRaiseHandClick = useCallback(async () => {
    if (isMicEnabled) {
      setIsMicEnabled(false)
      cancelRaiseHand()
      return
    }

    setIsMicEnabled(true)
    setAllowAutoListen(true)
    raiseHandRequestRef.current = true
    setIsRaiseHandPending(true)
    setVoiceAgentQueue([])

    if (uiState === UI_STATE.SLIDESHOW) {
      pauseAfterCurrentSlideRef.current = true

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

    await waitForActiveAudioToEnd()

    if (!raiseHandRequestRef.current) {
      return
    }

    raiseHandRequestRef.current = false
    setIsRaiseHandPending(false)
    pauseAfterCurrentSlideRef.current = false

    if (uiState === UI_STATE.SLIDESHOW) {
      setIsPlaying(false)
    }

    startListening()
  }, [
    isMicEnabled,
    cancelRaiseHand,
    uiState,
    visibleSlides,
    currentIndex,
    waitForActiveAudioToEnd,
    startListening,
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

    if (uiState === UI_STATE.GENERATING || isSlideRevealPending) {
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
      spokenSuggestionsSlideRef.current = null
      clearFunFactRefresh()
      currentQueryRef.current = trimmedQuery // Store query for TTS-driven fun fact refresh
      setIsColdStart(false)
      setUiState(UI_STATE.GENERATING)
      setIsStillWorking(false)
      setIsPreparingFollowUp(false)
      setIsSlideRevealPending(false)
      enqueueVoiceAgentMessage(VOICE_AGENT_SCRIPT.GENERATION_START, { priority: 'high' })
      // F015: Reset generation progress for new query
      setGenerationProgress({ stage: null, message: '', slidesReady: 0, totalSlides: 0 })
      // Reset the slideshow finished flag when starting new generation
      hasFinishedSlideshowRef.current = false

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

      if (isFollowUp) {
        setIsPreparingFollowUp(true)
        enqueueVoiceAgentMessage(VOICE_AGENT_SCRIPT.PREPARING_FOLLOW_UP)
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
        const now = Date.now()
        const nextSlides = [
          ...(activeTopic.slides || []),
          ...generateData.slides,
        ]

        // F073: Log follow-up slide append
        logger.info('STATE', 'Appending slides to existing topic', {
          topicId: activeTopic.id,
          topicName: activeTopic.name,
          newSlidesCount: generateData.slides.length,
          previousSlidesCount: previousSlideCount,
        })

        persistTopicSlides(activeTopic.id, nextSlides)

        setTopics((prev) => {
          const updated = prev.map((topic) =>
            topic.id === activeTopic.id
              ? { ...topic, slides: nextSlides, suggestedQuestions, lastAccessedAt: now }
              : topic
          )
          return pruneSlideCache(updated, activeTopic.id)
        })

        // Navigate to the first new slide after appending (header + previous slides)
        const headerOffset = 1
        setCurrentIndex(previousSlideCount + headerOffset)
        // F072: End timing for full generation pipeline
        logger.timeEnd('GENERATION', 'full-pipeline')
        queueSlidesReadyTransition(activeTopic.name, generateData.slides.length)

      } else if (newTopicData && generateData.slides?.length > 0) {
        // F040: Create new topic with header card
        const now = Date.now()
        const newTopic = {
          id: newTopicData.id,
          name: newTopicData.name,
          icon: newTopicData.icon,
          headerSlide: createHeaderSlide(newTopicData),
          slides: generateData.slides,
          suggestedQuestions, // Add suggestions for end-of-slideshow card
          explanationLevel: selectedLevelRef.current, // Store the level used for this topic
          createdAt: now,
          lastAccessedAt: now,
        }

        // F073: Log new topic creation
        logger.info('STATE', 'Creating new topic', {
          topicId: newTopic.id,
          topicName: newTopic.name,
          topicIcon: newTopic.icon,
          slidesCount: generateData.slides.length,
        })

        persistTopicSlides(newTopic.id, newTopic.slides)

        // Add the new topic
        setTopics((prev) => pruneSlideCache([newTopic, ...prev], newTopic.id))

        // Set the new topic as active and show its header slide
        setActiveTopicId(newTopic.id)
        setCurrentIndex(0)
        // F072: End timing for full generation pipeline
        logger.timeEnd('GENERATION', 'full-pipeline')
        queueSlidesReadyTransition(newTopic.name, generateData.slides.length)

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
   * Switches the active topic and navigates to its header slide
   * @param {string} topicId - ID of the topic to navigate to
   */
  const handleNavigateToTopic = useCallback((topicId) => {
    if (!topicId) return
    const targetTopic = topics.find((topic) => topic.id === topicId)
    const needsSlides = !targetTopic?.slides || targetTopic.slides.length === 0
    const cachedSlides = needsSlides ? loadTopicSlidesFromStorage(topicId) : null
    const now = Date.now()

    setTopics((prev) => {
      const updated = prev.map((topic) => {
        if (topic.id !== topicId) return topic
        return {
          ...topic,
          slides: needsSlides ? (cachedSlides || topic.slides) : topic.slides,
          lastAccessedAt: now,
          headerSlide: topic.headerSlide || createHeaderSlide(topic),
        }
      })
      return pruneSlideCache(updated, topicId)
    })

    setActiveTopicId(topicId)
    setCurrentIndex(0)
    // If not already in slideshow, switch to slideshow state
    if (uiState !== UI_STATE.SLIDESHOW && topics.length > 0) {
      setUiState(UI_STATE.SLIDESHOW)
    }
  }, [uiState, topics, pruneSlideCache])

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
   * CORE022: Handle resuming from an interrupt point
   * Returns to the slide position where the user interrupted the slideshow
   */
  const handleResumeFromInterrupt = useCallback(() => {
    if (!interruptResumePoint) return

    const { topicId, slideIndex } = interruptResumePoint
    const resumeTopic = topics.find((topic) => topic.id === topicId)
    const hasCachedSlides = resumeTopic?.slides && resumeTopic.slides.length > 0
    const cachedSlides = !hasCachedSlides && resumeTopic?.id
      ? loadTopicSlidesFromStorage(resumeTopic.id)
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
                What do you want me to show you?
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
                      setSelectedLevel(level)
                      setShowTextFallback(false)
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

        {uiState === UI_STATE.SLIDESHOW && visibleSlides.length > 0 && (
          <div className="flex flex-col items-center gap-4 px-4 md:px-0">
            {isPreparingFollowUp && (
              <div className="px-3 py-1 text-xs text-primary bg-primary/10 rounded-full">
                Preparing your follow-up...
              </div>
            )}
            {/* F050: Slide content with fade transition - key triggers animation on slide change */}
            {/* F043, F044: handles both header and content slides */}
            <div key={visibleSlides[currentIndex]?.id || currentIndex} className="slide-fade w-full">
              {visibleSlides[currentIndex]?.type === 'header' ? (
                // F043: Render topic header card with TopicHeader component
                <div className="w-full aspect-video bg-surface rounded-xl shadow-lg overflow-hidden">
                  <TopicHeader
                    icon={visibleSlides[currentIndex].topicIcon}
                    name={visibleSlides[currentIndex].topicName}
                  />
                </div>
              ) : visibleSlides[currentIndex]?.type === 'suggestions' ? (
                // Render suggestions slide with clickable question buttons
                <div className="w-full aspect-video bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl shadow-lg overflow-hidden flex flex-col items-center justify-center p-6 md:p-8">
                  <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6 text-center">
                    Want to learn more?
                  </h3>
                  <div className="flex flex-col gap-3 w-full max-w-md">
                    {visibleSlides[currentIndex]?.questions?.map((question, idx) => (
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
                  <div className="relative w-full aspect-video bg-surface rounded-xl shadow-lg overflow-hidden">
                    <img
                      src={visibleSlides[currentIndex]?.imageUrl}
                      alt="Slide diagram"
                      className="w-full h-full object-contain"
                    />
                    {/* CORE024: Highlight overlay for slide questions */}
                    <HighlightOverlay
                      x={highlightPosition?.x}
                      y={highlightPosition?.y}
                      visible={highlightPosition !== null}
                    />
                  </div>

                  {/* Subtitle - only shown for content slides */}
                  <div className="mt-4">
                    {/* F091: Show "Key Takeaways" badge for conclusion slides */}
                    {visibleSlides[currentIndex]?.isConclusion && (
                      <div className="flex justify-center mb-2">
                        <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                          Key Takeaways
                        </span>
                      </div>
                    )}
                    <p className="text-base text-center line-clamp-5">
                      {visibleSlides[currentIndex]?.subtitle}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* F044, F057: Progress dots - show slides for current topic with 44px touch target */}
            <div className="flex items-center gap-1 flex-wrap justify-center" role="tablist" aria-label="Slide navigation">
              {visibleSlides.map((slide, i) => {
                // Use different styling for header, suggestions, and content dots
                const isHeader = slide.type === 'header'
                const isSuggestions = slide.type === 'suggestions'
                return (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentIndex(i)}
                    role="tab"
                    aria-selected={i === currentIndex}
                    aria-label={
                      isHeader
                        ? `Go to ${slide.topicName} topic header`
                        : isSuggestions
                        ? 'Go to suggested questions'
                        : `Go to slide ${i + 1} of ${visibleSlides.length}`
                    }
                    className="p-2 transition-colors cursor-pointer hover:scale-125"
                  >
                    {/* Inner dot - visual indicator, outer padding provides 44px touch target */}
                    {/* Header: rectangle, Suggestions: diamond, Content: circle */}
                    <span
                      className={`block ${
                        isHeader
                          ? `w-4 h-3 rounded ${i === currentIndex ? 'bg-primary' : 'bg-gray-400'}`
                          : isSuggestions
                          ? `w-3 h-3 rotate-45 ${i === currentIndex ? 'bg-primary' : 'bg-gray-300'}`
                          : `w-3 h-3 rounded-full ${i === currentIndex ? 'bg-primary' : 'bg-gray-300'}`
                      }`}
                    />
                  </button>
                )
              })}
            </div>

            {/* Controls - arrow buttons and play/pause */}
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
                <span aria-hidden="true">{isPlaying ? '\u275A\u275A' : '\u25B6'}</span>
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

            {/* CORE022: Resume button - shown when user interrupted a previous slideshow */}
            {interruptResumePoint && (interruptResumePoint.topicId !== activeTopicId || interruptResumePoint.slideIndex !== currentIndex) && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-surface rounded-lg border border-gray-200">
                <button
                  onClick={handleResumeFromInterrupt}
                  aria-label="Resume previous slideshow"
                  className="px-4 py-2 min-h-[44px] bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path fillRule="evenodd" d="M15.79 14.77a.75.75 0 01-1.06.02l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 111.04 1.08L11.832 10l3.938 3.71a.75.75 0 01.02 1.06zm-6 0a.75.75 0 01-1.06.02l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 111.04 1.08L5.832 10l3.938 3.71a.75.75 0 01.02 1.06z" clipRule="evenodd" />
                  </svg>
                  Resume previous
                </button>
                <button
                  onClick={handleDismissResumePoint}
                  aria-label="Dismiss resume option"
                  className="p-2 min-w-[44px] min-h-[44px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                    aria-hidden="true"
                  >
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            )}

            {/* Queue indicator - shows number of questions waiting (F048) */}
            {questionQueue.length > 0 && (
              <p className="text-sm text-gray-400 mt-2">
                {questionQueue.length} question{questionQueue.length > 1 ? 's' : ''} queued
              </p>
            )}

            {/* Level indicator - shows current topic level, click to change for future questions */}
            {activeTopic && (
              <div className="flex items-center gap-2 mt-4 mb-16">
                <span className="text-xs text-gray-400">Level:</span>
                <div className="flex gap-1">
                  {Object.entries(LEVEL_CONFIG).map(([level, config]) => {
                    const isCurrentLevel = (activeTopic.explanationLevel || EXPLANATION_LEVEL.STANDARD) === level
                    return (
                      <button
                        key={level}
                        onClick={() => {
                          // Update the topic's level for future follow-ups
                          setTopics(prev => prev.map(t =>
                            t.id === activeTopic.id
                              ? { ...t, explanationLevel: level }
                              : t
                          ))
                          setSelectedLevel(level)
                        }}
                        className={`
                          px-2 py-1 text-xs rounded-full transition-all
                          ${isCurrentLevel
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }
                        `}
                        title={config.description}
                      >
                        {config.icon} {config.title}
                      </button>
                    )
                  })}
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
              {isMicEnabled && (
                <span className="text-xs text-gray-500 bg-white/90 px-3 py-1 rounded-full shadow-sm">
                  {isListening
                    ? 'Listening...'
                    : isRaiseHandPending
                      ? 'Waiting for the current sentence...'
                      : 'Mic on'}
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
