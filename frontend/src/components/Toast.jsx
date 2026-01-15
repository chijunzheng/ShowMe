import { useEffect, useState } from 'react'

/**
 * Toast - Displays brief notification messages that auto-dismiss
 *
 * Used to provide feedback when users add questions to the queue.
 * The toast animates in, displays for a duration, then animates out.
 *
 * @param {Object} props - Component props
 * @param {string} props.message - The notification message to display
 * @param {boolean} props.visible - Whether the toast should be shown
 * @param {Function} props.onDismiss - Callback when toast finishes hiding
 * @param {number} [props.duration=2500] - How long to show the toast in ms
 */
function Toast({ message, visible, onDismiss, duration = 2500 }) {
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
        px-4 py-3 bg-gray-900 text-white
        rounded-lg shadow-lg
        text-sm font-medium
        z-50
        ${isAnimatingOut ? 'animate-fade-out-down' : 'animate-fade-in-up'}
      `}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Checkmark icon */}
      <span className="inline-flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {message}
      </span>
    </div>
  )
}

export default Toast
