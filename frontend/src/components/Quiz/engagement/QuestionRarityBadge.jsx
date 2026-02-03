/**
 * QuestionRarityBadge - Visual badge component for question rarity
 *
 * Displays the rarity tier of a question with appropriate styling,
 * icons, and optional XP multiplier information.
 *
 * Returns null for common rarity (no badge displayed).
 * Non-common rarities render with tier-specific colors and icons.
 *
 * @param {Object} props
 * @param {'common'|'rare'|'epic'|'legendary'} props.rarity - Rarity tier
 * @param {'badge'|'inline'|'full'} props.variant - Display variant (default: 'badge')
 * @param {boolean} props.showMultiplier - Show XP multiplier (default: false)
 * @param {boolean} props.animate - Enable entrance animation (default: false)
 */

import PropTypes from 'prop-types'
import { getRarityConfig } from '../../../hooks/game/rarityConfig'

/**
 * Style configurations for each rarity tier.
 * Maps rarity IDs to Tailwind classes.
 */
const RARITY_STYLES = {
  rare: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    glow: 'shadow-blue-200',
  },
  epic: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
    glow: 'shadow-purple-200',
  },
  legendary: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    glow: 'shadow-amber-200',
  },
}

/**
 * Variant-specific style classes.
 */
const VARIANT_STYLES = {
  badge: {
    container: 'px-2 py-1 text-sm',
    text: 'font-medium',
  },
  inline: {
    container: 'px-1 py-0.5 text-xs inline',
    text: 'font-medium',
  },
  full: {
    container: 'px-4 py-2 text-lg full',
    text: 'font-bold',
  },
}

export default function QuestionRarityBadge({
  rarity,
  variant = 'badge',
  showMultiplier = false,
  animate = false,
}) {
  // Get rarity configuration (falls back to common for invalid input)
  const config = getRarityConfig(rarity)

  // Return null for common rarity (or any fallback to common)
  if (config.id === 'common') {
    return null
  }

  // Get style configurations
  const rarityStyle = RARITY_STYLES[config.id] || RARITY_STYLES.rare
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.badge

  // Build animation classes
  const animationClasses = animate
    ? config.id === 'legendary'
      ? 'animate-pulse shimmer'
      : 'animate-scale-in'
    : ''

  // Build the className string
  const className = [
    // Base styles
    'rounded-full',
    'border',
    'inline-flex',
    'items-center',
    'gap-1',
    // Rarity-specific styles
    rarityStyle.bg,
    rarityStyle.text,
    rarityStyle.border,
    // Variant-specific styles
    variantStyle.container,
    variantStyle.text,
    // Animation classes
    animationClasses,
    // Rarity identifier class for testing
    config.id,
  ]
    .filter(Boolean)
    .join(' ')

  // Build content
  const displayContent = (
    <>
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.name}</span>
      {(showMultiplier || variant === 'full') && (
        <span className="opacity-75">({config.xpMultiplier}x XP)</span>
      )}
    </>
  )

  return (
    <span
      data-testid="rarity-badge"
      className={className}
      role="status"
      aria-label={`${config.name} rarity question${
        showMultiplier || variant === 'full'
          ? ` with ${config.xpMultiplier}x XP multiplier`
          : ''
      }`}
    >
      {displayContent}
    </span>
  )
}

QuestionRarityBadge.propTypes = {
  rarity: PropTypes.oneOf(['common', 'rare', 'epic', 'legendary']),
  variant: PropTypes.oneOf(['badge', 'inline', 'full']),
  showMultiplier: PropTypes.bool,
  animate: PropTypes.bool,
}
