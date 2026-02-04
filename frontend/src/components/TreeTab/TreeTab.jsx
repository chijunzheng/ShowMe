/**
 * TreeTab - Knowledge connections and review hub
 *
 * Displays:
 * - Compact stats (streak, XP, topics, tree level)
 * - Due for review list (spaced repetition)
 * - MagicalTree visualization with clickable leaves
 * - Suggested next topics
 */

import { useMemo, useState, useCallback } from 'react'
import { MagicalTree } from '../MagicalTree'
import { calculateTreeLevel } from '../MagicalTree/treeUtils'
import { StatsBar } from '../Dashboard'
import RecommendationCard from './RecommendationCard'
import useSuggestions from '../../hooks/useSuggestions'
import { getDaysSinceReview, getReviewStatus, REVIEW_STATUS } from '../../utils/reviewUtils'
import { ZONE_ICONS } from '../../constants/world'

export default function TreeTab({
  worldPieces = [],
  piecesNeedingReview = [],
  totalXP = 0,
  streak = { current: 0, todayCompleted: false },
  onStartQuiz,
  onReviewTopic,
  onLearnTopic,
  onSelectSuggestedTopic,
}) {
  const [selectedTopic, setSelectedTopic] = useState(null)

  const treeLevel = useMemo(() => calculateTreeLevel(worldPieces.length), [worldPieces.length])

  const branches = useMemo(() => {
    const grouped = { nature: [], civilization: [], arcane: [] }

    worldPieces.forEach((piece) => {
      const zone = piece.zone || 'nature'
      const topicName = piece.topicName || piece.name || 'Topic'

      const topic = {
        id: piece.id,
        name: topicName,
        category: zone,
        zone,
        piece,
        relatedTopics: piece.relatedTopics || [],
        earnedAt: piece.unlockedAt,
      }

      if (grouped[zone]) {
        grouped[zone].push(topic)
      } else {
        grouped.nature.push(topic)
      }
    })

    return grouped
  }, [worldPieces])

  const { suggestions, isLoading: isLoadingSuggestions } = useSuggestions({
    pieces: worldPieces,
    limit: 5,
    autoFetch: true,
  })

  const handleLeafClick = useCallback((topic) => {
    setSelectedTopic(topic)
  }, [])

  const handleCloseTopic = useCallback(() => {
    setSelectedTopic(null)
  }, [])

  const handleReview = useCallback(() => {
    if (!selectedTopic?.piece) return
    onReviewTopic?.(selectedTopic.piece)
    setSelectedTopic(null)
  }, [onReviewTopic, selectedTopic])

  const handleQuiz = useCallback(() => {
    if (!selectedTopic?.piece) return
    onStartQuiz?.({ mode: 'quick', topic: selectedTopic.piece })
    setSelectedTopic(null)
  }, [onStartQuiz, selectedTopic])

  const handleLearn = useCallback(() => {
    if (!selectedTopic?.piece) return
    onLearnTopic?.(selectedTopic.piece)
    setSelectedTopic(null)
  }, [onLearnTopic, selectedTopic])

  const isEmpty = worldPieces.length === 0

  return (
    <div className="pb-24 px-4 space-y-6">
      <StatsBar
        streak={streak.current || 0}
        totalXP={totalXP}
        topicsLearned={worldPieces.length}
        treeLevel={treeLevel}
        compact
      />

      {isEmpty && (
        <div className="text-center bg-white/70 dark:bg-slate-800/70 rounded-2xl p-6 shadow-sm">
          <div className="text-4xl mb-3" aria-hidden="true">🌱</div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Your Tree Is Waiting</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Learn your first topic to plant the first leaf.
          </p>
        </div>
      )}

      {piecesNeedingReview.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3">
            Due for Review
          </h3>
          <div className="space-y-3">
            {piecesNeedingReview.slice(0, 5).map((piece) => (
              <RecommendationCard
                key={piece.id}
                piece={piece}
                variant="urgent"
                onSelect={() => onReviewTopic?.(piece)}
              />
            ))}
          </div>
        </section>
      )}

      {!isEmpty && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Knowledge Tree
          </h3>
          <div className="rounded-2xl overflow-hidden shadow-sm">
            <MagicalTree
              treeLevel={treeLevel}
              branches={branches}
              onLeafClick={handleLeafClick}
            />
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
          Recommended Next
        </h3>
        {isLoadingSuggestions && (
          <div className="text-sm text-slate-500 dark:text-slate-400">Finding the best next topics...</div>
        )}
        {!isLoadingSuggestions && suggestions.length === 0 && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Keep learning to unlock tailored recommendations.
          </div>
        )}
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.topic}-${index}`}
              onClick={() => onSelectSuggestedTopic?.(suggestion.topic)}
              className="
                w-full text-left p-4 rounded-xl border
                bg-white dark:bg-slate-800
                border-slate-200 dark:border-slate-700
                hover:shadow-md hover:scale-[1.01]
                transition-all duration-200
              "
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {ZONE_ICONS[suggestion.zone] || '✨'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {suggestion.topic}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {suggestion.reason || 'Build a new connection'}
                  </div>
                </div>
                <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                  Learn
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedTopic?.piece && (
        <div className="fixed bottom-20 left-4 right-4 z-30">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {selectedTopic.zone || selectedTopic.category || 'Topic'}
                </div>
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {selectedTopic.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {getReviewStatus(selectedTopic.piece) === REVIEW_STATUS.DUE
                    ? 'Review overdue'
                    : `Reviewed ${getDaysSinceReview(selectedTopic.piece)} days ago`}
                </p>
                {selectedTopic.relatedTopics?.length > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                    Related: {selectedTopic.relatedTopics.slice(0, 3).join(', ')}
                    {selectedTopic.relatedTopics.length > 3 ? '…' : ''}
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseTopic}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close topic details"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={handleReview}
                className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold"
              >
                Review
              </button>
              <button
                onClick={handleQuiz}
                className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold"
              >
                Quiz
              </button>
              <button
                onClick={handleLearn}
                className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold"
              >
                Learn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
