/**
 * WonderLab - Main component for "What If?" scenarios (6-state machine)
 *
 * State flow: LOADING → SCENE_INTRO → PREDICT → GENERATING_REVEALS → REVEAL → RESULTS
 *
 * Two-phase generation:
 * 1. On mount: fetch /api/learn/whatif (text + predictionCards)
 * 2. After prediction: fetch /api/learn/whatif/reveal-assets (images + TTS)
 *
 * XP calculation (deterministic):
 * - 2/2 correct = 50 XP
 * - 1/2 correct = 25 XP
 * - 0/2 correct = 10 XP
 */

import { useReducer, useEffect, useMemo, useRef, useState } from 'react'
import useWonderNarration from './useWonderNarration'
import SceneIntro from './SceneIntro'
import PredictionCards from './PredictionCards'
import ExperimentLoader from './ExperimentLoader'
import ConsequenceReveal from './ConsequenceReveal'
import ResultsSummary from './ResultsSummary'
import { getWonderLoaderStages } from './wonderLoaderFacts'
import logger from '../../../utils/logger'
import { buildLearnSlidesPayload } from '../../../utils/learnSlidesPayload'
import { toApiUrl } from '../../../utils/api'

const FAILSAFE_TIMEOUT_MS = 30000
const STAGE_ROTATE_MS = 2500
const LOADER_FACT_TTS_CACHE_KEY_PREFIX = 'wonder-loader-fun-fact:'
const DEFAULT_FACT_QUERY = 'science experiments what if'

function normalizeFunFact(rawFact) {
  const text = typeof rawFact?.text === 'string' ? rawFact.text.trim() : ''
  if (!text) return null
  return { emoji: rawFact?.emoji || '🔬', text }
}

// State machine states
const STATE = {
  LOADING: 'LOADING',
  SCENE_INTRO: 'SCENE_INTRO',
  PREDICT: 'PREDICT',
  GENERATING_REVEALS: 'GENERATING_REVEALS',
  REVEAL: 'REVEAL',
  RESULTS: 'RESULTS',
}

// Action types
const ACTION = {
  SCENARIO_LOADED: 'SCENARIO_LOADED',
  IMAGE_LOADED: 'IMAGE_LOADED',
  ASSET_LOADED: 'ASSET_LOADED',
  START_PREDICTIONS: 'START_PREDICTIONS',
  SUBMIT_PREDICTIONS: 'SUBMIT_PREDICTIONS',
  REVEALS_READY: 'REVEALS_READY',
  REVEALS_COMPLETE: 'REVEALS_COMPLETE',
  REVEAL_FUN_FACT_LOADED: 'REVEAL_FUN_FACT_LOADED',
  ERROR: 'ERROR',
  RETRY: 'RETRY',
}

// Initial state
const initialState = {
  currentState: STATE.LOADING,
  scenario: null,
  scenarioImage: null,
  predictionCards: [],
  selectedCards: [],
  revealAssets: [],
  bonusFact: null,
  revealFunFact: null,
  xpEarned: 0,
  error: null,
  loadingProgress: { scenario: false, image: false, audio: false },
  scenarioTeaser: null,
}

// Reducer function
function wonderReducer(state, action) {
  switch (action.type) {
    case ACTION.SCENARIO_LOADED: {
      const newProgress = { ...state.loadingProgress, scenario: true }
      const allReady = newProgress.scenario && newProgress.image && newProgress.audio
      return {
        ...state,
        scenario: action.payload.scenario,
        predictionCards: action.payload.predictionCards || [],
        bonusFact: action.payload.bonusFact || null,
        scenarioTeaser: action.payload.scenario,
        loadingProgress: newProgress,
        currentState: allReady ? STATE.SCENE_INTRO : STATE.LOADING,
        error: null,
      }
    }

    case ACTION.ASSET_LOADED: {
      const newProgress = { ...state.loadingProgress, [action.payload]: true }
      const allReady = newProgress.scenario && newProgress.image && newProgress.audio
      return {
        ...state,
        loadingProgress: newProgress,
        currentState: allReady && state.scenario ? STATE.SCENE_INTRO : state.currentState,
      }
    }

    case ACTION.IMAGE_LOADED:
      return {
        ...state,
        scenarioImage: action.payload,
      }

    case ACTION.START_PREDICTIONS:
      return {
        ...state,
        currentState: STATE.PREDICT,
      }

    case ACTION.SUBMIT_PREDICTIONS:
      return {
        ...state,
        selectedCards: action.payload,
        currentState: STATE.GENERATING_REVEALS,
        error: null,
      }

    case ACTION.REVEALS_READY: {
      const { revealAssets } = action.payload

      // Calculate XP deterministically based on correct predictions
      const correctPredictions = state.selectedCards.filter((cardId) => {
        const card = state.predictionCards.find((c) => c.id === cardId)
        return card && card.isCorrect
      })

      const xpEarned =
        correctPredictions.length === 2 ? 50 : correctPredictions.length === 1 ? 25 : 10

      return {
        ...state,
        revealAssets,
        xpEarned,
        currentState: STATE.REVEAL,
        error: null,
      }
    }

    case ACTION.REVEALS_COMPLETE:
      return {
        ...state,
        currentState: STATE.RESULTS,
      }

    case ACTION.REVEAL_FUN_FACT_LOADED:
      return { ...state, revealFunFact: action.payload }

    case ACTION.ERROR:
      return {
        ...state,
        error: action.payload,
        currentState:
          state.scenario && state.currentState === STATE.GENERATING_REVEALS
            ? STATE.PREDICT
            : state.currentState,
      }

    case ACTION.RETRY:
      return {
        ...initialState,
      }

    default:
      return state
  }
}

/**
 * @param {Object} props
 * @param {Array} props.slides - Content slides from the lesson
 * @param {string} props.topicName - Name of the topic learned
 * @param {string} props.explanationLevel - 'simple' | 'standard' | 'deep'
 * @param {Function} props.onComplete - Callback when user finishes (xpEarned)
 * @param {Function} props.onExit - Callback to exit Wonder Lab
 */
export default function WonderLab({
  slides = [],
  topicName = '',
  explanationLevel = 'standard',
  onComplete,
  onExit,
}) {
  const [state, dispatch] = useReducer(wonderReducer, initialState)
  const { narrate, play, stop, prefetch, isPlaying, isLoading: isNarrationLoading } = useWonderNarration()

  const slidePayload = useMemo(() => buildLearnSlidesPayload(slides), [slides])
  const loadRequestIdRef = useRef(0)
  const scenarioDataRef = useRef(null)
  const imageReadyRef = useRef(false)
  const audioReadyRef = useRef(false)

  // Loader state (rotating stage text + fun fact with TTS)
  const [loaderStageIndex, setLoaderStageIndex] = useState(0)
  const [loaderFunFact, setLoaderFunFact] = useState(null)
  const [showFunFact, setShowFunFact] = useState(false)
  const narratedLoaderFactTextRef = useRef('')

  const loaderStages = useMemo(() => getWonderLoaderStages(explanationLevel), [explanationLevel])
  const loaderStageText = loaderStages[loaderStageIndex % Math.max(loaderStages.length, 1)] || 'Setting up the experiment...'

  // Extract correct consequences for reveal
  const correctConsequences = useMemo(() => {
    return state.predictionCards.filter((card) => card.isCorrect)
  }, [state.predictionCards])

  const correctCount = useMemo(() => {
    return state.selectedCards.filter((cardId) => {
      const card = state.predictionCards.find((c) => c.id === cardId)
      return card && card.isCorrect
    }).length
  }, [state.selectedCards, state.predictionCards])

  // Reset loader state when entering LOADING
  useEffect(() => {
    if (state.currentState !== STATE.LOADING) return
    setLoaderStageIndex(0)
    setLoaderFunFact(null)
    setShowFunFact(false)
    narratedLoaderFactTextRef.current = ''
  }, [state.currentState])

  // Rotate stage text while loading
  useEffect(() => {
    if (state.currentState !== STATE.LOADING || loaderStages.length <= 1) return

    const stageIntervalId = setInterval(() => {
      setLoaderStageIndex((prev) => (prev + 1) % loaderStages.length)
    }, STAGE_ROTATE_MS)

    return () => clearInterval(stageIntervalId)
  }, [state.currentState, loaderStages.length])

  // Fetch fun fact from engagement API + prefetch TTS
  useEffect(() => {
    if (state.currentState !== STATE.LOADING) return

    const controller = new AbortController()

    const fetchApiFact = async () => {
      const queryCandidate = topicName || DEFAULT_FACT_QUERY
      const query = typeof queryCandidate === 'string' && queryCandidate.trim()
        ? queryCandidate.trim()
        : DEFAULT_FACT_QUERY

      try {
        const response = await fetch(toApiUrl('/api/generate/engagement'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, explanationLevel, skipTTS: true }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Engagement API error: ${response.status}`)
        }

        const payload = await response.json()
        const resolvedFact = normalizeFunFact(payload?.funFact)

        if (!resolvedFact) {
          throw new Error('Missing fun fact payload')
        }

        if (controller.signal.aborted) return

        const factText = `Fun fact: ${resolvedFact.text}`
        const cacheKey = `${LOADER_FACT_TTS_CACHE_KEY_PREFIX}${resolvedFact.text}`
        await prefetch(factText, cacheKey)

        if (!controller.signal.aborted) {
          setLoaderFunFact(resolvedFact)
          setShowFunFact(true)
        }

        logger.debug('WONDER', 'Loader fun fact resolved with TTS', {
          source: 'api',
          query,
          explanationLevel,
        })
      } catch (error) {
        if (error.name === 'AbortError') return
        logger.warn('WONDER', 'Loader fun fact request failed', {
          error: error.message,
        })
      }
    }

    void fetchApiFact()

    return () => {
      controller.abort()
    }
  }, [state.currentState, topicName, explanationLevel])

  // Auto-narrate fun fact when it appears
  useEffect(() => {
    if (state.currentState !== STATE.LOADING || !showFunFact) return
    if (!loaderFunFact?.text) return
    if (narratedLoaderFactTextRef.current === loaderFunFact.text) return

    narratedLoaderFactTextRef.current = loaderFunFact.text
    void narrate(
      `Fun fact: ${loaderFunFact.text}`,
      `${LOADER_FACT_TTS_CACHE_KEY_PREFIX}${loaderFunFact.text}`
    )
  }, [state.currentState, showFunFact, loaderFunFact, narrate])

  // Phase 1: Load scenario on mount
  useEffect(() => {
    const requestId = loadRequestIdRef.current + 1
    loadRequestIdRef.current = requestId
    const controller = new AbortController()
    let readinessTimeoutId = null

    const isStale = () => loadRequestIdRef.current !== requestId || controller.signal.aborted

    const loadScenario = async () => {
      try {
        logger.info('WONDER', 'Loading scenario', {
          topicName,
          slideCount: slidePayload.length,
        })

        // Fetch scenario (text-only, fast)
        const response = await fetch(toApiUrl('/api/learn/whatif'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slides: slidePayload,
            topicName,
            explanationLevel,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const message = mapWhatIfError(response.status, errorData?.error, errorData?.message)
          throw new Error(message)
        }

        const data = await response.json()

        if (isStale()) {
          return
        }

        // Store full scenario data in ref for later use
        scenarioDataRef.current = data

        // Dispatch scenario data
        dispatch({
          type: ACTION.SCENARIO_LOADED,
          payload: {
            scenario: data.scenario || '',
            predictionCards: data.predictionCards || [],
            bonusFact: data.bonusFact || null,
          },
        })

        // Parallelize: Generate hero image + prefetch intro narration
        const imagePrompt = data.scenarioImagePrompt
        const introNarration = data.scenarioNarration

        // Failsafe: only force-complete assets that haven't loaded after 30s
        readinessTimeoutId = setTimeout(() => {
          if (!isStale()) {
            if (!imageReadyRef.current) {
              logger.warn('WONDER', 'Image failsafe triggered')
              imageReadyRef.current = true
              dispatch({ type: ACTION.ASSET_LOADED, payload: 'image' })
            }
            if (!audioReadyRef.current) {
              logger.warn('WONDER', 'Audio failsafe triggered')
              audioReadyRef.current = true
              dispatch({ type: ACTION.ASSET_LOADED, payload: 'audio' })
            }
          }
        }, FAILSAFE_TIMEOUT_MS)

        await Promise.all([
          (async () => {
            if (imagePrompt) {
              const imageUrl = await fetchScenarioImage(imagePrompt, controller)
              if (imageUrl && !isStale()) {
                dispatch({ type: ACTION.IMAGE_LOADED, payload: imageUrl })
                await preloadImageInBrowser(imageUrl)
              }
            }
            if (!isStale() && !imageReadyRef.current) {
              imageReadyRef.current = true
              dispatch({ type: ACTION.ASSET_LOADED, payload: 'image' })
            }
          })(),
          (async () => {
            if (introNarration) {
              try {
                await prefetch(introNarration, 'intro-narration')
              } catch {
                // TTS prefetch failed, proceed without
              }
            }
            if (!isStale() && !audioReadyRef.current) {
              audioReadyRef.current = true
              dispatch({ type: ACTION.ASSET_LOADED, payload: 'audio' })
            }
          })(),
        ])

        clearTimeout(readinessTimeoutId)
      } catch (error) {
        if (isStale() || error.name === 'AbortError') {
          logger.debug('WONDER', 'Scenario load aborted')
          return
        }

        dispatch({
          type: ACTION.ERROR,
          payload: error.message || 'Failed to load scenario',
        })
      }
    }

    const fetchScenarioImage = async (imagePrompt, abortController) => {
      try {
        const response = await fetch(toApiUrl('/api/learn/mystery/image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePrompt, topicName, explanationLevel }),
          signal: abortController.signal,
        })
        if (!response.ok) {
          logger.warn('WONDER', 'Scenario image generation failed')
          return null
        }
        const data = await response.json()
        return data.imageUrl || null
      } catch (error) {
        if (error.name !== 'AbortError') {
          logger.warn('WONDER', 'Image load error', { error: error.message })
        }
        return null
      }
    }

    loadScenario()

    return () => {
      controller.abort()
      stop()
      if (readinessTimeoutId) clearTimeout(readinessTimeoutId)
      imageReadyRef.current = false
      audioReadyRef.current = false
    }
  }, [slidePayload, topicName, explanationLevel, stop, prefetch])

  // Auto-narrate scenario intro in SCENE_INTRO state
  useEffect(() => {
    if (state.currentState === STATE.SCENE_INTRO && scenarioDataRef.current?.scenarioNarration) {
      narrate(scenarioDataRef.current.scenarioNarration, 'intro-narration')
    }
  }, [state.currentState, narrate])

  // Phase 2: Generate reveal assets after prediction submitted
  useEffect(() => {
    if (state.currentState !== STATE.GENERATING_REVEALS) {
      return
    }

    const controller = new AbortController()

    const generateRevealAssets = async () => {
      try {
        logger.info('WONDER', 'Generating reveal assets', {
          consequenceCount: correctConsequences.length,
        })

        // Build consequences payload (only correct ones)
        const consequences = correctConsequences.map((card) => ({
          id: card.id,
          revealNarration: card.revealNarration,
          revealImagePrompt: card.revealImagePrompt,
        }))

        const response = await fetch(toApiUrl('/api/learn/whatif/reveal-assets'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consequences,
            scenarioNarration: scenarioDataRef.current?.scenarioNarration || '',
            bonusFactNarration: scenarioDataRef.current?.bonusFactNarration || '',
            topicName,
            explanationLevel,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to generate reveal assets')
        }

        const data = await response.json()

        // Merge reveal assets with card text and isCorrect
        const enrichedRevealAssets = data.revealAssets.map((asset) => {
          const card = correctConsequences.find((c) => c.id === asset.id)
          return {
            ...asset,
            text: card?.text || '',
            isCorrect: true,
            revealNarration: card?.revealNarration || '',
          }
        })

        // Pipeline: prefetch TTS for first consequence before entering REVEAL
        const firstAsset = enrichedRevealAssets[0]
        if (firstAsset?.revealNarration) {
          try {
            await prefetch(firstAsset.revealNarration, `reveal-${firstAsset.id}`)
          } catch {
            // TTS prefetch failed, narrate() will handle JIT
          }
        }

        dispatch({
          type: ACTION.REVEALS_READY,
          payload: { revealAssets: enrichedRevealAssets },
        })
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        logger.error('WONDER', 'Reveal assets generation failed', { error: error.message })
        dispatch({
          type: ACTION.ERROR,
          payload: error.message || 'Failed to generate reveals',
        })
      }
    }

    const fetchRevealFunFact = async () => {
      try {
        const response = await fetch(toApiUrl('/api/generate/engagement'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: topicName, explanationLevel, skipTTS: true }),
          signal: controller.signal,
        })
        if (!response.ok) return
        const data = await response.json()
        if (data.funFact?.text) {
          dispatch({ type: ACTION.REVEAL_FUN_FACT_LOADED, payload: data.funFact.text })
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          logger.debug('WONDER', 'Reveal fun fact fetch failed (non-blocking)', { error: error.message })
        }
      }
    }

    fetchRevealFunFact()
    generateRevealAssets()

    return () => {
      controller.abort()
    }
  }, [state.currentState, correctConsequences, topicName, explanationLevel, prefetch])

  // Handlers
  const handleStartPredictions = () => {
    stop()
    dispatch({ type: ACTION.START_PREDICTIONS })
  }

  const handleSubmitPredictions = (selectedCardIds) => {
    dispatch({ type: ACTION.SUBMIT_PREDICTIONS, payload: selectedCardIds })
  }

  const handleRevealsComplete = () => {
    stop()
    dispatch({ type: ACTION.REVEALS_COMPLETE })
  }

  const handleComplete = () => {
    stop()
    onComplete?.({
      completed: true,
      xpEarned: state.xpEarned,
      correctCount,
      totalCount: 2,
      session: {
        completedAt: Date.now(),
        scenario: state.scenario || '',
        scenarioImage: state.scenarioImage || null,
        selectedCards: state.selectedCards || [],
        predictionCards: state.predictionCards || [],
        revealAssets: state.revealAssets || [],
        correctCount,
        totalCount: 2,
        xpEarned: state.xpEarned || 0,
        bonusFact: state.bonusFact || null,
      },
    })
  }

  const handleRetry = () => {
    stop()
    dispatch({ type: ACTION.RETRY })
  }

  const handleBack = () => {
    const needsConfirmation = [STATE.PREDICT, STATE.GENERATING_REVEALS, STATE.REVEAL].includes(
      state.currentState
    )
    if (needsConfirmation) {
      const confirmed = window.confirm('Are you sure you want to exit? Your progress will be lost.')
      if (!confirmed) return
    }
    stop()
    onExit?.()
  }

  // Render states
  if (state.error && !state.scenario) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{state.error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-3 rounded-full font-medium bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Try Again
            </button>
            <button
              onClick={handleBack}
              className="px-6 py-3 rounded-full font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (state.currentState === STATE.LOADING) {
    return (
      <ExperimentLoader
        stageText={loaderStageText}
        funFact={showFunFact ? loaderFunFact : null}
        factSource="api"
      />
    )
  }

  if (state.currentState === STATE.SCENE_INTRO) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950">
        <SceneIntro
          scenario={state.scenario}
          scenarioImage={state.scenarioImage}
          isTtsPlaying={isPlaying}
          onNext={handleStartPredictions}
        />
        <button
          onClick={handleBack}
          className="fixed top-4 left-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          ← Back
        </button>
      </div>
    )
  }

  if (state.currentState === STATE.PREDICT) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950 px-6 py-12">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <PredictionCards
            cards={state.predictionCards}
            onSubmit={handleSubmitPredictions}
            disabled={false}
          />

          {state.error && (
            <div className="mt-4 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleBack}
          className="fixed top-4 left-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          ← Back
        </button>
      </div>
    )
  }

  if (state.currentState === STATE.GENERATING_REVEALS) {
    return (
      <ExperimentLoader
        stageText="Running the experiment..."
        funFact={state.revealFunFact ? { text: state.revealFunFact, emoji: '🔬' } : null}
      />
    )
  }

  if (state.currentState === STATE.REVEAL) {
    return (
      <ConsequenceReveal
        revealAssets={state.revealAssets}
        userSelections={new Set(state.selectedCards)}
        narrate={narrate}
        play={play}
        prefetch={prefetch}
        isPlaying={isPlaying}
        isLoading={isNarrationLoading}
        onComplete={handleRevealsComplete}
      />
    )
  }

  if (state.currentState === STATE.RESULTS) {
    return (
      <ResultsSummary
        correctCount={correctCount}
        totalCorrect={2}
        xpEarned={state.xpEarned}
        onComplete={handleComplete}
        onRetry={handleRetry}
      />
    )
  }

  return null
}

// Preload an image into the browser cache so it renders instantly
function preloadImageInBrowser(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}

// Error mapping helper
function mapWhatIfError(status, errorCode, fallbackMessage) {
  if (status === 413) {
    return 'Lesson content is too large to process. Try a shorter lesson or fewer details.'
  }
  if (status === 503 || errorCode === 'API_NOT_AVAILABLE') {
    return 'AI service is unavailable right now. Please try again in a bit.'
  }
  if (status === 429 || errorCode === 'RATE_LIMITED') {
    return 'Too many requests. Please wait a moment and try again.'
  }
  if (
    status === 502 ||
    errorCode === 'PARSE_ERROR' ||
    errorCode === 'INVALID_RESPONSE' ||
    errorCode === 'WHATIF_GENERATION_FAILED'
  ) {
    return 'Had trouble generating a scenario. Please try again.'
  }

  return errorCode || fallbackMessage || 'Failed to load scenario'
}
