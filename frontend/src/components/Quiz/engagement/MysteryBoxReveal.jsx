/**
 * MysteryBoxReveal - Mystery Box Opening Ceremony and Reward Display
 *
 * Full-screen overlay displaying the mystery box rewards after opening.
 * Shows tier, XP bonus, optional power-up, and piece rarity with animations.
 *
 * Features:
 * - Level-specific theming (simple/standard/deep)
 * - Sequential reward reveals with staggered animations
 * - Confetti effect for legendary tier
 * - Accessible dialog with focus management
 * - Sound effects integration
 *
 * @param {Object} props
 * @param {Object} props.rewards - Reward object with tier, xpBonus, powerUp, pieceRarity
 * @param {boolean} props.show - Whether to show the reveal overlay
 * @param {Function} props.onComplete - Callback when user dismisses (passes rewards)
 * @param {'simple'|'standard'|'deep'} props.level - Difficulty level for theming
 */

import { useMemo, useCallback, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

/**
 * Level-specific theme configurations.
 */
const LEVEL_THEMES = {
  simple: {
    gradient: 'from-emerald-500 to-green-600',
    border: 'border-emerald-400',
    accent: 'text-emerald-300',
    bgAccent: 'bg-emerald-500/20',
  },
  standard: {
    gradient: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-400',
    accent: 'text-cyan-300',
    bgAccent: 'bg-cyan-500/20',
  },
  deep: {
    gradient: 'from-purple-500 to-violet-600',
    border: 'border-violet-400',
    accent: 'text-violet-300',
    bgAccent: 'bg-violet-500/20',
  },
}

/**
 * Default theme for invalid/missing level.
 */
const DEFAULT_THEME = LEVEL_THEMES.standard

/**
 * Rarity color mappings.
 */
const RARITY_COLORS = {
  common: 'text-gray-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
}

export default function MysteryBoxReveal({
  rewards,
  show,
  onComplete,
  level,
}) {
  const buttonRef = useRef(null)

  // Get level-specific theme
  const theme = useMemo(() => {
    if (!level || !LEVEL_THEMES[level]) {
      return DEFAULT_THEME
    }
    return LEVEL_THEMES[level]
  }, [level])

  // Extract reward data with safe defaults
  const tier = rewards?.tier
  const tierName = tier?.name || 'Unknown'
  const tierIcon = tier?.icon || '\u{1F381}'
  const xpBonus = rewards?.xpBonus || 0
  const powerUp = rewards?.powerUp
  const pieceRarity = rewards?.pieceRarity || 'common'

  // Determine if this is a legendary reveal
  const isLegendary = tier?.id === 'legendary'

  // Handle continue button click
  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete(rewards)
    }
  }, [onComplete, rewards])

  // Handle keyboard events on button
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter') {
      handleComplete()
    }
  }, [handleComplete])

  // Focus the button when shown for accessibility
  useEffect(() => {
    if (show && buttonRef.current) {
      buttonRef.current.focus()
    }
  }, [show])

  // Build container classes
  const containerClasses = useMemo(() => {
    const baseClasses = [
      'fixed',
      'inset-0',
      'z-50',
      'flex',
      'items-center',
      'justify-center',
      'transition-all',
      'duration-300',
      'animate-fadeIn',
    ]

    if (isLegendary) {
      baseClasses.push('legendary')
    }

    if (level) {
      baseClasses.push(level)
    }

    return baseClasses.join(' ')
  }, [isLegendary, level])

  // Build content classes
  const contentClasses = useMemo(() => {
    const baseClasses = [
      'relative',
      'flex',
      'flex-col',
      'items-center',
      'p-8',
      'rounded-2xl',
      'bg-white',
      'shadow-2xl',
      'border-2',
      theme.border,
      'max-w-sm',
      'w-full',
      'mx-4',
      'stagger',
    ]

    // Add legendary-specific styling
    if (isLegendary) {
      baseClasses.push('ring-4', 'ring-yellow-400/50', 'animate-pulse')
    }

    return baseClasses.join(' ')
  }, [theme, isLegendary])

  // Don't render if not showing
  if (!show) {
    return null
  }

  // Handle case where rewards is null/undefined
  if (!rewards) {
    return null
  }

  return (
    <div
      data-testid="mystery-box-reveal"
      role="dialog"
      aria-label={`${tierName} Mystery Box Rewards`}
      className={containerClasses}
    >
      {/* Backdrop overlay */}
      <div
        data-testid="backdrop"
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
      />

      {/* Confetti for legendary */}
      {isLegendary && (
        <div
          data-testid="confetti"
          className="absolute inset-0 pointer-events-none overflow-hidden"
        >
          {/* Animated confetti particles */}
          <span className="absolute top-1/4 left-1/4 text-yellow-300 text-2xl animate-bounce">*</span>
          <span className="absolute top-1/3 right-1/4 text-purple-400 text-xl animate-ping">*</span>
          <span className="absolute top-1/2 left-1/3 text-pink-300 text-lg animate-pulse">*</span>
          <span className="absolute bottom-1/4 right-1/3 text-blue-400 text-2xl animate-bounce delay-100">*</span>
          <span className="absolute bottom-1/3 left-1/4 text-green-300 text-xl animate-ping delay-200">*</span>
        </div>
      )}

      {/* Particles */}
      <div
        data-testid="particles"
        className="absolute inset-0 pointer-events-none overflow-hidden particle"
      >
        <span className="absolute top-10 left-10 text-yellow-200 animate-ping text-sm">*</span>
        <span className="absolute top-20 right-16 text-white animate-pulse text-xs">*</span>
        <span className="absolute bottom-20 left-20 text-yellow-100 animate-ping delay-150 text-sm">*</span>
      </div>

      {/* Main content card */}
      <div
        data-testid="reward-content"
        className={contentClasses}
      >
        {/* Tier header */}
        <div className="flex flex-col items-center mb-6">
          <span className="text-5xl mb-2">{tierIcon}</span>
          <h2
            data-testid="tier-name"
            className={`
              text-2xl font-bold
              bg-gradient-to-r ${theme.gradient} bg-clip-text text-transparent
            `}
          >
            {/* Avoid duplicate "legendary" when both tier and rarity are legendary */}
            {isLegendary && pieceRarity === 'legendary' ? 'Supreme' : tierName} Box!
          </h2>
        </div>

        {/* Rewards list */}
        <div className="w-full space-y-4">
          {/* XP Bonus */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 delay-100">
            <span className="text-gray-600 font-medium">Bonus Points</span>
            <span className="text-xl font-bold text-emerald-600">
              +{xpBonus} XP
            </span>
          </div>

          {/* Piece Unlock */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 delay-200">
            <span className="text-gray-600 font-medium">New Piece</span>
            <span
              data-testid="piece-rarity"
              className={`text-lg font-bold capitalize ${RARITY_COLORS[pieceRarity] || 'text-gray-500'}`}
            >
              {pieceRarity}
            </span>
          </div>

          {/* Power-up (if present) */}
          {powerUp && (
            <div
              data-testid="power-up-description"
              className={`
                flex flex-col p-3 rounded-lg
                ${theme.bgAccent}
                border ${theme.border}
                delay-300
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-medium ${theme.accent}`}>Power-Up!</span>
                <span className="text-2xl">{powerUp.icon}</span>
              </div>
              <span className="font-bold text-gray-800">{powerUp.name}</span>
              <span className="text-sm text-gray-600 mt-1">{powerUp.description}</span>
            </div>
          )}
        </div>

        {/* Continue button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={handleComplete}
          onKeyDown={handleKeyDown}
          className={`
            mt-6
            px-8 py-3
            rounded-full
            font-bold
            text-white
            bg-gradient-to-r ${theme.gradient}
            shadow-lg
            hover:shadow-xl
            transform hover:scale-105
            transition-all duration-200
            focus:outline-none focus:ring-4 focus:ring-offset-2
            ${theme.border}
          `}
        >
          Collect Rewards!
        </button>
      </div>
    </div>
  )
}

MysteryBoxReveal.propTypes = {
  rewards: PropTypes.shape({
    tier: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      icon: PropTypes.string,
    }),
    xpBonus: PropTypes.number,
    powerUp: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      icon: PropTypes.string,
      description: PropTypes.string,
    }),
    pieceRarity: PropTypes.oneOf(['common', 'rare', 'epic', 'legendary']),
  }),
  show: PropTypes.bool,
  onComplete: PropTypes.func,
  level: PropTypes.oneOf(['simple', 'standard', 'deep']),
}
