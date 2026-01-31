/**
 * EvolutionCelebration Component
 * WB020: Celebration overlay when a world piece evolves to a new tier
 *
 * Animation sequence:
 * 1. Dim background overlay (0.3s)
 * 2. Zoom/focus on piece (0.5s)
 * 3. Flash effect (white overlay)
 * 4. Show transformation particles
 * 5. Display "Your [piece name] evolved to [tier]!" text
 * 6. Show XP bonus (+10/+25/+50 based on tier)
 * 7. "Awesome!" button to dismiss
 *
 * Props:
 * - piece: The piece that evolved
 * - oldTier: Previous tier (seedling, growing, flourishing)
 * - newTier: New tier (growing, flourishing, legendary)
 * - onComplete: Callback when celebration is dismissed
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Confetti from '../Confetti'
import { playEvolutionSound } from '../../utils/soundEffects'

/**
 * XP bonus values for each evolution tier
 */
const XP_BONUSES = {
  growing: 10,
  flourishing: 25,
  legendary: 50,
}

/**
 * Evolution tier display information
 */
const TIER_INFO = {
  seedling: {
    name: 'Seedling',
    icon: '🌱',
    color: 'from-green-400 to-green-600',
    description: 'Just planted',
  },
  growing: {
    name: 'Growing',
    icon: '🌿',
    color: 'from-emerald-400 to-teal-600',
    description: 'Reaching for the sky!',
  },
  flourishing: {
    name: 'Flourishing',
    icon: '🌸',
    color: 'from-pink-400 to-rose-600',
    description: 'In full bloom!',
  },
  legendary: {
    name: 'Legendary',
    icon: '✨',
    color: 'from-amber-400 to-orange-600',
    description: 'Truly magnificent!',
  },
}

/**
 * Animation phases for the evolution sequence
 */
const ANIMATION_PHASES = {
  ENTERING: 'entering',
  ZOOM_PIECE: 'zoom_piece',
  FLASH: 'flash',
  PARTICLES: 'particles',
  TEXT_REVEAL: 'text_reveal',
  XP_REVEAL: 'xp_reveal',
  BUTTONS_REVEAL: 'buttons_reveal',
  IDLE: 'idle',
  EXITING: 'exiting',
}

/**
 * Phase timing in milliseconds
 */
const PHASE_TIMINGS = {
  ENTER_DELAY: 100,
  ZOOM_PIECE: 300,
  FLASH: 800,
  PARTICLES: 1100,
  TEXT_REVEAL: 1600,
  XP_REVEAL: 2100,
  BUTTONS_REVEAL: 2600,
  IDLE: 2900,
  EXIT_DURATION: 300,
}

/**
 * Evolution particle component
 * Creates sparkle effects that radiate outward during transformation
 */
function EvolutionParticle({ angle, delay, tierColor }) {
  const distance = 80 + Math.random() * 40
  const x = Math.cos(angle * Math.PI / 180) * distance + 50
  const y = Math.sin(angle * Math.PI / 180) * distance + 50

  return (
    <div
      className="absolute w-3 h-3 pointer-events-none animate-evolution-particle"
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
        className="w-full h-full text-white drop-shadow-lg"
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
 * Generate evolution particles in a ring
 */
function generateParticles(count = 16) {
  const particles = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360
    const delay = i * 50 + 200
    particles.push({ id: i, angle, delay })
  }
  return particles
}

/**
 * Flash overlay component for the transformation moment
 */
function FlashOverlay({ visible }) {
  return (
    <div
      className={`
        absolute inset-0 z-20
        bg-white
        transition-opacity duration-300
        pointer-events-none
        ${visible ? 'opacity-70' : 'opacity-0'}
      `}
      aria-hidden="true"
    />
  )
}

/**
 * XP bonus floating animation
 */
function XpBonus({ amount, visible }) {
  return (
    <div
      className={`
        text-3xl font-bold text-amber-300
        drop-shadow-lg
        transition-all duration-500
        ${visible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-4 scale-75'
        }
      `}
    >
      +{amount} XP
    </div>
  )
}

/**
 * EvolutionCelebration - Full-screen celebration overlay for piece evolutions
 *
 * @param {Object} props - Component props
 * @param {Object} props.piece - The piece that evolved
 * @param {string} props.piece.id - Unique piece identifier
 * @param {string} props.piece.name - Display name for the piece
 * @param {string} props.piece.zone - Zone type
 * @param {string} [props.piece.imageUrl] - Optional piece image URL
 * @param {string} [props.piece.icon] - Emoji icon fallback
 * @param {string} props.oldTier - Previous tier (seedling, growing, flourishing)
 * @param {string} props.newTier - New tier (growing, flourishing, legendary)
 * @param {Function} props.onComplete - Called when user dismisses celebration
 */
function EvolutionCelebration({
  piece,
  oldTier,
  newTier,
  onComplete,
}) {
  const [phase, setPhase] = useState(ANIMATION_PHASES.ENTERING)
  const [showConfetti, setShowConfetti] = useState(false)
  const [imageError, setImageError] = useState(false)
  const soundPlayedRef = useRef(false)

  // Get tier info
  const oldTierInfo = TIER_INFO[oldTier] || TIER_INFO.seedling
  const newTierInfo = TIER_INFO[newTier] || TIER_INFO.growing

  // Get XP bonus for this evolution
  const xpBonus = XP_BONUSES[newTier] || 10

  // Generate particles
  const particles = generateParticles(16)

  /**
   * Run animation sequence on mount
   */
  useEffect(() => {
    if (!piece || !newTier) return

    // Play evolution sound effect once (with error handling for browsers that block audio)
    if (!soundPlayedRef.current) {
      try {
        playEvolutionSound()
      } catch (e) {
        console.warn('Could not play evolution sound:', e)
      }
      soundPlayedRef.current = true
    }

    // Start confetti at particles phase
    const confettiTimer = setTimeout(() => {
      setShowConfetti(true)
    }, PHASE_TIMINGS.PARTICLES)

    // Phase progression timers
    const timers = [confettiTimer]

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.ZOOM_PIECE)
    }, PHASE_TIMINGS.ZOOM_PIECE))

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.FLASH)
    }, PHASE_TIMINGS.FLASH))

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.PARTICLES)
    }, PHASE_TIMINGS.PARTICLES))

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.TEXT_REVEAL)
    }, PHASE_TIMINGS.TEXT_REVEAL))

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.XP_REVEAL)
    }, PHASE_TIMINGS.XP_REVEAL))

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
  }, [piece, newTier])

  /**
   * Handle Awesome button click
   */
  const handleComplete = useCallback(() => {
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

  // Guard: No piece or tier provided
  if (!piece || !newTier) {
    return null
  }

  // Calculate animation states based on phase
  const isOverlayVisible = phase !== ANIMATION_PHASES.EXITING
  const isPieceZoomed = [
    ANIMATION_PHASES.ZOOM_PIECE,
    ANIMATION_PHASES.FLASH,
    ANIMATION_PHASES.PARTICLES,
    ANIMATION_PHASES.TEXT_REVEAL,
    ANIMATION_PHASES.XP_REVEAL,
    ANIMATION_PHASES.BUTTONS_REVEAL,
    ANIMATION_PHASES.IDLE,
  ].includes(phase)
  const showFlash = phase === ANIMATION_PHASES.FLASH
  const showParticles = [
    ANIMATION_PHASES.PARTICLES,
    ANIMATION_PHASES.TEXT_REVEAL,
    ANIMATION_PHASES.XP_REVEAL,
    ANIMATION_PHASES.BUTTONS_REVEAL,
    ANIMATION_PHASES.IDLE,
  ].includes(phase)
  const showText = [
    ANIMATION_PHASES.TEXT_REVEAL,
    ANIMATION_PHASES.XP_REVEAL,
    ANIMATION_PHASES.BUTTONS_REVEAL,
    ANIMATION_PHASES.IDLE,
  ].includes(phase)
  const showXp = [
    ANIMATION_PHASES.XP_REVEAL,
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
      aria-labelledby="evolution-title"
    >
      {/* Backdrop with gradient based on new tier */}
      <div
        className={`
          absolute inset-0
          bg-gradient-to-br ${newTierInfo.color}
          transition-all duration-500
          ${isOverlayVisible ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          backgroundImage: `
            linear-gradient(135deg,
              rgba(0,0,0,0.4) 0%,
              rgba(0,0,0,0.6) 100%
            )
          `,
        }}
        onClick={handleComplete}
        aria-hidden="true"
      />

      {/* Flash overlay */}
      <FlashOverlay visible={showFlash} />

      {/* Confetti overlay */}
      <Confetti
        isActive={showConfetti}
        duration={3500}
        onComplete={handleConfettiComplete}
      />

      {/* Evolution particles */}
      {showParticles && particles.map(particle => (
        <EvolutionParticle
          key={particle.id}
          angle={particle.angle}
          delay={particle.delay}
        />
      ))}

      {/* Main celebration content */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-sm">
        {/* Piece container with zoom animation */}
        <div
          className={`
            relative w-32 h-32 sm:w-40 sm:h-40 mb-6
            rounded-2xl overflow-hidden
            bg-gradient-to-br from-white to-gray-100
            shadow-2xl
            transition-all duration-500 ease-out
            ${isPieceZoomed
              ? 'scale-100 opacity-100'
              : 'scale-50 opacity-0'
            }
          `}
          style={{
            boxShadow: isPieceZoomed
              ? `0 0 60px rgba(255, 255, 255, 0.5), 0 25px 50px rgba(0, 0, 0, 0.3)`
              : undefined,
          }}
        >
          {/* Piece image or icon */}
          {piece.imageUrl && !imageError ? (
            <img
              src={piece.imageUrl}
              alt={piece.name}
              onError={handleImageError}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <span className="text-5xl sm:text-6xl select-none">
                {piece.icon || '🌍'}
              </span>
            </div>
          )}

          {/* Tier badge transition - shows new tier */}
          <div
            className={`
              absolute bottom-2 right-2
              px-2 py-1 rounded-full
              bg-gradient-to-r ${newTierInfo.color}
              text-white text-xs font-bold
              shadow-lg
              flex items-center gap-1
              transition-all duration-300
              ${isPieceZoomed ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
            `}
          >
            <span>{newTierInfo.icon}</span>
            <span>{newTierInfo.name}</span>
          </div>
        </div>

        {/* Evolution text */}
        <div
          className={`
            text-center mb-4
            transition-all duration-500
            ${showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          {/* Evolution announcement */}
          <p className="text-white/80 text-lg font-medium mb-1">
            Your piece evolved!
          </p>

          {/* Piece name */}
          <h2
            id="evolution-title"
            className="text-white text-2xl sm:text-3xl font-bold mb-2 drop-shadow-lg"
          >
            {piece.name}
          </h2>

          {/* Tier evolution arrow */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-white/60 text-sm">
              {oldTierInfo.icon} {oldTierInfo.name}
            </span>
            <svg
              className="w-5 h-5 text-white/80"
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
            <span className="text-white font-bold">
              {newTierInfo.icon} {newTierInfo.name}
            </span>
          </div>

          {/* Tier description */}
          <p className="text-white/70 text-sm">
            {newTierInfo.description}
          </p>
        </div>

        {/* XP bonus */}
        <div className="mb-6">
          <XpBonus amount={xpBonus} visible={showXp} />
        </div>

        {/* Action button */}
        <div
          className={`
            w-full
            transition-all duration-500
            ${showButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          <button
            onClick={handleComplete}
            disabled={!showButtons}
            className="
              w-full px-8 py-4 rounded-xl
              bg-white text-slate-700 font-bold text-lg
              hover:bg-white/90 hover:scale-105
              active:scale-95
              transition-all duration-200
              shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  )
}

export default EvolutionCelebration
