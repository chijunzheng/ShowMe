/**
 * KnowledgeGraph Component
 * Interactive visualization of user's learning journey
 * Shows connected topics with force-directed layout
 *
 * Now supports local topic generation as primary source
 */

import { useState, useCallback, useMemo } from 'react'
import GraphCanvas from './GraphCanvas'
import { generateGraphFromTopics, generateSuggestions, CATEGORY_COLORS } from './generateLocalGraph'

export default function KnowledgeGraph({
  clientId,
  topics = [],  // Local topics from app state
  onTopicSelect,
  onSuggestionClick,
  className = '',
  showHeader = true,
  showLegend = true,
  showStats = true,
  showSuggestions = true,
  userStats = null,  // { streakCount, level, xp }
}) {
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)

  // Generate graph from local topics
  const { graph, stats, suggestions } = useMemo(() => {
    const graphData = generateGraphFromTopics(topics)
    const suggestionData = generateSuggestions(topics)
    return {
      graph: graphData,
      stats: graphData.stats,
      suggestions: suggestionData,
    }
  }, [topics])

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node)
    if (onTopicSelect) {
      onTopicSelect(node)
    }
  }, [onTopicSelect])

  const handleSuggestionClick = useCallback((suggestion) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion)
    }
  }, [onSuggestionClick])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header - can be hidden when parent provides its own */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌳</span>
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
              Knowledge Map
            </h2>
          </div>
          {stats && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {stats.exploredCount} topics
            </div>
          )}
        </div>
      )}

      {/* Graph area */}
      <div className="flex-1 min-h-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50">
        <GraphCanvas
          nodes={graph.nodes}
          edges={graph.edges}
          onNodeClick={handleNodeClick}
          onNodeHover={setHoveredNode}
          selectedNodeId={selectedNode?.id}
        />
      </div>

      {/* Hovered node tooltip */}
      {hoveredNode && !selectedNode && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: hoveredNode.color || '#6b7280' }}
            />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {hoveredNode.label}
            </span>
            {hoveredNode.category && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {hoveredNode.category}
              </span>
            )}
          </div>
          {hoveredNode.suggested && !hoveredNode.explored && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Click to explore this topic
            </p>
          )}
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🌱</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                Suggested
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="
                    px-3 py-1.5 text-xs rounded-full
                    bg-gradient-to-r from-slate-100 to-slate-50
                    dark:from-slate-700 dark:to-slate-600
                    text-gray-700 dark:text-gray-200
                    border border-slate-200 dark:border-slate-600
                    hover:border-primary hover:text-primary
                    dark:hover:border-primary-dark dark:hover:text-primary-dark
                    transition-all duration-200
                    hover:shadow-sm
                  "
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {showStats && userStats && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
          <div className="flex items-center justify-between text-xs">
            {/* Streak */}
            <div className="flex items-center gap-1.5">
              <span className="text-orange-500">🔥</span>
              <span className="font-bold text-gray-800 dark:text-white">
                {userStats.streakCount || 0}
              </span>
              <span className="text-gray-500 dark:text-gray-400">days</span>
            </div>

            {/* Level */}
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-500">⭐</span>
              <span className="font-bold text-gray-800 dark:text-white">
                Lv{userStats.level || 1}
              </span>
            </div>

            {/* XP */}
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-500">💎</span>
              <span className="font-bold text-gray-800 dark:text-white">
                {userStats.xp || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend - can be hidden when not needed */}
      {showLegend && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>Explored</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border-2 border-dashed border-gray-400" />
              <span>Suggested</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Re-export utilities and hooks
export { generateGraphFromTopics, generateSuggestions } from './generateLocalGraph'
export { default as GraphCanvas } from './GraphCanvas'
export { useKnowledgeGraph } from './useKnowledgeGraph'

// Export new graph components
export { default as ClusteredForceGraph } from './ClusteredForceGraph'
export { default as GraphOverlayModal } from './GraphOverlayModal'
export { default as FollowUpTreePanel } from './FollowUpTreePanel'
export { default as useGraphClassification } from './useGraphClassification'
