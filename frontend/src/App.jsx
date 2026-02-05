import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Toast from './components/Toast'
import TopicSidebar from './components/TopicSidebar'
import { HomeScreen, ListeningScreen, GeneratingScreen, ErrorScreen, LoadingTopicScreen, SlideshowScreen, SocraticScreen, ModeSelectorScreen } from './components/screens'
import { MysteryLab, WonderLab, StoryStudio } from './components/LearnModes'
import RaiseHandButton from './components/RaiseHandButton'
import { useWebSocket, PROGRESS_TYPES } from './hooks/useWebSocket'
import useSlideAudio from './hooks/useSlideAudio.js'
import useVoiceAgent from './hooks/useVoiceAgent.js'
import useQuestionHandler from './hooks/useQuestionHandler.js'
import logger from './utils/logger'
import { getClientId } from './utils/clientId'
import { playMicOnSound, playRecordingCompleteSound, playAchievementSound } from './utils/soundEffects'
import AchievementToast from './components/AchievementToast'
import Confetti from './components/Confetti'
import useUserProgress from './hooks/useUserProgress'
// WB018: World Builder gamification imports
import BottomTabBar from './components/BottomTabBar'
// Category utilities (migrated from MagicalTree)
import { calculateTreeLevel, getZoneForCategory } from './utils/categoryUtils'
import TierUpCelebration from './components/TierUpCelebration'
// WB015: Quick mode XP toast
import QuickXpToast from './components/QuickXpToast'
import { ProgressTab } from './components/ProgressTab'
import useWorldStats from './hooks/useWorldStats'
import useSocraticHandlers from './hooks/useSocraticHandlers.js'
import useSlideshowControl from './hooks/useSlideshowControl.js'
import useCelebrations from './hooks/useCelebrations.js'
import useTabNavigation from './hooks/useTabNavigation.js'
import useKnowledgeGraph from './hooks/useKnowledgeGraph'
// WB020: Evolution and pocket scene gamification
import useEvolution from './hooks/useEvolution'
import usePocketScene from './hooks/usePocketScene'
import useReviewSession from './hooks/useReviewSession'
import { EvolutionCelebration } from './components/Celebrations'
import ConnectionSceneReveal from './components/WorldView/ConnectionSceneReveal'
// WB021: Quiz flow screens for dedicated quiz experience

// Import constants from centralized config
import {
  UI_STATE,
  EXPLANATION_LEVEL,
  PERMISSION_STATE,
  AUDIO_CONFIG,
  TTS_PREFETCH_CONFIG,
  SLIDE_TIMING,
  HOME_HEADLINES,
  GENERATION_TIMEOUT,
  STORAGE_LIMITS,
  LEVEL_CONFIG,
  API_ENDPOINTS,
  LOCAL_PROGRESS,
  GENERATION_PROGRESS_PERCENT,
  PROGRESS_MESSAGES,
} from './constants/appConfig.js'

// Import storage utilities
import {
  getStoredClientId,
  persistTopicSlides,
  loadTopicSlidesFromStorage,
  loadSlidesForTopic,
  removeTopicSlides,
  loadPersistedTopics,
  saveTopicsToStorage,
  createHeaderSlide,
} from './utils/topicStorage.js'

// Import slide helpers
import {
  getCurrentVersionLevel,
  buildTopicSlides,
  isTrivialTranscription,
  pruneSlideCache as pruneSlidesCacheHelper,
} from './utils/slideHelpers.js'
import { buildLivingWorldSummaryFromSlides } from './utils/livingWorldSummary.js'

// Extract constants from STORAGE_LIMITS for local use
const MAX_CACHED_TOPICS = STORAGE_LIMITS.MAX_CACHED_TOPICS
const MAX_VERSIONS_PER_TOPIC = STORAGE_LIMITS.MAX_VERSIONS_PER_TOPIC

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
  // Random home headline picked once per session
  const [homeHeadline] = useState(() => HOME_HEADLINES[Math.floor(Math.random() * HOME_HEADLINES.length)])
  // Selected explanation level (session default, also stored per-topic)
  const [selectedLevel, setSelectedLevel] = useState(EXPLANATION_LEVEL.STANDARD)
  // Show text input fallback on home screen
  const [showTextFallback, setShowTextFallback] = useState(false)
  // Note: currentIndex, currentChildIndex, isChapterPickerOpen, isPlaying are managed by useSlideshowControl
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

  // Legacy Living World: Stub values for backward compatibility during migration
  // TODO: Remove these stubs and all worldViewProps after full migration
  const livingWorldState = null
  const livingWorldIsLoading = false
  const livingWorldIsEvolving = false
  const livingWorldTier = 'barren'
  const livingWorldHotspots = []
  const livingWorldError = null
  const evolveWorld = useCallback(async () => null, [])
  const initializeWorld = useCallback(async () => null, [])
  const resetLivingWorld = useCallback(async () => ({ success: true }), [])

  // Knowledge Graph: New data model for topics as constellation nodes
  const {
    graph: knowledgeGraph,
    nodes: graphNodes,
    edges: graphEdges,
    clusters: graphClusters,
    gaps: graphGaps,
    explorerRank,
    isLoading: graphIsLoading,
    addTopic: addTopicToGraph,
    updateMastery: updateGraphMastery,
    addFollowUp: addGraphFollowUp,
    getNode: getGraphNode,
    getNodeByName: getGraphNodeByName,
    topicCount: graphTopicCount,
  } = useKnowledgeGraph()

  const [isWorldRegenerating, setIsWorldRegenerating] = useState(false)
  const [worldRegenProgress, setWorldRegenProgress] = useState({ current: 0, total: 0 })

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
    isLoading: isUserProgressLoading,
    newBadges,
    clearNewBadges,
    clientId: userClientId,
    recordQuestionAsked,
    recordSocraticAnswered,
    recordDeepLevelUsed
  } = useUserProgress()

  // UI002: World stats for home screen display
  const {
    tier: worldTier,
    xpProgress,
    pieces: worldPieces,
    totalXP: totalWorldXP,
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

  // POLISH-001: Celebration state (managed by useCelebrations hook)
  const celebrations = useCelebrations()
  const {
    showConfetti,
    currentToastBadge,
    showBadgeCelebration,
    handleToastDismiss,
    handleConfettiComplete,
    showTierCelebration,
    tierUpgradeInfo,
    showTierUpgrade,
    dismissTierCelebration,
    showQuickXpToast,
    quickXpEarned,
    showQuickXp,
    dismissQuickXpToast,
    pendingSceneReveal,
    showSceneReveal,
    dismissSceneReveal,
  } = celebrations

  // SOCRATIC-003: State for Socratic mode data
  const [socraticSlides, setSocraticSlides] = useState([])
  const [socraticTopicName, setSocraticTopicName] = useState('')
  const [socraticLanguage, setSocraticLanguage] = useState('en')

  // WB018: World Builder gamification state (managed by useTabNavigation hook)
  const {
    activeTab,
    setActiveTab,
    worldBadge,
    setWorldBadge,
    learnMode,
    setLearnMode,
  } = useTabNavigation()

  // Learning Modes state - track which mode is active ('mystery', 'whatif', 'story', or null)
  const [selectedLearningMode, setSelectedLearningMode] = useState(null)
  // Tracks where a learning mode was launched from so Exit/Complete can route back.
  // - after_slideshow: user picked a mode from the Mode Selector after finishing a slideshow
  // - from_progress: user launched a mode from the Progress tab (Quick Practice / Topic sheet)
  const [learnModeOrigin, setLearnModeOrigin] = useState(null) // 'after_slideshow' | 'from_progress' | null

  // Regeneration state (celebration state now managed by useCelebrations hook)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const regeneratingTopicIdRef = useRef(null)

  // WB020: Evolution system - tracks piece evolutions to higher tiers
  const {
    currentEvolution,
    evolutionQueue,
    checkEvolutions,
    processNextEvolution,
  } = useEvolution()

  // WB019: Pocket scenes - generates scene images when pieces form pockets
  const {
    generating: generatingScene,
    generateScene,
    shouldRegenerateScene,
  } = usePocketScene()

  // WB019: handlePocketSceneGenerated now uses showSceneReveal from useCelebrations hook
  const handlePocketSceneGenerated = showSceneReveal

  // WB020: Review session - tracks pieces that need spaced repetition review
  const {
    piecesNeedingReview,
    startReviewSession,
  } = useReviewSession(worldPieces)

  const resetLivingWorldState = useCallback(async () => {
    const result = await resetLivingWorld()
    if (!result?.success) {
      logger.warn('WORLD', 'Failed to reset living world', { error: result?.error })
      return false
    }
    return true
  }, [resetLivingWorld])


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
    if (message.type === 'connected' || message.type === 'registered') return

    const stageMessage = message.data?.stage || PROGRESS_MESSAGES[message.type] || message.type
    if (message.type === PROGRESS_TYPES.ERROR) {
      logger.error('GENERATION', `Pipeline error: ${stageMessage}`, { stage: message.type, data: message.data })
    } else {
      logger.info('GENERATION', `Stage: ${stageMessage}`, { stage: message.type, slidesReady: message.data?.slidesCount || 0 })
    }

    const totalSlides = message.data?.slidesCount || 0
    setGenerationProgress(prev => ({
      stage: message.type,
      message: message.data?.stage || PROGRESS_MESSAGES[message.type] || '',
      slidesReady: message.type === PROGRESS_TYPES.COMPLETE ? totalSlides : prev.slidesReady,
      totalSlides: totalSlides || prev.totalSlides,
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
  const { clientId: wsClientId } = useWebSocket({
    onProgress: handleWebSocketProgress,
    onError: handleWebSocketError,
    autoConnect: true,
  })

  // F041: Topics state - loaded from localStorage if available (CORE027)
  const [topics, setTopics] = useState(() => initialData.topics)
  const [activeTopicId, setActiveTopicId] = useState(null)

  // Active topic (null = HOME screen)
  const activeTopic = useMemo(() => {
    if (topics.length === 0 || !activeTopicId) return null
    return topics.find((topic) => topic.id === activeTopicId) || null
  }, [topics, activeTopicId])
  const activeTopicRef = useRef(activeTopic)

  /**
   * Progress tab topics: local `topics` are the canonical list (watched/learned),
   * and `/api/world` pieces are optional metadata enrichment (zone/review/etc).
   *
   * This prevents Progress from appearing empty when no world pieces exist yet.
   */
  const progressPieces = useMemo(() => {
    const localTopics = Array.isArray(topics) ? topics : []
    const worldPieceList = Array.isArray(worldPieces) ? worldPieces : []

    const piecesByTopicId = new Map()
    const piecesByName = new Map()

    for (const piece of worldPieceList) {
      const rawTopicId = piece?.topicId ?? piece?.id
      if (rawTopicId) {
        piecesByTopicId.set(String(rawTopicId), piece)
      }

      const rawName = typeof piece?.topicName === 'string'
        ? piece.topicName
        : typeof piece?.name === 'string'
          ? piece.name
          : ''
      const normalizedName = rawName.trim().toLowerCase()
      if (normalizedName) {
        piecesByName.set(normalizedName, piece)
      }
    }

    return localTopics
      .filter((topic) => topic && typeof topic === 'object' && typeof topic.id === 'string' && typeof topic.name === 'string')
      .map((topic) => {
        const topicId = String(topic.id)
        const topicName = String(topic.name)
        const normalizedName = topicName.trim().toLowerCase()

        const matchedPiece = piecesByTopicId.get(topicId) || (normalizedName ? piecesByName.get(normalizedName) : null)

        const createdAtMs = typeof topic.createdAt === 'number' ? topic.createdAt : null
        const lastAccessedAtMs = typeof topic.lastAccessedAt === 'number' ? topic.lastAccessedAt : null
        const unlockedAtIso = new Date(createdAtMs ?? lastAccessedAtMs ?? Date.now()).toISOString()

        const versionIndex = topic.currentVersionIndex ?? 0
        const currentVersion = Array.isArray(topic.versions) ? topic.versions[versionIndex] : null
        const topicSlides = Array.isArray(topic.slides)
          ? topic.slides
          : Array.isArray(currentVersion?.slides)
            ? currentVersion.slides
            : []

        const explanationLevel = topic.explanationLevel || currentVersion?.explanationLevel || 'standard'

        return {
          // Normalized "piece-like" shape expected by ProgressTab components
          topicId,
          topicName,
          zone: matchedPiece?.zone || getZoneForCategory(topic.category),
          unlockedAt: matchedPiece?.unlockedAt || unlockedAtIso,
          lastReviewedAt: matchedPiece?.lastReviewedAt || null,
          relatedTopics: Array.isArray(matchedPiece?.relatedTopics) ? matchedPiece.relatedTopics : [],
          slides: topicSlides,
          level: explanationLevel,
        }
      })
  }, [topics, worldPieces])

  // Use explorerRank title from Knowledge Graph, fallback to calculated tree level
  const progressTreeLevel = useMemo(
    () => explorerRank?.title || calculateTreeLevel(progressPieces.length),
    [explorerRank?.title, progressPieces.length]
  )

  const earnedTrophies = useMemo(() => {
    const badgeIds = Array.isArray(userProgress?.badges) ? userProgress.badges : []
    if (badgeIds.length === 0) return []

    const definitions = badgeDefinitions && typeof badgeDefinitions === 'object'
      ? badgeDefinitions
      : {}
    const unlockDates = userProgress?.badgeUnlockDates || {}

    return badgeIds
      .map((badgeId) => {
        const badge = definitions[badgeId]
        const earnedAt = unlockDates?.[badgeId] || null

        if (!badge) {
          return {
            id: badgeId,
            name: badgeId,
            description: '',
            icon: 'trophy',
            earnedAt,
          }
        }

        return {
          id: badgeId,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          earnedAt,
        }
      })
      .filter(Boolean)
  }, [userProgress?.badges, userProgress?.badgeUnlockDates, badgeDefinitions])

  // CORE032: Slides split into top-level (visible) and child slides for 2D navigation
  const allTopicSlides = useMemo(() => buildTopicSlides(activeTopic), [activeTopic])
  const visibleSlides = useMemo(() => allTopicSlides.filter(s => !s.parentId), [allTopicSlides])
  const visibleSlidesRef = useRef(visibleSlides)

  // Sync activeTopic and visibleSlides to refs
  useEffect(() => {
    activeTopicRef.current = activeTopic
    visibleSlidesRef.current = visibleSlides
  }, [activeTopic, visibleSlides])

  // Note: activeChildSlides, displayedSlide come from useSlideshowControl hook (after slideAudio hook)

  // Wrapper for pruneSlideCache helper with local MAX_CACHED_TOPICS
  const pruneSlideCache = useCallback((topicList, keepTopicId) => {
    return pruneSlidesCacheHelper(topicList, keepTopicId, MAX_CACHED_TOPICS)
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
  // Note: isPlayingRef now comes from useSlideshowControl
  const handleQuestionRef = useRef(null)

  // Sync state to refs for use in callbacks
  // Note: isPlayingRef is synced inside useSlideshowControl hook
  useEffect(() => {
    isListeningRef.current = isListening
    isMicEnabledRef.current = isMicEnabled
    allowAutoListenRef.current = allowAutoListen
    isRaiseHandPendingRef.current = isRaiseHandPending
    selectedLevelRef.current = selectedLevel
  }, [isListening, isMicEnabled, allowAutoListen, isRaiseHandPending, selectedLevel])

  // Note: Effect to close follow-up drawer on slide change is now in useSlideshowControl

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

  // Note: hasFinishedSlideshowRef, slideshowFinished, triggerSlideshowFinished now come from useSlideshowControl

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

  // Note: pauseAfterCurrentSlideRef, manualFinishTimeoutRef, wasManualNavRef now come from useSlideshowControl
  // Track the transition timeout for cleanup when slide changes or unmounts
  const slideTransitionTimeoutRef = useRef(null)

  const raiseHandRequestRef = useRef(false)
  // Track if audio was paused due to hand raise (to enable resume when lowered)
  const audioWasPausedForHandRaiseRef = useRef(false)
  // Save audio position when hand raise interrupts, so we can resume from the same spot
  // Format: { slideId: string, currentTime: number } or null
  const savedAudioPositionRef = useRef(null)

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
      // Show the first badge toast using celebrations hook
      showBadgeCelebration(newBadges[0])
      playAchievementSound()
    }
  }, [newBadges, showBadgeCelebration])

  // POLISH-001: Wrap toast dismissal to also clear badges from user progress
  const handleBadgeToastDismiss = useCallback(() => {
    handleToastDismiss()
    clearNewBadges()
  }, [handleToastDismiss, clearNewBadges])

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

  // REFACTOR: Slideshow control hook for navigation, playback, and auto-advance
  const slideshowControl = useSlideshowControl({
    visibleSlides,
    allTopicSlides,
    uiState,
    isVoiceAgentSpeaking,
    isSlideNarrationPlaying,
    isSlideNarrationReady,
    getSlideDuration,
    activeTopic,
  })

  // Destructure slideshow control values
  const {
    currentIndex,
    currentChildIndex,
    isPlaying,
    slideshowFinished,
    isChapterPickerOpen,
    activeChildSlides,
    displayedSlide,
    segments,
    currentSegmentIndex,
    currentSlideInSegment,
    setCurrentIndex,
    setCurrentChildIndex,
    setIsPlaying,
    setSlideshowFinished,
    setIsChapterPickerOpen,
    goToNextSlide,
    goToPrevSlide,
    goToChildNext,
    goToChildPrev,
    goToSegment,
    togglePlayPause,
    triggerSlideshowFinished,
    wasManualNavRef,
    pauseAfterCurrentSlideRef,
    hasFinishedSlideshowRef,
    isPlayingRef,
  } = slideshowControl

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

    // Clear the hand-raise pause flag and saved position since we're fully interrupting
    audioWasPausedForHandRaiseRef.current = false
    savedAudioPositionRef.current = null

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
   * Pause slide audio for hand raise without destroying the audio object.
   * This preserves the playback position so we can resume later.
   */
  const pauseSlideAudioForHandRaise = useCallback(() => {
    // Stop voice agent audio completely (we won't resume this)
    if (voiceAgentAudioRef.current) {
      voiceAgentAudioRef.current.pause()
      voiceAgentAudioRef.current = null
    }
    // Stop slide response audio completely (we won't resume this)
    if (slideResponseAudioRef.current) {
      slideResponseAudioRef.current.pause()
      slideResponseAudioRef.current = null
    }

    // Pause slide narration but keep the audio object so we can resume
    // Also save the position so we can restore it if the audio object gets destroyed
    if (slideAudioRef.current && !slideAudioRef.current.paused && !slideAudioRef.current.ended) {
      savedAudioPositionRef.current = {
        slideId: displayedSlide?.id,
        currentTime: slideAudioRef.current.currentTime,
      }
      slideAudioRef.current.pause()
      audioWasPausedForHandRaiseRef.current = true
      logger.info('AUDIO', 'Paused slide audio for hand raise', {
        slideId: displayedSlide?.id,
        currentTime: slideAudioRef.current.currentTime,
      })
    }

    voiceAgentBusyRef.current = false
    resumeListeningAfterVoiceAgentRef.current = false
    setIsVoiceAgentSpeaking(false)
    setIsSlideNarrationPlaying(false)
    setHighlightPosition(null)

    if (slideTransitionTimeoutRef.current) {
      clearTimeout(slideTransitionTimeoutRef.current)
      slideTransitionTimeoutRef.current = null
    }
  }, [displayedSlide?.id])

  /**
   * Resume slide audio after hand is lowered.
   * Only resumes if the audio was paused by hand raise.
   * Sets isPlaying to true and lets the effect handle the actual resume.
   */
  const resumeSlideAudioAfterHandLower = useCallback(() => {
    if (!audioWasPausedForHandRaiseRef.current) {
      return false
    }

    audioWasPausedForHandRaiseRef.current = false

    if (slideAudioRef.current && slideAudioRef.current.paused && !slideAudioRef.current.ended) {
      logger.info('AUDIO', 'Resuming slide audio after hand lowered', {
        currentTime: slideAudioRef.current.currentTime,
      })
      // Set isPlaying to true - the slide audio effect will handle the actual resume
      setIsPlaying(true)
      return true
    }

    return false
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

      if (!voiceAgentQueueRef.current.some((item) => item.id === currentItem.id)) {
        voiceAgentBusyRef.current = false
        return
      }

      try {
        let audioUrl = prefetchedTtsRef.current.get(currentItem.id) || currentItem.audioUrl
        if (!audioUrl) audioUrl = await fetchTtsForItem(currentItem)
        if (!audioUrl) {
          finishItem(false)
          return
        }
        prefetchedTtsRef.current.delete(currentItem.id)

        const audio = new Audio(audioUrl)
        voiceAgentAudioRef.current = audio
        setIsVoiceAgentSpeaking(true)
        prefetchNextItemTts(currentItem.id)

        audio.addEventListener('ended', () => finishItem(), { once: true })
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


  // Note: Navigation callbacks (goToNextSlide, goToPrevSlide, goToChildNext, goToChildPrev, togglePlayPause)
  // are now provided by useSlideshowControl hook

  const showToast = useCallback((message) => setToast({ visible: true, message }), [])
  const hideToast = useCallback(() => setToast({ visible: false, message: '' }), [])

  const regenerateLivingWorld = useCallback(async () => {
    if (isWorldRegenerating) return

    if (!evolveWorld) {
      showToast('World regeneration unavailable')
      return
    }

    const topicList = Array.isArray(topics) ? topics : []
    if (topicList.length === 0) {
      const resetOk = await resetLivingWorldState()
      if (resetOk) {
        showToast('World reset. Add topics to grow it again.')
      } else {
        showToast('World reset failed')
      }
      return
    }

    setIsWorldRegenerating(true)
    showToast('Regenerating world...')

    try {
      const resetOk = await resetLivingWorldState()
      if (!resetOk) {
        showToast('World reset failed')
        return
      }

      const orderedTopics = [...topicList].sort((a, b) => {
        const aTime = a?.createdAt || a?.lastAccessedAt || 0
        const bTime = b?.createdAt || b?.lastAccessedAt || 0
        return aTime - bTime
      })

      const seen = new Set()
      const uniqueTopics = orderedTopics.filter((topic) => {
        const name = typeof topic?.name === 'string' ? topic.name.trim() : ''
        if (!name) return false
        const key = name.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      setWorldRegenProgress({ current: 0, total: uniqueTopics.length })

      for (let index = 0; index < uniqueTopics.length; index += 1) {
        const topic = uniqueTopics[index]
        const slides = (Array.isArray(topic.slides) && topic.slides.length > 0)
          ? topic.slides
          : (loadSlidesForTopic(topic) || [])
        const summary = buildLivingWorldSummaryFromSlides(slides)

        setWorldRegenProgress({ current: index + 1, total: uniqueTopics.length })
        await evolveWorld(topic.name, summary)
      }

      showToast('World regenerated from current topics')
    } catch (error) {
      logger.warn('WORLD', 'Failed to regenerate living world', { error: error.message })
      showToast('World regeneration failed')
    } finally {
      setWorldRegenProgress({ current: 0, total: 0 })
      setIsWorldRegenerating(false)
    }
  }, [
    buildLivingWorldSummaryFromSlides,
    evolveWorld,
    isWorldRegenerating,
    loadSlidesForTopic,
    resetLivingWorldState,
    showToast,
    topics,
  ])

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

  // Note: Auto-advance, keyboard navigation, start auto-play, and manual finish detection
  // effects are now handled by useSlideshowControl hook

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
      // Set loading true initially for content slides that need TTS
      // This prevents the fallback timeout in StreamingSubtitle from showing all text at once
      const needsTts = currentSlide?.type !== 'header' &&
                       currentSlide?.type !== 'suggestions' &&
                       !getCachedSlideAudio(currentSlide?.id)
      setIsSlideNarrationLoading(needsTts)
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
      // Clear hand-raise pause flag and saved position since we can't resume to a different slide
      audioWasPausedForHandRaiseRef.current = false
      savedAudioPositionRef.current = null
    }

    if (currentSlide?.type === 'header') {
      setIsSlideNarrationPlaying(false)
      setIsSlideNarrationReady(true)
      setIsSlideNarrationLoading(false)
      prefetchSlideAudio(getNextSlideForPrefetch())
      return
    }

    // Suggestions slide - no TTS to conserve quota
    if (currentSlide?.type === 'suggestions') {
      setIsSlideNarrationPlaying(false)
      setIsSlideNarrationReady(true)
      setIsSlideNarrationLoading(false)
      return
    }

    if (!isPlaying || isVoiceAgentSpeaking) {
      if (slideAudioRef.current && !slideAudioRef.current.paused) {
        slideAudioRef.current.pause()
      }
      setIsSlideNarrationPlaying(false)
      setIsSlideNarrationLoading(false)
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
          // Use priority flag for current slide to bypass rate limiting
          audioPayload = await requestSlideAudio(currentSlide, { priority: true })
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

      // Restore saved position if available (from hand raise interrupt), otherwise start from beginning
      if (savedAudioPositionRef.current?.slideId === currentSlide.id) {
        audio.currentTime = savedAudioPositionRef.current.currentTime
        logger.info('AUDIO', 'Restored audio position from hand raise', {
          slideId: currentSlide.id,
          restoredTime: savedAudioPositionRef.current.currentTime,
        })
        savedAudioPositionRef.current = null
      } else {
        audio.currentTime = 0
      }

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
        showQuickXp(data.xpEarned)
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

  // SOCRATIC-003 + WB018: Trigger quiz prompt (Full mode) when slideshow finishes
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
          // Full mode: Show mode selector (Mystery Lab, Wonder Lab, Story Studio)
          setLearnModeOrigin('after_slideshow')
          setUiState(UI_STATE.MODE_SELECTOR)
        } else {
          // Quick mode: End after slideshow and award quick XP (WB015)
          awardQuickXP()
          setUiState(UI_STATE.HOME)
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

  // Learning Modes: Handle mode selection (Mystery Lab, Wonder Lab, Story Studio)
  const handleModeSelect = useCallback((mode) => {
    logger.info('LEARN_MODE', 'Mode selected', { mode, topicName: activeTopic?.name })

    // Set the selected mode and navigate to LEARN_MODE state
    // Preserve origin if Mode Selector was opened from Progress (e.g. "Quick Quiz").
    setLearnModeOrigin((prev) => prev || 'after_slideshow')
    setSelectedLearningMode(mode)
    setUiState(UI_STATE.LEARN_MODE)

    // Show placeholder toast for unimplemented modes
    if (mode === 'story') {
      showToast(`${mode} mode coming soon!`, 'info')
    }
  }, [activeTopic, showToast, setUiState])

  // Learning Modes: Handle learning mode completion with XP and world evolution
  const handleLearningModeComplete = useCallback(async (result) => {
    const origin = learnModeOrigin

    logger.info('LEARN_MODE', 'Learning mode completed', {
      mode: selectedLearningMode,
      origin,
      completed: result?.completed,
      xpEarned: result?.xpEarned
    })

    const topicName = activeTopic?.name || ''
    const topicId = activeTopic?.id || topicName

    // Show XP earned toast
    if (result?.xpEarned > 0) {
      showQuickXp(result.xpEarned)
    }

    // Update mastery in Knowledge Graph based on quiz performance
    if (result?.completed && topicId) {
      // Calculate mastery score from result (default to 0.7 for completion without score)
      const masteryScore = typeof result?.score === 'number'
        ? result.score
        : (result?.correctCount && result?.totalCount)
          ? result.correctCount / result.totalCount
          : 0.7

      // Find node by topic name and update mastery
      const graphNode = getGraphNodeByName(topicName)
      if (graphNode) {
        updateGraphMastery(graphNode.id, masteryScore)
        logger.info('GRAPH', 'Updated mastery in knowledge graph', {
          topicName,
          masteryScore,
          nodeId: graphNode.id
        })
      }
    }

    // Evolve Living World on successful completion
    if (result?.completed && topicName && evolveWorld) {
      try {
        const summary = visibleSlidesRef.current
          ?.filter(s => s.type !== 'header' && s.type !== 'suggestions')
          .map(s => s.subtitle || s.script || '')
          .filter(Boolean)
          .join(' ')
          .slice(0, 500) || ''

        const evolutionResult = await evolveWorld(topicName, summary)

        if (evolutionResult?.success) {
          logger.info('LEARN_MODE', 'Living World evolved', { topicName })

          // Check for tier upgrade celebration
          if (evolutionResult.changesApplied?.tierChanged) {
            showTierUpgrade({
              from: evolutionResult.changesApplied.previousTier,
              to: evolutionResult.changesApplied.newTier
            })
          }
        }

        // Mint world piece
        const clientId = getClientId()
        const mintResponse = await fetch('/api/world/piece/mint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            topicId: String(topicId),
            topicName: String(topicName),
            summary: summary.slice(0, 480),
          }),
        })

        if (mintResponse.ok) {
          const mintData = await mintResponse.json()
          if (!mintData?.skipped) {
            setWorldBadge(prev => prev + 1)
          }
        }
      } catch (error) {
        logger.error('LEARN_MODE', 'World evolution failed', { error: error.message })
      }
    }

    // Refresh world stats and reset state
    refreshWorldStats()
    setSelectedLearningMode(null)
    setLearnModeOrigin(null)

    if (origin === 'after_slideshow') {
      setActiveTab('learn')
      setUiState(UI_STATE.MODE_SELECTOR)
      return
    }

    if (origin === 'from_progress') {
      setActiveTab('progress')
      setUiState(UI_STATE.HOME)
      return
    }

    setUiState(UI_STATE.HOME)
  }, [
    selectedLearningMode,
    learnModeOrigin,
    activeTopic,
    visibleSlidesRef,
    evolveWorld,
    showQuickXp,
    showTierUpgrade,
    setWorldBadge,
    refreshWorldStats,
    setActiveTab,
    setUiState,
    getGraphNodeByName,
    updateGraphMastery,
  ])

  // Learning Modes: Handle learning mode exit
  const handleLearningModeExit = useCallback(() => {
    const origin = learnModeOrigin
    logger.info('LEARN_MODE', 'Learning mode exited', { mode: selectedLearningMode, origin })

    // Reset learning mode state
    setSelectedLearningMode(null)
    setLearnModeOrigin(null)

    if (origin === 'after_slideshow') {
      setActiveTab('learn')
      setUiState(UI_STATE.MODE_SELECTOR)
      return
    }

    if (origin === 'from_progress') {
      setActiveTab('progress')
      setUiState(UI_STATE.HOME)
      return
    }

    setUiState(UI_STATE.HOME)
  }, [selectedLearningMode, learnModeOrigin, setActiveTab, setUiState])

  // Mode Selector: Skip for now (should not route back to itself).
  const handleModeSelectorSkip = useCallback(() => {
    const origin = learnModeOrigin
    logger.info('LEARN_MODE', 'Mode selector skipped', { origin, topicName: activeTopic?.name })

    setSelectedLearningMode(null)
    setLearnModeOrigin(null)

    if (origin === 'from_progress') {
      setActiveTab('progress')
      setUiState(UI_STATE.HOME)
      return
    }

    setActiveTab('learn')
    setUiState(UI_STATE.HOME)
  }, [learnModeOrigin, activeTopic, setActiveTab, setUiState])

  /**
   * Launch a learning mode for a specific topic (from Progress Tab, World, or Tree)
   * This allows launching modes for previously-learned topics without requiring
   * a slideshow to be currently active.
   *
   * @param {string} topicName - Name of the topic
   * @param {string} mode - 'mystery' | 'whatif' | 'story'
   * @param {Object} topicData - { slides, level } from stored topic
   */
  const handleLaunchLearningMode = useCallback(async (topicName, mode, topicData) => {
    logger.info('LEARN_MODE', 'Launch learning mode for topic', { topicName, mode })

    // Validate inputs
    if (!topicName || !mode) {
      logger.warn('LEARN_MODE', 'Invalid inputs for launch', { topicName, mode })
      showToast('Unable to start learning mode', 'error')
      return
    }

    // Find the topic in our topics list
    const normalizedName = String(topicName).trim().toLowerCase()
    const matchingTopic = topics.find((topic) =>
      String(topic?.name || '').trim().toLowerCase() === normalizedName
    )

    if (matchingTopic) {
      // Ensure slides are ready BEFORE entering the learning mode.
      // Mystery/Wonder will call their APIs immediately on mount.
      const hasSlidesInMemory = Array.isArray(matchingTopic.slides) && matchingTopic.slides.length > 0
      if (!hasSlidesInMemory) {
        const versionIndex = matchingTopic.currentVersionIndex ?? 0
        const currentVersionId = matchingTopic.versions?.[versionIndex]?.id
        const cachedSlides = loadSlidesForTopic(matchingTopic)
        const hydratedSlides = cachedSlides || await fetchSlidesFromServer(matchingTopic.id, currentVersionId, versionIndex)

        if (!hydratedSlides || hydratedSlides.length === 0) {
          showToast('Topic slides not available', 'error')
          return
        }

        const now = Date.now()
        setTopics((prev) => {
          const updated = prev.map((topic) => {
            if (topic.id !== matchingTopic.id) return topic
            const updatedVersions = Array.isArray(topic.versions)
              ? topic.versions.map((v, idx) => (
                  idx === versionIndex ? { ...v, slides: hydratedSlides } : v
                ))
              : topic.versions
            return {
              ...topic,
              slides: hydratedSlides,
              versions: updatedVersions,
              lastAccessedAt: now,
            }
          })
          return pruneSlideCache(updated, matchingTopic.id)
        })
      }

      // Topic exists - set it active and launch mode
      setActiveTopicId(matchingTopic.id)
    } else if (topicData?.slides?.length > 0) {
      // Topic not in list but has slides - can still work with slides
      logger.info('LEARN_MODE', 'Topic not found, using provided slides', { topicName })
    } else {
      // No topic and no slides - can't proceed
      showToast('Topic slides not available', 'error')
      return
    }

    // Set the mode and transition to LEARN_MODE
    setLearnModeOrigin('from_progress')
    setSelectedLearningMode(mode)
    setActiveTab('learn')
    setUiState(UI_STATE.LEARN_MODE)
  }, [topics, showToast, setActiveTopicId, setActiveTab, setUiState, fetchSlidesFromServer, pruneSlideCache])

  /**
   * Convenience handler for quick practice from Progress Tab
   * Picks a random mode for the given topic
   */
  const handleQuickPractice = useCallback((topicName, topicData) => {
    const modes = ['mystery', 'whatif', 'story']
    const randomMode = modes[Math.floor(Math.random() * modes.length)]
    handleLaunchLearningMode(topicName, randomMode, topicData)
  }, [handleLaunchLearningMode])

  const requestTopicQuiz = useCallback((piece) => {
    if (!piece) return

    const topicName = piece.topicName || piece.name
    const topicId = piece.topicId || piece.id
    const matchingTopic = topics.find((topic) =>
      topic.id === topicId || (topicName && String(topic.name).trim().toLowerCase() === String(topicName).trim().toLowerCase())
    )

    if (!matchingTopic) {
      showToast('Open this topic first to start a quiz')
      setActiveTab('learn')
      setUiState(UI_STATE.HOME)
      return
    }

    setActiveTab('learn')
    setActiveTopicId(matchingTopic.id)
    setLearnModeOrigin('from_progress')
    // Quiz UI is not a dedicated state; this routes to the Mode Selector for practice modes.
    setUiState(UI_STATE.MODE_SELECTOR)
  }, [topics, showToast, setActiveTab, setActiveTopicId, setUiState])

  // WB018: Tab navigation handler with badge clearing
  const handleTabChange = useCallback((tab) => {
    if (tab === 'progress') {
      // Clear world badge when user views progress
      setWorldBadge(0)
    }
    setActiveTab(tab)
  }, [])

  // Handle quick quiz start from topic menus/tree
  const handleQuizTabStartQuiz = useCallback(({ mode, topic }) => {
    if (topic) {
      requestTopicQuiz(topic)
      return
    }

    if (mode) {
      showToast('Pick a topic to start a quiz')
    }
  }, [requestTopicQuiz, showToast])

  const handleReviewTopic = useCallback((piece) => {
    requestTopicQuiz(piece)
  }, [requestTopicQuiz])

  const handleQuizTopic = useCallback((piece) => {
    requestTopicQuiz(piece)
  }, [requestTopicQuiz])

  const handleLearnTopicFromPiece = useCallback((piece) => {
    if (!piece) return
    const topicName = piece.topicName || piece.name
    const topicId = piece.topicId || piece.id
    const matchingTopic = topics.find((topic) =>
      topic.id === topicId || (topicName && topic.name === topicName)
    )

    setActiveTab('learn')
    setUiState(UI_STATE.HOME)

    if (matchingTopic) {
      setActiveTopicId(matchingTopic.id)
      return
    }

    if (topicName) {
      setTextInput(topicName)
    }
  }, [topics, setActiveTab, setUiState, setActiveTopicId, setTextInput])

  // UI008: Tier celebration handlers
  const handleTierCelebrationClose = useCallback(() => {
    dismissTierCelebration()
    setUiState(UI_STATE.HOME)
  }, [dismissTierCelebration, setUiState])

  const handleTierViewWorld = useCallback(() => {
    dismissTierCelebration()
    setActiveTab('progress')
    setWorldBadge(0) // Clear badge since they're viewing progress
    setUiState(UI_STATE.HOME)
  }, [dismissTierCelebration, setActiveTab, setWorldBadge, setUiState])

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
   * Raise-hand flow: pause narration and listen, or lower hand and resume.
   */
  const handleRaiseHandClick = useCallback(() => {
    if (isMicEnabled) {
      // Lowering hand - stop listening and resume audio if it was paused
      setIsMicEnabled(false)
      cancelRaiseHand()
      // Resume audio playback if we paused it when raising hand
      if (uiState === UI_STATE.SLIDESHOW) {
        resumeSlideAudioAfterHandLower()
      }
      return
    }

    // Raising hand - pause audio and start listening
    setIsMicEnabled(true)
    setAllowAutoListen(true)
    raiseHandRequestRef.current = false
    setIsRaiseHandPending(false)
    emptyTranscriptRetryRef.current = 0
    setVoiceAgentQueue([])

    if (uiState === UI_STATE.SLIDESHOW) {
      // Use the new pause function that preserves audio position
      pauseSlideAudioForHandRaise()
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
    } else {
      // Not in slideshow - use full interrupt
      interruptActiveAudio()
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
    pauseSlideAudioForHandRaise,
    resumeSlideAudioAfterHandLower,
  ])

  /**
   * Callback when a new topic is created in useQuestionHandler.
   * Adds the topic to the Knowledge Graph for constellation visualization.
   */
  const handleTopicCreated = useCallback(async (topicData) => {
    if (!topicData?.name) return

    try {
      await addTopicToGraph({
        id: topicData.id,
        name: topicData.name,
        concepts: topicData.concepts || [],
        slides: topicData.slides || [],
      })
      logger.info('GRAPH', 'Added topic to knowledge graph', { topicName: topicData.name })
    } catch (error) {
      logger.warn('GRAPH', 'Failed to add topic to knowledge graph', { error: error.message })
    }
  }, [addTopicToGraph])

  // Use the question handler hook
  const { handleQuestion, handleQuestionRef: questionHandlerRef } = useQuestionHandler({
    // State setters
    setUiState,
    setEngagement,
    setTopics,
    setActiveTopicId,
    setCurrentIndex,
    setCurrentChildIndex,
    setIsPlaying,
    setGenerationProgress,
    setIsStillWorking,
    setIsPreparingFollowUp,
    setIsSlideRevealPending,
    setQuestionQueue,
    setVoiceAgentQueue,
    setLastTranscription,
    setLiveTranscription,
    setTextInput,
    setErrorMessage,
    setLastFailedQuery,
    setIsColdStart,
    setHighlightPosition,
    setIsRaiseHandPending,
    setIsMicEnabled,
    setAllowAutoListen,
    // Refs
    abortControllerRef,
    stillWorkingTimerRef,
    currentQueryRef,
    spokenFunFactRef,
    pauseAfterCurrentSlideRef,
    hasFinishedSlideshowRef,
    raiseHandRequestRef,
    selectedLevelRef,
    slideResponseAudioRef,
    // Values/dependencies
    wsClientId,
    activeTopic,
    topics,
    uiState,
    visibleSlides,
    currentIndex,
    isListening,
    isRaiseHandPending,
    isMicEnabled,
    allowAutoListen,
    isSlideRevealPending,
    // Callbacks
    enqueueVoiceAgentMessage,
    clearFunFactRefresh,
    showToast,
    queueSlidesReadyTransition,
    pruneSlideCache,
    stopListening,
    interruptActiveAudio,
    recordQuestionAsked,
    setSlideshowFinished,
    onTopicCreated: handleTopicCreated,
  })

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
    setActiveTab('learn')
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
  }, [uiState, topics, pruneSlideCache, fetchSlidesFromServer, requestSlideAudio, setActiveTab])

  /**
   * Progress: open a topic's slideshow by name (used by TopicActionSheet "Review Slideshow")
   */
  const handleReviewSlideshowFromProgress = useCallback((topicName) => {
    const normalized = String(topicName || '').trim().toLowerCase()
    if (!normalized) return

    const matchingTopic = topics.find((topic) =>
      String(topic?.name || '').trim().toLowerCase() === normalized
    )

    if (!matchingTopic) {
      showToast('Topic not found')
      return
    }

    void handleNavigateToTopic(matchingTopic.id)
  }, [topics, showToast, handleNavigateToTopic])

  /**
   * Progress: start "quick quiz" flow (currently routes to Mode Selector for practice modes)
   */
  const handleQuickQuizFromProgress = useCallback((topicName) => {
    const normalized = String(topicName || '').trim().toLowerCase()
    if (!normalized) return

    const matchingTopic = topics.find((topic) =>
      String(topic?.name || '').trim().toLowerCase() === normalized
    )

    if (!matchingTopic) {
      showToast('Open this topic first to start a quiz')
      setActiveTab('learn')
      setUiState(UI_STATE.HOME)
      return
    }

    requestTopicQuiz({ topicId: matchingTopic.id, topicName: matchingTopic.name })
  }, [topics, requestTopicQuiz, showToast, setActiveTab, setUiState])

  /**
   * Handle topic deletion from sidebar
   * @param {string} topicId - ID of the topic to delete
   */
  const handleDeleteTopic = useCallback((topicId) => {
    if (!topicId) return

    const remainingTopics = topics.filter((topic) => topic.id !== topicId)

    // Remove topic from state
    setTopics((prev) => prev.filter((topic) => topic.id !== topicId))

    // Clear cached slides for this topic
    removeTopicSlides(topicId)

    if (remainingTopics.length === 0) {
      void resetLivingWorldState()
    }

    // If deleting the active topic, switch to another topic or listening state
    if (activeTopicId === topicId) {
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
  }, [activeTopicId, topics, resetLivingWorldState])

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

      // Prefetch TTS for all new slides immediately to reduce audio latency
      // Filter to content slides only (skip headers, suggestions)
      const contentSlides = generateData.slides.filter(
        (slide) =>
          slide.type !== 'header' &&
          slide.type !== 'suggestions' &&
          typeof slide.subtitle === 'string' &&
          slide.subtitle.trim().length > 0
      )
      if (contentSlides.length > 0) {
        logger.info('REGENERATE', 'Prefetching TTS for regenerated slides', {
          slideCount: contentSlides.length,
        })
        // Request first slide with priority (bypasses rate limiting) for immediate playback
        // This ensures audio is ready when user starts viewing the regenerated content
        const [firstSlide, ...remainingSlides] = contentSlides
        requestSlideAudio(firstSlide, { priority: true })
        // Prefetch remaining slides in background
        if (remainingSlides.length > 0) {
          prefetchSlideNarrationBatch(remainingSlides)
        }
      }

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
  }, [activeTopic, isRegenerating, wsClientId, prefetchSlideNarrationBatch, requestSlideAudio])

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

    // Prefetch TTS for all slides in the switched version to reduce audio latency
    const contentSlides = slides.filter(
      (slide) =>
        slide.type !== 'header' &&
        slide.type !== 'suggestions' &&
        typeof slide.subtitle === 'string' &&
        slide.subtitle.trim().length > 0
    )
    if (contentSlides.length > 0) {
      logger.info('VERSION', 'Prefetching TTS for version slides', {
        slideCount: contentSlides.length,
        versionIndex,
      })
      // Request first slide with priority for immediate playback
      const [firstSlide, ...remainingSlides] = contentSlides
      requestSlideAudio(firstSlide, { priority: true })
      // Prefetch remaining slides in background
      if (remainingSlides.length > 0) {
        prefetchSlideNarrationBatch(remainingSlides)
      }
    }

    // Reset to first slide when switching versions
    setCurrentIndex(0)
  }, [activeTopic, fetchSlidesFromServer, prefetchSlideNarrationBatch, requestSlideAudio])

  return (
    // F055, F056, F058: Responsive container with sidebar layout on desktop
    <div className="h-screen flex overflow-hidden">
      {/* POLISH-001: Achievement celebration components */}
      <Confetti isActive={showConfetti} onComplete={handleConfettiComplete} />
      <AchievementToast badge={currentToastBadge} onDismiss={handleBadgeToastDismiss} />

      {/* WB015: Quick mode XP toast */}
      <QuickXpToast
        xpEarned={quickXpEarned}
        visible={showQuickXpToast}
        onDismiss={dismissQuickXpToast}
        onSwitchMode={() => {
          dismissQuickXpToast()
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
            setActiveTab('learn')
          }}
          onDeleteTopic={handleDeleteTopic}
          onQuickQuizTopic={(topic) => requestTopicQuiz(topic)}
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
            piecesNeedingReview={piecesNeedingReview}
            onStartReview={startReviewSession}
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

        {/* Mode Selector: Choose learning mode (Mystery Lab, Wonder Lab, Story Studio) */}
        {uiState === UI_STATE.MODE_SELECTOR && activeTab === 'learn' && (
          <ModeSelectorScreen
            slides={visibleSlides}
            topicName={activeTopic?.name || ''}
            explanationLevel={activeTopic?.explanationLevel || 'standard'}
            onModeSelect={handleModeSelect}
            onSkip={handleModeSelectorSkip}
          />
        )}

        {/* Learning Mode Screen - Mystery Lab, Wonder Lab, Story Studio */}
        {uiState === UI_STATE.LEARN_MODE && activeTab === 'learn' && selectedLearningMode === 'mystery' && (
          <div className="fixed inset-0 z-50">
            <MysteryLab
              slides={visibleSlides}
              topicName={activeTopic?.name || ''}
              explanationLevel={activeTopic?.explanationLevel || 'standard'}
              onComplete={handleLearningModeComplete}
              onExit={handleLearningModeExit}
            />
          </div>
        )}

        {uiState === UI_STATE.LEARN_MODE && activeTab === 'learn' && selectedLearningMode === 'whatif' && (
          <div className="fixed inset-0 z-50">
            <WonderLab
              slides={visibleSlides}
              topicName={activeTopic?.name || ''}
              explanationLevel={activeTopic?.explanationLevel || 'standard'}
              onComplete={handleLearningModeComplete}
              onExit={handleLearningModeExit}
            />
          </div>
        )}

        {/* Story Studio - Create illustrated stories using learned concepts */}
        {uiState === UI_STATE.LEARN_MODE && activeTab === 'learn' && selectedLearningMode === 'story' && (
          <div className="fixed inset-0 z-50">
            <StoryStudio
              slides={visibleSlides}
              topicName={activeTopic?.name || ''}
              onComplete={handleLearningModeComplete}
              onBack={handleLearningModeExit}
            />
          </div>
        )}

        {/* Progress Tab - consolidates World and Tree views */}
        {activeTab === 'progress' && (
          <div className="w-full bg-cream-100 dark:bg-night-900">
            <ProgressTab
              topics={progressPieces}
              onReviewSlideshow={handleReviewSlideshowFromProgress}
              onLaunchMode={handleLaunchLearningMode}
              totalXP={totalWorldXP}
              streak={{ current: userProgress?.streakCount || 0, todayCompleted: false }}
              trophies={earnedTrophies}
              trophiesLoading={isUserProgressLoading}
              onSelectSuggestedTopic={(topicName) => {
                setActiveTab('learn')
                handleQuestion(topicName, { source: 'progress_suggestion' })
              }}
              graphNodes={graphNodes}
              graphEdges={graphEdges}
              graphClusters={graphClusters}
              graphGaps={graphGaps}
              graphIsLoading={graphIsLoading}
            />
          </div>
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
            visibleSlides={visibleSlides}
            activeChildSlides={activeChildSlides}
            currentIndex={currentIndex}
            currentChildIndex={currentChildIndex}
            isPreparingFollowUp={isPreparingFollowUp}
            highlightPosition={highlightPosition}
            handleSuggestionClick={handleSuggestionClick}
            wasManualNavRef={wasManualNavRef}
            getSlideDuration={getSlideDuration}
            isSlideNarrationPlaying={isSlideNarrationPlaying}
            isSlideNarrationLoading={isSlideNarrationLoading}
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
            segments={segments}
            currentSegmentIndex={currentSegmentIndex}
            currentSlideInSegment={currentSlideInSegment}
            goToSegment={goToSegment}
            isChapterPickerOpen={isChapterPickerOpen}
            setIsChapterPickerOpen={setIsChapterPickerOpen}
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

        {/* WB018: Bottom Tab Bar for Learn/World/Tree navigation */}
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          worldBadge={worldBadge}
          hasSidebar={topics.length > 0}
        />
      </div>

      {/* UI008: Tier upgrade celebration overlay */}
      {showTierCelebration && tierUpgradeInfo && (
        <TierUpCelebration
          fromTier={tierUpgradeInfo.from}
          toTier={tierUpgradeInfo.to}
          onComplete={handleTierCelebrationClose}
          onViewWorld={handleTierViewWorld}
        />
      )}

      {/* WB020: Evolution celebration overlay - shows when a piece evolves to a new tier */}
      {currentEvolution && (
        <EvolutionCelebration
          piece={currentEvolution.piece}
          oldTier={currentEvolution.oldTier}
          newTier={currentEvolution.newTier}
          onComplete={processNextEvolution}
        />
      )}

      {/* WB019: Connection scene reveal - shows when a pocket generates a new scene */}
      {pendingSceneReveal && (
        <ConnectionSceneReveal
          scene={pendingSceneReveal.scene}
          pocketName={pendingSceneReveal.pocketName || 'Knowledge Pocket'}
          pocketIcon={pendingSceneReveal.pocketIcon || '✨'}
          pieceCount={pendingSceneReveal.pieceCount || 3}
          onViewPocket={() => {
            dismissSceneReveal()
            setActiveTab('progress')
          }}
          onContinue={dismissSceneReveal}
        />
      )}

      {/* UI010: Sidebar spacer removed - using full width layout */}
    </div>
  )
}

export default App
