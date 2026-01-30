/**
 * SpotItQuestion - "Tap on the diagram" game for K-5 students
 * Shows a full-size diagram and asks users to tap where they see a specific element.
 * Features generous hit detection for forgiving interactions.
 *
 * Supports two usage patterns:
 * 1. Direct imageUrl: <SpotItQuestion imageUrl="..." />
 * 2. Slide reference: <SpotItQuestion slideReference={2} slides={slides} />
 *
 * @example
 * <SpotItQuestion
 *   question="Tap where you see the mitochondria!"
 *   slideReference={2}
 *   slides={slides}
 *   targetLabel="mitochondria"
 *   targetRegion={{ x: 0.65, y: 0.4, radius: 0.15 }}
 *   onAnswer={handleAnswer}
 *   showFeedback={isShowingFeedback}
 *   isCorrect={wasCorrect}
 * />
 */
import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Calculate distance between two points (normalized 0-1 coordinates)
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Distance between points
 */
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

/**
 * Check if a point is within a target area (supports circular and rectangular)
 * @param {Object} point - Point with { x, y } coordinates
 * @param {Object} area - Target area with { x, y, radius } or { x, y, width, height }
 * @param {number} buffer - Buffer multiplier for forgiving hit detection (default 1.3)
 * @returns {boolean} Whether the point is within the area
 */
function isPointInArea(point, area, buffer = 1.3) {
  if (!point || !area) return false

  const dx = point.x - area.x
  const dy = point.y - area.y

  if (area.radius !== undefined) {
    // Circular target area with generous buffer
    const dist = Math.sqrt(dx * dx + dy * dy)
    return dist <= area.radius * buffer
  } else if (area.width !== undefined && area.height !== undefined) {
    // Rectangular target area with generous buffer
    return Math.abs(dx) <= (area.width / 2) * buffer &&
           Math.abs(dy) <= (area.height / 2) * buffer
  }

  return false
}

/**
 * @param {Object} props
 * @param {string} props.question - The question prompt (e.g., "Tap where you see the [target]!")
 * @param {string} [props.imageUrl] - Direct image URL (alternative to slideReference + slides)
 * @param {number} [props.slideReference] - Which slide index to show
 * @param {Array} [props.slides] - Slides array with imageUrl property
 * @param {string} [props.targetLabel] - What the user needs to find
 * @param {string} [props.hint] - Hint text (alternative to targetLabel)
 * @param {Object} [props.targetRegion] - Target area with { x, y, radius } (0-1 normalized)
 * @param {Object} [props.correctArea] - Alternative name for targetRegion (used by Quiz index)
 * @param {Function} props.onAnswer - Callback with { x, y } coordinates
 * @param {boolean} props.showFeedback - Whether to show feedback state
 * @param {boolean} [props.isCorrect] - Whether the user's tap was correct (for feedback)
 * @param {Object} [props.userAnswer] - User's tap position { x, y } (for feedback display)
 */
export default function SpotItQuestion({
  question,
  imageUrl: directImageUrl,
  slideReference,
  slides = [],
  targetLabel,
  hint,
  targetRegion,
  correctArea,
  onAnswer,
  showFeedback = false,
  isCorrect: isCorrectProp,
  userAnswer: userAnswerProp,
}) {
  const [tapPosition, setTapPosition] = useState(null)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const containerRef = useRef(null)

  // Resolve props with fallbacks for compatibility
  const imageUrl = directImageUrl || (slides[slideReference]?.imageUrl) || null
  const target = targetRegion || correctArea || { x: 0.5, y: 0.5, radius: 0.15 }
  const label = targetLabel || hint || 'the target'

  // Use userAnswerProp for feedback display if provided
  const displayTapPosition = showFeedback && userAnswerProp ? userAnswerProp : tapPosition

  // Calculate if tap was correct (use prop if provided, otherwise calculate)
  const isCorrect = isCorrectProp !== undefined
    ? isCorrectProp
    : isPointInArea(displayTapPosition, target)

  // Reset tap position when question changes
  useEffect(() => {
    setTapPosition(null)
    setImageLoaded(false)
    setImageError(false)
  }, [slideReference, directImageUrl])

  // Handle tap/click on the diagram
  const handleTap = useCallback((event) => {
    if (showFeedback || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height

    // Clamp to valid range
    const clampedX = Math.max(0, Math.min(1, x))
    const clampedY = Math.max(0, Math.min(1, y))

    setTapPosition({ x: clampedX, y: clampedY })
  }, [showFeedback])

  // Handle touch events for mobile
  const handleTouch = useCallback((event) => {
    if (showFeedback || !containerRef.current) return

    // Prevent scrolling while tapping on diagram
    event.preventDefault()

    const touch = event.touches[0]
    const rect = containerRef.current.getBoundingClientRect()
    const x = (touch.clientX - rect.left) / rect.width
    const y = (touch.clientY - rect.top) / rect.height

    const clampedX = Math.max(0, Math.min(1, x))
    const clampedY = Math.max(0, Math.min(1, y))

    setTapPosition({ x: clampedX, y: clampedY })
  }, [showFeedback])

  // Submit the answer
  const handleSubmit = useCallback(() => {
    if (!tapPosition) return
    onAnswer?.(tapPosition)
  }, [tapPosition, onAnswer])

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
  }, [])

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  // No image available
  if (!imageUrl || imageError) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="text-4xl mb-4">🖼️</div>
        <p className="text-gray-500 dark:text-gray-400">
          Image not available for this question.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Question Header */}
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {question}
        </h3>
        <p className="text-base text-primary-500 dark:text-primary-400 mt-2 font-medium">
          Find the {label}!
        </p>
        {!showFeedback && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tap on the picture where you see it
          </p>
        )}
      </div>

      {/* Diagram Container */}
      <div className="relative max-w-lg mx-auto">
        <div
          ref={containerRef}
          onClick={handleTap}
          onTouchStart={handleTouch}
          className={`
            relative aspect-video rounded-2xl overflow-hidden
            border-4 transition-all duration-300
            ${showFeedback
              ? isCorrect
                ? 'border-green-500 shadow-lg shadow-green-500/20'
                : 'border-red-500 shadow-lg shadow-red-500/20'
              : tapPosition
                ? 'border-primary-500 shadow-lg shadow-primary-500/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-400'
            }
            ${!showFeedback ? 'cursor-crosshair' : 'cursor-default'}
            bg-gray-100 dark:bg-gray-800
          `}
          role="button"
          tabIndex={0}
          aria-label={`Diagram showing ${label}. Tap where you see it.`}
          onKeyDown={(e) => {
            // Allow keyboard users to press Enter to submit if they have a tap position
            if (e.key === 'Enter' && tapPosition && !showFeedback) {
              handleSubmit()
            }
          }}
        >
          {/* Loading state */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Diagram Image */}
          <img
            src={imageUrl}
            alt={`Diagram for finding ${label}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={`
              w-full h-full object-cover transition-opacity duration-300
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
            `}
            draggable={false}
          />

          {/* User's Tap Marker (before submit) */}
          {tapPosition && !showFeedback && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${tapPosition.x * 100}%`,
                top: `${tapPosition.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Outer ring */}
              <div className="
                w-12 h-12 rounded-full
                border-4 border-primary-500
                bg-primary-500/20
                animate-pulse
              " />
              {/* Center dot */}
              <div className="
                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-4 h-4 rounded-full
                bg-primary-500
                shadow-lg
              " />
            </div>
          )}

          {/* Feedback: User's Tap Marker */}
          {showFeedback && displayTapPosition && (
            <div
              className="absolute pointer-events-none animate-bounce-in"
              style={{
                left: `${displayTapPosition.x * 100}%`,
                top: `${displayTapPosition.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className={`
                w-14 h-14 rounded-full
                flex items-center justify-center
                ${isCorrect
                  ? 'bg-green-500 shadow-lg shadow-green-500/50'
                  : 'bg-red-500 shadow-lg shadow-red-500/50'
                }
              `}>
                <span className="text-white text-2xl font-bold">
                  {isCorrect ? '✓' : '✗'}
                </span>
              </div>
            </div>
          )}

          {/* Feedback: Show correct location with pulsing circle if wrong */}
          {showFeedback && !isCorrect && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${target.x * 100}%`,
                top: `${target.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Pulsing outer ring */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500/30"
                style={{
                  width: target.radius ? `${target.radius * 200}%` : '80px',
                  height: target.radius ? `${target.radius * 200}%` : '80px',
                  minWidth: '60px',
                  minHeight: '60px',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              {/* Static target circle */}
              <div className="
                w-16 h-16 rounded-full
                border-4 border-dashed border-green-500
                bg-green-500/20
                flex items-center justify-center
              ">
                <span className="text-3xl">👆</span>
              </div>
              {/* Label */}
              <div className="
                absolute top-full left-1/2 -translate-x-1/2 mt-2
                px-3 py-1 rounded-full
                bg-green-500 text-white text-sm font-medium
                whitespace-nowrap shadow-lg
              ">
                Here!
              </div>
            </div>
          )}

          {/* Success celebration overlay */}
          {showFeedback && isCorrect && (
            <div className="absolute inset-0 bg-green-500/10 pointer-events-none flex items-center justify-center">
              <div className="text-6xl animate-bounce-in">🎉</div>
            </div>
          )}
        </div>

        {/* Tap instruction indicator */}
        {!showFeedback && !tapPosition && imageLoaded && (
          <div className="
            absolute inset-0 pointer-events-none
            flex items-center justify-center
          ">
            <div className="
              px-4 py-2 rounded-full
              bg-black/50 text-white text-sm font-medium
              animate-pulse
            ">
              👆 Tap anywhere!
            </div>
          </div>
        )}
      </div>

      {/* Feedback Message */}
      {showFeedback && (
        <div className={`
          text-center p-4 rounded-xl animate-fade-in
          ${isCorrect
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }
        `}>
          <p className="text-lg font-semibold">
            {isCorrect
              ? 'Great job! You found it!'
              : `Not quite! The ${label} is over there.`
            }
          </p>
        </div>
      )}

      {/* Submit Button */}
      {!showFeedback && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!tapPosition}
            className={`
              px-8 py-3 rounded-xl font-semibold text-lg
              transition-all duration-200 transform
              ${tapPosition
                ? 'bg-gradient-to-r from-primary-500 to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {tapPosition ? 'Check My Answer!' : 'Tap on the picture first'}
          </button>
        </div>
      )}

      {/* Reset tap hint */}
      {!showFeedback && tapPosition && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Tap somewhere else to change your answer
        </p>
      )}
    </div>
  )
}
