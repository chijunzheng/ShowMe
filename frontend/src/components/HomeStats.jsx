/**
 * HomeStats Component
 * UI002: Displays gamification stats on the home screen
 *
 * Layout:
 * ┌─────────────────────────────────┐
 * │ [Tier Badge]  XP: 150/300      │
 * │ ████████░░░░░░ Growing         │
 * │                                 │
 * │ 🔥 5 day streak    [World 🌍]  │
 * └─────────────────────────────────┘
 *
 * Test Cases:
 * T1: Open app to home screen
 * T2: Verify XP progress bar visible showing current/next tier
 * T3: Verify current tier badge displayed
 * T4: Verify streak counter visible
 * T5: Verify world preview thumbnail in corner
 * T6: Verify mic button still prominent and centered
 * T7: Tap world preview to navigate to world view
 */

import { useState, useEffect } from 'react'

/**
 * Tier configuration with colors, icons, and labels
 */
const TIER_CONFIG = {
  barren: {
    icon: '🏜️',
    label: 'Barren',
    color: 'bg-slate-400',
    gradient: 'from-slate-300 to-slate-500',
    textColor: 'text-slate-600',
  },
  sprouting: {
    icon: '🌱',
    label: 'Sprouting',
    color: 'bg-green-400',
    gradient: 'from-green-300 to-green-500',
    textColor: 'text-green-600',
  },
  growing: {
    icon: '🌿',
    label: 'Growing',
    color: 'bg-emerald-500',
    gradient: 'from-emerald-400 to-emerald-600',
    textColor: 'text-emerald-600',
  },
  thriving: {
    icon: '🌳',
    label: 'Thriving',
    color: 'bg-cyan-500',
    gradient: 'from-cyan-400 to-cyan-600',
    textColor: 'text-cyan-600',
  },
  legendary: {
    icon: '✨',
    label: 'Legendary',
    color: 'bg-purple-500',
    gradient: 'from-purple-400 to-purple-600',
    textColor: 'text-purple-600',
  },
}

/**
 * Next tier mapping for progress display
 */
const NEXT_TIER = {
  barren: 'sprouting',
  sprouting: 'growing',
  growing: 'thriving',
  thriving: 'legendary',
  legendary: null,
}

/**
 * XPProgressBar - Shows XP progress toward next tier
 *
 * @param {Object} props
 * @param {number} props.current - Current XP in tier
 * @param {number} props.target - XP needed for next tier
 * @param {string} props.tier - Current tier name
 */
function XPProgressBar({ current, target, tier }) {
  const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.barren
  const nextTier = NEXT_TIER[tier]
  const nextTierConfig = nextTier ? TIER_CONFIG[nextTier] : null

  return (
    <div className="w-full">
      {/* XP text label */}
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-gray-500 dark:text-gray-400">
          {current} / {target} XP
        </span>
        {nextTierConfig && (
          <span className={`font-medium ${nextTierConfig.textColor}`}>
            {nextTierConfig.icon} {nextTierConfig.label}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`
            absolute inset-y-0 left-0
            bg-gradient-to-r ${tierConfig.gradient}
            rounded-full
            transition-all duration-500 ease-out
          `}
          style={{ width: `${percentage}%` }}
        />
        {/* Shimmer effect on progress */}
        {percentage > 0 && percentage < 100 && (
          <div
            className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  )
}

/**
 * TierBadge - Displays current tier with icon
 *
 * @param {Object} props
 * @param {string} props.tier - Current tier name
 */
function TierBadge({ tier }) {
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.barren

  return (
    <div
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full
        ${tierConfig.color}
        text-white font-medium text-sm
        shadow-sm
      `}
    >
      <span className="text-base">{tierConfig.icon}</span>
      <span>{tierConfig.label}</span>
    </div>
  )
}

/**
 * StreakDisplay - Shows streak count with flame icon
 *
 * @param {Object} props
 * @param {number} props.count - Streak count
 */
function StreakDisplay({ count = 0 }) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [prevCount, setPrevCount] = useState(count)

  // Animate when streak increments
  useEffect(() => {
    if (count > prevCount) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 600)
      return () => clearTimeout(timer)
    }
    setPrevCount(count)
  }, [count, prevCount])

  return (
    <div
      className={`
        flex items-center gap-1.5
        text-sm font-medium
        ${count > 0 ? 'text-orange-500' : 'text-gray-400'}
      `}
    >
      {/* Flame icon with animation */}
      <span
        className={`
          text-lg
          ${count > 0 ? 'animate-flame-flicker' : ''}
          ${isAnimating ? 'animate-bounce' : ''}
        `}
      >
        {count > 0 ? '🔥' : '🔥'}
      </span>
      <span className={isAnimating ? 'animate-scale-up' : ''}>
        {count} day{count !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

/**
 * WorldPreview - Mini world thumbnail that navigates to world view
 *
 * @param {Object} props
 * @param {number} props.pieceCount - Number of pieces in world
 * @param {string} props.tier - Current tier for background color
 * @param {Function} props.onClick - Click handler to navigate to world
 */
function WorldPreview({ pieceCount = 0, tier = 'barren', onClick }) {
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.barren

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-xl
        bg-gradient-to-br ${tierConfig.gradient}
        text-white
        shadow-md hover:shadow-lg
        hover:scale-105 active:scale-95
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2
      `}
      aria-label={`View world with ${pieceCount} pieces`}
    >
      {/* World icon */}
      <span className="text-xl">🌍</span>

      {/* Piece count */}
      <span className="text-sm font-medium">
        {pieceCount} piece{pieceCount !== 1 ? 's' : ''}
      </span>

      {/* Arrow indicator */}
      <svg
        className="w-4 h-4 opacity-70"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  )
}

/**
 * HomeStats - Main component showing gamification stats on home screen
 *
 * @param {Object} props
 * @param {number} props.totalXP - Total XP earned
 * @param {string} props.tier - Current tier name
 * @param {Object} props.xpProgress - XP progress object with current, target, percentage
 * @param {number} props.streakCount - Current streak count
 * @param {number} props.pieceCount - Number of world pieces
 * @param {Function} props.onWorldPreviewClick - Handler for world preview click
 * @param {boolean} props.isLoading - Loading state
 */
export default function HomeStats({
  totalXP = 0,
  tier = 'barren',
  xpProgress = { current: 0, target: 250, percentage: 0 },
  streakCount = 0,
  pieceCount = 0,
  onWorldPreviewClick,
  isLoading = false,
}) {
  // Don't render if loading
  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-3 animate-pulse">
        <div className="h-20 bg-gray-100 dark:bg-slate-800 rounded-xl" />
      </div>
    )
  }

  return (
    <div
      className={`
        w-full max-w-md mx-auto
        bg-white/80 dark:bg-slate-800/80
        backdrop-blur-sm
        rounded-2xl
        shadow-lg border border-gray-100 dark:border-slate-700
        p-4
        animate-fade-in
      `}
    >
      {/* Top row: Tier badge + XP progress */}
      <div className="flex items-center gap-3 mb-3">
        <TierBadge tier={tier} />
        <div className="flex-1 min-w-0">
          <XPProgressBar
            current={xpProgress.current}
            target={xpProgress.target}
            tier={tier}
          />
        </div>
      </div>

      {/* Bottom row: Streak + World preview */}
      <div className="flex items-center justify-between">
        <StreakDisplay count={streakCount} />
        <WorldPreview
          pieceCount={pieceCount}
          tier={tier}
          onClick={onWorldPreviewClick}
        />
      </div>
    </div>
  )
}

// Export sub-components for potential reuse
export { XPProgressBar, TierBadge, StreakDisplay, WorldPreview, TIER_CONFIG }
