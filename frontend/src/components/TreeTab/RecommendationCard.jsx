/**
 * RecommendationCard - Displays a topic recommendation for quiz
 *
 * Supports multiple variants:
 * - urgent: Amber background for topics needing review
 * - weak: Orange background for low-scoring topics
 * - default: Neutral background for general browsing
 *
 * Also supports compact mode for grid display.
 */

const VARIANT_STYLES = {
  urgent: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700',
  weak: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700',
  default: 'bg-white border-gray-200 dark:bg-surface-dark dark:border-gray-600',
}

/**
 * @param {Object} props
 * @param {Object} props.piece - World piece data
 * @param {string} props.piece.id - Unique identifier
 * @param {string} props.piece.icon - Emoji icon for the topic
 * @param {string} props.piece.topicName - Display name of the topic
 * @param {string} props.piece.name - Alternative name field
 * @param {number} props.piece.lastReviewScore - Last quiz score percentage
 * @param {string} props.variant - Visual variant ('urgent', 'weak', 'default')
 * @param {boolean} props.compact - Whether to use compact grid layout
 * @param {Function} props.onSelect - Callback when card is selected
 */
export default function RecommendationCard({
  piece,
  variant = 'default',
  compact = false,
  onSelect,
}) {
  const icon = piece.icon || '\u{1F9E9}'
  const name = piece.topicName || piece.name || 'Topic'

  if (compact) {
    return (
      <button
        onClick={onSelect}
        className={`
          p-3 rounded-xl border text-left
          transition-all duration-200
          hover:scale-105 hover:shadow-md
          ${VARIANT_STYLES[variant]}
        `}
      >
        <span className="text-2xl block mb-1">{icon}</span>
        <p className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{name}</p>
      </button>
    )
  }

  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-4 rounded-xl border flex items-center gap-4 text-left
        transition-all duration-200
        hover:scale-[1.02] hover:shadow-md
        ${VARIANT_STYLES[variant]}
      `}
    >
      <span className="text-3xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{name}</p>
        {piece.lastReviewScore !== undefined && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last score: {piece.lastReviewScore}%
          </p>
        )}
      </div>
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
