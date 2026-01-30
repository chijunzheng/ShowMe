/**
 * StreakCelebration Component
 * Animated celebration overlay when user hits a streak threshold
 *
 * Features:
 * - Three celebration styles: playful, balanced, intense
 * - Fade in, scale up, then fade out animation (~2.5s total)
 * - CSS-only animations (no external libraries)
 * - Centered overlay with streak count message
 */

import { useEffect, useState, useCallback } from 'react'

/**
 * Configuration for each celebration style
 * - playful: Stars, rainbows, bouncy animations, pastel colors
 * - balanced: Confetti, clean badges, moderate animations
 * - intense: Fire emojis, lightning effects, dramatic pulse
 */
const CELEBRATION_STYLES = {
  playful: {
    emojis: ['⭐', '🌈', '✨', '🌟', '💫', '🎀', '🦋', '🌸'],
    bgGradient: 'from-pink-200 via-purple-200 to-cyan-200 dark:from-pink-900/40 dark:via-purple-900/40 dark:to-cyan-900/40',
    textColor: 'text-purple-600 dark:text-purple-300',
    accentColor: 'text-pink-500 dark:text-pink-400',
    borderColor: 'border-purple-300 dark:border-purple-600',
    particleColors: ['#F472B6', '#A78BFA', '#67E8F9', '#FCD34D'],
  },
  balanced: {
    emojis: ['🎉', '🏆', '🎊', '👏', '💪', '🙌', '⚡', '🔥'],
    bgGradient: 'from-primary-100 via-cyan-100 to-success-100 dark:from-primary-900/40 dark:via-cyan-900/40 dark:to-success-900/40',
    textColor: 'text-primary-600 dark:text-primary-300',
    accentColor: 'text-cyan-500 dark:text-cyan-400',
    borderColor: 'border-primary-300 dark:border-primary-600',
    particleColors: ['#6366F1', '#06B6D4', '#22C55E', '#F59E0B'],
  },
  intense: {
    emojis: ['🔥', '⚡', '💥', '🌋', '☄️', '🚀', '💎', '👑'],
    bgGradient: 'from-orange-200 via-red-200 to-yellow-200 dark:from-orange-900/40 dark:via-red-900/40 dark:to-yellow-900/40',
    textColor: 'text-red-600 dark:text-red-300',
    accentColor: 'text-orange-500 dark:text-orange-400',
    borderColor: 'border-red-400 dark:border-red-600',
    particleColors: ['#EF4444', '#F97316', '#FBBF24', '#F59E0B'],
  },
}

/**
 * Generate random particles for the celebration effect
 *
 * @param {number} count - Number of particles to generate
 * @param {string[]} colors - Array of colors to choose from
 * @returns {Array} Array of particle objects
 */
function generateParticles(count, colors) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 60, // 20-80% of container
    y: 50 + (Math.random() - 0.5) * 60,
    delay: Math.random() * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 4 + Math.random() * 4, // 4-8px
    angle: Math.random() * 360,
    distance: 40 + Math.random() * 40, // Distance to travel
  }))
}

/**
 * Generate floating emojis for the celebration
 *
 * @param {string[]} emojis - Array of emojis to choose from
 * @param {number} count - Number of emojis to generate
 * @returns {Array} Array of emoji objects
 */
function generateFloatingEmojis(emojis, count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    x: 10 + Math.random() * 80, // 10-90% of container
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 1, // 1.5-2.5s
    scale: 0.8 + Math.random() * 0.6, // 0.8-1.4x
  }))
}

/**
 * StreakCelebration Component
 *
 * @param {Object} props
 * @param {number} props.streak - Current streak count
 * @param {'playful' | 'balanced' | 'intense'} props.celebrationStyle - Animation style
 * @param {boolean} props.show - Whether to show the celebration
 * @param {Function} props.onComplete - Callback when animation finishes
 */
export default function StreakCelebration({
  streak = 3,
  celebrationStyle = 'balanced',
  show = false,
  onComplete
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [phase, setPhase] = useState('enter') // 'enter' | 'hold' | 'exit'
  const [particles, setParticles] = useState([])
  const [floatingEmojis, setFloatingEmojis] = useState([])

  const style = CELEBRATION_STYLES[celebrationStyle] || CELEBRATION_STYLES.balanced

  // Handle animation sequence
  const startCelebration = useCallback(() => {
    setIsVisible(true)
    setPhase('enter')
    setParticles(generateParticles(12, style.particleColors))
    setFloatingEmojis(generateFloatingEmojis(style.emojis, 8))

    // Phase timing:
    // Enter: 0.4s
    // Hold: 1.6s
    // Exit: 0.5s
    // Total: ~2.5s

    const holdTimer = setTimeout(() => {
      setPhase('hold')
    }, 400)

    const exitTimer = setTimeout(() => {
      setPhase('exit')
    }, 2000)

    const completeTimer = setTimeout(() => {
      setIsVisible(false)
      setParticles([])
      setFloatingEmojis([])
      onComplete?.()
    }, 2500)

    return () => {
      clearTimeout(holdTimer)
      clearTimeout(exitTimer)
      clearTimeout(completeTimer)
    }
  }, [style, onComplete])

  useEffect(() => {
    if (show) {
      return startCelebration()
    } else {
      setIsVisible(false)
      setPhase('enter')
    }
  }, [show, startCelebration])

  if (!isVisible) return null

  // Get animation class based on phase
  const getContainerAnimation = () => {
    switch (phase) {
      case 'enter':
        return 'animate-streak-celebration-enter'
      case 'exit':
        return 'animate-streak-celebration-exit'
      default:
        return ''
    }
  }

  // Get pulse animation for intense style
  const getPulseClass = () => {
    if (celebrationStyle === 'intense' && phase === 'hold') {
      return 'animate-streak-pulse'
    }
    return ''
  }

  return (
    <>
      {/* CSS Keyframes - injected inline for custom animations */}
      <style>{`
        @keyframes streakCelebrationEnter {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          60% {
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes streakCelebrationExit {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
        }

        @keyframes streakPulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.03);
            box-shadow: 0 0 40px rgba(239, 68, 68, 0.5);
          }
        }

        @keyframes streakParticle {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--tx), var(--ty)) scale(0);
          }
        }

        @keyframes streakEmojiFloat {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.5);
          }
          30% {
            opacity: 1;
            transform: translateY(0) scale(var(--emoji-scale, 1));
          }
          100% {
            opacity: 0;
            transform: translateY(-40px) scale(var(--emoji-scale, 1));
          }
        }

        @keyframes streakBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .animate-streak-celebration-enter {
          animation: streakCelebrationEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-streak-celebration-exit {
          animation: streakCelebrationExit 0.5s ease-out forwards;
        }

        .animate-streak-pulse {
          animation: streakPulse 0.6s ease-in-out infinite;
        }

        .animate-streak-particle {
          animation: streakParticle 1.2s ease-out forwards;
        }

        .animate-streak-emoji-float {
          animation: streakEmojiFloat var(--duration) ease-out forwards;
        }

        .animate-streak-bounce {
          animation: streakBounce 0.5s ease-in-out infinite;
        }
      `}</style>

      {/* Overlay backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        {/* Floating emojis */}
        {floatingEmojis.map((emoji) => (
          <div
            key={`emoji-${emoji.id}`}
            className="absolute animate-streak-emoji-float"
            style={{
              left: `${emoji.x}%`,
              top: '50%',
              fontSize: `${1.5 * emoji.scale}rem`,
              animationDelay: `${emoji.delay}s`,
              '--duration': `${emoji.duration}s`,
              '--emoji-scale': emoji.scale,
            }}
          >
            {emoji.emoji}
          </div>
        ))}

        {/* Main celebration card */}
        <div
          className={`
            absolute top-1/2 left-1/2
            w-72 max-w-[85vw]
            bg-gradient-to-br ${style.bgGradient}
            border-2 ${style.borderColor}
            rounded-2xl p-6
            shadow-2xl
            ${getContainerAnimation()}
            ${getPulseClass()}
          `}
          style={{
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Particles */}
          {particles.map((particle) => {
            const angle = particle.angle * (Math.PI / 180)
            const tx = Math.cos(angle) * particle.distance
            const ty = Math.sin(angle) * particle.distance

            return (
              <div
                key={`particle-${particle.id}`}
                className="absolute top-1/2 left-1/2 rounded-full animate-streak-particle"
                style={{
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  backgroundColor: particle.color,
                  animationDelay: `${particle.delay}s`,
                  '--tx': `${tx}px`,
                  '--ty': `${ty}px`,
                }}
              />
            )
          })}

          {/* Content */}
          <div className="relative text-center">
            {/* Main emoji based on style */}
            <div
              className={`
                text-5xl mb-3
                ${celebrationStyle === 'playful' ? 'animate-streak-bounce' : ''}
                ${celebrationStyle === 'intense' ? 'animate-flame-flicker' : ''}
              `}
            >
              {celebrationStyle === 'playful' && '⭐'}
              {celebrationStyle === 'balanced' && '🎉'}
              {celebrationStyle === 'intense' && '🔥'}
            </div>

            {/* Streak count - prominent display */}
            <div className={`text-4xl font-bold mb-2 ${style.textColor}`}>
              {streak}
              <span className="text-2xl ml-1">in a row!</span>
            </div>

            {/* Encouraging message */}
            <p className={`text-sm font-medium ${style.accentColor}`}>
              {celebrationStyle === 'playful' && 'You\'re a star!'}
              {celebrationStyle === 'balanced' && 'Keep it up!'}
              {celebrationStyle === 'intense' && 'Unstoppable!'}
            </p>

            {/* Secondary emojis row */}
            <div className="flex justify-center gap-2 mt-3 text-xl opacity-80">
              {style.emojis.slice(0, 4).map((emoji, i) => (
                <span
                  key={i}
                  className="animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {emoji}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
