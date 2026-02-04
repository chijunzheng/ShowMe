/**
 * ProgressTab Component
 *
 * Main container for the Progress tab that consolidates World and Tree views.
 * Integrates: StatsBar, MiniWorldPreview, DueForReview, QuickPractice, TopicsByZone.
 */

import { useState, useCallback, useMemo } from 'react'
import { StatsBar } from '../Dashboard'
import MiniWorldPreview from './MiniWorldPreview'
import DueForReview from './DueForReview'
import QuickPractice from './QuickPractice'
import TopicsByZone from './TopicsByZone'
import TopicActionSheet from './TopicActionSheet'
import LivingWorldView from '../LivingWorld/LivingWorldView'

/**
 * ProgressTab - Consolidated progress view
 *
 * @param {Object} props
 * @param {Object} props.worldState - World state from useLivingWorld
 * @param {Array} props.pieces - World pieces (topics) from worldState
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
 * @param {Object} props.worldViewProps - Additional props to pass to LivingWorldView
 */
export default function ProgressTab({
  worldState,
  pieces = [],
  onReviewSlideshow,
  onLaunchMode,
  onQuickQuiz,
  onLearnTopic,
  onAskQuestion,
  totalXP = 0,
  streak = 0,
  tier = 'barren',
  treeLevel = 'seed',
  suggestions = [],
  onRefreshSuggestions,
  onSelectSuggestedTopic,
  worldViewProps = {},
}) {
  // State for action sheet
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false)

  // State for world preview expansion
  const [isWorldExpanded, setIsWorldExpanded] = useState(false)

  // Convert pieces to topics format for components
  const topics = useMemo(() => {
    return pieces.map((piece) => ({
      topicName: piece.topicName || piece.name,
      zone: piece.zone || 'nature',
      lastReviewedAt: piece.lastReviewedAt,
      unlockedAt: piece.unlockedAt,
      slides: piece.slides || [],
      level: piece.level || 'standard',
      relatedTopics: piece.relatedTopics || [],
    }))
  }, [pieces])

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
    // Find the related topic in pieces
    const relatedPiece = pieces.find(
      (p) => (p.topicName || p.name) === relatedTopicName
    )
    if (relatedPiece) {
      handleTopicSelect({
        topicName: relatedPiece.topicName || relatedPiece.name,
        zone: relatedPiece.zone,
        lastReviewedAt: relatedPiece.lastReviewedAt,
        unlockedAt: relatedPiece.unlockedAt,
        slides: relatedPiece.slides,
        level: relatedPiece.level,
        relatedTopics: relatedPiece.relatedTopics,
      })
    } else {
      // Topic not learned yet - offer to learn it
      onSelectSuggestedTopic?.(relatedTopicName)
    }
  }, [pieces, handleTopicSelect, onSelectSuggestedTopic])

  // Handle world expand
  const handleWorldExpand = useCallback(() => {
    setIsWorldExpanded(true)
  }, [])

  // Handle world collapse
  const handleWorldCollapse = useCallback(() => {
    setIsWorldExpanded(false)
  }, [])

  // Extract streak value
  const streakValue = typeof streak === 'number' ? streak : streak?.current || 0

  return (
    <div className="pb-24 px-4 space-y-6">
      {/* Stats Bar */}
      <StatsBar
        streak={streakValue}
        totalXP={totalXP}
        topicsLearned={pieces.length}
        treeLevel={treeLevel}
        tier={tier}
        compact
      />

      {/* Mini World Preview */}
      <MiniWorldPreview
        worldImageUrl={worldState?.imageUrl}
        tier={tier}
        topicCount={pieces.length}
        onExpand={handleWorldExpand}
        isExpanded={isWorldExpanded}
        onCollapse={handleWorldCollapse}
      >
        {/* Fullscreen LivingWorldView when expanded */}
        <LivingWorldView
          worldState={worldState}
          worldImageUrl={worldState?.imageUrl}
          tier={tier}
          pieces={pieces}
          isLoading={false}
          {...worldViewProps}
        />
      </MiniWorldPreview>

      {/* Due for Review */}
      <DueForReview
        topics={topics}
        onTopicSelect={handleTopicSelect}
      />

      {/* Quick Practice */}
      <QuickPractice
        topics={topics}
        onLaunchMode={onLaunchMode}
        onTopicSelect={handleTopicSelect}
        onAskQuestion={onAskQuestion}
      />

      {/* Topics by Zone */}
      <TopicsByZone
        topics={topics}
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
