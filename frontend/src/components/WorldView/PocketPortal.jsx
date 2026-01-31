/**
 * PocketPortal Component
 * WB013: Renders a swirling portal that appears when 3+ related pieces cluster in a sub-category
 * WB019: Displays generated connection scene as portal cover image
 *
 * When multiple pieces share a common category (ocean, space, dinosaurs, etc.),
 * they can be grouped into a "pocket world" accessible through this portal.
 *
 * Visual Features:
 * - Connection scene image as portal cover (if available)
 * - Loading shimmer while scene generates
 * - "New!" badge when scene was recently updated
 * - Fallback to category icon if no scene
 * - Swirling portal animation with multiple layers
 * - Piece count badge
 * - Glow effect matching the parent zone color
 */

import { useState, useCallback, useMemo } from 'react'

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
 * Evolution level styling configurations
 */
const EVOLUTION_STYLES = {
  initial: {
    borderWidth: 'border-2',
    glowIntensity: 1,
  },
  enhanced: {
    borderWidth: 'border-3',
    glowIntensity: 1.5,
  },
  legendary: {
    borderWidth: 'border-4',
    glowIntensity: 2,
  },
}

/**
 * Check if scene was recently updated (within last 5 minutes)
 *
 * @param {Date|string|null} generatedAt - When scene was generated
 * @returns {boolean} True if scene is "new"
 */
function isRecentlyUpdated(generatedAt) {
  if (!generatedAt) return false

  const generatedDate = new Date(generatedAt)
  const now = new Date()
  const fiveMinutesMs = 5 * 60 * 1000

  return (now - generatedDate) < fiveMinutesMs
}

/**
 * Generate piece thumbnail collage positions for fallback display
 *
 * @param {number} count - Number of pieces
 * @returns {Array} Array of position objects {x, y, scale}
 */
function getCollagePositions(count) {
  // Position up to 4 thumbnails in corners/center
  const positions = [
    { x: 20, y: 20, scale: 0.4 },
    { x: 60, y: 25, scale: 0.35 },
    { x: 25, y: 55, scale: 0.38 },
    { x: 55, y: 58, scale: 0.35 },
  ]

  return positions.slice(0, Math.min(count, 4))
}

/**
 * PocketPortal - A swirling portal entry point to a pocket world
 *
 * @param {Object} props - Component props
 * @param {string} props.pocketId - Unique ID for this pocket
 * @param {string} props.category - Category of this pocket (e.g., "ocean", "space")
 * @param {Array} props.pieces - Array of pieces contained in this pocket
 * @param {string} props.zone - Parent zone (nature, civilization, arcane)
 * @param {Object} [props.connectionScene] - Generated scene data
 * @param {string} [props.connectionScene.imageUrl] - URL of generated scene image
 * @param {Date|string} [props.connectionScene.generatedAt] - When scene was generated
 * @param {string} [props.connectionScene.evolutionLevel] - 'initial' | 'enhanced' | 'legendary'
 * @param {boolean} [props.isGeneratingScene] - Whether scene is currently being generated
 * @param {Object} [props.position] - Position within layer {x, y}
 * @param {Function} props.onClick - Callback when portal is clicked
 */
function PocketPortal({
  pocketId,
  category,
  pieces = [],
  zone = 'nature',
  connectionScene,
  isGeneratingScene = false,
  position = { x: 0, y: 0 },
  onClick,
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  const theme = getCategoryTheme(category)
  const zoneGlow = ZONE_GLOWS[zone] || ZONE_GLOWS.nature

  // Determine if we have a valid scene to display
  const hasValidScene = connectionScene?.imageUrl && !imageError

  // Check if scene is recently updated for "New!" badge
  const isNew = useMemo(() => {
    return isRecentlyUpdated(connectionScene?.generatedAt)
  }, [connectionScene?.generatedAt])

  // Get evolution styling
  const evolutionLevel = connectionScene?.evolutionLevel || 'initial'
  const evolutionStyle = EVOLUTION_STYLES[evolutionLevel] || EVOLUTION_STYLES.initial

  // Calculate glow intensity based on evolution
  const glowMultiplier = evolutionStyle.glowIntensity

  /**
   * Handle portal click - enters the pocket world
   */
  const handleClick = useCallback(() => {
    onClick?.({
      pocketId,
      category,
      pieces,
      zone,
      theme,
      connectionScene,
    })
  }, [pocketId, category, pieces, zone, theme, connectionScene, onClick])

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
   * Handle image load error - fall back to icon
   */
  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  // Collage positions for fallback thumbnails
  const collagePositions = useMemo(
    () => getCollagePositions(pieces.length),
    [pieces.length]
  )

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
          ? `0 0 ${30 * glowMultiplier}px ${theme.glowColor}, 0 0 ${60 * glowMultiplier}px ${zoneGlow}`
          : `0 0 ${15 * glowMultiplier}px ${theme.glowColor}`,
      }}
      aria-label={`Enter ${theme.label} with ${pieces.length} pieces`}
    >
      {/* Outer swirling ring */}
      <div
        className={`
          absolute inset-0 rounded-full
          ${evolutionStyle.borderWidth} ${theme.ringColor}
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
          shadow-inner overflow-hidden
        `}
      >
        {/* Loading shimmer state */}
        {isGeneratingScene && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent portal-shimmer" />
        )}

        {/* Connection scene image (if available) */}
        {hasValidScene && !isGeneratingScene && (
          <img
            src={connectionScene.imageUrl}
            alt={`${theme.label} scene`}
            onError={handleImageError}
            className="absolute inset-0 w-full h-full object-cover rounded-full"
          />
        )}

        {/* Fallback: Piece thumbnail collage (if no scene but has pieces with images) */}
        {!hasValidScene && !isGeneratingScene && pieces.length > 0 && (
          <div className="absolute inset-0 rounded-full overflow-hidden">
            {/* Show mini thumbnails of pieces */}
            {collagePositions.map((pos, index) => {
              const piece = pieces[index]
              if (!piece) return null

              return (
                <div
                  key={piece.id || index}
                  className="absolute rounded-full overflow-hidden shadow-sm"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    width: `${pos.scale * 100}%`,
                    height: `${pos.scale * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {piece.imageUrl ? (
                    <img
                      src={piece.imageUrl}
                      alt={piece.name || 'piece'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/30 text-xs">
                      {piece.icon || theme.icon}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Overlay gradient to blend thumbnails */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient} opacity-40`}
            />
          </div>
        )}

        {/* Category icon (shown if no scene and no thumbnails, or as overlay) */}
        {(!hasValidScene || isGeneratingScene) && (
          <span
            className={`
              text-2xl sm:text-3xl select-none portal-float
              ${hasValidScene ? 'opacity-0' : 'opacity-100'}
              transition-opacity duration-300
            `}
          >
            {theme.icon}
          </span>
        )}
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

      {/* "New!" badge for recently updated scenes */}
      {isNew && hasValidScene && (
        <div
          className={`
            absolute -top-1 -left-1
            px-1.5 py-0.5 rounded-full
            bg-green-500 text-white text-xs font-bold
            shadow-lg animate-pulse
          `}
        >
          New!
        </div>
      )}

      {/* Evolution level indicator for legendary pockets */}
      {evolutionLevel === 'legendary' && hasValidScene && (
        <div
          className={`
            absolute -bottom-1 left-1/2 -translate-x-1/2
            px-1.5 py-0.5 rounded-full
            bg-gradient-to-r from-purple-500 to-pink-500
            text-white text-xs font-bold
            shadow-lg
          `}
        >
          ★
        </div>
      )}

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
