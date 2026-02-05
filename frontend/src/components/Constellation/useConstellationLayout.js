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
  iterations: 50,
  repulsion: 5000,
  attraction: 0.01,
  centerGravity: 0.01,
  centerX: 400,
  centerY: 300,
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
  const radius = Math.min(200, 50 * Math.sqrt(nodes.length))

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
      const distSquared = dx * dx + dy * dy
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
 * Run force-directed layout simulation
 *
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @param {Object} config - Layout configuration
 * @returns {Map} Final positions map
 */
function runSimulation(nodes, edges, config = {}) {
  const {
    iterations,
    repulsion,
    attraction,
    centerGravity,
    centerX,
    centerY,
  } = { ...DEFAULT_CONFIG, ...config }

  // Initialize positions
  const positions = initializePositions(nodes, centerX, centerY)

  // Run simulation iterations
  for (let i = 0; i < iterations; i++) {
    applyRepulsion(nodes, positions, repulsion)
    applyAttraction(edges, positions, attraction)
    applyCenterGravity(nodes, positions, centerX, centerY, centerGravity)
  }

  return positions
}

/**
 * Create a stable key from nodes and edges for memoization
 */
function createCacheKey(nodes, edges, config = {}) {
  if (!nodes || nodes.length === 0) return 'empty'

  const nodeKey = nodes.map((n) => n.id).sort().join(',')
  const edgeKey = edges?.map((e) => `${e.from}-${e.to}`).sort().join(',') || ''
  const centerKey = `${Math.round(config.centerX || 400)},${Math.round(config.centerY || 300)}`

  return `${nodeKey}|${edgeKey}|${centerKey}`
}

/**
 * Hook for calculating constellation layout positions
 * Uses a simple force-directed algorithm
 *
 * @param {Array} nodes - Array of KnowledgeNode objects
 * @param {Array} edges - Array of KnowledgeEdge objects
 * @param {Object} config - Optional layout configuration
 * @returns {Map<string, {x: number, y: number}>} Map of node id to position
 */
export default function useConstellationLayout(nodes, edges, config = {}) {
  // Create stable cache key based on node/edge structure
  const cacheKey = useMemo(
    () => createCacheKey(nodes, edges, config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, edges, config.centerX, config.centerY]
  )

  // Memoize the layout calculation
  const positions = useMemo(() => {
    // Guard against empty or invalid data
    if (!nodes || nodes.length === 0) {
      return new Map()
    }

    // Run force simulation
    return runSimulation(
      nodes,
      edges || [],
      { ...DEFAULT_CONFIG, ...config }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey])

  return positions
}
