/**
 * QuizResults Component
 * UI006: Mission results screen with pass/fail states
 *
 * Features:
 * - Mission Complete screen: Celebration, score, XP earned, world piece preview
 * - Almost There screen: Encouraging message, retry mission option
 * - Animated XP counter from 0 to earned amount
 * - Tier upgrade celebration when applicable
 * - Level-specific adventure messages
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
 * Star Rating Display for Simple Level
 */
function StarRating({ stars, maxStars = 3 }) {
  return (
    <div className="flex justify-center gap-2 my-4">
      {[...Array(maxStars)].map((_, i) => (
        <span
          key={i}
          className={`text-5xl transition-all duration-300 ${
            i < stars ? 'animate-bounce-in scale-100' : 'opacity-30 scale-75'
          }`}
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          {i < stars ? '⭐' : '☆'}
        </span>
      ))}
    </div>
  )
}

/**
 * Streak Achievement Badge
 */
function StreakBadge({ maxStreak, celebrationStyle }) {
  if (!maxStreak || maxStreak < 2) return null

  const styles = {
    playful: 'from-pink-400 to-purple-400',
    balanced: 'from-primary to-cyan-500',
    intense: 'from-orange-500 to-red-500'
  }

  return (
    <div className={`
      inline-flex items-center gap-2 px-4 py-2 rounded-full
      bg-gradient-to-r ${styles[celebrationStyle] || styles.balanced}
      text-white font-bold shadow-lg animate-bounce-in
    `}>
      <span className="text-xl">🔥</span>
      <span>{maxStreak} streak!</span>
    </div>
  )
}

/**
 * Deep Challenge Bonus Badge
 */
function DeepChallengeBadge({ bonusXp }) {
  return (
    <div className="
      inline-flex items-center gap-2 px-4 py-2 rounded-lg
      bg-gradient-to-r from-purple-600 to-indigo-600
      text-white font-bold shadow-lg animate-bounce-in
      border-2 border-purple-400
    ">
      <span className="text-xl">💎</span>
      <span>Deep Challenge +{bonusXp} XP</span>
    </div>
  )
}

/**
 * Speed Bonus Summary
 */
function SpeedBonusSummary({ speedBonuses, avgTime }) {
  if (!speedBonuses || speedBonuses === 0) return null

  return (
    <div className="
      flex items-center justify-center gap-3 text-sm
      text-gray-600 dark:text-gray-400 mt-2
    ">
      <span className="flex items-center gap-1">
        <span>⚡</span>
        <span>{speedBonuses} speed bonus{speedBonuses > 1 ? 'es' : ''}</span>
      </span>
      {avgTime && (
        <span className="flex items-center gap-1">
          <span>⏱️</span>
          <span>Avg: {avgTime}s</span>
        </span>
      )}
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
 * @param {string} props.level - Explanation level: 'simple', 'standard', or 'deep'
 * @param {number} props.stars - Star rating (1-3) for simple level
 * @param {number} props.maxStreak - Best answer streak
 * @param {number} props.speedBonuses - Number of speed bonuses earned
 * @param {number} props.avgTime - Average answer time in seconds
 * @param {string} props.celebrationStyle - Style for celebrations
 * @param {number} props.baseXp - Base XP before bonuses
 * @param {number} props.passBonus - Bonus XP for passing
 * @param {number} props.perfectBonus - Bonus XP for perfect score
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
  level = 'standard',
  stars = 0,
  maxStreak = 0,
  speedBonuses = 0,
  avgTime = null,
  celebrationStyle = 'balanced',
  baseXp = 0,
  passBonus = 0,
  perfectBonus = 0,
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

          {/* Result header - Level-specific adventure messages */}
          <h2
            className={`
              text-3xl font-bold mb-2
              ${passed
                ? 'text-success-600 dark:text-success-400'
                : 'text-amber-600 dark:text-amber-400'
              }
            `}
          >
            {level === 'simple'
              ? (passed ? 'You did it!' : 'Good try!')
              : level === 'deep'
              ? (passed ? 'Master Explorer!' : 'Keep Exploring!')
              : (passed ? 'Mission Complete!' : 'Almost There!')}
          </h2>

          {/* Encouraging subtext - Level appropriate adventure messages */}
          {!passed && (
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {level === 'simple'
                ? "You're learning so much! Try the mission again!"
                : level === 'deep'
                ? "Deep challenges are tough - that's how explorers grow!"
                : "You're so close to completing the mission!"}
            </p>
          )}

          {/* Simple Level: Star Rating */}
          {level === 'simple' && (
            <div className="mb-4">
              <StarRating stars={stars} />
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {stars === 3 ? 'Perfect!' : stars === 2 ? 'Great job!' : stars === 1 ? 'Good start!' : 'Keep practicing!'}
              </p>
            </div>
          )}

          {/* Standard/Deep Level: Score display */}
          {level !== 'simple' && (
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
          )}

          {/* Deep Level: Challenge Badge */}
          {level === 'deep' && passed && (
            <div className="mb-4">
              <DeepChallengeBadge bonusXp={passBonus + perfectBonus} />
            </div>
          )}

          {/* Streak Badge (standard and deep levels) */}
          {level !== 'simple' && maxStreak >= 2 && (
            <div className="mb-4 flex justify-center">
              <StreakBadge maxStreak={maxStreak} celebrationStyle={celebrationStyle} />
            </div>
          )}

          {/* Speed Bonus Summary (deep level only) */}
          {level === 'deep' && (
            <SpeedBonusSummary speedBonuses={speedBonuses} avgTime={avgTime} />
          )}

          {/* Mission completion threshold hint for fail */}
          {!passed && level !== 'simple' && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              You need <span className="font-semibold">{level === 'deep' ? '75%' : '60%'}</span> to complete the mission
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
                {/* Retry Mission button (primary for fail) */}
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
                  Retry Mission
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
            : 'Every explorer fails sometimes - retry the mission whenever you are ready!'}
        </p>
      </div>
    </div>
  )
}

// Export AnimatedXP for reuse
export { AnimatedXP }
