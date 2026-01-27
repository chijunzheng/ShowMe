/**
 * GraphOverlayModal Component
 * Fullscreen knowledge map with LLM-detected connections
 * Split layout: Graph (60%) + Follow-up Tree Panel (40%)
 */

import { useEffect, useCallback, useState, useMemo } from 'react'
import ClusteredForceGraph from './ClusteredForceGraph'
import FollowUpTreePanel from './FollowUpTreePanel'
import useGraphClassification from './useGraphClassification'

export default function GraphOverlayModal({
  isOpen,
  onClose,
  topics = [],
  activeTopicId,
  onTopicClick,
  onSuggestionClick,
  onSlideNavigate,
  userStats = {},
  clientId,
}) {
  const [selectedTopicId, setSelectedTopicId] = useState(null)
  const [showPanel, setShowPanel] = useState(true)

  // LLM-based edge classification
  const {
    edges,
    isClassifying,
    classifyAllTopics,
  } = useGraphClassification()

  // Trigger classification when modal opens with topics
  useEffect(() => {
    if (isOpen && topics.length > 0 && clientId && edges.length === 0) {
      const topicsForClassification = topics.map(t => ({
        id: t.id,
        name: t.name,
      }))
      classifyAllTopics(topicsForClassification, clientId)
    }
  }, [isOpen, topics, clientId, edges.length, classifyAllTopics])

  // Reset selected topic when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTopicId(null)
    }
  }, [isOpen])

  // Set selected topic when activeTopicId changes
  useEffect(() => {
    if (activeTopicId) {
      setSelectedTopicId(activeTopicId)
    }
  }, [activeTopicId])

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Get selected topic object
  const selectedTopic = useMemo(() => {
    return topics.find(t => t.id === selectedTopicId) || null
  }, [topics, selectedTopicId])

  const handleTopicClick = useCallback((topic) => {
    setSelectedTopicId(topic.id)
  }, [])

  const handleTopicDoubleClick = useCallback((topic) => {
    onTopicClick?.(topic)
    onClose()
  }, [onTopicClick, onClose])

  const handleSuggestionClick = useCallback((suggestion) => {
    onSuggestionClick?.(suggestion)
    onClose()
  }, [onSuggestionClick, onClose])

  const handleSlideClick = useCallback((slide) => {
    if (selectedTopic) {
      onSlideNavigate?.(selectedTopic.id, slide.id)
      onClose()
    }
  }, [selectedTopic, onSlideNavigate, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" />

      {/* Modal content */}
      <div
        className="relative w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - minimal, floating */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/20">
              <span className="text-lg">🗺️</span>
            </div>
            <div>
              <h2 className="font-semibold text-slate-100 text-lg tracking-tight">
                Knowledge Map
              </h2>
              <p className="text-xs text-slate-500">
                {topics.length} topics • {edges.length} connections
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Toggle panel button */}
            <button
              onClick={() => setShowPanel(!showPanel)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium
                transition-all duration-200
                ${showPanel
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600/50'
                }
              `}
            >
              {showPanel ? 'Hide Panel' : 'Show Panel'}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="
                w-10 h-10 rounded-xl
                flex items-center justify-center
                bg-slate-800/50 hover:bg-slate-700/50
                border border-slate-700/50 hover:border-slate-600/50
                text-slate-400 hover:text-slate-200
                transition-all duration-200
              "
              title="Close (Esc)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main content - split layout */}
        <div className="flex-1 pt-20 pb-12 flex">
          {/* Graph area */}
          <div className={`flex-1 transition-all duration-300 ${showPanel ? 'pr-0' : ''}`}>
            <ClusteredForceGraph
              topics={topics}
              edges={edges}
              activeTopicId={selectedTopicId}
              onTopicClick={handleTopicClick}
              onSuggestionClick={handleSuggestionClick}
              isClassifying={isClassifying}
              className="w-full h-full"
            />
          </div>

          {/* Follow-up panel */}
          {showPanel && (
            <div className="w-80 flex-shrink-0 border-l border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
              <FollowUpTreePanel
                topic={selectedTopic}
                onSlideClick={handleSlideClick}
                activeSlideId={null}
                className="h-full"
              />
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center py-3">
          <p className="text-xs text-slate-600">
            Click topic to select • Double-click to navigate • Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
