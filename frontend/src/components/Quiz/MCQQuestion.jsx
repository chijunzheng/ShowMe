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

import { useState, useCallback, useRef, useEffect } from 'react'

// Option labels (A, B, C, D)
const OPTION_LABELS = ['A', 'B', 'C', 'D']

// Keyboard shortcuts for options
const OPTION_KEYS = ['a', 'b', 'c', 'd', '1', '2', '3', '4']

/**
 * Keyboard icon for typing mode toggle
 */
function KeyboardIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V6.75z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 8.25h.01M9 8.25h.01M12 8.25h.01M15 8.25h.01M18 8.25h.01M6 11.25h.01M9 11.25h.01M12 11.25h.01M15 11.25h.01M18 11.25h.01M7.5 14.25h9" />
    </svg>
  )
}

/**
 * Tap/click icon for tap mode toggle
 */
function TapIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
    </svg>
  )
}

export default function MCQQuestion({
  question,
  options = [],
  onAnswer,
  onOptionSelect,
  showFeedback = false,
  correctIndex,
  selectedIndex = null
}) {
  const [localSelected, setLocalSelected] = useState(selectedIndex)

  // Typing mode state
  const [preferTyping, setPreferTyping] = useState(false)
  const [typedAnswer, setTypedAnswer] = useState('')
  const inputRef = useRef(null)

  // Focus input when typing mode is enabled
  useEffect(() => {
    if (preferTyping && !showFeedback && inputRef.current) {
      inputRef.current.focus()
    }
  }, [preferTyping, showFeedback])

  // Handle option selection
  const handleSelect = useCallback((index) => {
    if (showFeedback) return // Prevent selection after feedback shown

    setLocalSelected(index)
    // Notify parent of selection for sound/haptic feedback
    onOptionSelect?.()
  }, [showFeedback, onOptionSelect])

  // Handle toggling between typing and tap mode
  const handleToggleMode = useCallback(() => {
    if (showFeedback) return
    setPreferTyping(prev => !prev)
    // Clear previous selections when switching modes
    setLocalSelected(null)
    setTypedAnswer('')
  }, [showFeedback])

  // Handle typed answer input change
  const handleTypedChange = useCallback((event) => {
    if (showFeedback) return
    const value = event.target.value.toUpperCase()

    // Only allow single letter A-D or number 1-4
    if (value === '' || /^[A-D1-4]$/.test(value)) {
      setTypedAnswer(value)

      // Auto-select the corresponding option
      if (value) {
        let index = -1
        if (/^[A-D]$/.test(value)) {
          index = value.charCodeAt(0) - 65 // A=0, B=1, C=2, D=3
        } else if (/^[1-4]$/.test(value)) {
          index = parseInt(value, 10) - 1 // 1=0, 2=1, 3=2, 4=3
        }
        if (index >= 0 && index < options.length) {
          setLocalSelected(index)
        }
      } else {
        setLocalSelected(null)
      }
    }
  }, [showFeedback, options.length])

  // Handle Enter key in typing mode
  const handleTypedKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && localSelected !== null && !showFeedback) {
      event.preventDefault()
      onAnswer?.(localSelected)
    }
  }, [localSelected, showFeedback, onAnswer])

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

      {/* Mode toggle and typing input */}
      {!showFeedback && (
        <div className="mb-4 flex flex-col items-center gap-3">
          {/* Mode toggle button */}
          <button
            onClick={handleToggleMode}
            className="
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
              text-xs font-medium
              bg-gray-100 dark:bg-slate-700
              text-gray-600 dark:text-gray-300
              hover:bg-gray-200 dark:hover:bg-slate-600
              transition-colors duration-200
              border border-gray-200 dark:border-slate-600
            "
            title={preferTyping ? 'Switch to tap mode' : 'Switch to typing mode'}
            aria-label={preferTyping ? 'Switch to tap mode' : 'Switch to typing mode'}
          >
            {preferTyping ? (
              <>
                <TapIcon className="w-4 h-4" />
                <span>Tap options</span>
              </>
            ) : (
              <>
                <KeyboardIcon className="w-4 h-4" />
                <span>Type answer</span>
              </>
            )}
          </button>

          {/* Typing input (visible in typing mode) */}
          {preferTyping && (
            <div className="w-full max-w-xs">
              <input
                ref={inputRef}
                type="text"
                value={typedAnswer}
                onChange={handleTypedChange}
                onKeyDown={handleTypedKeyDown}
                placeholder="Type A, B, C, or D..."
                maxLength={1}
                className="
                  w-full px-4 py-3 rounded-xl border-2
                  text-lg text-center font-medium uppercase
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  border-gray-200 dark:border-slate-600
                  bg-white dark:bg-slate-800
                  text-gray-800 dark:text-gray-100
                  focus:border-primary focus:ring-primary/30
                  placeholder:text-gray-400 placeholder:normal-case
                "
                aria-label="Type your answer (A, B, C, or D)"
                autoComplete="off"
              />
              {localSelected !== null && (
                <p className="text-center text-sm text-primary mt-2">
                  Selected: {OPTION_LABELS[localSelected]} - {options[localSelected]}
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
          {preferTyping
            ? 'Type A-D or 1-4, then press Enter to submit'
            : 'Tap an option or press A-D / 1-4 to select, Enter to submit'
          }
        </p>
      )}
    </div>
  )
}
