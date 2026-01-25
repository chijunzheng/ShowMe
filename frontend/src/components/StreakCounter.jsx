/**
 * StreakCounter Component
 * GAMIFY-003: Displays flame icon with streak number
 * T001: Displays flame icon with streak number
 * T002: Positioned top-right corner
 * T003: Shows 0 for new users
 * T004: Pulses when incremented
 */

import { useState, useEffect } from 'react'

export default function StreakCounter({ streakCount = 0, className = '' }) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [prevCount, setPrevCount] = useState(streakCount)

  // Detect when streak increments (T004)
  useEffect(() => {
    if (streakCount > prevCount) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 600)
      return () => clearTimeout(timer)
    }
    setPrevCount(streakCount)
  }, [streakCount, prevCount])

  // Determine flame intensity based on streak
  const getFlameStyle = () => {
    if (streakCount >= 30) {
      return 'from-orange-500 via-red-500 to-yellow-400'
    }
    if (streakCount >= 7) {
      return 'from-orange-400 via-red-400 to-yellow-300'
    }
    if (streakCount >= 3) {
      return 'from-orange-300 to-yellow-400'
    }
    return 'from-gray-300 to-gray-400'
  }

  return (
    <div
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full
        bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm
        shadow-md border border-gray-100 dark:border-slate-700
        ${className}
      `}
    >
      {/* Flame icon with gradient and flicker animation */}
      <div
        className={`
          relative w-6 h-6
          ${streakCount > 0 ? 'animate-flame-flicker' : ''}
          ${isAnimating ? 'animate-bounce' : ''}
        `}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" className={`${streakCount > 0 ? 'stop-color-orange-500' : 'stop-color-gray-400'}`} stopColor={streakCount > 0 ? '#f97316' : '#9ca3af'} />
              <stop offset="50%" className={`${streakCount > 0 ? 'stop-color-red-500' : 'stop-color-gray-300'}`} stopColor={streakCount > 0 ? '#ef4444' : '#d1d5db'} />
              <stop offset="100%" className={`${streakCount > 0 ? 'stop-color-yellow-400' : 'stop-color-gray-200'}`} stopColor={streakCount > 0 ? '#facc15' : '#e5e7eb'} />
            </linearGradient>
          </defs>
          <path
            d="M12 2C9.243 5.243 7 8.243 7 11c0 2.761 2.239 5 5 5s5-2.239 5-5c0-2.757-2.243-5.757-5-9z"
            fill="url(#flameGradient)"
          />
          <path
            d="M12 8c-1.105 1.657-2 3.315-2 4.5 0 1.105.895 2 2 2s2-.895 2-2c0-1.185-.895-2.843-2-4.5z"
            fill={streakCount > 0 ? '#fef08a' : '#f3f4f6'}
          />
        </svg>
      </div>

      {/* Streak number with scale animation */}
      <span
        className={`
          font-bold text-lg
          ${streakCount > 0 ? 'text-orange-500' : 'text-gray-400'}
          ${isAnimating ? 'animate-scale-up' : ''}
          transition-transform duration-200
        `}
      >
        {streakCount}
      </span>
    </div>
  )
}
