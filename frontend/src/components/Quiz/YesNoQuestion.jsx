/**
 * YesNoQuestion - Simple true/false question component for K-5 students
 * Large, friendly thumbs up/down buttons for easy selection
 */
import { useState, useCallback } from 'react'

/**
 * @param {Object} props
 * @param {string} props.question - The question prompt
 * @param {string} props.statement - The statement to evaluate as true/false
 * @param {string} props.hint - Optional hint referencing slide diagram
 * @param {Function} props.onAnswer - Callback with boolean answer
 * @param {boolean} props.showFeedback - Whether to show feedback state
 * @param {boolean} props.correctAnswer - The correct answer (for feedback)
 * @param {boolean} props.userAnswer - User's selected answer (for feedback)
 */
export default function YesNoQuestion({
  question,
  statement,
  hint,
  onAnswer,
  showFeedback = false,
  correctAnswer,
  userAnswer,
}) {
  const [selected, setSelected] = useState(null)

  const handleSelect = useCallback((value) => {
    if (showFeedback) return
    setSelected(value)
  }, [showFeedback])

  const handleSubmit = useCallback(() => {
    if (selected === null) return
    onAnswer?.(selected)
  }, [selected, onAnswer])

  // Determine button states for feedback
  const getButtonState = (isTrue) => {
    if (!showFeedback) {
      return selected === isTrue ? 'selected' : 'default'
    }
    // Feedback mode
    if (isTrue === correctAnswer && isTrue === userAnswer) {
      return 'correct' // User selected correct answer
    }
    if (isTrue === userAnswer && isTrue !== correctAnswer) {
      return 'incorrect' // User selected wrong answer
    }
    if (isTrue === correctAnswer) {
      return 'correct-hint' // Show the correct answer
    }
    return 'default'
  }

  const buttonStyles = {
    default: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-400',
    selected: 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 ring-2 ring-primary-500/30',
    correct: 'bg-green-100 dark:bg-green-900/30 border-green-500 ring-2 ring-green-500/30',
    'correct-hint': 'bg-green-50 dark:bg-green-900/20 border-green-400 border-dashed',
    incorrect: 'bg-red-100 dark:bg-red-900/30 border-red-500 ring-2 ring-red-500/30',
  }

  const iconStyles = {
    default: 'text-gray-400 dark:text-gray-500',
    selected: 'text-primary-500',
    correct: 'text-green-500',
    'correct-hint': 'text-green-400',
    incorrect: 'text-red-500',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Question */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {question}
        </h3>

        {/* Statement in a highlighted box */}
        <div className="
          inline-block px-6 py-4 rounded-xl
          bg-primary-50 dark:bg-primary-900/20
          border-2 border-primary-200 dark:border-primary-700
        ">
          <p className="text-base text-gray-800 dark:text-gray-200 italic">
            "{statement}"
          </p>
        </div>

        {/* Hint referencing diagram (if provided) */}
        {hint && (
          <p className="
            mt-3 text-sm text-amber-600 dark:text-amber-400
            flex items-center justify-center gap-1.5
          ">
            <span className="text-base">💡</span>
            {hint}
          </p>
        )}
      </div>

      {/* Yes/No Buttons */}
      <div className="flex justify-center gap-6">
        {/* True / Thumbs Up */}
        <button
          type="button"
          onClick={() => handleSelect(true)}
          disabled={showFeedback}
          className={`
            flex flex-col items-center justify-center
            w-32 h-32 rounded-2xl
            border-3 transition-all duration-200
            ${buttonStyles[getButtonState(true)]}
            ${!showFeedback ? 'hover:scale-105 active:scale-95' : ''}
          `}
          aria-label="True"
        >
          <span className={`text-5xl mb-2 ${iconStyles[getButtonState(true)]}`}>
            {getButtonState(true) === 'correct' ? '🎉' : '👍'}
          </span>
          <span className={`
            text-lg font-bold
            ${getButtonState(true) === 'correct' ? 'text-green-600 dark:text-green-400' :
              getButtonState(true) === 'incorrect' ? 'text-red-600 dark:text-red-400' :
              'text-gray-700 dark:text-gray-300'}
          `}>
            True
          </span>
        </button>

        {/* False / Thumbs Down */}
        <button
          type="button"
          onClick={() => handleSelect(false)}
          disabled={showFeedback}
          className={`
            flex flex-col items-center justify-center
            w-32 h-32 rounded-2xl
            border-3 transition-all duration-200
            ${buttonStyles[getButtonState(false)]}
            ${!showFeedback ? 'hover:scale-105 active:scale-95' : ''}
          `}
          aria-label="False"
        >
          <span className={`text-5xl mb-2 ${iconStyles[getButtonState(false)]}`}>
            {getButtonState(false) === 'correct' ? '🎉' : '👎'}
          </span>
          <span className={`
            text-lg font-bold
            ${getButtonState(false) === 'correct' ? 'text-green-600 dark:text-green-400' :
              getButtonState(false) === 'incorrect' ? 'text-red-600 dark:text-red-400' :
              'text-gray-700 dark:text-gray-300'}
          `}>
            False
          </span>
        </button>
      </div>

      {/* Submit Button */}
      {!showFeedback && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selected === null}
            className={`
              px-8 py-3 rounded-xl font-semibold text-lg
              transition-all duration-200
              ${selected !== null
                ? 'bg-primary-500 text-white hover:bg-primary-600 active:scale-95'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}
            `}
          >
            Check Answer
          </button>
        </div>
      )}
    </div>
  )
}
