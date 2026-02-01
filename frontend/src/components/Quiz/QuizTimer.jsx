/**
 * QuizTimer Component
 * WB002/WB003: Speed bonus timer for quiz questions
 *
 * Features:
 * - T001: Tracks elapsed time during quiz questions
 * - T002: Visual countdown/elapsed display with color progression
 * - T003: Level-based visibility (hidden for simple, subtle for standard, prominent for deep)
 * - T004: Color transitions: green (bonus territory) -> yellow (approaching) -> red/gray (over threshold)
 * - T005: Proper cleanup of intervals on unmount/reset
 */

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Timer visual states based on time relative to threshold
 * @typedef {'bonus' | 'approaching' | 'over'} TimerState
 */

/**
 * Get timer state based on elapsed seconds and threshold
 * @param {number} elapsed - Seconds elapsed
 * @param {number} threshold - Speed bonus threshold in seconds
 * @returns {TimerState} Current timer state
 */
function getTimerState(elapsed, threshold) {
  if (elapsed <= threshold * 0.6) {
    return 'bonus' // Under 60% of threshold - green zone
  }
  if (elapsed <= threshold) {
    return 'approaching' // Between 60% and 100% - yellow zone
  }
  return 'over' // Over threshold - red/gray zone
}

/**
 * Timer color configurations for each state
 */
const TIMER_COLORS = {
  bonus: {
    bg: 'bg-success/10 dark:bg-success/20',
    border: 'border-success/30 dark:border-success/40',
    text: 'text-success dark:text-success-400',
    ring: 'ring-success/30',
    icon: 'text-success',
  },
  approaching: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-300 dark:border-amber-600',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-300/50',
    icon: 'text-amber-500',
  },
  over: {
    bg: 'bg-gray-100 dark:bg-slate-700',
    border: 'border-gray-300 dark:border-slate-600',
    text: 'text-gray-500 dark:text-gray-400',
    ring: 'ring-gray-300/30',
    icon: 'text-gray-400',
  },
}

/**
 * Format seconds into display string (MM:SS or SS)
 * @param {number} seconds - Time in seconds
 * @param {boolean} showMinutes - Whether to always show minutes
 * @returns {string} Formatted time string
 */
function formatTime(seconds, showMinutes = false) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (showMinutes || mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return `${secs}s`
}

/**
 * Clock icon SVG component
 */
function ClockIcon({ className = '' }) {
  return (
    <svg
      className={`w-4 h-4 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

/**
 * Lightning bolt icon for speed bonus indicator
 */
function LightningIcon({ className = '' }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${className}`}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

/**
 * QuizTimer Component
 *
 * @param {Object} props
 * @param {boolean} props.isActive - Whether the timer is currently running
 * @param {number|null} props.speedThreshold - Seconds for speed bonus (null = hidden)
 * @param {'simple' | 'standard' | 'deep'} props.level - Quiz difficulty level
 * @param {(elapsed: number) => void} [props.onTick] - Optional callback called each second
 * @param {boolean} [props.hasSidebar] - Whether the topic sidebar is visible (offsets timer on desktop)
 */
export default function QuizTimer({
  isActive = false,
  speedThreshold = null,
  level = 'standard',
  onTick,
  hasSidebar = false,
}) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef(null)
  const prevActiveRef = useRef(isActive)

  // Reset timer when isActive transitions from false to true
  useEffect(() => {
    if (isActive && !prevActiveRef.current) {
      // Transitioning from inactive to active - reset timer
      setElapsed(0)
    }
    prevActiveRef.current = isActive
  }, [isActive])

  // Handle timer interval
  useEffect(() => {
    if (isActive) {
      // Start the interval
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const newElapsed = prev + 1
          // Call onTick callback if provided
          onTick?.(newElapsed)
          return newElapsed
        })
      }, 1000)
    } else {
      // Stop the interval when not active
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    // Cleanup on unmount or when isActive changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive, onTick])

  // Simple level: Timer is completely hidden
  if (level === 'simple') {
    return null
  }

  // If no threshold is set, don't render anything
  if (speedThreshold === null || speedThreshold === undefined) {
    return null
  }

  // Calculate timer state and remaining time
  const timerState = getTimerState(elapsed, speedThreshold)
  const remaining = Math.max(0, speedThreshold - elapsed)
  const colors = TIMER_COLORS[timerState]
  const isInBonusTerritory = timerState === 'bonus' || timerState === 'approaching'
  const positionClasses = hasSidebar ? 'left-4 md:left-72' : 'left-4'

  // Standard level: Subtle, informational display in top-left
  if (level === 'standard') {
    return (
      <div
        className={`
          fixed top-4 ${positionClasses} z-40
          flex items-center gap-1.5
          px-2.5 py-1.5 rounded-full
          ${colors.bg} ${colors.border} border
          transition-all duration-300 ease-out
          animate-fade-in
          opacity-80 hover:opacity-100
        `}
        role="timer"
        aria-label={`Timer: ${formatTime(elapsed, true)} elapsed`}
      >
        <ClockIcon className={colors.icon} />
        <span className={`text-sm font-medium tabular-nums ${colors.text}`}>
          {formatTime(elapsed, true)}
        </span>
      </div>
    )
  }

  // Deep level: Prominent display with countdown and visual urgency
  return (
    <div
      className={`
        fixed top-4 ${positionClasses} z-40
        flex flex-col items-center gap-1
        animate-fade-in
      `}
      role="timer"
      aria-label={`Speed bonus timer: ${formatTime(remaining, true)} remaining`}
    >
      {/* Main timer display */}
      <div
        className={`
          flex items-center gap-2
          px-4 py-2 rounded-xl
          ${colors.bg} ${colors.border} border-2
          shadow-lg
          transition-all duration-300 ease-out
          ${timerState === 'approaching' ? 'animate-pulse-slow' : ''}
        `}
      >
        {/* Speed bonus indicator */}
        {isInBonusTerritory && (
          <div className="flex items-center gap-1">
            <LightningIcon className={`${colors.icon} animate-pulse`} />
          </div>
        )}

        {/* Time display - shows remaining time for deep level */}
        <div className="flex flex-col items-center">
          <span
            className={`
              text-xl font-bold tabular-nums leading-none
              ${colors.text}
              ${timerState === 'approaching' ? 'animate-pulse' : ''}
            `}
          >
            {formatTime(remaining, true)}
          </span>
          {isInBonusTerritory && (
            <span className="text-xs font-medium text-success dark:text-success-400 mt-0.5">
              Speed Bonus
            </span>
          )}
        </div>

        {/* Clock icon */}
        <ClockIcon className={colors.icon} />
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-[120px] h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`
            h-full rounded-full
            transition-all duration-1000 ease-linear
            ${timerState === 'bonus'
              ? 'bg-success'
              : timerState === 'approaching'
                ? 'bg-amber-500'
                : 'bg-gray-400 dark:bg-slate-500'
            }
          `}
          style={{
            width: `${Math.max(0, Math.min(100, (remaining / speedThreshold) * 100))}%`,
          }}
        />
      </div>

      {/* Status text */}
      <span
        className={`
          text-xs font-medium
          ${timerState === 'over'
            ? 'text-gray-400 dark:text-gray-500'
            : colors.text
          }
        `}
      >
        {timerState === 'over' ? 'No speed bonus' : `${remaining}s for bonus`}
      </span>
    </div>
  )
}
