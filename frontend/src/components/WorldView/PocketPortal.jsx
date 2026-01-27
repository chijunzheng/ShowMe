/**
 * PocketPortal Component
 * WB013: Renders a swirling portal that appears when 3+ related pieces cluster in a sub-category
 *
 * When multiple pieces share a common category (ocean, space, dinosaurs, etc.),
 * they can be grouped into a "pocket world" accessible through this portal.
 *
 * Visual Features:
 * - Swirling portal animation with multiple layers
 * - Category icon and label
 * - Piece count badge
 * - Glow effect matching the parent zone color
 */

import { useState, useCallback } from 'react'

/**
 * Category-specific theming for portals
 * Each category has a distinct visual style
 */
const CATEGORY_THEMES = {
  ocean: {
    icon: '🌊',
    label: 'Ocean Pocket',
    bgGradient: 'from-cyan-400 to-blue-600',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    ringColor: 'border-cyan-300',
  },
  space: {
    icon: '🚀',
    label: 'Space Pocket',
    bgGradient: 'from-indigo-500 to-purple-800',
    glowColor: 'rgba(99, 102, 241, 0.6)',
    ringColor: 'border-indigo-300',
  },
  dinosaurs: {
    icon: '🦖',
    label: 'Dinosaur Pocket',
    bgGradient: 'from-amber-500 to-orange-700',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    ringColor: 'border-amber-300',
  },
  ancient: {
    icon: '🏛️',
    label: 'Ancient Pocket',
    bgGradient: 'from-yellow-600 to-amber-800',
    glowColor: 'rgba(217, 119, 6, 0.6)',
    ringColor: 'border-yellow-300',
  },
  plants: {
    icon: '🌿',
    label: 'Plant Pocket',
    bgGradient: 'from-green-400 to-emerald-600',
    glowColor: 'rgba(34, 197, 94, 0.6)',
    ringColor: 'border-green-300',
  },
  animals: {
    icon: '🦁',
    label: 'Animal Pocket',
    bgGradient: 'from-orange-400 to-red-600',
    glowColor: 'rgba(251, 146, 60, 0.6)',
    ringColor: 'border-orange-300',
  },
  weather: {
    icon: '⛈️',
    label: 'Weather Pocket',
    bgGradient: 'from-slate-400 to-blue-700',
    glowColor: 'rgba(100, 116, 139, 0.6)',
    ringColor: 'border-slate-300',
  },
  technology: {
    icon: '💻',
    label: 'Tech Pocket',
    bgGradient: 'from-cyan-500 to-blue-700',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    ringColor: 'border-cyan-300',
  },
  music: {
    icon: '🎵',
    label: 'Music Pocket',
    bgGradient: 'from-pink-400 to-purple-600',
    glowColor: 'rgba(236, 72, 153, 0.6)',
    ringColor: 'border-pink-300',
  },
  general: {
    icon: '✨',
    label: 'Knowledge Pocket',
    bgGradient: 'from-violet-400 to-purple-600',
    glowColor: 'rgba(139, 92, 246, 0.6)',
    ringColor: 'border-violet-300',
  },
}

/**
 * Get theme for a category, falling back to general theme
 */
function getCategoryTheme(category) {
  return CATEGORY_THEMES[category?.toLowerCase()] || CATEGORY_THEMES.general
}

/**
 * Zone-specific glow colors (used when portal is in a specific zone)
 */
const ZONE_GLOWS = {
  nature: 'rgba(34, 197, 94, 0.4)',
  civilization: 'rgba(99, 102, 241, 0.4)',
  arcane: 'rgba(168, 85, 247, 0.4)',
}

/**
 * PocketPortal - A swirling portal entry point to a pocket world
 *
 * @param {Object} props - Component props
 * @param {string} props.category - Category of this pocket (e.g., "ocean", "space")
 * @param {Array} props.pieces - Array of pieces contained in this pocket
 * @param {string} props.zone - Parent zone (nature, civilization, arcane)
 * @param {Object} [props.position] - Position within layer {x, y}
 * @param {Function} props.onClick - Callback when portal is clicked
 */
function PocketPortal({
  category,
  pieces = [],
  zone = 'nature',
  position = { x: 0, y: 0 },
  onClick,
}) {
  const [isHovered, setIsHovered] = useState(false)
  const theme = getCategoryTheme(category)
  const zoneGlow = ZONE_GLOWS[zone] || ZONE_GLOWS.nature

  /**
   * Handle portal click - enters the pocket world
   */
  const handleClick = useCallback(() => {
    onClick?.({
      category,
      pieces,
      zone,
      theme,
    })
  }, [category, pieces, zone, theme, onClick])

  /**
   * Handle keyboard activation for accessibility
   */
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }, [handleClick])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28
        cursor-pointer rounded-full
        transition-all duration-300 ease-out
        ${isHovered ? 'scale-110' : 'scale-100'}
        focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2
      `}
      style={{
        boxShadow: isHovered
          ? `0 0 30px ${theme.glowColor}, 0 0 60px ${zoneGlow}`
          : `0 0 15px ${theme.glowColor}`,
      }}
      aria-label={`Enter ${theme.label} with ${pieces.length} pieces`}
    >
      {/* Outer swirling ring */}
      <div
        className={`
          absolute inset-0 rounded-full
          border-4 ${theme.ringColor}
          portal-swirl
          opacity-60
        `}
        style={{
          background: `conic-gradient(from 0deg, transparent, ${theme.glowColor}, transparent)`,
        }}
      />

      {/* Middle swirling ring (counter-rotate) */}
      <div
        className={`
          absolute inset-2 rounded-full
          border-2 ${theme.ringColor}
          portal-swirl-reverse
          opacity-40
        `}
        style={{
          background: `conic-gradient(from 180deg, transparent, ${theme.glowColor}, transparent)`,
        }}
      />

      {/* Inner portal content */}
      <div
        className={`
          absolute inset-3 rounded-full
          bg-gradient-to-br ${theme.bgGradient}
          flex flex-col items-center justify-center
          shadow-inner
        `}
      >
        {/* Category icon */}
        <span className="text-2xl sm:text-3xl select-none portal-float">
          {theme.icon}
        </span>
      </div>

      {/* Piece count badge */}
      <div
        className={`
          absolute -top-1 -right-1
          w-6 h-6 sm:w-7 sm:h-7
          rounded-full
          bg-white shadow-lg
          flex items-center justify-center
          text-xs sm:text-sm font-bold text-slate-700
          ${isHovered ? 'scale-110' : 'scale-100'}
          transition-transform duration-200
        `}
      >
        {pieces.length}
      </div>

      {/* Label on hover */}
      {isHovered && (
        <div
          className={`
            absolute -bottom-10 left-1/2 -translate-x-1/2
            px-3 py-1.5 rounded-lg
            bg-slate-800 text-white text-xs sm:text-sm
            whitespace-nowrap
            animate-fade-in
            shadow-lg
            z-20
          `}
        >
          {theme.label}
          {/* Tooltip arrow */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
        </div>
      )}

      {/* Sparkle particles around portal */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-white rounded-full portal-particle" style={{ animationDelay: '0s' }} />
        <div className="absolute top-1/4 right-0 w-1 h-1 bg-white rounded-full portal-particle" style={{ animationDelay: '0.3s' }} />
        <div className="absolute bottom-0 left-1/3 w-1.5 h-1.5 bg-white rounded-full portal-particle" style={{ animationDelay: '0.6s' }} />
        <div className="absolute top-1/3 left-0 w-1 h-1 bg-white rounded-full portal-particle" style={{ animationDelay: '0.9s' }} />
      </div>
    </div>
  )
}

export default PocketPortal
