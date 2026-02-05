/**
 * ProgressTab Component
 *
 * Constellation-first progress view. Shows a compact stats header
 * and full-screen interactive knowledge constellation.
 * Tap stars to open TopicActionSheet with practice modes.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { StatsBar, TrophyShowcase } from '../Dashboard'
import { ExplorerRankBadge } from '../ExplorerRank'
import { EXPLORER_RANKS, getExplorerRank, getRankProgress } from '../ExplorerRank/explorerRankUtils'
import { Constellation } from '../Constellation'
import useKnowledgeGraph from '../../hooks/useKnowledgeGraph'
import TopicActionSheet from './TopicActionSheet'

const BADGE_ICON_MAP = {
  'question-mark': '❓',
  fire: '🔥',
  'flame-small': '🔥',
  'flame-medium': '🔥',
  'flame-large': '🔥',
  compass: '🧭',
  star: '⭐',
  trophy: '🏆',
  book: '📖',
  lightbulb: '💡',
  brain: '🧠',
  'thought-bubble': '💭',
  rocket: '🚀',
  medal: '🏅',
}

function getBadgeIcon(iconKey) {
  return BADGE_ICON_MAP[iconKey] || '🏆'
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
 * @param {number} props.totalXP - Total XP earned
 * @param {number|Object} props.streak - Streak count or streak object
 * @param {Array} props.trophies - Earned badge/trophy list
 * @param {boolean} props.trophiesLoading - Whether trophies are loading
 * @param {Function} props.onSelectSuggestedTopic - Callback when suggested topic selected
 */
export default function ProgressTab({
  topics = [],
  onReviewSlideshow,
  onLaunchMode,
  totalXP = 0,
  streak = 0,
  trophies = [],
  trophiesLoading = false,
  onSelectSuggestedTopic,
  // Graph props passed from parent (preferred) - uses internal hook as fallback
  graphNodes: graphNodesProp,
  graphEdges: graphEdgesProp,
  graphClusters: graphClustersProp,
  graphGaps: graphGapsProp,
  graphIsLoading: graphIsLoadingProp,
}) {
  const SEEN_BADGES_KEY = 'showme_seen_badges'

  // State for action sheet
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [isBadgeSheetOpen, setIsBadgeSheetOpen] = useState(false)
  const [seenBadgeIds, setSeenBadgeIds] = useState(() => {
    try {
      const stored = localStorage.getItem(SEEN_BADGES_KEY)
      const parsed = stored ? JSON.parse(stored) : []
      return new Set(Array.isArray(parsed) ? parsed : [])
    } catch {
      return new Set()
    }
  })

  // Knowledge graph state - use props if provided, otherwise use internal hook
  const internalGraph = useKnowledgeGraph()

  // Prefer props passed from App.jsx, fallback to internal hook values
  const nodes = graphNodesProp ?? internalGraph.nodes
  const edges = graphEdgesProp ?? internalGraph.edges
  const clusters = graphClustersProp ?? internalGraph.clusters
  const gaps = graphGapsProp ?? internalGraph.gaps

  const topicList = useMemo(() => (Array.isArray(topics) ? topics : []), [topics])
  const trophyList = useMemo(() => (Array.isArray(trophies) ? trophies : []), [trophies])
  const showTrophies = trophiesLoading || trophyList.length > 0

  const rankInfo = useMemo(() => getExplorerRank(topicList.length, totalXP), [topicList.length, totalXP])
  const rankProgress = useMemo(() => getRankProgress(topicList.length, totalXP), [topicList.length, totalXP])

  const nextRank = rankInfo?.nextRank || null
  const nextRankIndex = nextRank
    ? EXPLORER_RANKS.findIndex((rank) => rank.id === nextRank.id)
    : -1
  const nextNextRank = nextRankIndex >= 0 ? EXPLORER_RANKS[nextRankIndex + 1] || null : null

  const isRecentlyEarned = useCallback((earnedAt) => {
    if (!earnedAt) return false
    const earnedDate = new Date(earnedAt)
    if (Number.isNaN(earnedDate.getTime())) return false
    const hoursSinceEarned = (Date.now() - earnedDate.getTime()) / (1000 * 60 * 60)
    return hoursSinceEarned <= 24
  }, [])

  const newBadgeIds = useMemo(() => {
    const ids = new Set()
    trophyList.forEach((badge) => {
      if (!badge || badge.locked) return
      if (seenBadgeIds.has(badge.id)) return
      if (isRecentlyEarned(badge.earnedAt)) {
        ids.add(badge.id)
      }
    })
    return ids
  }, [trophyList, seenBadgeIds, isRecentlyEarned])

  useEffect(() => {
    if (!trophyList.length) return
    const earnedIds = trophyList.filter((badge) => badge && !badge.locked).map((badge) => badge.id)
    if (earnedIds.length === 0) return

    const nextSeen = new Set(seenBadgeIds)
    let changed = false
    earnedIds.forEach((id) => {
      if (!nextSeen.has(id)) {
        nextSeen.add(id)
        changed = true
      }
    })

    if (changed) {
      setSeenBadgeIds(nextSeen)
      try {
        localStorage.setItem(SEEN_BADGES_KEY, JSON.stringify(Array.from(nextSeen)))
      } catch {
        // ignore persistence errors
      }
    }
  }, [trophyList, seenBadgeIds])

  // Handle topic selection (opens action sheet)
  const handleTopicSelect = useCallback((topic) => {
    setSelectedTopic(topic)
    setIsActionSheetOpen(true)
  }, [])

  const handleBadgeSelect = useCallback((badge) => {
    setSelectedBadge(badge)
    setIsBadgeSheetOpen(true)
  }, [])

  const handleCloseBadgeSheet = useCallback(() => {
    setSelectedBadge(null)
    setIsBadgeSheetOpen(false)
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

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] md:h-[calc(100dvh-2rem)]">
      {/* Compact stats header */}
      <div className="flex-shrink-0 px-4 pt-4">
        <StatsBar
          streak={streakValue}
          totalXP={totalXP}
          topicsLearned={topicList.length}
          compact={true}
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

        {/* Rank + Badges overlay */}
        <div
          data-testid="progress-overlay"
          className="absolute top-3 left-3 right-3 flex items-start justify-between gap-3 pointer-events-none"
        >
          <div className="pointer-events-auto">
            <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg min-w-[180px]">
              <div className="flex items-center gap-2">
                <ExplorerRankBadge
                  level={rankInfo?.level || 1}
                  title={rankInfo?.title || 'Stargazer'}
                  icon={rankInfo?.icon || '\uD83D\uDD2D'}
                  size="compact"
                />
                <div className="text-xs text-slate-700 dark:text-slate-200 font-semibold">
                  {rankInfo?.title || 'Stargazer'}
                </div>
              </div>
              {nextRank ? (
                <div className="mt-2">
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${rankProgress}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Next: {nextRank.title} • {rankInfo?.topicsToNextRank || 0} topics • {rankInfo?.xpToNextRank || 0} XP
                  </div>
                  {nextNextRank && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      After: {nextNextRank.title}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Max rank achieved
                </div>
              )}
            </div>
          </div>

          {showTrophies && (
            <div className="pointer-events-auto max-w-[60%] md:max-w-[50%]">
              <TrophyShowcase
                trophies={trophyList}
                isLoading={trophiesLoading}
                maxVisible={6}
                showNewBadgeForIds={newBadgeIds}
                onTrophyClick={handleBadgeSelect}
              />
            </div>
          )}
        </div>
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

      {isBadgeSheetOpen && selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getBadgeIcon(selectedBadge.icon)}</span>
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {selectedBadge.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedBadge.locked ? 'Locked' : 'Unlocked'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseBadgeSheet}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                aria-label="Close badge details"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {selectedBadge.description || selectedBadge.criteriaText}
            </p>

            {selectedBadge.criteriaText && (
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {selectedBadge.criteriaText}
              </div>
            )}

            {typeof selectedBadge.progressTarget === 'number' && selectedBadge.progressTarget > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Progress</span>
                  <span>{selectedBadge.progressCurrent}/{selectedBadge.progressTarget}</span>
                </div>
                <div className="mt-2 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((selectedBadge.progressCurrent / selectedBadge.progressTarget) * 100))}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
