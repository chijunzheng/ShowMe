/**
 * EdgeLine Component
 * Elegant bezier curve connecting two topic nodes
 * Category-aware coloring with smooth curves
 */

import { useMemo } from 'react'
import { getNodeConfig } from './TopicNode'

/**
 * Calculate bezier curve control points for a smooth arc
 */
function calculateBezierPath(from, to, curvature = 0.2) {
  if (!from || !to) return ''

  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist === 0) return ''

  // Midpoint
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2

  // Perpendicular offset for the curve
  const nx = -dy / dist
  const ny = dx / dist

  // Control point - arc perpendicular to the line
  const curveOffset = dist * curvature
  const cx = mx + nx * curveOffset
  const cy = my + ny * curveOffset

  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

export default function EdgeLine({
  from,
  to,
  fromCategory,
  toCategory,
  isCrossCluster = false,
  isHighlighted = false,
}) {
  // More curve for cross-cluster edges
  const curvature = isCrossCluster ? 0.25 : 0.15
  const path = useMemo(
    () => calculateBezierPath(from, to, curvature),
    [from, to, curvature]
  )

  if (!path) return null

  // Get category colors
  const fromConfig = fromCategory ? getNodeConfig(fromCategory) : { color: '#64748b' }
  const toConfig = toCategory ? getNodeConfig(toCategory) : { color: '#64748b' }

  // Gradient ID for cross-category edges
  const gradientId = `edge-${fromCategory}-${toCategory}`.replace(/\s+/g, '-')

  return (
    <g className="edge-line">
      {/* Gradient for cross-category edges */}
      {isCrossCluster && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={fromConfig.color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={toConfig.color} stopOpacity={0.5} />
          </linearGradient>
        </defs>
      )}

      {/* Glow effect for highlighted edges */}
      {isHighlighted && (
        <path
          d={path}
          fill="none"
          stroke={fromConfig.color}
          strokeWidth={8}
          strokeOpacity={0.15}
          strokeLinecap="round"
          style={{ filter: 'blur(6px)' }}
        />
      )}

      {/* Main edge path */}
      <path
        d={path}
        fill="none"
        stroke={isCrossCluster ? `url(#${gradientId})` : fromConfig.color}
        strokeWidth={isHighlighted ? 2.5 : 1.5}
        strokeOpacity={isHighlighted ? 0.8 : 0.4}
        strokeDasharray={isCrossCluster ? '8 4' : 'none'}
        strokeLinecap="round"
        className="transition-all duration-300"
      />
    </g>
  )
}

/**
 * Render multiple edges efficiently
 */
export function EdgeLines({
  edges,
  positions,
  nodes,
  highlightedNodeId,
}) {
  // Create a map of node id to category for quick lookup
  const nodeCategories = useMemo(() => {
    const cats = {}
    nodes.forEach(n => {
      cats[n.id] = n.category || 'General'
    })
    return cats
  }, [nodes])

  return (
    <g className="edges">
      {edges.map((edge, idx) => {
        const fromPos = positions[edge.from]
        const toPos = positions[edge.to]

        if (!fromPos || !toPos) return null

        const fromCategory = nodeCategories[edge.from]
        const toCategory = nodeCategories[edge.to]
        const isCrossCluster = fromCategory !== toCategory
        const isHighlighted =
          highlightedNodeId === edge.from || highlightedNodeId === edge.to

        return (
          <EdgeLine
            key={`${edge.from}-${edge.to}-${idx}`}
            from={fromPos}
            to={toPos}
            fromCategory={fromCategory}
            toCategory={toCategory}
            isCrossCluster={isCrossCluster}
            isHighlighted={isHighlighted}
          />
        )
      })}
    </g>
  )
}
