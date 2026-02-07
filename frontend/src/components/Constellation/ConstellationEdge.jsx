/**
 * ConstellationEdge Component
 *
 * SVG line connecting two topic stars in the constellation.
 * Visual style is intentionally minimal to reduce clutter in dense graphs.
 * Relationship types are kept in data but share a single muted style.
 */

import { useMemo, useCallback } from 'react'

const EDGE_STYLE = {
  stroke: 'rgba(148, 163, 184, 0.65)',
  strokeWidth: 1.25,
  strokeDasharray: 'none',
}

/**
 * ConstellationEdge - Line connecting two stars
 *
 * @param {Object} props - Component props
 * @param {Object} props.edge - Edge data object
 * @param {string} props.edge.id - Unique edge identifier
 * @param {string} props.edge.from - Source node id
 * @param {string} props.edge.to - Target node id
 * @param {'prerequisite'|'extends'|'contrasts'|'applies'|'bridges'} props.edge.type - Relationship type
 * @param {number} props.edge.strength - Connection strength (0-1)
 * @param {boolean} props.edge.discovered - Whether user has discovered this connection
 * @param {{x: number, y: number}} props.fromPos - Start position
 * @param {{x: number, y: number}} props.toPos - End position
 * @param {Function} props.onTap - Handler when edge is tapped/clicked
 */
export default function ConstellationEdge({ edge, fromPos, toPos, onTap }) {
  /**
   * Calculate opacity based on discovered status and strength
   */
  const opacity = useMemo(() => {
    const baseOpacity = edge.discovered ? 0.45 : 0.32
    const strength = edge.strength || 1
    return Math.max(0.18, baseOpacity * strength)
  }, [edge.discovered, edge.strength])

  /**
   * Handle click on edge
   */
  const handleClick = useCallback(
    (event) => {
      event.stopPropagation()
      onTap?.(edge)
    },
    [onTap, edge]
  )

  /**
   * Handle keyboard interaction for accessibility
   */
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onTap?.(edge)
      }
    },
    [onTap, edge]
  )

  return (
    <line
      data-testid={`constellation-edge-${edge.id}`}
      x1={fromPos.x}
      y1={fromPos.y}
      x2={toPos.x}
      y2={toPos.y}
      stroke={EDGE_STYLE.stroke}
      strokeWidth={EDGE_STYLE.strokeWidth}
      strokeDasharray={EDGE_STYLE.strokeDasharray}
      strokeLinecap="round"
      opacity={opacity}
      className={`
        cursor-pointer
        hover:opacity-100
        transition-opacity duration-200
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Connection from ${edge.from} to ${edge.to}, ${edge.type} relationship`}
    />
  )
}
