/**
 * ZoneLayer Component
 * WB011 + WB012: Renders a single parallax layer containing pieces of a specific zone
 *
 * Each zone layer moves at a different speed to create the parallax depth effect:
 * - Background (arcane): 0.2x speed - appears farthest away
 * - Midground (civilization): 0.5x speed - middle distance
 * - Foreground (nature): 1.0x speed - appears closest
 */

import WorldPiece from './WorldPiece'

/**
 * Zone layer configuration with z-index and visual properties
 */
const ZONE_CONFIG = {
  arcane: {
    // Background layer - sky/cosmic pieces
    zIndex: 10,
    bgClass: 'bg-gradient-to-b from-purple-900/10 to-indigo-900/20',
    heightClass: 'h-1/3', // Top third of viewport
    positionClass: 'top-0',
  },
  civilization: {
    // Midground layer - structures, buildings
    zIndex: 20,
    bgClass: 'bg-gradient-to-b from-indigo-100/30 to-slate-200/40',
    heightClass: 'h-1/3',
    positionClass: 'top-1/3',
  },
  nature: {
    // Foreground layer - plants, terrain
    zIndex: 30,
    bgClass: 'bg-gradient-to-b from-green-100/30 to-emerald-200/50',
    heightClass: 'h-1/3',
    positionClass: 'bottom-0',
  },
}

/**
 * Default configuration for unknown zones
 */
const DEFAULT_CONFIG = {
  zIndex: 15,
  bgClass: 'bg-slate-100/20',
  heightClass: 'h-1/3',
  positionClass: 'top-1/3',
}

/**
 * Calculate piece positions within the layer
 * Distributes pieces evenly with some variation for visual interest
 *
 * @param {Array} pieces - Array of piece objects
 * @param {number} layerWidth - Width of the layer in pixels
 * @returns {Array} Pieces with calculated x,y positions
 */
function calculatePiecePositions(pieces, layerWidth) {
  if (!pieces || pieces.length === 0) return []

  // Spread pieces across the layer width with padding
  const padding = 60 // px from edges
  const usableWidth = Math.max(layerWidth - padding * 2, 200)
  const spacing = usableWidth / Math.max(pieces.length, 1)

  return pieces.map((piece, index) => {
    // Use piece's stored position if available, otherwise calculate
    const x = piece.x !== undefined
      ? piece.x
      : padding + (index * spacing) + (spacing / 2)

    // Vertical variation within the layer (20-80% of layer height)
    const y = piece.y !== undefined
      ? piece.y
      : 20 + (Math.sin(index * 1.5) * 30) + 30

    return { ...piece, calculatedX: x, calculatedY: y }
  })
}

/**
 * ZoneLayer - Renders pieces within a parallax layer
 *
 * @param {Object} props - Component props
 * @param {string} props.zone - Zone type (nature, civilization, arcane)
 * @param {Array} props.pieces - Array of piece objects for this zone
 * @param {number} props.scrollOffset - Current scroll/drag offset in pixels
 * @param {number} props.speed - Parallax speed multiplier (0.2, 0.5, or 1.0)
 * @param {number} props.layerWidth - Total width of the scrollable area
 * @param {Function} [props.onPieceClick] - Callback when a piece is clicked
 */
function ZoneLayer({
  zone,
  pieces = [],
  scrollOffset = 0,
  speed = 1,
  layerWidth = 2000,
  onPieceClick,
}) {
  const config = ZONE_CONFIG[zone] || DEFAULT_CONFIG

  // Calculate the parallax transform based on scroll offset and speed
  // Lower speed = moves slower = appears farther away
  const transformX = scrollOffset * speed

  // Position pieces within the layer
  const positionedPieces = calculatePiecePositions(pieces, layerWidth)

  return (
    <div
      className={`
        absolute left-0 right-0 ${config.positionClass}
        ${config.heightClass}
        pointer-events-none
        overflow-hidden
      `}
      style={{ zIndex: config.zIndex }}
      data-zone={zone}
      data-speed={speed}
      aria-hidden="true"
    >
      {/* Background gradient for depth effect */}
      <div className={`absolute inset-0 ${config.bgClass}`} />

      {/* Scrollable piece container */}
      <div
        className="absolute inset-0 transition-transform duration-75 ease-out"
        style={{
          transform: `translateX(${transformX}px)`,
          width: `${layerWidth}px`,
        }}
      >
        {/* Render pieces at calculated positions */}
        {positionedPieces.map((piece) => (
          <div
            key={piece.id}
            className="absolute pointer-events-auto"
            style={{
              left: `${piece.calculatedX}px`,
              top: `${piece.calculatedY}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <WorldPiece
              piece={piece}
              onClick={onPieceClick}
            />
          </div>
        ))}
      </div>

      {/* Decorative elements based on zone type */}
      {zone === 'nature' && (
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-green-800/20 to-transparent pointer-events-none" />
      )}
      {zone === 'arcane' && (
        <>
          {/* Subtle stars/sparkles in background */}
          <div className="absolute top-4 left-1/4 w-1 h-1 rounded-full bg-white/40 animate-pulse" />
          <div className="absolute top-8 left-1/2 w-1 h-1 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-6 right-1/4 w-1 h-1 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '1s' }} />
        </>
      )}
    </div>
  )
}

export default ZoneLayer
