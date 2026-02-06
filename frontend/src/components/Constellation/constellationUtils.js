/**
 * Constellation Utility Functions
 *
 * Helper functions for the Knowledge Constellation visualization.
 * Includes position calculations, label formatting, and boundary detection.
 */

/**
 * Edge type labels for display
 */
const EDGE_TYPE_LABELS = {
  prerequisite: 'Builds on',
  extends: 'Extends',
  contrasts: 'Contrasts with',
  applies: 'Applied to',
  bridges: 'Bridges to',
}

/**
 * Brightness level thresholds based on mastery
 */
const BRIGHTNESS_THRESHOLDS = {
  dim: 0.25,
  glow: 0.5,
  bright: 0.75,
}

/**
 * Calculate position for a gap node
 * Places it near the nodes it would connect to, with a random offset
 *
 * @param {Object} gap - Gap object with connectsTo array
 * @param {Map} nodePositions - Map of node id to position
 * @param {Array} nodes - Array of all nodes (unused but kept for API consistency)
 * @returns {{x: number, y: number}} Calculated position
 */
export function calculateGapPosition(gap, nodePositions, _nodes) {
  const connectIds = gap.connectsTo || gap.relatedNodeIds || []
  // Default position if no connections specified
  if (!connectIds || connectIds.length === 0) {
    return {
      x: 300 + Math.random() * 200,
      y: 200 + Math.random() * 200,
    }
  }

  // Get positions of connected nodes
  const connectedPositions = connectIds
    .map((id) => nodePositions.get(id))
    .filter(Boolean)

  // Fallback to center if no valid connections
  if (connectedPositions.length === 0) {
    return { x: 400, y: 300 }
  }

  // Calculate average position (centroid of connected nodes)
  const avgX = connectedPositions.reduce((sum, p) => sum + p.x, 0) / connectedPositions.length
  const avgY = connectedPositions.reduce((sum, p) => sum + p.y, 0) / connectedPositions.length

  const allPositions = Array.from(nodePositions.values())
  const graphCenter = allPositions.length
    ? {
        x: allPositions.reduce((sum, p) => sum + p.x, 0) / allPositions.length,
        y: allPositions.reduce((sum, p) => sum + p.y, 0) / allPositions.length,
      }
    : { x: avgX, y: avgY }

  const hashToUnit = (value) => {
    const str = String(value || '')
    let hash = 0
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash % 1000) / 1000
  }

  const seed = hashToUnit(gap.id || gap.suggestedTopic)
  const dirX = avgX - graphCenter.x
  const dirY = avgY - graphCenter.y
  const dirLength = Math.hypot(dirX, dirY)
  const baseAngle = dirLength > 1 ? Math.atan2(dirY, dirX) : seed * 2 * Math.PI
  const jitter = (seed - 0.5) * 0.6
  const baseRadius = 90 + Math.min(80, connectedPositions.length * 22) + seed * 30
  const maxRadius = 240
  const minNodeDistance = 70
  const minConnectedDistance = 55

  let bestCandidate = null
  let bestScore = -Infinity

  for (let i = 0; i < 12; i += 1) {
    const radius = Math.min(maxRadius, baseRadius + i * 18)
    const angle = baseAngle + jitter + i * 0.55
    const candidate = {
      x: avgX + Math.cos(angle) * radius,
      y: avgY + Math.sin(angle) * radius,
    }

    let minAll = Infinity
    let minConnected = Infinity
    allPositions.forEach((pos) => {
      const dist = Math.hypot(candidate.x - pos.x, candidate.y - pos.y)
      minAll = Math.min(minAll, dist)
    })
    connectedPositions.forEach((pos) => {
      const dist = Math.hypot(candidate.x - pos.x, candidate.y - pos.y)
      minConnected = Math.min(minConnected, dist)
    })

    if (minAll >= minNodeDistance && minConnected >= minConnectedDistance) {
      return candidate
    }

    const score = minAll - radius * 0.15
    if (score > bestScore) {
      bestScore = score
      bestCandidate = candidate
    }
  }

  return bestCandidate || { x: avgX, y: avgY }
}

/**
 * Get display label for edge type
 *
 * @param {string} edgeType - Edge type identifier
 * @returns {string} Human-readable label
 */
export function getEdgeLabel(edgeType) {
  return EDGE_TYPE_LABELS[edgeType] || 'Related to'
}

/**
 * Calculate cluster boundary (bounding circle)
 * Returns center point and radius that encompasses all cluster nodes
 *
 * @param {Object} cluster - Cluster object with nodeIds array
 * @param {Map} nodePositions - Map of node id to position
 * @returns {{cx: number, cy: number, radius: number}|null} Boundary circle or null
 */
export function getClusterBoundary(cluster, nodePositions) {
  // Get positions for all cluster nodes
  const positions = cluster.nodeIds
    .map((id) => nodePositions.get(id))
    .filter(Boolean)

  // Need at least 3 points for a meaningful boundary
  if (positions.length < 3) {
    return null
  }

  // Calculate centroid
  const cx = positions.reduce((sum, p) => sum + p.x, 0) / positions.length
  const cy = positions.reduce((sum, p) => sum + p.y, 0) / positions.length

  // Calculate radius as max distance from centroid plus padding
  const radius = Math.max(
    ...positions.map((p) => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2))
  ) + 30

  return { cx, cy, radius }
}

/**
 * Determine brightness level from mastery value
 *
 * @param {number} mastery - Mastery value (0-1)
 * @returns {'dim'|'glow'|'bright'|'brilliant'} Brightness level
 */
export function getBrightnessLevel(mastery) {
  if (mastery < BRIGHTNESS_THRESHOLDS.dim) return 'dim'
  if (mastery < BRIGHTNESS_THRESHOLDS.glow) return 'glow'
  if (mastery < BRIGHTNESS_THRESHOLDS.bright) return 'bright'
  return 'brilliant'
}

/**
 * Calculate zoom level to fit all nodes in viewport
 *
 * @param {Map} positions - Map of node id to position
 * @param {number} viewportWidth - Viewport width
 * @param {number} viewportHeight - Viewport height
 * @param {number} padding - Padding around content
 * @returns {number} Recommended zoom level
 */
export function calculateFitZoom(positions, viewportWidth, viewportHeight, padding = 50) {
  if (positions.size === 0) return 1

  // Find bounding box of all positions
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  positions.forEach((pos) => {
    minX = Math.min(minX, pos.x)
    maxX = Math.max(maxX, pos.x)
    minY = Math.min(minY, pos.y)
    maxY = Math.max(maxY, pos.y)
  })

  // Add padding
  const contentWidth = maxX - minX + padding * 2
  const contentHeight = maxY - minY + padding * 2

  // Calculate scale to fit
  const scaleX = viewportWidth / contentWidth
  const scaleY = viewportHeight / contentHeight

  // Use smaller scale to ensure fit, clamp to reasonable range
  return Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 2)
}

/**
 * Check if a point is within the visible viewport
 *
 * @param {{x: number, y: number}} point - Point to check
 * @param {{x: number, y: number, scale: number}} viewport - Viewport transform
 * @param {number} viewportWidth - Viewport width
 * @param {number} viewportHeight - Viewport height
 * @returns {boolean} True if point is visible
 */
export function isPointVisible(point, viewport, viewportWidth, viewportHeight) {
  // Transform point to screen coordinates
  const screenX = point.x * viewport.scale + viewport.x
  const screenY = point.y * viewport.scale + viewport.y

  // Check if within viewport bounds with some margin
  const margin = 50
  return (
    screenX >= -margin &&
    screenX <= viewportWidth + margin &&
    screenY >= -margin &&
    screenY <= viewportHeight + margin
  )
}

/**
 * Format mastery percentage for display
 *
 * @param {number} mastery - Mastery value (0-1)
 * @returns {string} Formatted percentage string
 */
export function formatMastery(mastery) {
  return `${Math.round(mastery * 100)}%`
}
