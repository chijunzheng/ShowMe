/**
 * ComebackComplete - Comeback victory celebration component
 *
 * Displays a celebratory overlay when the user successfully completes
 * a comeback challenge. Features confetti effects, XP display,
 * and triumph messaging. Automatically dismisses after duration.
 *
 * @param {Object} props
 * @param {'simple'|'standard'|'deep'} props.level - Difficulty level for styling
 * @param {number} props.xpEarned - XP earned from comeback (default: 0)
 * @param {boolean} props.show - Whether to show the celebration
 * @param {Function} props.onComplete - Callback when celebration ends
 */

import { useEffect, useMemo, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { getStyleForLevel, COMEBACK_CONFIG } from '@/hooks/game/comebackConfig'
import { playComebackSuccessSound } from '@/utils/soundEffects'

/**
 * Level-specific class mappings for victory styling.
 */
const LEVEL_CLASSES = {
  simple: 'from-emerald-500/95 to-green-600/95 simple emerald',
  standard: 'from-cyan-500/95 to-blue-600/95 standard cyan',
  deep: 'from-violet-500/95 to-purple-600/95 deep violet',
}

/**
 * Glow classes per level.
 */
const GLOW_CLASSES = {
  simple: 'shadow-emerald-500/50 shadow-2xl glow',
  standard: 'shadow-cyan-500/50 shadow-2xl glow',
  deep: 'shadow-violet-500/50 shadow-2xl glow',
}

export default function ComebackComplete({
  level,
  xpEarned = 0,
  show,
  onComplete,
}) {
  const soundPlayedRef = useRef(false)

  // Get level-specific configuration with fallback
  const levelStyle = useMemo(() => getStyleForLevel(level), [level])
  const levelClass = LEVEL_CLASSES[level] || LEVEL_CLASSES.simple
  const glowClass = GLOW_CLASSES[level] || GLOW_CLASSES.simple

  // Get random success message
  const successMessage = useMemo(() => {
    const messages = COMEBACK_CONFIG.messages.success
    return messages[Math.floor(Math.random() * messages.length)]
  }, [])

  // Display values
  const displayXp = Math.round(xpEarned || 0)

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

    // Play victory sound with error handling
    if (!soundPlayedRef.current) {
      try {
        playComebackSuccessSound()
      } catch {
        // Audio may not be available, silently continue
      }
      soundPlayedRef.current = true
    }

    // Call onComplete after celebration duration
    const timer = setTimeout(handleComplete, COMEBACK_CONFIG.timing.celebrationDuration)

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
      data-testid="comeback-complete"
      role="status"
      aria-live="polite"
      className={`
        fixed inset-0 z-50
        flex flex-col items-center justify-center
        bg-gradient-to-br ${levelClass}
        animate-scale-in
        celebration confetti ${glowClass}
      `}
    >
      {/* Confetti particles */}
      <div data-testid="confetti" className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(16)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full animate-confetti sparkle"
            style={{
              left: `${5 + (i * 6)}%`,
              top: '-10%',
              backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#22C55E', '#3B82F6', '#F59E0B', '#EC4899'][i % 8],
              animationDelay: `${i * 0.08}s`,
              animationDuration: '2.5s',
            }}
          />
        ))}
      </div>

      {/* Victory content */}
      <div className="relative z-10 text-center px-6">
        {/* Victory icon with bounce animation */}
        <div className="text-7xl mb-4 animate-bounce">
          <span aria-hidden="true">{levelStyle.icon}</span>
        </div>

        {/* Victory message */}
        <h2 className="text-4xl font-bold text-white mb-2 animate-pulse">
          {successMessage}
        </h2>

        <p className="text-xl text-white/90 mb-6">
          You conquered the comeback!
        </p>

        {/* XP Earned display */}
        <div className="inline-flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 animate">
            <span className="text-2xl" aria-hidden="true">+</span>
            <span className="text-3xl font-bold text-yellow-300">
              {displayXp}
            </span>
            <span className="text-xl text-white font-medium">XP earned!</span>
          </div>

          {/* Mystery box indicator */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
            <span aria-hidden="true">&#x1F381;</span>
            <span className="text-white/90 text-sm">
              Bronze Mystery Box + Piece Unlock!
            </span>
          </div>
        </div>
      </div>

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 2.5s ease-out forwards;
        }
        @keyframes scale-in {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

ComebackComplete.propTypes = {
  level: PropTypes.oneOf(['simple', 'standard', 'deep']),
  xpEarned: PropTypes.number,
  show: PropTypes.bool,
  onComplete: PropTypes.func,
}
