/**
 * ProgressTab Component
 *
 * Constellation-first progress view. Shows a compact stats header
 * and full-screen interactive knowledge constellation.
 * Tap stars to open TopicActionSheet with practice modes.
 */

import { useState, useCallback, useMemo } from 'react'
import { StatsBar, StatDetailSheet } from '../Dashboard'
import { getExplorerRank } from '../ExplorerRank/explorerRankUtils'
import { Constellation } from '../Constellation'
import useKnowledgeGraph from '../../hooks/useKnowledgeGraph'
import TopicActionSheet from './TopicActionSheet'

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
 * @param {number} props.totalXP - Total XP earned
 * @param {number|Object} props.streak - Streak count or streak object
 * @param {Array} props.trophies - Earned badge/trophy list
 * @param {Function} props.onSelectSuggestedTopic - Callback when suggested topic selected
 */
export default function ProgressTab({
  topics = [],
  onReviewSlideshow,
  onLaunchMode,
  totalXP = 0,
  streak = 0,
  trophies = [],
  onSelectSuggestedTopic,
  // Graph props passed from parent (preferred) - uses internal hook as fallback
  graphNodes: graphNodesProp,
  graphEdges: graphEdgesProp,
  graphClusters: graphClustersProp,
  graphGaps: graphGapsProp,
  graphIsLoading: graphIsLoadingProp,
}) {
  // State for action sheet
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false)
  const [activeStatSheet, setActiveStatSheet] = useState(null)

  // Knowledge graph state - use props if provided, otherwise use internal hook
  const internalGraph = useKnowledgeGraph()

  // Prefer props passed from App.jsx, fallback to internal hook values
  const nodes = graphNodesProp ?? internalGraph.nodes
  const edges = graphEdgesProp ?? internalGraph.edges
  const clusters = graphClustersProp ?? internalGraph.clusters
  const gaps = graphGapsProp ?? internalGraph.gaps

  const topicList = useMemo(() => (Array.isArray(topics) ? topics : []), [topics])
  const trophyList = useMemo(() => (Array.isArray(trophies) ? trophies : []), [trophies])

  const rankInfo = useMemo(() => getExplorerRank(topicList.length, totalXP), [topicList.length, totalXP])

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

  // Calculate earned trophy count
  const earnedTrophyCount = trophyList.filter(t => !t.locked).length

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] md:h-[calc(100dvh-2rem)]">
      {/* Compact stats header */}
      <div className="flex-shrink-0 px-4 pt-4">
        <StatsBar
          streak={streakValue}
          totalXP={totalXP}
          topicsLearned={topicList.length}
          trophyCount={earnedTrophyCount}
          compact={true}
          onStatTap={setActiveStatSheet}
          rankIcon={rankInfo?.icon}
        />
      </div>

      {/* Full-screen constellation */}
      <div className="flex-1 min-h-0 mx-4 mb-4 mt-3 rounded-xl border-2 border-black dark:border-slate-600 shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569] overflow-hidden relative">
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
      </div>

      {/* Topic Action Sheet (modal overlay) */}
      <TopicActionSheet
        topic={selectedTopic}
        isOpen={isActionSheetOpen}
        onClose={handleCloseActionSheet}
        onReviewSlideshow={handleReviewFromSheet}
        onLaunchMode={handleLaunchFromSheet}
        onSelectRelatedTopic={handleSelectRelatedTopic}
      />

      {/* Stat Detail Sheet */}
      {activeStatSheet && (
        <StatDetailSheet
          statType={activeStatSheet}
          onClose={() => setActiveStatSheet(null)}
          streak={streak}
          totalXP={totalXP}
          topicList={topicList}
          trophyList={trophyList}
          graphNodes={nodes}
        />
      )}
    </div>
  )
}
