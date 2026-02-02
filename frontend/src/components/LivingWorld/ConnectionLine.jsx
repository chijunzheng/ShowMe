/**
 * ConnectionLine Component
 *
 * Renders SVG lines connecting related topics in the Living World map.
 * Connections visualize relationships between hotspots, with visual differentiation
 * between discovered and undiscovered connections.
 *
 * Features:
 * - Quadratic bezier curves for organic, natural-looking connections
 * - Discovered connections shown as solid indigo lines with strength-based opacity
 * - Undiscovered connections shown as dashed gray lines with pulsing animation
 * - Line thickness scales inversely with zoom for consistent visual weight
 * - Fully accessible (decorative element with aria-hidden)
 *
 * Usage:
 * ```jsx
 * <ConnectionLine
 *   connections={[
 *     {
 *       from: { x: 0.2, y: 0.3, topicName: 'Volcanoes' },
 *       to: { x: 0.7, y: 0.5, topicName: 'Earthquakes' },
 *       strength: 0.8,
 *       discovered: true,
 *     }
 *   ]}
 *   containerWidth={800}
 *   containerHeight={450}
 *   zoom={1.5}
 *   animated={true}
 * />
 * ```
 */

import { useMemo } from 'react'

/**
 * Color constants for connection lines
 */
const DISCOVERED_COLOR = '#818CF8' // indigo-400
const UNDISCOVERED_COLOR = '#94A3B8' // slate-400

/**
 * Base stroke width in pixels (before zoom scaling)
 */
const BASE_STROKE_WIDTH = 2

/**
 * Calculate a quadratic bezier path between two points
 * Creates a gentle curve by offsetting the control point perpendicular to the line
 *
 * @param {Object} from - Source point with x, y in normalized coordinates (0-1)
 * @param {Object} to - Target point with x, y in normalized coordinates (0-1)
 * @param {number} containerWidth - Container width in pixels
 * @param {number} containerHeight - Container height in pixels
 * @returns {string} SVG path d attribute string
 */
function calculateBezierPath(from, to, containerWidth, containerHeight) {
  // Convert normalized coordinates to pixel coordinates
  const x1 = from.x * containerWidth
  const y1 = from.y * containerHeight
  const x2 = to.x * containerWidth
  const y2 = to.y * containerHeight

  // Calculate midpoint for control point base position
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2

  // Calculate direction vector between points
  const dx = x2 - x1
  const dy = y2 - y1

  // Calculate distance between points
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Guard against division by zero for overlapping points
  if (distance < 1) {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }

  // Calculate perpendicular offset for curve control point
  // Offset scales with distance but caps at 30px for subtle curves
  const offset = Math.min(30, distance * 0.2)

  // Perpendicular offset: rotate direction vector 90 degrees
  // (-dy, dx) gives the perpendicular direction
  const cpX = midX - (dy * offset) / distance
  const cpY = midY + (dx * offset) / distance

  return `M ${x1} ${y1} Q ${cpX} ${cpY} ${x2} ${y2}`
}

/**
 * ConnectionLine - Renders SVG connection lines between hotspots
 *
 * @param {Object} props - Component props
 * @param {Array} props.connections - Array of connection objects
 * @param {Object} props.connections[].from - Source hotspot { x, y, topicName }
 * @param {Object} props.connections[].to - Target hotspot { x, y, topicName }
 * @param {number} props.connections[].strength - Connection strength (0-1, affects opacity/thickness)
 * @param {boolean} props.connections[].discovered - Whether user has discovered this connection
 * @param {number} props.containerWidth - Container width in pixels
 * @param {number} props.containerHeight - Container height in pixels
 * @param {number} [props.zoom=1] - Current zoom level (for line thickness scaling)
 * @param {boolean} [props.animated=true] - Whether to animate undiscovered connections
 */
function ConnectionLine({
  connections = [],
  containerWidth,
  containerHeight,
  zoom = 1,
  animated = true,
}) {
  /**
   * Calculate scaled stroke width based on zoom level
   * Uses inverse square root scaling to maintain visual consistency across zoom levels
   */
  const scaledStrokeWidth = useMemo(() => {
    return BASE_STROKE_WIDTH / Math.sqrt(zoom)
  }, [zoom])

  /**
   * Memoize path calculations to avoid recalculating on every render
   */
  const pathsWithData = useMemo(() => {
    if (!containerWidth || !containerHeight) {
      return []
    }

    return connections.map((conn) => ({
      path: calculateBezierPath(conn.from, conn.to, containerWidth, containerHeight),
      discovered: conn.discovered,
      strength: conn.strength,
      key: `${conn.from.topicName}-${conn.to.topicName}`,
    }))
  }, [connections, containerWidth, containerHeight])

  // Don't render if no dimensions or connections
  if (!containerWidth || !containerHeight || connections.length === 0) {
    return null
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-5"
      width={containerWidth}
      height={containerHeight}
      aria-hidden="true"
    >
      {pathsWithData.map((conn) => (
        <path
          key={conn.key}
          d={conn.path}
          stroke={conn.discovered ? DISCOVERED_COLOR : UNDISCOVERED_COLOR}
          strokeWidth={scaledStrokeWidth}
          strokeOpacity={conn.discovered ? conn.strength : 0.3}
          strokeDasharray={conn.discovered ? 'none' : '8 4'}
          strokeLinecap="round"
          fill="none"
          className={!conn.discovered && animated ? 'animate-pulse' : ''}
        />
      ))}
    </svg>
  )
}

export default ConnectionLine
