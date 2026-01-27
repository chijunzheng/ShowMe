/**
 * useForceSimulation Hook
 * Lightweight force-directed graph layout simulation
 * Uses simple physics: node repulsion + edge attraction
 */

import { useRef, useCallback, useEffect, useState } from 'react'

const DEFAULT_CONFIG = {
  nodeRepulsion: 5000,    // How strongly nodes push each other apart
  edgeAttraction: 0.005,  // How strongly connected nodes pull together
  damping: 0.9,           // Velocity damping (0-1)
  centerGravity: 0.01,    // Pull toward center
  idealEdgeLength: 120,   // Target edge length
  minVelocity: 0.1,       // Stop when velocity falls below this
}

/**
 * Simple force-directed layout simulation
 * @param {Object} params
 * @param {Array} params.nodes - Array of { id, x?, y?, ... }
 * @param {Array} params.edges - Array of { from, to }
 * @param {number} params.width - Canvas width
 * @param {number} params.height - Canvas height
 * @param {Object} params.config - Override simulation config
 */
export function useForceSimulation({
  nodes,
  edges,
  width,
  height,
  config = {},
}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const [positions, setPositions] = useState({})
  const [isSimulating, setIsSimulating] = useState(false)
  const animationRef = useRef(null)
  const velocitiesRef = useRef({})
  const positionsRef = useRef({})

  // Initialize positions for nodes that don't have them
  const initializePositions = useCallback(() => {
    const newPositions = { ...positionsRef.current }
    const newVelocities = { ...velocitiesRef.current }

    nodes.forEach((node, i) => {
      if (!newPositions[node.id]) {
        // Spiral placement for new nodes
        const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2
        const radius = 50 + (i * 15)
        newPositions[node.id] = {
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
        }
        newVelocities[node.id] = { vx: 0, vy: 0 }
      }
    })

    // Remove positions for deleted nodes
    Object.keys(newPositions).forEach(id => {
      if (!nodes.find(n => n.id === id)) {
        delete newPositions[id]
        delete newVelocities[id]
      }
    })

    positionsRef.current = newPositions
    velocitiesRef.current = newVelocities
    setPositions({ ...newPositions })
  }, [nodes, width, height])

  // Run one step of the simulation
  const simulationStep = useCallback(() => {
    const pos = positionsRef.current
    const vel = velocitiesRef.current
    let totalVelocity = 0

    // Apply forces
    nodes.forEach(node => {
      if (!pos[node.id]) return

      let fx = 0
      let fy = 0

      // Node repulsion (push apart)
      nodes.forEach(other => {
        if (node.id === other.id || !pos[other.id]) return

        const dx = pos[node.id].x - pos[other.id].x
        const dy = pos[node.id].y - pos[other.id].y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = cfg.nodeRepulsion / (dist * dist)

        fx += (dx / dist) * force
        fy += (dy / dist) * force
      })

      // Edge attraction (pull connected nodes together)
      edges.forEach(edge => {
        let otherId = null
        if (edge.from === node.id) otherId = edge.to
        else if (edge.to === node.id) otherId = edge.from

        if (otherId && pos[otherId]) {
          const dx = pos[otherId].x - pos[node.id].x
          const dy = pos[otherId].y - pos[node.id].y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const displacement = dist - cfg.idealEdgeLength

          fx += (dx / dist) * displacement * cfg.edgeAttraction
          fy += (dy / dist) * displacement * cfg.edgeAttraction
        }
      })

      // Center gravity
      const cx = width / 2 - pos[node.id].x
      const cy = height / 2 - pos[node.id].y
      fx += cx * cfg.centerGravity
      fy += cy * cfg.centerGravity

      // Update velocity with damping
      vel[node.id].vx = (vel[node.id].vx + fx) * cfg.damping
      vel[node.id].vy = (vel[node.id].vy + fy) * cfg.damping

      totalVelocity += Math.abs(vel[node.id].vx) + Math.abs(vel[node.id].vy)
    })

    // Update positions
    nodes.forEach(node => {
      if (!pos[node.id] || !vel[node.id]) return

      pos[node.id].x += vel[node.id].vx
      pos[node.id].y += vel[node.id].vy

      // Clamp to bounds with padding
      const padding = 40
      pos[node.id].x = Math.max(padding, Math.min(width - padding, pos[node.id].x))
      pos[node.id].y = Math.max(padding, Math.min(height - padding, pos[node.id].y))
    })

    positionsRef.current = { ...pos }
    setPositions({ ...pos })

    return totalVelocity / Math.max(nodes.length, 1)
  }, [nodes, edges, width, height, cfg])

  // Run simulation
  const runSimulation = useCallback((iterations = 150) => {
    setIsSimulating(true)
    let step = 0

    const tick = () => {
      const avgVelocity = simulationStep()
      step++

      if (avgVelocity > cfg.minVelocity && step < iterations) {
        animationRef.current = requestAnimationFrame(tick)
      } else {
        setIsSimulating(false)
      }
    }

    animationRef.current = requestAnimationFrame(tick)
  }, [simulationStep, cfg.minVelocity])

  // Track if we've initialized to prevent re-initialization on every render
  const hasInitializedRef = useRef(false)
  const prevNodesLengthRef = useRef(0)

  // Initialize on nodes change - but only when actually needed
  useEffect(() => {
    if (nodes.length === 0 || width <= 0 || height <= 0) {
      return
    }

    // Only re-initialize if nodes were added (not on every render)
    const nodesAdded = nodes.length > prevNodesLengthRef.current
    const needsInit = !hasInitializedRef.current || nodesAdded

    if (needsInit) {
      initializePositions()
      runSimulation()
      hasInitializedRef.current = true
      prevNodesLengthRef.current = nodes.length
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [nodes.length, width, height, initializePositions, runSimulation])

  // Update position for drag
  const updateNodePosition = useCallback((nodeId, x, y) => {
    positionsRef.current[nodeId] = { x, y }
    velocitiesRef.current[nodeId] = { vx: 0, vy: 0 }
    setPositions({ ...positionsRef.current })
  }, [])

  // Trigger re-simulation
  const reheat = useCallback(() => {
    runSimulation(100)
  }, [runSimulation])

  return {
    positions,
    isSimulating,
    updateNodePosition,
    reheat,
  }
}

export default useForceSimulation
