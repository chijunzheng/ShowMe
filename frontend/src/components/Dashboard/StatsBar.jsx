/**
 * StatsBar Component
 *
 * Displays user learning statistics including streak, XP, topics learned, and explorer rank.
 * Supports animated updates and loading state.
 */

import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { getExplorerRank, MAX_RANK_LEVEL } from '../ExplorerRank/explorerRankUtils'

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
 * @param {string} props.rankIcon - Optional rank icon to display in rank stat
 * @param {boolean} props.isLoading - Whether stats are loading
 * @param {boolean} props.compact - Whether to use compact display
 */
export default function StatsBar({
  streak = 0,
  totalXP = 0,
  topicsLearned = 0,
  trophyCount = 0,
  storyCount = 0,
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
  const safeStoryCount = Math.max(0, storyCount || 0)
  const rankInfo = getExplorerRank(safeTopics, safeXP)
  const isMaxRank = rankInfo.level === MAX_RANK_LEVEL
  const rankDisplayIcon = rankIcon || rankInfo.icon
  const labelClass = compact
    ? 'text-[10px] uppercase tracking-wider text-slate-500'
    : 'text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400'

  return (
    <div
      data-testid="stats-bar"
      className={`
        flex items-center justify-around gap-3
        ${compact ? 'p-2 text-sm compact' : 'p-3'}
        ${compact
          ? 'bg-white dark:bg-slate-800 border-2 border-black dark:border-slate-600 shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#475569]'
          : 'bg-white dark:bg-slate-800 bg-slate-100 dark:bg-slate-800'
        }
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
          ${safeStreak > 0
            ? (compact ? 'bg-orange-50' : 'bg-orange-50 dark:bg-orange-900/30')
            : 'opacity-50 bg-slate-50 dark:bg-slate-700'
          }
          ${streakAnimating ? 'animate-pulse' : ''}
        `}
      >
        <span className="text-xl">{'\ud83d\udd25'}</span>
        <span className={`font-bold ${compact ? 'text-slate-800' : 'text-slate-800 dark:text-white'}`}>{safeStreak}</span>
        <span className={labelClass}>Streak</span>
      </button>

      {/* Rank */}
      <button
        type="button"
        data-testid="stat-rank"
        onClick={() => onStatTap?.('xp')}
        className={`
          flex flex-col items-center
          px-3 py-2
          rounded-lg
          cursor-pointer hover:scale-105 active:scale-95 transition-transform
          ${compact ? 'bg-accent-50' : 'bg-accent-50 dark:bg-accent/10'}
          ${isMaxRank ? 'text-red-600 animate-pulse' : ''}
          ${xpAnimating ? 'animate-pulse' : ''}
        `}
      >
        <span className="text-xl">{rankDisplayIcon}</span>
        <span className={`font-bold ${compact ? 'text-slate-800' : 'text-slate-800 dark:text-white'}`}>{rankInfo.title}</span>
        <span className={labelClass}>{formatNumber(safeXP)} XP</span>
      </button>

      {/* Topics */}
      <button
        type="button"
        data-testid="stat-topics"
        onClick={() => onStatTap?.('topics')}
        className={`flex flex-col items-center px-3 py-2 rounded-lg ${compact ? 'bg-primary-50' : 'bg-primary-50 dark:bg-primary/10'} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
      >
        <span className="text-xl">{'\ud83d\udcd6'}</span>
        <span className={`font-bold ${compact ? 'text-slate-800' : 'text-slate-800 dark:text-white'}`}>{safeTopics}</span>
        <span className={labelClass}>Topics</span>
      </button>

      {/* Trophies */}
      <button
        type="button"
        data-testid="stat-trophies"
        onClick={() => onStatTap?.('trophies')}
        className={`flex flex-col items-center px-3 py-2 rounded-lg ${compact ? 'bg-yellow-50' : 'bg-yellow-50 dark:bg-yellow-900/30'} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
      >
        <span className="text-xl">{'\ud83c\udfc6'}</span>
        <span className={`font-bold ${compact ? 'text-slate-800' : 'text-slate-800 dark:text-white'}`}>{safeTrophyCount}</span>
        <span className={labelClass}>Trophies</span>
      </button>

      {/* Stories - only show when user has saved stories */}
      {safeStoryCount > 0 && (
        <button
          type="button"
          data-testid="stat-stories"
          onClick={() => onStatTap?.('stories')}
          className={`flex flex-col items-center px-3 py-2 rounded-lg ${compact ? 'bg-pink-50' : 'bg-pink-50 dark:bg-pink-900/30'} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
        >
          <span className="text-xl">{'\ud83d\udcd6'}</span>
          <span className={`font-bold ${compact ? 'text-slate-800' : 'text-slate-800 dark:text-white'}`}>{safeStoryCount}</span>
          <span className={labelClass}>Stories</span>
        </button>
      )}
    </div>
  )
}

StatsBar.propTypes = {
  streak: PropTypes.number,
  totalXP: PropTypes.number,
  topicsLearned: PropTypes.number,
  trophyCount: PropTypes.number,
  storyCount: PropTypes.number,
  rankIcon: PropTypes.string,
  isLoading: PropTypes.bool,
  compact: PropTypes.bool,
  onStatTap: PropTypes.func,
}
