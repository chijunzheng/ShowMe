/**
 * ProgressTab Component
 *
 * Main container for the Progress tab that consolidates World and Tree views.
 * Integrates: StatsBar, Constellation, DueForReview, QuickPractice, TopicsByZone.
 *
 * The Knowledge Constellation replaces MiniWorldPreview as the primary
 * visualization, showing topics as stars connected by relationship edges.
 */

import { useState, useCallback, useMemo } from 'react'
import { StatsBar } from '../Dashboard'
import { Constellation } from '../Constellation'
import { ExplorerRankBadge } from '../ExplorerRank'
import useKnowledgeGraph from '../../hooks/useKnowledgeGraph'
import DueForReview from './DueForReview'
import QuickPractice from './QuickPractice'
import TopicsByZone from './TopicsByZone'
import TopicActionSheet from './TopicActionSheet'

// ============================================================================
// CONSTELLATION PREVIEW COMPONENT
// ============================================================================

/**
 * ConstellationPreview - Mini constellation view for Progress Tab header
 *
 * Shows a compact preview of the knowledge graph with expand-to-fullscreen
 * capability. Displays explorer rank badge and topic count.
 *
 * @param {Object} props
 * @param {Array} props.nodes - Knowledge nodes (topics as stars)
 * @param {Array} props.edges - Relationship edges between topics
 * @param {Array} props.clusters - Topic clusters
 * @param {Array} props.gaps - Knowledge gaps (suggested topics)
 * @param {Object} props.explorerRank - Current explorer rank info
 * @param {boolean} props.isLoading - Whether graph is still loading
 * @param {Function} props.onExpand - Callback when expand button is clicked
 * @param {Function} props.onNodeTap - Callback when a star is tapped
 */
function ConstellationPreview({
  nodes = [],
  edges = [],
  clusters: _clusters = [],
  gaps: _gaps = [],
  explorerRank,
  isLoading = false,
  onExpand,
  onNodeTap: _onNodeTap,
}) {
  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onExpand?.()
    }
  }, [onExpand])

  // Empty state - no topics learned yet
  if (!isLoading && nodes.length === 0) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50">
        <div
          className="
            w-[120px] h-[68px] flex-shrink-0
            rounded-xl
            bg-gradient-to-br from-indigo-900/50 to-slate-900
            flex items-center justify-center
          "
        >
          <span className="text-3xl" aria-hidden="true">*</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Your Constellation
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Learn topics to see stars appear!
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse">
        <div className="w-[120px] h-[68px] flex-shrink-0 rounded-xl bg-slate-300 dark:bg-slate-700" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-24 rounded bg-slate-300 dark:bg-slate-700" />
          <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-600" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="
        flex items-center gap-4 p-4
        rounded-2xl
        bg-gradient-to-r from-indigo-50 to-violet-50
        dark:from-indigo-900/20 dark:to-violet-900/20
        border border-indigo-100 dark:border-indigo-800/30
        cursor-pointer
        hover:shadow-md hover:scale-[1.01]
        active:scale-[0.99]
        transition-all duration-200
        group
      "
      onClick={onExpand}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Your constellation with ${nodes.length} stars. Tap to explore.`}
    >
      {/* Mini constellation preview */}
      <div
        className="
          relative w-[120px] h-[68px] flex-shrink-0
          rounded-xl overflow-hidden shadow-md
          bg-slate-950
        "
      >
        {/* Mini SVG representation of the constellation */}
        <svg
          className="w-full h-full"
          viewBox="0 0 120 68"
          aria-hidden="true"
        >
          {/* Draw mini edges */}
          {edges.slice(0, 10).map((edge, idx) => {
            // Create pseudo-random positions based on index for preview
            const fromX = 20 + (idx * 17) % 80
            const fromY = 15 + (idx * 13) % 40
            const toX = 30 + ((idx + 3) * 19) % 70
            const toY = 20 + ((idx + 5) * 11) % 35
            return (
              <line
                key={edge.id || idx}
                x1={fromX}
                y1={fromY}
                x2={toX}
                y2={toY}
                stroke="rgba(99, 102, 241, 0.3)"
                strokeWidth="1"
              />
            )
          })}

          {/* Draw mini stars */}
          {nodes.slice(0, 8).map((node, idx) => {
            // Distribute stars across the mini preview
            const x = 15 + (idx * 14) % 95
            const y = 12 + (idx * 11) % 48
            const brightness = node.brightness || 'dim'
            const opacity = brightness === 'brilliant' ? 1
              : brightness === 'bright' ? 0.8
              : brightness === 'glow' ? 0.6
              : 0.4
            return (
              <circle
                key={node.id}
                cx={x}
                cy={y}
                r={brightness === 'brilliant' ? 4 : brightness === 'bright' ? 3 : 2}
                fill={`rgba(199, 210, 254, ${opacity})`}
                className="transition-all duration-300"
              />
            )
          })}
        </svg>

        {/* Hover overlay */}
        <div
          className="
            absolute inset-0
            bg-black/0 group-hover:bg-black/20
            flex items-center justify-center
            transition-colors duration-200
          "
        >
          <span
            className="
              text-white text-xl opacity-0 group-hover:opacity-100
              transform scale-75 group-hover:scale-100
              transition-all duration-200
            "
            aria-hidden="true"
          >
            *
          </span>
        </div>
      </div>

      {/* Info section */}
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
          Your Constellation
        </h3>

        {/* Explorer rank badge (compact) */}
        {explorerRank && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-base" aria-hidden="true">{explorerRank.icon}</span>
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {explorerRank.title}
            </span>
          </div>
        )}

        {/* Stats */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {nodes.length} {nodes.length === 1 ? 'star' : 'stars'}
          {edges.length > 0 && ` | ${edges.length} ${edges.length === 1 ? 'connection' : 'connections'}`}
        </p>
      </div>

      {/* Explore button */}
      <div
        className="
          px-3 py-1.5
          rounded-full
          bg-indigo-500 text-white
          text-xs font-semibold
          group-hover:bg-indigo-600
          transition-colors
        "
      >
        Explore
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PROGRESS TAB COMPONENT
// ============================================================================

/**
 * ProgressTab - Consolidated progress view
 *
 * @param {Object} props
 * @param {Array} props.topics - Learned topics for Progress lists (canonical)
 * @param {Function} props.onReviewSlideshow - Callback for reviewing a slideshow
 * @param {Function} props.onLaunchMode - Callback (topicName, mode, topicData)
 * @param {Function} props.onQuickQuiz - Callback for quick quiz
 * @param {Function} props.onLearnTopic - Callback for learning a new topic
 * @param {Function} props.onAskQuestion - Callback to start asking a question
 * @param {number} props.totalXP - Total XP earned
 * @param {number|Object} props.streak - Streak count or streak object
 * @param {string} props.tier - World tier
 * @param {string} props.treeLevel - Tree level
 * @param {Array} props.suggestions - AI-suggested topics
 * @param {Function} props.onRefreshSuggestions - Callback to refresh suggestions
 * @param {Function} props.onSelectSuggestedTopic - Callback when suggested topic selected
 */
export default function ProgressTab({
  topics = [],
  onReviewSlideshow,
  onLaunchMode,
  onQuickQuiz,
  onLearnTopic: _onLearnTopic,
  onAskQuestion,
  totalXP = 0,
  streak = 0,
  tier = 'barren',
  treeLevel = 'seed',
  suggestions = [],
  onRefreshSuggestions,
  onSelectSuggestedTopic,
  // Graph props passed from parent (preferred) - uses internal hook as fallback
  graph: graphProp,
  graphNodes: graphNodesProp,
  graphEdges: graphEdgesProp,
  graphClusters: graphClustersProp,
  graphGaps: graphGapsProp,
  graphIsLoading: graphIsLoadingProp,
  explorerRank: explorerRankProp,
}) {
  // State for action sheet
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false)

  // State for constellation expansion
  const [isConstellationExpanded, setIsConstellationExpanded] = useState(false)

  // Knowledge graph state - use props if provided, otherwise use internal hook
  const internalGraph = useKnowledgeGraph()

  // Prefer props passed from App.jsx, fallback to internal hook values
  const nodes = graphNodesProp ?? internalGraph.nodes
  const edges = graphEdgesProp ?? internalGraph.edges
  const clusters = graphClustersProp ?? internalGraph.clusters
  const gaps = graphGapsProp ?? internalGraph.gaps
  const explorerRank = explorerRankProp ?? internalGraph.explorerRank
  const isGraphLoading = graphIsLoadingProp ?? internalGraph.isLoading

  const topicList = useMemo(() => (Array.isArray(topics) ? topics : []), [topics])

  // Handle topic selection (opens action sheet)
  const handleTopicSelect = useCallback((topic) => {
    setSelectedTopic(topic)
    setIsActionSheetOpen(true)
  }, [])

  // Handle action sheet close
  const handleCloseActionSheet = useCallback(() => {
    setIsActionSheetOpen(false)
    setSelectedTopic(null)
  }, [])

  // Handle review from action sheet
  const handleReviewFromSheet = useCallback((topicName) => {
    handleCloseActionSheet()
    onReviewSlideshow?.(topicName)
  }, [onReviewSlideshow, handleCloseActionSheet])

  // Handle mode launch from action sheet
  const handleLaunchFromSheet = useCallback((topicName, mode, topicData) => {
    handleCloseActionSheet()
    onLaunchMode?.(topicName, mode, topicData)
  }, [onLaunchMode, handleCloseActionSheet])

  // Handle quick quiz from action sheet
  const handleQuizFromSheet = useCallback((topicName) => {
    handleCloseActionSheet()
    onQuickQuiz?.(topicName)
  }, [onQuickQuiz, handleCloseActionSheet])

  // Handle related topic selection
  const handleSelectRelatedTopic = useCallback((relatedTopicName) => {
    const normalized = String(relatedTopicName || '').trim().toLowerCase()
    if (!normalized) return

    const relatedTopic = topicList.find((t) =>
      String(t?.topicName || '').trim().toLowerCase() === normalized
    )

    if (relatedTopic) {
      handleTopicSelect(relatedTopic)
      return
    }

    // Topic not learned yet - offer to learn it
    onSelectSuggestedTopic?.(relatedTopicName)
  }, [topicList, handleTopicSelect, onSelectSuggestedTopic])

  // Handle constellation expand
  const handleConstellationExpand = useCallback(() => {
    setIsConstellationExpanded(true)
  }, [])

  // Handle constellation collapse
  const handleConstellationCollapse = useCallback(() => {
    setIsConstellationExpanded(false)
  }, [])

  /**
   * Handle constellation node tap
   * Maps the graph node to the corresponding topic for action sheet
   */
  const handleNodeTap = useCallback((node) => {
    if (!node?.name) return

    // Find corresponding topic in topicList
    const topic = topicList.find((t) =>
      String(t?.topicName || '').trim().toLowerCase() === node.name.toLowerCase()
    )

    if (topic) {
      handleTopicSelect(topic)
    }
  }, [topicList, handleTopicSelect])

  /**
   * Handle constellation edge tap
   * Shows relationship details between two topics
   */
  const handleEdgeTap = useCallback((edge) => {
    // Find the "from" node to open in action sheet
    const fromNode = nodes.find((n) => n.id === edge.from)
    if (fromNode) {
      handleNodeTap(fromNode)
    }
  }, [nodes, handleNodeTap])

  /**
   * Handle constellation gap tap
   * Suggests learning a new topic that fills a knowledge gap
   */
  const handleGapTap = useCallback((gap) => {
    if (gap?.suggestedTopic) {
      onSelectSuggestedTopic?.(gap.suggestedTopic)
    }
  }, [onSelectSuggestedTopic])

  // Extract streak value
  const streakValue = typeof streak === 'number' ? streak : streak?.current || 0

  // Fullscreen constellation view
  if (isConstellationExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950">
        {/* Header with back button and explorer rank */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-slate-950/80 to-transparent">
          <button
            onClick={handleConstellationCollapse}
            className="
              flex items-center gap-2 px-3 py-2
              rounded-full bg-slate-800/90
              text-slate-200
              text-sm font-semibold
              shadow-lg backdrop-blur
              hover:bg-slate-700
              transition-colors
            "
          >
            <span aria-hidden="true">&#8592;</span>
            <span>Back</span>
          </button>

          {/* Explorer rank badge */}
          {explorerRank && (
            <ExplorerRankBadge
              level={explorerRank.level}
              title={explorerRank.title}
              icon={explorerRank.icon}
              size="standard"
            />
          )}
        </div>

        {/* Fullscreen Constellation */}
        <Constellation
          nodes={nodes}
          edges={edges}
          clusters={clusters}
          gaps={gaps}
          onNodeTap={handleNodeTap}
          onEdgeTap={handleEdgeTap}
          onGapTap={handleGapTap}
          className="w-full h-full"
        />

        {/* Topic Action Sheet (also available in fullscreen) */}
        <TopicActionSheet
          topic={selectedTopic}
          isOpen={isActionSheetOpen}
          onClose={handleCloseActionSheet}
          onReviewSlideshow={handleReviewFromSheet}
          onLaunchMode={handleLaunchFromSheet}
          onQuickQuiz={handleQuizFromSheet}
          onSelectRelatedTopic={handleSelectRelatedTopic}
        />
      </div>
    )
  }

  return (
    <div className="pb-24 px-4 space-y-6">
      {/* Stats Bar */}
      <StatsBar
        streak={streakValue}
        totalXP={totalXP}
        topicsLearned={topicList.length}
        treeLevel={treeLevel}
        tier={tier}
        compact
      />

      {/* Knowledge Constellation Preview */}
      <ConstellationPreview
        nodes={nodes}
        edges={edges}
        clusters={clusters}
        gaps={gaps}
        explorerRank={explorerRank}
        isLoading={isGraphLoading}
        onExpand={handleConstellationExpand}
        onNodeTap={handleNodeTap}
      />

      {/* Due for Review */}
      <DueForReview
        topics={topicList}
        onTopicSelect={handleTopicSelect}
      />

      {/* Quick Practice */}
      <QuickPractice
        topics={topicList}
        onLaunchMode={onLaunchMode}
        onTopicSelect={handleTopicSelect}
        onAskQuestion={onAskQuestion}
      />

      {/* Topics by Zone */}
      <TopicsByZone
        topics={topicList}
        onTopicSelect={handleTopicSelect}
      />

      {/* Recommended Next */}
      {suggestions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Recommended Next
            </h2>
            {onRefreshSuggestions && (
              <button
                onClick={onRefreshSuggestions}
                className="
                  text-sm text-primary font-medium
                  hover:text-primary/80
                  cursor-pointer
                "
              >
                Refresh
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Build on your knowledge:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 5).map((suggestion, index) => (
              <button
                key={`${suggestion.topic}-${index}`}
                onClick={() => onSelectSuggestedTopic?.(suggestion.topic)}
                className="
                  px-4 py-2
                  bg-indigo-100 dark:bg-indigo-900/30
                  hover:bg-indigo-200 dark:hover:bg-indigo-900/50
                  text-indigo-800 dark:text-indigo-200
                  rounded-xl
                  text-sm font-medium
                  cursor-pointer
                  transition-colors duration-150
                "
              >
                {suggestion.topic}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Topic Action Sheet */}
      <TopicActionSheet
        topic={selectedTopic}
        isOpen={isActionSheetOpen}
        onClose={handleCloseActionSheet}
        onReviewSlideshow={handleReviewFromSheet}
        onLaunchMode={handleLaunchFromSheet}
        onQuickQuiz={handleQuizFromSheet}
        onSelectRelatedTopic={handleSelectRelatedTopic}
      />
    </div>
  )
}
