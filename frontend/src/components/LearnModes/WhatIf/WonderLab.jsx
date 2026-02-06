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

import { useReducer, useEffect, useMemo, useRef } from 'react'
import useWonderNarration from './useWonderNarration'
import SceneIntro from './SceneIntro'
import PredictionCards from './PredictionCards'
import ExperimentLoader from './ExperimentLoader'
import ConsequenceReveal from './ConsequenceReveal'
import ResultsSummary from './ResultsSummary'
import logger from '../../../utils/logger'
import { buildLearnSlidesPayload } from '../../../utils/learnSlidesPayload'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'
const READINESS_TIMEOUT_MS = 12000

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
  scenarioAudioUrl: null,
  bonusFactAudioUrl: null,
  bonusFact: null,
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
      const { revealAssets, scenarioAudioUrl, bonusFactAudioUrl } = action.payload

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
        scenarioAudioUrl,
        bonusFactAudioUrl,
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
        const response = await fetch(`${API_BASE}/api/learn/whatif`, {
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

        // Readiness timeout: if assets aren't ready in 12s, proceed anyway
        let timedOut = false
        readinessTimeoutId = setTimeout(() => {
          if (!isStale()) {
            timedOut = true
            dispatch({ type: ACTION.ASSET_LOADED, payload: 'image' })
            dispatch({ type: ACTION.ASSET_LOADED, payload: 'audio' })
          }
        }, READINESS_TIMEOUT_MS)

        await Promise.all([
          (async () => {
            if (imagePrompt) {
              await fetchScenarioImage(imagePrompt, controller)
            }
            if (!isStale() && !timedOut) dispatch({ type: ACTION.ASSET_LOADED, payload: 'image' })
          })(),
          (async () => {
            if (introNarration) {
              try {
                await prefetch(introNarration, 'intro-narration')
              } catch {
                // TTS prefetch failed, proceed without
              }
            }
            if (!isStale() && !timedOut) dispatch({ type: ACTION.ASSET_LOADED, payload: 'audio' })
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

    const fetchScenarioImage = async (imagePrompt, controller) => {
      try {
        const response = await fetch(`${API_BASE}/api/learn/mystery/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imagePrompt,
            topicName,
            explanationLevel,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          logger.warn('WONDER', 'Scenario image generation failed')
          return
        }

        const data = await response.json()
        if (data.imageUrl && !isStale()) {
          dispatch({ type: ACTION.IMAGE_LOADED, payload: data.imageUrl })
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          logger.warn('WONDER', 'Image load error', { error: error.message })
        }
      }
    }

    loadScenario()

    return () => {
      controller.abort()
      stop()
      if (readinessTimeoutId) clearTimeout(readinessTimeoutId)
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

        const response = await fetch(`${API_BASE}/api/learn/whatif/reveal-assets`, {
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

        dispatch({
          type: ACTION.REVEALS_READY,
          payload: {
            revealAssets: enrichedRevealAssets,
            scenarioAudioUrl: data.scenarioAudioUrl,
            bonusFactAudioUrl: data.bonusFactAudioUrl,
          },
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

    generateRevealAssets()

    return () => {
      controller.abort()
    }
  }, [state.currentState, correctConsequences, topicName, explanationLevel])

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
    onComplete?.({ xpEarned: state.xpEarned })
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
    const { scenario, image, audio } = state.loadingProgress
    const progress = [scenario, image, audio].filter(Boolean).length
    const progressPercent = Math.round((progress / 3) * 100)

    return (
      <ExperimentLoader
        progress={progressPercent}
        bonusFact={state.bonusFact}
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
    return <ExperimentLoader message="Running the experiment..." bonusFact={state.bonusFact} />
  }

  if (state.currentState === STATE.REVEAL) {
    return (
      <ConsequenceReveal
        revealAssets={state.revealAssets}
        userSelections={new Set(state.selectedCards)}
        narrate={narrate}
        play={play}
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
