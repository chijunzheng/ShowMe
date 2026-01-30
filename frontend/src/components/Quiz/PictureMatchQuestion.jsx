/**
 * PictureMatchQuestion - Visual matching game for K-5 students
 * Shows 4 slide images and asks "Which picture shows [concept]?"
 * Large touch targets, visual feedback, playful design
 */
import { useState, useCallback } from 'react'

/**
 * @param {Object} props
 * @param {string} props.question - The question (e.g., "Which picture shows photosynthesis?")
 * @param {Array} props.imageOptions - Array of slide indices to show as options
 * @param {Array} props.slides - Full slides array with imageUrl
 * @param {Function} props.onAnswer - Callback with selected slide index
 * @param {boolean} props.showFeedback - Whether to show feedback state
 * @param {number} props.correctSlideIndex - The correct slide index (for feedback)
 * @param {number} props.userAnswer - User's selected slide index (for feedback)
 */
export default function PictureMatchQuestion({
  question,
  imageOptions = [],
  slides = [],
  onAnswer,
  showFeedback = false,
  correctSlideIndex,
  userAnswer,
}) {
  const [selected, setSelected] = useState(null)
  const [imageErrors, setImageErrors] = useState({})

  const handleSelect = useCallback((slideIndex) => {
    if (showFeedback) return
    setSelected(slideIndex)
  }, [showFeedback])

  const handleSubmit = useCallback(() => {
    if (selected === null) return
    onAnswer?.(selected)
  }, [selected, onAnswer])

  const handleImageError = useCallback((slideIndex) => {
    setImageErrors(prev => ({ ...prev, [slideIndex]: true }))
  }, [])

  // Get image URL from slide
  const getImageUrl = (slideIndex) => {
    const slide = slides[slideIndex]
    return slide?.imageUrl || null
  }

  // Determine card state for styling
  const getCardState = (slideIndex) => {
    if (!showFeedback) {
      return selected === slideIndex ? 'selected' : 'default'
    }
    // Feedback mode
    if (slideIndex === correctSlideIndex && slideIndex === userAnswer) {
      return 'correct'
    }
    if (slideIndex === userAnswer && slideIndex !== correctSlideIndex) {
      return 'incorrect'
    }
    if (slideIndex === correctSlideIndex) {
      return 'correct-hint'
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
          Tap the picture that matches!
        </p>
      </div>

      {/* Image Grid - 2x2 */}
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        {imageOptions.slice(0, 4).map((slideIndex, i) => {
          const imageUrl = getImageUrl(slideIndex)
          const state = getCardState(slideIndex)
          const hasError = imageErrors[slideIndex]

          return (
            <button
              key={slideIndex}
              type="button"
              onClick={() => handleSelect(slideIndex)}
              disabled={showFeedback}
              className={`
                relative aspect-video rounded-xl overflow-hidden
                border-3 transition-all duration-200
                ${cardStyles[state]}
                ${!showFeedback ? 'hover:scale-[1.02] active:scale-[0.98]' : ''}
              `}
              aria-label={`Option ${labelMap[i]}`}
            >
              {/* Image */}
              {imageUrl && !hasError ? (
                <img
                  src={imageUrl}
                  alt={`Option ${labelMap[i]}`}
                  onError={() => handleImageError(slideIndex)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <span className="text-4xl text-gray-300 dark:text-gray-600">
                    {labelMap[i]}
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
                {labelMap[i]}
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
