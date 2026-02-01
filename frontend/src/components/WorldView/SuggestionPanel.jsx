/**
 * SuggestionPanel Component
 *
 * Sliding panel that displays topic suggestions triggered from WorldFAB.
 * Shows personalized learning recommendations based on:
 * - world_gap: Gaps in the user's knowledge map
 * - knowledge_bridge: Topics that connect existing knowledge
 * - trending: Popular topics among learners
 * - suggested: General suggestions
 *
 * @module components/WorldView/SuggestionPanel
 */

import { useState, useCallback, useEffect } from 'react'
import PropTypes from 'prop-types'

/**
 * Suggestion type configuration
 * Maps type to display label and styling
 */
const TYPE_CONFIG = {
  world_gap: {
    label: 'Fill Gap',
    bg: 'bg-red-100 dark:bg-red-900/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  knowledge_bridge: {
    label: 'Bridge',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  trending: {
    label: 'Trending',
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  suggested: {
    label: 'Suggested',
    bg: 'bg-slate-100 dark:bg-slate-700/40',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-600',
  },
}

/**
 * Zone styling configuration
 * Maps zone to icon and colors
 */
const ZONE_CONFIG = {
  nature: {
    icon: '🌿',
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-700',
    dot: 'bg-green-500',
  },
  civilization: {
    icon: '🏛️',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-700',
    dot: 'bg-amber-500',
  },
  arcane: {
    icon: '✨',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-700',
    dot: 'bg-purple-500',
  },
}

const DEFAULT_ZONE_CONFIG = ZONE_CONFIG.nature

/**
 * Loading skeleton for suggestion cards
 */
function SuggestionSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="
            p-4 rounded-xl
            bg-slate-100 dark:bg-slate-700/50
            border border-slate-200 dark:border-slate-600
          "
        >
          <div className="flex items-start gap-3">
            <div className="w-16 h-5 bg-slate-200 dark:bg-slate-600 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-600 rounded" />
              <div className="w-full h-4 bg-slate-200 dark:bg-slate-600 rounded" />
              <div className="w-1/4 h-4 bg-slate-200 dark:bg-slate-600 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Empty state when no suggestions available
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div
        className="
          w-16 h-16 mb-4
          rounded-full
          bg-slate-100 dark:bg-slate-700
          flex items-center justify-center
        "
      >
        <span className="text-3xl" role="img" aria-label="compass">
          🧭
        </span>
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
        No suggestions yet
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
        Keep learning to unlock personalized topic recommendations based on your world.
      </p>
    </div>
  )
}

/**
 * Individual suggestion card component
 */
function SuggestionCard({ suggestion, onSelect }) {
  const typeConfig = TYPE_CONFIG[suggestion.type] || TYPE_CONFIG.suggested
  const zoneConfig = ZONE_CONFIG[suggestion.zone] || DEFAULT_ZONE_CONFIG

  const handleClick = useCallback(() => {
    onSelect?.(suggestion.topic)
  }, [onSelect, suggestion.topic])

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.(suggestion.topic)
    }
  }, [onSelect, suggestion.topic])

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        w-full p-4 rounded-xl
        ${zoneConfig.bg}
        border ${zoneConfig.border}
        text-left
        hover:shadow-md
        hover:scale-[1.01]
        active:scale-[0.99]
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2
      `}
      aria-label={`Learn about ${suggestion.topic}`}
    >
      {/* Type badge and zone indicator row */}
      <div className="flex items-center justify-between mb-2">
        {/* Type badge */}
        <span
          className={`
            inline-flex items-center
            px-2.5 py-0.5
            rounded-full
            text-xs font-medium
            ${typeConfig.bg}
            ${typeConfig.text}
            border ${typeConfig.border}
          `}
        >
          {typeConfig.label}
        </span>

        {/* Zone indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${zoneConfig.dot}`}
            aria-hidden="true"
          />
          <span className={`text-xs font-medium ${zoneConfig.text} capitalize`}>
            {suggestion.zone}
          </span>
        </div>
      </div>

      {/* Topic name */}
      <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
        {suggestion.topic}
      </h4>

      {/* Reason text */}
      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
        {suggestion.reason}
      </p>
    </button>
  )
}

SuggestionCard.propTypes = {
  suggestion: PropTypes.shape({
    type: PropTypes.oneOf(['world_gap', 'knowledge_bridge', 'trending', 'suggested']),
    topic: PropTypes.string.isRequired,
    reason: PropTypes.string.isRequired,
    zone: PropTypes.oneOf(['nature', 'civilization', 'arcane']).isRequired,
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
}

/**
 * SuggestionPanel - Sliding panel for topic suggestions
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the panel is visible
 * @param {Function} props.onClose - Callback when panel is closed
 * @param {Array} props.suggestions - Array of suggestion objects
 * @param {boolean} [props.isLoading=false] - Whether suggestions are loading
 * @param {Function} props.onSelectTopic - Callback when a topic is selected
 */
function SuggestionPanel({
  isOpen,
  onClose,
  suggestions = [],
  isLoading = false,
  onSelectTopic,
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Handle open/close transitions
  useEffect(() => {
    if (isOpen) {
      // Small delay to trigger animation
      const timer = setTimeout(() => setIsVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
      setIsExiting(false)
    }
  }, [isOpen])

  /**
   * Handle close with exit animation
   */
  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      setIsExiting(false)
      onClose?.()
    }, 200)
  }, [onClose])

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = useCallback((event) => {
    if (event.target === event.currentTarget) {
      handleClose()
    }
  }, [handleClose])

  /**
   * Handle escape key
   */
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  /**
   * Handle topic selection
   */
  const handleSelectTopic = useCallback((topic) => {
    handleClose()
    // Delay callback to allow close animation
    setTimeout(() => {
      onSelectTopic?.(topic)
    }, 200)
  }, [handleClose, onSelectTopic])

  // Don't render if not open and not exiting
  if (!isOpen && !isExiting) {
    return null
  }

  return (
    <div
      className={`
        fixed inset-0 z-50
        transition-opacity duration-200
        ${isExiting ? 'opacity-0' : isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggestion-panel-title"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`
          absolute bottom-0 left-0 right-0
          bg-white dark:bg-slate-800
          rounded-t-2xl
          shadow-2xl
          max-h-[70vh]
          overflow-hidden
          transition-transform duration-200 ease-out
          ${isExiting ? 'translate-y-full' : isVisible ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-3">
          <div
            className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"
            aria-hidden="true"
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2
            id="suggestion-panel-title"
            className="text-lg font-bold text-slate-800 dark:text-slate-100"
          >
            What to Learn Next
          </h2>
          <button
            onClick={handleClose}
            className="
              w-8 h-8 rounded-full
              bg-slate-100 dark:bg-slate-700
              hover:bg-slate-200 dark:hover:bg-slate-600
              flex items-center justify-center
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-slate-400
            "
            aria-label="Close suggestions"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-slate-600 dark:text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-8 overflow-y-auto max-h-[calc(70vh-80px)]">
          {isLoading ? (
            <SuggestionSkeleton />
          ) : suggestions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <SuggestionCard
                  key={`${suggestion.topic}-${index}`}
                  suggestion={suggestion}
                  onSelect={handleSelectTopic}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

SuggestionPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  suggestions: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.oneOf(['world_gap', 'knowledge_bridge', 'trending', 'suggested']),
      topic: PropTypes.string.isRequired,
      reason: PropTypes.string.isRequired,
      zone: PropTypes.oneOf(['nature', 'civilization', 'arcane']).isRequired,
    })
  ),
  isLoading: PropTypes.bool,
  onSelectTopic: PropTypes.func.isRequired,
}

export default SuggestionPanel
