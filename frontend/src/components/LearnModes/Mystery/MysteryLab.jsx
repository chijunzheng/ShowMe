/**
 * MysteryLab - Crime Scene Ops state machine
 *
 * State flow:
 * LOADING -> BRIEFING -> SCENE_SCAN -> WITNESS_ROOM -> TIMELINE_REBUILD
 * -> WARRANT_DECISION -> REVEAL -> CELEBRATION
 */

import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import useMysteryNarration from './useMysteryNarration'
import MysteryIntro from './MysteryIntro'
import SolutionReveal from './SolutionReveal'
import DetectiveReward from './DetectiveReward'
import MysteryLoader from './MysteryLoader'
import CrimeSceneScan from './CrimeSceneScan'
import WitnessRoom from './WitnessRoom'
import TimelineRebuild from './TimelineRebuild'
import WarrantDecision from './WarrantDecision'
import { getMysteryLoaderStages } from './mysteryLoaderFacts'
import logger from '../../../utils/logger'
import { vibrateSuccess, vibrateShort } from '../../../utils/haptics'
import { playCorrectSound, playIncorrectSound, playPartialSound } from '../../../utils/soundEffects'
import { toApiUrl } from '../../../utils/api'

const MAX_MYSTERY_SLIDES = 12
const MAX_CHARS_PER_FIELD = 2000
const REVEAL_NARRATION_TIMEOUT_MS = 12000
const STAGE_ROTATE_MS = 2500
const LOADER_FACT_TTS_CACHE_KEY_PREFIX = 'loader-fun-fact:'
const DEFAULT_FACT_QUERY = 'science detective mystery'

const FRIENDLY_MYSTERY_ERRORS = {
  TOO_LARGE: 'Lesson content is too large to process. Try a shorter lesson or fewer details.',
  API_UNAVAILABLE: 'AI service is unavailable right now. Please try again in a bit.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  GENERATION_FAILED: 'Had trouble generating a mystery. Please try again.',
  LEGACY_PAYLOAD: 'Legacy Mystery payload detected. Regenerate to play Crime Scene Ops.',
  DEFAULT: 'Failed to load mystery',
}

const STAGE_LABELS = {
  BRIEFING: 'Briefing',
  SCENE_SCAN: 'Scene Scan',
  WITNESS_ROOM: 'Witness Room',
  TIMELINE_REBUILD: 'Timeline',
  WARRANT_DECISION: 'Warrant',
}

const STAGE_ORDER = ['BRIEFING', 'SCENE_SCAN', 'WITNESS_ROOM', 'TIMELINE_REBUILD', 'WARRANT_DECISION']

const STATE = {
  LOADING: 'LOADING',
  BRIEFING: 'BRIEFING',
  SCENE_SCAN: 'SCENE_SCAN',
  WITNESS_ROOM: 'WITNESS_ROOM',
  TIMELINE_REBUILD: 'TIMELINE_REBUILD',
  WARRANT_DECISION: 'WARRANT_DECISION',
  REVEAL: 'REVEAL',
  CELEBRATION: 'CELEBRATION',
}

const ACTION = {
  MYSTERY_LOADED: 'MYSTERY_LOADED',
  IMAGE_LOADED: 'IMAGE_LOADED',
  START_SCENE_SCAN: 'START_SCENE_SCAN',
  EVAL_START: 'EVAL_START',
  SCENE_COMPLETE: 'SCENE_COMPLETE',
  WITNESS_COMPLETE: 'WITNESS_COMPLETE',
  TIMELINE_COMPLETE: 'TIMELINE_COMPLETE',
  WARRANT_DRAFT: 'WARRANT_DRAFT',
  CASE_SOLVED: 'CASE_SOLVED',
  EVAL_FAILURE: 'EVAL_FAILURE',
  GO_CELEBRATION: 'GO_CELEBRATION',
  ERROR: 'ERROR',
  RETRY: 'RETRY',
}

const initialState = {
  currentState: STATE.LOADING,
  mystery: null,
  sceneImage: null,
  isEvaluating: false,
  sceneProgress: null,
  witnessProgress: null,
  timelineProgress: null,
  warrantDraft: null,
  bonusFinds: 0,
  bonusXp: 0,
  totalXp: 0,
  evaluationResult: null,
  lastFeedback: null,
  error: null,
}

function hasCrimeSceneOpsPayload(mystery) {
  return Boolean(
    mystery &&
    mystery.crimeScene &&
    Array.isArray(mystery?.crimeScene?.hotspots) &&
    Array.isArray(mystery?.witnesses) &&
    Array.isArray(mystery?.timeline?.events) &&
    Array.isArray(mystery?.verdict?.options)
  )
}

function mapMysteryLoadError(status, errorCode, fallbackMessage) {
  if (status === 413) return FRIENDLY_MYSTERY_ERRORS.TOO_LARGE
  if (status === 503 || errorCode === 'API_NOT_AVAILABLE') return FRIENDLY_MYSTERY_ERRORS.API_UNAVAILABLE
  if (status === 429 || errorCode === 'RATE_LIMITED') return FRIENDLY_MYSTERY_ERRORS.RATE_LIMITED

  if (
    status === 502 ||
    errorCode === 'PARSE_ERROR' ||
    errorCode === 'INVALID_RESPONSE' ||
    errorCode === 'MYSTERY_GENERATION_FAILED'
  ) {
    return FRIENDLY_MYSTERY_ERRORS.GENERATION_FAILED
  }

  return errorCode || fallbackMessage || FRIENDLY_MYSTERY_ERRORS.DEFAULT
}

function normalizeFunFact(rawFact) {
  const text = typeof rawFact?.text === 'string' ? rawFact.text.trim() : ''
  if (!text) return null

  return {
    emoji: typeof rawFact?.emoji === 'string' ? rawFact.emoji : '💡',
    text,
  }
}

function buildMysterySlideContext(slides) {
  const inputSlides = Array.isArray(slides) ? slides : []
  const payload = []
  const referenceSlides = []

  for (const slide of inputSlides) {
    if (!slide || typeof slide !== 'object') continue
    if (slide.type === 'header' || slide.type === 'suggestions') continue

    const rawSubtitle = typeof slide.subtitle === 'string' ? slide.subtitle : ''
    const rawScript = typeof slide.script === 'string' ? slide.script : ''

    const subtitle = rawSubtitle.trim().slice(0, MAX_CHARS_PER_FIELD)
    const script = rawScript.trim().slice(0, MAX_CHARS_PER_FIELD)

    if (!subtitle && !script) continue

    payload.push({ subtitle, script })
    referenceSlides.push(slide)

    if (payload.length >= MAX_MYSTERY_SLIDES) break
  }

  return { payload, referenceSlides }
}

function mysteryReducer(state, action) {
  switch (action.type) {
    case ACTION.MYSTERY_LOADED:
      return {
        ...state,
        mystery: action.payload,
        currentState: STATE.BRIEFING,
        error: null,
      }

    case ACTION.IMAGE_LOADED:
      return {
        ...state,
        sceneImage: action.payload,
      }

    case ACTION.START_SCENE_SCAN:
      return {
        ...state,
        currentState: STATE.SCENE_SCAN,
        error: null,
      }

    case ACTION.EVAL_START:
      return {
        ...state,
        isEvaluating: true,
        error: null,
      }

    case ACTION.SCENE_COMPLETE:
      return {
        ...state,
        isEvaluating: false,
        sceneProgress: action.payload.progress,
        bonusFinds: state.bonusFinds + (action.payload.progress?.bonusFinds || 0),
        bonusXp: state.bonusXp + (action.payload.result?.bonusXp || 0),
        totalXp: state.totalXp + (action.payload.result?.xpEarned || 0),
        lastFeedback: action.payload.result?.feedback || null,
        currentState: STATE.WITNESS_ROOM,
      }

    case ACTION.WITNESS_COMPLETE:
      return {
        ...state,
        isEvaluating: false,
        witnessProgress: action.payload.progress,
        bonusXp: state.bonusXp + (action.payload.result?.bonusXp || 0),
        totalXp: state.totalXp + (action.payload.result?.xpEarned || 0),
        lastFeedback: action.payload.result?.feedback || null,
        currentState: STATE.TIMELINE_REBUILD,
      }

    case ACTION.TIMELINE_COMPLETE:
      return {
        ...state,
        isEvaluating: false,
        timelineProgress: action.payload.progress,
        bonusXp: state.bonusXp + (action.payload.result?.bonusXp || 0),
        totalXp: state.totalXp + (action.payload.result?.xpEarned || 0),
        lastFeedback: action.payload.result?.feedback || null,
        currentState: STATE.WARRANT_DECISION,
      }

    case ACTION.WARRANT_DRAFT:
      return {
        ...state,
        warrantDraft: action.payload,
      }

    case ACTION.CASE_SOLVED:
      return {
        ...state,
        isEvaluating: false,
        totalXp: state.totalXp + (action.payload.result?.xpEarned || 0),
        bonusXp: state.bonusXp + (action.payload.result?.bonusXp || 0),
        evaluationResult: action.payload.evaluationResult,
        lastFeedback: action.payload.result?.feedback || null,
        currentState: STATE.REVEAL,
        error: null,
      }

    case ACTION.EVAL_FAILURE:
      return {
        ...state,
        isEvaluating: false,
        error: action.payload.error,
        lastFeedback: action.payload.feedback || null,
      }

    case ACTION.GO_CELEBRATION:
      return {
        ...state,
        currentState: STATE.CELEBRATION,
      }

    case ACTION.ERROR:
      return {
        ...state,
        error: action.payload,
        isEvaluating: false,
      }

    case ACTION.RETRY:
      return {
        ...initialState,
      }

    default:
      return state
  }
}

export default function MysteryLab({
  slides = [],
  topicName = '',
  explanationLevel = 'standard',
  onComplete,
  onExit,
}) {
  const [state, dispatch] = useReducer(mysteryReducer, initialState)
  const [showRevealNarrationOverlay, setShowRevealNarrationOverlay] = useState(false)
  const [loaderStageIndex, setLoaderStageIndex] = useState(0)
  const [loaderFunFact, setLoaderFunFact] = useState(null)
  const [showFunFact, setShowFunFact] = useState(false)

  const {
    narrate,
    stop,
    prefetch,
    isPlaying,
    isLoading: isNarrationLoading,
  } = useMysteryNarration()

  const slideContext = useMemo(() => buildMysterySlideContext(slides), [slides])
  const loaderStages = useMemo(() => getMysteryLoaderStages(explanationLevel), [explanationLevel])

  const loadRequestIdRef = useRef(0)
  const revealNarrationTimeoutRef = useRef(null)
  const narratedLoaderFactTextRef = useRef('')

  const currentStep = STAGE_ORDER.includes(state.currentState)
    ? STAGE_ORDER.indexOf(state.currentState) + 1
    : null

  const totalSteps = STAGE_ORDER.length
  const loaderStageText = loaderStages[loaderStageIndex % Math.max(loaderStages.length, 1)] || 'Preparing the case file...'

  const evaluateStage = async ({ solveMethod, userAnswer, userTheory }) => {
    const response = await fetch(toApiUrl('/api/learn/mystery/evaluate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solveMethod,
        userAnswer,
        userTheory,
        expectedConcepts: state.mystery?.expectedConcepts,
        mysteryData: state.mystery,
        explanationLevel,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to evaluate')
    }

    const payload = await response.json()
    return {
      isCorrect: Boolean(payload?.isCorrect),
      feedback: payload?.feedback || null,
      identifiedConcepts: Array.isArray(payload?.identifiedConcepts) ? payload.identifiedConcepts : [],
      xpEarned: Number.isFinite(Number(payload?.xpEarned)) ? Number(payload.xpEarned) : 0,
      bonusXp: Number.isFinite(Number(payload?.bonusXp)) ? Number(payload.bonusXp) : 0,
    }
  }

  useEffect(() => {
    if (state.currentState !== STATE.LOADING) return

    setLoaderStageIndex(0)
    setLoaderFunFact(null)
    setShowFunFact(false)
    narratedLoaderFactTextRef.current = ''
  }, [state.currentState])

  useEffect(() => {
    if (state.currentState !== STATE.LOADING || loaderStages.length <= 1) return

    const stageIntervalId = setInterval(() => {
      setLoaderStageIndex((prev) => (prev + 1) % loaderStages.length)
    }, STAGE_ROTATE_MS)

    return () => clearInterval(stageIntervalId)
  }, [state.currentState, loaderStages.length])

  useEffect(() => {
    if (state.currentState !== STATE.LOADING) return

    const controller = new AbortController()

    const fetchApiFact = async () => {
      const queryCandidate = topicName || state.mystery?.mysteryTitle || DEFAULT_FACT_QUERY
      const query = typeof queryCandidate === 'string' && queryCandidate.trim()
        ? queryCandidate.trim()
        : DEFAULT_FACT_QUERY

      try {
        const response = await fetch(toApiUrl('/api/generate/engagement'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            explanationLevel,
          }),
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

        logger.debug('MYSTERY', 'Loader fun fact resolved with TTS', {
          source: 'api',
          query,
          explanationLevel,
        })
      } catch (error) {
        if (error.name === 'AbortError') return

        logger.warn('MYSTERY', 'Loader fun fact request failed', {
          error: error.message,
        })
      }
    }

    void fetchApiFact()

    return () => {
      controller.abort()
    }
  }, [state.currentState, topicName, explanationLevel, state.mystery?.mysteryTitle])

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

  useEffect(() => {
    const requestId = loadRequestIdRef.current + 1
    loadRequestIdRef.current = requestId
    const controller = new AbortController()

    const isStale = () =>
      loadRequestIdRef.current !== requestId || controller.signal.aborted

    const fetchMystery = async () => {
      const response = await fetch(toApiUrl('/api/learn/mystery'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: slideContext.payload,
          topicName,
          explanationLevel,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message = mapMysteryLoadError(response.status, errorData?.error, errorData?.message)
        throw new Error(message)
      }

      return response.json()
    }

    const fetchImage = async (imagePrompt) => {
      try {
        const response = await fetch(toApiUrl('/api/learn/mystery/image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePrompt, topicName, explanationLevel }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Image generation failed')
        }

        const data = await response.json()
        return data.imageUrl
      } catch (error) {
        if (error.name === 'AbortError') {
          return null
        }
        logger.warn('MYSTERY', 'Image load failed, using placeholder', { error: error.message })
        return null
      }
    }

    const prefetchNarration = async (text, cacheKey) => {
      if (!text || typeof text !== 'string') {
        return false
      }

      try {
        const result = await prefetch(text, cacheKey)
        return Boolean(result)
      } catch (error) {
        logger.warn('MYSTERY', 'Narration prefetch failed', { cacheKey, error: error.message })
        return false
      }
    }

    const loadMystery = async () => {
      try {
        const mystery = await fetchMystery()
        if (!mystery || isStale()) return

        if (!hasCrimeSceneOpsPayload(mystery)) {
          dispatch({ type: ACTION.ERROR, payload: FRIENDLY_MYSTERY_ERRORS.LEGACY_PAYLOAD })
          return
        }

        const [imageUrl] = await Promise.all([
          fetchImage(mystery.imagePrompt).catch((error) => {
            logger.warn('MYSTERY', 'Image load failed', { error: error.message })
            return null
          }),
          prefetchNarration(`${mystery.mysteryTitle}. ${mystery.mysterySetup}`, 'briefing-setup'),
        ])

        if (isStale()) return

        dispatch({ type: ACTION.MYSTERY_LOADED, payload: mystery })

        if (imageUrl) {
          dispatch({ type: ACTION.IMAGE_LOADED, payload: imageUrl })
        }
      } catch (error) {
        if (isStale() || error.name === 'AbortError') return
        dispatch({ type: ACTION.ERROR, payload: error.message || FRIENDLY_MYSTERY_ERRORS.DEFAULT })
      }
    }

    loadMystery()

    return () => {
      controller.abort()
      stop()
    }
  }, [slideContext.payload, topicName, explanationLevel, stop, prefetch])

  useEffect(() => {
    if (state.currentState === STATE.BRIEFING && state.mystery) {
      narrate(`${state.mystery.mysteryTitle}. ${state.mystery.mysterySetup}`, 'briefing-setup')
    }
  }, [state.currentState, state.mystery, narrate])

  useEffect(() => {
    if (state.currentState !== STATE.REVEAL || !state.mystery) {
      setShowRevealNarrationOverlay(false)
      if (revealNarrationTimeoutRef.current) {
        clearTimeout(revealNarrationTimeoutRef.current)
        revealNarrationTimeoutRef.current = null
      }
      return
    }

    setShowRevealNarrationOverlay(true)
    narrate(state.mystery.revealNarration, 'reveal')

    if (revealNarrationTimeoutRef.current) {
      clearTimeout(revealNarrationTimeoutRef.current)
    }

    revealNarrationTimeoutRef.current = setTimeout(() => {
      setShowRevealNarrationOverlay(false)
    }, REVEAL_NARRATION_TIMEOUT_MS)

    return () => {
      if (revealNarrationTimeoutRef.current) {
        clearTimeout(revealNarrationTimeoutRef.current)
        revealNarrationTimeoutRef.current = null
      }
    }
  }, [state.currentState, state.mystery, narrate])

  useEffect(() => {
    if (state.currentState !== STATE.REVEAL) return

    if (isPlaying || isNarrationLoading) {
      setShowRevealNarrationOverlay(true)
      return
    }

    const settleTimeout = setTimeout(() => {
      setShowRevealNarrationOverlay(false)
    }, 200)

    return () => clearTimeout(settleTimeout)
  }, [state.currentState, isPlaying, isNarrationLoading])

  const handleStartSceneScan = () => {
    stop()
    dispatch({ type: ACTION.START_SCENE_SCAN })
  }

  const runStageEvaluation = async ({ solveMethod, userAnswer, userTheory, onSuccess }) => {
    try {
      dispatch({ type: ACTION.EVAL_START })
      const result = await evaluateStage({ solveMethod, userAnswer, userTheory })

      if (result.isCorrect) {
        vibrateSuccess()
        playCorrectSound()
        onSuccess(result)
        return
      }

      vibrateShort()
      playPartialSound()
      dispatch({
        type: ACTION.EVAL_FAILURE,
        payload: { error: null, feedback: result.feedback || 'Not correct yet. Try again.' },
      })
    } catch (error) {
      playIncorrectSound()
      dispatch({ type: ACTION.EVAL_FAILURE, payload: { error: error.message || 'Evaluation failed', feedback: null } })
    }
  }

  const handleSceneComplete = async (progress) => {
    await runStageEvaluation({
      solveMethod: 'scene-scan',
      userAnswer: {
        foundHotspotIds: progress.foundHotspotIds,
      },
      onSuccess: (result) => {
        dispatch({ type: ACTION.SCENE_COMPLETE, payload: { progress, result } })
      },
    })
  }

  const handleWitnessComplete = async (progress) => {
    await runStageEvaluation({
      solveMethod: 'witness-room',
      userAnswer: {
        askedQuestionIds: progress.askedQuestionIds,
        resolvedContradictions: progress.resolvedContradictions,
        resolvedContradictionKeys: progress.resolvedContradictionKeys,
      },
      onSuccess: (result) => {
        dispatch({ type: ACTION.WITNESS_COMPLETE, payload: { progress, result } })
      },
    })
  }

  const handleTimelineComplete = async (progress) => {
    await runStageEvaluation({
      solveMethod: 'timeline-rebuild',
      userAnswer: {
        orderedEventIds: progress.orderedEventIds,
        causalLinks: progress.causalLinks,
      },
      onSuccess: (result) => {
        dispatch({ type: ACTION.TIMELINE_COMPLETE, payload: { progress, result } })
      },
    })
  }

  const handleWarrantSubmit = async (draft) => {
    dispatch({ type: ACTION.WARRANT_DRAFT, payload: draft })

    await runStageEvaluation({
      solveMethod: 'warrant-decision',
      userAnswer: draft,
      userTheory: draft.rationale,
      onSuccess: (result) => {
        dispatch({
          type: ACTION.CASE_SOLVED,
          payload: {
            result,
            evaluationResult: {
              isCorrect: true,
              matchedConcepts: result.identifiedConcepts,
              xpEarned: state.totalXp + result.xpEarned,
              feedback: result.feedback || 'Case solved.',
            },
          },
        })
      },
    })
  }

  const handleCelebrate = () => {
    stop()
    dispatch({ type: ACTION.GO_CELEBRATION })
  }

  const handleContinue = () => {
    stop()
    const completedAt = Date.now()
    const session = {
      completedAt,
      mysteryTitle: state.mystery?.mysteryTitle || '',
      mysterySetup: state.mystery?.mysterySetup || '',
      sceneImage: state.sceneImage || null,
      sceneProgress: state.sceneProgress || null,
      witnessProgress: state.witnessProgress || null,
      timelineProgress: state.timelineProgress || null,
      warrantDraft: state.warrantDraft || null,
      evaluationResult: state.evaluationResult || null,
      bonusFinds: state.bonusFinds || 0,
      bonusXp: state.bonusXp || 0,
      totalXp: state.totalXp || 0,
    }

    onComplete?.({
      completed: Boolean(state.evaluationResult?.isCorrect),
      xpEarned: state.evaluationResult?.xpEarned || state.totalXp,
      session,
    })
  }

  const handleBack = () => {
    const guardedStates = [
      STATE.SCENE_SCAN,
      STATE.WITNESS_ROOM,
      STATE.TIMELINE_REBUILD,
      STATE.WARRANT_DECISION,
    ]

    if (guardedStates.includes(state.currentState)) {
      const confirmed = window.confirm('Are you sure you want to exit? Your case progress will be lost.')
      if (!confirmed) return
    }

    stop()
    onExit?.()
  }

  const handleRetry = () => {
    stop()
    dispatch({ type: ACTION.RETRY })
  }

  const renderProgressHeader = () => {
    if (!currentStep) return null

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {STAGE_LABELS[state.currentState]} ({currentStep}/{totalSteps})
          </p>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            XP: {state.totalXp}
          </p>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        {state.lastFeedback && (
          <p className="mt-3 text-sm text-indigo-700 dark:text-indigo-300">{state.lastFeedback}</p>
        )}
        {state.error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">{state.error}</p>
        )}
      </div>
    )
  }

  if (state.error && !state.mystery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-amber-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🕵️</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Crime Scene Ops unavailable</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{state.error}</p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={handleRetry}
              className="px-6 py-3 rounded-full font-medium bg-gradient-to-r from-indigo-500 to-fuchsia-600 text-white shadow-lg"
            >
              Regenerate Case
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-3 rounded-full font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
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
      <MysteryLoader
        stageText={loaderStageText}
        funFact={showFunFact ? loaderFunFact : null}
        factSource="local"
      />
    )
  }

  if (state.currentState === STATE.CELEBRATION) {
    return (
      <DetectiveReward
        solved={state.evaluationResult?.isCorrect || false}
        xpEarned={state.evaluationResult?.xpEarned || state.totalXp}
        solutionExplanation={state.mystery?.solutionExplanation}
        onContinue={handleContinue}
      />
    )
  }

  if (state.currentState === STATE.BRIEFING) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
        <MysteryIntro
          mysteryTitle={state.mystery?.mysteryTitle}
          mysterySetup={state.mystery?.mysterySetup}
          sceneImage={state.sceneImage}
          isTtsPlaying={isPlaying}
          onNext={handleStartSceneScan}
        />
        <button
          type="button"
          onClick={handleBack}
          className="fixed top-4 left-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
        >
          ← Back
        </button>
      </div>
    )
  }

  if (
    state.currentState === STATE.SCENE_SCAN ||
    state.currentState === STATE.WITNESS_ROOM ||
    state.currentState === STATE.TIMELINE_REBUILD ||
    state.currentState === STATE.WARRANT_DECISION
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-4">
          {renderProgressHeader()}

          {state.currentState === STATE.SCENE_SCAN && (
            <CrimeSceneScan
              crimeScene={state.mystery?.crimeScene}
              sceneImage={state.sceneImage}
              explanationLevel={explanationLevel}
              disabled={state.isEvaluating}
              onSubmit={handleSceneComplete}
            />
          )}

          {state.currentState === STATE.WITNESS_ROOM && (
            <WitnessRoom
              witnesses={state.mystery?.witnesses || []}
              explanationLevel={explanationLevel}
              disabled={state.isEvaluating}
              onSubmit={handleWitnessComplete}
            />
          )}

          {state.currentState === STATE.TIMELINE_REBUILD && (
            <TimelineRebuild
              timeline={state.mystery?.timeline}
              explanationLevel={explanationLevel}
              disabled={state.isEvaluating}
              onSubmit={handleTimelineComplete}
            />
          )}

          {state.currentState === STATE.WARRANT_DECISION && (
            <WarrantDecision
              topicName={topicName}
              verdict={state.mystery?.verdict}
              explanationLevel={explanationLevel}
              disabled={state.isEvaluating}
              onSubmit={handleWarrantSubmit}
            />
          )}
        </div>

        <button
          type="button"
          onClick={handleBack}
          className="fixed top-4 left-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
        >
          ← Back
        </button>
      </div>
    )
  }

  if (state.currentState === STATE.REVEAL) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
        <SolutionReveal
          solutionExplanation={state.mystery?.solutionExplanation}
          revealNarration={state.mystery?.revealNarration}
          sceneImage={state.sceneImage}
          evaluationResult={state.evaluationResult}
          isNarrating={showRevealNarrationOverlay || isPlaying || isNarrationLoading}
          onCelebrate={handleCelebrate}
        />
      </div>
    )
  }

  return null
}
