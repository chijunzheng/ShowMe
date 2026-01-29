import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Toast from './components/Toast'
import TopicSidebar from './components/TopicSidebar'
import { HomeScreen, ListeningScreen, GeneratingScreen, ErrorScreen, QuizResultsScreen, LoadingTopicScreen, SlideshowScreen, SocraticScreen, QuizPromptScreen, QuizActiveScreen } from './components/screens'
import RaiseHandButton from './components/RaiseHandButton'
import { useWebSocket, PROGRESS_TYPES } from './hooks/useWebSocket'
import useSlideAudio from './hooks/useSlideAudio.js'
import useVoiceAgent from './hooks/useVoiceAgent.js'
import useQuestionHandler from './hooks/useQuestionHandler.js'
import useTopicManagement from './hooks/useTopicManagement.js'
import logger from './utils/logger'
import { playMicOnSound, playRecordingCompleteSound, playAchievementSound } from './utils/soundEffects'
import AchievementToast from './components/AchievementToast'
import Confetti from './components/Confetti'
import useUserProgress from './hooks/useUserProgress'
// WB018: World Builder gamification imports
import BottomTabBar from './components/BottomTabBar'
import WorldView from './components/WorldView'
import PieceUnlockCelebration from './components/PieceUnlockCelebration'
import TierUpCelebration from './components/TierUpCelebration'
// WB015: Quick mode XP toast
import QuickXpToast from './components/QuickXpToast'
import useWorldStats from './hooks/useWorldStats'
import useQuizHandlers from './hooks/useQuizHandlers.js'
import useSocraticHandlers from './hooks/useSocraticHandlers.js'

// Import constants from centralized config
import {
  UI_STATE,
  EXPLANATION_LEVEL,
  PERMISSION_STATE,
  AUDIO_CONFIG,
  TTS_PREFETCH_CONFIG,
  SLIDE_TIMING,
  DEFAULT_QUESTIONS,
  DISPLAY_GREETINGS,
  HOME_HEADLINES,
  GENERATION_TIMEOUT,
} from './constants/appConfig.js'

// Import storage utilities
import {
  loadPersistedTopics,
  saveTopicsToStorage,
  createHeaderSlide,
  loadSlidesForTopic,
} from './utils/topicStorage.js'

// Import slide helpers
import {
  buildTopicSlides,
  isTrivialTranscription,
} from './utils/slideHelpers.js'

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

// Extract timing constants from SLIDE_TIMING
const SLIDE_TRANSITION_PAUSE_MS = SLIDE_TIMING.TRANSITION_PAUSE_MS
const MANUAL_FINISH_GRACE_MS = SLIDE_TIMING.MANUAL_FINISH_GRACE_MS

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
    clientId: userClientId,
    recordQuestionAsked,
    recordSocraticAnswered,
    recordDeepLevelUsed
  } = useUserProgress()

  // UI002: World stats for home screen display
  const {
    totalXP,
    tier: worldTier,
    xpProgress,
    pieceCount,
    isLoading: isWorldStatsLoading,
    refresh: refreshWorldStats,
  } = useWorldStats(userClientId)

  // Slide audio persistence callback (defined later, referenced via ref)
  const persistSlideAudioCallbackRef = useRef(null)

  // Slide audio/TTS hook
  const slideAudio = useSlideAudio({
    onPersistSlideAudio: (slideId, audioUrl, duration) => {
      persistSlideAudioCallbackRef.current?.(slideId, audioUrl, duration)
    },
  })

  // Voice agent hook - pass rate limit refs from slideAudio for coordination
  const voiceAgent = useVoiceAgent({
    ttsRateLimitUntilRef: slideAudio.ttsRateLimitUntilRef,
    lastTtsRequestTimeRef: slideAudio.lastTtsRequestTimeRef,
  })

  // POLISH-001: Celebration state
  const [showConfetti, setShowConfetti] = useState(false)
  const [currentToastBadge, setCurrentToastBadge] = useState(null)

  // SOCRATIC-003: State for Socratic mode data
  const [socraticSlides, setSocraticSlides] = useState([])
  const [socraticTopicName, setSocraticTopicName] = useState('')
  const [socraticLanguage, setSocraticLanguage] = useState('en')

  // WB018: World Builder gamification state
  const [activeTab, setActiveTab] = useState('learn') // 'learn' | 'world'
  const [worldBadge, setWorldBadge] = useState(0) // New piece notification count
  const [learnMode, setLearnMode] = useState('full') // 'quick' | 'full'
  // Quiz flow state
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizTopicId, setQuizTopicId] = useState(null)
  const [quizTopicName, setQuizTopicName] = useState('')
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false)
  const [quizResults, setQuizResults] = useState(null)
  const [unlockedPiece, setUnlockedPiece] = useState(null)
  const [showPieceCelebration, setShowPieceCelebration] = useState(false)
  // WB015: Quick mode XP toast state
  const [showQuickXpToast, setShowQuickXpToast] = useState(false)
  const [quickXpEarned, setQuickXpEarned] = useState(0)
  // UI008: Tier upgrade celebration state
  const [showTierCelebration, setShowTierCelebration] = useState(false)
  const [tierUpgradeInfo, setTierUpgradeInfo] = useState(null)

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
  const activeTopicRef = useRef(activeTopic)
  useEffect(() => {
    activeTopicRef.current = activeTopic
  }, [activeTopic])

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
        const response = await fetch(`${API_ENDPOINTS.SLIDES_BASE}/load`, {
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
  const triggerSlideshowFinished = useCallback(() => {
    if (hasFinishedSlideshowRef.current) return
    hasFinishedSlideshowRef.current = true
    setSlideshowFinished(true)
  }, [])

  // Voice agent queue - use hook for state/refs, add app-specific refs
  const {
    voiceAgentQueue,
    isVoiceAgentSpeaking,
    setVoiceAgentQueue,
    setIsVoiceAgentSpeaking,
    enqueueVoiceAgentMessage,
    voiceAgentBusyRef,
    voiceAgentAudioRef,
    voiceAgentQueueRef,
    prefetchedTtsRef,
    fetchTtsForItem,
    prefetchNextItemTts,
  } = voiceAgent
  const resumeListeningAfterVoiceAgentRef = useRef(false)
  const spokenFunFactRef = useRef(null)


  // Audio playback ref for slide narration (F037)
  const slideAudioRef = useRef(null)
  const lastSlideIdRef = useRef(null)
  const resumeListeningAfterSlideRef = useRef(false)

  // Track if we should pause after the current slide (raise-hand flow)
  const pauseAfterCurrentSlideRef = useRef(false)
  // Track the transition timeout for cleanup when slide changes or unmounts
  const slideTransitionTimeoutRef = useRef(null)
  const manualFinishTimeoutRef = useRef(null)
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

  // Set persist callback ref so the hook can call it
  useEffect(() => {
    persistSlideAudioCallbackRef.current = persistSlideAudio
  }, [persistSlideAudio])

  // Use slide audio functions from hook
  const { requestSlideAudio, prefetchSlideAudio, prefetchSlideNarrationBatch, getCachedSlideAudio, getSlideDuration, slideAudioCacheRef, slideAudioFailureRef, ttsRateLimitUntilRef, lastTtsRequestTimeRef } = slideAudio

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
          // Trigger state update outside setter for Socratic mode
          setTimeout(() => triggerSlideshowFinished(), 0)
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
    triggerSlideshowFinished,
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

  // Mark slideshow finished when user manually pauses on the final slide.
  useEffect(() => {
    if (manualFinishTimeoutRef.current) {
      clearTimeout(manualFinishTimeoutRef.current)
      manualFinishTimeoutRef.current = null
    }

    if (uiState !== UI_STATE.SLIDESHOW || slideshowFinished) {
      return
    }

    if (isPlaying || isSlideNarrationPlaying || visibleSlides.length === 0) {
      return
    }

    const isAtLastParent = currentIndex >= visibleSlides.length - 1
    if (!isAtLastParent) {
      return
    }

    const hasChildren = activeChildSlides.length > 0
    const isAtLastChild = hasChildren
      ? currentChildIndex !== null && currentChildIndex >= activeChildSlides.length - 1
      : currentChildIndex === null

    if (!isAtLastChild) {
      return
    }

    manualFinishTimeoutRef.current = setTimeout(() => {
      manualFinishTimeoutRef.current = null
      triggerSlideshowFinished()
    }, MANUAL_FINISH_GRACE_MS)

    return () => {
      if (manualFinishTimeoutRef.current) {
        clearTimeout(manualFinishTimeoutRef.current)
        manualFinishTimeoutRef.current = null
      }
    }
  }, [
    uiState,
    slideshowFinished,
    isPlaying,
    isSlideNarrationPlaying,
    currentIndex,
    currentChildIndex,
    activeChildSlides.length,
    visibleSlides.length,
    triggerSlideshowFinished,
  ])

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
                // Trigger state update outside setter for Socratic mode
                setTimeout(() => triggerSlideshowFinished(), 0)
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
    triggerSlideshowFinished,
  ])

  // Auto-trigger queued questions after slideshow ends (F048)
  // This creates a seamless learning flow where users can queue questions
  // during generation and have them automatically explored
  useEffect(() => {
    // Only trigger when slideshow just finished and there are queued questions
    if (!slideshowFinished || questionQueue.length === 0) {
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
  }, [slideshowFinished, questionQueue])

  // WB015: Award XP for quick mode (no world piece) - defined before useEffect that uses it
  const awardQuickXP = useCallback(async () => {
    if (!wsClientId) return

    try {
      const response = await fetch('/api/world/quick-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: wsClientId }),
      })

      if (response.ok) {
        const data = await response.json()
        setQuickXpEarned(data.xpEarned)
        setShowQuickXpToast(true)
        logger.info('QUICK_XP', 'Quick mode XP awarded', { xpEarned: data.xpEarned, totalXP: data.totalXP })

        // Refresh world stats to reflect new XP
        if (typeof refreshWorldStats === 'function') {
          refreshWorldStats()
        }
      }
    } catch (error) {
      logger.error('QUICK_XP', 'Failed to award quick mode XP', { error: error.message })
    }
  }, [wsClientId])

  // SOCRATIC-003 + WB018: Trigger quiz prompt (Full mode) or Socratic mode (Quick mode) when slideshow finishes
  useEffect(() => {
    // Only trigger when slideshow just finished and NO queued questions
    if (!slideshowFinished || questionQueue.length > 0) {
      return
    }

    // Don't trigger if we don't have an active topic
    if (!activeTopicId) {
      return
    }

    // Use ref to avoid timer cancellation when visibleSlides updates from TTS persistence
    const slides = visibleSlidesRef.current
    if (!slides || slides.length === 0) {
      return
    }

    // Delay before transitioning to next mode
    const timer = setTimeout(() => {
      // Get topic data (use ref for latest)
      const topic = activeTopicRef.current
      if (!topic || topic.id !== activeTopicId) return

      const currentSlides = visibleSlidesRef.current
      if (!currentSlides || currentSlides.length === 0) return

      const contentSlides = currentSlides.filter(s => s.type !== 'header')
      if (contentSlides.length > 0) {
        // Reset slideshow flags
        hasFinishedSlideshowRef.current = false
        setSlideshowFinished(false)

        // WB018: Branch based on learn mode
        if (learnMode === 'full') {
          // Full mode: Show quiz prompt to encourage knowledge retention
          setUiState(UI_STATE.QUIZ_PROMPT)
        } else {
          // Quick mode: Show Socratic questioning + award quick XP (WB015)
          setSocraticSlides(contentSlides)
          setSocraticTopicName(topic.name || 'this topic')
          // Detect language from first slide subtitle
          const firstSubtitle = contentSlides[0]?.subtitle || ''
          const hasChineseChars = /[\u4e00-\u9fff]/.test(firstSubtitle)
          setSocraticLanguage(hasChineseChars ? 'zh' : 'en')
          setUiState(UI_STATE.SOCRATIC)
          // WB015: Award small XP for quick mode (no world piece)
          awardQuickXP()
        }
      }
    }, 2000) // 2 second delay to let user absorb final slide

    return () => clearTimeout(timer)
  }, [slideshowFinished, questionQueue.length, activeTopicId, learnMode, awardQuickXP]) // WB015: Added awardQuickXP dependency

  // SOCRATIC-003: Socratic mode handlers
  const {
    handleSocraticComplete,
    handleSocraticSkip,
    handleSocraticFollowUp,
  } = useSocraticHandlers({
    setUiState,
    setSocraticSlides,
    recordSocraticAnswered,
    handleQuestionRef,
  })

  // WB018: Tab navigation handler with badge clearing
  const handleTabChange = useCallback((tab) => {
    if (tab === 'world') {
      // Clear world badge when user views world
      setWorldBadge(0)
    }
    setActiveTab(tab)
  }, [])

  // WB018: Quiz and celebration handlers
  const {
    handleStartQuiz,
    handleQuizComplete,
    handleQuizSkip,
    handleQuizPromptSkip,
    handlePieceCelebrationClose,
    handleViewWorldFromCelebration,
    handleTierCelebrationClose,
    handleTierViewWorld,
    handleQuizResultsContinue,
  } = useQuizHandlers({
    activeTopic,
    wsClientId,
    visibleSlidesRef,
    setIsLoadingQuiz,
    setQuizTopicId,
    setQuizTopicName,
    setQuizQuestions,
    setQuizResults,
    setUiState,
    setSocraticSlides,
    setSocraticTopicName,
    setUnlockedPiece,
    setShowPieceCelebration,
    setWorldBadge,
    setTierUpgradeInfo,
    setShowTierCelebration,
    setActiveTab,
    refreshWorldStats,
    quizTopicId,
    quizTopicName,
    tierUpgradeInfo,
  })

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
      const classifyResult = await classifyQuery({
        query: trimmedQuery,
        signal,
        activeTopic,
        topics,
        uiState,
        visibleSlides,
        currentIndex,
      })

      if (classifyResult.classification === 'chitchat') {
        try {
          const chitchatResult = await requestChitchatResponse({
            query: trimmedQuery,
            signal,
            activeTopicName: activeTopic?.name,
          })
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
      {/* POLISH-001: Achievement celebration components */}
      <Confetti isActive={showConfetti} onComplete={handleConfettiComplete} />
      <AchievementToast badge={currentToastBadge} onDismiss={handleToastDismiss} />

      {/* WB015: Quick mode XP toast */}
      <QuickXpToast
        xpEarned={quickXpEarned}
        visible={showQuickXpToast}
        onDismiss={() => setShowQuickXpToast(false)}
        onSwitchMode={() => {
          setShowQuickXpToast(false)
          setLearnMode('full')
        }}
      />

      {/* Left sidebar - Recent Topics */}
      {topics.length > 0 && (
        <TopicSidebar
          topics={topics}
          activeTopic={activeTopic}
          onNavigateToTopic={handleNavigateToTopic}
          onNewTopic={() => {
            setActiveTopicId(null)
            setUiState(UI_STATE.HOME)
          }}
          tier={worldTier}
          xpProgress={xpProgress}
          streakCount={userProgress?.streakCount || 0}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 h-full flex flex-col items-center justify-center px-4 py-4 pb-24 md:pb-4 overflow-y-auto">
        {/* F055: max-width 800px centered on desktop, F056: full-width on mobile */}
        <main className="w-full max-w-4xl mx-auto">
        {/* HOME screen - level selection + voice trigger */}
        {uiState === UI_STATE.HOME && activeTab === 'learn' && (
          <HomeScreen
            homeHeadline={homeHeadline}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
            showTextFallback={showTextFallback}
            setShowTextFallback={setShowTextFallback}
            textInput={textInput}
            setTextInput={setTextInput}
            setIsMicEnabled={setIsMicEnabled}
            setAllowAutoListen={setAllowAutoListen}
            setUiState={setUiState}
            handleQuestion={handleQuestion}
            recordDeepLevelUsed={recordDeepLevelUsed}
          />
        )}

        {uiState === UI_STATE.LISTENING && activeTab === 'learn' && (
          <ListeningScreen
            selectedLevel={selectedLevel}
            isListening={isListening}
            audioLevel={audioLevel}
            liveTranscription={liveTranscription}
            permissionState={permissionState}
            stopListening={stopListening}
            setUiState={setUiState}
          />
        )}

        {uiState === UI_STATE.GENERATING && activeTab === 'learn' && (
          <GeneratingScreen
            isStillWorking={isStillWorking}
            generationProgress={generationProgress}
            generationProgressPercent={generationProgressPercent}
            cancelGeneration={cancelGeneration}
            engagement={engagement}
          />
        )}

        {/* Error state with retry button (F052) */}
        {uiState === UI_STATE.ERROR && (
          <ErrorScreen
            errorMessage={errorMessage}
            retryLastRequest={retryLastRequest}
            setUiState={setUiState}
          />
        )}

        {/* SOCRATIC-003: Socratic questioning mode after slideshow */}
        {uiState === UI_STATE.SOCRATIC && activeTab === 'learn' && socraticSlides.length > 0 && (
          <SocraticScreen
            socraticSlides={socraticSlides}
            socraticTopicName={socraticTopicName}
            socraticLanguage={socraticLanguage}
            suggestedQuestions={activeTopic?.suggestedQuestions || []}
            onComplete={handleSocraticComplete}
            onFollowUp={handleSocraticFollowUp}
            onSkip={handleSocraticSkip}
          />
        )}

        {/* WB018: Quiz prompt screen - shown after slideshow in Full mode */}
        {uiState === UI_STATE.QUIZ_PROMPT && activeTab === 'learn' && (
          <QuizPromptScreen
            topicName={activeTopic?.name}
            onStart={handleStartQuiz}
            onSkip={handleQuizPromptSkip}
            isLoading={isLoadingQuiz}
          />
        )}

        {/* WB018: Quiz screen - active quiz questions */}
        {uiState === UI_STATE.QUIZ && activeTab === 'learn' && quizQuestions.length > 0 && (
          <QuizActiveScreen
            questions={quizQuestions}
            onComplete={handleQuizComplete}
            onSkip={handleQuizSkip}
          />
        )}

        {/* WB018: Quiz results screen */}
        {uiState === UI_STATE.QUIZ_RESULTS && activeTab === 'learn' && quizResults && (
          <QuizResultsScreen
            results={quizResults}
            onContinue={handleQuizResultsContinue}
          />
        )}

        {/* WB018: World View - shown when World tab is active */}
        {activeTab === 'world' && (
          <WorldView
            clientId={wsClientId}
            onStartLearning={() => setActiveTab('learn')}
            onPieceClick={(piece) => {
              // Could show piece details modal in future
              logger.debug('WORLD', 'Piece clicked', { pieceId: piece?.id })
            }}
          />
        )}

        {/* Loading screen for historical topic TTS */}
        {isLoadingTopicAudio && activeTopic && activeTab === 'learn' && (
          <LoadingTopicScreen
            topic={activeTopic}
            progress={loadingTopicProgress}
          />
        )}

        {uiState === UI_STATE.SLIDESHOW && activeTab === 'learn' && visibleSlides.length > 0 && !isLoadingTopicAudio && (
          <SlideshowScreen
            displayedSlide={displayedSlide}
            parentSlide={parentSlide}
            visibleSlides={visibleSlides}
            allTopicSlides={allTopicSlides}
            activeChildSlides={activeChildSlides}
            currentIndex={currentIndex}
            currentChildIndex={currentChildIndex}
            isPreparingFollowUp={isPreparingFollowUp}
            highlightPosition={highlightPosition}
            handleSuggestionClick={handleSuggestionClick}
            setCurrentIndex={setCurrentIndex}
            setCurrentChildIndex={setCurrentChildIndex}
            isFollowUpDrawerOpen={isFollowUpDrawerOpen}
            setIsFollowUpDrawerOpen={setIsFollowUpDrawerOpen}
            wasManualNavRef={wasManualNavRef}
            getSlideDuration={getSlideDuration}
            isSlideNarrationPlaying={isSlideNarrationPlaying}
            slideAudioRef={slideAudioRef}
            isPlaying={isPlaying}
            goToPrevSlide={goToPrevSlide}
            goToNextSlide={goToNextSlide}
            goToChildPrev={goToChildPrev}
            goToChildNext={goToChildNext}
            togglePlayPause={togglePlayPause}
            questionQueue={questionQueue}
            activeTopic={activeTopic}
            handleRegenerate={handleRegenerate}
            handleVersionSwitch={handleVersionSwitch}
            isRegenerating={isRegenerating}
          />
        )}
        </main>

        {/* Raise hand button - only shown during slideshow */}
        {uiState === UI_STATE.SLIDESHOW && activeTab === 'learn' && (
          <RaiseHandButton
            hasSidebar={topics.length > 0}
            showTextFallback={showTextFallback}
            setShowTextFallback={setShowTextFallback}
            isMicEnabled={isMicEnabled}
            isListening={isListening}
            isRaiseHandPending={isRaiseHandPending}
            liveTranscription={liveTranscription}
            handleRaiseHandClick={handleRaiseHandClick}
            textInput={textInput}
            setTextInput={setTextInput}
            handleQuestion={handleQuestion}
            interruptActiveAudio={interruptActiveAudio}
            setIsPlaying={setIsPlaying}
          />
        )}

        {/* Toast notification for queue feedback (F047) */}
        <Toast
          message={toast.message}
          visible={toast.visible}
          onDismiss={hideToast}
        />

        {/* WB018: Bottom Tab Bar for Learn/World navigation */}
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          worldBadge={worldBadge}
          hasSidebar={topics.length > 0}
        />
      </div>

      {/* WB018: Piece unlock celebration overlay */}
      {showPieceCelebration && unlockedPiece && (
        <PieceUnlockCelebration
          piece={unlockedPiece}
          onComplete={handlePieceCelebrationClose}
          onViewWorld={handleViewWorldFromCelebration}
        />
      )}

      {/* UI008: Tier upgrade celebration overlay */}
      {showTierCelebration && tierUpgradeInfo && (
        <TierUpCelebration
          fromTier={tierUpgradeInfo.from}
          toTier={tierUpgradeInfo.to}
          onComplete={handleTierCelebrationClose}
          onViewWorld={handleTierViewWorld}
        />
      )}

      {/* UI010: Sidebar spacer removed - using full width layout */}
    </div>
  )
}

export default App
