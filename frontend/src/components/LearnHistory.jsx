/**
 * LearnHistory Component (UI010)
 *
 * Displays recent learning topics in a horizontal scrollable list.
 * Replaces the old TopicSidebar - topics are now accessible from the Learn tab.
 *
 * Features:
 * - Horizontal scrollable list of recent topics
 * - Shows topic name, icon, quiz score (if taken), and date
 * - Tap to review slides for any topic
 * - World piece thumbnail if earned
 *
 * @param {Object} props - Component props
 * @param {Array} props.topics - Array of topic objects with {id, name, icon, createdAt, quizScore, pieceImage}
 * @param {Function} props.onTopicClick - Callback when topic is clicked, receives topic object
 */

/**
 * Format a date relative to now (e.g., "Today", "Yesterday", "3 days ago")
 */
function formatRelativeDate(timestamp) {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Individual history item showing a completed topic
 */
function HistoryItem({ topic, onClick }) {
  const hasQuizScore = typeof topic.quizScore === 'number'
  const hasPiece = !!topic.pieceImage

  return (
    <button
      onClick={() => onClick(topic)}
      className="
        flex-shrink-0 w-32 p-3 rounded-xl
        bg-white dark:bg-slate-800
        border border-gray-200 dark:border-slate-700
        hover:border-primary/50 hover:shadow-md
        active:scale-95
        transition-all duration-200
        flex flex-col items-center gap-2
        text-center
      "
    >
      {/* Topic icon or piece thumbnail */}
      <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
        {hasPiece && topic.pieceImage ? (
          <img
            src={topic.pieceImage}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl" role="img" aria-hidden="true">
            {topic.icon || ''}
          </span>
        )}
      </div>

      {/* Topic name - truncate if too long */}
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">
        {topic.name || 'Untitled'}
      </span>

      {/* Date and quiz score */}
      <div className="flex flex-col items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
        <span>{formatRelativeDate(topic.createdAt || topic.lastAccessedAt)}</span>
        {hasQuizScore && (
          <span className={`font-medium ${topic.quizScore >= 60 ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>
            Quiz: {topic.quizScore}%
          </span>
        )}
      </div>
    </button>
  )
}

/**
 * LearnHistory - Recent topics section for the Learn tab
 */
function LearnHistory({ topics, onTopicClick }) {
  // Don't render if no topics
  if (!topics || topics.length === 0) {
    return null
  }

  // Sort topics by most recently accessed/created
  const sortedTopics = [...topics].sort((a, b) => {
    const dateA = a.lastAccessedAt || a.createdAt || 0
    const dateB = b.lastAccessedAt || b.createdAt || 0
    return dateB - dateA
  })

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 px-1">
        Recent Topics
      </h3>

      {/* Horizontal scrollable list */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {sortedTopics.map((topic) => (
          <HistoryItem
            key={topic.id}
            topic={topic}
            onClick={onTopicClick}
          />
        ))}
      </div>

      {/* Scroll hint gradient (visual only) */}
      {sortedTopics.length > 3 && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent" />
      )}
    </div>
  )
}

export default LearnHistory
