/**
 * WorldTransition Component
 *
 * Handles smooth visual transitions when the world evolves between states.
 * Supports multiple animation types: crossfade, reveal, and morph.
 *
 * Features:
 * - Layered images with absolute positioning
 * - Smooth CSS transitions (no janky JavaScript animation)
 * - Optional glow effect on changed region
 * - Particle/sparkle effects during transition
 * - Respects prefers-reduced-motion
 * - 16:9 aspect ratio container
 */

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Transition duration in milliseconds
 */
const TRANSITION_DURATION = 1500

/**
 * Instant transition duration for reduced motion
 */
const INSTANT_DURATION = 50

/**
 * Hook to detect prefers-reduced-motion
 */
function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (event) => {
      setReducedMotion(event.matches)
    }

    mediaQuery.addEventListener?.('change', handleChange)
    return () => {
      mediaQuery.removeEventListener?.('change', handleChange)
    }
  }, [])

  return reducedMotion
}

/**
 * Particle effect during transition
 */
function TransitionParticles() {
  return (
    <div
      data-testid="transition-particles"
      className="absolute inset-0 pointer-events-none overflow-hidden"
    >
      {/* Sparkle particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-white/80 animate-ping"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '1.5s',
          }}
        />
      ))}
    </div>
  )
}

/**
 * Highlight glow effect at specified position
 */
function HighlightGlow({ x, y, radius }) {
  // Clamp coordinates to valid range
  const clampedX = Math.max(0, Math.min(1, x))
  const clampedY = Math.max(0, Math.min(1, y))

  return (
    <div
      data-testid="highlight-glow"
      className="absolute rounded-full animate-pulse pointer-events-none"
      style={{
        left: `${clampedX * 100}%`,
        top: `${clampedY * 100}%`,
        width: `${radius * 2}px`,
        height: `${radius * 2}px`,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.6) 0%, rgba(99, 102, 241, 0) 70%)',
        boxShadow: '0 0 40px 20px rgba(99, 102, 241, 0.4)',
      }}
    />
  )
}

/**
 * WorldTransition - Handles evolution animations between world states
 *
 * @param {Object} props - Component props
 * @param {string} [props.oldImageUrl] - Previous world state image URL
 * @param {string} [props.newImageUrl] - New evolved world state image URL
 * @param {boolean} [props.isTransitioning=false] - Whether to show transition animation
 * @param {Function} [props.onTransitionComplete] - Called when animation ends
 * @param {Object} [props.highlightRegion] - { x, y, radius } - area that changed
 * @param {'crossfade' | 'reveal' | 'morph'} [props.transitionType='crossfade'] - Animation style
 * @param {boolean} [props.showText=false] - Whether to show "Your world grows..." text
 */
function WorldTransition({
  oldImageUrl,
  newImageUrl,
  isTransitioning = false,
  onTransitionComplete,
  highlightRegion,
  transitionType = 'crossfade',
  showText = false,
}) {
  const reducedMotion = useReducedMotion()
  const timerRef = useRef(null)
  const [transitionProgress, setTransitionProgress] = useState(0)

  // Calculate actual duration based on reduced motion preference
  const duration = reducedMotion ? INSTANT_DURATION : TRANSITION_DURATION

  // Handle transition completion
  useEffect(() => {
    if (!isTransitioning) {
      setTransitionProgress(0)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // Start transition
    setTransitionProgress(1)

    // Set timer for completion callback
    timerRef.current = setTimeout(() => {
      onTransitionComplete?.()
    }, duration)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isTransitioning, duration, onTransitionComplete])

  // Determine transition class based on type
  const getTransitionClass = useCallback(() => {
    if (reducedMotion) {
      return ''
    }

    switch (transitionType) {
      case 'reveal':
        return 'reveal'
      case 'morph':
        return 'morph'
      case 'crossfade':
      default:
        return 'crossfade transition-opacity'
    }
  }, [transitionType, reducedMotion])

  // Determine if we should show old image
  const showOldImage = isTransitioning && oldImageUrl

  // Calculate new image opacity based on transition progress and type
  const getNewImageStyle = useCallback(() => {
    if (!isTransitioning) {
      return { opacity: 1 }
    }

    if (reducedMotion) {
      return { opacity: 1 }
    }

    const baseStyle = {
      transition: `all ${duration}ms ease-in-out`,
    }

    switch (transitionType) {
      case 'reveal':
        if (highlightRegion) {
          const { x, y } = highlightRegion
          const clampedX = Math.max(0, Math.min(1, x)) * 100
          const clampedY = Math.max(0, Math.min(1, y)) * 100
          return {
            ...baseStyle,
            clipPath: transitionProgress
              ? `circle(150% at ${clampedX}% ${clampedY}%)`
              : `circle(0% at ${clampedX}% ${clampedY}%)`,
          }
        }
        return { ...baseStyle, opacity: transitionProgress }

      case 'morph':
        return {
          ...baseStyle,
          opacity: transitionProgress,
          transform: transitionProgress ? 'scale(1)' : 'scale(1.05)',
          filter: transitionProgress ? 'blur(0px)' : 'blur(4px)',
        }

      case 'crossfade':
      default:
        return {
          ...baseStyle,
          opacity: transitionProgress,
        }
    }
  }, [isTransitioning, transitionProgress, transitionType, highlightRegion, duration, reducedMotion])

  return (
    <div
      data-testid="world-transition-container"
      className={`
        relative w-full aspect-video
        overflow-hidden
        bg-slate-100 dark:bg-slate-800
        rounded-lg
        ${getTransitionClass()}
      `}
    >
      {/* Old Image Layer (below) */}
      {showOldImage && (
        <img
          src={oldImageUrl}
          alt="Previous world state"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      )}

      {/* New Image Layer (above) */}
      {newImageUrl && (
        <img
          src={newImageUrl}
          alt="Current world state"
          className="absolute inset-0 w-full h-full object-cover"
          style={getNewImageStyle()}
          draggable={false}
        />
      )}

      {/* Transition Overlay */}
      {isTransitioning && (
        <div
          data-testid="transition-overlay"
          className="absolute inset-0 bg-black/10 pointer-events-none"
          style={{
            transition: `opacity ${duration}ms ease-in-out`,
            opacity: reducedMotion ? 0 : 0.1,
          }}
        />
      )}

      {/* Particle Effects */}
      {isTransitioning && !reducedMotion && <TransitionParticles />}

      {/* Highlight Glow */}
      {isTransitioning && highlightRegion && (
        <HighlightGlow
          x={highlightRegion.x}
          y={highlightRegion.y}
          radius={highlightRegion.radius}
        />
      )}

      {/* Text Overlay */}
      {isTransitioning && showText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="
              px-6 py-3
              bg-black/50 backdrop-blur-sm
              rounded-full
              text-white text-lg font-medium
              animate-pulse
            "
          >
            Your world grows...
          </div>
        </div>
      )}
    </div>
  )
}

export default WorldTransition
