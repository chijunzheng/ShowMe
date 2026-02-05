/**
 * WonderLab - Main component for "What If?" scenarios
 *
 * Presents counterfactual scenarios that require understanding the lesson
 * content to reason through consequences. Non-judgmental evaluation
 * encourages creative thinking and scientific reasoning.
 *
 * Flow:
 * 1. Generate scenario from lesson slides
 * 2. Show dramatic scene with thinking prompts
 * 3. Record user's voice prediction
 * 4. Evaluate and reveal consequences (always encouraging)
 * 5. Show bonus fact and award XP
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import WhatIfScene from './WhatIfScene'
import ThinkPrompts from './ThinkPrompts'
import PredictionRecorder from './PredictionRecorder'
import ConsequenceReveal from './ConsequenceReveal'
import BonusFactCard from './BonusFactCard'
import logger from '../../../utils/logger'
import { vibrateSuccess } from '../../../utils/haptics'
import { playAchievementSound } from '../../../utils/soundEffects'
import { buildLearnSlidesPayload } from '../../../utils/learnSlidesPayload'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

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
  // State machine: loading -> scene -> recording -> evaluating -> results
  const [state, setState] = useState('loading')

  // Scenario data from API
  const [scenario, setScenario] = useState(null)
  const [scenarioImage, setScenarioImage] = useState(null)
  const [error, setError] = useState(null)

  // User prediction
  const [userPrediction, setUserPrediction] = useState('')

  // Evaluation results
  const [evaluation, setEvaluation] = useState(null)

  // Refs for cleanup
  const abortControllerRef = useRef(null)

  /**
   * Generate What If scenario on mount
   */
  useEffect(() => {
    generateScenario()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const generateScenario = async () => {
    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setState('loading')
    setError(null)

    try {
      logger.info('LEARN', 'Generating What If scenario', { topicName })

      const slidesPayload = buildLearnSlidesPayload(slides)

      const response = await fetch(`${API_BASE}/api/learn/whatif`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: slidesPayload,
          topicName,
          explanationLevel,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Lesson content is too large to process. Try a shorter lesson or fewer details.')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error || 'Failed to generate scenario')
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setScenario(data)

      // Generate scenario image (optional, non-blocking)
      if (data.imagePrompt) {
        generateScenarioImage(data.imagePrompt)
      }

      setState('scene')
      logger.info('LEARN', 'What If scenario ready', { scenario: data.scenario })
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') {
        return
      }
      logger.error('LEARN', 'Failed to generate scenario', { error: err.message })
      setError(err.message || 'Failed to generate scenario')
      setState('error')
    }
  }

  const generateScenarioImage = async (imagePrompt) => {
    try {
      // Use the educational image generation endpoint
      const response = await fetch(`${API_BASE}/api/generate/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePrompt,
          topic: topicName,
          explanationLevel,
        }),
      })

      if (!response.ok) {
        logger.warn('LEARN', 'Failed to generate scenario image')
        return
      }

      const data = await response.json()
      if (data.imageUrl) {
        setScenarioImage(data.imageUrl)
      }
    } catch (err) {
      // Non-critical error, just log it
      logger.warn('LEARN', 'Scenario image generation error', { error: err.message })
    }
  }

  const handleStartRecording = useCallback(() => {
    setState('recording')
  }, [])

  const handlePredictionSubmit = useCallback(async (prediction) => {
    setUserPrediction(prediction)
    setState('evaluating')

    try {
      logger.info('LEARN', 'Evaluating prediction', { predictionLength: prediction.length })

      const response = await fetch(`${API_BASE}/api/learn/whatif/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrediction: prediction,
          expectedConsequences: scenario.expectedConsequences,
        }),
      })

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Your prediction is too long to process. Try a shorter answer.')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error || 'Failed to evaluate prediction')
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setEvaluation(data)
      setState('results')

      // Celebrate with haptics and sound
      vibrateSuccess()
      playAchievementSound()

      logger.info('LEARN', 'Prediction evaluated', {
        matchedCount: data.matchedPredictions.length,
        xpEarned: data.xpEarned,
      })
    } catch (err) {
      logger.error('LEARN', 'Failed to evaluate prediction', { error: err.message })
      setError(err.message || 'Failed to evaluate prediction')
      setState('error')
    }
  }, [scenario])

  const handleComplete = useCallback(() => {
    if (evaluation && onComplete) {
      onComplete({ xpEarned: evaluation.xpEarned })
    }
    if (onExit) {
      onExit()
    }
  }, [evaluation, onComplete, onExit])

  const handleRetry = useCallback(() => {
    setUserPrediction('')
    setEvaluation(null)
    setState('scene')
  }, [])

  // Loading state
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Creating your scenario...</p>
      </div>
    )
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-red-950">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'Unable to load Wonder Lab'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={generateScenario}
              className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
            {onExit && (
              <button
                onClick={onExit}
                className="px-6 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Exit
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Main content
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950">
      {/* Scene + Thinking Prompts */}
      {(state === 'scene' || state === 'recording') && scenario && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
          <WhatIfScene
            scenario={scenario.scenario}
            imageUrl={scenarioImage}
          />

          <ThinkPrompts hints={scenario.thinkAboutHints} />

          <PredictionRecorder
            onStartRecording={handleStartRecording}
            onSubmitPrediction={handlePredictionSubmit}
            isRecording={state === 'recording'}
            disabled={state !== 'scene' && state !== 'recording'}
          />

          {onExit && (
            <button
              onClick={onExit}
              className="mt-6 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>
      )}

      {/* Evaluating state */}
      {state === 'evaluating' && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Analyzing your thinking...</p>
        </div>
      )}

      {/* Results */}
      {state === 'results' && evaluation && scenario && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
          <ConsequenceReveal
            userPrediction={userPrediction}
            matchedPredictions={evaluation.matchedPredictions}
            missedConsequences={evaluation.missedConsequences}
            xpEarned={evaluation.xpEarned}
          />

          <BonusFactCard fact={scenario.bonusFact} />

          <div className="flex gap-3 mt-8">
            <button
              onClick={handleRetry}
              className="px-6 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Try Another Scenario
            </button>
            <button
              onClick={handleComplete}
              className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
