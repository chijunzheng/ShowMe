/**
 * AchievementToast Component
 * GAMIFY-003: Toast notification when badge is unlocked
 * T005: Appears when badge unlocked
 * T006: Shows badge icon and name
 * T007: Auto-dismisses after 3 seconds
 */

import { useEffect, useState } from 'react'

// Badge icon mappings
const BADGE_ICONS = {
  'lightbulb': '💡',
  'flame-small': '🔥',
  'flame-medium': '🔥',
  'flame-large': '🔥',
  'brain': '🧠',
  'trophy': '🏆',
  'thought-bubble': '💭'
}

export default function AchievementToast({
  badge,
  onDismiss,
  autoCloseDelay = 3000
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (badge) {
      // Trigger enter animation
      setIsVisible(true)

      // Auto-dismiss after delay (T007)
      const dismissTimer = setTimeout(() => {
        setIsExiting(true)
        setTimeout(() => {
          setIsVisible(false)
          setIsExiting(false)
          onDismiss?.()
        }, 300)
      }, autoCloseDelay)

      return () => clearTimeout(dismissTimer)
    }
  }, [badge, autoCloseDelay, onDismiss])

  if (!badge || !isVisible) return null

  const icon = BADGE_ICONS[badge.icon] || '🏅'

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50
        ${isExiting ? 'animate-toast-exit' : 'animate-toast-enter'}
      `}
    >
      <div
        className="
          flex items-center gap-4 px-6 py-4
          bg-gradient-to-r from-primary to-cyan-500
          rounded-2xl shadow-xl
          text-white
        "
      >
        {/* Badge icon with celebration animation */}
        <div className="relative">
          <span className="text-4xl animate-bounce">
            {icon}
          </span>
          {/* Sparkle effects */}
          <span className="absolute -top-1 -right-1 text-yellow-300 text-sm animate-ping">✨</span>
          <span className="absolute -bottom-1 -left-1 text-yellow-300 text-sm animate-ping" style={{ animationDelay: '150ms' }}>✨</span>
        </div>

        {/* Badge info */}
        <div>
          <p className="text-sm font-medium text-white/80">
            Achievement Unlocked!
          </p>
          <p className="text-lg font-bold">
            {badge.name}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={() => {
            setIsExiting(true)
            setTimeout(() => {
              setIsVisible(false)
              setIsExiting(false)
              onDismiss?.()
            }, 300)
          }}
          className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}
