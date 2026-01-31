/**
 * PieceInfoCard Component
 * WB021: Modal overlay card shown when user taps a world piece
 *
 * Displays piece information and provides actions:
 * - Review slides: Navigate to slideshow for the piece's topic
 * - Quiz: Start a review quiz for the piece's topic
 *
 * Features:
 * - Centered modal overlay with backdrop
 * - Piece icon/image display
 * - Time since last review calculation
 * - Evolution tier progress indicator
 * - Two action buttons: Review and Quiz
 * - Close via button or backdrop tap
 */

import { useCallback, useMemo, useEffect, useState } from 'react'

/**
 * Evolution tier configuration for display
 * Maps tier names to display info and thresholds
 */
const EVOLUTION_TIERS = {
  seedling: { label: 'Seedling', icon: '🌱', threshold: 1, color: 'bg-green-500' },
  growing: { label: 'Growing', icon: '🌿', threshold: 3, color: 'bg-emerald-500' },
  flourishing: { label: 'Flourishing', icon: '🌸', threshold: 5, color: 'bg-pink-500' },
  legendary: { label: 'Legendary', icon: '✨', threshold: 10, color: 'bg-amber-500' },
}

/**
 * Zone styling configuration
 */
const ZONE_STYLES = {
  nature: {
    bgGradient: 'from-green-50 to-emerald-100',
    borderColor: 'border-green-400',
    accentColor: 'text-green-600',
  },
  civilization: {
    bgGradient: 'from-indigo-50 to-violet-100',
    borderColor: 'border-indigo-400',
    accentColor: 'text-indigo-600',
  },
  arcane: {
    bgGradient: 'from-purple-50 to-fuchsia-100',
    borderColor: 'border-purple-400',
    accentColor: 'text-purple-600',
  },
}

const DEFAULT_ZONE_STYLE = {
  bgGradient: 'from-slate-50 to-gray-100',
  borderColor: 'border-slate-400',
  accentColor: 'text-slate-600',
}

/**
 * Calculate relative time string from a date
 *
 * @param {string|Date} date - The date to calculate from
 * @returns {string} - Human-readable relative time (e.g., "3 days ago")
 */
function getRelativeTime(date) {
  if (!date) return 'Never'

  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMs = now - then
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return '1 month ago'
  return `${Math.floor(diffDays / 30)} months ago`
}

/**
 * Get the next evolution tier and progress toward it
 *
 * @param {string} currentTier - Current evolution tier
 * @param {number} relatedCount - Number of related topics learned
 * @returns {Object} - { currentLabel, nextThreshold, progress, isMaxTier }
 */
function getEvolutionProgress(currentTier, relatedCount = 1) {
  const tierOrder = ['seedling', 'growing', 'flourishing', 'legendary']
  const currentIndex = tierOrder.indexOf(currentTier || 'seedling')
  const current = EVOLUTION_TIERS[currentTier] || EVOLUTION_TIERS.seedling

  // Check if at max tier
  if (currentTier === 'legendary') {
    return {
      currentLabel: current.label,
      currentIcon: current.icon,
      nextThreshold: current.threshold,
      progress: relatedCount,
      isMaxTier: true,
    }
  }

  // Get next tier threshold
  const nextTier = tierOrder[currentIndex + 1]
  const next = EVOLUTION_TIERS[nextTier] || EVOLUTION_TIERS.growing

  return {
    currentLabel: current.label,
    currentIcon: current.icon,
    nextThreshold: next.threshold,
    progress: relatedCount,
    isMaxTier: false,
  }
}

/**
 * PieceInfoCard - Modal card displaying piece details and actions
 *
 * @param {Object} props - Component props
 * @param {Object} props.piece - The piece data
 * @param {string} props.piece.id - Unique piece identifier
 * @param {string} props.piece.name - Display name for the piece
 * @param {string} [props.piece.icon] - Emoji icon for the piece
 * @param {string} [props.piece.zone] - Zone type (nature, civilization, arcane)
 * @param {string} [props.piece.evolutionTier] - Evolution tier (seedling, growing, flourishing, legendary)
 * @param {number} [props.piece.relatedTopics] - Number of related topics learned
 * @param {string} [props.piece.lastReviewedAt] - ISO date of last review
 * @param {string} [props.piece.unlockedAt] - ISO date when piece was unlocked
 * @param {Function} props.onClose - Callback when card is closed
 * @param {Function} props.onReviewSlides - Callback when Review button is clicked
 * @param {Function} props.onStartQuiz - Callback when Quiz button is clicked
 */
function PieceInfoCard({
  piece,
  onClose,
  onReviewSlides,
  onStartQuiz,
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Get zone styling
  const zoneStyle = ZONE_STYLES[piece?.zone] || DEFAULT_ZONE_STYLE

  // Calculate review date string
  const reviewDate = piece?.lastReviewedAt || piece?.unlockedAt
  const reviewTimeString = useMemo(() => getRelativeTime(reviewDate), [reviewDate])

  // Calculate evolution progress
  const evolution = useMemo(() =>
    getEvolutionProgress(piece?.evolutionTier || piece?.tier, piece?.relatedTopics || piece?.relatedCount || 1),
    [piece?.evolutionTier, piece?.tier, piece?.relatedTopics, piece?.relatedCount]
  )

  /**
   * Handle close with exit animation
   */
  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onClose?.()
    }, 200)
  }, [onClose])

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = useCallback((e) => {
    // Only close if clicking directly on backdrop
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }, [handleClose])

  /**
   * Handle Review button click
   */
  const handleReview = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onReviewSlides?.(piece)
    }, 200)
  }, [piece, onReviewSlides])

  /**
   * Handle Quiz button click
   */
  const handleQuiz = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onStartQuiz?.(piece)
    }, 200)
  }, [piece, onStartQuiz])

  /**
   * Handle keyboard escape
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  // Guard: no piece provided
  if (!piece) {
    return null
  }

  return (
    <div
      className={`
        fixed inset-0 z-50
        flex items-center justify-center
        transition-opacity duration-200
        ${isExiting ? 'opacity-0' : isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      role="dialog"
      aria-modal="true"
      aria-labelledby="piece-info-title"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className={`
          relative z-10
          w-[90%] max-w-sm
          bg-white dark:bg-slate-800
          rounded-2xl
          shadow-2xl
          overflow-hidden
          transition-transform duration-200
          ${isExiting ? 'scale-95' : isVisible ? 'scale-100' : 'scale-95'}
        `}
      >
        {/* Header with gradient background */}
        <div
          className={`
            relative px-6 pt-6 pb-4
            bg-gradient-to-br ${zoneStyle.bgGradient}
            border-b ${zoneStyle.borderColor}
          `}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="
              absolute top-3 right-3
              w-8 h-8 rounded-full
              bg-white/60 hover:bg-white/80
              flex items-center justify-center
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-slate-400
            "
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Piece icon */}
          <div className="flex flex-col items-center">
            <div
              className={`
                w-20 h-20 mb-3
                rounded-2xl
                bg-white/80
                border-2 ${zoneStyle.borderColor}
                flex items-center justify-center
                shadow-lg
              `}
            >
              <span className="text-4xl select-none">
                {piece.icon || '🌍'}
              </span>
            </div>

            {/* Piece name */}
            <h2
              id="piece-info-title"
              className="text-xl font-bold text-slate-800 dark:text-white text-center"
            >
              {piece.name}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Last reviewed */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {piece.lastReviewedAt ? 'Last reviewed' : 'Unlocked'}
            </span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {reviewTimeString}
            </span>
          </div>

          {/* Evolution progress */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Evolution
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm">{evolution.currentIcon}</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {evolution.currentLabel}
                {!evolution.isMaxTier && (
                  <span className="text-slate-400 dark:text-slate-500 ml-1">
                    ({evolution.progress}/{evolution.nextThreshold})
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Progress bar for evolution */}
          {!evolution.isMaxTier && (
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${EVOLUTION_TIERS[piece?.evolutionTier || piece?.tier || 'seedling']?.color || 'bg-green-500'} transition-all duration-300`}
                style={{ width: `${Math.min(100, (evolution.progress / evolution.nextThreshold) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 flex gap-3">
          {/* Review button */}
          <button
            onClick={handleReview}
            className="
              flex-1 py-3 px-4
              bg-primary text-white font-semibold
              rounded-xl
              hover:bg-primary/90 hover:scale-[1.02]
              active:scale-98
              transition-all duration-200
              flex items-center justify-center gap-2
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Review
          </button>

          {/* Quiz button */}
          <button
            onClick={handleQuiz}
            className="
              flex-1 py-3 px-4
              bg-amber-500 text-white font-semibold
              rounded-xl
              hover:bg-amber-400 hover:scale-[1.02]
              active:scale-98
              transition-all duration-200
              flex items-center justify-center gap-2
              focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Quiz
          </button>
        </div>
      </div>
    </div>
  )
}

export default PieceInfoCard
