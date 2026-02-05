/**
 * ConstellationEdge Component
 *
 * SVG line connecting two topic stars in the constellation.
 * Visual style varies by relationship type, with different colors
 * and stroke patterns for each edge type.
 *
 * Edge types:
 * - prerequisite: solid blue - indicates foundational knowledge
 * - extends: dashed purple - indicates topic extension
 * - contrasts: dotted pink - indicates contrasting concepts
 * - applies: solid green - indicates practical application
 * - bridges: thick gold - indicates cross-domain connection
 */

import { useMemo, useCallback } from 'react'

/**
 * Stroke style configurations for each edge type
 */
const STROKE_STYLES = {
  prerequisite: {
    stroke: '#60A5FA', // blue-400
    strokeWidth: 2,
    strokeDasharray: 'none',
  },
  extends: {
    stroke: '#A78BFA', // violet-400
    strokeWidth: 1.5,
    strokeDasharray: '4 4',
  },
  contrasts: {
    stroke: '#F472B6', // pink-400
    strokeWidth: 1,
    strokeDasharray: '2 2',
  },
  applies: {
    stroke: '#34D399', // emerald-400
    strokeWidth: 2,
    strokeDasharray: 'none',
  },
  bridges: {
    stroke: '#FBBF24', // amber-400
    strokeWidth: 3,
    strokeDasharray: 'none',
  },
}

/**
 * Default stroke style for unknown edge types
 */
const DEFAULT_STROKE_STYLE = STROKE_STYLES.extends

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
   * Get stroke style based on edge type
   */
  const style = useMemo(() => {
    return STROKE_STYLES[edge.type] || DEFAULT_STROKE_STYLE
  }, [edge.type])

  /**
   * Calculate opacity based on discovered status and strength
   */
  const opacity = useMemo(() => {
    const baseOpacity = edge.discovered ? 1 : 0.5
    const strength = edge.strength || 1
    return baseOpacity * strength
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
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
      strokeDasharray={style.strokeDasharray}
      strokeLinecap="round"
      opacity={opacity}
      className={`
        cursor-pointer
        hover:opacity-100
        transition-opacity duration-200
        ${!edge.discovered ? 'animate-pulse' : ''}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Connection from ${edge.from} to ${edge.to}, ${edge.type} relationship`}
    />
  )
}
