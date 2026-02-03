/**
 * ComebackOffer - Second chance modal component
 *
 * Displays a full-screen modal offering the user a second chance
 * through a quick lightning round challenge. Shows their score
 * versus the pass threshold and explains the challenge rules.
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the modal
 * @param {'simple'|'standard'|'deep'} props.level - Difficulty level for styling
 * @param {number} props.originalScore - User's original quiz score
 * @param {number} props.passThreshold - Score needed to pass
 * @param {Function} props.onAccept - Callback when user accepts offer
 * @param {Function} props.onDecline - Callback when user declines offer
 */

import { useEffect, useMemo, useRef } from 'react'
import PropTypes from 'prop-types'
import { getStyleForLevel, COMEBACK_CONFIG } from '@/hooks/game/comebackConfig'
import { playComebackOfferSound } from '@/utils/soundEffects'

/**
 * Level-specific class mappings for modal styling.
 */
const LEVEL_CLASSES = {
  simple: 'from-emerald-500/95 to-green-600/95 simple emerald',
  standard: 'from-cyan-500/95 to-blue-600/95 standard cyan',
  deep: 'from-violet-500/95 to-purple-600/95 deep violet',
}

export default function ComebackOffer({
  show,
  level,
  originalScore = 0,
  passThreshold = 60,
  onAccept,
  onDecline,
}) {
  const soundPlayedRef = useRef(false)

  // Get level-specific styling with fallback
  const levelStyle = useMemo(() => getStyleForLevel(level), [level])
  const levelClass = LEVEL_CLASSES[level] || LEVEL_CLASSES.simple

  // Calculate how close they were
  const pointsAway = Math.max(0, passThreshold - originalScore)
  const displayScore = Math.round(originalScore)

  // Config values
  const { questionCount, timePerQuestion, requiredCorrect } = COMEBACK_CONFIG.challenge
  const { title, subtitle, acceptLabel, declineLabel } = COMEBACK_CONFIG.messages.offer

  // Play sound when shown
  useEffect(() => {
    if (!show) {
      soundPlayedRef.current = false
      return
    }

    if (!soundPlayedRef.current) {
      try {
        playComebackOfferSound()
      } catch {
        // Audio may not be available, silently continue
      }
      soundPlayedRef.current = true
    }
  }, [show])

  // Handle button clicks safely
  const handleAccept = () => {
    if (onAccept) {
      onAccept()
    }
  }

  const handleDecline = () => {
    if (onDecline) {
      onDecline()
    }
  }

  // Don't render if not shown
  if (!show) {
    return null
  }

  return (
    <div
      data-testid="comeback-offer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comeback-offer-title"
      className={`
        fixed inset-0 z-50
        flex flex-col items-center justify-center
        bg-gradient-to-br ${levelClass}
        animate-scale-in pulse backdrop-blur-sm
      `}
    >
      {/* Content container */}
      <div className="relative z-10 text-center px-6 max-w-md mx-auto">
        {/* Icon with animation */}
        <div className="text-6xl mb-4 animate-bounce">
          <span aria-hidden="true">{levelStyle.icon}</span>
        </div>

        {/* Title */}
        <h2
          id="comeback-offer-title"
          className="text-3xl font-bold text-white mb-2 animate-pulse"
        >
          {title}
        </h2>

        {/* Score display */}
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/30">
          <p className="text-white/90 text-lg">
            You scored <span className="font-bold text-yellow-300">{displayScore}%</span>
          </p>
          <p className="text-white/80 text-sm">
            {pointsAway > 0 ? (
              <>Just <span className="font-semibold text-yellow-300">{pointsAway}</span> points away from {passThreshold}%!</>
            ) : (
              <>So close to passing!</>
            )}
          </p>
        </div>

        {/* Subtitle/explanation */}
        <p className="text-white/90 text-lg mb-4">
          {subtitle}
        </p>

        {/* Challenge info */}
        <div className="bg-white/10 rounded-lg p-3 mb-6 text-left">
          <p className="text-white font-semibold mb-2">Lightning Round Rules:</p>
          <ul className="text-white/80 text-sm space-y-1">
            <li className="flex items-center gap-2">
              <span aria-hidden="true">&#x26A1;</span>
              <span><strong>{questionCount}</strong> quick questions</span>
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true">&#x23F1;</span>
              <span><strong>{timePerQuestion}</strong> seconds each</span>
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true">&#x2714;</span>
              <span>Get <strong>{requiredCorrect}</strong> correct to pass!</span>
            </li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            data-testid="comeback-accept"
            onClick={handleAccept}
            className="
              w-full py-4 px-6
              bg-white text-emerald-600 font-bold text-xl
              rounded-xl shadow-lg
              transform transition-all duration-200
              hover:scale-105 hover:shadow-xl
              active:scale-95
              primary
            "
          >
            {acceptLabel}
          </button>

          <button
            data-testid="comeback-decline"
            onClick={handleDecline}
            className="
              w-full py-3 px-6
              bg-transparent text-white/80 font-medium
              rounded-xl border border-white/30
              transition-all duration-200
              hover:bg-white/10 hover:text-white
              secondary outline ghost
            "
          >
            {declineLabel}
          </button>
        </div>
      </div>

      {/* Inline keyframes for scale-in animation */}
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

ComebackOffer.propTypes = {
  show: PropTypes.bool,
  level: PropTypes.oneOf(['simple', 'standard', 'deep']),
  originalScore: PropTypes.number,
  passThreshold: PropTypes.number,
  onAccept: PropTypes.func,
  onDecline: PropTypes.func,
}
