/**
 * Constellation Component
 *
 * Interactive knowledge graph visualization.
 * Topics appear as stars, relationships as lines.
 * Supports pan, zoom, and tap interactions.
 *
 * Features:
 * - Force-directed layout for organic node positioning
 * - Pan with drag, zoom with wheel/pinch
 * - Touch-friendly with min 44px tap targets
 * - Accessible with keyboard navigation and ARIA labels
 * - Dark theme optimized (slate-950 background)
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import ConstellationStar from './ConstellationStar'
import ConstellationEdge from './ConstellationEdge'
import ConstellationCluster from './ConstellationCluster'
import ConstellationGap from './ConstellationGap'
import useConstellationLayout from './useConstellationLayout'
import { calculateGapPosition } from './constellationUtils'

/**
 * Zoom constraints
 */
const MIN_ZOOM = 0.3
const MAX_ZOOM = 3
const ZOOM_STEP = 0.2

/**
 * Constellation - Main interactive graph component
 *
 * @param {Object} props - Component props
 * @param {Array} props.nodes - Topic nodes (KnowledgeNode[])
 * @param {Array} props.edges - Relationship edges (KnowledgeEdge[])
 * @param {Array} props.clusters - Topic clusters (KnowledgeCluster[])
 * @param {Array} props.gaps - Suggested topics (KnowledgeGap[])
 * @param {Function} props.onNodeTap - Handler when star is tapped (node)
 * @param {Function} props.onGapTap - Handler when gap is tapped (gap)
 * @param {Function} props.onEdgeTap - Handler when edge is tapped (edge)
 * @param {string} props.className - Additional CSS classes
 */
export default function Constellation({
  nodes = [],
  edges = [],
  clusters = [],
  gaps = [],
  onNodeTap,
  onGapTap,
  onEdgeTap,
  className = '',
}) {
  // Viewport state for pan/zoom
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

  // Refs for drag handling
  const containerRef = useRef(null)
  const dragStartRef = useRef({ x: 0, y: 0 })

  // Track container size for dynamic center calculation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Calculate node positions using force-directed layout
  const positions = useConstellationLayout(nodes, edges, {
    centerX: containerSize.width / 2,
    centerY: containerSize.height / 2,
  }, clusters)

  /**
   * Check if event target is the background (not a node/edge)
   */
  const isBackgroundTarget = useCallback((target) => {
    return !target.closest('button, [role="button"], a, input')
  }, [])

  /**
   * Handle pointer down for panning
   */
  const handlePointerDown = useCallback(
    (e) => {
      if (isBackgroundTarget(e.target)) {
        setIsDragging(true)
        dragStartRef.current = {
          x: e.clientX - viewport.x,
          y: e.clientY - viewport.y,
        }
        // Prevent text selection while dragging
        e.preventDefault()
      }
    },
    [viewport.x, viewport.y, isBackgroundTarget]
  )

  /**
   * Handle pointer move for panning
   */
  const handlePointerMove = useCallback(
    (e) => {
      if (isDragging) {
        setViewport((prev) => ({
          ...prev,
          x: e.clientX - dragStartRef.current.x,
          y: e.clientY - dragStartRef.current.y,
        }))
      }
    },
    [isDragging]
  )

  /**
   * Handle pointer up to end dragging
   */
  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  /**
   * Handle wheel for zooming
   */
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setViewport((prev) => ({
      ...prev,
      scale: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.scale * delta)),
    }))
  }, [])

  /**
   * Zoom in handler
   */
  const handleZoomIn = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      scale: Math.min(MAX_ZOOM, prev.scale * (1 + ZOOM_STEP)),
    }))
  }, [])

  /**
   * Zoom out handler
   */
  const handleZoomOut = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      scale: Math.max(MIN_ZOOM, prev.scale * (1 - ZOOM_STEP)),
    }))
  }, [])

  /**
   * Reset view handler - returns to default position and zoom
   */
  const handleResetView = useCallback(() => {
    setViewport({ x: 0, y: 0, scale: 1 })
  }, [])

  /**
   * Memoize gap positions to avoid recalculating on every render
   */
  const gapPositions = useMemo(() => {
    return gaps.map((gap) => ({
      gap,
      position: calculateGapPosition(gap, positions, nodes),
    }))
  }, [gaps, positions, nodes])

  /**
   * Calculate nebula cloud data for each cluster
   * Each cluster gets a soft radial gradient ellipse behind its nodes
   */
  const nebulaData = useMemo(() => {
    if (!clusters || clusters.length === 0) return []

    return clusters.map((cluster) => {
      // Get positions of all nodes in this cluster
      const clusterPositions = cluster.nodeIds
        .map((id) => positions.get(id))
        .filter(Boolean)

      if (clusterPositions.length === 0) return null

      // Calculate bounding box
      const xs = clusterPositions.map((p) => p.x)
      const ys = clusterPositions.map((p) => p.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      // Center and radius with padding
      const padding = 60
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const rx = Math.max(40, (maxX - minX) / 2 + padding)
      const ry = Math.max(40, (maxY - minY) / 2 + padding)

      return {
        id: cluster.id,
        cx,
        cy,
        rx,
        ry,
        color: cluster.color || '#64748B',
      }
    }).filter(Boolean)
  }, [clusters, positions])

  /**
   * Transform style for pan/zoom
   */
  const transformStyle = useMemo(
    () => ({
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
      transformOrigin: 'center center',
    }),
    [viewport.x, viewport.y, viewport.scale]
  )

  return (
    <div
      ref={containerRef}
      data-testid="constellation"
      className={`
        relative w-full h-full overflow-hidden
        bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950
        touch-none select-none
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        ${className}
      `}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      role="application"
      aria-label="Knowledge constellation - interactive topic graph"
    >
      {/* Decorative starfield dots */}
      <div className="constellation-background absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Use pseudo-random positioned dots via inline styles */}
        {[
          { top: '8%', left: '12%', size: 1 },
          { top: '15%', left: '45%', size: 1.5 },
          { top: '22%', left: '78%', size: 1 },
          { top: '35%', left: '23%', size: 2 },
          { top: '42%', left: '67%', size: 1 },
          { top: '55%', left: '34%', size: 1.5 },
          { top: '62%', left: '89%', size: 1 },
          { top: '70%', left: '56%', size: 2 },
          { top: '78%', left: '15%', size: 1 },
          { top: '85%', left: '72%', size: 1.5 },
          { top: '92%', left: '40%', size: 1 },
          { top: '18%', left: '92%', size: 1 },
          { top: '48%', left: '8%', size: 1.5 },
          { top: '30%', left: '55%', size: 1 },
          { top: '65%', left: '42%', size: 2 },
          { top: '88%', left: '25%', size: 1 },
          { top: '5%', left: '60%', size: 1.5 },
          { top: '50%', left: '50%', size: 1 },
          { top: '75%', left: '80%', size: 1 },
          { top: '38%', left: '3%', size: 1.5 },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
              opacity: 0.15 + (i % 3) * 0.1,
            }}
          />
        ))}
      </div>

      {/* Nebula clouds behind clusters */}
      {nebulaData.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={transformStyle}
          aria-hidden="true"
        >
          <defs>
            {nebulaData.map((nebula) => (
              <radialGradient key={`grad-${nebula.id}`} id={`nebula-${nebula.id}`}>
                <stop offset="0%" stopColor={nebula.color} stopOpacity="0.15" />
                <stop offset="70%" stopColor={nebula.color} stopOpacity="0.05" />
                <stop offset="100%" stopColor={nebula.color} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>
          {nebulaData.map((nebula) => (
            <ellipse
              key={nebula.id}
              cx={nebula.cx}
              cy={nebula.cy}
              rx={nebula.rx}
              ry={nebula.ry}
              fill={`url(#nebula-${nebula.id})`}
            />
          ))}
        </svg>
      )}

      {/* SVG layer for edges */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={transformStyle}
        aria-hidden="true"
      >
        <g className="pointer-events-auto">
          {edges.map((edge) => {
            const fromPos = positions.get(edge.from)
            const toPos = positions.get(edge.to)
            if (!fromPos || !toPos) return null
            return (
              <ConstellationEdge
                key={edge.id}
                edge={edge}
                fromPos={fromPos}
                toPos={toPos}
                onTap={onEdgeTap}
              />
            )
          })}
        </g>
      </svg>

      {/* Stars layer (nodes, clusters, gaps) */}
      <div className="absolute inset-0" style={transformStyle}>
        {/* Cluster labels (rendered first, below stars) */}
        {clusters.map((cluster) => (
          <ConstellationCluster
            key={cluster.id}
            cluster={cluster}
            nodePositions={positions}
          />
        ))}

        {/* Gap stars (suggestions) */}
        {gapPositions.map(({ gap, position }) => (
          <ConstellationGap
            key={gap.id}
            gap={gap}
            position={position}
            onTap={onGapTap}
          />
        ))}

        {/* Topic stars */}
        {nodes.map((node) => {
          const pos = positions.get(node.id)
          if (!pos) return null
          return (
            <ConstellationStar
              key={node.id}
              node={node}
              position={pos}
              onTap={onNodeTap}
            />
          )
        })}
      </div>

      {/* Zoom controls - Neobrutalism style */}
      <div
        className="absolute bottom-4 right-4 flex flex-col gap-2 z-10"
        role="group"
        aria-label="Zoom controls"
      >
        <button
          onClick={handleZoomIn}
          className="
            w-12 h-12 rounded-xl
            bg-slate-800/90 border-2 border-black dark:border-slate-600
            shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]
            hover:bg-slate-700/90
            active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
            text-white text-xl font-bold
            flex items-center justify-center
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950
          "
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="
            w-12 h-12 rounded-xl
            bg-slate-800/90 border-2 border-black dark:border-slate-600
            shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]
            hover:bg-slate-700/90
            active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
            text-white text-xl font-bold
            flex items-center justify-center
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950
          "
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={handleResetView}
          className="
            w-12 h-12 rounded-xl
            bg-slate-800/90 border-2 border-black dark:border-slate-600
            shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]
            hover:bg-slate-700/90
            active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
            text-white text-sm font-bold
            flex items-center justify-center
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950
          "
          aria-label="Reset view"
        >
          ⊙
        </button>
      </div>

      {/* Empty state message */}
      {nodes.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center p-8"
          role="status"
        >
          <div className="text-center text-slate-400 max-w-sm">
            <div className="text-6xl mb-4" aria-hidden="true">✨</div>
            <h3 className="text-xl font-bold mb-2 text-slate-300">
              Your Knowledge Constellation
            </h3>
            <p className="text-sm">
              Start learning topics to see stars appear.
              Each topic becomes a star in your personal knowledge galaxy.
            </p>
          </div>
        </div>
      )}

      {/* Interaction hints for new users */}
      {nodes.length > 0 && nodes.length <= 3 && (
        <div className="
          absolute top-4 right-4
          bg-slate-800/90 backdrop-blur-sm
          px-4 py-3 rounded-xl
          border border-slate-600
          text-sm text-slate-200
          max-w-xs z-10
        ">
          <p className="font-semibold mb-1">Tip</p>
          <p>Drag to pan &bull; Scroll to zoom &bull; Tap stars to interact</p>
        </div>
      )}
    </div>
  )
}
