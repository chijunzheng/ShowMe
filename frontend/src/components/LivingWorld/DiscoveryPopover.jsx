/**
 * DiscoveryPopover Component
 *
 * Shows a popover when users tap a connection line or undiscovered area,
 * suggesting related topics to learn. Part of the Living World feature's
 * discovery and exploration system.
 *
 * Features:
 * - Kid-friendly design with playful header
 * - Difficulty indicators for each suggestion
 * - Smart positioning to stay within viewport
 * - Click outside to close
 * - Keyboard accessibility (Escape to close)
 * - Smooth enter/exit animations
 *
 * Usage:
 * ```jsx
 * <DiscoveryPopover
 *   isOpen={showPopover}
 *   position={{ x: 100, y: 200 }}
 *   suggestions={[
 *     { topicName: 'Volcanoes', reason: 'Related to mountains', difficulty: 'easy' }
 *   ]}
 *   onSelectTopic={(topic) => console.log('Selected:', topic)}
 *   onClose={() => setShowPopover(false)}
 * />
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Difficulty emoji mapping for visual indicators
 */
const DIFFICULTY_EMOJI = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
}

/**
 * Difficulty labels for accessibility
 */
const DIFFICULTY_LABELS = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

/**
 * Viewport padding to prevent popover from touching edges
 */
const VIEWPORT_PADDING = 16

/**
 * Popover dimensions for positioning calculations
 */
const POPOVER_WIDTH = 280
const POPOVER_HEIGHT_ESTIMATE = 200

/**
 * Get difficulty emoji with fallback
 * @param {string} difficulty - Difficulty level
 * @returns {string} Emoji character
 */
function getDifficultyEmoji(difficulty) {
  return DIFFICULTY_EMOJI[difficulty] || DIFFICULTY_EMOJI.medium
}

/**
 * Get difficulty label for accessibility
 * @param {string} difficulty - Difficulty level
 * @returns {string} Human-readable label
 */
function getDifficultyLabel(difficulty) {
  return DIFFICULTY_LABELS[difficulty] || DIFFICULTY_LABELS.medium
}

/**
 * Calculate adjusted position to keep popover within viewport
 * @param {{ x: number, y: number }} position - Original position
 * @param {{ width: number, height: number }} viewport - Viewport dimensions
 * @returns {{ x: number, y: number, arrowPosition: 'top' | 'bottom' | 'left' | 'right' }}
 */
function calculateAdjustedPosition(position, viewport) {
  let adjustedX = position.x
  let adjustedY = position.y
  let arrowPosition = 'top'

  // Horizontal adjustment
  if (position.x + POPOVER_WIDTH + VIEWPORT_PADDING > viewport.width) {
    // Would overflow right - position to the left of tap point
    adjustedX = Math.max(VIEWPORT_PADDING, position.x - POPOVER_WIDTH)
    arrowPosition = 'right'
  } else if (position.x - VIEWPORT_PADDING < 0) {
    // Would overflow left
    adjustedX = VIEWPORT_PADDING
    arrowPosition = 'left'
  }

  // Vertical adjustment
  if (position.y + POPOVER_HEIGHT_ESTIMATE + VIEWPORT_PADDING > viewport.height) {
    // Would overflow bottom - position above tap point
    adjustedY = Math.max(VIEWPORT_PADDING, position.y - POPOVER_HEIGHT_ESTIMATE - 20)
    arrowPosition = 'bottom'
  } else if (position.y - VIEWPORT_PADDING < 0) {
    // Would overflow top
    adjustedY = VIEWPORT_PADDING
  }

  return { x: adjustedX, y: adjustedY, arrowPosition }
}

/**
 * DiscoveryPopover - Suggests related topics when exploring the world
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the popover is visible
 * @param {{ x: number, y: number }} props.position - Screen coordinates for positioning
 * @param {Array<{ topicName: string, reason: string, difficulty: 'easy'|'medium'|'hard' }>} props.suggestions - Topics to suggest
 * @param {Function} props.onSelectTopic - Callback when a topic is selected: (topicName) => void
 * @param {Function} props.onClose - Callback to close the popover
 * @param {number} [props.maxSuggestions=3] - Maximum number of suggestions to display
 */
function DiscoveryPopover({
  isOpen,
  position,
  suggestions = [],
  onSelectTopic,
  onClose,
  maxSuggestions = 3,
}) {
  const popoverRef = useRef(null)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0, arrowPosition: 'top' })

  // Calculate adjusted position when popover opens or position changes
  useEffect(() => {
    if (isOpen && position) {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      }
      setAdjustedPosition(calculateAdjustedPosition(position, viewport))
    }
  }, [isOpen, position])

  // Handle close with exit animation
  const handleClose = useCallback(() => {
    setIsAnimatingOut(true)
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      setIsAnimatingOut(false)
      onClose?.()
    }, 150)
  }, [onClose])

  // Handle topic selection
  const handleSelectTopic = useCallback(
    (topicName) => {
      onSelectTopic?.(topicName)
      handleClose()
    },
    [onSelectTopic, handleClose]
  )

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        handleClose()
      }
    }

    // Use setTimeout to avoid closing immediately on the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen, handleClose])

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  // Don't render if not open and not animating out
  if (!isOpen && !isAnimatingOut) {
    return null
  }

  // Limit suggestions to maxSuggestions
  const displayedSuggestions = suggestions.slice(0, maxSuggestions)

  // Determine animation classes
  const animationClass = isAnimatingOut
    ? 'animate-fade-out-down opacity-0'
    : 'animate-scale-in'

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-label="Discovery suggestions"
      data-testid="discovery-popover"
      className={`
        fixed z-50
        bg-white dark:bg-night-800
        rounded-2xl
        shadow-xl
        p-4
        min-w-[200px] max-w-[280px]
        border border-slate-200 dark:border-night-600
        ${animationClass}
      `}
      style={{
        top: `${adjustedPosition.y}px`,
        left: `${adjustedPosition.x}px`,
      }}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        className="
          absolute top-2 right-2
          w-8 h-8
          flex items-center justify-center
          text-slate-400 dark:text-slate-500
          hover:text-slate-600 dark:hover:text-slate-300
          hover:bg-slate-100 dark:hover:bg-night-700
          rounded-full
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-primary-400
        "
        aria-label="Close suggestions"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          &#10005;
        </span>
      </button>

      {/* Header */}
      <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-3 pr-6">
        <span role="img" aria-hidden="true" className="mr-1">
          🔍
        </span>
        What to learn next?
      </h3>

      {/* Suggestions list */}
      {displayedSuggestions.length > 0 ? (
        <div className="space-y-2">
          {displayedSuggestions.map((suggestion) => (
            <button
              key={suggestion.topicName}
              onClick={() => handleSelectTopic(suggestion.topicName)}
              className="
                w-full text-left
                p-3
                rounded-xl
                bg-slate-50 dark:bg-night-700
                hover:bg-primary-50 dark:hover:bg-night-600
                hover:border-primary-200 dark:hover:border-primary-600
                border border-transparent
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-primary-400
                group
              "
              aria-label={`Learn about ${suggestion.topicName}, ${getDifficultyLabel(suggestion.difficulty)} difficulty`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate">
                  {suggestion.topicName}
                </span>
                <span
                  role="img"
                  aria-label={`${getDifficultyLabel(suggestion.difficulty)} difficulty`}
                  className="flex-shrink-0"
                >
                  {getDifficultyEmoji(suggestion.difficulty)}
                </span>
              </div>
              {suggestion.reason && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {suggestion.reason}
                </p>
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">
          No suggestions available
        </p>
      )}

      {/* Arrow pointer - positioned based on where the popover is relative to tap point */}
      <Arrow position={adjustedPosition.arrowPosition} />
    </div>
  )
}

/**
 * Arrow component for visual connection to tap point
 *
 * @param {Object} props - Component props
 * @param {'top' | 'bottom' | 'left' | 'right'} props.position - Arrow position
 */
function Arrow({ position }) {
  const baseClasses =
    'absolute w-0 h-0 border-solid border-transparent'

  const positionClasses = {
    top: 'top-[-8px] left-4 border-b-white dark:border-b-night-800 border-b-8 border-x-8',
    bottom:
      'bottom-[-8px] left-4 border-t-white dark:border-t-night-800 border-t-8 border-x-8',
    left: 'left-[-8px] top-4 border-r-white dark:border-r-night-800 border-r-8 border-y-8',
    right:
      'right-[-8px] top-4 border-l-white dark:border-l-night-800 border-l-8 border-y-8',
  }

  return (
    <div
      className={`${baseClasses} ${positionClasses[position] || positionClasses.top}`}
      aria-hidden="true"
    />
  )
}

export default DiscoveryPopover
