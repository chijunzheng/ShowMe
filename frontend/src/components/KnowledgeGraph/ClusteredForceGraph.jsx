/**
 * ClusteredForceGraph Component
 * Force-directed knowledge graph with LLM-detected edges
 * Topics connect based on semantic relationships
 */

import { useRef, useMemo, useCallback, useState, useEffect } from 'react'
import useClusteredSimulation from './useClusteredSimulation'
import { generateGraphFromTopics, generateSuggestions } from './generateLocalGraph'
import TopicNode from './TopicNode'
import { EdgeLines } from './EdgeLine'
import { ClusterHulls } from './ClusterHull'

export default function ClusteredForceGraph({
  topics = [],
  edges = [],
  activeTopicId,
  onTopicClick,
  onSuggestionClick,
  className = '',
  isClassifying = false,
}) {
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [hoveredTopicId, setHoveredTopicId] = useState(null)

  // Measure container - with retry for modal open timing
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect()
      // Only update if we have real dimensions
      if (rect.width > 0 && rect.height > 0) {
        setDimensions(prev => {
          // Avoid unnecessary updates
          if (prev.width === rect.width && prev.height === rect.height) {
            return prev
          }
          return { width: rect.width, height: rect.height }
        })
      }
    }

    // Initial measurement
    updateDimensions()

    // Retry after a frame in case modal is still animating
    const frameId = requestAnimationFrame(() => {
      updateDimensions()
      // And once more after a short delay for CSS transitions
      setTimeout(updateDimensions, 100)
    })

    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
    }
  }, [topics.length]) // Re-run when topics load

  // Generate graph data from topics
  const graphData = useMemo(() => {
    return generateGraphFromTopics(topics)
  }, [topics])

  // Generate suggestions
  const suggestions = useMemo(() => {
    return generateSuggestions(topics).slice(0, 3)
  }, [topics])

  // Run force simulation with edges
  const { positions, isSimulating } = useClusteredSimulation({
    nodes: graphData.nodes,
    edges: edges,
    width: dimensions.width,
    height: dimensions.height,
  })

  // Compute cluster data for hulls
  const clusters = useMemo(() => {
    const groups = {}
    graphData.nodes.forEach(node => {
      const cat = node.category || 'General'
      if (!groups[cat]) {
        groups[cat] = { positions: [] }
      }
      if (positions[node.id]) {
        groups[cat].positions.push(positions[node.id])
      }
    })
    return groups
  }, [graphData.nodes, positions])

  // Get highlighted category based on active topic
  const highlightedCategory = useMemo(() => {
    const targetId = hoveredTopicId || activeTopicId
    if (!targetId) return null
    const node = graphData.nodes.find(n => n.id === targetId)
    return node?.category || null
  }, [activeTopicId, hoveredTopicId, graphData.nodes])

  // Handle topic click
  const handleTopicClick = useCallback((topic) => {
    onTopicClick?.(topic)
  }, [onTopicClick])

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion) => {
    onSuggestionClick?.(suggestion)
  }, [onSuggestionClick])

  // Empty state
  if (topics.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-slate-500 px-6">
          <div className="text-5xl mb-4 opacity-50">🌱</div>
          <p className="text-sm font-medium">Your knowledge map is empty</p>
          <p className="text-xs text-slate-600 mt-1">Ask a question to start exploring</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{
        background: 'radial-gradient(ellipse at center, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.95) 100%)',
      }}
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* SVG Layer - Edges and Cluster boundaries */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        {/* Cluster hulls (behind edges) */}
        <ClusterHulls
          clusters={clusters}
          highlightedCategory={highlightedCategory}
        />

        {/* Edge connections */}
        <EdgeLines
          edges={edges}
          positions={positions}
          nodes={graphData.nodes}
          highlightedNodeId={hoveredTopicId || activeTopicId}
        />
      </svg>

      {/* HTML Layer - Nodes */}
      <div className="absolute inset-0">
        {/* Topic nodes */}
        {graphData.nodes.map(node => (
          <TopicNode
            key={node.id}
            topic={{
              id: node.id,
              name: node.label,
              category: node.category,
              icon: node.icon,
            }}
            position={positions[node.id]}
            isActive={node.id === activeTopicId}
            isHighlighted={node.id === hoveredTopicId}
            onClick={handleTopicClick}
            onMouseEnter={() => setHoveredTopicId(node.id)}
            onMouseLeave={() => setHoveredTopicId(null)}
          />
        ))}

        {/* Suggested topics - positioned in bottom right */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          {suggestions.map(suggestion => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="
                flex items-center gap-2 px-3 py-2
                rounded-lg
                text-xs font-medium
                bg-slate-800/60 hover:bg-slate-700/60
                border border-dashed border-slate-600/50 hover:border-slate-500/50
                text-slate-400 hover:text-slate-300
                backdrop-blur-sm
                transition-all duration-200
                hover:scale-[1.02]
              "
            >
              <span className="text-slate-500">+</span>
              <span className="truncate max-w-[160px]">{suggestion.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status indicators */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3">
        {/* Classification in progress */}
        {isClassifying && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-300">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span>Analyzing connections...</span>
          </div>
        )}

        {/* Simulation in progress */}
        {isSimulating && !isClassifying && (
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            <span>Arranging...</span>
          </div>
        )}

        {/* Edge count indicator */}
        {edges.length > 0 && !isClassifying && !isSimulating && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <span>{edges.length} connections</span>
          </div>
        )}
      </div>
    </div>
  )
}
