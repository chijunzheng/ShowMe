/**
 * SolveMCQ - Multiple choice theory selection
 *
 * Displays 4 option cards with A/B/C/D labels.
 * User selects one option and submits their theory.
 * Shows correct/incorrect feedback before calling onSubmit.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { vibrateShort } from '../../../utils/haptics'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

/**
 * @param {Object} props
 * @param {Object} props.theoryOptions - MCQ options and answer
 * @param {string[]} props.theoryOptions.options - Array of 4 option texts
 * @param {number} props.theoryOptions.correctIndex - Index of correct answer (0-3)
 * @param {Function} props.onSubmit - Callback with selectedIndex when done
 * @param {boolean} props.disabled - Prevents interaction when true
 */
export default function SolveMCQ({ theoryOptions, onSubmit, disabled = false }) {
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const timeoutRef = useRef(null)

  const { options = [], correctIndex = 0 } = theoryOptions || {}

  const handleSelectOption = useCallback(
    (index) => {
      if (disabled || isSubmitted) return
      vibrateShort()
      setSelectedIndex(index)
    },
    [disabled, isSubmitted]
  )

  const handleSubmit = useCallback(() => {
    if (selectedIndex === null || disabled || isSubmitted) return

    setIsSubmitted(true)
    setShowFeedback(true)
    vibrateShort()

    // Show feedback for 2 seconds, then call onSubmit
    timeoutRef.current = setTimeout(() => {
      onSubmit?.(selectedIndex)
    }, 2000)
  }, [selectedIndex, disabled, isSubmitted, onSubmit])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getOptionStyle = (index) => {
    if (!showFeedback) {
      // Selection state
      if (selectedIndex === index) {
        return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
      }
      return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
    }

    // Feedback state
    if (index === correctIndex) {
      return 'border-green-500 bg-green-50 dark:bg-green-900/20'
    }
    if (selectedIndex === index && index !== correctIndex) {
      return 'border-red-500 bg-red-50 dark:bg-red-900/20'
    }
    return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-50'
  }

  const getLabelStyle = (index) => {
    if (!showFeedback) {
      if (selectedIndex === index) {
        return 'bg-purple-600 text-white'
      }
      return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    }

    if (index === correctIndex) {
      return 'bg-green-600 text-white'
    }
    if (selectedIndex === index && index !== correctIndex) {
      return 'bg-red-600 text-white'
    }
    return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-700 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🎯</span>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Choose Your Theory
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select the option that best explains the mystery
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelectOption(index)}
            disabled={disabled || isSubmitted}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 min-h-[56px] text-left ${getOptionStyle(
              index
            )} ${disabled || isSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${getLabelStyle(
                index
              )}`}
            >
              {OPTION_LABELS[index]}
            </div>
            <p className="flex-1 text-gray-800 dark:text-gray-100 leading-relaxed pt-1">
              {option}
            </p>
          </button>
        ))}
      </div>

      {selectedIndex !== null && !isSubmitted && (
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 rounded-full font-medium bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          Submit Theory
        </button>
      )}

      {showFeedback && (
        <div
          className={`flex items-center justify-center gap-2 py-3 rounded-xl ${
            selectedIndex === correctIndex
              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}
        >
          <span className="text-2xl">
            {selectedIndex === correctIndex ? '✓' : '✗'}
          </span>
          <p className="font-medium">
            {selectedIndex === correctIndex ? 'Correct!' : 'Not quite right'}
          </p>
        </div>
      )}
    </div>
  )
}
