/**
 * ClusterHull Component
 * Clean rectangular cluster boundary with category label
 * Refined glassmorphism aesthetic
 */

import { getNodeConfig, getCategoryIcon } from './TopicNode'

/**
 * Calculate bounding box for a set of positions with padding
 */
function calculateBounds(positions, padding = 50) {
  if (!positions || positions.length === 0) return null

  const xs = positions.map(p => p.x)
  const ys = positions.map(p => p.y)

  return {
    x: Math.min(...xs) - padding,
    y: Math.min(...ys) - padding - 20, // Extra top padding for label
    width: Math.max(...xs) - Math.min(...xs) + padding * 2,
    height: Math.max(...ys) - Math.min(...ys) + padding * 2 + 20,
  }
}

export default function ClusterHull({
  category,
  positions = [],
  isHighlighted = false,
}) {
  const config = getNodeConfig(category)
  const bounds = calculateBounds(positions, 45)

  if (!bounds || positions.length === 0) return null

  const radius = 16

  return (
    <g className="cluster-hull">
      {/* Background fill */}
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        rx={radius}
        ry={radius}
        fill={isHighlighted ? `${config.color}08` : `${config.color}03`}
        stroke={config.color}
        strokeWidth={isHighlighted ? 1.5 : 1}
        strokeOpacity={isHighlighted ? 0.4 : 0.2}
        strokeDasharray="8 4"
        className="transition-all duration-300"
      />

      {/* Category label */}
      <g transform={`translate(${bounds.x + 16}, ${bounds.y + 20})`}>
        <text
          fill={config.color}
          fontSize="10"
          fontWeight="600"
          letterSpacing="0.05em"
          opacity={isHighlighted ? 0.9 : 0.6}
          className="uppercase"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {getCategoryIcon(category)} {category}
        </text>
      </g>
    </g>
  )
}

/**
 * Render all cluster hulls from computed cluster data
 */
export function ClusterHulls({
  clusters,
  highlightedCategory,
}) {
  return (
    <g className="cluster-hulls">
      {Object.entries(clusters).map(([category, cluster]) => (
        <ClusterHull
          key={category}
          category={category}
          positions={cluster.positions || []}
          isHighlighted={highlightedCategory === category}
        />
      ))}
    </g>
  )
}
