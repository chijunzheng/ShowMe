/**
 * ChapterProgressBar Component
 *
 * Segmented progress bar for slideshow navigation.
 * Shows main topic and follow-up questions as separate segments.
 * Each segment displays progress within it and is clickable for navigation.
 *
 * Visual design:
 * [===Main Topic===|--Follow-up 1--|---Follow-up 2---]
 *      ^current
 */

import { useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import { truncateLabel } from './chapterUtils'

/**
 * Maximum label length before truncation
 */
const MAX_LABEL_LENGTH = 16

/**
 * Minimum segment width in percentage
 */
const MIN_SEGMENT_WIDTH_PERCENT = 15

/**
 * ChapterProgressBar - Segmented progress bar with chapter navigation
 *
 * @param {Object} props
 * @param {Array} props.segments - Array of SlideSegment objects
 * @param {number} props.currentSegmentIndex - Currently active segment (0-indexed)
 * @param {number} props.currentSlideInSegment - Current slide within segment (0-indexed)
 * @param {Function} props.onSegmentClick - Callback when segment clicked (segmentIndex)
 * @param {Function} props.onExpand - Callback to expand chapter picker
 */
export default function ChapterProgressBar({
  segments = [],
  currentSegmentIndex = 0,
  currentSlideInSegment = 0,
  onSegmentClick,
  onExpand,
}) {
  // Calculate segment widths based on slide count
  const segmentWidths = useMemo(() => {
    if (segments.length === 0) return []

    const totalSlides = segments.reduce((sum, seg) => sum + seg.slides.length, 0)
    if (totalSlides === 0) return segments.map(() => 100 / segments.length)

    // Calculate proportional widths
    const rawWidths = segments.map((seg) => (seg.slides.length / totalSlides) * 100)

    // Ensure minimum width for readability
    const adjustedWidths = rawWidths.map((width) =>
      Math.max(width, MIN_SEGMENT_WIDTH_PERCENT)
    )

    // Normalize to 100%
    const totalWidth = adjustedWidths.reduce((sum, w) => sum + w, 0)
    return adjustedWidths.map((w) => (w / totalWidth) * 100)
  }, [segments])

  /**
   * Handle segment click - navigate to first slide of segment
   */
  const handleSegmentClick = useCallback(
    (index) => {
      if (onSegmentClick) {
        onSegmentClick(index)
      }
    },
    [onSegmentClick]
  )

  /**
   * Handle expand button click
   */
  const handleExpandClick = useCallback(() => {
    if (onExpand) {
      onExpand()
    }
  }, [onExpand])

  /**
   * Get segment status for styling
   */
  const getSegmentStatus = useCallback(
    (index) => {
      if (index < currentSegmentIndex) {
        return 'complete'
      }
      if (index === currentSegmentIndex) {
        return 'active'
      }
      return 'future'
    },
    [currentSegmentIndex]
  )

  /**
   * Calculate progress percentage within a segment
   */
  const getProgressPercent = useCallback(
    (segmentIndex) => {
      if (segmentIndex < currentSegmentIndex) {
        return 100
      }
      if (segmentIndex > currentSegmentIndex) {
        return 0
      }

      const segment = segments[segmentIndex]
      if (!segment || segment.slides.length === 0) {
        return 0
      }

      // Current slide progress within segment
      return ((currentSlideInSegment + 1) / segment.slides.length) * 100
    },
    [segments, currentSegmentIndex, currentSlideInSegment]
  )

  // Don't render if no segments
  if (segments.length === 0) {
    return null
  }

  return (
    <div
      data-testid="chapter-progress-bar"
      className="w-full"
      role="navigation"
      aria-label="Slideshow chapter navigation"
    >
      {/* Progress bar container */}
      <div className="flex items-stretch h-11 md:h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
        {segments.map((segment, index) => {
          const status = getSegmentStatus(index)
          const progressPercent = getProgressPercent(index)
          const isActive = status === 'active'
          const isComplete = status === 'complete'
          const isFuture = status === 'future'
          const displayLabel = truncateLabel(segment.label, MAX_LABEL_LENGTH)
          const hasNesting = segment.depth > 0

          return (
            <button
              key={segment.id}
              type="button"
              onClick={() => handleSegmentClick(index)}
              style={{ width: `${segmentWidths[index]}%` }}
              className={`
                relative flex items-center justify-center
                min-w-0 min-h-[44px]
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset
                ${index > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''}
                ${isActive ? 'bg-primary/10 dark:bg-primary/20' : ''}
                ${isComplete ? 'bg-primary/5 dark:bg-primary/10' : ''}
                ${isFuture ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                hover:bg-primary/15 dark:hover:bg-primary/25
              `}
              aria-label={`${segment.label}, ${segment.slides.length} slides${isActive ? ', current chapter' : ''}`}
              aria-current={isActive ? 'step' : undefined}
            >
              {/* Progress fill */}
              <div
                className={`
                  absolute inset-0
                  transition-all duration-300 ease-out
                  ${isComplete ? 'bg-primary/20 dark:bg-primary/30' : ''}
                  ${isActive ? 'bg-primary/25 dark:bg-primary/35' : ''}
                `}
                style={{
                  width: `${progressPercent}%`,
                }}
                aria-hidden="true"
              />

              {/* Segment content */}
              <div className="relative z-10 flex flex-col items-center justify-center px-2 min-w-0">
                {/* Depth indicator for nested segments */}
                {hasNesting && (
                  <span
                    className="text-[8px] text-gray-400 dark:text-gray-500 leading-none mb-0.5"
                    aria-hidden="true"
                  >
                    {'\u2514'} Follow-up
                  </span>
                )}

                {/* Label */}
                <span
                  className={`
                    text-xs font-medium truncate max-w-full
                    ${isActive ? 'text-primary dark:text-primary-400' : ''}
                    ${isComplete ? 'text-gray-600 dark:text-gray-400' : ''}
                    ${isFuture ? 'text-gray-400 dark:text-gray-500' : ''}
                  `}
                >
                  {displayLabel}
                </span>

                {/* Slide count indicator */}
                <span
                  className={`
                    text-[10px] leading-tight
                    ${isActive ? 'text-primary/70 dark:text-primary-400/70' : ''}
                    ${isComplete ? 'text-gray-400 dark:text-gray-500' : ''}
                    ${isFuture ? 'text-gray-300 dark:text-gray-600' : ''}
                  `}
                >
                  {isActive
                    ? `${currentSlideInSegment + 1}/${segment.slides.length}`
                    : `${segment.slides.length}`}
                </span>
              </div>

              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  aria-hidden="true"
                />
              )}

              {/* Complete checkmark */}
              {isComplete && (
                <div
                  className="absolute top-1 right-1 w-3 h-3 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <svg
                    className="w-3 h-3 text-primary"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Expand button - visible on mobile when more than 2 segments */}
      {segments.length > 2 && onExpand && (
        <button
          type="button"
          onClick={handleExpandClick}
          className="
            mt-2 w-full py-1.5
            text-xs text-gray-500 dark:text-gray-400
            hover:text-primary dark:hover:text-primary-400
            transition-colors
            flex items-center justify-center gap-1
          "
          aria-label="Expand chapter list"
        >
          <span>View all chapters</span>
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

ChapterProgressBar.propTypes = {
  segments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      slides: PropTypes.array.isRequired,
      parentSegmentId: PropTypes.string,
      depth: PropTypes.number,
    })
  ),
  currentSegmentIndex: PropTypes.number,
  currentSlideInSegment: PropTypes.number,
  onSegmentClick: PropTypes.func,
  onExpand: PropTypes.func,
}
