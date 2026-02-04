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
   * Calculate centroid of all cluster nodes
   */
  const centroid = useMemo(() => {
    // Get positions for all nodes in cluster
    const positions = cluster.nodeIds
      .map((id) => nodePositions.get(id))
      .filter(Boolean)

    // Can't calculate centroid without positions
    if (positions.length === 0) {
      return null
    }

    // Calculate average x and y
    const x = positions.reduce((sum, p) => sum + p.x, 0) / positions.length
    const y = positions.reduce((sum, p) => sum + p.y, 0) / positions.length

    return { x, y }
  }, [cluster.nodeIds, nodePositions])

  // Don't render if no valid centroid
  if (!centroid) {
    return null
  }

  /**
   * Generate background color with transparency
   */
  const backgroundColor = cluster.color ? `${cluster.color}30` : 'rgba(100, 100, 100, 0.2)'

  return (
    <div
      data-testid={`constellation-cluster-${cluster.id}`}
      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{
        left: centroid.x,
        top: centroid.y - 40, // Position above the centroid
      }}
      aria-hidden="true"
    >
      <div
        className="px-3 py-1 rounded-full text-sm font-medium opacity-60"
        style={{
          backgroundColor,
          color: cluster.color || '#9CA3AF',
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
