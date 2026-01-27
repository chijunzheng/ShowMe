/**
 * QuickXpToast Component (WB015)
 *
 * A toast notification shown after completing a lesson in Quick mode.
 * Shows the small XP reward and encourages the user to try Full mode
 * to unlock world pieces.
 *
 * @param {Object} props - Component props
 * @param {number} props.xpEarned - The amount of XP earned (typically 5)
 * @param {boolean} props.visible - Whether the toast should be shown
 * @param {Function} props.onDismiss - Callback when toast finishes hiding
 * @param {Function} [props.onSwitchMode] - Callback when user wants to switch to Full mode
 * @param {number} [props.duration=4000] - How long to show the toast in ms
 */

import { useEffect, useState } from 'react'

export default function QuickXpToast({
  xpEarned = 5,
  visible,
  onDismiss,
  onSwitchMode,
  duration = 4000
}) {
  // Track animation state for exit animation
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  useEffect(() => {
    if (!visible) {
      return
    }

    // Start exit animation before actually hiding
    const animationDuration = 300 // matches CSS animation duration
    const displayDuration = duration - animationDuration

    const timer = setTimeout(() => {
      setIsAnimatingOut(true)

      // Call onDismiss after exit animation completes
      const exitTimer = setTimeout(() => {
        setIsAnimatingOut(false)
        if (onDismiss) {
          onDismiss()
        }
      }, animationDuration)

      return () => clearTimeout(exitTimer)
    }, displayDuration)

    return () => clearTimeout(timer)
  }, [visible, duration, onDismiss])

  // Don't render anything if not visible
  if (!visible) {
    return null
  }

  return (
    <div
      className={`
        fixed bottom-24 left-1/2 -translate-x-1/2
        px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500
        rounded-2xl shadow-lg
        z-50
        max-w-sm w-[calc(100%-2rem)]
        ${isAnimatingOut ? 'animate-fade-out-down' : 'animate-fade-in-up'}
      `}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        {/* XP badge with sparkle */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">+{xpEarned}</span>
          </div>
          <span className="absolute -top-1 -right-1 text-yellow-200 text-sm animate-pulse">
            XP
          </span>
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">
            Nice! You earned {xpEarned} XP
          </p>
          <p className="text-white/80 text-xs mt-0.5">
            Complete a full lesson to unlock a world piece!
          </p>

          {/* Optional switch mode button */}
          {onSwitchMode && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSwitchMode()
              }}
              className="
                mt-2 px-3 py-1.5
                bg-white/20 hover:bg-white/30
                rounded-lg text-xs font-medium text-white
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-white/50
              "
            >
              Try Full Mode
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => {
            setIsAnimatingOut(true)
            setTimeout(() => {
              setIsAnimatingOut(false)
              if (onDismiss) {
                onDismiss()
              }
            }, 300)
          }}
          className="
            flex-shrink-0 p-1
            text-white/70 hover:text-white
            transition-colors
            focus:outline-none
          "
          aria-label="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
