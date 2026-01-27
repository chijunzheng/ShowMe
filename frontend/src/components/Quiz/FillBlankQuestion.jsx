/**
 * FillBlankQuestion Component
 * WB003: Fill in the Blank question display and interaction
 *
 * Features:
 * - Render sentence with styled blank placeholder
 * - Text input below sentence
 * - Submit button
 * - Fuzzy matching for acceptable answer variations
 * - Feedback shows correct answer if wrong
 * - Partial credit indication for close answers
 */

import { useState, useCallback, useRef, useEffect } from 'react'

// Blank placeholder pattern: three or more underscores
const BLANK_PATTERN = /_{3,}|___+/g

export default function FillBlankQuestion({
  blankSentence,
  onAnswer,
  showFeedback = false,
  correctAnswer,
  userAnswer = '',
  isCorrect = false,
  isPartial = false,
  similarity = 0
}) {
  const [inputValue, setInputValue] = useState(userAnswer)
  const inputRef = useRef(null)

  // Focus input on mount
  useEffect(() => {
    if (!showFeedback && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showFeedback])

  // Handle input change
  const handleInputChange = useCallback((event) => {
    if (showFeedback) return
    setInputValue(event.target.value)
  }, [showFeedback])

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!inputValue.trim() || showFeedback) return
    onAnswer?.(inputValue.trim())
  }, [inputValue, showFeedback, onAnswer])

  // Handle Enter key submission
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && inputValue.trim() && !showFeedback) {
      event.preventDefault()
      handleSubmit()
    }
  }, [inputValue, showFeedback, handleSubmit])

  // Render sentence with blank highlighted
  const renderSentenceWithBlank = () => {
    if (!blankSentence) return null

    // Split sentence on blank pattern
    const parts = blankSentence.split(BLANK_PATTERN)
    const blanks = blankSentence.match(BLANK_PATTERN) || []

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
                      ? 'bg-success/20 border-success text-success-600 dark:text-success-400'
                      : isPartial
                        ? 'bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 border-red-500 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-primary/10 border-primary text-primary'
                  }
                  transition-colors duration-300
                `}
              >
                {showFeedback ? (userAnswer || '___') : '___'}
              </span>
            )}
          </span>
        ))}
      </p>
    )
  }

  // Get input styling based on state
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
          border-success bg-success/10 text-success-600 dark:text-success-400
          ring-2 ring-success/30
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

  // Get similarity badge styling and text
  const getSimilarityInfo = () => {
    if (!showFeedback) return null

    if (isCorrect) {
      return { text: 'Perfect!', color: 'text-success', bgColor: 'bg-success/10' }
    }
    if (isPartial) {
      const percent = Math.round(similarity * 100)
      return { text: `${percent}% match - Almost!`, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' }
    }
    return { text: 'Not quite right', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' }
  }

  if (!blankSentence) return null

  const similarityInfo = getSimilarityInfo()

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      {/* Sentence with blank */}
      <div className="mb-8 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700">
        {renderSentenceWithBlank()}
      </div>

      {/* Answer input area */}
      <div className="space-y-4">
        {/* Input label */}
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 text-center">
          Type your answer:
        </label>

        {/* Text input */}
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

        {/* Similarity badge (shown after feedback) */}
        {showFeedback && similarityInfo && (
          <div className="flex justify-center">
            <span className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full
              text-sm font-medium ${similarityInfo.color} ${similarityInfo.bgColor}
            `}>
              {isCorrect && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              )}
              {isPartial && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {!isCorrect && !isPartial && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                </svg>
              )}
              {similarityInfo.text}
            </span>
          </div>
        )}

        {/* Correct answer (shown if wrong) */}
        {showFeedback && !isCorrect && correctAnswer && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Correct answer:
            </p>
            <p className="text-lg font-semibold text-success dark:text-success-400">
              {correctAnswer}
            </p>
          </div>
        )}

        {/* Submit button (only shown before feedback) */}
        {!showFeedback && (
          <div className="flex justify-center pt-2">
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              className={`
                px-8 py-3 rounded-full font-medium
                transition-all duration-200 transform
                ${inputValue.trim()
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
