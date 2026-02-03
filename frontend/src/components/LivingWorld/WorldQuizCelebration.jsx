/**
 * WorldQuizCelebration Component
 *
 * Displays world-level celebrations for special achievements
 * (perfect score, boss victory). This is a higher-level celebration
 * than TreeQuizReaction, showing full-screen confetti and fanfare.
 *
 * Only renders for 'perfect' and 'boss_victory' reaction types.
 * Other types (pass, streak, fail) return null as they are
 * handled by the more subtle TreeQuizReaction.
 *
 * @param {Object} props
 * @param {Object} props.reaction - Reaction data { type, score, topicName }
 * @param {Function} props.onComplete - Callback when celebration ends
 * @param {boolean} props.autoAdvance - Auto-dismiss after delay (default: true)
 */

import { useState, useEffect, useRef, useCallback, useId } from 'react'
import PropTypes from 'prop-types'
import Confetti from '@/components/Confetti'

/**
 * Special reaction types that trigger world celebrations
 */
const SPECIAL_TYPES = ['perfect', 'boss_victory']

/**
 * Auto-advance delay in milliseconds
 */
const AUTO_ADVANCE_DELAY = 4000

/**
 * Celebration content configuration by type
 */
const CELEBRATION_CONFIG = {
  perfect: {
    headline: 'Perfect Score!',
    subtext: 'Amazing work!',
    icon: null, // Score displays instead
    colorClass: 'amber',
    bgClass: 'from-amber-500/95 to-yellow-500/95',
  },
  boss_victory: {
    headline: 'Boss Defeated!',
    subtext: 'You conquered the challenge!',
    icon: true, // Trophy icon
    colorClass: 'purple',
    bgClass: 'from-purple-500/95 to-violet-500/95',
  },
}

/**
 * Trophy icon component for boss victory
 */
function TrophyIcon() {
  return (
    <div
      data-testid="celebration-icon"
      className="text-6xl mb-4 animate-bounce"
      role="img"
      aria-label="Trophy"
    >
      <span aria-hidden="true">&#127942;</span>
    </div>
  )
}

/**
 * WorldQuizCelebration - Full-screen celebration overlay
 */
export default function WorldQuizCelebration({
  reaction,
  onComplete,
  autoAdvance = true,
}) {
  const [isActive, setIsActive] = useState(true)
  const [hasCompleted, setHasCompleted] = useState(false)
  const timerRef = useRef(null)
  const buttonRef = useRef(null)
  const headlineId = useId()

  // Determine if this reaction warrants a world celebration
  const isSpecialReaction = reaction?.type && SPECIAL_TYPES.includes(reaction.type)

  // Get celebration config
  const config = isSpecialReaction ? CELEBRATION_CONFIG[reaction.type] : null

  // Handle completion (only call once)
  const handleComplete = useCallback(() => {
    if (hasCompleted) return
    setHasCompleted(true)
    setIsActive(false)

    if (onComplete) {
      onComplete()
    }
  }, [hasCompleted, onComplete])

  // Auto-advance timer
  useEffect(() => {
    if (!isSpecialReaction || !autoAdvance) return

    timerRef.current = setTimeout(handleComplete, AUTO_ADVANCE_DELAY)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isSpecialReaction, autoAdvance, handleComplete])

  // Focus continue button when shown (accessibility)
  useEffect(() => {
    if (!autoAdvance && buttonRef.current) {
      const focusTimer = setTimeout(() => {
        buttonRef.current?.focus()
      }, 100)

      return () => clearTimeout(focusTimer)
    }
  }, [autoAdvance])

  // Don't render for non-special reactions or null/undefined
  if (!reaction || !isSpecialReaction || !config) {
    return null
  }

  return (
    <div
      data-testid="world-quiz-celebration"
      role="dialog"
      aria-labelledby={headlineId}
      aria-live="polite"
      className={`
        fixed inset-0 z-50
        flex flex-col items-center justify-center
        bg-gradient-to-br ${config.bgClass}
        backdrop-blur-sm
        animate-scale-in scale
      `}
    >
      {/* Confetti overlay */}
      <Confetti isActive={isActive} duration={4000} />

      {/* Celebration content */}
      <div className="relative z-10 text-center px-6">
        {/* Trophy icon for boss victory */}
        {config.icon && <TrophyIcon />}

        {/* Score display for perfect */}
        {reaction.type === 'perfect' && reaction.score !== undefined && (
          <div className="text-6xl font-bold text-white mb-4 animate-bounce">
            {reaction.score}
          </div>
        )}

        {/* Headline */}
        <h2
          id={headlineId}
          className="text-3xl md:text-4xl font-bold text-white mb-2"
        >
          {config.headline}
        </h2>

        {/* Topic name */}
        {reaction.topicName && (
          <p className="text-xl text-white/90 mb-4">
            {reaction.topicName}
          </p>
        )}

        {/* Subtext */}
        <p className="text-lg text-white/80 mb-6">
          {config.subtext}
        </p>

        {/* Continue button (only when autoAdvance is false) */}
        {!autoAdvance && (
          <button
            ref={buttonRef}
            type="button"
            tabIndex={0}
            onClick={handleComplete}
            className="
              px-8 py-3
              bg-white/20 hover:bg-white/30
              backdrop-blur-sm
              border-2 border-white/40
              rounded-full
              text-white font-semibold text-lg
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-white/50
            "
          >
            Continue
          </button>
        )}
      </div>

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes scale-in {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

WorldQuizCelebration.propTypes = {
  reaction: PropTypes.shape({
    type: PropTypes.string.isRequired,
    score: PropTypes.number,
    topicName: PropTypes.string,
  }),
  onComplete: PropTypes.func,
  autoAdvance: PropTypes.bool,
}
