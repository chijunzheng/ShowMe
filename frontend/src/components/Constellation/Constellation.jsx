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

import { useState, useRef, useCallback, useMemo } from 'react'
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

  // Refs for drag handling
  const containerRef = useRef(null)
  const dragStartRef = useRef({ x: 0, y: 0 })

  // Calculate node positions using force-directed layout
  const positions = useConstellationLayout(nodes, edges)

  /**
   * Check if event target is the background (not a node/edge)
   */
  const isBackgroundTarget = useCallback((target) => {
    return (
      target === containerRef.current ||
      target.tagName === 'svg' ||
      target.classList?.contains('constellation-background')
    )
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
   * Memoize gap positions to avoid recalculating on every render
   */
  const gapPositions = useMemo(() => {
    return gaps.map((gap) => ({
      gap,
      position: calculateGapPosition(gap, positions, nodes),
    }))
  }, [gaps, positions, nodes])

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
        bg-slate-950
        touch-none select-none
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
      {/* Background for capturing drag events */}
      <div
        className="constellation-background absolute inset-0"
        aria-hidden="true"
      />

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

      {/* Zoom controls */}
      <div
        className="absolute bottom-4 right-4 flex flex-col gap-2 z-10"
        role="group"
        aria-label="Zoom controls"
      >
        <button
          onClick={handleZoomIn}
          className="
            w-10 h-10 rounded-full
            bg-slate-800/80 hover:bg-slate-700/80
            text-white text-xl font-bold
            flex items-center justify-center
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950
          "
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="
            w-10 h-10 rounded-full
            bg-slate-800/80 hover:bg-slate-700/80
            text-white text-xl font-bold
            flex items-center justify-center
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950
          "
          aria-label="Zoom out"
        >
          -
        </button>
      </div>

      {/* Empty state message */}
      {nodes.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          role="status"
        >
          <div className="text-center text-slate-500">
            <div className="text-4xl mb-2" aria-hidden="true">
              *
            </div>
            <p className="text-sm">
              Your constellation awaits.
              <br />
              Start learning to see stars appear.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
