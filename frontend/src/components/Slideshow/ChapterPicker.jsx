/**
 * ChapterPicker Component
 *
 * Expandable panel showing all chapters with slide counts.
 * Appears when user taps the progress bar expand button.
 * Shows as bottom sheet on mobile, dropdown on desktop.
 */

import { useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { truncateLabel } from './chapterUtils'

/**
 * Depth indentation in pixels
 */
const DEPTH_INDENT_PX = 16

/**
 * Maximum label length in picker
 */
const MAX_PICKER_LABEL_LENGTH = 40

/**
 * ChapterPicker - Expandable chapter list for quick navigation
 *
 * @param {Object} props
 * @param {Array} props.segments - All SlideSegment objects
 * @param {number} props.currentSegmentIndex - Currently active segment
 * @param {boolean} props.isOpen - Whether picker is expanded
 * @param {Function} props.onClose - Close the picker
 * @param {Function} props.onSelectSegment - Select a segment (segmentIndex)
 */
export default function ChapterPicker({
  segments = [],
  currentSegmentIndex = 0,
  isOpen = false,
  onClose,
  onSelectSegment,
}) {
  const panelRef = useRef(null)
  const firstButtonRef = useRef(null)

  /**
   * Handle segment selection
   */
  const handleSelect = useCallback(
    (index) => {
      if (onSelectSegment) {
        onSelectSegment(index)
      }
      if (onClose) {
        onClose()
      }
    },
    [onSelectSegment, onClose]
  )

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = useCallback(() => {
    if (onClose) {
      onClose()
    }
  }, [onClose])

  /**
   * Handle escape key
   */
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  /**
   * Focus management - focus first button when opened
   */
  useEffect(() => {
    if (isOpen && firstButtonRef.current) {
      firstButtonRef.current.focus()
    }
  }, [isOpen])

  /**
   * Trap focus within panel when open
   */
  useEffect(() => {
    if (!isOpen || !panelRef.current) return

    const panel = panelRef.current
    const focusableElements = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (event) => {
      if (event.key !== 'Tab') return

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    panel.addEventListener('keydown', handleTabKey)
    return () => panel.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  // Don't render if closed or no segments
  if (!isOpen || segments.length === 0) {
    return null
  }

  return (
    <div
      data-testid="chapter-picker"
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Chapter picker"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={handleBackdropClick}
        className="
          absolute inset-0
          bg-black/30 dark:bg-black/50
          transition-opacity duration-200
        "
        aria-label="Close chapter picker"
      />

      {/* Panel - bottom sheet on mobile, centered dropdown on desktop */}
      <div
        ref={panelRef}
        className="
          absolute
          bottom-0 left-0 right-0
          md:bottom-auto md:top-1/2 md:left-1/2
          md:-translate-x-1/2 md:-translate-y-1/2
          md:max-w-md md:w-full md:mx-4
          bg-white dark:bg-gray-900
          rounded-t-2xl md:rounded-2xl
          shadow-xl
          max-h-[70vh]
          flex flex-col
          transform transition-transform duration-200 ease-out
          animate-fade-in
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">
            Chapters
          </h2>
          <button
            type="button"
            onClick={handleBackdropClick}
            className="
              p-2 -mr-2
              text-gray-500 dark:text-gray-400
              hover:text-gray-700 dark:hover:text-gray-200
              transition-colors
            "
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Chapter list */}
        <div className="flex-1 overflow-y-auto py-2">
          {segments.map((segment, index) => {
            const isActive = index === currentSegmentIndex
            const isComplete = index < currentSegmentIndex
            const depth = segment.depth || 0
            const displayLabel = truncateLabel(segment.label, MAX_PICKER_LABEL_LENGTH)

            return (
              <button
                key={segment.id}
                ref={index === 0 ? firstButtonRef : null}
                type="button"
                onClick={() => handleSelect(index)}
                className={`
                  w-full flex items-center gap-3
                  px-4 py-3
                  text-left
                  transition-colors
                  min-h-[48px]
                  ${isActive
                    ? 'bg-primary/10 dark:bg-primary/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
                style={{ paddingLeft: `${16 + depth * DEPTH_INDENT_PX}px` }}
                aria-current={isActive ? 'true' : undefined}
              >
                {/* Status indicator */}
                <div
                  className={`
                    flex-shrink-0 w-6 h-6 rounded-full
                    flex items-center justify-center
                    ${isActive
                      ? 'bg-primary text-white'
                      : isComplete
                        ? 'bg-primary/20 dark:bg-primary/30 text-primary'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }
                  `}
                >
                  {isComplete ? (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : isActive ? (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>

                {/* Label and slide count */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`
                      text-sm font-medium truncate
                      ${isActive
                        ? 'text-primary dark:text-primary-400'
                        : 'text-gray-800 dark:text-gray-200'
                      }
                    `}
                  >
                    {displayLabel}
                  </div>
                  <div
                    className={`
                      text-xs
                      ${isActive
                        ? 'text-primary/70 dark:text-primary-400/70'
                        : 'text-gray-500 dark:text-gray-400'
                      }
                    `}
                  >
                    {segment.slides.length} slide{segment.slides.length !== 1 ? 's' : ''}
                    {depth > 0 && (
                      <span className="ml-2 text-gray-400 dark:text-gray-500">
                        {'\u2022'} Follow-up
                      </span>
                    )}
                  </div>
                </div>

                {/* Active arrow */}
                {isActive && (
                  <svg
                    className="w-4 h-4 text-primary flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer with summary */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl md:rounded-b-2xl">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {segments.length} chapter{segments.length !== 1 ? 's' : ''}
            </span>
            <span>
              {segments.reduce((sum, s) => sum + s.slides.length, 0)} total slides
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

ChapterPicker.propTypes = {
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
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onSelectSegment: PropTypes.func,
}
