/**
 * ConnectionSceneReveal Component
 * WB019: Full-screen celebration overlay when a new pocket connection scene is generated
 *
 * Animation sequence:
 * 1. Overlay fades in with particle effects
 * 2. Scene image zooms in from center with glow effect
 * 3. "Your [pocket name] pocket has a new scene!" text appears
 * 4. Evolution level badge shown (initial/enhanced/legendary)
 * 5. Sparkle particles animate around edges
 * 6. "View Pocket" and "Continue" buttons fade in
 *
 * Test Cases:
 * T001: Trigger scene reveal when pocket reaches 3 pieces
 * T002: Verify celebration animation plays smoothly
 * T003: Verify pocket name and scene displayed correctly
 * T004: Verify evolution badge matches piece count
 * T005: Verify buttons navigate correctly
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Confetti from '../Confetti'
import { playAchievementSound } from '../../utils/soundEffects'

/**
 * Evolution level styling and messaging
 */
const EVOLUTION_INFO = {
  initial: {
    label: 'Connection Formed',
    badge: 'New!',
    badgeColor: 'bg-green-500',
    description: 'Your pieces have come together!',
    glowColor: 'rgba(34, 197, 94, 0.5)',
  },
  enhanced: {
    label: 'Scene Evolved',
    badge: 'Enhanced',
    badgeColor: 'bg-secondary-500',
    description: 'Your pocket grows stronger!',
    glowColor: 'rgba(0, 180, 160, 0.5)',
  },
  legendary: {
    label: 'Legendary Scene',
    badge: 'Legendary',
    badgeColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
    description: 'A masterpiece of knowledge!',
    glowColor: 'rgba(168, 85, 247, 0.6)',
  },
}

/**
 * Animation phases for the celebration sequence
 */
const ANIMATION_PHASES = {
  ENTERING: 'entering',
  SCENE_REVEAL: 'scene_reveal',
  TEXT_REVEAL: 'text_reveal',
  BUTTONS_REVEAL: 'buttons_reveal',
  IDLE: 'idle',
  EXITING: 'exiting',
}

/**
 * Phase timing in milliseconds
 */
const PHASE_TIMINGS = {
  ENTER_DELAY: 100,
  SCENE_REVEAL: 300,
  TEXT_REVEAL: 900,
  BUTTONS_REVEAL: 1400,
  IDLE: 1700,
  EXIT_DURATION: 300,
}

/**
 * Generate sparkle positions around the scene image
 *
 * @param {number} count - Number of sparkles
 * @returns {Array} Array of sparkle position objects
 */
function generateSparkles(count = 12) {
  const sparkles = []
  const radiusMin = 45
  const radiusMax = 55

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI
    const radius = radiusMin + Math.random() * (radiusMax - radiusMin)
    const x = 50 + Math.cos(angle) * radius * 0.8
    const y = 50 + Math.sin(angle) * radius
    const delay = i * 80 + 400
    const size = 8 + Math.random() * 8

    sparkles.push({ id: i, x, y, delay, size })
  }

  return sparkles
}

/**
 * Sparkle particle component
 */
function SparkleParticle({ x, y, delay, size = 10 }) {
  return (
    <div
      className="absolute pointer-events-none animate-sparkle"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}ms`,
        width: `${size}px`,
        height: `${size}px`,
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
 * ConnectionSceneReveal - Celebration overlay for new pocket scenes
 *
 * @param {Object} props - Component props
 * @param {Object} props.scene - Scene data
 * @param {string} props.scene.imageUrl - URL of the generated scene image
 * @param {string} props.scene.evolutionLevel - 'initial' | 'enhanced' | 'legendary'
 * @param {string} props.pocketName - Display name for the pocket (e.g., "Ocean Pocket")
 * @param {string} props.pocketIcon - Emoji icon for the pocket
 * @param {number} props.pieceCount - Number of pieces in the pocket
 * @param {Function} props.onViewPocket - Callback to view the pocket
 * @param {Function} props.onContinue - Callback to dismiss and continue
 */
function ConnectionSceneReveal({
  scene,
  pocketName = 'Knowledge Pocket',
  pocketIcon = '✨',
  pieceCount = 3,
  onViewPocket,
  onContinue,
}) {
  const [phase, setPhase] = useState(ANIMATION_PHASES.ENTERING)
  const [showConfetti, setShowConfetti] = useState(false)
  const [imageError, setImageError] = useState(false)
  const soundPlayedRef = useRef(false)

  // Get evolution styling
  const evolutionLevel = scene?.evolutionLevel || 'initial'
  const evolutionInfo = EVOLUTION_INFO[evolutionLevel] || EVOLUTION_INFO.initial

  // Generate sparkle particles
  const sparkles = generateSparkles(12)

  /**
   * Run animation sequence on mount
   */
  useEffect(() => {
    if (!scene?.imageUrl) return

    // Play achievement sound once
    if (!soundPlayedRef.current) {
      playAchievementSound()
      soundPlayedRef.current = true
    }

    // Start confetti for legendary scenes
    if (evolutionLevel === 'legendary') {
      setShowConfetti(true)
    }

    // Phase progression timers
    const timers = []

    timers.push(setTimeout(() => {
      setPhase(ANIMATION_PHASES.SCENE_REVEAL)
    }, PHASE_TIMINGS.SCENE_REVEAL))

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
  }, [scene, evolutionLevel])

  /**
   * Handle View Pocket button click
   */
  const handleViewPocket = useCallback(() => {
    setPhase(ANIMATION_PHASES.EXITING)
    setTimeout(() => {
      onViewPocket?.()
    }, PHASE_TIMINGS.EXIT_DURATION)
  }, [onViewPocket])

  /**
   * Handle Continue button click
   */
  const handleContinue = useCallback(() => {
    setPhase(ANIMATION_PHASES.EXITING)
    setTimeout(() => {
      onContinue?.()
    }, PHASE_TIMINGS.EXIT_DURATION)
  }, [onContinue])

  /**
   * Handle confetti completion
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

  // Guard: No scene provided
  if (!scene?.imageUrl) {
    return null
  }

  // Calculate animation states based on phase
  const isOverlayVisible = phase !== ANIMATION_PHASES.EXITING
  const isSceneVisible = phase !== ANIMATION_PHASES.ENTERING
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
      aria-labelledby="scene-reveal-title"
    >
      {/* Backdrop with blur */}
      <div
        className={`
          absolute inset-0
          bg-black/70 backdrop-blur-md
          transition-opacity duration-300
          ${isOverlayVisible ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleContinue}
        aria-hidden="true"
      />

      {/* Confetti for legendary scenes */}
      <Confetti
        isActive={showConfetti}
        duration={4000}
        onComplete={handleConfettiComplete}
      />

      {/* Sparkle particles around the scene */}
      {isSceneVisible && sparkles.map(sparkle => (
        <SparkleParticle
          key={sparkle.id}
          x={sparkle.x}
          y={sparkle.y}
          delay={sparkle.delay}
          size={sparkle.size}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-md w-full">
        {/* Scene image container */}
        <div
          className={`
            relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 mb-6
            rounded-2xl overflow-hidden
            transition-all duration-700
            ${isSceneVisible
              ? 'scale-100 opacity-100 animate-bounce-in'
              : 'scale-0 opacity-0'
            }
          `}
          style={{
            boxShadow: isSceneVisible
              ? `0 0 60px ${evolutionInfo.glowColor}, 0 25px 50px rgba(0, 0, 0, 0.4)`
              : undefined,
          }}
        >
          {/* Scene image */}
          {!imageError ? (
            <img
              src={scene.imageUrl}
              alt={`${pocketName} connection scene`}
              onError={handleImageError}
              className="w-full h-full object-cover"
            />
          ) : (
            /* Fallback if image fails */
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-600 to-slate-800">
              <span className="text-6xl mb-2">{pocketIcon}</span>
              <span className="text-white/60 text-sm">Scene unavailable</span>
            </div>
          )}

          {/* Evolution badge overlay */}
          <div
            className={`
              absolute top-3 right-3
              px-3 py-1.5 rounded-full
              ${evolutionInfo.badgeColor}
              text-white text-sm font-bold
              shadow-lg
              ${evolutionLevel === 'legendary' ? 'animate-pulse' : ''}
            `}
          >
            {evolutionInfo.badge}
          </div>

          {/* Piece count indicator */}
          <div
            className={`
              absolute bottom-3 left-3
              px-2.5 py-1 rounded-full
              bg-black/50 backdrop-blur-sm
              text-white text-sm font-medium
              flex items-center gap-1.5
            `}
          >
            <span className="text-base">{pocketIcon}</span>
            <span>{pieceCount} pieces</span>
          </div>

          {/* Legendary glow ring */}
          {evolutionLevel === 'legendary' && (
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none scene-legendary-glow"
              style={{
                border: '3px solid transparent',
                background: 'linear-gradient(45deg, rgba(168,85,247,0.5), rgba(236,72,153,0.5), rgba(168,85,247,0.5)) border-box',
                WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />
          )}
        </div>

        {/* Text content */}
        <div
          className={`
            text-center mb-8
            transition-all duration-500
            ${isTextVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          {/* Evolution label */}
          <p
            id="scene-reveal-title"
            className="text-white/80 text-lg font-medium mb-2"
          >
            {evolutionInfo.label}
          </p>

          {/* Main message */}
          <h2 className="text-white text-2xl sm:text-3xl font-bold mb-3 drop-shadow-lg">
            Your {pocketName} has a new scene!
          </h2>

          {/* Description */}
          <p className="text-white/70 text-base">
            {evolutionInfo.description}
          </p>
        </div>

        {/* Action buttons */}
        <div
          className={`
            flex flex-col sm:flex-row gap-3 w-full
            transition-all duration-500
            ${areButtonsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          {/* View Pocket button */}
          <button
            onClick={handleViewPocket}
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
            View Pocket
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

export default ConnectionSceneReveal
