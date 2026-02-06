/**
 * ConstellationCluster Component
 *
 * Visual label for a topic cluster in the constellation.
 * Displays at the centroid of cluster nodes with the cluster's
 * icon and name. Non-interactive, purely decorative.
 */

import { useMemo } from 'react'

/**
 * ConstellationCluster - Cluster label positioned at centroid
 *
 * @param {Object} props - Component props
 * @param {Object} props.cluster - Cluster data object
 * @param {string} props.cluster.id - Unique cluster identifier
 * @param {string} props.cluster.name - Display name
 * @param {string} props.cluster.icon - Emoji or icon character
 * @param {string} props.cluster.color - Hex color for styling
 * @param {Array<string>} props.cluster.nodeIds - Array of node ids in this cluster
 * @param {Map} props.nodePositions - Map of node id to position
 */
export default function ConstellationCluster({ cluster, nodePositions }) {
  /**
   * Calculate label position at top of cluster
   */
  const labelPosition = useMemo(() => {
    // Get positions for all nodes in cluster
    const positions = cluster.nodeIds
      .map((id) => nodePositions.get(id))
      .filter(Boolean)

    // Can't calculate position without positions
    if (positions.length === 0) {
      return null
    }

    // Calculate average x for horizontal centering
    const x = positions.reduce((sum, p) => sum + p.x, 0) / positions.length
    // Find minimum y (topmost node) and position label 55px above
    const minY = Math.min(...positions.map((p) => p.y))

    return { x, y: minY - 55 }
  }, [cluster.nodeIds, nodePositions])

  // Don't render if no valid position
  if (!labelPosition) {
    return null
  }

  return (
    <div
      data-testid={`constellation-cluster-${cluster.id}`}
      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{
        left: labelPosition.x,
        top: labelPosition.y,
      }}
      aria-hidden="true"
    >
      <div
        className="text-[11px] font-medium opacity-40"
        style={{
          color: cluster.color || '#9CA3AF',
          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
        }}
      >
        {cluster.icon && (
          <span className="mr-1" role="img" aria-hidden="true">
            {cluster.icon}
          </span>
        )}
        {cluster.name}
      </div>
    </div>
  )
}
