/**
 * WorldInfoPanel Component
 *
 * Displays world tier, topic count, and recent topics in a compact overlay.
 * Part of the Living World feature, positioned over the panorama viewer.
 *
 * Features:
 * - Tier display with visual indicator
 * - Total topics count
 * - Recent topics list (max 3)
 * - Optional view history callback
 */

/**
 * Tier icons for visual representation
 */
const TIER_ICONS = {
  barren: '🏜️',
  sprouting: '🌱',
  growing: '🌿',
  thriving: '🌳',
  legendary: '🌟',
}

/**
 * Tier labels for display
 */
const TIER_LABELS = {
  barren: 'Barren',
  sprouting: 'Sprouting',
  growing: 'Growing',
  thriving: 'Thriving',
  legendary: 'Legendary',
}

/**
 * Maximum number of recent topics to display
 */
const MAX_RECENT_TOPICS = 3

/**
 * WorldInfoPanel - Displays world statistics and recent activity
 *
 * @param {Object} props - Component props
 * @param {string} [props.tier] - Current world tier (barren, sprouting, growing, thriving, legendary)
 * @param {number} [props.totalTopics=0] - Total number of topics learned
 * @param {Array<string>} [props.recentTopics=[]] - List of recently learned topic names
 * @param {Function} [props.onViewHistory] - Optional callback to view full history
 */
function WorldInfoPanel({
  tier,
  totalTopics = 0,
  recentTopics = [],
  onViewHistory,
}) {
  // Get tier display values with fallback
  const tierIcon = TIER_ICONS[tier] || TIER_ICONS.barren
  const tierLabel = TIER_LABELS[tier] || tier || 'Unknown'

  // Limit recent topics to maximum display count
  const displayedTopics = recentTopics.slice(0, MAX_RECENT_TOPICS)

  // Pluralize topics label
  const topicsLabel = totalTopics === 1 ? 'topic' : 'topics'

  return (
    <aside
      data-testid="world-info-panel"
      className="
        bg-white/90 dark:bg-slate-800/90
        backdrop-blur-sm
        rounded-lg
        shadow-lg
        p-3
        min-w-[160px]
        border border-slate-200 dark:border-slate-700
      "
    >
      {/* Tier Section */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl" role="img" aria-label={`${tierLabel} tier`}>
          {tierIcon}
        </span>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize">
          {tierLabel}
        </span>
      </div>

      {/* Topics Count */}
      <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
        <span className="font-medium text-slate-800 dark:text-slate-100">
          {totalTopics} {topicsLabel}
        </span>
        {' '}learned
      </div>

      {/* Recent Topics */}
      {displayedTopics.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Recent
          </div>
          <ul className="space-y-0.5">
            {displayedTopics.map((topic, index) => (
              <li
                key={`${topic}-${index}`}
                className="text-xs text-slate-700 dark:text-slate-300 truncate"
              >
                {topic}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* View History Button */}
      {onViewHistory && (
        <button
          onClick={onViewHistory}
          className="
            mt-2 w-full
            text-xs text-indigo-600 dark:text-indigo-400
            hover:text-indigo-700 dark:hover:text-indigo-300
            font-medium
            transition-colors duration-200
            focus:outline-none focus:underline
          "
          aria-label="View all history"
        >
          View All
        </button>
      )}
    </aside>
  )
}

export default WorldInfoPanel
