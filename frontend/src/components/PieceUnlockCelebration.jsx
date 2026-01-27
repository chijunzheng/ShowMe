/**
 * PieceUnlockCelebration Component
 * WB010: Celebration overlay when a world piece is unlocked after passing a quiz
 *
 * Animation sequence:
 * 1. Overlay fades in with confetti
 * 2. Piece image zooms in from center with bounce easing
 * 3. "New piece unlocked!" text appears
 * 4. Piece name and zone badge shown
 * 5. Buttons: "View in World" and "Continue"
 *
 * T001: Pass quiz for volcano topic
 * T002: Verify celebration animation plays
 * T003: Verify 'New piece unlocked!' message shown
 * T004: Verify piece added to world state
 * T005: Navigate to world view and verify piece visible
 * T006: Verify piece is in correct zone (nature for volcano)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Confetti from './Confetti'
import { playAchievementSound } from '../utils/soundEffects'

/**
 * Zone badge color configurations
 * Maps zone types to their visual styling
 */
const ZONE_BADGE_STYLES = {
  nature: {
    bgColor: 'bg-green-500',
    textColor: 'text-green-50',
    label: 'Nature',
    icon: '🌿',
  },
  civilization: {
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-50',
    label: 'Civilization',
    icon: '🏛️',
  },
  arcane: {
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-50',
    label: 'Arcane',
    icon: '✨',
  },
}

/**
 * Default zone styling for unknown zones
 */
const DEFAULT_ZONE_STYLE = {
  bgColor: 'bg-slate-500',
  textColor: 'text-slate-50',
  label: 'Unknown',
  icon: '?',
}

/**
 * Animation phases for the celebration sequence
 */
const ANIMATION_PHASES = {
  ENTERING: 'entering',
  PIECE_REVEAL: 'piece_reveal',
  TEXT_REVEAL: 'text_reveal',
  BUTTONS_REVEAL: 'buttons_reveal',
  IDLE: 'idle',
  EXITING: 'exiting',
}

/**
 * Phase timing in milliseconds
 */
const PHASE_TIMINGS = {
  ENTER_DELAY: 100,        // Initial delay before starting
  PIECE_REVEAL: 300,       // Time before piece starts scaling
  TEXT_REVEAL: 800,        // Time before text appears
  BUTTONS_REVEAL: 1200,    // Time before buttons appear
  IDLE: 1500,              // Time when all animations complete
  EXIT_DURATION: 300,      // Exit animation duration
}

/**
 * Sparkle particle component for additional celebration effect
 */
function SparkleParticle({ delay = 0, x = 50, y = 50 }) {
  return (
    <div
      className="absolute w-2 h-2 pointer-events-none animate-sparkle"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}ms`,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full text-yellow-300"
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
 * Generate sparkle positions around the center
 * Creates a ring of sparkles that animate in sequence
 */
function generateSparkles(count = 8) {
  const sparkles = []
  const radius = 25 // percentage from center

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI
    const x = 50 + Math.cos(angle) * radius
    const y = 50 + Math.sin(angle) * radius
    const delay = i * 100 + 500 // Stagger animation

    sparkles.push({ id: i, x, y, delay })
  }

  return sparkles
}

/**
 * PieceUnlockCelebration - Full-screen celebration overlay for piece unlocks
 *
 * @param {Object} props - Component props
 * @param {Object} props.piece - The newly unlocked piece
 * @param {string} props.piece.id - Unique piece identifier
 * @param {string} props.piece.name - Display name for the piece
 * @param {string} props.piece.zone - Zone type (nature, civilization, arcane)
 * @param {string} [props.piece.imageUrl] - Optional piece image URL
 * @param {string} [props.piece.icon] - Emoji icon fallback
 * @param {Function} props.onComplete - Called when user clicks Continue
 * @param {Function} props.onViewWorld - Called when user clicks View in World
 */
function PieceUnlockCelebration({
  piece,
  onComplete,
  onViewWorld,
}) {
  const [phase, setPhase] = useState(ANIMATION_PHASES.ENTERING)
  const [showConfetti, setShowConfetti] = useState(false)
  const [imageError, setImageError] = useState(false)
  const soundPlayedRef = useRef(false)

  // Get zone styling
  const zoneStyle = ZONE_BADGE_STYLES[piece?.zone] || DEFAULT_ZONE_STYLE

  // Generate sparkle particles
  const sparkles = generateSparkles(8)

  /**
   * Run animation sequence on mount
   */
  useEffect(() => {
    if (!piece) return

    // Play sound effect once
    if (!soundPlayedRef.current) {
      playAchievementSound()
      soundPlayedRef.current = true
    }

    // Start confetti
    setShowConfetti(true)

    // Phase progression timers
    const timers = []

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.PIECE_REVEAL)
    }, PHASE_TIMINGS.PIECE_REVEAL))

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.TEXT_REVEAL)
    }, PHASE_TIMINGS.TEXT_REVEAL))

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
  }, [piece])

  /**
   * Handle View in World button click
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

  /**
   * Handle image load error
   */
  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  // Guard: No piece provided
  if (!piece) {
    return null
  }

  // Calculate animation states based on phase
  const isOverlayVisible = phase !== ANIMATION_PHASES.EXITING
  const isPieceVisible = phase !== ANIMATION_PHASES.ENTERING
  const isTextVisible = [
    ANIMATION_PHASES.TEXT_REVEAL,
    ANIMATION_PHASES.BUTTONS_REVEAL,
    ANIMATION_PHASES.IDLE,
  ].includes(phase)
  const areButtonsVisible = [
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
      aria-labelledby="celebration-title"
    >
      {/* Backdrop with blur */}
      <div
        className={`
          absolute inset-0
          bg-black/60 backdrop-blur-sm
          transition-opacity duration-300
          ${isOverlayVisible ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleContinue}
        aria-hidden="true"
      />

      {/* Confetti overlay */}
      <Confetti
        isActive={showConfetti}
        duration={3000}
        onComplete={handleConfettiComplete}
      />

      {/* Sparkle particles around the piece */}
      {isPieceVisible && sparkles.map(sparkle => (
        <SparkleParticle
          key={sparkle.id}
          x={sparkle.x}
          y={sparkle.y}
          delay={sparkle.delay}
        />
      ))}

      {/* Main celebration content */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-sm">
        {/* Piece image/icon container */}
        <div
          className={`
            relative w-48 h-48 mb-6
            rounded-2xl overflow-hidden
            bg-gradient-to-br from-white to-gray-100
            shadow-2xl
            transition-transform duration-500
            ${isPieceVisible ? 'scale-100 opacity-100 animate-bounce-in' : 'scale-0 opacity-0'}
          `}
          style={{
            // Glow effect based on zone
            boxShadow: isPieceVisible
              ? `0 0 40px ${zoneStyle.bgColor === 'bg-green-500' ? 'rgba(34, 197, 94, 0.5)' :
                  zoneStyle.bgColor === 'bg-amber-500' ? 'rgba(245, 158, 11, 0.5)' :
                  zoneStyle.bgColor === 'bg-purple-500' ? 'rgba(168, 85, 247, 0.5)' :
                  'rgba(148, 163, 184, 0.5)'
                }, 0 20px 40px rgba(0, 0, 0, 0.3)`
              : undefined,
          }}
        >
          {piece.imageUrl && !imageError ? (
            <img
              src={piece.imageUrl}
              alt={piece.name}
              onError={handleImageError}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <span className="text-6xl select-none">
                {piece.icon || '🌍'}
              </span>
            </div>
          )}

          {/* Zone badge overlay on piece */}
          <div
            className={`
              absolute bottom-3 right-3
              px-2 py-1 rounded-full
              ${zoneStyle.bgColor} ${zoneStyle.textColor}
              text-xs font-medium
              shadow-lg
              flex items-center gap-1
            `}
          >
            <span>{zoneStyle.icon}</span>
            <span>{zoneStyle.label}</span>
          </div>
        </div>

        {/* Celebration text */}
        <div
          className={`
            text-center mb-8
            transition-all duration-500
            ${isTextVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          {/* New piece unlocked message (T003) */}
          <p
            id="celebration-title"
            className="text-white/80 text-lg font-medium mb-2"
          >
            New piece unlocked!
          </p>

          {/* Piece name */}
          <h2 className="text-white text-3xl font-bold mb-3 drop-shadow-lg">
            {piece.name}
          </h2>

          {/* Zone badge (larger version) */}
          <div
            className={`
              inline-flex items-center gap-2
              px-4 py-2 rounded-full
              ${zoneStyle.bgColor} ${zoneStyle.textColor}
              text-sm font-semibold
              shadow-lg
            `}
          >
            <span className="text-lg">{zoneStyle.icon}</span>
            <span>{zoneStyle.label} Zone</span>
          </div>
        </div>

        {/* Action buttons */}
        <div
          className={`
            flex flex-col sm:flex-row gap-3 w-full
            transition-all duration-500
            ${areButtonsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          {/* View in World button */}
          <button
            onClick={handleViewWorld}
            disabled={!areButtonsVisible}
            className="
              flex-1 px-6 py-3 rounded-xl
              bg-white text-slate-700 font-semibold
              hover:bg-white/90 hover:scale-105
              active:scale-95
              transition-all duration-200
              shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black/50
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            View in World
          </button>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!areButtonsVisible}
            className="
              flex-1 px-6 py-3 rounded-xl
              bg-white/20 text-white font-semibold
              border border-white/30
              hover:bg-white/30 hover:scale-105
              active:scale-95
              transition-all duration-200
              shadow-lg
              focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black/50
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export default PieceUnlockCelebration
