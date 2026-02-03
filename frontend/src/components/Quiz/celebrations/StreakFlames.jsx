/**
 * StreakFlames - Animated flame celebration for answer streaks
 *
 * Displays animated flames on the sides of the screen when users
 * achieve streak milestones. Intensity increases with higher streaks.
 *
 * @param {Object} props
 * @param {number} props.streak - Current streak count
 * @param {'low'|'medium'|'high'|'inferno'} props.intensity - Flame intensity level
 * @param {boolean} props.show - Whether to show the flames
 * @param {'left'|'right'|'both'} props.position - Which side(s) to show flames
 */

import { useEffect, useRef, useMemo } from 'react'
import PropTypes from 'prop-types'
import { playStreakSound } from '@/utils/soundEffects'

/**
 * Particle count for each intensity level.
 */
const PARTICLE_COUNTS = {
  low: 3,
  medium: 6,
  high: 10,
  inferno: 15,
}

/**
 * Intensity-specific color classes.
 */
const INTENSITY_COLORS = {
  low: {
    primary: 'bg-orange-400',
    secondary: 'bg-yellow-400',
    glow: 'shadow-orange-500/50',
  },
  medium: {
    primary: 'bg-orange-500',
    secondary: 'bg-red-400',
    glow: 'shadow-orange-500/60',
  },
  high: {
    primary: 'bg-red-500',
    secondary: 'bg-orange-400',
    glow: 'shadow-red-500/70',
  },
  inferno: {
    primary: 'bg-red-600',
    secondary: 'bg-yellow-300',
    glow: 'shadow-red-600/80',
  },
}

/**
 * Generate flame particles for one side.
 */
function FlameParticles({ count, intensity, side }) {
  const colors = INTENSITY_COLORS[intensity] || INTENSITY_COLORS.medium

  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div
          key={`${side}-flame-${i}`}
          data-testid={`flame-particle-${side}-${i}`}
          className={`
            absolute w-4 h-6 rounded-full
            ${i % 2 === 0 ? colors.primary : colors.secondary}
            animate-flicker
            opacity-80
          `}
          style={{
            bottom: `${10 + (i * (80 / count))}%`,
            [side]: `${5 + Math.random() * 15}%`,
            animationDelay: `${i * 0.08}s`,
            animationDuration: `${0.4 + Math.random() * 0.3}s`,
            transform: `scale(${0.8 + Math.random() * 0.4})`,
          }}
        />
      ))}
    </>
  )
}

FlameParticles.propTypes = {
  count: PropTypes.number.isRequired,
  intensity: PropTypes.string.isRequired,
  side: PropTypes.oneOf(['left', 'right']).isRequired,
}

export default function StreakFlames({
  streak,
  intensity = 'medium',
  show,
  position = 'both',
}) {
  const soundPlayedRef = useRef(false)

  // Get particle count based on intensity
  const particleCount = useMemo(() => {
    return PARTICLE_COUNTS[intensity] || PARTICLE_COUNTS.medium
  }, [intensity])

  // Determine which sides to show
  const showLeft = position === 'left' || position === 'both'
  const showRight = position === 'right' || position === 'both'

  // Play sound when shown
  useEffect(() => {
    if (!show) {
      soundPlayedRef.current = false
      return
    }

    if (!soundPlayedRef.current) {
      try {
        playStreakSound()
      } catch {
        // Audio may not be available, silently continue
      }
      soundPlayedRef.current = true
    }
  }, [show])

  // Don't render if not shown
  if (!show) {
    return null
  }

  // Get valid intensity for classes
  const validIntensity = INTENSITY_COLORS[intensity] ? intensity : 'medium'

  // Get valid position for classes
  const validPosition = ['left', 'right', 'both'].includes(position) ? position : 'both'

  return (
    <div
      data-testid="streak-flames"
      data-intensity={validIntensity}
      data-position={validPosition}
      role="img"
      aria-label={`${streak} answer streak! Flames celebration`}
      className={`
        fixed inset-0 z-30
        pointer-events-none
        overflow-hidden
        animate-fade-in
        ${validIntensity}
        ${validPosition}
      `}
    >
      {/* Left side flames */}
      {showLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-20">
          <FlameParticles
            count={particleCount}
            intensity={validIntensity}
            side="left"
          />
        </div>
      )}

      {/* Right side flames */}
      {showRight && (
        <div className="absolute right-0 top-0 bottom-0 w-20">
          <FlameParticles
            count={particleCount}
            intensity={validIntensity}
            side="right"
          />
        </div>
      )}

      {/* Streak counter - centered bottom */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div
          className={`
            flex items-center gap-2
            px-4 py-2
            rounded-full
            bg-gradient-to-r from-orange-500 to-red-500
            text-white font-bold text-xl
            shadow-lg ${INTENSITY_COLORS[validIntensity]?.glow || ''}
            animate-pulse
          `}
        >
          <span aria-hidden="true">🔥</span>
          <span>{streak}</span>
          <span className="text-sm font-medium">streak!</span>
        </div>
      </div>

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes flicker {
          0%, 100% {
            opacity: 0.7;
            transform: translateY(0) scaleY(1);
          }
          50% {
            opacity: 1;
            transform: translateY(-8px) scaleY(1.2);
          }
        }
        .animate-flicker {
          animation: flicker 0.5s ease-in-out infinite;
        }
        @keyframes fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

StreakFlames.propTypes = {
  streak: PropTypes.number,
  intensity: PropTypes.oneOf(['low', 'medium', 'high', 'inferno']),
  show: PropTypes.bool,
  position: PropTypes.oneOf(['left', 'right', 'both']),
}
