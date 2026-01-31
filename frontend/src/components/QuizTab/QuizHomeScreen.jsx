/**
 * QuizHomeScreen - Landing screen for Quiz tab
 *
 * Displays:
 * - Streak banner showing daily streak status
 * - Quiz mode selector (Quick, Deep, Challenge)
 * - Pieces needing review (spaced repetition)
 * - Weak spots (low-scoring topics)
 * - All topics grid
 */
import { useMemo } from 'react'
import StreakBanner from './StreakBanner'
import QuizModeSelector from './QuizModeSelector'
import RecommendationCard from './RecommendationCard'

/**
 * @param {Object} props
 * @param {Array} props.worldPieces - Array of world pieces (topics) user has unlocked
 * @param {Function} props.onStartQuiz - Callback when user starts a quiz, receives { mode, topic }
 * @param {Object} props.streak - Streak data { current: number, todayCompleted: boolean }
 */
export default function QuizHomeScreen({
  worldPieces = [],
  onStartQuiz,
  streak = { current: 0, todayCompleted: false },
}) {
  // Calculate pieces needing review (older than 7 days since last review)
  const piecesNeedingReview = useMemo(() => {
    return worldPieces.filter(piece => {
      const reviewDate = piece.lastReviewedAt || piece.unlockedAt
      if (!reviewDate) return false
      const daysSince = (Date.now() - new Date(reviewDate).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince > 7
    }).sort((a, b) => {
      // Sort by oldest first (most urgent for review)
      const dateA = new Date(a.lastReviewedAt || a.unlockedAt)
      const dateB = new Date(b.lastReviewedAt || b.unlockedAt)
      return dateA - dateB
    }).slice(0, 5) // Limit to 5 most urgent
  }, [worldPieces])

  // Pieces with low scores (below 70%)
  const weakPieces = useMemo(() => {
    return worldPieces
      .filter(p => p.lastReviewScore !== undefined && p.lastReviewScore < 70)
      .slice(0, 3)
  }, [worldPieces])

  return (
    <div className="pb-24 px-4">
      {/* Streak Banner */}
      <StreakBanner streak={streak} />

      {/* Quiz Mode Selector */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
          Practice Modes
        </h2>
        <QuizModeSelector
          onSelectMode={(mode) => onStartQuiz({ mode, topic: null })}
          disabled={worldPieces.length === 0}
        />
      </section>

      {/* Ready for Review - spaced repetition */}
      {piecesNeedingReview.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
            <span>{'\u23F0'}</span> Ready for Review
          </h2>
          <div className="space-y-3">
            {piecesNeedingReview.map(piece => (
              <RecommendationCard
                key={piece.id}
                piece={piece}
                variant="urgent"
                onSelect={() => onStartQuiz({ mode: 'quick', topic: piece })}
              />
            ))}
          </div>
        </section>
      )}

      {/* Weak Spots - topics with low scores */}
      {weakPieces.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
            <span>{'\u{1F4AA}'}</span> Strengthen
          </h2>
          <div className="space-y-3">
            {weakPieces.map(piece => (
              <RecommendationCard
                key={piece.id}
                piece={piece}
                variant="weak"
                onSelect={() => onStartQuiz({ mode: 'deep', topic: piece })}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Topics Grid */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
          All Topics ({worldPieces.length})
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {worldPieces.slice(0, 6).map(piece => (
            <RecommendationCard
              key={piece.id}
              piece={piece}
              variant="default"
              compact
              onSelect={() => onStartQuiz({ mode: 'quick', topic: piece })}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
