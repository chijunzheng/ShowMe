/**
 * useConstellationLayout Hook
 *
 * Calculates force-directed layout positions for constellation nodes.
 * Uses a simple force simulation with repulsion between nodes and
 * attraction along edges to create an organic graph layout.
 *
 * Features:
 * - Force-directed positioning with configurable parameters
 * - Center gravity to keep the graph centered
 * - Memoized calculations for performance
 * - Respects existing node positions when provided
 */

import { useMemo } from 'react'

/**
 * Default layout configuration
 */
const DEFAULT_CONFIG = {
  iterations: 70,
  repulsion: 20000,
  attraction: 0.008,
  centerGravity: 0.008,
  centerX: 400,
  centerY: 300,
  clusterGravity: 0.018,
  clusterRepulsion: 12000,
}

/**
 * Build adaptive layout config based on node and cluster counts.
 *
 * @param {number} nodeCount
 * @param {number} clusterCount
 * @returns {Object}
 */
export function getAdaptiveLayoutConfig(nodeCount, clusterCount) {
  const safeNodes = Math.max(1, nodeCount || 0)
  const safeClusters = Math.max(1, clusterCount || 0)

  const nodeFactor = 1 + Math.min(2, safeNodes / 30)
  const clusterFactor = 1 + Math.min(3, safeClusters / 2)
  const centerGravity = DEFAULT_CONFIG.centerGravity * (clusterCount > 1 ? 0.5 : 0.8)
  const iterations = DEFAULT_CONFIG.iterations + Math.min(60, Math.floor(safeNodes * 0.8))

  return {
    repulsion: DEFAULT_CONFIG.repulsion * nodeFactor,
    clusterRepulsion: DEFAULT_CONFIG.clusterRepulsion * clusterFactor,
    centerGravity,
    iterations,
  }
}

/**
 * Calculate initial positions for nodes
 * Places nodes in a circle if no position provided
 *
 * @param {Array} nodes - Array of node objects
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @returns {Map} Map of node id to position
 */
function initializePositions(nodes, centerX, centerY) {
  const positions = new Map()
  const radius = Math.min(450, 95 * Math.sqrt(nodes.length))

  nodes.forEach((node, i) => {
    if (node.position) {
      // Use existing position if provided
      positions.set(node.id, { x: node.position.x, y: node.position.y })
    } else {
      // Distribute in a circle
      const angle = (2 * Math.PI * i) / nodes.length
      positions.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      })
    }
  })

  return positions
}

/**
 * Apply repulsion force between all node pairs
 * Nodes push each other away based on inverse square distance
 *
 * @param {Array} nodes - Array of node objects
 * @param {Map} positions - Current positions map
 * @param {number} repulsion - Repulsion force constant
 */
function applyRepulsion(nodes, positions, repulsion) {
  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i]
    const posA = positions.get(nodeA.id)

    for (let j = i + 1; j < nodes.length; j++) {
      const nodeB = nodes[j]
      const posB = positions.get(nodeB.id)

      const dx = posB.x - posA.x
      const dy = posB.y - posA.y
      // Clamp to minimum of 1 to prevent division by zero when nodes overlap
      const distSquared = Math.max(1, dx * dx + dy * dy)
      const dist = Math.max(1, Math.sqrt(distSquared))

      // Inverse square repulsion force
      const force = repulsion / distSquared
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      // Apply forces (Newton's third law)
      posA.x -= fx
      posA.y -= fy
      posB.x += fx
      posB.y += fy
    }
  }
}

/**
 * Apply attraction force along edges
 * Connected nodes are pulled towards each other
 *
 * @param {Array} edges - Array of edge objects
 * @param {Map} positions - Current positions map
 * @param {number} attraction - Attraction force constant
 */
function applyAttraction(edges, positions, attraction) {
  edges.forEach((edge) => {
    const posA = positions.get(edge.from)
    const posB = positions.get(edge.to)

    if (!posA || !posB) return

    const dx = posB.x - posA.x
    const dy = posB.y - posA.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 1) return

    // Attraction force proportional to distance and edge strength
    const strength = edge.strength || 1
    const force = dist * attraction * strength
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force

    // Apply forces
    posA.x += fx
    posA.y += fy
    posB.x -= fx
    posB.y -= fy
  })
}

/**
 * Apply center gravity to keep graph centered
 *
 * @param {Array} nodes - Array of node objects
 * @param {Map} positions - Current positions map
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} gravity - Gravity force constant
 */
function applyCenterGravity(nodes, positions, centerX, centerY, gravity) {
  nodes.forEach((node) => {
    const pos = positions.get(node.id)
    pos.x += (centerX - pos.x) * gravity
    pos.y += (centerY - pos.y) * gravity
  })
}

/**
 * Apply cluster gravity — pull same-cluster nodes toward their cluster centroid
 *
 * @param {Array} nodes - Array of node objects
 * @param {Map} positions - Current positions map
 * @param {Array} clusters - Array of cluster objects
 * @param {number} gravity - Cluster gravity force constant
 */
function applyClusterGravity(nodes, positions, clusters, gravity) {
  if (!clusters || clusters.length === 0) return

  clusters.forEach((cluster) => {
    if (!cluster.nodeIds || cluster.nodeIds.length < 2) return

    // Calculate cluster centroid
    let cx = 0
    let cy = 0
    let count = 0
    cluster.nodeIds.forEach((id) => {
      const pos = positions.get(id)
      if (pos) {
        cx += pos.x
        cy += pos.y
        count++
      }
    })

    if (count === 0) return
    cx /= count
    cy /= count

    // Pull each cluster node toward centroid
    cluster.nodeIds.forEach((id) => {
      const pos = positions.get(id)
      if (pos) {
        pos.x += (cx - pos.x) * gravity
        pos.y += (cy - pos.y) * gravity
      }
    })
  })
}

/**
 * Apply cluster repulsion — push cluster centroids apart from each other
 *
 * @param {Array} nodes - Array of node objects
 * @param {Map} positions - Current positions map
 * @param {Array} clusters - Array of cluster objects
 * @param {number} repulsion - Cluster repulsion force constant
 */
function applyClusterRepulsion(nodes, positions, clusters, repulsion) {
  if (!clusters || clusters.length < 2) return

  // Calculate centroids for each cluster
  const centroids = clusters.map((cluster) => {
    let cx = 0
    let cy = 0
    let count = 0
    cluster.nodeIds.forEach((id) => {
      const pos = positions.get(id)
      if (pos) {
        cx += pos.x
        cy += pos.y
        count++
      }
    })
    return { cluster, cx: count > 0 ? cx / count : 0, cy: count > 0 ? cy / count : 0, count }
  }).filter((c) => c.count > 0)

  // Repel cluster centroids from each other
  for (let i = 0; i < centroids.length; i++) {
    for (let j = i + 1; j < centroids.length; j++) {
      const a = centroids[i]
      const b = centroids[j]
      const dx = b.cx - a.cx
      const dy = b.cy - a.cy
      // Clamp to minimum of 1 to prevent division by zero when clusters overlap
      const distSquared = Math.max(1, dx * dx + dy * dy)
      const dist = Math.max(1, Math.sqrt(distSquared))

      const force = repulsion / distSquared
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      // Apply force to all nodes in each cluster
      a.cluster.nodeIds.forEach((id) => {
        const pos = positions.get(id)
        if (pos) {
          pos.x -= fx
          pos.y -= fy
        }
      })
      b.cluster.nodeIds.forEach((id) => {
        const pos = positions.get(id)
        if (pos) {
          pos.x += fx
          pos.y += fy
        }
      })
    }
  }
}

/**
 * Run force-directed layout simulation
 *
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @param {Object} config - Layout configuration
 * @param {Array} clusters - Array of cluster objects
 * @returns {Map} Final positions map
 */
function runSimulation(nodes, edges, config = {}, clusters = []) {
  const {
    iterations,
    repulsion,
    attraction,
    centerGravity,
    centerX,
    centerY,
    clusterGravity,
    clusterRepulsion,
  } = { ...DEFAULT_CONFIG, ...config }

  // Initialize positions
  const positions = initializePositions(nodes, centerX, centerY)

  // Run simulation iterations
  for (let i = 0; i < iterations; i++) {
    applyRepulsion(nodes, positions, repulsion)
    applyAttraction(edges, positions, attraction)
    applyClusterGravity(nodes, positions, clusters, clusterGravity)
    applyClusterRepulsion(nodes, positions, clusters, clusterRepulsion)
    applyCenterGravity(nodes, positions, centerX, centerY, centerGravity)
  }

  return positions
}

/**
 * Create a stable key from nodes and edges for memoization
 *
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @param {Object} config - Layout configuration
 * @param {Array} clusters - Array of cluster objects
 * @returns {string} Cache key
 */
function createCacheKey(nodes, edges, config = {}, clusters = []) {
  if (!nodes || nodes.length === 0) return 'empty'

  const nodeKey = nodes.map((n) => n.id).sort().join(',')
  const edgeKey = edges?.map((e) => `${e.from}-${e.to}`).sort().join(',') || ''
  const centerKey = `${Math.round(config.centerX || 400)},${Math.round(config.centerY || 300)}`
  const clusterKey = clusters?.map((c) => `${c.id}:${[...c.nodeIds].sort().join('+')}`).sort().join(',') || ''

  return `${nodeKey}|${edgeKey}|${centerKey}|${clusterKey}`
}

/**
 * Hook for calculating constellation layout positions
 * Uses a simple force-directed algorithm with cluster awareness
 *
 * @param {Array} nodes - Array of KnowledgeNode objects
 * @param {Array} edges - Array of KnowledgeEdge objects
 * @param {Object} config - Optional layout configuration
 * @param {Array} clusters - Array of KnowledgeCluster objects
 * @returns {Map<string, {x: number, y: number}>} Map of node id to position
 */
export default function useConstellationLayout(nodes, edges, config = {}, clusters = []) {
  // Create stable cache key based on node/edge/cluster structure
  const cacheKey = useMemo(
    () => createCacheKey(nodes, edges, config, clusters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, edges, config.centerX, config.centerY, clusters]
  )

  // Memoize the layout calculation
  const positions = useMemo(() => {
    // Guard against empty or invalid data
    if (!nodes || nodes.length === 0) {
      return new Map()
    }

    const adaptiveConfig = getAdaptiveLayoutConfig(nodes.length, clusters?.length || 0)

    // Run force simulation
    return runSimulation(
      nodes,
      edges || [],
      { ...DEFAULT_CONFIG, ...adaptiveConfig, ...config },
      clusters || []
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey])

  return positions
}
