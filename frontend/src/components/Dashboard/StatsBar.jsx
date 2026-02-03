/**
 * StatsBar Component
 *
 * Displays user learning statistics including streak, XP, topics learned, and tree level.
 * Supports animated updates and loading state.
 */

import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

/**
 * Valid tree levels
 */
const VALID_TREE_LEVELS = new Set(['seed', 'sprout', 'sapling', 'young', 'mature', 'magical'])

/**
 * Tree level icons
 */
const TREE_LEVEL_ICONS = {
  seed: '\ud83c\udf31',    // seedling
  sprout: '\ud83c\udf3f',  // herb
  sapling: '\ud83c\udf3f', // herb
  young: '\ud83c\udf33',   // tree
  mature: '\ud83c\udf33',  // tree
  magical: '\u2728',       // sparkles
}

/**
 * Format number with commas or K suffix
 */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0'
  const n = Math.max(0, num)
  if (n >= 100000) {
    return `${Math.floor(n / 1000)}K`
  }
  return n.toLocaleString()
}

/**
 * Skeleton loader for stats
 */
function StatsBarSkeleton() {
  return (
    <div
      data-testid="stats-bar-skeleton"
      className="
        flex items-center justify-around gap-3
        p-3
        bg-slate-100 dark:bg-slate-800
        rounded-xl
        animate-pulse
      "
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          data-testid="stat-skeleton-item"
          className="flex flex-col items-center gap-1"
        >
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="w-10 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="w-8 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      ))}
    </div>
  )
}

/**
 * StatsBar - Statistics display component
 *
 * @param {Object} props
 * @param {number} props.streak - Current learning streak (days)
 * @param {number} props.totalXP - Total XP earned
 * @param {number} props.topicsLearned - Number of topics learned
 * @param {string} props.treeLevel - Current tree level
 * @param {boolean} props.isLoading - Whether stats are loading
 * @param {boolean} props.compact - Whether to use compact display
 */
export default function StatsBar({
  streak = 0,
  totalXP = 0,
  topicsLearned = 0,
  treeLevel = 'seed',
  isLoading = false,
  compact = false,
}) {
  // Track previous values for animation
  const prevStreak = useRef(streak)
  const prevXP = useRef(totalXP)
  const prevLevel = useRef(treeLevel)

  const [streakAnimating, setStreakAnimating] = useState(false)
  const [xpAnimating, setXpAnimating] = useState(false)
  const [levelAnimating, setLevelAnimating] = useState(false)

  // Detect value changes and trigger animations
  useEffect(() => {
    if (streak > prevStreak.current) {
      setStreakAnimating(true)
      setTimeout(() => setStreakAnimating(false), 500)
    }
    prevStreak.current = streak
  }, [streak])

  useEffect(() => {
    if (totalXP > prevXP.current) {
      setXpAnimating(true)
      setTimeout(() => setXpAnimating(false), 500)
    }
    prevXP.current = totalXP
  }, [totalXP])

  useEffect(() => {
    if (treeLevel !== prevLevel.current) {
      setLevelAnimating(true)
      setTimeout(() => setLevelAnimating(false), 500)
    }
    prevLevel.current = treeLevel
  }, [treeLevel])

  // Show skeleton when loading
  if (isLoading) {
    return <StatsBarSkeleton />
  }

  // Normalize values
  const safeStreak = Math.max(0, streak || 0)
  const safeXP = Math.max(0, totalXP || 0)
  const safeTopics = Math.max(0, topicsLearned || 0)
  const safeLevel = VALID_TREE_LEVELS.has(treeLevel) ? treeLevel : 'seed'

  // Determine topic label
  const topicLabel = safeTopics === 1 ? '1 Topic' : `${safeTopics} Topics`

  return (
    <div
      data-testid="stats-bar"
      className={`
        flex items-center justify-around gap-3
        ${compact ? 'p-2 text-sm compact' : 'p-3'}
        bg-slate-100 dark:bg-slate-800
        rounded-xl
      `}
    >
      {/* Streak */}
      <div
        data-testid="stat-streak"
        className={`
          flex flex-col items-center
          px-3 py-2
          rounded-lg
          ${safeStreak > 0 ? 'bg-orange-50 dark:bg-orange-900/30' : 'opacity-50 bg-slate-50 dark:bg-slate-700'}
          ${streakAnimating ? 'animate-pulse' : ''}
        `}
      >
        <span className="text-xl">{'\ud83d\udd25'}</span>
        <span className="font-bold text-slate-800 dark:text-white">{safeStreak}</span>
        {!compact && <span className="text-xs text-slate-500 dark:text-slate-400">Streak</span>}
      </div>

      {/* XP */}
      <div
        data-testid="stat-xp"
        className={`
          flex flex-col items-center
          px-3 py-2
          rounded-lg
          bg-yellow-50 dark:bg-yellow-900/30
          ${xpAnimating ? 'animate-pulse' : ''}
        `}
      >
        <span className="text-xl">{'\u2b50'}</span>
        <span className="font-bold text-slate-800 dark:text-white">{formatNumber(safeXP)}</span>
        {!compact && <span className="text-xs text-slate-500 dark:text-slate-400">XP</span>}
      </div>

      {/* Topics */}
      <div
        data-testid="stat-topics"
        className="
          flex flex-col items-center
          px-3 py-2
          rounded-lg
          bg-emerald-50 dark:bg-emerald-900/30
        "
      >
        <span className="text-xl">{'\ud83c\udf3f'}</span>
        <span className="font-bold text-slate-800 dark:text-white">{safeTopics}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {safeTopics} {safeTopics === 1 ? 'Topic' : 'Topics'}
        </span>
      </div>

      {/* Tree Level */}
      <div
        data-testid="stat-level"
        className={`
          flex flex-col items-center
          px-3 py-2
          rounded-lg
          ${safeLevel === 'magical' ? 'bg-purple-100 dark:bg-purple-900/30 shimmer' : 'bg-sky-50 dark:bg-sky-900/30'}
          ${levelAnimating ? 'animate-pulse' : ''}
        `}
      >
        <span className="text-xl">{TREE_LEVEL_ICONS[safeLevel] || '\ud83c\udf31'}</span>
        <span className="font-bold text-slate-800 dark:text-white capitalize">{safeLevel}</span>
        {!compact && <span className="text-xs text-slate-500 dark:text-slate-400">Level</span>}
      </div>
    </div>
  )
}

StatsBar.propTypes = {
  streak: PropTypes.number,
  totalXP: PropTypes.number,
  topicsLearned: PropTypes.number,
  treeLevel: PropTypes.string,
  isLoading: PropTypes.bool,
  compact: PropTypes.bool,
}
