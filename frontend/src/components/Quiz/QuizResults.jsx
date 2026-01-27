/**
 * QuizResults Component
 * UI006: Quiz results screen with pass/fail states
 *
 * Features:
 * - Pass screen: Celebration, score, XP earned, world piece preview
 * - Fail screen: Encouraging message, retry option
 * - Animated XP counter from 0 to earned amount
 * - Tier upgrade celebration when applicable
 */

import { useState, useEffect, useCallback } from 'react'
import Confetti from '../Confetti'

/**
 * Animated XP counter that counts up from 0 to the earned amount
 *
 * @param {Object} props
 * @param {number} props.amount - The XP amount to animate to
 * @param {number} props.duration - Animation duration in ms (default 1000)
 */
function AnimatedXP({ amount, duration = 1000 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (amount <= 0) return

    const startTime = Date.now()
    const startValue = 0
    const endValue = amount

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startValue + (endValue - startValue) * easeOut)

      setDisplay(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [amount, duration])

  return (
    <span className="tabular-nums">+{display} XP</span>
  )
}

/**
 * World piece preview card shown on passing
 *
 * @param {Object} props
 * @param {Object} props.piece - The world piece data
 */
function WorldPiecePreview({ piece }) {
  if (!piece) return null

  return (
    <div
      className="
        bg-gradient-to-br from-primary/10 to-cyan-500/10
        border-2 border-primary/30
        rounded-xl p-4
        animate-bounce-in
      "
    >
      <div className="flex items-center gap-4">
        {/* Piece visual */}
        <div
          className="
            w-16 h-16 rounded-lg
            bg-gradient-to-br from-primary to-cyan-500
            flex items-center justify-center
            shadow-lg
          "
        >
          {piece.imageUrl ? (
            <img
              src={piece.imageUrl}
              alt={piece.name}
              className="w-12 h-12 object-contain"
            />
          ) : (
            <span className="text-3xl">🧩</span>
          )}
        </div>

        {/* Piece info */}
        <div className="flex-1 text-left">
          <p className="text-xs text-primary font-medium uppercase tracking-wide">
            World Piece Unlocked!
          </p>
          <p className="font-semibold text-gray-800 dark:text-gray-100">
            {piece.name || 'New Piece'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {piece.category || 'Discovery'}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Tier upgrade celebration banner
 *
 * @param {Object} props
 * @param {Object} props.tierUpgrade - Contains from and to tier info
 */
function TierUpgradeBanner({ tierUpgrade }) {
  if (!tierUpgrade) return null

  const { from, to } = tierUpgrade

  return (
    <div
      className="
        bg-gradient-to-r from-accent/20 to-yellow-500/20
        border-2 border-accent/50
        rounded-xl p-4 text-center
        animate-bounce-in
      "
      style={{ animationDelay: '0.3s' }}
    >
      <div className="flex items-center justify-center gap-3">
        <span className="text-3xl">🎖️</span>
        <div>
          <p className="text-sm text-accent font-bold uppercase tracking-wide">
            Level Up!
          </p>
          <p className="text-gray-800 dark:text-gray-100">
            <span className="text-gray-500">{from}</span>
            <span className="mx-2">→</span>
            <span className="font-bold text-accent">{to}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Main QuizResults component
 *
 * @param {Object} props
 * @param {number} props.score - Number of correct answers
 * @param {number} props.maxScore - Total number of questions
 * @param {number} props.percentage - Score as percentage (0-100)
 * @param {boolean} props.passed - Whether user passed (typically 75%+)
 * @param {number} props.xpEarned - XP earned from the quiz
 * @param {Object|null} props.tierUpgrade - Tier upgrade info { from, to } or null
 * @param {Object|null} props.piece - World piece earned (only if passed)
 * @param {Function} props.onViewWorld - Callback to view world
 * @param {Function} props.onRetry - Callback to retry quiz
 * @param {Function} props.onContinue - Callback to continue
 */
export default function QuizResults({
  score = 0,
  maxScore = 5,
  percentage = 0,
  passed = false,
  xpEarned = 0,
  tierUpgrade = null,
  piece = null,
  onViewWorld,
  onRetry,
  onContinue
}) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [isAnimated, setIsAnimated] = useState(false)

  // Trigger animations on mount
  useEffect(() => {
    const animTimer = setTimeout(() => setIsAnimated(true), 100)

    // Show confetti for passing
    if (passed) {
      const confettiTimer = setTimeout(() => setShowConfetti(true), 300)
      return () => {
        clearTimeout(animTimer)
        clearTimeout(confettiTimer)
      }
    }

    return () => clearTimeout(animTimer)
  }, [passed])

  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false)
  }, [])

  // Background gradient based on pass/fail
  const backgroundClass = passed
    ? 'bg-gradient-to-b from-success-50 to-white dark:from-success-500/10 dark:to-slate-900'
    : 'bg-gradient-to-b from-amber-50 to-white dark:from-amber-500/10 dark:to-slate-900'

  return (
    <div className={`min-h-[60vh] ${backgroundClass} py-8`}>
      {/* Confetti for passing */}
      <Confetti
        isActive={showConfetti}
        duration={4000}
        onComplete={handleConfettiComplete}
      />

      <div className="w-full max-w-md mx-auto px-4">
        {/* Result card */}
        <div
          className={`
            bg-white dark:bg-slate-800 rounded-2xl shadow-xl
            border border-gray-100 dark:border-slate-700
            p-6 text-center
            transition-all duration-500
            ${isAnimated ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}
          `}
        >
          {/* Result icon */}
          <div className="mb-4">
            <div
              className={`
                w-24 h-24 mx-auto rounded-full
                flex items-center justify-center
                ${passed
                  ? 'bg-gradient-to-br from-success-200 to-success-100 dark:from-success-500/30 dark:to-success-500/10'
                  : 'bg-gradient-to-br from-amber-200 to-amber-100 dark:from-amber-500/30 dark:to-amber-500/10'
                }
                ${isAnimated ? 'animate-bounce-in' : ''}
              `}
            >
              {passed ? (
                // Checkmark icon for pass
                <svg
                  className="w-12 h-12 text-success-600 dark:text-success-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                // Encouraging icon for fail
                <svg
                  className="w-12 h-12 text-amber-600 dark:text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Result header */}
          <h2
            className={`
              text-3xl font-bold mb-2
              ${passed
                ? 'text-success-600 dark:text-success-400'
                : 'text-amber-600 dark:text-amber-400'
              }
            `}
          >
            {passed ? 'Passed!' : 'Not Quite!'}
          </h2>

          {/* Encouraging subtext for fail */}
          {!passed && (
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You're so close! Give it another shot.
            </p>
          )}

          {/* Score display */}
          <div className="mb-4">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-5xl font-bold text-gray-800 dark:text-gray-100">
                {score}
              </span>
              <span className="text-2xl text-gray-400 dark:text-gray-500">/</span>
              <span className="text-2xl text-gray-500 dark:text-gray-400">
                {maxScore}
              </span>
            </div>
            <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">
              ({percentage}%)
            </p>
          </div>

          {/* Passing threshold hint for fail */}
          {!passed && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              You need <span className="font-semibold">75%</span> to pass
            </p>
          )}

          {/* XP earned (always shown, even for fail - participation XP) */}
          {xpEarned > 0 && (
            <div
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-full
                ${passed
                  ? 'bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-300'
                  : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                }
                font-bold text-lg mb-6
              `}
            >
              <span className="text-xl">⭐</span>
              <AnimatedXP amount={xpEarned} duration={1200} />
            </div>
          )}

          {/* World piece preview (pass only) */}
          {passed && piece && (
            <div className="mb-6">
              <WorldPiecePreview piece={piece} />
            </div>
          )}

          {/* Tier upgrade banner (if applicable) */}
          {tierUpgrade && (
            <div className="mb-6">
              <TierUpgradeBanner tierUpgrade={tierUpgrade} />
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {passed ? (
              <>
                {/* View in World button (primary for pass) */}
                <button
                  onClick={onViewWorld}
                  className="
                    w-full py-3 px-6 rounded-xl
                    bg-gradient-to-r from-primary to-cyan-500
                    text-white font-semibold text-lg
                    hover:shadow-lg hover:scale-[1.02]
                    active:scale-[0.98]
                    transition-all duration-200
                    flex items-center justify-center gap-2
                  "
                >
                  <span className="text-xl">🌍</span>
                  View in World
                </button>

                {/* Continue button (secondary for pass) */}
                <button
                  onClick={onContinue}
                  className="
                    w-full py-3 px-6 rounded-xl
                    bg-gray-100 dark:bg-slate-700
                    text-gray-700 dark:text-gray-200 font-medium
                    hover:bg-gray-200 dark:hover:bg-slate-600
                    active:scale-[0.98]
                    transition-all duration-200
                  "
                >
                  Continue Learning
                </button>
              </>
            ) : (
              <>
                {/* Try Again button (primary for fail) */}
                <button
                  onClick={onRetry}
                  className="
                    w-full py-3 px-6 rounded-xl
                    bg-gradient-to-r from-amber-500 to-orange-500
                    text-white font-semibold text-lg
                    hover:shadow-lg hover:scale-[1.02]
                    active:scale-[0.98]
                    transition-all duration-200
                  "
                >
                  Try Again
                </button>

                {/* Review Slides button (secondary for fail) */}
                <button
                  onClick={onContinue}
                  className="
                    w-full py-3 px-6 rounded-xl
                    bg-gray-100 dark:bg-slate-700
                    text-gray-700 dark:text-gray-200 font-medium
                    hover:bg-gray-200 dark:hover:bg-slate-600
                    active:scale-[0.98]
                    transition-all duration-200
                  "
                >
                  Review Slides
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom info text */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          {passed
            ? 'Your piece has been added to your World!'
            : 'Don\'t worry - you can retry as many times as you need!'}
        </p>
      </div>
    </div>
  )
}

// Export AnimatedXP for reuse
export { AnimatedXP }
