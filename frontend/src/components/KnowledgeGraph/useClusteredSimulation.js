/**
 * useClusteredSimulation Hook
 * Expansive force-directed graph with strong repulsion
 * Creates a spacious constellation layout across the full viewport
 */

import { useRef, useCallback, useEffect, useState } from 'react'

const DEFAULT_CONFIG = {
  // Edge spring force - WEAK pull to keep graph connected but not tight
  edgeStrength: 0.008,            // Reduced from 0.15 - very gentle attraction
  edgeRestLength: 250,            // Increased from 140 - longer natural distance

  // Node repulsion - STRONG push to spread nodes out
  nodeRepulsion: 25000,           // Increased 10x from 2500
  repulsionMaxDist: 800,          // Increased from 300 - affects more nodes

  // Cluster gravity - very subtle category grouping
  clusterGravity: 0.003,          // Reduced from 0.02

  // Global centering - minimal, just to prevent drift
  centerGravity: 0.001,           // Reduced from 0.005

  // Physics
  damping: 0.75,                  // Slightly less damping for more movement
  minVelocity: 0.3,               // Stop when velocity below this
  maxIterations: 300,             // More iterations to settle

  // Layout
  padding: 100,                   // Increased viewport padding
  minNodeDist: 120,               // Increased minimum distance
}

/**
 * Initialize node positions spread across the FULL viewport
 * Uses a spiral galaxy layout for visual interest
 */
function initializePositions(nodes, width, height, config) {
  const positions = {}
  const velocities = {}

  // Group nodes by category
  const groups = {}
  nodes.forEach(node => {
    const cat = node.category || 'General'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(node)
  })

  const categories = Object.keys(groups)
  const centerX = width / 2
  const centerY = height / 2

  // Use ALMOST the full viewport (90% radius)
  const maxRadius = Math.min(width, height) / 2 - config.padding

  // Golden angle for pleasing spiral distribution
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  let globalNodeIdx = 0
  const totalNodes = nodes.length

  // Distribute categories in wedges around the center
  categories.forEach((cat, catIdx) => {
    const catNodes = groups[cat]

    // Each category gets a wedge of the circle
    const wedgeStart = (catIdx / categories.length) * 2 * Math.PI - Math.PI / 2
    const wedgeSize = (2 * Math.PI) / categories.length * 0.85 // 85% of wedge, leave gaps

    catNodes.forEach((node, nodeIdx) => {
      // Spiral outward within the wedge
      const progress = nodeIdx / Math.max(catNodes.length - 1, 1)

      // Radius increases from 20% to 95% of max
      const radius = maxRadius * (0.2 + progress * 0.75)

      // Angle within the wedge with some spiral
      const angleOffset = progress * wedgeSize * 0.8
      const angle = wedgeStart + wedgeSize * 0.1 + angleOffset

      // Add controlled randomness for organic feel
      const jitterRadius = radius * 0.15
      const jitterAngle = 0.2

      positions[node.id] = {
        x: centerX + Math.cos(angle + (Math.random() - 0.5) * jitterAngle) * (radius + (Math.random() - 0.5) * jitterRadius),
        y: centerY + Math.sin(angle + (Math.random() - 0.5) * jitterAngle) * (radius + (Math.random() - 0.5) * jitterRadius),
      }
      velocities[node.id] = { x: 0, y: 0 }

      globalNodeIdx++
    })
  })

  return { positions, velocities }
}

/**
 * Calculate cluster centroids from current positions
 */
function computeCentroids(nodes, positions) {
  const groups = {}
  nodes.forEach(node => {
    const cat = node.category || 'General'
    if (!groups[cat]) groups[cat] = []
    if (positions[node.id]) groups[cat].push(positions[node.id])
  })

  const centroids = {}
  Object.entries(groups).forEach(([cat, posArr]) => {
    if (posArr.length === 0) return
    centroids[cat] = {
      x: posArr.reduce((sum, p) => sum + p.x, 0) / posArr.length,
      y: posArr.reduce((sum, p) => sum + p.y, 0) / posArr.length,
    }
  })

  return centroids
}

/**
 * Run one tick of the force simulation
 * Prioritizes REPULSION over attraction for spacious layout
 */
function simulateTick(nodes, edges, positions, velocities, centroids, width, height, config) {
  const newPositions = {}
  const newVelocities = {}
  const forces = {}

  // Initialize forces
  nodes.forEach(node => {
    forces[node.id] = { x: 0, y: 0 }
  })

  const centerX = width / 2
  const centerY = height / 2

  // 1. STRONG Node repulsion - the dominant force
  // This runs FIRST and creates the expansive feel
  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i]
    const posA = positions[nodeA.id]
    if (!posA) continue

    for (let j = i + 1; j < nodes.length; j++) {
      const nodeB = nodes[j]
      const posB = positions[nodeB.id]
      if (!posB) continue

      const dx = posA.x - posB.x
      const dy = posA.y - posB.y
      const distSq = dx * dx + dy * dy
      const dist = Math.sqrt(distSq) || 1

      // Skip only if VERY far apart
      if (dist > config.repulsionMaxDist) continue

      // Inverse square law with minimum distance floor
      const minDist = config.minNodeDist
      const effectiveDist = Math.max(dist, minDist)
      const effectiveDistSq = effectiveDist * effectiveDist

      // Stronger force when closer, using inverse square
      const force = config.nodeRepulsion / effectiveDistSq

      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      forces[nodeA.id].x += fx
      forces[nodeA.id].y += fy
      forces[nodeB.id].x -= fx
      forces[nodeB.id].y -= fy
    }
  }

  // 2. WEAK Edge spring forces - just enough to show connections
  edges.forEach(edge => {
    const fromPos = positions[edge.from]
    const toPos = positions[edge.to]
    if (!fromPos || !toPos) return

    const dx = toPos.x - fromPos.x
    const dy = toPos.y - fromPos.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1

    // Only apply spring force if nodes are far apart
    // This prevents edges from over-compressing the graph
    if (dist < config.edgeRestLength * 0.8) return

    // Gentle Hooke's law
    const displacement = dist - config.edgeRestLength
    const force = config.edgeStrength * displacement

    const fx = (dx / dist) * force
    const fy = (dy / dist) * force

    forces[edge.from].x += fx
    forces[edge.from].y += fy
    forces[edge.to].x -= fx
    forces[edge.to].y -= fy
  })

  // 3. Very subtle cluster gravity - keeps categories loosely grouped
  nodes.forEach(node => {
    const pos = positions[node.id]
    const centroid = centroids[node.category || 'General']
    if (!pos || !centroid) return

    const dx = centroid.x - pos.x
    const dy = centroid.y - pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Only apply if node is far from its cluster center
    if (dist > 200) {
      forces[node.id].x += dx * config.clusterGravity
      forces[node.id].y += dy * config.clusterGravity
    }
  })

  // 4. Minimal center gravity - prevents graph from drifting off-screen
  nodes.forEach(node => {
    const pos = positions[node.id]
    if (!pos) return

    const dx = centerX - pos.x
    const dy = centerY - pos.y

    forces[node.id].x += dx * config.centerGravity
    forces[node.id].y += dy * config.centerGravity
  })

  // 5. Boundary repulsion - soft bounce off edges
  nodes.forEach(node => {
    const pos = positions[node.id]
    if (!pos) return

    const boundaryForce = 50

    // Left boundary
    if (pos.x < config.padding * 2) {
      forces[node.id].x += boundaryForce * (1 - pos.x / (config.padding * 2))
    }
    // Right boundary
    if (pos.x > width - config.padding * 2) {
      forces[node.id].x -= boundaryForce * (1 - (width - pos.x) / (config.padding * 2))
    }
    // Top boundary
    if (pos.y < config.padding * 2) {
      forces[node.id].y += boundaryForce * (1 - pos.y / (config.padding * 2))
    }
    // Bottom boundary
    if (pos.y > height - config.padding * 2) {
      forces[node.id].y -= boundaryForce * (1 - (height - pos.y) / (config.padding * 2))
    }
  })

  // Apply forces to velocities and positions
  let maxVelocity = 0
  const maxSpeed = 30

  nodes.forEach(node => {
    const vel = velocities[node.id] || { x: 0, y: 0 }
    const force = forces[node.id] || { x: 0, y: 0 }
    const pos = positions[node.id]
    if (!pos) return

    // Update velocity with damping
    let newVx = (vel.x + force.x) * config.damping
    let newVy = (vel.y + force.y) * config.damping

    // Limit max velocity
    const speed = Math.sqrt(newVx * newVx + newVy * newVy)
    if (speed > maxSpeed) {
      newVx = (newVx / speed) * maxSpeed
      newVy = (newVy / speed) * maxSpeed
    }

    // Update position
    let newX = pos.x + newVx
    let newY = pos.y + newVy

    // Hard boundary constraints
    newX = Math.max(config.padding, Math.min(width - config.padding, newX))
    newY = Math.max(config.padding, Math.min(height - config.padding, newY))

    newPositions[node.id] = { x: newX, y: newY }
    newVelocities[node.id] = { x: newVx, y: newVy }

    maxVelocity = Math.max(maxVelocity, Math.abs(newVx), Math.abs(newVy))
  })

  return {
    positions: newPositions,
    velocities: newVelocities,
    maxVelocity,
  }
}

/**
 * Force-directed graph simulation optimized for spacious layouts
 */
export function useClusteredSimulation({
  nodes,
  edges = [],
  width,
  height,
  config = {},
}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const [positions, setPositions] = useState({})
  const [clusterCentroids, setClusterCentroids] = useState({})
  const [isSimulating, setIsSimulating] = useState(false)

  const velocitiesRef = useRef({})
  const animationRef = useRef(null)
  const iterationRef = useRef(0)
  const prevInputRef = useRef({ nodes: 0, edges: 0, width: 0, height: 0 })

  // Run simulation
  const runSimulation = useCallback((initialPositions, initialVelocities) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    setIsSimulating(true)
    iterationRef.current = 0

    let currentPositions = initialPositions
    let currentVelocities = initialVelocities

    const tick = () => {
      const centroids = computeCentroids(nodes, currentPositions)

      const result = simulateTick(
        nodes,
        edges,
        currentPositions,
        currentVelocities,
        centroids,
        width,
        height,
        cfg
      )

      currentPositions = result.positions
      currentVelocities = result.velocities
      velocitiesRef.current = currentVelocities
      iterationRef.current++

      setPositions(currentPositions)
      setClusterCentroids(centroids)

      // Continue simulation if not settled
      const shouldContinue =
        result.maxVelocity > cfg.minVelocity &&
        iterationRef.current < cfg.maxIterations

      if (shouldContinue) {
        animationRef.current = requestAnimationFrame(tick)
      } else {
        setIsSimulating(false)
      }
    }

    animationRef.current = requestAnimationFrame(tick)
  }, [nodes, edges, width, height, cfg])

  // Initialize or update simulation when inputs change
  useEffect(() => {
    if (width <= 0 || height <= 0 || nodes.length === 0) return

    const prev = prevInputRef.current
    const inputsChanged =
      nodes.length !== prev.nodes ||
      edges.length !== prev.edges ||
      width !== prev.width ||
      height !== prev.height

    if (inputsChanged) {
      prevInputRef.current = {
        nodes: nodes.length,
        edges: edges.length,
        width,
        height
      }

      const { positions: initPos, velocities: initVel } =
        initializePositions(nodes, width, height, cfg)

      runSimulation(initPos, initVel)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [nodes, edges, width, height, cfg, runSimulation])

  // Update position for drag
  const updateNodePosition = useCallback((nodeId, x, y) => {
    setPositions(prev => ({
      ...prev,
      [nodeId]: { x, y }
    }))
    // Reset velocity when dragging
    velocitiesRef.current[nodeId] = { x: 0, y: 0 }
  }, [])

  // Trigger re-layout
  const reheat = useCallback(() => {
    if (width <= 0 || height <= 0 || nodes.length === 0) return

    const { positions: initPos, velocities: initVel } =
      initializePositions(nodes, width, height, cfg)

    runSimulation(initPos, initVel)
  }, [nodes, width, height, cfg, runSimulation])

  return {
    positions,
    clusterCentroids,
    isSimulating,
    updateNodePosition,
    reheat,
  }
}

export default useClusteredSimulation
