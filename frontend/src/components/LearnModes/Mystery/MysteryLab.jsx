/**
 * MysteryLab - Detective-style learning mode
 *
 * Kids solve mysteries using knowledge from their lesson.
 * State machine manages flow: loading → scene → recording → result → celebration
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import MysteryScene from './MysteryScene'
import CluePanel from './CluePanel'
import TheorySolver from './TheorySolver'
import DetectiveReward from './DetectiveReward'
import logger from '../../../utils/logger'
import { vibrateSuccess, vibrateShort } from '../../../utils/haptics'
import { playCorrectSound, playPartialSound, playIncorrectSound } from '../../../utils/soundEffects'
import { buildLearnSlidesPayload } from '../../../utils/learnSlidesPayload'

// API base URL for backend calls
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

// Mystery Lab states
const MYSTERY_STATE = {
  LOADING: 'loading',
  SCENE: 'scene',
  RECORDING: 'recording',
  EVALUATING: 'evaluating',
  RESULT: 'result',
  CELEBRATION: 'celebration',
}

/**
 * @param {Object} props
 * @param {Array} props.slides - Content slides from the lesson
 * @param {string} props.topicName - Name of the topic learned
 * @param {string} props.explanationLevel - 'simple' | 'standard' | 'deep'
 * @param {Function} props.onComplete - Callback when mystery is solved or skipped
 * @param {Function} props.onExit - Callback to exit mystery lab
 */
export default function MysteryLab({
  slides = [],
  topicName = '',
  explanationLevel = 'standard',
  onComplete,
  onExit,
}) {
  const [mysteryState, setMysteryState] = useState(MYSTERY_STATE.LOADING)
  const [mysteryData, setMysteryData] = useState(null)
  const [userTheory, setUserTheory] = useState('')
  const [evaluationResult, setEvaluationResult] = useState(null)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  const abortControllerRef = useRef(null)

  // Load mystery on mount
  useEffect(() => {
    loadMystery()

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  /**
   * Fetch mystery from backend
   */
  const loadMystery = async () => {
    setMysteryState(MYSTERY_STATE.LOADING)
    setError(null)

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

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
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load mystery')
      }

      const data = await response.json()

      logger.info('MYSTERY', 'Mystery loaded', {
        title: data.mysteryTitle,
        clueCount: data.clues?.length || 0
      })

      setMysteryData(data)
      setMysteryState(MYSTERY_STATE.SCENE)
    } catch (err) {
      if (err.name === 'AbortError') {
        logger.info('MYSTERY', 'Mystery load aborted')
        return
      }

      logger.error('MYSTERY', 'Failed to load mystery', { error: err.message })
      setError(err.message || 'Failed to load mystery. Please try again.')
      setMysteryState(MYSTERY_STATE.SCENE) // Allow retry even on error
    }
  }

  /**
   * Handle user submitting their theory
   */
  const handleTheorySubmit = async (theory) => {
    if (!theory || !mysteryData) return

    setUserTheory(theory)
    setMysteryState(MYSTERY_STATE.EVALUATING)
    setError(null)

    try {
      logger.info('MYSTERY', 'Evaluating theory', { theoryLength: theory.length })

      const response = await fetch(`${API_BASE}/api/learn/mystery/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userTheory: theory,
          expectedConcepts: mysteryData.expectedConcepts,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to evaluate theory')
      }

      const result = await response.json()

      logger.info('MYSTERY', 'Theory evaluated', {
        result: result.result,
        xpEarned: result.xpEarned,
        matchedCount: result.matchedConcepts?.length || 0
      })

      setEvaluationResult(result)
      setMysteryState(MYSTERY_STATE.RESULT)

      // Play sound based on result
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

      // If solved, move to celebration after a delay
      if (result.result === 'solved') {
        setTimeout(() => {
          setMysteryState(MYSTERY_STATE.CELEBRATION)
        }, 2000)
      }
    } catch (err) {
      logger.error('MYSTERY', 'Failed to evaluate theory', { error: err.message })
      setError(err.message || 'Failed to evaluate theory. Please try again.')
      setMysteryState(MYSTERY_STATE.SCENE)
    }
  }

  /**
   * Handle retry after partial/wrong result
   */
  const handleRetry = useCallback(() => {
    vibrateShort()
    setRetryCount(prev => prev + 1)
    setUserTheory('')
    setEvaluationResult(null)
    setMysteryState(MYSTERY_STATE.SCENE)
  }, [])

  /**
   * Handle viewing solution (gives up)
   */
  const handleViewSolution = useCallback(() => {
    vibrateShort()
    setMysteryState(MYSTERY_STATE.CELEBRATION)
    // Set a result that shows the solution
    setEvaluationResult({
      result: 'viewed_solution',
      xpEarned: 5,
      matchedConcepts: []
    })
  }, [])

  /**
   * Handle completing the mystery
   */
  const handleComplete = useCallback(() => {
    vibrateShort()
    onComplete?.({
      completed: evaluationResult?.result === 'solved',
      xpEarned: evaluationResult?.xpEarned || 0,
      retryCount
    })
  }, [evaluationResult, retryCount, onComplete])

  /**
   * Handle exiting early
   */
  const handleExit = useCallback(() => {
    vibrateShort()
    onExit?.()
  }, [onExit])

  // Loading state
  if (mysteryState === MYSTERY_STATE.LOADING) {
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

  // Error state
  if (error && !mysteryData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadMystery}
              className="px-6 py-3 rounded-full font-medium bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Try Again
            </button>
            <button
              onClick={handleExit}
              className="px-6 py-3 rounded-full font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Celebration state (solved or viewed solution)
  if (mysteryState === MYSTERY_STATE.CELEBRATION) {
    return (
      <DetectiveReward
        solved={evaluationResult?.result === 'solved'}
        xpEarned={evaluationResult?.xpEarned || 5}
        solutionExplanation={mysteryData?.solutionExplanation}
        onContinue={handleComplete}
      />
    )
  }

  // Main mystery interface
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔍</span>
          <div>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Mystery Lab
            </h1>
            {mysteryData?.mysteryTitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {mysteryData.mysteryTitle}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleExit}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Exit
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Mystery Scene */}
          {mysteryData && (
            <MysteryScene
              mysterySetup={mysteryData.mysterySetup}
              imagePrompt={mysteryData.imagePrompt}
            />
          )}

          {/* Clues Panel */}
          {mysteryData?.clues && (
            <CluePanel
              clues={mysteryData.clues}
              slides={slides}
            />
          )}

          {/* Theory Solver - only show in scene/recording/evaluating states */}
          {(mysteryState === MYSTERY_STATE.SCENE ||
            mysteryState === MYSTERY_STATE.RECORDING ||
            mysteryState === MYSTERY_STATE.EVALUATING) && (
            <TheorySolver
              isRecording={mysteryState === MYSTERY_STATE.RECORDING}
              isEvaluating={mysteryState === MYSTERY_STATE.EVALUATING}
              onTheorySubmit={handleTheorySubmit}
              onStartRecording={() => setMysteryState(MYSTERY_STATE.RECORDING)}
              onStopRecording={() => setMysteryState(MYSTERY_STATE.SCENE)}
            />
          )}

          {/* Result Display */}
          {mysteryState === MYSTERY_STATE.RESULT && evaluationResult && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg animate-fade-in">
              {evaluationResult.result === 'solved' ? (
                <div className="text-center">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-success-600 dark:text-success-400 mb-2">
                    Case Solved!
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    You cracked the mystery!
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-success-100 dark:bg-success-900/30 rounded-full">
                    <span className="text-success-600 dark:text-success-400 font-bold text-lg">
                      +{evaluationResult.xpEarned} XP
                    </span>
                  </div>
                </div>
              ) : evaluationResult.result === 'partial' ? (
                <div className="text-center">
                  <div className="text-6xl mb-4">🤔</div>
                  <h2 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                    Getting Warmer!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You're on the right track, but there's more to discover.
                  </p>
                  {evaluationResult.hint && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-4">
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        💡 Hint: {evaluationResult.hint}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleRetry}
                      className="px-6 py-3 rounded-full font-medium bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      Try Again (+15 XP earned)
                    </button>
                    <button
                      onClick={handleViewSolution}
                      className="px-6 py-3 rounded-full font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      View Solution
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-6xl mb-4">🤷</div>
                  <h2 className="text-2xl font-bold text-gray-600 dark:text-gray-400 mb-2">
                    Not Quite
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Think about what you learned in the lesson.
                  </p>
                  {evaluationResult.hint && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        💡 Hint: {evaluationResult.hint}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleRetry}
                      className="px-6 py-3 rounded-full font-medium bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      Try Again (+5 XP earned)
                    </button>
                    <button
                      onClick={handleViewSolution}
                      className="px-6 py-3 rounded-full font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      View Solution
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
