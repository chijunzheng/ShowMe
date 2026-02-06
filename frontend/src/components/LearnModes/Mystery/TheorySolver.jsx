/**
 * TheorySolver - Method orchestrator for theory solving
 *
 * Provides multiple ways to solve a mystery:
 * - Multiple Choice (MCQ)
 * - Evidence Board (connect clues to concepts)
 * - Fill in the Blanks
 * - Voice/Text (free-form explanation)
 *
 * Delegates to specialized sub-components and transforms their output
 * into a unified format for the parent component.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import SolveMCQ from './SolveMCQ'
import SolveEvidenceBoard from './SolveEvidenceBoard'
import SolveFillBlank from './SolveFillBlank'
import SolveVoiceText from './SolveVoiceText'

/**
 * @param {Object} props
 * @param {string} props.topicName - The topic/mystery name
 * @param {string[]} props.expectedConcepts - Expected concepts for the mystery
 * @param {Object|null} props.theoryOptions - MCQ data {options, correctIndex}
 * @param {Object|null} props.fillBlanks - Fill-blank data {sentence, blanks, wordBank}
 * @param {string[]} props.clues - Clue text array for evidence board
 * @param {Array|null} props.evidenceConnections - Expected connections for evidence board
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
  onSubmit,
  disabled = false
}) {
  const [activeMethod, setActiveMethod] = useState(null)

  // Compute available methods based on provided data
  const availableMethods = useMemo(() => {
    const methods = []

    // MCQ: requires theoryOptions
    if (theoryOptions && theoryOptions.options && theoryOptions.options.length > 0) {
      methods.push('mcq')
    }

    // Evidence Board: requires evidenceConnections array
    if (evidenceConnections && Array.isArray(evidenceConnections) && evidenceConnections.length > 0) {
      methods.push('evidence')
    }

    // Fill-Blank: requires fillBlanks
    if (fillBlanks && fillBlanks.sentence && fillBlanks.wordBank && fillBlanks.wordBank.length > 0) {
      methods.push('fillblank')
    }

    // Voice/Text: always available as fallback
    methods.push('voice')

    return methods
  }, [theoryOptions, evidenceConnections, fillBlanks])

  // Auto-select first available method when data changes
  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.includes(activeMethod)) {
      setActiveMethod(availableMethods[0])
    }
  }, [availableMethods, activeMethod])

  // Method selector data
  const methodLabels = {
    mcq: 'Multiple Choice',
    evidence: 'Evidence Board',
    fillblank: 'Fill in Blanks',
    voice: 'Voice/Text'
  }

  // Wrapper handlers that transform sub-component output to unified format
  const handleMCQSubmit = useCallback(
    (selectedIndex) => {
      onSubmit?.({
        solveMethod: 'mcq',
        userAnswer: { selectedIndex }
      })
    },
    [onSubmit]
  )

  const handleEvidenceSubmit = useCallback(
    (connections) => {
      onSubmit?.({
        solveMethod: 'evidence-board',
        userAnswer: { connections }
      })
    },
    [onSubmit]
  )

  const handleFillBlankSubmit = useCallback(
    (blanks) => {
      onSubmit?.({
        solveMethod: 'fill-blank',
        userAnswer: { blanks }
      })
    },
    [onSubmit]
  )

  const handleVoiceTextSubmit = useCallback(
    ({ theory }) => {
      onSubmit?.({
        solveMethod: 'voice-text',
        userAnswer: { theory }
      })
    },
    [onSubmit]
  )

  // Don't render until we have an active method
  if (!activeMethod || availableMethods.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Method Selector Pills */}
      {availableMethods.length > 1 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {availableMethods.map((method) => (
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
              {methodLabels[method]}
            </button>
          ))}
        </div>
      )}

      {/* Active Method Component */}
      {activeMethod === 'mcq' && (
        <SolveMCQ
          theoryOptions={theoryOptions}
          onSubmit={handleMCQSubmit}
          disabled={disabled}
        />
      )}

      {activeMethod === 'evidence' && (
        <SolveEvidenceBoard
          clues={clues}
          expectedConcepts={expectedConcepts}
          onSubmit={handleEvidenceSubmit}
          disabled={disabled}
        />
      )}

      {activeMethod === 'fillblank' && (
        <SolveFillBlank
          fillBlanks={fillBlanks}
          onSubmit={handleFillBlankSubmit}
        />
      )}

      {activeMethod === 'voice' && (
        <SolveVoiceText
          topicName={topicName}
          expectedConcepts={expectedConcepts}
          onSubmit={handleVoiceTextSubmit}
          disabled={disabled}
        />
      )}
    </div>
  )
}
