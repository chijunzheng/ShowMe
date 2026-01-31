/**
 * OddOneOutQuestion - Find What Doesn't Belong game for K-5 students
 * Shows 4 items (images and/or text), one doesn't belong
 * User taps the odd one out
 *
 * Features:
 * - 2x2 grid layout optimized for touch
 * - Supports both image-based and text-based items
 * - Celebration animation on correct answer
 * - Shows explanation after answering
 * - Dark mode support
 */
import { useState, useCallback } from 'react'

/**
 * @param {Object} props
 * @param {string} props.question - The question text (e.g., "Which one doesn't belong?")
 * @param {Array} props.items - Array of 4 items, each with { text, imageUrl?, isOdd }
 * @param {Function} props.onAnswer - Callback with selected item index
 * @param {boolean} props.showFeedback - Whether to show feedback state
 * @param {number} props.correctIndex - Index of the odd item (derived from items)
 * @param {number} props.userAnswer - User's selected index (for feedback)
 * @param {string} props.explanation - Explanation shown after answering
 */
export default function OddOneOutQuestion({
  question = "Which one doesn't belong?",
  items = [],
  onAnswer,
  showFeedback = false,
  userAnswer,
  explanation,
}) {
  const [selected, setSelected] = useState(null)
  const [imageErrors, setImageErrors] = useState({})

  // Find the correct answer index (the odd one out)
  const correctIndex = items.findIndex(item => item.isOdd)

  const handleSelect = useCallback((index) => {
    if (showFeedback) return
    setSelected(index)
  }, [showFeedback])

  const handleSubmit = useCallback(() => {
    if (selected === null) return
    onAnswer?.(selected)
  }, [selected, onAnswer])

  const handleImageError = useCallback((index) => {
    setImageErrors(prev => ({ ...prev, [index]: true }))
  }, [])

  // Determine card state for styling
  const getCardState = (index) => {
    const item = items[index]
    const isOdd = item?.isOdd

    if (!showFeedback) {
      return selected === index ? 'selected' : 'default'
    }

    // Feedback mode
    if (index === userAnswer && isOdd) {
      return 'correct' // User correctly found the odd one
    }
    if (index === userAnswer && !isOdd) {
      return 'incorrect' // User selected wrong item
    }
    if (isOdd && userAnswer !== index) {
      return 'correct-hint' // Show correct answer when user was wrong
    }
    return 'default'
  }

  const cardStyles = {
    default: 'border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:shadow-md',
    selected: 'border-primary-500 ring-4 ring-primary-500/30 shadow-lg',
    correct: 'border-green-500 ring-4 ring-green-500/30 shadow-lg',
    'correct-hint': 'border-green-400 border-dashed shadow-md',
    incorrect: 'border-red-500 ring-4 ring-red-500/30',
  }

  const labelMap = ['A', 'B', 'C', 'D']

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Question */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {question}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Find the one that doesn't fit!
        </p>
      </div>

      {/* Items Grid - 2x2 */}
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        {items.slice(0, 4).map((item, index) => {
          const state = getCardState(index)
          const hasError = imageErrors[index]
          const hasImage = item.imageUrl && !hasError

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(index)}
              disabled={showFeedback}
              className={`
                relative rounded-xl overflow-hidden
                border-3 transition-all duration-200
                ${hasImage ? 'aspect-video' : 'aspect-square'}
                ${cardStyles[state]}
                ${!showFeedback ? 'hover:scale-[1.02] active:scale-[0.98]' : ''}
              `}
              aria-label={`Option ${labelMap[index]}: ${item.text}`}
            >
              {/* Image (if available) */}
              {hasImage ? (
                <>
                  <img
                    src={item.imageUrl}
                    alt={item.text}
                    onError={() => handleImageError(index)}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Text overlay on image */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <span className="text-white text-sm font-medium">
                      {item.text}
                    </span>
                  </div>
                </>
              ) : (
                /* Text only card */
                <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 p-4">
                  <span className="text-lg font-medium text-gray-700 dark:text-gray-200 text-center">
                    {item.text}
                  </span>
                </div>
              )}

              {/* Option Label Badge */}
              <div className={`
                absolute top-2 left-2
                w-8 h-8 rounded-full
                flex items-center justify-center
                font-bold text-sm
                ${state === 'selected' ? 'bg-primary-500 text-white' :
                  state === 'correct' ? 'bg-green-500 text-white' :
                  state === 'incorrect' ? 'bg-red-500 text-white' :
                  'bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300'}
                shadow-md
              `}>
                {labelMap[index]}
              </div>

              {/* Feedback Icons */}
              {showFeedback && state === 'correct' && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
                  <span className="text-5xl animate-bounce-in">✓</span>
                </div>
              )}
              {showFeedback && state === 'incorrect' && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                  <span className="text-5xl">✗</span>
                </div>
              )}
              {showFeedback && state === 'correct-hint' && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/10">
                  <span className="text-3xl opacity-70">✓</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Explanation (shown in feedback) */}
      {showFeedback && explanation && (
        <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-xl border border-primary-200 dark:border-primary-700">
          <p className="text-sm text-primary-700 dark:text-primary-200 text-center">
            {explanation}
          </p>
        </div>
      )}

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
