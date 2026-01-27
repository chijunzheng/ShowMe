/**
 * FollowUpTreePanel Component
 * Collapsible tree view of topic follow-up questions
 * Converts flat slides array to nested tree structure
 */

import { useState, useMemo, useCallback } from 'react'
import { getCategoryIcon, getNodeConfig } from './TopicNode'

/**
 * Build tree structure from flat slides array
 * @param {Array} slides - Flat array with parentId references
 * @returns {Array} Tree of slides
 */
function buildSlideTree(slides) {
  if (!slides || slides.length === 0) return []

  // Filter out header slides and group by parentId
  const contentSlides = slides.filter(s => s.type !== 'header')
  const childrenMap = {}

  contentSlides.forEach(slide => {
    const parentId = slide.parentId || '__root__'
    if (!childrenMap[parentId]) {
      childrenMap[parentId] = []
    }
    childrenMap[parentId].push(slide)
  })

  // Recursive tree builder
  function buildNode(slide) {
    const children = childrenMap[slide.id] || []
    return {
      ...slide,
      children: children.map(buildNode),
    }
  }

  // Get root slides (no parentId)
  const roots = childrenMap['__root__'] || []
  return roots.map(buildNode)
}

/**
 * Count total descendants in a tree node
 */
function countDescendants(node) {
  if (!node.children || node.children.length === 0) return 0
  return node.children.length + node.children.reduce((sum, child) => sum + countDescendants(child), 0)
}

/**
 * Single tree node component
 */
function TreeNode({
  node,
  depth = 0,
  onSlideClick,
  activeSlideId,
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 2) // Auto-expand first 2 levels
  const hasChildren = node.children && node.children.length > 0
  const descendantCount = countDescendants(node)
  const isActive = node.id === activeSlideId

  // Extract question text from subtitle or title
  const displayText = node.subtitle || node.title || 'Untitled slide'
  const truncatedText = displayText.length > 50
    ? displayText.slice(0, 47) + '...'
    : displayText

  return (
    <div className="tree-node">
      {/* Node row */}
      <div
        className={`
          flex items-center gap-2 py-1.5 px-2 rounded-lg
          cursor-pointer
          transition-all duration-150
          ${isActive
            ? 'bg-indigo-500/20 border border-indigo-500/30'
            : 'hover:bg-slate-700/50 border border-transparent'
          }
        `}
        style={{ marginLeft: depth * 16 }}
        onClick={() => onSlideClick?.(node)}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-4 h-4 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          </span>
        )}

        {/* Slide indicator */}
        <span className={`text-xs ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}>
          {node.type === 'section' ? '📍' : '📄'}
        </span>

        {/* Text */}
        <span className={`
          flex-1 text-xs truncate
          ${isActive ? 'text-slate-200 font-medium' : 'text-slate-400'}
        `}>
          {truncatedText}
        </span>

        {/* Child count badge */}
        {hasChildren && (
          <span className="text-[10px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
            {descendantCount}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSlideClick={onSlideClick}
              activeSlideId={activeSlideId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Main panel component
 */
export default function FollowUpTreePanel({
  topic,
  onSlideClick,
  activeSlideId,
  onClose,
  className = '',
}) {
  // Build tree from topic slides
  const slideTree = useMemo(() => {
    if (!topic?.slides) return []
    return buildSlideTree(topic.slides)
  }, [topic?.slides])

  const totalSlides = topic?.slides?.filter(s => s.type !== 'header').length || 0
  const config = getNodeConfig(topic?.category)

  if (!topic) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-slate-500 px-6">
          <div className="text-3xl mb-3 opacity-50">👆</div>
          <p className="text-sm font-medium">Select a topic</p>
          <p className="text-xs text-slate-600 mt-1">Click on a node to see its follow-ups</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: `${config.color}20` }}
            >
              {topic.icon || getCategoryIcon(topic.category)}
            </span>
            <div>
              <h3 className="font-medium text-slate-200 text-sm truncate max-w-[180px]">
                {topic.name}
              </h3>
              <p className="text-[10px] text-slate-500">
                {totalSlides} slide{totalSlides !== 1 ? 's' : ''} explored
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {slideTree.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-xs">No follow-up questions yet</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {slideTree.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                onSlideClick={onSlideClick}
                activeSlideId={activeSlideId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-slate-700/30">
        <p className="text-[10px] text-slate-600 text-center">
          Click a slide to navigate
        </p>
      </div>
    </div>
  )
}
