/**
 * Graph Utilities
 * Convex hull computation, path smoothing, and cluster layout helpers
 */

/**
 * Compute convex hull using Andrew's monotone chain algorithm
 * @param {Array<{x: number, y: number}>} points
 * @returns {Array<{x: number, y: number}>} Hull points in clockwise order
 */
export function computeConvexHull(points) {
  if (points.length < 3) return points

  // Sort points by x (then y)
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)

  // Cross product of vectors OA and OB
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

  // Build lower hull
  const lower = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  // Build upper hull
  const upper = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  // Remove last point of each half (it's repeated)
  lower.pop()
  upper.pop()

  return [...lower, ...upper]
}

/**
 * Expand hull outward by padding amount
 * @param {Array<{x: number, y: number}>} hull
 * @param {number} padding
 * @returns {Array<{x: number, y: number}>}
 */
export function expandHull(hull, padding = 20) {
  if (hull.length < 3) return hull

  // Calculate centroid
  const centroid = hull.reduce(
    (acc, p) => ({ x: acc.x + p.x / hull.length, y: acc.y + p.y / hull.length }),
    { x: 0, y: 0 }
  )

  // Move each point outward from centroid
  return hull.map(p => {
    const dx = p.x - centroid.x
    const dy = p.y - centroid.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    return {
      x: p.x + (dx / dist) * padding,
      y: p.y + (dy / dist) * padding,
    }
  })
}

/**
 * Generate smooth SVG path from hull points using bezier curves
 * @param {Array<{x: number, y: number}>} hull
 * @param {number} smoothing - Bezier control point distance (0-1)
 * @returns {string} SVG path d attribute
 */
export function hullToSmoothPath(hull, smoothing = 0.2) {
  if (hull.length < 3) return ''

  const n = hull.length
  const path = []

  // Start at first point
  path.push(`M ${hull[0].x} ${hull[0].y}`)

  // Draw smooth curves through all points
  for (let i = 0; i < n; i++) {
    const p0 = hull[(i - 1 + n) % n]
    const p1 = hull[i]
    const p2 = hull[(i + 1) % n]
    const p3 = hull[(i + 2) % n]

    // Control points
    const cp1x = p1.x + (p2.x - p0.x) * smoothing
    const cp1y = p1.y + (p2.y - p0.y) * smoothing
    const cp2x = p2.x - (p3.x - p1.x) * smoothing
    const cp2y = p2.y - (p3.y - p1.y) * smoothing

    path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`)
  }

  path.push('Z')
  return path.join(' ')
}

/**
 * Compute centroid of a set of points
 * @param {Array<{x: number, y: number}>} points
 * @returns {{x: number, y: number}}
 */
export function computeCentroid(points) {
  if (points.length === 0) return { x: 0, y: 0 }
  return points.reduce(
    (acc, p) => ({ x: acc.x + p.x / points.length, y: acc.y + p.y / points.length }),
    { x: 0, y: 0 }
  )
}

/**
 * Generate a curved path between two points
 * @param {Object} from - Start point {x, y}
 * @param {Object} to - End point {x, y}
 * @param {number} curvature - How curved the line is (0 = straight)
 * @returns {string} SVG path d attribute
 */
export function curvedPath(from, to, curvature = 0.3) {
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2

  // Perpendicular offset for curve
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  // Control point perpendicular to the line
  const cpX = midX - dy * curvature
  const cpY = midY + dx * curvature

  return `M ${from.x} ${from.y} Q ${cpX} ${cpY} ${to.x} ${to.y}`
}

/**
 * Find position for suggested node at cluster edge
 * @param {Array<{x: number, y: number}>} clusterPositions - Positions of nodes in cluster
 * @param {{x: number, y: number}} centroid - Cluster centroid
 * @param {number} index - Index of suggestion (for spacing)
 * @returns {{x: number, y: number}}
 */
export function getSuggestionPosition(clusterPositions, centroid, index = 0) {
  if (clusterPositions.length === 0) {
    return { x: centroid.x + 60, y: centroid.y + (index * 40) }
  }

  // Find the point furthest from centroid
  let maxDist = 0
  let furthestPoint = clusterPositions[0]

  for (const p of clusterPositions) {
    const dx = p.x - centroid.x
    const dy = p.y - centroid.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > maxDist) {
      maxDist = dist
      furthestPoint = p
    }
  }

  // Position suggestion beyond the furthest point
  const dx = furthestPoint.x - centroid.x
  const dy = furthestPoint.y - centroid.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1

  // Rotate based on index for multiple suggestions
  const angle = Math.atan2(dy, dx) + (index * 0.5)
  const offset = maxDist + 50 + (index * 20)

  return {
    x: centroid.x + Math.cos(angle) * offset,
    y: centroid.y + Math.sin(angle) * offset,
  }
}

/**
 * Group topics by category and compute cluster data
 * @param {Array} topics - Array of topic objects with category
 * @param {Object} positions - Map of topic id to {x, y} position
 * @returns {Object} Map of category to cluster data
 */
export function computeClusterData(topics, positions) {
  const clusters = {}

  // Group topics by category
  for (const topic of topics) {
    const category = topic.category || 'General'
    if (!clusters[category]) {
      clusters[category] = {
        category,
        topics: [],
        positions: [],
      }
    }
    clusters[category].topics.push(topic)

    const pos = positions[topic.id]
    if (pos) {
      clusters[category].positions.push({ ...pos, id: topic.id })
    }
  }

  // Compute hull and centroid for each cluster
  for (const category of Object.keys(clusters)) {
    const cluster = clusters[category]
    cluster.centroid = computeCentroid(cluster.positions)

    if (cluster.positions.length >= 3) {
      const hull = computeConvexHull(cluster.positions)
      cluster.hull = expandHull(hull, 30)
      cluster.path = hullToSmoothPath(cluster.hull, 0.15)
    } else if (cluster.positions.length > 0) {
      // For small clusters, create a simple bounding box
      const padding = 40
      const bounds = cluster.positions.reduce(
        (acc, p) => ({
          minX: Math.min(acc.minX, p.x),
          maxX: Math.max(acc.maxX, p.x),
          minY: Math.min(acc.minY, p.y),
          maxY: Math.max(acc.maxY, p.y),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      )

      // Simple rounded rectangle path
      const x = bounds.minX - padding
      const y = bounds.minY - padding
      const w = bounds.maxX - bounds.minX + padding * 2
      const h = bounds.maxY - bounds.minY + padding * 2
      const r = 12

      cluster.hull = [
        { x: x + r, y },
        { x: x + w - r, y },
        { x: x + w, y: y + r },
        { x: x + w, y: y + h - r },
        { x: x + w - r, y: y + h },
        { x: x + r, y: y + h },
        { x, y: y + h - r },
        { x, y: y + r },
      ]
      cluster.path = `M ${x + r} ${y}
        L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r}
        L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h}
        L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r}
        L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`
    }
  }

  return clusters
}

export default {
  computeConvexHull,
  expandHull,
  hullToSmoothPath,
  computeCentroid,
  curvedPath,
  getSuggestionPosition,
  computeClusterData,
}
