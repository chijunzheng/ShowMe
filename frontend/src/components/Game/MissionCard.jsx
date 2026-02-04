/**
 * MissionCard Component
 * GAMIFY-004: Individual mission display with progress and claim functionality
 *
 * Displays a single mission with:
 * - Title and description
 * - Progress bar visualization (e.g., "2/3")
 * - XP reward preview
 * - Claim button (enabled when complete)
 * - Celebratory animation when claiming
 */

import { useState, useCallback } from 'react'

/**
 * Formats a number with commas for display
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
function formatNumber(num) {
  return num.toLocaleString()
}

/**
 * @param {Object} props
 * @param {Object} props.mission - Mission object containing id, title, description, progress, target, xpReward, type, isComplete, isClaimed
 * @param {Function} props.onClaim - Callback when claim button is clicked, receives mission object
 */
export default function MissionCard({ mission, onClaim }) {
  const [isClaiming, setIsClaiming] = useState(false)

  const isComplete = Boolean(mission?.isComplete)
  const isClaimed = Boolean(mission?.isClaimed)

  // Handle claim button click
  const handleClaim = useCallback(() => {
    if (!isComplete || isClaimed || isClaiming) {
      return
    }

    setIsClaiming(true)

    // Small delay for animation effect
    setTimeout(() => {
      onClaim?.(mission)
      setIsClaiming(false)
    }, 300)
  }, [isComplete, isClaimed, isClaiming, onClaim, mission])

  // Early return for null/undefined mission (keep hooks order stable)
  if (!mission) {
    return null
  }

  const {
    title,
    description,
    progress = 0,
    target = 1,
    xpReward = 0,
  } = mission

  // Calculate progress percentage safely
  const progressPercent = target > 0 ? (progress / target) * 100 : 0

  // Determine card styling based on state
  const getCardClasses = () => {
    const baseClasses = `
      relative p-4 rounded-xl border transition-all duration-300
      bg-white dark:bg-gray-800
    `

    if (isClaimed) {
      return `${baseClasses} opacity-60 border-gray-200 dark:border-gray-700 claimed`
    }

    if (isComplete) {
      return `${baseClasses} border-primary/50 bg-gradient-to-br from-primary/5 to-cyan-500/5 shadow-md`
    }

    return `${baseClasses} border-gray-200 dark:border-gray-700`
  }

  // Determine if claim animation should play
  const animationClasses = isClaiming ? 'animate-claim scale-105' : ''

  return (
    <div
      className={`${getCardClasses()} ${animationClasses}`}
      data-testid="mission-card"
    >
      {/* Header: Title and XP Reward */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {description}
          </p>
        </div>

        {/* XP Reward Badge */}
        <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            {formatNumber(xpReward)}
          </span>
          <span className="text-xs text-amber-500 dark:text-amber-500">XP</span>
        </div>
      </div>

      {/* Progress Section */}
      <div className="mt-3">
        {/* Progress Text */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Progress
          </span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {progress}/{target}
          </span>
        </div>

        {/* Progress Bar */}
        <div
          className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={target}
          data-testid="progress-bar"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isComplete
                ? 'bg-gradient-to-r from-primary to-cyan-500'
                : 'bg-primary/70'
            }`}
            style={{ width: `${progressPercent}%` }}
            data-testid="progress-bar-fill"
          />
        </div>
      </div>

      {/* Claim Button / Status */}
      <div className="mt-3 flex justify-end">
        {isClaimed ? (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Claimed
          </span>
        ) : (
          <button
            onClick={handleClaim}
            disabled={!isComplete || isClaiming}
            className={`
              px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200
              ${
                isComplete
                  ? 'bg-primary text-white hover:bg-primary/90 active:scale-95 shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }
            `}
            aria-label="Claim reward"
          >
            {isClaiming ? (
              <span className="flex items-center gap-1">
                <svg
                  className="w-3 h-3 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Claiming...
              </span>
            ) : (
              'Claim'
            )}
          </button>
        )}
      </div>

      {/* Complete indicator glow effect */}
      {isComplete && !isClaimed && (
        <div className="absolute inset-0 rounded-xl pointer-events-none">
          <div className="absolute inset-0 rounded-xl animate-pulse bg-primary/5" />
        </div>
      )}
    </div>
  )
}
