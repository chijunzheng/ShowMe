/**
 * BossEscaped - Boss escape (encouraging defeat) component
 *
 * Displays an encouraging message when the boss escapes.
 * Uses positive, kid-friendly language - never discouraging.
 * Motivates the player to try again next time.
 *
 * @param {Object} props
 * @param {'simple'|'standard'|'deep'} props.level - Difficulty level for styling
 * @param {boolean} props.show - Whether to show the message
 * @param {Function} props.onComplete - Callback when message ends
 */

import { useEffect, useMemo, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { getBossStyle, BOSS_BATTLE_CONFIG } from '@/hooks/game/bossBattleConfig'
import { playBossDefeatSound } from '@/utils/soundEffects'

/**
 * Level-specific class mappings for escape styling.
 * Uses softer colors than victory to be gentle.
 */
const LEVEL_CLASSES = {
  simple: 'from-emerald-600/90 to-green-700/90 simple',
  standard: 'from-cyan-600/90 to-blue-700/90 standard',
  deep: 'from-violet-600/90 to-purple-700/90 deep',
}

/**
 * Encouraging messages for when the boss escapes.
 * Always positive and motivating for kids.
 */
const ESCAPE_MESSAGES = [
  "Almost had it! You'll get 'em next time!",
  "The boss got away, but you're getting stronger!",
  "So close! Try again soon!",
]

export default function BossEscaped({ level, show, onComplete }) {
  const soundPlayedRef = useRef(false)

  // Get level-specific configuration with fallback
  const bossStyle = useMemo(() => getBossStyle(level), [level])
  const levelClass = LEVEL_CLASSES[level] || LEVEL_CLASSES.simple

  // Select a random escape message
  const escapeMessage = useMemo(() => {
    const index = Math.floor(Math.random() * ESCAPE_MESSAGES.length)
    return ESCAPE_MESSAGES[index]
  }, [])

  // Memoized onComplete handler
  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete()
    }
  }, [onComplete])

  // Play sound and set timer when shown
  useEffect(() => {
    if (!show) {
      soundPlayedRef.current = false
      return
    }

    // Play defeat sound with error handling
    if (!soundPlayedRef.current) {
      try {
        playBossDefeatSound()
      } catch {
        // Audio may not be available, silently continue
      }
      soundPlayedRef.current = true
    }

    // Call onComplete after defeat duration
    const timer = setTimeout(handleComplete, BOSS_BATTLE_CONFIG.timing.defeatDuration)

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
      data-testid="boss-escaped"
      role="status"
      aria-live="polite"
      className={`
        fixed inset-0 z-50
        flex flex-col items-center justify-center
        bg-gradient-to-br ${levelClass}
        animate-fade-in
        motion-safe:animate-fade-in
      `}
    >
      {/* Escape content */}
      <div className="relative z-10 text-center px-6">
        {/* Boss icon with escape animation */}
        <div
          className="text-6xl mb-4 animate-escape"
          style={{
            animation: 'escape 1.5s ease-in-out forwards',
          }}
        >
          <span aria-hidden="true">{bossStyle.icon}</span>
        </div>

        {/* Escape message - encouraging, NOT discouraging */}
        <h2 className="text-2xl font-bold text-white mb-2">
          The {bossStyle.name} got away!
        </h2>

        <p className="text-lg text-white/90 mb-6 max-w-xs">
          {escapeMessage}
        </p>

        {/* Encouraging badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
          <span className="text-lg" aria-hidden="true">
            {'\uD83D\uDCAA'} {/* Flexed bicep emoji */}
          </span>
          <span className="text-base text-white font-medium">
            Keep trying!
          </span>
        </div>
      </div>

      {/* Inline keyframes for animations */}
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
          animation: fade-in 0.3s ease-out forwards;
        }
        @keyframes escape {
          0% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
          30% {
            transform: translateX(-10px) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translateX(50px) scale(0.8);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  )
}

BossEscaped.propTypes = {
  level: PropTypes.oneOf(['simple', 'standard', 'deep']),
  show: PropTypes.bool,
  onComplete: PropTypes.func,
}
