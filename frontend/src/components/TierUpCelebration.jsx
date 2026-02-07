/**
 * TierUpCelebration Component
 * UI008: Tier upgrade celebration overlay when user reaches new tier
 *
 * Animation sequence:
 * 1. Full-screen overlay with tier gradient colors
 * 2. Old tier badge shrinks away
 * 3. New tier badge zooms in with particles
 * 4. "Level Up!" text, then tier name announced
 * 5. Brief world transformation preview
 * 6. Continue button
 *
 * Test Cases:
 * T001: Earn XP to reach tier threshold (100 XP)
 * T002: Verify tier-up celebration triggers
 * T003: Verify new tier badge shown prominently
 * T004: Verify 'Sprouting!' tier name announced
 * T005: Verify world transformation preview shown
 * T006: Verify home screen XP bar updates
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Confetti from './Confetti'
import { playTierUpSound } from '../utils/soundEffects'

/**
 * Tier information configuration
 * Contains visual styling and descriptions for each tier level
 */
const TIER_INFO = {
  barren: {
    name: 'Barren',
    icon: '🏜️',
    color: 'from-slate-400 to-slate-600',
    bgColor: 'bg-gradient-to-br from-slate-400 to-slate-600',
    description: 'Your journey begins...',
    xpRequired: 0,
  },
  sprouting: {
    name: 'Sprouting',
    icon: '🌱',
    color: 'from-green-400 to-green-600',
    bgColor: 'bg-gradient-to-br from-green-400 to-green-600',
    description: 'Life emerges!',
    xpRequired: 100,
  },
  growing: {
    name: 'Growing',
    icon: '🌿',
    color: 'from-emerald-400 to-teal-600',
    bgColor: 'bg-gradient-to-br from-emerald-400 to-teal-600',
    description: 'Your world flourishes!',
    xpRequired: 300,
  },
  thriving: {
    name: 'Thriving',
    icon: '🌳',
    color: 'from-cyan-400 to-blue-600',
    bgColor: 'bg-gradient-to-br from-cyan-400 to-blue-600',
    description: 'A vibrant ecosystem!',
    xpRequired: 600,
  },
  legendary: {
    name: 'Legendary',
    icon: '✨',
    color: 'from-purple-400 to-indigo-600',
    bgColor: 'bg-gradient-to-br from-purple-400 to-indigo-600',
    description: 'A world of wonder!',
    xpRequired: 1000,
  },
}

/**
 * Default tier info fallback
 */
const DEFAULT_TIER_INFO = {
  name: 'Unknown',
  icon: '❓',
  color: 'from-gray-400 to-gray-600',
  bgColor: 'bg-gradient-to-br from-gray-400 to-gray-600',
  description: 'Keep exploring!',
  xpRequired: 0,
}

/**
 * Animation phases for the tier celebration sequence
 */
const ANIMATION_PHASES = {
  ENTERING: 'entering',
  OLD_TIER_EXIT: 'old_tier_exit',
  NEW_TIER_REVEAL: 'new_tier_reveal',
  LEVEL_UP_TEXT: 'level_up_text',
  TIER_NAME: 'tier_name',
  WORLD_PREVIEW: 'world_preview',
  BUTTONS_REVEAL: 'buttons_reveal',
  IDLE: 'idle',
  EXITING: 'exiting',
}

/**
 * Phase timing in milliseconds
 */
const PHASE_TIMINGS = {
  ENTER_DELAY: 100,
  OLD_TIER_EXIT: 400,
  NEW_TIER_REVEAL: 900,
  LEVEL_UP_TEXT: 1400,
  TIER_NAME: 1900,
  WORLD_PREVIEW: 2400,
  BUTTONS_REVEAL: 3200,
  IDLE: 3500,
  EXIT_DURATION: 300,
}

/**
 * Particle component for celebration sparkles around the tier badge
 */
function CelebrationParticle({ delay = 0, angle = 0, distance = 60 }) {
  const x = Math.cos(angle * Math.PI / 180) * distance + 50
  const y = Math.sin(angle * Math.PI / 180) * distance + 50

  return (
    <div
      className="absolute w-3 h-3 pointer-events-none animate-tier-particle"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}ms`,
        transform: 'translate(-50%, -50%)',
      }}
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

/**
 * World transformation preview component
 * Shows a mini comparison of old tier vs new tier world state
 */
function WorldTransformPreview({ fromTier, toTier }) {
  const fromInfo = TIER_INFO[fromTier] || DEFAULT_TIER_INFO
  const toInfo = TIER_INFO[toTier] || DEFAULT_TIER_INFO

  return (
    <div className="flex items-center justify-center gap-4 px-4 py-3 animate-fade-in-up">
      {/* Old tier mini world */}
      <div className="flex flex-col items-center">
        <div
          className={`
            w-16 h-16 rounded-lg shadow-md
            flex items-center justify-center
            bg-gradient-to-br ${fromInfo.color}
            opacity-60
          `}
        >
          <span className="text-2xl filter grayscale-[30%]">{fromInfo.icon}</span>
        </div>
        <span className="text-xs text-white/60 mt-1">{fromInfo.name}</span>
      </div>

      {/* Transform arrow with animation */}
      <div className="flex flex-col items-center animate-pulse">
        <svg
          className="w-8 h-8 text-white/80"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </div>

      {/* New tier mini world */}
      <div className="flex flex-col items-center">
        <div
          className={`
            w-16 h-16 rounded-lg shadow-lg
            flex items-center justify-center
            bg-gradient-to-br ${toInfo.color}
            ring-2 ring-white/50 ring-offset-2 ring-offset-transparent
          `}
        >
          <span className="text-2xl">{toInfo.icon}</span>
        </div>
        <span className="text-xs text-white font-medium mt-1">{toInfo.name}</span>
      </div>
    </div>
  )
}

/**
 * TierUpCelebration - Full-screen celebration overlay for tier upgrades
 *
 * @param {Object} props - Component props
 * @param {string} props.fromTier - The previous tier (e.g., 'barren')
 * @param {string} props.toTier - The new tier (e.g., 'sprouting')
 * @param {Function} props.onComplete - Called when user clicks Continue
 * @param {Function} [props.onViewWorld] - Optional callback to view world
 */
function TierUpCelebration({
  fromTier,
  toTier,
  onComplete,
  onViewWorld,
}) {
  const [phase, setPhase] = useState(ANIMATION_PHASES.ENTERING)
  const [showConfetti, setShowConfetti] = useState(false)
  const soundPlayedRef = useRef(false)

  // Get tier info
  const fromTierInfo = TIER_INFO[fromTier] || DEFAULT_TIER_INFO
  const toTierInfo = TIER_INFO[toTier] || DEFAULT_TIER_INFO

  // Generate celebration particles
  const particles = generateParticles(12)

  /**
   * Run animation sequence on mount
   */
  useEffect(() => {
    if (!toTier) return

    // Play tier-up sound effect once
    if (!soundPlayedRef.current) {
      playTierUpSound()
      soundPlayedRef.current = true
    }

    // Start confetti
    setShowConfetti(true)

    // Phase progression timers
    const timers = []

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.OLD_TIER_EXIT)
    }, PHASE_TIMINGS.OLD_TIER_EXIT))

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.NEW_TIER_REVEAL)
    }, PHASE_TIMINGS.NEW_TIER_REVEAL))

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.LEVEL_UP_TEXT)
    }, PHASE_TIMINGS.LEVEL_UP_TEXT))

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.TIER_NAME)
    }, PHASE_TIMINGS.TIER_NAME))

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.WORLD_PREVIEW)
    }, PHASE_TIMINGS.WORLD_PREVIEW))

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.BUTTONS_REVEAL)
    }, PHASE_TIMINGS.BUTTONS_REVEAL))

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.IDLE)
    }, PHASE_TIMINGS.IDLE))

    // Cleanup timers on unmount
    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [toTier])

  /**
   * Handle View World button click
   */
  const handleViewWorld = useCallback(() => {
    setPhase(ANIMATION_PHASES.EXITING)
    setTimeout(() => {
      onViewWorld?.()
    }, PHASE_TIMINGS.EXIT_DURATION)
  }, [onViewWorld])

  /**
   * Handle Continue button click
   */
  const handleContinue = useCallback(() => {
    setPhase(ANIMATION_PHASES.EXITING)
    setTimeout(() => {
      onComplete?.()
    }, PHASE_TIMINGS.EXIT_DURATION)
  }, [onComplete])

  /**
   * Handle confetti animation completion
   */
  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false)
  }, [])

  // Guard: No tier provided
  if (!toTier) {
    return null
  }

  // Calculate animation states based on phase
  const isOverlayVisible = phase !== ANIMATION_PHASES.EXITING
  const showOldTier = phase === ANIMATION_PHASES.ENTERING || phase === ANIMATION_PHASES.OLD_TIER_EXIT
  const showNewTier = [
    ANIMATION_PHASES.NEW_TIER_REVEAL,
    ANIMATION_PHASES.LEVEL_UP_TEXT,
    ANIMATION_PHASES.TIER_NAME,
    ANIMATION_PHASES.WORLD_PREVIEW,
    ANIMATION_PHASES.BUTTONS_REVEAL,
    ANIMATION_PHASES.IDLE,
  ].includes(phase)
  const showLevelUpText = [
    ANIMATION_PHASES.LEVEL_UP_TEXT,
    ANIMATION_PHASES.TIER_NAME,
    ANIMATION_PHASES.WORLD_PREVIEW,
    ANIMATION_PHASES.BUTTONS_REVEAL,
    ANIMATION_PHASES.IDLE,
  ].includes(phase)
  const showTierName = [
    ANIMATION_PHASES.TIER_NAME,
    ANIMATION_PHASES.WORLD_PREVIEW,
    ANIMATION_PHASES.BUTTONS_REVEAL,
    ANIMATION_PHASES.IDLE,
  ].includes(phase)
  const showWorldPreview = [
    ANIMATION_PHASES.WORLD_PREVIEW,
    ANIMATION_PHASES.BUTTONS_REVEAL,
    ANIMATION_PHASES.IDLE,
  ].includes(phase)
  const showButtons = [
    ANIMATION_PHASES.BUTTONS_REVEAL,
    ANIMATION_PHASES.IDLE,
  ].includes(phase)

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
      aria-labelledby="tier-celebration-title"
    >
      {/* Animated backdrop with tier gradient */}
      <div
        className={`
          absolute inset-0
          bg-gradient-to-br ${toTierInfo.color}
          transition-all duration-700
          ${isOverlayVisible ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          backgroundImage: `
            linear-gradient(135deg,
              rgba(0,0,0,0.3) 0%,
              rgba(0,0,0,0.5) 100%
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

      {/* Celebration particles around new tier badge */}
      {showNewTier && particles.map(particle => (
        <CelebrationParticle
          key={particle.id}
          angle={particle.angle}
          delay={particle.delay}
          distance={particle.distance}
        />
      ))}

      {/* Main celebration content */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-sm">
        {/* Tier badge container */}
        <div className="relative mb-6 h-40 w-40 flex items-center justify-center">
          {/* Old tier badge (shrinks away) */}
          {showOldTier && (
            <div
              className={`
                absolute w-32 h-32
                rounded-2xl overflow-hidden
                flex items-center justify-center
                shadow-2xl
                bg-gradient-to-br ${fromTierInfo.color}
                transition-all duration-500
                ${phase === ANIMATION_PHASES.OLD_TIER_EXIT
                  ? 'scale-0 opacity-0 rotate-12'
                  : 'scale-100 opacity-100 rotate-0'
                }
              `}
            >
              <span className="text-7xl select-none">{fromTierInfo.icon}</span>
            </div>
          )}

          {/* New tier badge (zooms in with bounce) */}
          {showNewTier && (
            <div
              className={`
                absolute w-36 h-36
                rounded-2xl overflow-hidden
                flex items-center justify-center
                shadow-2xl
                bg-gradient-to-br ${toTierInfo.color}
                ring-4 ring-white/40 ring-offset-4 ring-offset-transparent
                animate-bounce-in
              `}
              style={{
                boxShadow: '0 0 60px rgba(255, 255, 255, 0.4), 0 25px 50px rgba(0, 0, 0, 0.3)',
              }}
            >
              <span className="text-8xl select-none animate-pulse-slow">{toTierInfo.icon}</span>
            </div>
          )}
        </div>

        {/* Level Up! text */}
        <div
          className={`
            text-center mb-2
            transition-all duration-500
            ${showLevelUpText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          <p
            id="tier-celebration-title"
            className="text-white text-2xl font-bold tracking-wide uppercase drop-shadow-lg"
          >
            Level Up!
          </p>
        </div>

        {/* Tier name announcement (T004) */}
        <div
          className={`
            text-center mb-4
            transition-all duration-500
            ${showTierName ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'}
          `}
        >
          <h2 className="text-white text-4xl font-bold drop-shadow-lg mb-2">
            {toTierInfo.name}!
          </h2>
          <p className="text-white/80 text-lg">
            {toTierInfo.description}
          </p>
        </div>

        {/* World transformation preview (T005) */}
        <div
          className={`
            mb-6
            transition-all duration-500
            ${showWorldPreview ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          <p className="text-white/60 text-xs uppercase tracking-wider text-center mb-2">
            Your World Evolves
          </p>
          <WorldTransformPreview fromTier={fromTier} toTier={toTier} />
        </div>

        {/* Action buttons */}
        <div
          className={`
            flex flex-col sm:flex-row gap-3 w-full
            transition-all duration-500
            ${showButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          {/* View World button (if callback provided) */}
          {onViewWorld && (
            <button
              onClick={handleViewWorld}
              disabled={!showButtons}
              className="
                flex-1 px-6 py-3 rounded-xl
                bg-white text-slate-700 font-semibold
                hover:bg-white/90 hover:scale-105
                active:scale-95
                transition-all duration-200
                shadow-lg hover:shadow-xl
                focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              View World
            </button>
          )}

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!showButtons}
            className={`
              flex-1 px-6 py-3 rounded-xl
              font-semibold
              transition-all duration-200
              shadow-lg
              focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${onViewWorld
                ? 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                : 'bg-white text-slate-700 hover:bg-white/90'
              }
              hover:scale-105 active:scale-95
            `}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

// Export tier info for use in other components
export { TIER_INFO }

export default TierUpCelebration
