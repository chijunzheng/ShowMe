/**
 * StrengthSection Component
 * Shows topics that need review based on spaced repetition
 *
 * Layout:
 * +-----------------------------+
 * | Strengthen                  |
 * | 3 topics need a refresh     |
 * | [icon] [icon] [icon] ...    |
 * | [Start Review]              |
 * +-----------------------------+
 *
 * Features:
 * - Only renders when there are pieces needing review
 * - Shows count and first 5 piece icons
 * - Animated entrance
 * - Styled to match HomeStats component
 *
 * T001: Display when piecesNeedingReview.length > 0
 * T002: Show count of topics needing review
 * T003: Display first 5 piece icons
 * T004: Start Review button triggers onStartReview
 */

import { useMemo } from 'react'

/**
 * Get display icon for a piece
 * Uses the piece's icon if available, otherwise falls back to category-based icon
 *
 * @param {Object} piece - World piece object
 * @returns {string} Emoji icon to display
 */
function getPieceIcon(piece) {
  // Use piece icon if available
  if (piece.icon) return piece.icon

  // Fallback based on zone/category
  const zone = piece.zone || piece.category || 'nature'
  const fallbacks = {
    nature: '🌿',
    civilization: '🏛️',
    arcane: '✨',
  }

  return fallbacks[zone] || '🧩'
}

/**
 * Format days since last review for display
 *
 * @param {Object} piece - World piece object
 * @returns {string} Human-readable time description
 */
function getTimeSinceReview(piece) {
  const reviewDate = piece.lastReviewedAt || piece.unlockedAt
  if (!reviewDate) return 'a while ago'

  const days = Math.floor((Date.now() - new Date(reviewDate).getTime()) / (1000 * 60 * 60 * 24))

  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return '1+ month ago'
}

/**
 * StrengthSection - Displays topics needing review with action button
 *
 * @param {Object} props
 * @param {Array} props.piecesNeedingReview - Array of pieces that need review
 * @param {Function} props.onStartReview - Callback when user starts review
 * @param {boolean} props.disabled - Disable the button (e.g., during loading)
 */
export default function StrengthSection({
  piecesNeedingReview = [],
  onStartReview,
  disabled = false,
}) {
  // Don't render if no pieces need review
  if (!piecesNeedingReview || piecesNeedingReview.length === 0) {
    return null
  }

  // Get first 5 pieces for icon display
  const displayPieces = useMemo(() => {
    return piecesNeedingReview.slice(0, 5)
  }, [piecesNeedingReview])

  // Check if there are more pieces than displayed
  const hasMore = piecesNeedingReview.length > 5
  const moreCount = piecesNeedingReview.length - 5

  // Determine message text based on count
  const countText = piecesNeedingReview.length === 1
    ? '1 topic needs a refresh'
    : `${piecesNeedingReview.length} topics need a refresh`

  return (
    <div
      className={`
        w-full max-w-md mx-auto
        bg-gradient-to-br from-amber-50 to-orange-50
        dark:from-amber-900/20 dark:to-orange-900/20
        backdrop-blur-sm
        rounded-2xl
        shadow-lg border border-amber-200 dark:border-amber-800/50
        p-4
        animate-fade-in
      `}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        {/* Strength icon */}
        <span className="text-2xl" role="img" aria-label="Strengthen">
          💪
        </span>

        {/* Title */}
        <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
          Strengthen
        </h3>
      </div>

      {/* Count message */}
      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
        {countText}
      </p>

      {/* Piece icons row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {displayPieces.map((piece, index) => (
          <div
            key={piece.id || index}
            className={`
              flex items-center justify-center
              w-10 h-10 rounded-xl
              bg-white/70 dark:bg-slate-800/70
              border border-amber-200 dark:border-amber-700
              shadow-sm
              transition-all duration-200
              hover:scale-110 hover:shadow-md
              animate-fade-in
            `}
            style={{ animationDelay: `${index * 50}ms` }}
            title={piece.name || piece.topicName || 'Topic'}
          >
            <span className="text-xl">
              {getPieceIcon(piece)}
            </span>
          </div>
        ))}

        {/* More indicator */}
        {hasMore && (
          <div
            className={`
              flex items-center justify-center
              w-10 h-10 rounded-xl
              bg-amber-100 dark:bg-amber-900/40
              border border-amber-300 dark:border-amber-700
              text-xs font-medium text-amber-700 dark:text-amber-300
            `}
          >
            +{moreCount}
          </div>
        )}
      </div>

      {/* Start Review button */}
      <button
        onClick={onStartReview}
        disabled={disabled}
        className={`
          w-full py-3 px-4 rounded-xl
          font-medium text-base
          transition-all duration-200
          ${disabled
            ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            : `
              bg-gradient-to-r from-amber-500 to-orange-500
              text-white
              shadow-md hover:shadow-lg
              hover:from-amber-600 hover:to-orange-600
              active:scale-[0.98]
            `
          }
        `}
      >
        {disabled ? 'Loading...' : 'Start Review'}
      </button>

      {/* Optional hint text */}
      <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mt-2 text-center">
        Quick 3-question quiz to reinforce your learning
      </p>
    </div>
  )
}
