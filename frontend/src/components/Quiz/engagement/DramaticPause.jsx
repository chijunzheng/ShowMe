/**
 * DramaticPause - Suspense overlay before answer reveal
 *
 * Displays a semi-transparent overlay with pulsing animation
 * to build anticipation before showing quiz results.
 * Plays a suspense sound and calls onComplete after 800ms.
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the dramatic pause
 * @param {'simple'|'standard'|'deep'} props.level - Quiz difficulty level for styling
 * @param {Function} props.onComplete - Callback when the pause completes
 */

import { useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { playSuspenseSound } from '@/utils/soundEffects'
import { QUICK_WINS } from '@/hooks/game/gameConfig'

/**
 * Level-specific styling classes.
 */
const LEVEL_CLASSES = {
  simple: 'bg-emerald-900/70 simple',
  standard: 'bg-blue-900/70 standard',
  deep: 'bg-violet-900/70 deep',
}

/**
 * Level-specific pulse color classes for the text.
 */
const LEVEL_TEXT_CLASSES = {
  simple: 'text-emerald-300',
  standard: 'text-cyan-300',
  deep: 'text-violet-300',
}

export default function DramaticPause({ show, level = 'standard', onComplete }) {
  const timerRef = useRef(null)
  const soundPlayedRef = useRef(false)

  // Memoized onComplete handler
  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete()
    }
  }, [onComplete])

  // Handle sound and timer when shown
  useEffect(() => {
    if (!show) {
      // Reset when hidden
      soundPlayedRef.current = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // Play suspense sound with error handling
    if (!soundPlayedRef.current) {
      try {
        playSuspenseSound()
      } catch {
        // Audio may not be available, silently continue
      }
      soundPlayedRef.current = true
    }

    // Set timer for completion
    timerRef.current = setTimeout(handleComplete, QUICK_WINS.dramaticPause.duration)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [show, handleComplete])

  // Don't render if not shown
  if (!show) {
    return null
  }

  // Get level-specific classes with fallback to standard
  const bgClass = LEVEL_CLASSES[level] || LEVEL_CLASSES.standard
  const textClass = LEVEL_TEXT_CLASSES[level] || LEVEL_TEXT_CLASSES.standard

  return (
    <div
      data-testid="dramatic-pause"
      data-level={level || 'standard'}
      role="status"
      aria-live="polite"
      aria-label="Checking your answer..."
      className={`
        fixed inset-0 z-40
        flex items-center justify-center
        ${bgClass}
        backdrop-blur-sm
        animate-fade-in
        transition-all duration-300
      `}
    >
      {/* Pulsing suspense indicator */}
      <div className="text-center">
        <div
          className={`
            text-6xl font-bold
            ${textClass}
            animate-pulse
          `}
          aria-hidden="true"
        >
          ...
        </div>
        <p className={`mt-4 text-lg ${textClass} opacity-80`}>
          Checking...
        </p>
      </div>

      {/* Inline keyframes for animations */}
      <style>{`
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

DramaticPause.propTypes = {
  show: PropTypes.bool,
  level: PropTypes.oneOf(['simple', 'standard', 'deep']),
  onComplete: PropTypes.func,
}
