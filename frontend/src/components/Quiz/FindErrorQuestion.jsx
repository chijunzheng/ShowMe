/**
 * FindErrorQuestion - Deep level critical thinking question
 * Shows an incorrect statement and asks "What's wrong with this?"
 * Tests analytical skills and deep understanding
 */
import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * @param {Object} props
 * @param {string} props.question - The question prompt
 * @param {string} props.incorrectStatement - The incorrect statement to analyze
 * @param {Function} props.onAnswer - Callback with user's answer text
 * @param {boolean} props.showFeedback - Whether to show feedback state
 * @param {string} props.correctAnswer - The correct identification of the error
 * @param {string} props.userAnswer - User's submitted answer (for feedback)
 * @param {boolean} props.isCorrect - Whether the user's answer was correct
 * @param {boolean} props.isPartial - Whether partial credit was given
 */
export default function FindErrorQuestion({
  question,
  incorrectStatement,
  onAnswer,
  showFeedback = false,
  correctAnswer,
  userAnswer,
  isCorrect,
  isPartial,
}) {
  const [answer, setAnswer] = useState('')
  const textareaRef = useRef(null)

  // Focus textarea on mount
  useEffect(() => {
    if (!showFeedback && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [showFeedback])

  const handleSubmit = useCallback(() => {
    if (!answer.trim()) return
    onAnswer?.(answer.trim())
  }, [answer, onAnswer])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Question */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {question}
        </h3>
      </div>

      {/* Incorrect Statement - Highlighted as "suspicious" */}
      <div className="relative">
        <div className="
          px-6 py-5 rounded-xl
          bg-amber-50 dark:bg-amber-900/20
          border-2 border-amber-300 dark:border-amber-700
        ">
          {/* Warning icon */}
          <div className="absolute -top-3 left-4 px-2 bg-amber-50 dark:bg-gray-900">
            <span className="text-amber-500 text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Contains an error
            </span>
          </div>

          <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed mt-1">
            "{incorrectStatement}"
          </p>
        </div>
      </div>

      {/* Answer Input */}
      {!showFeedback ? (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              What's wrong with this statement? Explain the error:
            </span>
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="The statement is incorrect because..."
              rows={3}
              className="
                mt-2 w-full px-4 py-3 rounded-xl
                bg-white dark:bg-gray-800
                border-2 border-gray-200 dark:border-gray-700
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
                text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                transition-all duration-200
                resize-none
              "
            />
          </label>

          {/* Character count hint */}
          <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <span>
              {answer.length > 0 ? `${answer.trim().split(/\s+/).length} words` : 'Be specific about the error'}
            </span>
            <span className="text-xs">Press Enter to submit</span>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!answer.trim()}
              className={`
                px-8 py-3 rounded-xl font-semibold text-lg
                transition-all duration-200
                ${answer.trim()
                  ? 'bg-primary-500 text-white hover:bg-primary-600 active:scale-95'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}
              `}
            >
              Check Answer
            </button>
          </div>
        </div>
      ) : (
        /* Feedback Display */
        <div className="space-y-4">
          {/* User's Answer */}
          <div className={`
            p-4 rounded-xl border-2
            ${isCorrect ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' :
              isPartial ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' :
              'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'}
          `}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">
                {isCorrect ? '✓' : isPartial ? '~' : '✗'}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Your answer:
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  {userAnswer}
                </p>
              </div>
            </div>
          </div>

          {/* Correct Answer (if not fully correct) */}
          {!isCorrect && (
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                    The error is:
                  </p>
                  <p className="text-gray-800 dark:text-gray-200">
                    {correctAnswer}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
