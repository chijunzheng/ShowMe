/**
 * ProgressTab Component
 *
 * Constellation-first progress view. Shows a compact stats header
 * and full-screen interactive knowledge constellation.
 * Tap stars to open TopicActionSheet with practice modes.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { StatsBar, StatDetailSheet } from '../Dashboard'
import { getExplorerRank } from '../ExplorerRank/explorerRankUtils'
import { Constellation } from '../Constellation'
import useKnowledgeGraph from '../../hooks/useKnowledgeGraph'
import TopicActionSheet from './TopicActionSheet'
import SuggestedTopicSheet from './SuggestedTopicSheet'
import useStoryStorage from '../../hooks/useStoryStorage'

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
 * @param {Function} props.onDiscoverSuggestions - Callback when discover is triggered
 * @param {string} props.selectedLevel - Selected explanation level
 * @param {Function} props.setSelectedLevel - Setter for explanation level
 */
export default function ProgressTab({
  topics = [],
  onReviewSlideshow,
  onLaunchMode,
  totalXP = 0,
  streak = 0,
  trophies = [],
  onSelectSuggestedTopic,
  onDiscoverSuggestions,
  selectedLevel,
  setSelectedLevel,
  // Graph props passed from parent (preferred) - uses internal hook as fallback
  graphNodes: graphNodesProp,
  graphEdges: graphEdgesProp,
  graphClusters: graphClustersProp,
  graphGaps: graphGapsProp,
  graphIsLoading: graphIsLoadingProp,
  highlightTopicName = null,
}) {
  // State for action sheet
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false)
  const [selectedGap, setSelectedGap] = useState(null)
  const [isSuggestedSheetOpen, setIsSuggestedSheetOpen] = useState(false)
  const [activeStatSheet, setActiveStatSheet] = useState(null)
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [hasDiscoveredThisSession, setHasDiscoveredThisSession] = useState(false)
  const [discoverMessage, setDiscoverMessage] = useState('')

  // Knowledge graph state - use props if provided, otherwise use internal hook
  const internalGraph = useKnowledgeGraph()
  const { stories: savedStories, deleteStory: deleteStoredStory, loadStoryContent } = useStoryStorage()

  // Prefer props passed from App.jsx, fallback to internal hook values
  const nodes = graphNodesProp ?? internalGraph.nodes
  const edges = graphEdgesProp ?? internalGraph.edges
  const clusters = graphClustersProp ?? internalGraph.clusters
  const rawGaps = graphGapsProp ?? internalGraph.gaps
  const gaps = hasDiscoveredThisSession ? rawGaps : []
  const refreshGaps = onDiscoverSuggestions ?? internalGraph.refreshGaps

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
    if (!gap?.suggestedTopic) return
    setSelectedGap(gap)
    setIsSuggestedSheetOpen(true)
  }, [])

  const handleCloseSuggestedSheet = useCallback(() => {
    setIsSuggestedSheetOpen(false)
    setSelectedGap(null)
  }, [])

  const handleStartSuggestedTopic = useCallback((gap, level) => {
    if (!gap?.suggestedTopic) return
    handleCloseSuggestedSheet()
    onSelectSuggestedTopic?.(gap.suggestedTopic, {
      source: 'progress_suggestion',
      explanationLevel: level,
      gap,
    })
  }, [handleCloseSuggestedSheet, onSelectSuggestedTopic])

  const handleDiscover = useCallback(async () => {
    if (isDiscovering || !refreshGaps || topicList.length === 0) return

    setIsDiscovering(true)
    setDiscoverMessage('')
    try {
      const refreshedGaps = await refreshGaps({
        targetCount: 5,
        requireFreshSet: true,
      })
      setHasDiscoveredThisSession(true)
      if (!refreshedGaps || refreshedGaps.length === 0) {
        setDiscoverMessage('No suggestions yet. Try again after learning more.')
      }
    } catch (err) {
      // Silently fail - discover is non-critical
    } finally {
      setIsDiscovering(false)
    }
  }, [isDiscovering, refreshGaps, topicList.length])

  useEffect(() => {
    if (!discoverMessage) return
    const timer = setTimeout(() => setDiscoverMessage(''), 3500)
    return () => clearTimeout(timer)
  }, [discoverMessage])

  // Extract streak value
  const streakValue = typeof streak === 'number' ? streak : streak?.current || 0

  // Calculate earned trophy count
  const earnedTrophyCount = trophyList.filter(t => !t.locked).length

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] md:h-[calc(100dvh-5rem)]">
      {/* Compact stats header */}
      <div className="flex-shrink-0 px-4 pt-4">
        <StatsBar
          streak={streakValue}
          totalXP={totalXP}
          topicsLearned={topicList.length}
          trophyCount={earnedTrophyCount}
          storyCount={savedStories.length}
          compact={true}
          onStatTap={setActiveStatSheet}
          rankIcon={rankInfo?.icon}
        />
      </div>

      {/* Full-screen constellation */}
      <div className="flex-1 min-h-0 mx-4 mb-4 mt-3 rounded-xl border-2 border-black dark:border-slate-600 shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569] bg-night-900 overflow-hidden relative">
        <Constellation
          nodes={nodes}
          edges={edges}
          clusters={clusters}
          gaps={gaps}
          onNodeTap={handleNodeTap}
          onEdgeTap={handleEdgeTap}
          onGapTap={handleGapTap}
          onDiscover={handleDiscover}
          isDiscovering={isDiscovering}
          highlightTopicName={highlightTopicName}
          className="w-full h-full"
        >
          {/* Render inside Constellation so they're visible in native fullscreen */}
          <TopicActionSheet
            topic={selectedTopic}
            isOpen={isActionSheetOpen}
            onClose={handleCloseActionSheet}
            onReviewSlideshow={handleReviewFromSheet}
            onLaunchMode={handleLaunchFromSheet}
            onSelectRelatedTopic={handleSelectRelatedTopic}
          />
          <SuggestedTopicSheet
            gap={selectedGap}
            isOpen={isSuggestedSheetOpen}
            onClose={handleCloseSuggestedSheet}
            onStart={handleStartSuggestedTopic}
            nodes={nodes}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
          />
        </Constellation>
        {discoverMessage && (
          <div className="absolute bottom-20 left-6 z-20 rounded-lg bg-slate-900/90 px-3 py-2 text-xs text-white shadow-lg">
            {discoverMessage}
          </div>
        )}
      </div>

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
          stories={savedStories}
          onDeleteStory={deleteStoredStory}
          onLoadStoryContent={loadStoryContent}
        />
      )}
    </div>
  )
}
