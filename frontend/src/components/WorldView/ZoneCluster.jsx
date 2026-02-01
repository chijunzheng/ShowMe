/**
 * ZoneCluster Component
 * Renders a cluster representing multiple grouped pieces within a zone
 *
 * Visual Features:
 * - Shows count badge with number of pieces (e.g., "+5")
 * - Displays up to 3 piece icons stacked/overlapping
 * - Zone-appropriate styling (nature=green, civilization=indigo, arcane=purple)
 * - Hover state with scale-110 animation
 * - Keyboard accessible (Enter/Space triggers onClick)
 * - Rounded corners and shadow for depth
 * - Count badge positioned top-right with contrasting colors
 */

import { useCallback } from 'react'

/**
 * Zone-specific styling configurations
 * Each zone has distinct visual characteristics
 */
const ZONE_STYLES = {
  nature: {
    borderClass: 'border-green-400',
    bgClass: 'bg-green-50',
    countBgClass: 'bg-green-500',
    countTextClass: 'text-white',
    hoverShadowClass: 'hover:shadow-green-500/30',
  },
  civilization: {
    borderClass: 'border-indigo-400',
    bgClass: 'bg-indigo-50',
    countBgClass: 'bg-indigo-500',
    countTextClass: 'text-white',
    hoverShadowClass: 'hover:shadow-indigo-500/30',
  },
  arcane: {
    borderClass: 'border-purple-400',
    bgClass: 'bg-purple-50',
    countBgClass: 'bg-purple-500',
    countTextClass: 'text-white',
    hoverShadowClass: 'hover:shadow-purple-500/30',
  },
}

/**
 * Default fallback style for unknown zones
 */
const DEFAULT_ZONE_STYLE = {
  borderClass: 'border-slate-400',
  bgClass: 'bg-slate-50',
  countBgClass: 'bg-slate-500',
  countTextClass: 'text-white',
  hoverShadowClass: 'hover:shadow-slate-500/30',
}

/**
 * Get fallback icon for pieces without an icon
 */
function getPieceIcon(piece) {
  if (piece.icon) return piece.icon
  if (piece.imageUrl) return null // Will render image instead
  return '?' // Fallback icon
}

/**
 * ZoneCluster - Renders a cluster of grouped pieces
 *
 * @param {Object} props - Component props
 * @param {Array} [props.pieces=[]] - Array of piece objects in this cluster
 * @param {string} props.label - Cluster label (e.g., "Ocean Life", "Space Exploration")
 * @param {string} props.zone - Zone type (nature, civilization, arcane)
 * @param {Function} [props.onClick] - Callback when cluster is clicked
 */
function ZoneCluster({
  pieces = [],
  label = '',
  zone = 'nature',
  onClick,
}) {
  // Handle undefined pieces gracefully
  const safePieces = pieces || []
  const pieceCount = safePieces.length
  const zoneStyle = ZONE_STYLES[zone] || DEFAULT_ZONE_STYLE

  // Get first 3 pieces for icon display
  const displayPieces = safePieces.slice(0, 3)

  /**
   * Handle cluster click - trigger callback with cluster data
   */
  const handleClick = useCallback(() => {
    onClick?.({
      pieces: safePieces,
      label,
      zone,
    })
  }, [safePieces, label, zone, onClick])

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
    <button
      type="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative w-16 h-16 sm:w-20 sm:h-20
        rounded-xl cursor-pointer
        transition-all duration-200 ease-out
        border-2 ${zoneStyle.borderClass}
        ${zoneStyle.bgClass}
        shadow-md
        hover:scale-110 hover:shadow-lg ${zoneStyle.hoverShadowClass}
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
      `}
      aria-label={`${label} cluster with ${pieceCount} pieces`}
    >
      {/* Icon stack - shows up to 3 overlapping icons */}
      <div
        data-testid="cluster-icon-stack"
        className="relative w-full h-full flex items-center justify-center"
      >
        {displayPieces.map((piece, index) => {
          const icon = getPieceIcon(piece)
          // Calculate offset for stacking effect
          const offset = (index - (displayPieces.length - 1) / 2) * 8

          return (
            <div
              key={piece.id || index}
              data-testid="cluster-icon"
              className="absolute w-8 h-8 flex items-center justify-center text-xl"
              style={{
                transform: `translateX(${offset}px)`,
                zIndex: displayPieces.length - index,
              }}
            >
              {piece.imageUrl && !icon ? (
                <img
                  src={piece.imageUrl}
                  alt={piece.name || 'piece'}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <span className="select-none">{icon}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Count badge - positioned top-right */}
      <div
        data-testid="cluster-count"
        className={`
          absolute -top-2 -right-2
          min-w-6 h-6 px-1.5
          rounded-full
          ${zoneStyle.countBgClass} ${zoneStyle.countTextClass}
          flex items-center justify-center
          text-xs font-bold
          shadow-md
        `}
      >
        +{pieceCount}
      </div>
    </button>
  )
}

export default ZoneCluster
