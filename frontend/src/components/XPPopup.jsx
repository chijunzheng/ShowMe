/**
 * XPPopup Component
 * v2.0: Shows animated XP earned notification
 * Displays floating "+XP" animation when user earns experience points
 */

import { useEffect, useState } from 'react'

export default function XPPopup({
  xpEarned,
  onComplete
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (xpEarned && xpEarned.amount > 0) {
      setIsVisible(true)
      setIsExiting(false)

      // Start exit animation after 2 seconds
      const exitTimer = setTimeout(() => {
        setIsExiting(true)
      }, 2000)

      // Complete and cleanup after exit animation
      const completeTimer = setTimeout(() => {
        setIsVisible(false)
        onComplete?.()
      }, 2500)

      return () => {
        clearTimeout(exitTimer)
        clearTimeout(completeTimer)
      }
    }
  }, [xpEarned, onComplete])

  if (!isVisible || !xpEarned) return null

  return (
    <div
      className={`
        fixed top-20 left-1/2 -translate-x-1/2 z-50
        pointer-events-none
        transition-all duration-500
        ${isExiting ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}
      `}
    >
      {/* Main XP badge */}
      <div
        className="
          flex items-center gap-2 px-4 py-2 rounded-full
          bg-gradient-to-r from-amber-400 to-orange-500
          text-white font-bold text-lg
          shadow-lg shadow-orange-500/30
          animate-bounce-in
        "
      >
        <span className="text-2xl">+{xpEarned.amount}</span>
        <span className="text-sm font-medium opacity-90">XP</span>
      </div>

      {/* Breakdown (if multiple sources) */}
      {xpEarned.breakdown && xpEarned.breakdown.length > 1 && (
        <div className="mt-2 flex flex-col items-center gap-1">
          {xpEarned.breakdown.map((item, index) => (
            <div
              key={index}
              className="
                text-xs text-gray-600 dark:text-gray-300
                bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-full
                animate-fade-in
              "
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {formatXPSource(item.type)}: +{item.xp}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Format XP source type to readable text
function formatXPSource(type) {
  const labels = {
    daily_login: 'Daily bonus',
    first_question_of_day: 'First question',
    question_asked: 'Question',
    socratic_answered: 'Socratic answer',
    socratic_perfect: 'Perfect answer',
    deep_level_used: 'Deep mode'
  }
  return labels[type] || type
}
