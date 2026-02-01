/**
 * FillBlankQuestion Component
 * WB003: Fill in the Blank question display and interaction
 *
 * Features:
 * - Render sentence with styled blank placeholder
 * - Word chips for tap-to-select interaction (touch-friendly)
 * - Fallback to text input if no word options provided
 * - Submit button
 * - Clear visual feedback on selection
 * - Feedback shows correct answer if wrong
 */

import { useState, useCallback, useRef, useEffect } from 'react'

// Blank placeholder pattern: three or more underscores
const BLANK_PATTERN = /_{3,}|___+/g

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
 * Chip/tap icon for word chip mode toggle
 */
function ChipIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
    </svg>
  )
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} New shuffled array
 */
function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default function FillBlankQuestion({
  blankSentence,
  wordOptions = [],
  onAnswer,
  showFeedback = false,
  correctAnswer,
  userAnswer = '',
  isCorrect = false,
  isPartial = false,
  similarity = 0
}) {
  // For word chip mode
  const [selectedWord, setSelectedWord] = useState(showFeedback ? userAnswer : null)

  // For text input fallback mode
  const [inputValue, setInputValue] = useState(userAnswer)
  const inputRef = useRef(null)

  // Shuffle word options once on mount (to avoid predictable correct answer position)
  const [shuffledOptions, setShuffledOptions] = useState([])

  // Determine if we're in word chip mode or text input mode
  const hasWordOptions = Array.isArray(wordOptions) && wordOptions.length > 0

  // Track whether user prefers typing mode when word options are available
  const [preferTyping, setPreferTyping] = useState(false)

  // Effective mode: use typing mode if no word options OR if user prefers typing
  const useTypingMode = !hasWordOptions || preferTyping

  // Initialize shuffled options on mount
  useEffect(() => {
    if (hasWordOptions && shuffledOptions.length === 0 && !showFeedback) {
      setShuffledOptions(shuffleArray(wordOptions))
    } else if (showFeedback && shuffledOptions.length === 0) {
      // During feedback, use original order or existing shuffle
      setShuffledOptions(wordOptions)
    }
  }, [hasWordOptions, wordOptions, showFeedback, shuffledOptions.length])

  // Focus input when in typing mode
  useEffect(() => {
    if (useTypingMode && !showFeedback && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showFeedback, useTypingMode])

  // Handle word chip selection
  const handleWordSelect = useCallback((word) => {
    if (showFeedback) return
    setSelectedWord(word === selectedWord ? null : word)
  }, [showFeedback, selectedWord])

  // Handle text input change
  const handleInputChange = useCallback((event) => {
    if (showFeedback) return
    setInputValue(event.target.value)
  }, [showFeedback])

  // Handle toggling between typing and chip mode
  const handleToggleMode = useCallback(() => {
    if (showFeedback) return
    setPreferTyping(prev => !prev)
    // Clear previous selection when switching modes
    setSelectedWord(null)
    setInputValue('')
  }, [showFeedback])

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (showFeedback) return

    if (useTypingMode) {
      if (!inputValue.trim()) return
      onAnswer?.(inputValue.trim())
    } else {
      if (!selectedWord) return
      onAnswer?.(selectedWord)
    }
  }, [useTypingMode, selectedWord, inputValue, showFeedback, onAnswer])

  // Handle Enter key submission (text input mode)
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && inputValue.trim() && !showFeedback) {
      event.preventDefault()
      handleSubmit()
    }
  }, [inputValue, showFeedback, handleSubmit])

  const getBlankFillTokens = useCallback((answer, blanksCount) => {
    if (!answer || blanksCount === 0) return []
    if (Array.isArray(answer)) return answer.filter(Boolean)

    const trimmedAnswer = String(answer).trim()
    if (!trimmedAnswer) return []
    if (blanksCount <= 1) return [trimmedAnswer]

    const andSplit = trimmedAnswer.split(/\s+and\s+/i).map(part => part.trim()).filter(Boolean)
    if (andSplit.length === blanksCount) {
      return andSplit
    }

    const commaSplit = trimmedAnswer.split(/\s*,\s*/).map(part => part.trim()).filter(Boolean)
    if (commaSplit.length === blanksCount) {
      return commaSplit
    }

    return [trimmedAnswer]
  }, [])

  // Render sentence with blank highlighted and filled word
  const renderSentenceWithBlank = () => {
    if (!blankSentence) return null

    // Split sentence on blank pattern
    const parts = blankSentence.split(BLANK_PATTERN)
    const blanks = blankSentence.match(BLANK_PATTERN) || []

    // Determine what to show in the blank based on current mode
    const displayWord = showFeedback
      ? userAnswer
      : useTypingMode
        ? inputValue
        : selectedWord

    const fillTokens = getBlankFillTokens(displayWord, blanks.length)

    return (
      <p className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-100 leading-relaxed">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < blanks.length && (
              <span
                className={`
                  inline-block min-w-[100px] mx-1 px-3 py-1 rounded-lg
                  border-b-4 font-medium text-center
                  ${showFeedback
                    ? isCorrect
                      ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : isPartial
                        ? 'bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 border-red-500 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : fillTokens[index]
                      ? 'bg-primary/20 border-primary text-primary-600 dark:text-primary-400'
                      : 'bg-primary/10 border-primary/50 text-primary/60'
                  }
                  transition-all duration-300
                `}
              >
                {fillTokens[index] || '___'}
              </span>
            )}
          </span>
        ))}
      </p>
    )
  }

  // Get word chip styling based on state
  const getWordChipClasses = (word) => {
    const isSelected = selectedWord === word
    const isCorrectWord = showFeedback && word === correctAnswer
    const isWrongSelection = showFeedback && word === userAnswer && word !== correctAnswer

    const baseClasses = `
      px-4 py-3 rounded-xl border-2
      text-base font-medium
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      touch-manipulation
      select-none
    `

    if (showFeedback) {
      if (isCorrectWord) {
        return `${baseClasses}
          border-green-500 bg-green-100 text-green-700
          dark:bg-green-900/30 dark:text-green-400
          ring-2 ring-green-500/30
        `
      }
      if (isWrongSelection) {
        return `${baseClasses}
          border-red-500 bg-red-100 text-red-600
          dark:bg-red-900/30 dark:text-red-400
          ring-2 ring-red-500/30
        `
      }
      // Other options during feedback
      return `${baseClasses}
        border-gray-200 dark:border-slate-600
        bg-gray-50 dark:bg-slate-800
        text-gray-400 dark:text-gray-500
        opacity-60
      `
    }

    // Selection state (before submit)
    if (isSelected) {
      return `${baseClasses}
        border-primary bg-primary/15 text-primary-600 dark:text-primary-400
        ring-2 ring-primary/40
        shadow-md scale-105
      `
    }

    // Default unselected state
    return `${baseClasses}
      border-gray-200 dark:border-slate-600
      bg-white dark:bg-slate-800
      text-gray-700 dark:text-gray-200
      hover:border-primary/50 hover:bg-primary/5
      hover:shadow-sm active:scale-95
      focus:ring-primary/50
    `
  }

  // Get input styling based on state (for fallback text input)
  const getInputClasses = () => {
    const baseClasses = `
      w-full px-4 py-3 rounded-xl border-2
      text-lg text-center font-medium
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
    `

    if (showFeedback) {
      if (isCorrect) {
        return `${baseClasses}
          border-green-500 bg-green-100/50 text-green-700 dark:text-green-400
          ring-2 ring-green-500/30
        `
      }
      if (isPartial) {
        return `${baseClasses}
          border-yellow-500 bg-yellow-50 text-yellow-700
          dark:bg-yellow-900/20 dark:text-yellow-400
          ring-2 ring-yellow-500/30
        `
      }
      return `${baseClasses}
        border-red-500 bg-red-50 text-red-600
        dark:bg-red-900/20 dark:text-red-400
        ring-2 ring-red-500/30
      `
    }

    return `${baseClasses}
      border-gray-200 dark:border-slate-600
      bg-white dark:bg-slate-800
      text-gray-800 dark:text-gray-100
      focus:border-primary focus:ring-primary/30
      placeholder:text-gray-400
    `
  }

  // Get result info for feedback display
  const getResultInfo = () => {
    if (!showFeedback) return null

    if (isCorrect) {
      return { text: 'Perfect!', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: 'check' }
    }
    if (isPartial) {
      const percent = Math.round(similarity * 100)
      return { text: `${percent}% match - Almost!`, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', icon: 'partial' }
    }
    return { text: 'Not quite right', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: 'wrong' }
  }

  if (!blankSentence) return null

  const resultInfo = getResultInfo()
  const canSubmit = useTypingMode ? inputValue.trim() : selectedWord !== null

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      {/* Sentence with blank */}
      <div className="mb-8 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700">
        {renderSentenceWithBlank()}
      </div>

      {/* Answer selection area */}
      <div className="space-y-4">
        {/* Instruction label with mode toggle */}
        <div className="flex items-center justify-center gap-3">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {useTypingMode ? 'Type your answer:' : 'Tap the word that fits:'}
          </label>

          {/* Mode toggle button - only show when word options are available */}
          {hasWordOptions && !showFeedback && (
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
              title={useTypingMode ? 'Switch to tap mode' : 'Switch to typing mode'}
              aria-label={useTypingMode ? 'Switch to tap mode' : 'Switch to typing mode'}
            >
              {useTypingMode ? (
                <>
                  <ChipIcon className="w-4 h-4" />
                  <span>Tap</span>
                </>
              ) : (
                <>
                  <KeyboardIcon className="w-4 h-4" />
                  <span>Type</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Text input (when in typing mode) */}
        {useTypingMode ? (
          <input
            ref={inputRef}
            type="text"
            value={showFeedback ? userAnswer : inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={showFeedback}
            placeholder="Enter your answer..."
            className={getInputClasses()}
            aria-label="Fill in the blank answer"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        ) : hasWordOptions ? (
          <div className="flex flex-wrap justify-center gap-3">
            {shuffledOptions.map((word, index) => (
              <button
                key={`${word}-${index}`}
                onClick={() => handleWordSelect(word)}
                disabled={showFeedback}
                className={getWordChipClasses(word)}
                aria-label={`Select ${word}`}
                aria-pressed={selectedWord === word}
              >
                {word}

                {/* Feedback icons */}
                {showFeedback && word === correctAnswer && (
                  <span className="ml-2 text-green-600 dark:text-green-400">
                    <svg className="w-5 h-5 inline" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  </span>
                )}
                {showFeedback && word === userAnswer && word !== correctAnswer && (
                  <span className="ml-2 text-red-500">
                    <svg className="w-5 h-5 inline" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : null}

        {/* Result badge (shown after feedback) */}
        {showFeedback && resultInfo && (
          <div className="flex justify-center">
            <span className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full
              text-sm font-medium ${resultInfo.color} ${resultInfo.bgColor}
            `}>
              {resultInfo.icon === 'check' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              )}
              {resultInfo.icon === 'partial' && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {resultInfo.icon === 'wrong' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                </svg>
              )}
              {resultInfo.text}
            </span>
          </div>
        )}

        {/* Correct answer (shown if wrong) */}
        {showFeedback && !isCorrect && correctAnswer && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Correct answer:
            </p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              {correctAnswer}
            </p>
          </div>
        )}

        {/* Submit button (only shown before feedback) */}
        {!showFeedback && (
          <div className="flex justify-center pt-2">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`
                px-8 py-3 rounded-full font-medium
                transition-all duration-200 transform
                ${canSubmit
                  ? 'bg-gradient-to-r from-primary to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }
              `}
            >
              Check Answer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
