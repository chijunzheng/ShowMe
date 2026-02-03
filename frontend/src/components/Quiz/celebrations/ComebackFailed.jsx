/**
 * ComebackFailed - Encouraging failure message component
 *
 * Displays an encouraging overlay when the user fails the comeback
 * challenge. Uses positive, supportive messaging (NOT punishing).
 * Designed to be kind to kids while still signaling "nice try".
 * Automatically dismisses after duration.
 *
 * @param {Object} props
 * @param {'simple'|'standard'|'deep'} props.level - Difficulty level for styling
 * @param {boolean} props.show - Whether to show the message
 * @param {Function} props.onComplete - Callback when message ends
 */

import { useEffect, useMemo, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { getStyleForLevel, COMEBACK_CONFIG } from '@/hooks/game/comebackConfig'
import { playComebackFailSound } from '@/utils/soundEffects'

/**
 * Level-specific class mappings for gentle styling.
 * Uses softer neutral tones instead of harsh reds.
 */
const LEVEL_CLASSES = {
  simple: 'from-slate-500/90 to-slate-600/90 simple neutral',
  standard: 'from-slate-500/90 to-slate-600/90 standard neutral',
  deep: 'from-slate-500/90 to-slate-600/90 deep neutral',
}

/**
 * Encouraging icons per level (supportive, not sad).
 */
const SUPPORT_ICONS = {
  simple: '\u{1F31F}', // Glowing star
  standard: '\u{1F4AA}', // Flexed bicep (you're strong!)
  deep: '\u{1F680}', // Rocket (keep going!)
}

export default function ComebackFailed({ level, show, onComplete }) {
  const soundPlayedRef = useRef(false)

  // Get level-specific configuration with fallback
  const levelStyle = useMemo(() => getStyleForLevel(level), [level])
  const levelClass = LEVEL_CLASSES[level] || LEVEL_CLASSES.simple
  const supportIcon = SUPPORT_ICONS[level] || SUPPORT_ICONS.simple

  // Get random encouraging failure message
  const failureMessage = useMemo(() => {
    const messages = COMEBACK_CONFIG.messages.failure
    return messages[Math.floor(Math.random() * messages.length)]
  }, [])

  // Memoized onComplete handler
  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete()
    }
  }, [onComplete])

  // Play sound and set auto-dismiss timer when shown
  useEffect(() => {
    if (!show) {
      soundPlayedRef.current = false
      return
    }

    // Play gentle fail sound with error handling
    if (!soundPlayedRef.current) {
      try {
        playComebackFailSound()
      } catch {
        // Audio may not be available, silently continue
      }
      soundPlayedRef.current = true
    }

    // Call onComplete after message duration
    const timer = setTimeout(handleComplete, COMEBACK_CONFIG.timing.failMessageDuration)

    return () => {
      clearTimeout(timer)
    }
  }, [show, handleComplete])

  // Don't render if not shown
  if (!show) {
    return null
  }

  return (
    <div
      data-testid="comeback-failed"
      role="status"
      aria-live="polite"
      className={`
        fixed inset-0 z-50
        flex flex-col items-center justify-center
        bg-gradient-to-br ${levelClass}
        animate-fade-in
        backdrop-blur-sm
      `}
    >
      {/* Content container */}
      <div className="relative z-10 text-center px-6 max-w-md animate">
        {/* Supportive icon with gentle animation */}
        <div className="text-7xl mb-4 animate-pulse">
          <span aria-hidden="true">{supportIcon}</span>
        </div>

        {/* Encouraging message (NOT harsh) */}
        <h2 className="text-3xl font-bold text-white mb-3">
          {failureMessage}
        </h2>

        {/* Supportive subtitle */}
        <p className="text-lg text-white/90 mb-4">
          Every try makes you better!
        </p>

        {/* Learning encouragement */}
        <div className="bg-white/10 rounded-xl p-4 border border-white/20">
          <p className="text-white/80">
            Practice makes perfect. Keep learning and{' '}
            <span className="text-yellow-300 font-semibold">grow stronger</span>!
          </p>
        </div>
      </div>

      {/* Inline keyframes for gentle animation */}
      <style>{`
        @keyframes fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

ComebackFailed.propTypes = {
  level: PropTypes.oneOf(['simple', 'standard', 'deep']),
  show: PropTypes.bool,
  onComplete: PropTypes.func,
}
