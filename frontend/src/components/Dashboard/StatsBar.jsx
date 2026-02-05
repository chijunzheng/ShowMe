/**
 * StatsBar Component
 *
 * Displays user learning statistics including streak, XP, topics learned, and explorer rank.
 * Supports animated updates and loading state.
 */

import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

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
 * @param {number} props.trophyCount - Number of trophies earned
 * @param {string} props.rankIcon - Optional rank icon to replace default XP star
 * @param {boolean} props.isLoading - Whether stats are loading
 * @param {boolean} props.compact - Whether to use compact display
 */
export default function StatsBar({
  streak = 0,
  totalXP = 0,
  topicsLearned = 0,
  trophyCount = 0,
  rankIcon,
  isLoading = false,
  compact = false,
  onStatTap,
}) {

  // Track previous values for animation
  const prevStreak = useRef(streak)
  const prevXP = useRef(totalXP)

  const [streakAnimating, setStreakAnimating] = useState(false)
  const [xpAnimating, setXpAnimating] = useState(false)

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

  // Show skeleton when loading
  if (isLoading) {
    return <StatsBarSkeleton />
  }

  // Normalize values
  const safeStreak = Math.max(0, streak || 0)
  const safeXP = Math.max(0, totalXP || 0)
  const safeTopics = Math.max(0, topicsLearned || 0)
  const safeTrophyCount = Math.max(0, trophyCount || 0)

  return (
    <div
      data-testid="stats-bar"
      className={`
        flex items-center justify-around gap-3
        ${compact ? 'p-2 text-sm compact' : 'p-3'}
        ${compact
          ? 'border-2 border-black dark:border-slate-600 shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#475569]'
          : 'bg-slate-100 dark:bg-slate-800'
        }
        bg-white dark:bg-slate-800
        rounded-xl
      `}
    >
      {/* Streak */}
      <button
        type="button"
        data-testid="stat-streak"
        onClick={() => onStatTap?.('streak')}
        className={`
          flex flex-col items-center
          px-3 py-2
          rounded-lg
          cursor-pointer hover:scale-105 active:scale-95 transition-transform
          ${safeStreak > 0 ? 'bg-orange-50 dark:bg-orange-900/30' : 'opacity-50 bg-slate-50 dark:bg-slate-700'}
          ${streakAnimating ? 'animate-pulse' : ''}
        `}
      >
        <span className="text-xl">{'\ud83d\udd25'}</span>
        <span className="font-bold text-slate-800 dark:text-white">{safeStreak}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">Streak</span>
      </button>

      {/* XP */}
      <button
        type="button"
        data-testid="stat-xp"
        onClick={() => onStatTap?.('xp')}
        className={`
          flex flex-col items-center
          px-3 py-2
          rounded-lg
          cursor-pointer hover:scale-105 active:scale-95 transition-transform
          bg-yellow-50 dark:bg-yellow-900/30
          ${xpAnimating ? 'animate-pulse' : ''}
        `}
      >
        <span className="text-xl">{rankIcon || '\u2b50'}</span>
        <span className="font-bold text-slate-800 dark:text-white">{formatNumber(safeXP)}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">XP</span>
      </button>

      {/* Topics */}
      <button
        type="button"
        data-testid="stat-topics"
        onClick={() => onStatTap?.('topics')}
        className="flex flex-col items-center px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
      >
        <span className="text-xl">{'\ud83d\udcda'}</span>
        <span className="font-bold text-slate-800 dark:text-white">{safeTopics}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">Topics</span>
      </button>

      {/* Trophies */}
      <button
        type="button"
        data-testid="stat-trophies"
        onClick={() => onStatTap?.('trophies')}
        className="flex flex-col items-center px-3 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
      >
        <span className="text-xl">{'\ud83c\udfc6'}</span>
        <span className="font-bold text-slate-800 dark:text-white">{safeTrophyCount}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">Trophies</span>
      </button>
    </div>
  )
}

StatsBar.propTypes = {
  streak: PropTypes.number,
  totalXP: PropTypes.number,
  topicsLearned: PropTypes.number,
  trophyCount: PropTypes.number,
  rankIcon: PropTypes.string,
  isLoading: PropTypes.bool,
  compact: PropTypes.bool,
  onStatTap: PropTypes.func,
}
