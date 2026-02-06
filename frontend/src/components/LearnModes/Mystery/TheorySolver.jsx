/**
 * TheorySolver - Method orchestrator for theory solving
 *
 * Provides multiple ways to solve a mystery:
 * - Multiple Choice (MCQ)
 * - Evidence Board (connect clues to concepts)
 * - Fill in the Blanks
 * - Voice/Text (optional bonus)
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import SolveMCQ from './SolveMCQ'
import SolveEvidenceBoard from './SolveEvidenceBoard'
import SolveFillBlank from './SolveFillBlank'
import SolveVoiceText from './SolveVoiceText'

const METHOD_LABELS = {
  mcq: 'Multiple Choice',
  'evidence-board': 'Evidence Board',
  'fill-blank': 'Fill in Blanks',
  'voice-text': 'Voice/Text',
}

/**
 * @param {Object} props
 * @param {string} props.topicName - The topic/mystery name
 * @param {string[]} props.expectedConcepts - Expected concepts for the mystery
 * @param {Object|null} props.theoryOptions - MCQ data {options, correctIndex}
 * @param {Object|null} props.fillBlanks - Fill-blank data {sentence, blanks, wordBank}
 * @param {string[]} props.clues - Clue text array for evidence board
 * @param {Array|null} props.evidenceConnections - Expected connections for evidence board
 * @param {Object} props.methodStatus - Method status map {method: 'pending'|'passed'|'retry'}
 * @param {Object} props.methodAttempts - Method attempt counters
 * @param {Function} props.onSubmit - Callback with {solveMethod, userAnswer}
 * @param {boolean} props.disabled - Prevents interaction when true
 */
export default function TheorySolver({
  topicName,
  expectedConcepts = [],
  theoryOptions = null,
  fillBlanks = null,
  clues = [],
  evidenceConnections = null,
  methodStatus = {},
  methodAttempts = {},
  onSubmit,
  disabled = false,
}) {
  const [activeMethod, setActiveMethod] = useState(null)

  // Compute available methods based on provided data
  const availableMethods = useMemo(() => {
    const methods = []

    if (theoryOptions && theoryOptions.options && theoryOptions.options.length > 0) {
      methods.push('mcq')
    }

    if (evidenceConnections && Array.isArray(evidenceConnections) && evidenceConnections.length > 0) {
      methods.push('evidence-board')
    }

    if (fillBlanks && fillBlanks.sentence && fillBlanks.wordBank && fillBlanks.wordBank.length > 0) {
      methods.push('fill-blank')
    }

    // Voice/Text is optional bonus and always available.
    methods.push('voice-text')

    return methods
  }, [theoryOptions, evidenceConnections, fillBlanks])

  // Auto-select first available method when data changes
  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.includes(activeMethod)) {
      setActiveMethod(availableMethods[0])
    }
  }, [availableMethods, activeMethod])

  const handleMCQSubmit = useCallback(
    (selectedIndex) => {
      onSubmit?.({
        solveMethod: 'mcq',
        userAnswer: { selectedIndex },
      })
    },
    [onSubmit]
  )

  const handleEvidenceSubmit = useCallback(
    (connections) => {
      onSubmit?.({
        solveMethod: 'evidence-board',
        userAnswer: { connections },
      })
    },
    [onSubmit]
  )

  const handleFillBlankSubmit = useCallback(
    (blanks) => {
      onSubmit?.({
        solveMethod: 'fill-blank',
        userAnswer: { blanks },
      })
    },
    [onSubmit]
  )

  const handleVoiceTextSubmit = useCallback(
    ({ theory }) => {
      onSubmit?.({
        solveMethod: 'voice-text',
        userAnswer: { theory },
      })
    },
    [onSubmit]
  )

  if (!activeMethod || availableMethods.length === 0) {
    return null
  }

  const currentStatus = methodStatus[activeMethod] || 'pending'
  const isCurrentMethodPassed = currentStatus === 'passed'
  const currentMethodAttempt = methodAttempts[activeMethod] || 0

  return (
    <div className="space-y-4">
      {/* Method Selector Pills */}
      {availableMethods.length > 1 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {availableMethods.map((method) => {
            const status = methodStatus[method] || 'pending'
            const statusSuffix = status === 'passed' ? ' ✓' : status === 'retry' ? ' ↺' : ''

            return (
              <button
                key={method}
                onClick={() => setActiveMethod(method)}
                disabled={disabled}
                className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] transition-all duration-200 ${
                  activeMethod === method
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {METHOD_LABELS[method]}{statusSuffix}
              </button>
            )
          })}
        </div>
      )}

      {isCurrentMethodPassed && (
        <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 text-sm">
          This task is completed. You can review it, but no further submission is needed.
        </div>
      )}

      {/* Active Method Component */}
      {activeMethod === 'mcq' && (
        <SolveMCQ
          key={`mcq-${currentMethodAttempt}`}
          theoryOptions={theoryOptions}
          onSubmit={handleMCQSubmit}
          disabled={disabled || isCurrentMethodPassed}
        />
      )}

      {activeMethod === 'evidence-board' && (
        <SolveEvidenceBoard
          key={`evidence-board-${currentMethodAttempt}`}
          clues={clues}
          expectedConcepts={expectedConcepts}
          onSubmit={handleEvidenceSubmit}
          disabled={disabled || isCurrentMethodPassed}
        />
      )}

      {activeMethod === 'fill-blank' && (
        <SolveFillBlank
          key={`fill-blank-${currentMethodAttempt}`}
          fillBlanks={fillBlanks}
          onSubmit={handleFillBlankSubmit}
          disabled={disabled || isCurrentMethodPassed}
        />
      )}

      {activeMethod === 'voice-text' && (
        <SolveVoiceText
          key={`voice-text-${currentMethodAttempt}`}
          topicName={topicName}
          expectedConcepts={expectedConcepts}
          onSubmit={handleVoiceTextSubmit}
          disabled={disabled || isCurrentMethodPassed}
        />
      )}
    </div>
  )
}
