/**
 * MCQQuestion Component
 * WB002: Multiple Choice Question display and interaction
 *
 * Features:
 * - 4 option buttons in responsive grid (2x2 on mobile, 1x4 on desktop)
 * - Tap to select with visual ring highlight
 * - After submit: green for correct, red for wrong
 * - Disabled state during feedback
 * - Keyboard navigation support
 */

import { useState, useCallback } from 'react'

// Option labels (A, B, C, D)
const OPTION_LABELS = ['A', 'B', 'C', 'D']

// Keyboard shortcuts for options
const OPTION_KEYS = ['a', 'b', 'c', 'd', '1', '2', '3', '4']

export default function MCQQuestion({
  question,
  options = [],
  onAnswer,
  showFeedback = false,
  correctIndex,
  selectedIndex = null
}) {
  const [localSelected, setLocalSelected] = useState(selectedIndex)

  // Handle option selection
  const handleSelect = useCallback((index) => {
    if (showFeedback) return // Prevent selection after feedback shown

    setLocalSelected(index)
  }, [showFeedback])

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (localSelected === null || showFeedback) return

    onAnswer?.(localSelected)
  }, [localSelected, showFeedback, onAnswer])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event) => {
    if (showFeedback) return

    const key = event.key.toLowerCase()
    const keyIndex = OPTION_KEYS.indexOf(key)

    if (keyIndex !== -1) {
      event.preventDefault()
      const optionIndex = keyIndex % 4
      if (optionIndex < options.length) {
        handleSelect(optionIndex)
      }
    } else if (key === 'enter' && localSelected !== null) {
      event.preventDefault()
      handleSubmit()
    }
  }, [showFeedback, options.length, localSelected, handleSelect, handleSubmit])

  // Determine option styling based on state
  const getOptionClasses = (index) => {
    const isSelected = localSelected === index
    const isCorrect = showFeedback && index === correctIndex
    const isWrong = showFeedback && isSelected && index !== correctIndex

    // Base classes for all options
    const baseClasses = `
      relative w-full min-h-[56px] px-4 py-3 rounded-xl
      border-2 transition-all duration-200
      flex items-center gap-3 text-left
      focus:outline-none focus:ring-2 focus:ring-offset-2
    `

    if (showFeedback) {
      // Feedback state styling
      if (isCorrect) {
        return `${baseClasses}
          border-success bg-success/10
          text-gray-800 dark:text-gray-100
          ring-2 ring-success/50
        `
      }
      if (isWrong) {
        return `${baseClasses}
          border-red-500 bg-red-500/10
          text-gray-800 dark:text-gray-100
          ring-2 ring-red-500/50
        `
      }
      // Unselected options during feedback
      return `${baseClasses}
        border-gray-200 dark:border-slate-600
        bg-gray-50 dark:bg-slate-800
        text-gray-400 dark:text-gray-500
        opacity-60
      `
    }

    // Selection state styling (before submit)
    if (isSelected) {
      return `${baseClasses}
        border-primary bg-primary/10
        text-gray-800 dark:text-gray-100
        ring-2 ring-primary/50
        shadow-md
      `
    }

    // Default unselected state
    return `${baseClasses}
      border-gray-200 dark:border-slate-600
      bg-white dark:bg-slate-800
      text-gray-700 dark:text-gray-200
      hover:border-primary/50 hover:bg-primary/5
      hover:shadow-sm active:scale-[0.98]
      focus:ring-primary/50
    `
  }

  // Get label badge styling
  const getLabelClasses = (index) => {
    const isSelected = localSelected === index
    const isCorrect = showFeedback && index === correctIndex
    const isWrong = showFeedback && isSelected && index !== correctIndex

    const baseClasses = `
      flex-shrink-0 w-8 h-8 rounded-lg
      flex items-center justify-center
      font-semibold text-sm transition-all duration-200
    `

    if (showFeedback) {
      if (isCorrect) {
        return `${baseClasses} bg-success text-white`
      }
      if (isWrong) {
        return `${baseClasses} bg-red-500 text-white`
      }
      return `${baseClasses} bg-gray-200 dark:bg-slate-600 text-gray-400`
    }

    if (isSelected) {
      return `${baseClasses} bg-primary text-white`
    }

    return `${baseClasses} bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300`
  }

  if (!question) return null

  return (
    <div
      className="w-full max-w-2xl mx-auto animate-fade-in"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label="Select an answer"
    >
      {/* Question text */}
      <div className="mb-6">
        <p className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-100 leading-relaxed">
          {question}
        </p>
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={showFeedback}
            className={getOptionClasses(index)}
            role="option"
            aria-selected={localSelected === index}
            aria-disabled={showFeedback}
          >
            {/* Option label (A, B, C, D) */}
            <span className={getLabelClasses(index)}>
              {OPTION_LABELS[index]}
            </span>

            {/* Option text */}
            <span className="flex-1 text-base">
              {option}
            </span>

            {/* Feedback icons */}
            {showFeedback && index === correctIndex && (
              <span className="flex-shrink-0 text-success">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              </span>
            )}
            {showFeedback && localSelected === index && index !== correctIndex && (
              <span className="flex-shrink-0 text-red-500">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Submit button (only shown before feedback) */}
      {!showFeedback && (
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={localSelected === null}
            className={`
              px-8 py-3 rounded-full font-medium
              transition-all duration-200 transform
              ${localSelected !== null
                ? 'bg-gradient-to-r from-primary to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }
            `}
          >
            Check Answer
          </button>
        </div>
      )}

      {/* Keyboard hint */}
      {!showFeedback && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
          Press A-D or 1-4 to select, Enter to submit
        </p>
      )}
    </div>
  )
}
