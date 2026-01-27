/**
 * WorldPiece Component
 * WB011 + WB012: Renders an individual piece within the world diorama
 *
 * Each piece represents a topic the user has learned about.
 * Pieces have visual styling based on their zone (nature, civilization, arcane)
 * and can be clicked to view details.
 */

import { useState, useCallback } from 'react'

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
    borderColor: 'border-indigo-400',
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
 * WorldPiece - Renders a single world piece with hover and click interactions
 *
 * @param {Object} props - Component props
 * @param {Object} props.piece - The piece data
 * @param {string} props.piece.id - Unique piece identifier
 * @param {string} props.piece.name - Display name for the piece
 * @param {string} props.piece.zone - Zone type (nature, civilization, arcane)
 * @param {string} [props.piece.imageUrl] - Optional custom image URL
 * @param {string} [props.piece.icon] - Emoji icon for the piece
 * @param {number} [props.piece.x] - Horizontal position within layer (0-100)
 * @param {number} [props.piece.y] - Vertical position within layer (0-100)
 * @param {Function} [props.onClick] - Callback when piece is clicked
 */
function WorldPiece({ piece, onClick }) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  const zoneStyle = ZONE_STYLES[piece.zone] || DEFAULT_ZONE_STYLE

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

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24
        rounded-xl cursor-pointer
        transition-all duration-300 ease-out
        border-2 ${zoneStyle.borderColor}
        ${zoneStyle.shadowColor}
        bg-gradient-to-br ${zoneStyle.bgGradient}
        ${isHovered ? 'scale-110 shadow-xl z-10' : 'scale-100 shadow-md'}
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
      `}
      style={{
        // Dynamic glow effect on hover
        boxShadow: isHovered
          ? `0 0 20px ${zoneStyle.glowColor}, 0 8px 25px rgba(0,0,0,0.15)`
          : undefined,
      }}
      aria-label={`${piece.name} - ${piece.zone} piece`}
    >
      {/* Piece content - image or icon fallback */}
      {piece.imageUrl && !imageError ? (
        <img
          src={piece.imageUrl}
          alt={piece.name}
          onError={handleImageError}
          className="w-full h-full object-cover rounded-lg"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-2xl sm:text-3xl md:text-4xl select-none">
            {piece.icon || '?'}
          </span>
        </div>
      )}

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

export default WorldPiece
