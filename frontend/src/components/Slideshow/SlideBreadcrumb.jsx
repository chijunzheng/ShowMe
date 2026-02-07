/**
 * SlideBreadcrumb Component
 *
 * Shows current position in topic hierarchy.
 * Format: "Topic > Follow-up > Nested"
 * Each crumb is clickable to jump to that segment.
 */

import { useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import { buildBreadcrumbPath, truncateLabel } from './chapterUtils'

/**
 * Maximum label length for breadcrumb items
 */
const MAX_CRUMB_LENGTH = 24

/**
 * Separator between breadcrumb items
 */
const SEPARATOR = '\u203A' // Single right-pointing angle quotation mark

/**
 * SlideBreadcrumb - Topic hierarchy path indicator
 *
 * @param {Object} props
 * @param {Array} props.segments - All SlideSegment objects
 * @param {number} props.currentSegmentIndex - Currently active segment
 * @param {Function} props.onSegmentClick - Navigate to a segment (segmentIndex)
 */
export default function SlideBreadcrumb({
  segments = [],
  currentSegmentIndex = 0,
  onSegmentClick,
}) {
  // Build breadcrumb path from root to current segment
  const breadcrumbs = useMemo(() => {
    return buildBreadcrumbPath(segments, currentSegmentIndex)
  }, [segments, currentSegmentIndex])

  /**
   * Handle breadcrumb click
   */
  const handleCrumbClick = useCallback(
    (segmentIndex) => {
      if (onSegmentClick) {
        onSegmentClick(segmentIndex)
      }
    },
    [onSegmentClick]
  )

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (event, segmentIndex) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleCrumbClick(segmentIndex)
      }
    },
    [handleCrumbClick]
  )

  // Don't render if no segments or breadcrumbs
  if (segments.length === 0 || breadcrumbs.length === 0) {
    return null
  }

  // Don't render if only one item (already at root)
  if (breadcrumbs.length === 1) {
    return null
  }

  return (
    <nav
      data-testid="slide-breadcrumb"
      className="flex items-center flex-wrap gap-1"
      aria-label="Chapter breadcrumb"
    >
      <ol className="flex items-center flex-wrap gap-1 list-none m-0 p-0">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1
          const isCurrent = crumb.segmentIndex === currentSegmentIndex
          const displayLabel = truncateLabel(crumb.label, MAX_CRUMB_LENGTH)

          return (
            <li key={`${crumb.segmentIndex}-${index}`} className="flex items-center">
              {/* Separator (not before first item) */}
              {index > 0 && (
                <span
                  className="mx-1.5 text-gray-300 dark:text-gray-600 select-none"
                  aria-hidden="true"
                >
                  {SEPARATOR}
                </span>
              )}

              {/* Breadcrumb item */}
              {isLast || isCurrent ? (
                // Current/last item - not clickable
                <span
                  className={`
                    text-sm font-medium
                    ${isCurrent
                      ? 'text-primary dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-300'
                    }
                  `}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {displayLabel}
                </span>
              ) : (
                // Previous items - clickable
                <button
                  type="button"
                  onClick={() => handleCrumbClick(crumb.segmentIndex)}
                  onKeyDown={(e) => handleKeyDown(e, crumb.segmentIndex)}
                  className="
                    text-sm text-gray-500 dark:text-gray-400
                    hover:text-primary dark:hover:text-primary-400
                    hover:underline
                    transition-colors
                    focus:outline-none focus:ring-2 focus:ring-primary/50 focus:rounded
                  "
                  aria-label={`Go to ${crumb.label}`}
                >
                  {displayLabel}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

SlideBreadcrumb.propTypes = {
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
  onSegmentClick: PropTypes.func,
}
