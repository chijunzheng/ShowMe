/**
 * ZoneLayer Component
 * WB011 + WB012: Renders a single parallax layer containing pieces of a specific zone
 * WB013: Renders pocket portals for clustered pieces within the zone
 *
 * Each zone layer moves at a different speed to create the parallax depth effect:
 * - Background (arcane): 0.2x speed - appears farthest away
 * - Midground (civilization): 0.5x speed - middle distance
 * - Foreground (nature): 1.0x speed - appears closest
 */

import WorldPiece from './WorldPiece'
import PocketPortal from './PocketPortal'

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
 * WB013: Calculate portal positions within the layer
 * Positions portals at intervals, offset from piece positions
 *
 * @param {Array} pockets - Array of pocket objects
 * @param {number} layerWidth - Width of the layer in pixels
 * @returns {Array} Pockets with calculated x,y positions
 */
function calculatePortalPositions(pockets, layerWidth) {
  if (!pockets || pockets.length === 0) return []

  // Position portals at regular intervals across the layer
  const padding = 120 // px from edges (more padding than pieces)
  const usableWidth = Math.max(layerWidth - padding * 2, 300)
  const spacing = usableWidth / Math.max(pockets.length + 1, 1)

  return pockets.map((pocket, index) => {
    // Calculate x position with offset to not overlap with pieces
    const x = padding + ((index + 1) * spacing)

    // Position portals at varying heights within the layer
    // Use a different pattern than pieces for visual distinction
    const y = 35 + (Math.cos(index * 2) * 20)

    return { ...pocket, calculatedX: x, calculatedY: y }
  })
}

/**
 * ZoneLayer - Renders pieces and pocket portals within a parallax layer
 *
 * @param {Object} props - Component props
 * @param {string} props.zone - Zone type (nature, civilization, arcane)
 * @param {Array} props.pieces - Array of piece objects for this zone
 * @param {Array} [props.pockets=[]] - WB013: Array of pocket portal objects for this zone
 * @param {number} props.scrollOffset - Current scroll/drag offset in pixels
 * @param {number} props.speed - Parallax speed multiplier (0.2, 0.5, or 1.0)
 * @param {number} props.layerWidth - Total width of the scrollable area
 * @param {Function} [props.onPieceClick] - Callback when a piece is clicked
 * @param {Function} [props.onPocketClick] - WB013: Callback when a pocket portal is clicked
 * @param {boolean} [props.hidden] - WB017: Whether the zone should be hidden/clouded (for arcane zone)
 * @param {number} [props.topicsNeeded] - WB017: Number of topics needed to unlock (for hint display)
 */
function ZoneLayer({
  zone,
  pieces = [],
  pockets = [],
  scrollOffset = 0,
  speed = 1,
  layerWidth = 2000,
  onPieceClick,
  onPocketClick,
  hidden = false,
  topicsNeeded = 0,
}) {
  const config = ZONE_CONFIG[zone] || DEFAULT_CONFIG

  // Calculate the parallax transform based on scroll offset and speed
  // Lower speed = moves slower = appears farther away
  const transformX = scrollOffset * speed

  // Position pieces within the layer
  const positionedPieces = calculatePiecePositions(pieces, layerWidth)

  // WB013: Position pocket portals within the layer
  const positionedPockets = calculatePortalPositions(pockets, layerWidth)

  // WB017: Render hidden/clouded state for arcane zone
  if (hidden && zone === 'arcane') {
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
        data-hidden="true"
        aria-hidden="true"
      >
        {/* Mysterious clouded background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-700/80 to-slate-900/90" />

        {/* Animated fog/cloud layer */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Fog clouds - animated horizontally */}
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at 20% 50%, rgba(148, 163, 184, 0.4) 0%, transparent 70%),
                radial-gradient(ellipse 60% 40% at 60% 30%, rgba(148, 163, 184, 0.3) 0%, transparent 60%),
                radial-gradient(ellipse 90% 60% at 80% 70%, rgba(148, 163, 184, 0.35) 0%, transparent 65%)
              `,
              animation: 'fogDrift 20s ease-in-out infinite',
            }}
          />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: `
                radial-gradient(ellipse 70% 45% at 40% 60%, rgba(100, 116, 139, 0.5) 0%, transparent 70%),
                radial-gradient(ellipse 50% 35% at 75% 40%, rgba(100, 116, 139, 0.4) 0%, transparent 60%)
              `,
              animation: 'fogDrift 15s ease-in-out infinite reverse',
            }}
          />
        </div>

        {/* Mystery content overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Mystery symbol */}
          <div className="text-4xl sm:text-5xl mb-2 opacity-60 animate-pulse">
            ???
          </div>

          {/* Hint text */}
          {topicsNeeded > 0 && (
            <div className="text-white/50 text-xs sm:text-sm text-center px-4">
              <span className="inline-block">
                Complete {topicsNeeded} more topic{topicsNeeded !== 1 ? 's' : ''} to reveal...
              </span>
            </div>
          )}
        </div>

        {/* Subtle twinkling stars behind the fog */}
        <div className="absolute top-2 left-1/5 w-1 h-1 rounded-full bg-white/20 animate-pulse" />
        <div className="absolute top-6 left-2/5 w-0.5 h-0.5 rounded-full bg-white/15 animate-pulse" style={{ animationDelay: '0.7s' }} />
        <div className="absolute top-4 right-1/4 w-1 h-1 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: '1.3s' }} />
        <div className="absolute top-8 right-1/3 w-0.5 h-0.5 rounded-full bg-white/10 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
    )
  }

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

        {/* WB013: Render pocket portals at calculated positions */}
        {positionedPockets.map((pocket) => (
          <div
            key={`pocket-${pocket.category}`}
            className="absolute pointer-events-auto"
            style={{
              left: `${pocket.calculatedX}px`,
              top: `${pocket.calculatedY}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <PocketPortal
              category={pocket.category}
              pieces={pocket.pieces}
              zone={zone}
              position={{ x: pocket.calculatedX, y: pocket.calculatedY }}
              onClick={onPocketClick}
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
