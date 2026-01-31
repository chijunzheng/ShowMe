/**
 * WorldPiece Component
 * WB011 + WB012: Renders an individual piece within the world diorama
 * WB020: Evolution system with tier-based animations and visual effects
 * WB021: Visual decay system based on time since last review
 *
 * Each piece represents a topic the user has learned about.
 * Pieces have visual styling based on their zone (nature, civilization, arcane)
 * and evolve through tiers as users learn related topics:
 *
 * Evolution Tiers:
 * - Seedling (1 topic): Basic piece, no animation
 * - Growing (3+ related): Breathing animation (subtle scale pulse)
 * - Flourishing (5+ related): Sway animation + ambient particles
 * - Legendary (10+ related): Full animation + golden glow + sparkles
 *
 * Freshness States (WB021):
 * - Fresh (0-7 days): Full opacity and saturation
 * - Fading (7-14 days): Slightly reduced opacity and saturation
 * - Sleepy (14+ days): Noticeably faded with "zzz" indicator
 */

import { useState, useCallback, useMemo } from 'react'
import './WorldPiece.css'

/**
 * Evolution tier configuration
 * Defines visual effects for each tier level
 */
const TIER_CONFIG = {
  seedling: {
    animation: null,
    particles: false,
    glow: false,
    golden: false,
    badge: { icon: '🌱', label: 'Seedling', color: 'bg-green-500' },
  },
  growing: {
    animation: 'piece-breathing',
    particles: false,
    glow: false,
    golden: false,
    badge: { icon: '🌿', label: 'Growing', color: 'bg-emerald-500' },
  },
  flourishing: {
    animation: 'piece-sway',
    particles: 'ambient',
    glow: true,
    golden: false,
    badge: { icon: '🌸', label: 'Flourishing', color: 'bg-pink-500' },
  },
  legendary: {
    animation: 'piece-legendary',
    particles: 'sparkle',
    glow: true,
    golden: true,
    badge: { icon: '✨', label: 'Legendary', color: 'bg-amber-500' },
  },
}

/**
 * Default tier configuration for unknown tiers
 */
const DEFAULT_TIER_CONFIG = TIER_CONFIG.seedling

/**
 * Zone-specific styling configurations
 * Each zone has distinct visual characteristics
 */
const ZONE_STYLES = {
  nature: {
    // Foreground - earthy, organic pieces
    glowColor: 'rgba(34, 197, 94, 0.4)', // Green glow
    borderColor: 'border-green-400',
    shadowColor: 'shadow-green-500/30',
    bgGradient: 'from-green-50 to-emerald-100',
  },
  civilization: {
    // Midground - structured, built pieces
    glowColor: 'rgba(99, 102, 241, 0.4)', // Indigo glow
    borderColor: 'border-primary-400',
    shadowColor: 'shadow-indigo-500/30',
    bgGradient: 'from-indigo-50 to-violet-100',
  },
  arcane: {
    // Background/sky - mystical, ethereal pieces
    glowColor: 'rgba(168, 85, 247, 0.4)', // Purple glow
    borderColor: 'border-purple-400',
    shadowColor: 'shadow-purple-500/30',
    bgGradient: 'from-purple-50 to-fuchsia-100',
  },
}

/**
 * Default fallback style for unknown zones
 */
const DEFAULT_ZONE_STYLE = {
  glowColor: 'rgba(148, 163, 184, 0.4)',
  borderColor: 'border-slate-400',
  shadowColor: 'shadow-slate-500/30',
  bgGradient: 'from-slate-50 to-gray-100',
}

/**
 * WB021: Calculate days since last review
 * Uses lastReviewedAt or unlockedAt as the reference date
 *
 * @param {Object} piece - The piece data
 * @returns {number} - Number of days since last review (or unlock if never reviewed)
 */
function getDaysSinceReview(piece) {
  const reviewDate = piece.lastReviewedAt || piece.unlockedAt
  if (!reviewDate) return 0

  const diffMs = Date.now() - new Date(reviewDate).getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * WB021: Determine freshness state based on days since review
 *
 * @param {number} days - Number of days since last review
 * @returns {'fresh' | 'fading' | 'sleepy'} - Freshness state
 */
function getFreshnessState(days) {
  if (days <= 7) return 'fresh'
  if (days <= 14) return 'fading'
  return 'sleepy'
}

/**
 * WB021: Sleepy indicator component - shows "zzz" for sleepy pieces
 */
function SleepyIndicator() {
  return (
    <div
      className="piece-sleepy-indicator"
      aria-label="This piece needs review"
    >
      <span className="text-slate-500">z</span>
      <span className="text-slate-400 text-[12px]">z</span>
      <span className="text-slate-300 text-[10px]">z</span>
    </div>
  )
}

/**
 * AmbientParticle - Floating particles for flourishing tier
 */
function AmbientParticle({ index, zoneColor }) {
  // Generate random position and animation delay for variation
  const style = useMemo(() => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${index * 0.5}s`,
    backgroundColor: zoneColor,
  }), [index, zoneColor])

  return (
    <div
      className="piece-ambient-particle"
      style={style}
      aria-hidden="true"
    />
  )
}

/**
 * SparkleParticle - Sparkle effects for legendary tier
 */
function SparkleParticle({ index }) {
  // Generate random position and animation delay for variation
  const style = useMemo(() => ({
    left: `${15 + Math.random() * 70}%`,
    top: `${15 + Math.random() * 70}%`,
    animationDelay: `${index * 0.3}s`,
  }), [index])

  return (
    <div
      className="piece-sparkle-particle"
      style={style}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full text-amber-300"
      >
        <path
          d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z"
          fill="currentColor"
        />
      </svg>
    </div>
  )
}

/**
 * TierBadge - Small indicator showing the piece's evolution tier
 */
function TierBadge({ tier }) {
  const config = TIER_CONFIG[tier] || DEFAULT_TIER_CONFIG

  return (
    <div
      className={`
        absolute -top-1 -right-1
        w-5 h-5 sm:w-6 sm:h-6
        rounded-full
        ${config.badge.color}
        flex items-center justify-center
        text-xs
        shadow-md
        border-2 border-white
        z-20
      `}
      title={config.badge.label}
      aria-label={`${config.badge.label} tier`}
    >
      <span className="text-[10px] sm:text-xs">{config.badge.icon}</span>
    </div>
  )
}

/**
 * WorldPiece - Renders a single world piece with hover and click interactions
 *
 * @param {Object} props - Component props
 * @param {Object} props.piece - The piece data
 * @param {string} props.piece.id - Unique piece identifier
 * @param {string} props.piece.name - Display name for the piece
 * @param {string} props.piece.zone - Zone type (nature, civilization, arcane)
 * @param {string} [props.piece.imageUrl] - Optional custom image URL
 * @param {string} [props.piece.icon] - Emoji icon for the piece
 * @param {string} [props.piece.tier] - Evolution tier (seedling, growing, flourishing, legendary)
 * @param {number} [props.piece.relatedCount] - Number of related topics learned
 * @param {string} [props.piece.lastReviewedAt] - ISO date of last review
 * @param {string} [props.piece.unlockedAt] - ISO date when piece was unlocked
 * @param {number} [props.piece.x] - Horizontal position within layer (0-100)
 * @param {number} [props.piece.y] - Vertical position within layer (0-100)
 * @param {Function} [props.onClick] - Callback when piece is clicked
 * @param {boolean} [props.isRefreshed] - WB021: Whether piece was just refreshed (triggers animation)
 */
function WorldPiece({ piece, onClick, isRefreshed = false }) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  const zoneStyle = ZONE_STYLES[piece.zone] || DEFAULT_ZONE_STYLE

  // Get tier configuration - default to seedling if not specified
  // Support both evolutionTier (from backend) and tier (legacy) property names
  const tier = piece.evolutionTier || piece.tier || 'seedling'
  const tierConfig = TIER_CONFIG[tier] || DEFAULT_TIER_CONFIG

  // WB021: Calculate freshness state based on days since review
  const daysSinceReview = useMemo(() => getDaysSinceReview(piece), [piece.lastReviewedAt, piece.unlockedAt])
  const freshnessState = useMemo(() => getFreshnessState(daysSinceReview), [daysSinceReview])

  // Extract zone glow color for particle effects (convert rgba to more visible opacity)
  const particleColor = zoneStyle.glowColor.replace('0.4)', '0.6)')

  /**
   * Handle piece click - trigger callback with piece data
   */
  const handleClick = useCallback(() => {
    onClick?.(piece)
  }, [piece, onClick])

  /**
   * Handle keyboard activation for accessibility
   */
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }, [handleClick])

  /**
   * Handle image load error - fall back to icon display
   */
  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  // Build dynamic class list based on tier configuration and freshness state
  const containerClasses = [
    'relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24',
    'rounded-xl cursor-pointer',
    'transition-all duration-300 ease-out',
    `border-2 ${zoneStyle.borderColor}`,
    zoneStyle.shadowColor,
    `bg-gradient-to-br ${zoneStyle.bgGradient}`,
    isHovered ? 'scale-110 shadow-xl z-10' : 'scale-100 shadow-md',
    'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
    // Tier-based animation classes
    tierConfig.animation || '',
    // Golden border for legendary tier
    tierConfig.golden ? 'piece-golden-border' : '',
    // WB021: Freshness-based visual decay classes
    `piece-freshness-${freshnessState}`,
    // WB021: Refresh animation when piece is reviewed
    isRefreshed ? 'piece-refreshed' : '',
  ].filter(Boolean).join(' ')

  // Build dynamic box shadow based on tier and hover state
  const boxShadowStyle = useMemo(() => {
    const shadows = []

    // Base hover glow
    if (isHovered) {
      shadows.push(`0 0 20px ${zoneStyle.glowColor}`)
      shadows.push('0 8px 25px rgba(0,0,0,0.15)')
    }

    // Tier-based glow (flourishing and legendary)
    if (tierConfig.glow) {
      const glowIntensity = tierConfig.golden ? '0.6' : '0.4'
      const glowColor = tierConfig.golden
        ? `rgba(251, 191, 36, ${glowIntensity})` // Amber glow for legendary
        : zoneStyle.glowColor.replace('0.4)', `${glowIntensity})`)
      shadows.push(`0 0 ${tierConfig.golden ? '30px' : '20px'} ${glowColor}`)
    }

    return shadows.length > 0 ? shadows.join(', ') : undefined
  }, [isHovered, zoneStyle.glowColor, tierConfig.glow, tierConfig.golden])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={containerClasses}
      style={{ boxShadow: boxShadowStyle }}
      aria-label={`${piece.name} - ${piece.zone} piece, ${tier} tier`}
    >
      {/* Tier evolution badge */}
      <TierBadge tier={tier} />

      {/* WB021: Sleepy indicator for pieces that need review */}
      {freshnessState === 'sleepy' && <SleepyIndicator />}

      {/* Ambient particles for flourishing tier */}
      {tierConfig.particles === 'ambient' && (
        <div className="piece-particles-container">
          {[0, 1, 2, 3].map((i) => (
            <AmbientParticle key={i} index={i} zoneColor={particleColor} />
          ))}
        </div>
      )}

      {/* Sparkle particles for legendary tier */}
      {tierConfig.particles === 'sparkle' && (
        <div className="piece-particles-container">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SparkleParticle key={i} index={i} />
          ))}
        </div>
      )}

      {/* Piece content - image or icon fallback */}
      <div className="relative w-full h-full overflow-hidden rounded-lg">
        {piece.imageUrl && !imageError ? (
          <img
            src={piece.imageUrl}
            alt={piece.name}
            onError={handleImageError}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl sm:text-3xl md:text-4xl select-none">
              {piece.icon || '?'}
            </span>
          </div>
        )}

        {/* Golden overlay shimmer for legendary pieces */}
        {tierConfig.golden && (
          <div
            className="piece-golden-shimmer"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Piece name tooltip on hover */}
      {isHovered && (
        <div
          className={`
            absolute -bottom-8 left-1/2 -translate-x-1/2
            px-2 py-1 rounded-md
            bg-slate-800 text-white text-xs
            whitespace-nowrap
            animate-fade-in
            shadow-lg
            z-20
          `}
        >
          {piece.name}
          {piece.relatedCount > 1 && (
            <span className="ml-1 text-slate-400">
              ({piece.relatedCount} related)
            </span>
          )}
          {/* Tooltip arrow */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
        </div>
      )}

      {/* Subtle shimmer effect for arcane pieces */}
      {piece.zone === 'arcane' && (
        <div
          className={`
            absolute inset-0 rounded-lg pointer-events-none
            bg-gradient-to-tr from-transparent via-white/20 to-transparent
            ${isHovered ? 'opacity-100' : 'opacity-0'}
            transition-opacity duration-500
          `}
        />
      )}
    </div>
  )
}

// Export tier configuration and freshness utilities for use in other components
export { TIER_CONFIG, getDaysSinceReview, getFreshnessState }

export default WorldPiece
