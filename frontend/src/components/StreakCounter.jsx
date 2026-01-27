/**
 * StreakCounter Component
 * UI009: Enhanced streak tracking display with gamification features
 *
 * Features:
 * - T001: Displays flame icon with streak number
 * - T002: Positioned top-right corner (handled by parent)
 * - T003: Shows 0 for new users
 * - T004: Pulses when incremented
 * - Flame intensity based on streak length (starting, growing, warm, hot, legendary)
 * - Milestone celebrations at 7, 14, 30, 100 days
 * - "At risk" warning when close to reset (within 6 hours)
 * - Streak freeze indicator if available
 * - Tooltip showing detailed streak information
 */

import { useState, useEffect, useCallback } from 'react'

/**
 * Determine flame intensity level based on streak count
 * @param {number} streak - Current streak count
 * @returns {string} Intensity level: 'starting', 'growing', 'warm', 'hot', or 'legendary'
 */
function getFlameIntensity(streak) {
  if (streak >= 30) return 'legendary'  // Golden flame
  if (streak >= 14) return 'hot'        // Red-orange flame
  if (streak >= 7) return 'warm'        // Orange flame
  if (streak >= 3) return 'growing'     // Yellow-orange flame
  return 'starting'                      // Small yellow flame
}

// Flame color classes based on intensity
const FLAME_COLORS = {
  starting: {
    gradient: ['#9ca3af', '#d1d5db', '#e5e7eb'], // Gray for 0, otherwise yellow
    text: 'text-gray-400',
    glow: '',
  },
  growing: {
    gradient: ['#f97316', '#facc15', '#fef08a'], // Orange to yellow
    text: 'text-orange-400',
    glow: '',
  },
  warm: {
    gradient: ['#ea580c', '#f97316', '#facc15'], // Deep orange
    text: 'text-orange-500',
    glow: 'drop-shadow-[0_0_4px_rgba(249,115,22,0.5)]',
  },
  hot: {
    gradient: ['#ef4444', '#f97316', '#facc15'], // Red to orange
    text: 'text-red-500',
    glow: 'drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]',
  },
  legendary: {
    gradient: ['#f59e0b', '#fbbf24', '#fef3c7'], // Golden
    text: 'text-amber-400',
    glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]',
  },
}

// Streak milestones that trigger celebrations
const MILESTONES = [7, 14, 30, 100]

/**
 * Calculate hours remaining until streak resets (24h from last active)
 * @param {Date|string|null} lastActiveDate - Last activity timestamp
 * @returns {number} Hours remaining, or Infinity if no last active date
 */
function calculateHoursUntilReset(lastActiveDate) {
  if (!lastActiveDate) return Infinity

  const lastActive = new Date(lastActiveDate)
  const resetTime = new Date(lastActive)
  // Streak resets if no quiz passed within 24 hours of last activity day end
  // Simplified: 24 hours from last active
  resetTime.setHours(resetTime.getHours() + 24)

  const now = new Date()
  const diffMs = resetTime - now
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)))

  return diffHours
}

/**
 * Streak Milestone Badge - shown when hitting milestone days
 */
function StreakMilestone({ days, onClose }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  if (!MILESTONES.includes(days) || !isVisible) return null

  return (
    <div className="
      absolute -top-12 left-1/2 -translate-x-1/2
      animate-bounce-in whitespace-nowrap
    ">
      <div className="
        px-3 py-1.5 rounded-full
        bg-gradient-to-r from-amber-400 to-orange-500
        text-white text-sm font-bold
        shadow-lg
      ">
        <span className="mr-1">🎉</span>
        {days} Day Streak!
      </div>
    </div>
  )
}

/**
 * Streak At Risk Warning - shown when close to losing streak
 */
function StreakAtRisk({ hoursRemaining }) {
  if (hoursRemaining > 6 || hoursRemaining === Infinity) return null

  return (
    <div className="
      absolute -bottom-8 left-1/2 -translate-x-1/2
      whitespace-nowrap animate-pulse
    ">
      <span className="
        text-xs font-medium text-amber-600 dark:text-amber-400
        bg-amber-50 dark:bg-amber-900/30
        px-2 py-0.5 rounded-full
      ">
        ⚠️ {hoursRemaining}h to keep streak!
      </span>
    </div>
  )
}

/**
 * Streak Freeze Button - allows preserving streak
 */
function StreakFreezeButton({ available, onUse }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={available ? onUse : undefined}
      disabled={!available}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative ml-1 p-1 rounded-full transition-all duration-200
        ${available
          ? 'text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 cursor-pointer'
          : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
        }
      `}
      aria-label={available ? 'Use streak freeze' : 'No streak freeze available'}
    >
      <span className="text-sm">❄️</span>

      {/* Tooltip on hover */}
      {isHovered && (
        <div className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          px-2 py-1 rounded-lg
          bg-gray-800 dark:bg-gray-700
          text-white text-xs whitespace-nowrap
          shadow-lg z-50
        ">
          {available ? 'Streak Freeze (1 available)' : 'No freeze available'}
          <div className="
            absolute top-full left-1/2 -translate-x-1/2
            border-4 border-transparent border-t-gray-800 dark:border-t-gray-700
          " />
        </div>
      )}
    </button>
  )
}

/**
 * Streak Details Tooltip - shows detailed information on hover
 */
function StreakTooltip({ streak, longestStreak, hoursRemaining, hasFreezeAvailable }) {
  return (
    <div className="
      absolute top-full left-1/2 -translate-x-1/2 mt-2
      px-3 py-2 rounded-lg
      bg-gray-800 dark:bg-gray-700
      text-white text-xs
      shadow-xl z-50
      min-w-[140px]
    ">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-300">Current:</span>
          <span className="font-bold">{streak} days</span>
        </div>
        {longestStreak > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-300">Best:</span>
            <span className="font-medium">{longestStreak} days</span>
          </div>
        )}
        {hoursRemaining !== Infinity && hoursRemaining > 0 && (
          <div className="flex justify-between pt-1 border-t border-gray-600">
            <span className="text-gray-300">Resets in:</span>
            <span className={hoursRemaining <= 6 ? 'text-amber-400' : ''}>
              {hoursRemaining}h
            </span>
          </div>
        )}
        {hasFreezeAvailable && (
          <div className="pt-1 border-t border-gray-600 text-cyan-300">
            ❄️ 1 freeze available
          </div>
        )}
      </div>
      {/* Arrow pointing up */}
      <div className="
        absolute bottom-full left-1/2 -translate-x-1/2
        border-4 border-transparent border-b-gray-800 dark:border-b-gray-700
      " />
    </div>
  )
}

/**
 * Main StreakCounter Component
 */
export default function StreakCounter({
  streakCount = 0,
  lastActiveDate = null,
  longestStreak = 0,
  hasFreezeAvailable = false,
  onFreezeClick,
  className = ''
}) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [prevCount, setPrevCount] = useState(streakCount)
  const [showMilestone, setShowMilestone] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  // Calculate hours until streak resets
  const hoursUntilReset = calculateHoursUntilReset(lastActiveDate)

  // Get flame intensity based on streak
  const intensity = streakCount > 0 ? getFlameIntensity(streakCount) : 'starting'
  const flameConfig = FLAME_COLORS[intensity]

  // Detect when streak increments (T004)
  useEffect(() => {
    if (streakCount > prevCount) {
      setIsAnimating(true)

      // Check if we hit a milestone
      if (MILESTONES.includes(streakCount)) {
        setShowMilestone(true)
      }

      const timer = setTimeout(() => setIsAnimating(false), 600)
      return () => clearTimeout(timer)
    }
    setPrevCount(streakCount)
  }, [streakCount, prevCount])

  // Handle milestone close
  const handleMilestoneClose = useCallback(() => {
    setShowMilestone(false)
  }, [])

  // Get gradient colors for flame SVG
  const gradientColors = streakCount > 0
    ? flameConfig.gradient
    : FLAME_COLORS.starting.gradient

  return (
    <div
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5 rounded-full
        bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm
        shadow-md border border-gray-100 dark:border-slate-700
        cursor-pointer select-none
        transition-all duration-200
        hover:shadow-lg
        ${className}
      `}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Milestone celebration popup */}
      {showMilestone && (
        <StreakMilestone days={streakCount} onClose={handleMilestoneClose} />
      )}

      {/* Streak at risk warning */}
      {streakCount > 0 && (
        <StreakAtRisk hoursRemaining={hoursUntilReset} />
      )}

      {/* Flame icon with gradient and flicker animation */}
      <div
        className={`
          relative w-6 h-6
          ${streakCount > 0 ? 'animate-flame-flicker' : ''}
          ${isAnimating ? 'animate-bounce' : ''}
          ${flameConfig.glow}
        `}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient
              id={`flameGradient-${streakCount}`}
              x1="0%"
              y1="100%"
              x2="0%"
              y2="0%"
            >
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="50%" stopColor={gradientColors[1]} />
              <stop offset="100%" stopColor={gradientColors[2]} />
            </linearGradient>
          </defs>
          {/* Main flame shape */}
          <path
            d="M12 2C9.243 5.243 7 8.243 7 11c0 2.761 2.239 5 5 5s5-2.239 5-5c0-2.757-2.243-5.757-5-9z"
            fill={`url(#flameGradient-${streakCount})`}
          />
          {/* Inner flame highlight */}
          <path
            d="M12 8c-1.105 1.657-2 3.315-2 4.5 0 1.105.895 2 2 2s2-.895 2-2c0-1.185-.895-2.843-2-4.5z"
            fill={streakCount > 0 ? '#fef08a' : '#f3f4f6'}
          />
        </svg>

        {/* Legendary sparkle effect */}
        {intensity === 'legendary' && (
          <>
            <span className="absolute -top-1 -right-1 text-xs animate-ping">✨</span>
            <span
              className="absolute -bottom-0.5 -left-0.5 text-xs animate-ping"
              style={{ animationDelay: '300ms' }}
            >
              ✨
            </span>
          </>
        )}
      </div>

      {/* Streak number with scale animation */}
      <span
        className={`
          font-bold text-lg tabular-nums
          ${flameConfig.text}
          ${isAnimating ? 'animate-scale-up' : ''}
          transition-transform duration-200
        `}
      >
        {streakCount}
      </span>

      {/* Streak freeze button (only show if freeze feature is enabled) */}
      {(hasFreezeAvailable || onFreezeClick) && (
        <StreakFreezeButton
          available={hasFreezeAvailable}
          onUse={onFreezeClick}
        />
      )}

      {/* Tooltip on hover */}
      {showTooltip && (
        <StreakTooltip
          streak={streakCount}
          longestStreak={longestStreak}
          hoursRemaining={hoursUntilReset}
          hasFreezeAvailable={hasFreezeAvailable}
        />
      )}
    </div>
  )
}
