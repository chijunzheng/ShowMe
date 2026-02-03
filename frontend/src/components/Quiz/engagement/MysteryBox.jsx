/**
 * MysteryBox - Mystery Box Visual Component
 *
 * Displays a mystery box chest with tier-specific styling and animations
 * for each phase of the opening ceremony.
 *
 * Phases:
 * - hidden: Invisible (opacity-0)
 * - appearing: Fade in with scale animation
 * - shaking: Wobble animation to build anticipation
 * - opening: Lid opening with glow effect
 * - open/revealed: Opened chest with particles
 *
 * @param {Object} props
 * @param {Object} props.tier - Tier object from MYSTERY_BOX_TIERS
 * @param {string} props.phase - Current phase of the opening ceremony
 * @param {Function} props.onTap - Callback when box is tapped
 * @param {boolean} props.tapToOpen - Whether the box can be tapped to open
 */

import { useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'

/**
 * Tier-specific styling configurations.
 */
const TIER_STYLES = {
  bronze: {
    gradient: 'bg-gradient-to-br from-amber-600 to-orange-700',
    border: 'border-amber-500',
    glow: 'shadow-amber-500/50',
    textColor: 'text-amber-100',
  },
  silver: {
    gradient: 'bg-gradient-to-br from-slate-300 to-gray-400',
    border: 'border-slate-400',
    glow: 'shadow-slate-400/50',
    textColor: 'text-slate-700',
  },
  gold: {
    gradient: 'bg-gradient-to-br from-yellow-400 to-amber-500',
    border: 'border-yellow-300',
    glow: 'shadow-yellow-400/50',
    textColor: 'text-yellow-900',
  },
  legendary: {
    gradient: 'bg-gradient-to-br from-purple-500 to-violet-600',
    border: 'border-purple-400',
    glow: 'shadow-purple-500/50',
    textColor: 'text-purple-100',
  },
}

/**
 * Default styling for when tier is undefined.
 */
const DEFAULT_STYLE = TIER_STYLES.bronze

export default function MysteryBox({
  tier,
  phase,
  onTap,
  tapToOpen = false,
}) {
  // Get tier-specific styling
  const tierStyle = useMemo(() => {
    if (!tier || !tier.id) {
      return DEFAULT_STYLE
    }
    return TIER_STYLES[tier.id] || DEFAULT_STYLE
  }, [tier])

  // Get tier icon (fallback to gift box if no tier)
  const tierIcon = tier?.icon || '\u{1F381}'
  const tierName = tier?.name || 'Mystery'

  // Determine if box is interactive
  const isInteractive = tapToOpen && phase !== 'hidden' && phase !== 'open' && phase !== 'revealed' && phase !== 'opening'

  // Handle click/tap
  const handleClick = useCallback(() => {
    if (isInteractive && onTap) {
      onTap()
    }
  }, [isInteractive, onTap])

  // Handle keyboard interaction for accessibility
  const handleKeyDown = useCallback((event) => {
    if ((event.key === 'Enter' || event.key === ' ') && isInteractive) {
      event.preventDefault()
      if (onTap) {
        onTap()
      }
    }
  }, [isInteractive, onTap])

  // Build container class names based on phase
  const containerClasses = useMemo(() => {
    const baseClasses = [
      'relative',
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'w-32',
      'h-32',
      'rounded-xl',
      'transition-all',
      'duration-300',
      tierStyle.gradient,
      'border-2',
      tierStyle.border,
    ]

    // Phase-specific classes
    switch (phase) {
      case 'hidden':
        return [...baseClasses, 'opacity-0', 'invisible', 'scale-0'].join(' ')

      case 'appearing':
        return [
          ...baseClasses,
          'opacity-100',
          'scale-100',
          'animate-bounce',
          'transform',
          'shadow-lg',
          tierStyle.glow,
        ].join(' ')

      case 'shaking':
        return [
          ...baseClasses,
          'opacity-100',
          tier?.id === 'legendary' ? 'animate-pulse' : 'animate-wiggle',
          'shadow-xl',
          tierStyle.glow,
          isInteractive ? 'cursor-pointer' : '',
        ].join(' ')

      case 'opening':
        return [
          ...baseClasses,
          'opacity-100',
          'animate-pulse',
          'shadow-2xl',
          'open',
          tierStyle.glow,
        ].join(' ')

      case 'open':
      case 'revealed':
        return [
          ...baseClasses,
          'opacity-100',
          'open',
          'shadow-2xl',
          tierStyle.glow,
        ].join(' ')

      default:
        return baseClasses.join(' ')
    }
  }, [phase, tierStyle, tier?.id, isInteractive])

  // Determine aria-label
  const ariaLabel = `${tierName} Mystery Box${tapToOpen && isInteractive ? ' - Tap to open' : ''}`

  return (
    <div
      data-testid="mystery-box"
      role="button"
      aria-label={ariaLabel}
      tabIndex={isInteractive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={containerClasses}
    >
      {/* Chest body */}
      <div
        className={`
          text-5xl
          ${phase === 'opening' || phase === 'open' || phase === 'revealed' ? 'animate-bounce' : ''}
        `}
        data-open={phase === 'open' || phase === 'revealed' || phase === 'opening'}
      >
        {phase === 'open' || phase === 'revealed' || phase === 'opening' ? '\u{1F381}' : '\u{1F4E6}'}
      </div>

      {/* Tier icon badge */}
      <div className={`
        absolute -top-2 -right-2
        w-8 h-8
        flex items-center justify-center
        bg-white rounded-full
        shadow-md
        border ${tierStyle.border}
        text-lg
      `}>
        {tierIcon}
      </div>

      {/* Particles for open state */}
      {(phase === 'open' || phase === 'revealed') && (
        <div
          data-testid="particles"
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl particle"
        >
          {/* Sparkle particles */}
          <span className="absolute top-2 left-4 text-yellow-300 animate-ping">*</span>
          <span className="absolute top-4 right-3 text-yellow-200 animate-pulse">*</span>
          <span className="absolute bottom-3 left-6 text-white animate-ping delay-100">*</span>
          <span className="absolute bottom-2 right-4 text-yellow-100 animate-pulse delay-200">*</span>
        </div>
      )}

      {/* Tap to open indicator */}
      {tapToOpen && isInteractive && phase !== 'hidden' && (
        <div
          data-testid="tap-indicator"
          className={`
            absolute -bottom-8
            text-sm font-medium
            ${tierStyle.textColor}
            animate-pulse
          `}
        >
          Tap to open!
        </div>
      )}
    </div>
  )
}

MysteryBox.propTypes = {
  tier: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    icon: PropTypes.string,
  }),
  phase: PropTypes.oneOf(['hidden', 'appearing', 'shaking', 'opening', 'open', 'revealed']),
  onTap: PropTypes.func,
  tapToOpen: PropTypes.bool,
}
