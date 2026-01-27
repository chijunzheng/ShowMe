/**
 * GraphCanvas Component
 * Interactive force-directed knowledge graph visualization
 * Renders nodes and edges on HTML5 Canvas for performance
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import useForceSimulation from './useForceSimulation'

const NODE_RADIUS = 24
const SUGGESTED_RADIUS = 18
const FONT_SIZE = 11
const LABEL_OFFSET = 8

/**
 * Draws an edge between two nodes
 */
function drawEdge(ctx, from, to, type = 'related', color = '#cbd5e1') {
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)

  if (type === 'suggested') {
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = '#94a3b8'
  } else {
    ctx.setLineDash([])
    ctx.strokeStyle = color
  }

  ctx.lineWidth = type === 'suggested' ? 1 : 2
  ctx.stroke()
  ctx.setLineDash([])
}

/**
 * Draws a node
 */
function drawNode(ctx, node, x, y, isHovered = false, isSelected = false) {
  const radius = node.explored ? NODE_RADIUS : SUGGESTED_RADIUS
  const color = node.color || '#6b7280'

  // Shadow for explored nodes
  if (node.explored) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2
  }

  // Node circle
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)

  if (node.suggested && !node.explored) {
    // Suggested: dashed outline, semi-transparent
    ctx.fillStyle = '#f1f5f9'
    ctx.fill()
    ctx.setLineDash([3, 3])
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    // Explored: solid fill
    ctx.fillStyle = color
    ctx.fill()
  }

  // Hover ring
  if (isHovered || isSelected) {
    ctx.beginPath()
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2)
    ctx.strokeStyle = isSelected ? '#6366f1' : '#3b82f6'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Icon or initial
  ctx.fillStyle = node.explored ? '#ffffff' : color
  ctx.font = `${node.explored ? 14 : 12}px Inter, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Use first letter as icon
  const initial = (node.label || '?')[0].toUpperCase()
  ctx.fillText(initial, x, y)

  // Label below node
  const label = node.label || ''
  const maxLabelWidth = 80
  let displayLabel = label

  ctx.font = `${FONT_SIZE}px Inter, system-ui, sans-serif`
  if (ctx.measureText(label).width > maxLabelWidth) {
    while (ctx.measureText(displayLabel + '...').width > maxLabelWidth && displayLabel.length > 0) {
      displayLabel = displayLabel.slice(0, -1)
    }
    displayLabel += '...'
  }

  // Label background
  const labelWidth = ctx.measureText(displayLabel).width + 8
  const labelY = y + radius + LABEL_OFFSET

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.beginPath()
  ctx.roundRect(x - labelWidth / 2, labelY - 8, labelWidth, 16, 4)
  ctx.fill()

  // Label text
  ctx.fillStyle = node.explored ? '#334155' : '#64748b'
  ctx.fillText(displayLabel, x, labelY)
}

export default function GraphCanvas({
  nodes = [],
  edges = [],
  onNodeClick,
  onNodeHover,
  selectedNodeId,
  className = '',
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 })
  const [hoveredNode, setHoveredNode] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragNodeRef = useRef(null)

  const { positions, updateNodePosition, reheat } = useForceSimulation({
    nodes,
    edges,
    width: dimensions.width,
    height: dimensions.height,
  })

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Get node at position
  const getNodeAt = useCallback((x, y) => {
    for (const node of nodes) {
      const pos = positions[node.id]
      if (!pos) continue

      const radius = node.explored ? NODE_RADIUS : SUGGESTED_RADIUS
      const dx = x - pos.x
      const dy = y - pos.y

      if (dx * dx + dy * dy <= radius * radius) {
        return node
      }
    }
    return null
  }, [nodes, positions])

  // Mouse handlers
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (isDragging && dragNodeRef.current) {
      updateNodePosition(dragNodeRef.current.id, x, y)
      return
    }

    const node = getNodeAt(x, y)
    setHoveredNode(node?.id || null)
    canvas.style.cursor = node ? 'pointer' : 'default'

    if (onNodeHover) {
      onNodeHover(node)
    }
  }, [getNodeAt, isDragging, updateNodePosition, onNodeHover])

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const node = getNodeAt(x, y)
    if (node) {
      setIsDragging(true)
      dragNodeRef.current = node
    }
  }, [getNodeAt])

  const handleMouseUp = useCallback((e) => {
    if (isDragging && dragNodeRef.current) {
      // If minimal movement, treat as click
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const node = getNodeAt(x, y)

      if (node && node.id === dragNodeRef.current.id && onNodeClick) {
        onNodeClick(node)
      }

      reheat()
    }

    setIsDragging(false)
    dragNodeRef.current = null
  }, [isDragging, getNodeAt, onNodeClick, reheat])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    // Set canvas size with DPR
    canvas.width = dimensions.width * dpr
    canvas.height = dimensions.height * dpr
    ctx.scale(dpr, dpr)

    // Clear
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    // Draw edges first
    edges.forEach(edge => {
      const from = positions[edge.from]
      const to = positions[edge.to]
      if (from && to) {
        drawEdge(ctx, from, to, edge.type)
      }
    })

    // Draw nodes
    nodes.forEach(node => {
      const pos = positions[node.id]
      if (pos) {
        drawNode(
          ctx,
          node,
          pos.x,
          pos.y,
          hoveredNode === node.id,
          selectedNodeId === node.id
        )
      }
    })
  }, [nodes, edges, positions, dimensions, hoveredNode, selectedNodeId])

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredNode(null)
          if (isDragging) {
            setIsDragging(false)
            dragNodeRef.current = null
            reheat()
          }
        }}
      />

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500 pointer-events-none">
          <div className="text-center">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-sm">Your knowledge graph will grow here</p>
          </div>
        </div>
      )}
    </div>
  )
}
