import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import FunFactCard from './components/FunFactCard'
import SuggestionCard from './components/SuggestionCard'
import Toast from './components/Toast'
import TopicHeader from './components/TopicHeader'
import TopicSidebar from './components/TopicSidebar'
import HighlightOverlay from './components/HighlightOverlay'
import { useWebSocket, PROGRESS_TYPES } from './hooks/useWebSocket'
import logger from './utils/logger'

// App states
const UI_STATE = {
  LISTENING: 'listening',
  GENERATING: 'generating',
  SLIDESHOW: 'slideshow',
  ERROR: 'error',
}

// Generation timeout configuration (F053)
const GENERATION_TIMEOUT = {
  // Time before showing "Still working..." message (15 seconds)
  STILL_WORKING_MS: 15000,
  // Maximum time before allowing user to cancel (60 seconds)
  MAX_TIMEOUT_MS: 60000,
}

// Microphone permission states
const PERMISSION_STATE = {
  PROMPT: 'prompt',
  GRANTED: 'granted',
  DENIED: 'denied',
}

// Maximum number of topics with slides cached in memory (LRU eviction beyond this)
const MAX_CACHED_TOPICS = 12

// localStorage key for tracking if greeting has been played (CORE010)
const GREETING_PLAYED_KEY = 'showme_greeting_played'

// CORE027: localStorage key for persisting topics across page refresh
const TOPICS_STORAGE_KEY = 'showme_topics'
// CORE027: localStorage key prefix for per-topic slide storage
const TOPIC_SLIDES_STORAGE_PREFIX = 'showme_topic_slides_'

// CORE027: Storage version for schema migration
const TOPICS_STORAGE_VERSION = 2
const TOPIC_SLIDES_STORAGE_VERSION = 1

// Example questions for cold start
const EXAMPLE_QUESTIONS = [
  "How do black holes work?",
  "Why do we dream?",
  "How does WiFi work?",
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
  // CORE019: Minimum hold duration for push-to-talk (ms)
  // Prevents accidental taps from triggering recording
  MIN_HOLD_DURATION: 300,
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
    .map((slide) => ({
      id: slide.id,
      imageUrl: slide.imageUrl,
      subtitle: slide.subtitle,
      duration: slide.duration,
      topicId: slide.topicId || topicId,
      // audioUrl intentionally omitted to reduce storage size
    }))
    .filter((slide) =>
      slide.id &&
      typeof slide.id === 'string' &&
      slide.imageUrl &&
      typeof slide.imageUrl === 'string'
    )
}

/**
 * Persist slides for a topic into localStorage.
 * @param {string} topicId - Topic ID
 * @param {Array} slides - Slide objects to store
 */
function persistTopicSlides(topicId, slides) {
  if (!topicId || !Array.isArray(slides)) return

  const sanitizedSlides = sanitizeSlidesForStorage(slides, topicId)
  if (sanitizedSlides.length === 0) return

  const payload = {
    version: TOPIC_SLIDES_STORAGE_VERSION,
    slides: sanitizedSlides,
    savedAt: Date.now(),
  }

  try {
    localStorage.setItem(getTopicSlidesStorageKey(topicId), JSON.stringify(payload))
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

    const validSlides = slides.filter((slide) =>
      slide &&
      typeof slide === 'object' &&
      slide.id &&
      typeof slide.id === 'string' &&
      slide.imageUrl &&
      typeof slide.imageUrl === 'string'
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
  return slides
}

function App() {
  // CORE027: Load persisted topics on initial mount
  // This uses a lazy initializer to only run once on mount
  const [initialData] = useState(() => loadPersistedTopics())

  const [uiState, setUiState] = useState(UI_STATE.LISTENING)
  // CORE027: isColdStart is false if we restored topics from localStorage
  const [isColdStart, setIsColdStart] = useState(() => !initialData.hadPersistedData)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [liveTranscription, setLiveTranscription] = useState('')
  const [textInput, setTextInput] = useState('')
  const [engagement, setEngagement] = useState(null)
  const [questionQueue, setQuestionQueue] = useState([])

  // Error handling state (F052)
  const [errorMessage, setErrorMessage] = useState('')
  const [lastFailedQuery, setLastFailedQuery] = useState('')

  // Generation timeout state (F053)
  const [isStillWorking, setIsStillWorking] = useState(false)
  const abortControllerRef = useRef(null)
  const stillWorkingTimerRef = useRef(null)

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
    if (initialData.topics.length === 0) return null
    return initialData.topics[initialData.topics.length - 1].id
  })

  /**
   * Get the currently active topic (selected for viewing/follow-ups)
   * Defaults to the most recently added topic when no selection exists.
   */
  const activeTopic = useMemo(() => {
    if (topics.length === 0) return null
    if (activeTopicId) {
      const match = topics.find((topic) => topic.id === activeTopicId)
      if (match) return match
    }
    return topics[topics.length - 1]
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
   */
  useEffect(() => {
    if (topics.length === 0) {
      if (activeTopicId !== null) {
        setActiveTopicId(null)
        setCurrentIndex(0)
      }
      return
    }

    const hasActive = activeTopicId && topics.some((topic) => topic.id === activeTopicId)
    if (!hasActive) {
      const fallbackId = topics[topics.length - 1].id
      if (fallbackId !== activeTopicId) {
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

  // Track whether slideshow just finished (for auto-trigger of queued questions - F048)
  const hasFinishedSlideshowRef = useRef(false)

  // CORE019: Push-to-talk refs
  // Track when the mic button was pressed to calculate hold duration
  const micPressStartTimeRef = useRef(null)
  // Track if the recording was started (for edge cases like mouse leaving button)
  const isRecordingStartedRef = useRef(false)
  // Track if touch is active to prevent double event firing on mobile
  // (touchstart/touchend AND mousedown/mouseup both fire for the same interaction)
  const isTouchActiveRef = useRef(false)

  // Audio playback ref for slide narration (F037)
  const slideAudioRef = useRef(null)

  // Audio playback ref for greeting audio (CORE010)
  const greetingAudioRef = useRef(null)

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

  /**
   * CORE010: AI greeting on cold start
   * Plays a TTS greeting when the app opens for the first time (true cold start).
   * Conditions:
   * - isColdStart is true (no topics exist yet)
   * - No greeting has been played before (localStorage flag not set)
   * - App is in LISTENING state
   */
  useEffect(() => {
    // Only play greeting on true cold start
    // Check localStorage first to avoid unnecessary API calls
    const hasPlayedGreeting = localStorage.getItem(GREETING_PLAYED_KEY) === 'true'

    if (hasPlayedGreeting) {
      // Greeting already played in a previous session, skip
      return
    }

    if (!isColdStart || topics.length > 0 || uiState !== UI_STATE.LISTENING) {
      // Not a true cold start, or already navigated away
      return
    }

    // Fetch and play the greeting audio
    const playGreeting = async () => {
      try {
        logger.info('AUDIO', 'Fetching cold start greeting')

        const response = await fetch('/api/greeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          logger.warn('AUDIO', 'Greeting API request failed', { status: response.status })
          return
        }

        const data = await response.json()

        if (!data.available || !data.audioUrl) {
          logger.info('AUDIO', 'Greeting audio not available (TTS may be disabled)')
          // Still mark as played so we don't retry
          localStorage.setItem(GREETING_PLAYED_KEY, 'true')
          return
        }

        // Create and play the greeting audio
        const audio = new Audio(data.audioUrl)
        greetingAudioRef.current = audio

        logger.info('AUDIO', 'Playing cold start greeting', { duration: data.duration })

        audio.play().catch((error) => {
          // Autoplay might be blocked
          logger.warn('AUDIO', 'Greeting autoplay blocked', { error: error.message })
        })

        // Mark greeting as played regardless of playback success
        // (we fetched it successfully, user heard it or autoplay was blocked)
        localStorage.setItem(GREETING_PLAYED_KEY, 'true')

      } catch (error) {
        logger.error('AUDIO', 'Failed to fetch greeting', { error: error.message })
      }
    }

    // Small delay to let the UI render first
    const timer = setTimeout(playGreeting, 500)

    return () => {
      clearTimeout(timer)
      // Stop greeting audio if component unmounts
      if (greetingAudioRef.current) {
        greetingAudioRef.current.pause()
        greetingAudioRef.current = null
      }
    }
  }, [isColdStart, topics.length, uiState])

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
    setIsStillWorking(false)
    setUiState(UI_STATE.LISTENING)
  }, [])

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

  // Auto-advance slideshow when playing (F044)
  // Uses slide.duration if available, otherwise falls back to DEFAULT_SLIDE_DURATION
  // Header slides advance faster since they're just dividers
  useEffect(() => {
    // Only run auto-advance when in slideshow state, playing, and slides exist
    if (uiState !== UI_STATE.SLIDESHOW || !isPlaying || visibleSlides.length === 0) {
      return
    }

    // Get duration for current slide (in milliseconds)
    const currentSlide = visibleSlides[currentIndex]
    // Header slides should advance faster since they're just dividers (2 seconds)
    const duration = currentSlide?.type === 'header'
      ? 2000
      : (currentSlide?.duration || DEFAULT_SLIDE_DURATION)

    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => {
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
  }, [uiState, isPlaying, currentIndex, visibleSlides])

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

    // Only play audio for content slides (not header slides) that have an audioUrl
    if (currentSlide?.type !== 'header' && currentSlide?.audioUrl && isPlaying) {
      const audio = new Audio(currentSlide.audioUrl)
      slideAudioRef.current = audio

      // F071: Log audio playback start
      logger.debug('AUDIO', 'Starting slide narration playback', {
        slideId: currentSlide.id,
        slideIndex: currentIndex,
      })

      // Start from the beginning
      audio.currentTime = 0
      audio.play().catch((error) => {
        // F071: Log autoplay blocked error
        logger.warn('AUDIO', 'Slide audio playback failed (autoplay may be blocked)', {
          error: error.message,
          slideId: currentSlide.id,
        })
      })
    }

    // Cleanup on unmount or when slide changes
    return () => {
      if (slideAudioRef.current) {
        slideAudioRef.current.pause()
      }
    }
  }, [uiState, currentIndex, visibleSlides, isPlaying])

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
      setLiveTranscription('Listening...')

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

      // Start recording with timeslice for periodic data chunks
      mediaRecorder.start(100) // Emit data every 100ms

      // Reset state for new recording session
      audioChunksRef.current = []
      lastSpeechTimeRef.current = null
      isProcessingRecordingRef.current = false
      setIsListening(true)
      setLiveTranscription('Listening...')
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
    }
  }, [])

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
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'

      // Stop recording - this triggers ondataavailable for the final chunk
      // The ondataavailable handler pushes to audioChunksRef.current synchronously
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }

      // Copy chunks AFTER stop() so we get the final chunk from ondataavailable
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
      setLiveTranscription(transcription)

      logger.info('AUDIO', 'Triggering generation with transcription', {
        query: transcription,
      })

      // F030: Trigger generation with the actual transcribed text
      // Note: handleQuestion is intentionally not in deps to avoid re-renders;
      // it uses current state at call time which is the desired behavior
      handleQuestion(transcription)
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
   * CORE019, CORE020: Handles mic button press down (mouse or touch)
   * Starts recording immediately when user presses the button.
   * Records the press start time for minimum hold duration check.
   * Handles double event firing on mobile by tracking touch state.
   * CORE020: If in slideshow mode, pauses audio and stores resume point.
   */
  const handleMicPressStart = useCallback((event) => {
    // Handle double event firing on mobile: touchstart fires first, then mousedown
    // Track touch state to skip the duplicate mouse event
    if (event.type === 'touchstart') {
      isTouchActiveRef.current = true
    } else if (event.type === 'mousedown' && isTouchActiveRef.current) {
      // Skip mouse event if touch is active (prevents double firing)
      return
    }

    // Prevent default to avoid any text selection or context menus
    event.preventDefault()

    // CORE020: If in slideshow mode, pause audio and store resume point
    if (uiState === UI_STATE.SLIDESHOW) {
      // Pause the current slide audio immediately
      if (slideAudioRef.current) {
        slideAudioRef.current.pause()
        logger.debug('AUDIO', 'Interrupt: paused slideshow audio during mic press')
      }

      // Pause slideshow auto-advance
      setIsPlaying(false)

      // CORE022: Store the current position for resume functionality
      // Find the topic ID for the current slide
      const currentSlide = visibleSlides[currentIndex]
      if (currentSlide) {
        const resumePoint = {
          topicId: currentSlide.topicId || null,
          slideIndex: currentIndex,
        }
        setInterruptResumePoint(resumePoint)
        logger.info('AUDIO', 'Interrupt: stored resume point', {
          slideIndex: currentIndex,
          topicId: resumePoint.topicId,
        })
      }
    }

    // Record the press start time for duration check
    micPressStartTimeRef.current = Date.now()
    isRecordingStartedRef.current = false

    // Start recording immediately
    logger.debug('AUDIO', 'Push-to-talk: button pressed, starting recording')
    startListening()

    // Mark recording as started after a brief moment
    // This allows startListening to initialize before we track it
    setTimeout(() => {
      if (micPressStartTimeRef.current !== null) {
        isRecordingStartedRef.current = true
      }
    }, 50)
  }, [startListening, uiState, visibleSlides, currentIndex])

  /**
   * CORE019: Handles mic button release (mouse or touch)
   * Checks if the hold duration meets minimum threshold, then processes recording.
   * Quick taps (< 300ms) are ignored to prevent accidental activation.
   * Handles double event firing on mobile by tracking touch state.
   */
  const handleMicPressEnd = useCallback((event) => {
    // Handle double event firing on mobile: touchend fires first, then mouseup
    // Track touch state to skip the duplicate mouse event
    if (event.type === 'touchend') {
      // Reset touch state after a short delay to allow for edge cases
      setTimeout(() => { isTouchActiveRef.current = false }, 100)
    } else if (event.type === 'mouseup' && isTouchActiveRef.current) {
      // Skip mouse event if touch is active (prevents double firing)
      return
    }

    // Prevent default behavior
    event.preventDefault()

    // Check if there was a valid press start
    if (micPressStartTimeRef.current === null) {
      return
    }

    const holdDuration = Date.now() - micPressStartTimeRef.current
    micPressStartTimeRef.current = null

    // Check minimum hold duration to prevent accidental taps
    if (holdDuration < AUDIO_CONFIG.MIN_HOLD_DURATION) {
      logger.debug('AUDIO', 'Push-to-talk: quick tap detected, canceling recording', {
        holdDuration,
        minRequired: AUDIO_CONFIG.MIN_HOLD_DURATION,
      })
      // Cancel the recording without processing
      stopListening()
      setLiveTranscription('')
      isRecordingStartedRef.current = false
      return
    }

    // Valid hold duration - stop recording and process
    logger.debug('AUDIO', 'Push-to-talk: button released, processing recording', {
      holdDuration,
    })

    // Process the recording
    handleVoiceComplete()
    isRecordingStartedRef.current = false
  }, [handleVoiceComplete, stopListening])

  /**
   * CORE019: Handles mouse leaving the mic button while pressed
   * This is an edge case where user drags mouse off the button.
   * We still process the recording in this case.
   */
  const handleMicMouseLeave = useCallback(() => {
    // Only handle if we're actively recording from a button press
    if (micPressStartTimeRef.current !== null && isRecordingStartedRef.current) {
      const holdDuration = Date.now() - micPressStartTimeRef.current
      micPressStartTimeRef.current = null

      // If held long enough, process the recording
      if (holdDuration >= AUDIO_CONFIG.MIN_HOLD_DURATION) {
        logger.debug('AUDIO', 'Push-to-talk: mouse left button, processing recording', {
          holdDuration,
        })
        handleVoiceComplete()
      } else {
        // Cancel if not held long enough
        logger.debug('AUDIO', 'Push-to-talk: mouse left button too early, canceling', {
          holdDuration,
        })
        stopListening()
        setLiveTranscription('')
      }
      isRecordingStartedRef.current = false
    }
  }, [handleVoiceComplete, stopListening])

  /**
   * CORE019: Handles touch cancel events (e.g., system interruption)
   * Ensures recording is cleaned up properly if the touch is cancelled.
   */
  const handleMicTouchCancel = useCallback(() => {
    if (micPressStartTimeRef.current !== null) {
      logger.debug('AUDIO', 'Push-to-talk: touch cancelled, canceling recording')
      micPressStartTimeRef.current = null
      stopListening()
      setLiveTranscription('')
      isRecordingStartedRef.current = false
    }
  }, [stopListening])

  /**
   * CORE019: Handles keyboard key down for mic button accessibility
   * Allows Enter and Space keys to activate push-to-talk for keyboard users.
   */
  const handleMicKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleMicPressStart(event)
    }
  }, [handleMicPressStart])

  /**
   * CORE019: Handles keyboard key up for mic button accessibility
   * Allows Enter and Space keys to release push-to-talk for keyboard users.
   */
  const handleMicKeyUp = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleMicPressEnd(event)
    }
  }, [handleMicPressEnd])

  /**
   * Classify a query to determine if it's a follow-up, new topic, or slide question
   * CORE023: Added slide_question classification support
   * F068: Logs API request and response
   * @param {string} query - The user's question
   * @param {AbortSignal} signal - AbortController signal for cancellation (F053)
   * @returns {Promise<{classification: string, shouldEvictOldest: boolean, evictTopicId: string|null}>}
   */
  const classifyQuery = async (query, signal) => {
    // If no active topic, it's always a new topic
    if (!activeTopic) {
      logger.debug('API', 'Skipping classify (no active topic)')
      return {
        classification: 'new_topic',
        shouldEvictOldest: false,
        evictTopicId: null,
      }
    }

    // F068: Start timing for classify API
    logger.time('API', 'classify-request')
    logger.info('API', 'POST /api/classify', {
      endpoint: '/api/classify',
      method: 'POST',
      activeTopicId: activeTopic.id,
    })

    // CORE023: Get current slide context for slide_question detection
    // Only include context if we're in slideshow state with a valid content slide
    const currentSlide = uiState === UI_STATE.SLIDESHOW && visibleSlides[currentIndex] && visibleSlides[currentIndex].type !== 'header'
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
          activeTopicId: activeTopic.id,
          activeTopic: {
            name: activeTopic.name,
            icon: activeTopic.icon,
          },
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
   * Handle a user question (from voice or text input)
   * Classifies the query, handles follow-up vs new topic, manages slide cache
   * F015: Sends clientId to API for WebSocket progress updates
   * F039: Follow-up appends slides
   * F040: New topic creates header card
   * F041: Slide cache limits in-memory topics
   * F052: Network error shows retry option
   * F053: Generation timeout handled with AbortController
   */
  const handleQuestion = async (query) => {
    if (!query.trim()) return

    // Reset engagement from previous queries and transition to generating state
    setEngagement(null)
    setIsColdStart(false)
    setUiState(UI_STATE.GENERATING)
    setLiveTranscription('')
    setTextInput('')
    setErrorMessage('')
    setIsStillWorking(false)
    // F015: Reset generation progress for new query
    setGenerationProgress({ stage: null, message: '', slidesReady: 0, totalSlides: 0 })
    // Reset the slideshow finished flag when starting new generation
    hasFinishedSlideshowRef.current = false

    // Create AbortController for timeout handling (F053)
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    // Start "Still working..." timer (F053)
    stillWorkingTimerRef.current = setTimeout(() => {
      setIsStillWorking(true)
    }, GENERATION_TIMEOUT.STILL_WORKING_MS)

    // F072: Start timing for full generation pipeline
    logger.time('GENERATION', 'full-pipeline')

    try {
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
        body: JSON.stringify({ query: query.trim() }),
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
          // Note: suggestedQuestions are displayed but NOT auto-added to queue
          // Users must tap them to add (F047)
          setEngagement(data)
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

      // Classify the query to determine if it's a follow-up, new topic, or slide question
      const classifyResult = await classifyQuery(query, signal)

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
              query: query.trim(),
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

      const isFollowUp = classifyResult.classification === 'follow_up'

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
            query: query.trim(),
            topicId: activeTopic.id,
            conversationHistory: [],
            clientId: wsClientId,
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
            query: query.trim(),
            topicId: null,
            conversationHistory: [],
            clientId: wsClientId,
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

      // Wait for engagement to complete before transitioning (if still pending)
      await engagementPromise

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
              ? { ...topic, slides: nextSlides, lastAccessedAt: now }
              : topic
          )
          return pruneSlideCache(updated, activeTopic.id)
        })

        // Navigate to the first new slide after appending (header + previous slides)
        const headerOffset = 1
        setCurrentIndex(previousSlideCount + headerOffset)
        // F072: End timing for full generation pipeline
        logger.timeEnd('GENERATION', 'full-pipeline')
        setUiState(UI_STATE.SLIDESHOW)

      } else if (newTopicData && generateData.slides?.length > 0) {
        // F040: Create new topic with header card
        const now = Date.now()
        const newTopic = {
          id: newTopicData.id,
          name: newTopicData.name,
          icon: newTopicData.icon,
          headerSlide: createHeaderSlide(newTopicData),
          slides: generateData.slides,
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
        setTopics((prev) => pruneSlideCache([...prev, newTopic], newTopic.id))

        // Set the new topic as active and show its header slide
        setActiveTopicId(newTopic.id)
        setCurrentIndex(0)
        // F072: End timing for full generation pipeline
        logger.timeEnd('GENERATION', 'full-pipeline')
        setUiState(UI_STATE.SLIDESHOW)

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
   * Returns to listening state to start a fresh topic
   */
  const handleNewTopic = useCallback(() => {
    // Transition to listening state to start fresh
    setUiState(UI_STATE.LISTENING)
    setLiveTranscription('')
    setTextInput('')
    setEngagement(null)
    // Don't reset cold start flag - that's for first-time users only
  }, [])

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
    <div className="min-h-screen flex">
      {/* CORE016, CORE017: Topic sidebar - hidden when no topics, visible on desktop, hamburger on mobile */}
      <TopicSidebar
        topics={topics}
        activeTopic={activeTopic}
        onNavigateToTopic={handleNavigateToTopic}
        onNewTopic={handleNewTopic}
      />

      {/* Main content area - centered on wide screens when sidebar is present */}
      <div className={`
        flex-1 min-h-screen flex flex-col items-center justify-center
        px-4 py-4 pb-24 md:pb-4
        ${topics.length > 0 ? 'md:ml-0' : ''}
      `}>
        {/* F055: max-width 800px centered on desktop, F056: full-width on mobile */}
        <main className="w-full max-w-4xl mx-auto">
        {uiState === UI_STATE.LISTENING && (
          <div className="flex flex-col items-center gap-6 px-4 md:px-0">
            {/* Waveform visualization - responds to audio input when listening */}
            <div className="flex items-center justify-center gap-1 h-16">
              {[...Array(AUDIO_CONFIG.WAVEFORM_BARS)].map((_, i) => {
                // Calculate bar height based on audio level when listening
                // Each bar gets a slightly different height for visual variety
                const baseHeight = 10
                const maxAdditionalHeight = 50

                // When listening, use actual audio level; otherwise use subtle animation
                let height
                if (isListening && audioLevel > 0) {
                  // Create wave effect by varying height based on bar position
                  // Bars in the middle are taller, creating a natural wave shape
                  const middleIndex = AUDIO_CONFIG.WAVEFORM_BARS / 2
                  const distanceFromMiddle = Math.abs(i - middleIndex)
                  const positionFactor = 1 - (distanceFromMiddle / middleIndex) * 0.5

                  // Add some randomness for organic feel
                  const randomFactor = 0.8 + Math.random() * 0.4

                  height = baseHeight + (audioLevel / 100) * maxAdditionalHeight * positionFactor * randomFactor
                } else {
                  // Default idle animation - gentle wave
                  height = baseHeight + Math.sin(Date.now() / 500 + i * 0.5) * 5 + 10
                }

                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isListening ? 'bg-primary' : 'bg-primary/50'
                    }`}
                    style={{
                      height: `${Math.max(baseHeight, Math.min(60, height))}px`,
                      // Only use CSS animation when not actively listening
                      // Use longhand properties to avoid shorthand/longhand conflict warning
                      animationName: isListening ? 'none' : 'wave',
                      animationDuration: '0.5s',
                      animationTimingFunction: 'ease-in-out',
                      animationIterationCount: 'infinite',
                      animationDelay: isListening ? '0s' : `${i * 0.05}s`,
                    }}
                  />
                )
              })}
            </div>

            {/* Status text or live transcription */}
            <p className={`text-lg ${isListening ? 'text-primary font-medium' : 'text-gray-500'}`}>
              {liveTranscription || "Ask me anything..."}
            </p>

            {/* Permission denied message (F054) - directs user to text input */}
            {permissionState === PERMISSION_STATE.DENIED && (
              <div className="text-center">
                <p className="text-sm text-red-500 mb-2">
                  Microphone access denied. Please enable it in your browser settings.
                </p>
                <p className="text-sm text-gray-500">
                  You can still use the text input below to ask questions.
                </p>
              </div>
            )}

            {/* Text input fallback - F057: min-height 44px for touch target */}
            <form onSubmit={handleTextSubmit} className="w-full max-w-md">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type your question here..."
                className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-lg focus:border-primary focus:outline-none"
              />
            </form>

            {/* Example questions (cold start only) - F057: touch targets 44px */}
            {isColdStart && (
              <div className="mt-4 space-y-3 w-full max-w-md">
                <p className="text-sm text-gray-400">Try asking:</p>
                {EXAMPLE_QUESTIONS.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(question)}
                    className="block w-full px-4 py-3 min-h-[44px] text-left bg-surface hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    "{question}"
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {uiState === UI_STATE.GENERATING && (
          <div className="flex flex-col items-center gap-6 px-4 md:px-0">
            {/* Loader */}
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />

            {/* F015: Status message - shows WebSocket progress or fallback messages */}
            <p className="text-lg">
              {isStillWorking
                ? 'Still working...'
                : generationProgress.message || 'Creating your explanation...'}
            </p>
            {/* F015: Show slides count from WebSocket progress */}
            <p className="text-sm text-gray-500">
              [{generationProgress.totalSlides > 0
                ? `Generating ${generationProgress.totalSlides} slides`
                : 'Preparing slides...'}]
            </p>

            {/* Cancel button - shown when taking too long (F053) - F057: 44px touch target */}
            {isStillWorking && (
              <button
                onClick={cancelGeneration}
                className="px-4 py-2 min-h-[44px] text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}

            {/* Fun fact card - displays while slides are generating (F045) */}
            {engagement?.funFact && (
              <FunFactCard funFact={engagement.funFact} />
            )}

            {/* Suggestion cards - follow-up questions to queue (F046, F047) */}
            {engagement?.suggestedQuestions && engagement.suggestedQuestions.length > 0 && (
              <div className="w-full max-w-md space-y-2 mt-2">
                <p className="text-sm text-gray-400">You might also wonder...</p>
                {engagement.suggestedQuestions.map((question, i) => (
                  <SuggestionCard
                    key={i}
                    question={question}
                    isQueued={isQuestionQueued(question)}
                    onToggleQueue={toggleQueueStatus}
                  />
                ))}
              </div>
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

            {/* Option to go back to listening state */}
            <button
              onClick={() => setUiState(UI_STATE.LISTENING)}
              className="px-4 py-2 min-h-[44px] text-gray-500 hover:text-gray-700 transition-colors"
            >
              Ask a different question
            </button>
          </div>
        )}

        {uiState === UI_STATE.SLIDESHOW && visibleSlides.length > 0 && (
          <div className="flex flex-col items-center gap-4 px-4 md:px-0">
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
                  <p className="text-lg text-center max-h-20 overflow-hidden mt-4">
                    {visibleSlides[currentIndex]?.subtitle}
                  </p>
                </>
              )}
            </div>

            {/* F044, F057: Progress dots - show slides for current topic with 44px touch target */}
            <div className="flex items-center gap-1 flex-wrap justify-center" role="tablist" aria-label="Slide navigation">
              {visibleSlides.map((slide, i) => {
                // Use different styling for header vs content dots
                const isHeader = slide.type === 'header'
                return (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentIndex(i)}
                    role="tab"
                    aria-selected={i === currentIndex}
                    aria-label={
                      isHeader
                        ? `Go to ${slide.topicName} topic header`
                        : `Go to slide ${i + 1} of ${visibleSlides.length}`
                    }
                    className="p-2 transition-colors cursor-pointer hover:scale-125"
                  >
                    {/* Inner dot - visual indicator, outer padding provides 44px touch target */}
                    <span
                      className={`block ${
                        isHeader
                          ? `w-4 h-3 rounded ${i === currentIndex ? 'bg-primary' : 'bg-gray-400'}`
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
          </div>
        )}
        </main>

        {/* F038, F058, CORE019: Mic button - push-to-talk with fixed position for mobile */}
        {/* Hold to record, release to send. Quick taps (<300ms) are ignored. */}
        <button
          // CORE019: Push-to-talk event handlers for mouse
          onMouseDown={uiState !== UI_STATE.GENERATING && uiState !== UI_STATE.ERROR ? handleMicPressStart : undefined}
          onMouseUp={uiState !== UI_STATE.GENERATING && uiState !== UI_STATE.ERROR ? handleMicPressEnd : undefined}
          onMouseLeave={handleMicMouseLeave}
          // CORE019: Push-to-talk event handlers for touch (mobile)
          onTouchStart={uiState !== UI_STATE.GENERATING && uiState !== UI_STATE.ERROR ? handleMicPressStart : undefined}
          onTouchEnd={uiState !== UI_STATE.GENERATING && uiState !== UI_STATE.ERROR ? handleMicPressEnd : undefined}
          onTouchCancel={handleMicTouchCancel}
          // CORE019: Keyboard accessibility - Enter/Space activate push-to-talk
          onKeyDown={uiState !== UI_STATE.GENERATING && uiState !== UI_STATE.ERROR ? handleMicKeyDown : undefined}
          onKeyUp={uiState !== UI_STATE.GENERATING && uiState !== UI_STATE.ERROR ? handleMicKeyUp : undefined}
          disabled={uiState === UI_STATE.GENERATING || uiState === UI_STATE.ERROR}
          aria-label={isListening ? 'Recording - release to send' : 'Hold to record'}
          className={`fixed left-1/2 z-50 w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all select-none ${
            uiState === UI_STATE.GENERATING || uiState === UI_STATE.ERROR
              ? 'bg-gray-300 cursor-not-allowed'
              : isListening
                ? 'bg-red-500 hover:bg-red-600 mic-pulse'
                : 'bg-primary hover:scale-105'
          } text-white`}
          style={{
            // F058: Use safe area inset for notched devices, fallback to 24px
            bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
            // Prevent touch callout on iOS
            WebkitTouchCallout: 'none',
            // Prevent text selection
            userSelect: 'none',
            // Explicit transform to ensure centering works with scale
            // Tailwind's -translate-x-1/2 and scale-110 don't compose properly
            transform: isListening
              ? 'translateX(-50%) scale(1.1)'
              : 'translateX(-50%)',
          }}
        >
          {/* Show stop icon when listening, mic icon otherwise */}
          {isListening ? (
            <span aria-hidden="true" className="w-5 h-5 bg-white rounded" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-8 h-8"
              aria-hidden="true"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>

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
