/**
 * MicroCelebration Component
 *
 * A lightweight celebration overlay for quiz correct answers.
 * Features floating "+XP" text, random encouraging messages,
 * and mini particle burst effect.
 *
 * Props:
 * - isActive: boolean - Whether to show the celebration
 * - xpGained: number - Amount of XP to display
 * - streak: number - Current streak count (for potential future variations)
 * - onComplete: function - Callback when animation finishes (~800ms)
 */

import { useEffect, useState, useCallback, useMemo } from 'react'

/**
 * Encouraging messages shown randomly during celebration
 */
const ENCOURAGING_MESSAGES = ['Great!', 'Nice!', 'Awesome!', 'Yes!', 'Perfect!']

/**
 * Particle colors for the burst effect
 */
const PARTICLE_COLORS = [
  '#6366F1', // Primary indigo
  '#22C55E', // Success green
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#EC4899', // Pink
]

/**
 * Generate random particles for the burst effect
 *
 * @param {number} count - Number of particles (6-10)
 * @returns {Array} Array of particle objects with position, color, and animation data
 */
function generateParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 60, // 20-80% of container
    y: 50 + (Math.random() - 0.5) * 40, // 30-70% of container
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    size: 4 + Math.random() * 4, // 4-8px
    delay: Math.random() * 0.15, // 0-150ms stagger
    angle: Math.random() * 360, // Random direction
    distance: 30 + Math.random() * 30, // 30-60px travel distance
  }))
}

/**
 * Get a random encouraging message
 *
 * @returns {string} Random message from ENCOURAGING_MESSAGES
 */
function getRandomMessage() {
  return ENCOURAGING_MESSAGES[
    Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)
  ]
}

/**
 * MicroCelebration Component
 *
 * Displays a brief celebration animation when quiz answers are correct.
 */
export default function MicroCelebration({
  isActive = false,
  xpGained = 10,
  streak = 1,
  onComplete,
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [particles, setParticles] = useState([])
  const [message, setMessage] = useState('')

  // Generate particle count between 6-10
  const particleCount = useMemo(() => 6 + Math.floor(Math.random() * 5), [])

  // Handle animation lifecycle
  const startCelebration = useCallback(() => {
    setIsVisible(true)
    setParticles(generateParticles(particleCount))
    setMessage(getRandomMessage())

    // Complete after 800ms
    const completeTimer = setTimeout(() => {
      setIsVisible(false)
      setParticles([])
      onComplete?.()
    }, 800)

    return () => {
      clearTimeout(completeTimer)
    }
  }, [particleCount, onComplete])

  useEffect(() => {
    if (isActive) {
      return startCelebration()
    } else {
      setIsVisible(false)
    }
  }, [isActive, startCelebration])

  if (!isVisible) return null

  return (
    <>
      {/* CSS Keyframes for animations */}
      <style>{`
        @keyframes microCelebrationFadeUp {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.8);
          }
          30% {
            opacity: 1;
            transform: translateY(-5px) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translateY(-30px) scale(1);
          }
        }

        @keyframes microCelebrationParticle {
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
            transform: translate(
              calc(-50% + var(--tx)),
              calc(-50% + var(--ty))
            ) scale(0);
          }
        }

        @keyframes microCelebrationMessage {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          30% {
            opacity: 1;
            transform: scale(1.15);
          }
          50% {
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.9);
          }
        }

        .animate-micro-celebration-fade-up {
          animation: microCelebrationFadeUp 0.8s ease-out forwards;
        }

        .animate-micro-celebration-particle {
          animation: microCelebrationParticle 0.6s ease-out forwards;
        }

        .animate-micro-celebration-message {
          animation: microCelebrationMessage 0.8s ease-out forwards;
        }
      `}</style>

      {/* Celebration container */}
      <div
        data-testid="micro-celebration"
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
        role="status"
      >
        {/* Main content wrapper */}
        <div className="relative">
          {/* Particles */}
          {particles.map((particle) => {
            const angleRad = particle.angle * (Math.PI / 180)
            const tx = Math.cos(angleRad) * particle.distance
            const ty = Math.sin(angleRad) * particle.distance

            return (
              <div
                key={`particle-${particle.id}`}
                data-testid="particle"
                className="absolute rounded-full animate-micro-celebration-particle"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
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

          {/* XP gained text */}
          <div
            data-testid="xp-text"
            className="
              text-center
              animate-micro-celebration-fade-up
            "
          >
            <div
              className="
                text-2xl font-bold
                text-success-500 dark:text-success-400
                drop-shadow-md
              "
            >
              +{xpGained}
              <span className="text-lg ml-1">XP</span>
            </div>
          </div>

          {/* Encouraging message */}
          <div
            className="
              absolute top-full left-1/2 -translate-x-1/2 mt-1
              animate-micro-celebration-message
            "
          >
            <span
              className="
                text-lg font-semibold
                text-primary-500 dark:text-primary-400
                drop-shadow-sm
                whitespace-nowrap
              "
            >
              {message}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
