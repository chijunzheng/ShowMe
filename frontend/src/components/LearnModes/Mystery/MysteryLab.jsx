/**
 * MysteryLab - Detective-style learning mode (7-state machine)
 *
 * State flow: LOADING → INTRO → INVESTIGATE → SOLVE → EVALUATING → REVEAL → CELEBRATION
 */

import { useReducer, useEffect, useRef } from 'react'
import useMysteryNarration from './useMysteryNarration'
import MysteryIntro from './MysteryIntro'
import ClueInvestigation from './ClueInvestigation'
import TheorySolver from './TheorySolver'
import SolutionReveal from './SolutionReveal'
import DetectiveReward from './DetectiveReward'
import logger from '../../../utils/logger'
import { vibrateSuccess, vibrateShort } from '../../../utils/haptics'
import { playCorrectSound, playPartialSound, playIncorrectSound } from '../../../utils/soundEffects'
import { buildLearnSlidesPayload } from '../../../utils/learnSlidesPayload'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

// State machine states
const STATE = {
  LOADING: 'LOADING',
  INTRO: 'INTRO',
  INVESTIGATE: 'INVESTIGATE',
  SOLVE: 'SOLVE',
  EVALUATING: 'EVALUATING',
  REVEAL: 'REVEAL',
  CELEBRATION: 'CELEBRATION',
}

// Action types
const ACTION = {
  MYSTERY_LOADED: 'MYSTERY_LOADED',
  IMAGE_LOADED: 'IMAGE_LOADED',
  START_INVESTIGATION: 'START_INVESTIGATION',
  NEXT_CLUE: 'NEXT_CLUE',
  READY_TO_SOLVE: 'READY_TO_SOLVE',
  SUBMIT_ANSWER: 'SUBMIT_ANSWER',
  EVALUATION_COMPLETE: 'EVALUATION_COMPLETE',
  CONTINUE_TO_CELEBRATION: 'CONTINUE_TO_CELEBRATION',
  ERROR: 'ERROR',
  RETRY: 'RETRY',
}

// Initial state
const initialState = {
  currentState: STATE.LOADING,
  mystery: null,
  sceneImage: null,
  currentClueIndex: 0,
  userAnswer: null,
  evaluationResult: null,
  error: null,
}

// Reducer function
function mysteryReducer(state, action) {
  switch (action.type) {
    case ACTION.MYSTERY_LOADED:
      return {
        ...state,
        mystery: action.payload,
        currentState: STATE.INTRO,
      }

    case ACTION.IMAGE_LOADED:
      return {
        ...state,
        sceneImage: action.payload,
      }

    case ACTION.START_INVESTIGATION:
      return {
        ...state,
        currentState: STATE.INVESTIGATE,
        currentClueIndex: 0,
      }

    case ACTION.NEXT_CLUE:
      return {
        ...state,
        currentClueIndex: Math.min(
          state.currentClueIndex + 1,
          (state.mystery?.clues?.length ?? 1) - 1
        ),
      }

    case ACTION.READY_TO_SOLVE:
      return {
        ...state,
        currentState: STATE.SOLVE,
      }

    case ACTION.SUBMIT_ANSWER:
      return {
        ...state,
        userAnswer: action.payload,
        currentState: STATE.EVALUATING,
      }

    case ACTION.EVALUATION_COMPLETE:
      return {
        ...state,
        evaluationResult: action.payload,
        currentState: STATE.REVEAL,
      }

    case ACTION.CONTINUE_TO_CELEBRATION:
      return {
        ...state,
        currentState: STATE.CELEBRATION,
      }

    case ACTION.ERROR:
      return {
        ...state,
        error: action.payload,
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
 * @param {Array} props.slides - Context from current topic
 * @param {string} props.topicName - Current topic name
 * @param {string} props.explanationLevel - User's preference
 * @param {Function} props.onComplete - Return to Learn Mode selection
 * @param {Function} props.onExit - Return to Learn Mode selection
 */
export default function MysteryLab({
  slides = [],
  topicName = '',
  explanationLevel = 'standard',
  onComplete,
  onExit,
}) {
  const [state, dispatch] = useReducer(mysteryReducer, initialState)
  const { narrate, stop, prefetch, isPlaying } = useMysteryNarration()
  const abortControllerRef = useRef(null)

  // Parallel data fetching on mount
  useEffect(() => {
    const controller = new AbortController()
    abortControllerRef.current = controller

    const fetchMystery = async () => {
      try {
        logger.info('MYSTERY', 'Loading mystery', { topicName, slideCount: slides.length })

        const response = await fetch(`${API_BASE}/api/learn/mystery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slides: buildLearnSlidesPayload(slides),
            topicName,
            explanationLevel,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to load mystery')
        }

        const data = await response.json()
        logger.info('MYSTERY', 'Mystery loaded', { title: data.mysteryTitle })
        return data
      } catch (err) {
        if (err.name === 'AbortError') {
          logger.info('MYSTERY', 'Mystery load aborted')
          return null
        }
        throw err
      }
    }

    const fetchImage = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/learn/mystery/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topicName }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Image generation failed')
        }

        const data = await response.json()
        return data.imageUrl
      } catch (err) {
        if (err.name === 'AbortError') {
          return null
        }
        logger.warn('MYSTERY', 'Image load failed, using placeholder', { error: err.message })
        return null
      }
    }

    Promise.allSettled([fetchMystery(), fetchImage()])
      .then(([mysteryResult, imageResult]) => {
        if (mysteryResult.status === 'rejected') {
          dispatch({
            type: ACTION.ERROR,
            payload: mysteryResult.reason.message || 'Failed to load mystery',
          })
          return
        }

        if (mysteryResult.value) {
          dispatch({ type: ACTION.MYSTERY_LOADED, payload: mysteryResult.value })
        }

        if (imageResult.status === 'fulfilled' && imageResult.value) {
          dispatch({ type: ACTION.IMAGE_LOADED, payload: imageResult.value })
        }
      })

    return () => {
      controller.abort()
      stop()
    }
  }, [slides, topicName, explanationLevel, stop])

  // Auto-narrate mystery setup in INTRO state
  useEffect(() => {
    if (state.currentState === STATE.INTRO && state.mystery) {
      narrate(state.mystery.mysterySetup, 'intro-setup')
    }
  }, [state.currentState, state.mystery, narrate])

  // Auto-narrate clue in INVESTIGATE state
  useEffect(() => {
    if (state.currentState === STATE.INVESTIGATE && state.mystery) {
      const clue = state.mystery.clues[state.currentClueIndex]
      if (clue && clue.narratorText) {
        narrate(clue.narratorText, `clue-${state.currentClueIndex}`)

        // Prefetch next clue if available
        const nextClue = state.mystery.clues[state.currentClueIndex + 1]
        if (nextClue && nextClue.narratorText) {
          prefetch(nextClue.narratorText, `clue-${state.currentClueIndex + 1}`)
        }
      }
    }
  }, [state.currentState, state.currentClueIndex, state.mystery, narrate, prefetch])

  // Auto-narrate reveal in REVEAL state
  useEffect(() => {
    if (state.currentState === STATE.REVEAL && state.mystery) {
      narrate(state.mystery.revealNarration, 'reveal')
    }
  }, [state.currentState, state.mystery, narrate])

  // Evaluation API call in EVALUATING state
  useEffect(() => {
    if (state.currentState !== STATE.EVALUATING || !state.userAnswer || !state.mystery) {
      return
    }

    const controller = new AbortController()

    const evaluateAnswer = async () => {
      try {
        logger.info('MYSTERY', 'Evaluating answer')

        const response = await fetch(`${API_BASE}/api/learn/mystery/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...state.userAnswer,
            expectedConcepts: state.mystery.expectedConcepts,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to evaluate')
        }

        const result = await response.json()
        logger.info('MYSTERY', 'Evaluation complete', { result: result.result })

        // Map backend result to SolutionReveal format
        const mappedResult = {
          isCorrect: result.result === 'solved',
          matchedConcepts: result.matchedConcepts || [],
          xpEarned: result.xpEarned || 0,
          feedback: result.hint || '',
        }

        // Play sound effects
        if (result.result === 'solved') {
          vibrateSuccess()
          playCorrectSound()
        } else if (result.result === 'partial') {
          vibrateShort()
          playPartialSound()
        } else {
          vibrateShort()
          playIncorrectSound()
        }

        dispatch({ type: ACTION.EVALUATION_COMPLETE, payload: mappedResult })
      } catch (err) {
        if (err.name === 'AbortError') {
          return
        }
        logger.error('MYSTERY', 'Evaluation failed', { error: err.message })
        dispatch({ type: ACTION.ERROR, payload: err.message })
      }
    }

    evaluateAnswer()

    return () => {
      controller.abort()
    }
  }, [state.currentState, state.userAnswer, state.mystery])

  // Handlers
  const handleStartInvestigation = () => {
    stop()
    dispatch({ type: ACTION.START_INVESTIGATION })
  }

  const handleNextClue = () => {
    dispatch({ type: ACTION.NEXT_CLUE })
  }

  const handleReadyToSolve = () => {
    stop()
    dispatch({ type: ACTION.READY_TO_SOLVE })
  }

  const handleSubmitAnswer = (submission) => {
    dispatch({ type: ACTION.SUBMIT_ANSWER, payload: submission })
  }

  const handleCelebrate = () => {
    stop()
    dispatch({ type: ACTION.CONTINUE_TO_CELEBRATION })
  }

  const handleContinue = () => {
    stop()
    onComplete?.({
      completed: state.evaluationResult?.isCorrect || false,
      xpEarned: state.evaluationResult?.xpEarned || 0,
    })
  }

  const handleBack = () => {
    const needsConfirmation = state.currentState === STATE.INVESTIGATE || state.currentState === STATE.SOLVE
    if (needsConfirmation) {
      const confirmed = window.confirm('Are you sure you want to exit? Your progress will be lost.')
      if (!confirmed) return
    }
    stop()
    onExit?.()
  }

  const handleRetry = () => {
    stop()
    dispatch({ type: ACTION.RETRY })
  }

  // Render states
  if (state.currentState === STATE.LOADING) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-700 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin" />
          <p className="text-lg text-gray-600 dark:text-gray-400 animate-pulse">
            Creating mystery...
          </p>
        </div>
      </div>
    )
  }

  if (state.error && !state.mystery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{state.error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-3 rounded-full font-medium bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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

  if (state.currentState === STATE.CELEBRATION) {
    return (
      <DetectiveReward
        solved={state.evaluationResult?.isCorrect || false}
        xpEarned={state.evaluationResult?.xpEarned || 0}
        solutionExplanation={state.mystery?.solutionExplanation}
        onContinue={handleContinue}
      />
    )
  }

  if (state.currentState === STATE.INTRO) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950">
        <MysteryIntro
          mysteryTitle={state.mystery?.mysteryTitle}
          mysterySetup={state.mystery?.mysterySetup}
          sceneImage={state.sceneImage}
          isTtsPlaying={isPlaying}
          onNext={handleStartInvestigation}
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

  if (state.currentState === STATE.INVESTIGATE) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950">
        <ClueInvestigation
          clues={state.mystery?.clues || []}
          slides={slides}
          currentClueIndex={state.currentClueIndex}
          isTtsPlaying={isPlaying}
          onNextClue={handleNextClue}
          onReadyToSolve={handleReadyToSolve}
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

  if (state.currentState === STATE.SOLVE || state.currentState === STATE.EVALUATING) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <TheorySolver
            topicName={topicName}
            expectedConcepts={state.mystery?.expectedConcepts || []}
            theoryOptions={state.mystery?.theoryOptions || null}
            fillBlanks={state.mystery?.fillBlanks || null}
            clues={state.mystery?.clues?.map(c => c.text) || []}
            evidenceConnections={state.mystery?.evidenceConnections || null}
            onSubmit={handleSubmitAnswer}
            disabled={state.currentState === STATE.EVALUATING}
          />
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

  if (state.currentState === STATE.REVEAL) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950">
        <SolutionReveal
          solutionExplanation={state.mystery?.solutionExplanation}
          revealNarration={state.mystery?.revealNarration}
          sceneImage={state.sceneImage}
          evaluationResult={state.evaluationResult}
          onCelebrate={handleCelebrate}
        />
      </div>
    )
  }

  return null
}
