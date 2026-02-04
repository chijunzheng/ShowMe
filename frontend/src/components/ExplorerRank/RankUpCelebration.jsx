/**
 * RankUpCelebration Component
 *
 * Celebration modal shown when user achieves a new explorer rank.
 * Features animated transitions and particle effects.
 *
 * Animation sequence:
 * 1. Backdrop fades in
 * 2. Old rank icon shrinks/fades
 * 3. New rank icon scales up with glow effect
 * 4. Title "Rank Up!" with new rank name
 * 5. Particle effects (stars, sparkles)
 * 6. Auto-dismiss after 3s or tap to dismiss
 *
 * @param {Object} props
 * @param {boolean} props.isVisible - Whether to show celebration
 * @param {Object} props.newRank - The newly achieved rank
 * @param {Object} props.previousRank - The rank they had before
 * @param {Function} props.onDismiss - Close the celebration
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import Confetti from '../Confetti'
import { getRankTailwindColors } from './explorerRankUtils'

/**
 * Animation phases for the rank celebration sequence
 */
const ANIMATION_PHASES = {
  ENTERING: 'entering',
  OLD_RANK_EXIT: 'old_rank_exit',
  NEW_RANK_REVEAL: 'new_rank_reveal',
  RANK_UP_TEXT: 'rank_up_text',
  RANK_NAME: 'rank_name',
  DESCRIPTION: 'description',
  IDLE: 'idle',
  EXITING: 'exiting',
}

/**
 * Phase timing in milliseconds
 */
const PHASE_TIMINGS = {
  ENTER_DELAY: 100,
  OLD_RANK_EXIT: 400,
  NEW_RANK_REVEAL: 800,
  RANK_UP_TEXT: 1300,
  RANK_NAME: 1800,
  DESCRIPTION: 2300,
  IDLE: 2800,
  AUTO_DISMISS: 5000,
  EXIT_DURATION: 300,
}

/**
 * Particle component for celebration sparkles
 */
function CelebrationParticle({ delay = 0, angle = 0, distance = 60 }) {
  const x = Math.cos((angle * Math.PI) / 180) * distance + 50
  const y = Math.sin((angle * Math.PI) / 180) * distance + 50

  return (
    <div
      className="absolute w-3 h-3 pointer-events-none animate-tier-particle"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}ms`,
        transform: 'translate(-50%, -50%)',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full text-yellow-300 drop-shadow-glow"
      >
        <path
          d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z"
          fill="currentColor"
        />
      </svg>
    </div>
  )
}

CelebrationParticle.propTypes = {
  delay: PropTypes.number,
  angle: PropTypes.number,
  distance: PropTypes.number,
}

/**
 * Generate particles in a ring around the center
 */
function generateParticles(count = 12) {
  const particles = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360
    const delay = i * 80 + 500
    const distance = 45 + Math.random() * 15
    particles.push({ id: i, angle, delay, distance })
  }
  return particles
}

export default function RankUpCelebration({
  isVisible,
  newRank,
  previousRank,
  onDismiss,
}) {
  const [phase, setPhase] = useState(ANIMATION_PHASES.ENTERING)
  const [showConfetti, setShowConfetti] = useState(false)
  const autoDismissRef = useRef(null)
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  )

  // Get color schemes
  const newRankColors = getRankTailwindColors(newRank?.level || 1)
  const previousRankColors = getRankTailwindColors(previousRank?.level || 1)

  // Generate celebration particles
  const particles = generateParticles(12)

  /**
   * Handle dismiss with exit animation
   */
  const handleDismiss = useCallback(() => {
    // Clear auto-dismiss timer
    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current)
    }

    setPhase(ANIMATION_PHASES.EXITING)
    setTimeout(() => {
      onDismiss?.()
    }, PHASE_TIMINGS.EXIT_DURATION)
  }, [onDismiss])

  /**
   * Run animation sequence when visible
   */
  useEffect(() => {
    if (!isVisible || !newRank) return

    // Reset to initial state
    setPhase(ANIMATION_PHASES.ENTERING)
    setShowConfetti(true)

    // If user prefers reduced motion, skip to idle quickly
    if (prefersReducedMotion.current) {
      setPhase(ANIMATION_PHASES.IDLE)
      autoDismissRef.current = setTimeout(() => {
        onDismiss?.()
      }, PHASE_TIMINGS.AUTO_DISMISS)
      return () => {
        if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
      }
    }

    // Phase progression timers
    const timers = []

    timers.push(
      setTimeout(() => {
        setPhase(ANIMATION_PHASES.OLD_RANK_EXIT)
      }, PHASE_TIMINGS.OLD_RANK_EXIT)
    )

    timers.push(
      setTimeout(() => {
        setPhase(ANIMATION_PHASES.NEW_RANK_REVEAL)
      }, PHASE_TIMINGS.NEW_RANK_REVEAL)
    )

    timers.push(
      setTimeout(() => {
        setPhase(ANIMATION_PHASES.RANK_UP_TEXT)
      }, PHASE_TIMINGS.RANK_UP_TEXT)
    )

    timers.push(
      setTimeout(() => {
        setPhase(ANIMATION_PHASES.RANK_NAME)
      }, PHASE_TIMINGS.RANK_NAME)
    )

    timers.push(
      setTimeout(() => {
        setPhase(ANIMATION_PHASES.DESCRIPTION)
      }, PHASE_TIMINGS.DESCRIPTION)
    )

    timers.push(
      setTimeout(() => {
        setPhase(ANIMATION_PHASES.IDLE)
      }, PHASE_TIMINGS.IDLE)
    )

    // Auto-dismiss timer
    autoDismissRef.current = setTimeout(() => {
      handleDismiss()
    }, PHASE_TIMINGS.AUTO_DISMISS)

    // Cleanup timers on unmount
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    }
  }, [isVisible, newRank, onDismiss, handleDismiss])

  /**
   * Handle confetti completion
   */
  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false)
  }, [])

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleDismiss()
      }
    },
    [handleDismiss]
  )

  // Don't render if not visible or no rank
  if (!isVisible || !newRank) {
    return null
  }

  // Calculate animation states based on phase
  const isOverlayVisible = phase !== ANIMATION_PHASES.EXITING
  const showOldRank =
    phase === ANIMATION_PHASES.ENTERING || phase === ANIMATION_PHASES.OLD_RANK_EXIT
  const showNewRank = [
    ANIMATION_PHASES.NEW_RANK_REVEAL,
    ANIMATION_PHASES.RANK_UP_TEXT,
    ANIMATION_PHASES.RANK_NAME,
    ANIMATION_PHASES.DESCRIPTION,
    ANIMATION_PHASES.IDLE,
  ].includes(phase)
  const showRankUpText = [
    ANIMATION_PHASES.RANK_UP_TEXT,
    ANIMATION_PHASES.RANK_NAME,
    ANIMATION_PHASES.DESCRIPTION,
    ANIMATION_PHASES.IDLE,
  ].includes(phase)
  const showRankName = [
    ANIMATION_PHASES.RANK_NAME,
    ANIMATION_PHASES.DESCRIPTION,
    ANIMATION_PHASES.IDLE,
  ].includes(phase)
  const showDescription = [ANIMATION_PHASES.DESCRIPTION, ANIMATION_PHASES.IDLE].includes(
    phase
  )

  return (
    <div
      className={`
        fixed inset-0 z-50
        flex items-center justify-center
        transition-opacity duration-300
        ${phase === ANIMATION_PHASES.EXITING ? 'opacity-0' : 'opacity-100'}
      `}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rank-celebration-title"
      onClick={handleDismiss}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Animated backdrop with gradient */}
      <div
        className={`
          absolute inset-0
          bg-gradient-to-br ${newRankColors.gradient}
          transition-all duration-700
          ${isOverlayVisible ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          backgroundImage: `
            linear-gradient(135deg,
              rgba(0, 0, 0, 0.4) 0%,
              rgba(0, 0, 0, 0.6) 100%
            )
          `,
        }}
        aria-hidden="true"
      />

      {/* Confetti overlay */}
      <Confetti
        isActive={showConfetti}
        duration={4000}
        onComplete={handleConfettiComplete}
      />

      {/* Celebration particles around new rank badge */}
      {showNewRank &&
        particles.map((particle) => (
          <CelebrationParticle
            key={particle.id}
            angle={particle.angle}
            delay={particle.delay}
            distance={particle.distance}
          />
        ))}

      {/* Main celebration content */}
      <div
        className="relative z-10 flex flex-col items-center px-6 max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rank badge container */}
        <div className="relative mb-6 h-40 w-40 flex items-center justify-center">
          {/* Old rank badge (shrinks away) */}
          {showOldRank && previousRank && (
            <div
              className={`
                absolute w-28 h-28
                rounded-2xl overflow-hidden
                flex items-center justify-center
                shadow-2xl
                bg-gradient-to-br ${previousRankColors.gradient}
                transition-all duration-500
                ${
                  phase === ANIMATION_PHASES.OLD_RANK_EXIT
                    ? 'scale-0 opacity-0 rotate-12'
                    : 'scale-100 opacity-100 rotate-0'
                }
              `}
            >
              <span className="text-6xl select-none">{previousRank.icon}</span>
            </div>
          )}

          {/* New rank badge (zooms in with bounce) */}
          {showNewRank && (
            <div
              className={`
                absolute w-32 h-32
                rounded-2xl overflow-hidden
                flex items-center justify-center
                shadow-2xl
                bg-gradient-to-br ${newRankColors.gradient}
                ring-4 ring-white/40 ring-offset-4 ring-offset-transparent
                animate-bounce-in
              `}
              style={{
                boxShadow:
                  '0 0 60px rgba(255, 255, 255, 0.4), 0 25px 50px rgba(0, 0, 0, 0.3)',
              }}
            >
              <span className="text-7xl select-none animate-pulse-slow">
                {newRank.icon}
              </span>
            </div>
          )}
        </div>

        {/* Rank Up! text */}
        <div
          className={`
            text-center mb-2
            transition-all duration-500
            ${showRankUpText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          <p
            id="rank-celebration-title"
            className="text-white text-2xl font-bold tracking-wide uppercase drop-shadow-lg"
          >
            Rank Up!
          </p>
        </div>

        {/* Rank name */}
        <div
          className={`
            text-center mb-2
            transition-all duration-500
            ${showRankName ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'}
          `}
        >
          <h2 className="text-white text-4xl font-bold drop-shadow-lg">
            {newRank.title}
          </h2>
        </div>

        {/* Description */}
        <div
          className={`
            text-center mb-6
            transition-all duration-500
            ${showDescription ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          <p className="text-white/80 text-lg">{newRank.description}</p>
        </div>

        {/* Tap to dismiss hint */}
        <div
          className={`
            text-center
            transition-all duration-500
            ${phase === ANIMATION_PHASES.IDLE ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <p className="text-white/60 text-sm">Tap anywhere to continue</p>
        </div>
      </div>
    </div>
  )
}

RankUpCelebration.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  newRank: PropTypes.shape({
    level: PropTypes.number,
    id: PropTypes.string,
    title: PropTypes.string,
    icon: PropTypes.string,
    minTopics: PropTypes.number,
    description: PropTypes.string,
  }),
  previousRank: PropTypes.shape({
    level: PropTypes.number,
    id: PropTypes.string,
    title: PropTypes.string,
    icon: PropTypes.string,
    minTopics: PropTypes.number,
    description: PropTypes.string,
  }),
  onDismiss: PropTypes.func.isRequired,
}
