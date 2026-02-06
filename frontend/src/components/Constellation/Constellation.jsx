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
import ConstellationGap from './ConstellationGap'
import DiscoverButton from './DiscoverButton'
import useConstellationLayout from './useConstellationLayout'
import { calculateGapPosition } from './constellationUtils'

/**
 * Zoom constraints
 */
const MIN_ZOOM = 0.3
const MAX_ZOOM = 3
const ZOOM_STEP = 0.2

const LABEL_CHAR_WIDTH = 6
const LABEL_HEIGHT = 20
const LABEL_OFFSET_Y = 18
const LABEL_PADDING = 8
const LABEL_GUTTER = 4
const LABEL_MAX_WIDTH = 110
const GAP_LABEL_MAX_WIDTH = 120
const CROSS_EDGE_DASH = 'none'
const CROSS_EDGE_COLOR = 'rgba(148, 163, 184, 0.5)'
const CROSS_EDGE_WIDTH = 1.2
const CROSS_EDGE_CURVE_MIN = 24
const CROSS_EDGE_CURVE_MAX = 80

const BRIGHTNESS_PRIORITY = {
  brilliant: 4,
  bright: 3,
  glow: 2,
  dim: 1,
}

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
 * @param {Function} props.onDiscover - Handler when discover button is clicked
 * @param {boolean} props.isDiscovering - Loading state for discover button
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
  onDiscover,
  isDiscovering = false,
  className = '',
}) {
  // Viewport state for pan/zoom
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hoveredClusterId, setHoveredClusterId] = useState(null)
  const [legendClusterId, setLegendClusterId] = useState(null)
  const [isLegendOpen, setIsLegendOpen] = useState(false)

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

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', handleChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleChange)
    }
  }, [])

  // Calculate node positions using force-directed layout
  const positions = useConstellationLayout(nodes, edges, {
    centerX: containerSize.width / 2,
    centerY: containerSize.height / 2 - 20,
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
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setViewport((prev) => ({
      ...prev,
      scale: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.scale * delta)),
    }))
  }, [])

  /**
   * Attach non-passive wheel listener to allow preventDefault
   */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (event) => {
      if (event.cancelable) {
        event.preventDefault()
      }
      handleWheel(event)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
    }
  }, [handleWheel])

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

  const handleToggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    if (document.fullscreenElement) {
      document.exitFullscreen?.()
      return
    }

    const request = el.requestFullscreen?.()
    if (request?.catch) {
      request.catch(() => {})
    }
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
   * Determine which labels should be visible to avoid collisions.
   * Labels will always show on hover/focus in their own components.
   */
  const labelVisibility = useMemo(() => {
    const occupied = []
    const visibleNodes = new Set()
    const visibleGaps = new Set()

    const getRect = (x, y, text, maxWidth) => {
      const baseWidth = text.length * LABEL_CHAR_WIDTH + LABEL_PADDING * 2
      const width = Math.min(maxWidth, Math.max(40, baseWidth))
      const left = x - width / 2 - LABEL_GUTTER
      const right = x + width / 2 + LABEL_GUTTER
      const top = y + LABEL_OFFSET_Y - LABEL_GUTTER
      const bottom = y + LABEL_OFFSET_Y + LABEL_HEIGHT + LABEL_GUTTER
      return { left, right, top, bottom }
    }

    const intersects = (a, b) => (
      !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
    )

    const candidates = []

    nodes.forEach((node) => {
      const pos = positions.get(node.id)
      if (!pos) return
      const priority = BRIGHTNESS_PRIORITY[node.brightness] || 1
      candidates.push({
        kind: 'node',
        id: node.id,
        text: node.name || '',
        pos,
        priority,
        maxWidth: LABEL_MAX_WIDTH,
      })
    })

    gapPositions.forEach(({ gap, position }) => {
      candidates.push({
        kind: 'gap',
        id: gap.id,
        text: gap.suggestedTopic || '',
        pos: position,
        priority: 2,
        maxWidth: GAP_LABEL_MAX_WIDTH,
      })
    })

    candidates.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return a.text.length - b.text.length
    })

    candidates.forEach((candidate) => {
      if (!candidate.text) return
      const rect = getRect(candidate.pos.x, candidate.pos.y, candidate.text, candidate.maxWidth)
      const collision = occupied.some((existing) => intersects(existing, rect))
      if (collision) return

      occupied.push(rect)
      if (candidate.kind === 'node') {
        visibleNodes.add(candidate.id)
      } else {
        visibleGaps.add(candidate.id)
      }
    })

    return { visibleNodes, visibleGaps }
  }, [nodes, positions, gapPositions])

  /**
   * Build dashed edges connecting suggested gaps to related nodes
   */
  const gapEdges = useMemo(() => {
    const edges = []

    gapPositions.forEach(({ gap, position }) => {
      const connectIds = gap.connectsTo || gap.relatedNodeIds || []
      if (!Array.isArray(connectIds) || connectIds.length === 0) return

      connectIds.forEach((nodeId, idx) => {
        const fromPos = positions.get(nodeId)
        if (!fromPos) return
        edges.push({
          id: `${gap.id}_${nodeId}_${idx}`,
          fromPos,
          toPos: position,
        })
      })
    })

    return edges
  }, [gapPositions, positions])

  const nodeClusterMap = useMemo(() => {
    const map = new Map()
    clusters.forEach((cluster) => {
      (cluster.nodeIds || []).forEach((id) => {
        map.set(id, cluster.id)
      })
    })
    return map
  }, [clusters])

  const edgeGroups = useMemo(() => {
    const crossClusterEdges = []
    const intraClusterEdges = []

    edges.forEach((edge) => {
      const fromCluster = nodeClusterMap.get(edge.from)
      const toCluster = nodeClusterMap.get(edge.to)
      if (fromCluster && toCluster && fromCluster !== toCluster) {
        crossClusterEdges.push(edge)
      } else {
        intraClusterEdges.push(edge)
      }
    })

    return { crossClusterEdges, intraClusterEdges }
  }, [edges, nodeClusterMap])

  const buildCrossEdgePath = useCallback((fromPos, toPos) => {
    const dx = toPos.x - fromPos.x
    const dy = toPos.y - fromPos.y
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    const nx = -dy / dist
    const ny = dx / dist
    const curve = Math.min(CROSS_EDGE_CURVE_MAX, Math.max(CROSS_EDGE_CURVE_MIN, dist * 0.22))
    const cx = (fromPos.x + toPos.x) / 2 + nx * curve
    const cy = (fromPos.y + toPos.y) / 2 + ny * curve
    return `M ${fromPos.x} ${fromPos.y} Q ${cx} ${cy} ${toPos.x} ${toPos.y}`
  }, [])

  /**
   * Filter out "General" cluster for display
   */
  const displayClusters = useMemo(() =>
    clusters.filter(c => c.name?.toLowerCase() !== 'general'),
    [clusters]
  )

  const legendClusters = useMemo(() => {
    return [...displayClusters]
      .filter((cluster) => (cluster.nodeIds || []).length > 0)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [displayClusters])

  const clusterColorMap = useMemo(() => {
    const map = new Map()
    displayClusters.forEach((cluster) => {
      if (cluster?.id) {
        map.set(cluster.id, cluster.color)
      }
    })
    return map
  }, [displayClusters])

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
        ${isFullscreen ? 'w-screen h-screen' : ''}
      `}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      role="application"
      aria-label="Knowledge constellation - interactive topic graph"
    >
      {/* Decorative starfield dots */}
      <div className="constellation-background absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <style>
          {`
            @keyframes twinkle {
              0%, 100% { opacity: var(--base-opacity); }
              50% { opacity: calc(var(--base-opacity) * 0.3); }
            }
          `}
        </style>
        {/* Enhanced starfield with 50 dots, varied sizes, twinkling */}
        {[
          { top: '8%', left: '12%', size: 1, opacity: 0.2 },
          { top: '15%', left: '45%', size: 1.5, opacity: 0.3 },
          { top: '22%', left: '78%', size: 1, opacity: 0.15 },
          { top: '35%', left: '23%', size: 2, opacity: 0.35, twinkle: true, duration: 4.2 },
          { top: '42%', left: '67%', size: 1, opacity: 0.2 },
          { top: '55%', left: '34%', size: 1.5, opacity: 0.25 },
          { top: '62%', left: '89%', size: 1, opacity: 0.18, twinkle: true, duration: 5.1 },
          { top: '70%', left: '56%', size: 2, opacity: 0.4 },
          { top: '78%', left: '15%', size: 1, opacity: 0.22 },
          { top: '85%', left: '72%', size: 1.5, opacity: 0.28, twinkle: true, duration: 3.7 },
          { top: '92%', left: '40%', size: 1, opacity: 0.16 },
          { top: '18%', left: '92%', size: 1, opacity: 0.24 },
          { top: '48%', left: '8%', size: 1.5, opacity: 0.32, twinkle: true, duration: 4.8 },
          { top: '30%', left: '55%', size: 1, opacity: 0.19 },
          { top: '65%', left: '42%', size: 2, opacity: 0.38 },
          { top: '88%', left: '25%', size: 1, opacity: 0.21, twinkle: true, duration: 5.5 },
          { top: '5%', left: '60%', size: 1.5, opacity: 0.26 },
          { top: '50%', left: '50%', size: 1, opacity: 0.23 },
          { top: '75%', left: '80%', size: 1, opacity: 0.17, twinkle: true, duration: 6.0 },
          { top: '38%', left: '3%', size: 1.5, opacity: 0.29 },
          { top: '12%', left: '68%', size: 2, opacity: 0.42 },
          { top: '25%', left: '35%', size: 1, opacity: 0.2, twinkle: true, duration: 4.5 },
          { top: '58%', left: '72%', size: 1.5, opacity: 0.31 },
          { top: '82%', left: '48%', size: 1, opacity: 0.19 },
          { top: '95%', left: '15%', size: 1, opacity: 0.18, twinkle: true, duration: 3.9 },
          { top: '7%', left: '28%', size: 3, opacity: 0.45 },
          { top: '44%', left: '88%', size: 1, opacity: 0.22 },
          { top: '68%', left: '18%', size: 1.5, opacity: 0.27, twinkle: true, duration: 5.3 },
          { top: '33%', left: '95%', size: 1, opacity: 0.24 },
          { top: '90%', left: '62%', size: 2, opacity: 0.36 },
          { top: '14%', left: '82%', size: 1, opacity: 0.21, twinkle: true, duration: 4.1 },
          { top: '52%', left: '25%', size: 1.5, opacity: 0.3 },
          { top: '72%', left: '65%', size: 1, opacity: 0.19 },
          { top: '28%', left: '12%', size: 1, opacity: 0.17, twinkle: true, duration: 5.7 },
          { top: '61%', left: '55%', size: 2, opacity: 0.39 },
          { top: '86%', left: '8%', size: 1.5, opacity: 0.28 },
          { top: '3%', left: '42%', size: 1, opacity: 0.23, twinkle: true, duration: 3.5 },
          { top: '46%', left: '78%', size: 1, opacity: 0.18 },
          { top: '66%', left: '32%', size: 3, opacity: 0.48 },
          { top: '93%', left: '85%', size: 1.5, opacity: 0.33, twinkle: true, duration: 4.9 },
          { top: '19%', left: '58%', size: 1, opacity: 0.2 },
          { top: '54%', left: '2%', size: 1, opacity: 0.16 },
          { top: '77%', left: '92%', size: 2, opacity: 0.41, twinkle: true, duration: 5.9 },
          { top: '39%', left: '48%', size: 1.5, opacity: 0.29 },
          { top: '84%', left: '38%', size: 1, opacity: 0.22 },
          { top: '9%', left: '75%', size: 1, opacity: 0.19, twinkle: true, duration: 3.3 },
          { top: '57%', left: '95%', size: 4, opacity: 0.5 },
          { top: '73%', left: '5%', size: 1.5, opacity: 0.26 },
          { top: '26%', left: '65%', size: 1, opacity: 0.21, twinkle: true, duration: 4.7 },
          { top: '97%', left: '52%', size: 1, opacity: 0.17 },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
              opacity: dot.opacity,
              ...(dot.twinkle && {
                '--base-opacity': dot.opacity,
                animation: `twinkle ${dot.duration}s ease-in-out infinite`,
                animationDelay: `${(i * 0.3) % 2}s`,
              }),
            }}
          />
        ))}
      </div>

      {/* SVG layer for edges */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={transformStyle}
        aria-hidden="true"
      >
        {/* Dashed edges for suggested gaps */}
        <g className="pointer-events-none">
          {gapEdges.map((edge) => (
            <line
              key={edge.id}
              x1={edge.fromPos.x}
              y1={edge.fromPos.y}
              x2={edge.toPos.x}
              y2={edge.toPos.y}
              stroke="rgba(226, 232, 240, 0.55)"
              strokeWidth="1.4"
              strokeDasharray="4 5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
        <g className="pointer-events-auto">
          {edgeGroups.crossClusterEdges.map((edge) => {
            const fromPos = positions.get(edge.from)
            const toPos = positions.get(edge.to)
            if (!fromPos || !toPos) return null
            const opacity = Math.min(0.6, (edge.discovered ? 0.45 : 0.3) * (edge.strength || 1))
            const path = buildCrossEdgePath(fromPos, toPos)
            return (
              <path
                key={edge.id}
                data-testid={`constellation-cross-edge-${edge.id}`}
                d={path}
                stroke={CROSS_EDGE_COLOR}
                strokeWidth={CROSS_EDGE_WIDTH}
                strokeDasharray={CROSS_EDGE_DASH}
                strokeLinecap="round"
                fill="none"
                opacity={opacity}
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer hover:opacity-90 transition-opacity duration-200"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdgeTap?.(edge)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onEdgeTap?.(edge)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Cross-cluster connection from ${edge.from} to ${edge.to}`}
              />
            )
          })}
        </g>
        <g className="pointer-events-auto">
          {edgeGroups.intraClusterEdges.map((edge) => {
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
        {/* Gap stars (suggestions) */}
        {gapPositions.map(({ gap, position }) => (
          <ConstellationGap
            key={gap.id}
            gap={gap}
            position={position}
            onTap={onGapTap}
            showLabel={labelVisibility.visibleGaps.has(gap.id)}
          />
        ))}

        {/* Topic stars */}
        {nodes.map((node) => {
          const pos = positions.get(node.id)
          if (!pos) return null
          const nodeClusterId = nodeClusterMap.get(node.id)
          const accentColor = nodeClusterId ? clusterColorMap.get(nodeClusterId) : null
          const isDimmed = Boolean(
            legendClusterId && nodeClusterId && nodeClusterId !== legendClusterId
          )
          return (
            <ConstellationStar
              key={node.id}
              node={node}
              position={pos}
              onTap={onNodeTap}
              showLabel={labelVisibility.visibleNodes.has(node.id)}
              onHoverStart={() => setHoveredClusterId(nodeClusterId || null)}
              onHoverEnd={() => setHoveredClusterId(null)}
              isDimmed={isDimmed}
              accentColor={accentColor}
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
          onClick={handleToggleFullscreen}
          className="
            w-12 h-12 rounded-xl
            bg-slate-800/90 border-2 border-black dark:border-slate-600
            shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]
            hover:bg-slate-700/90
            active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
            text-white text-lg font-bold
            flex items-center justify-center
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950
          "
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? '⤡' : '⤢'}
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

      {/* Categories legend - top-left corner */}
      {legendClusters.length > 0 && (
        <div
          className="
            absolute top-4 left-4 z-10
            bg-slate-900/90 border border-slate-700
            rounded-xl px-3 py-2
            text-xs text-slate-200
            shadow-[0_0_18px_rgba(15,23,42,0.5)]
            backdrop-blur-sm
            min-w-[150px]
          "
          aria-label="Category legend"
        >
          <button
            type="button"
            onClick={() => {
              setIsLegendOpen((prev) => {
                if (prev) {
                  setLegendClusterId(null)
                }
                return !prev
              })
            }}
            className="
              w-full flex items-center justify-between gap-2
              text-[11px] uppercase tracking-wide text-slate-300
              hover:text-white transition-colors
            "
            aria-expanded={isLegendOpen}
          >
            <span>Categories</span>
            <span className="flex items-center gap-2 text-slate-400">
              <span>{legendClusters.length}</span>
              <span>{isLegendOpen ? '▾' : '▸'}</span>
            </span>
          </button>
          {isLegendOpen && (
            <div
              className="mt-2 max-h-40 overflow-y-auto pr-1"
              onMouseLeave={() => setLegendClusterId(null)}
              role="list"
            >
              {legendClusters.map((cluster) => {
                const isActive = legendClusterId === cluster.id
                return (
                  <button
                    key={cluster.id}
                    type="button"
                    className={`
                      w-full flex items-center gap-2 py-1
                      text-left
                      ${isActive ? 'text-white' : 'text-slate-200'}
                      hover:text-white
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60
                      rounded-md px-1
                    `}
                    role="listitem"
                    onMouseEnter={() => setLegendClusterId(cluster.id)}
                    onFocus={() => setLegendClusterId(cluster.id)}
                    onBlur={() => setLegendClusterId(null)}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cluster.color || '#64748B' }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{cluster.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Discover button - bottom-left corner */}
      {onDiscover && (
        <div className="absolute bottom-4 left-4 z-10">
          <DiscoverButton onClick={onDiscover} isLoading={isDiscovering} />
        </div>
      )}

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
