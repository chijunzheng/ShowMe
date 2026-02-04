/**
 * PieceDetailPanel Component
 *
 * Bottom sheet panel showing details about a selected topic/piece.
 * Provides Review, Quiz, and Learn action buttons.
 */

import { getDaysSinceReview, getReviewStatus, REVIEW_STATUS } from '../../utils/reviewUtils'

export default function PieceDetailPanel({
  piece,
  onClose,
  onReview,
  onQuiz,
  onLearn,
}) {
  if (!piece) return null

  const status = getReviewStatus(piece)
  const daysSince = getDaysSinceReview(piece)

  return (
    <div className="absolute bottom-3 left-3 right-3 z-20">
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {piece.zone || 'Topic'}
            </div>
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
              {piece.topicName || piece.name}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {status === REVIEW_STATUS.DUE
                ? 'Review overdue'
                : `Reviewed ${daysSince} days ago`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close topic details"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={onReview}
            className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold"
          >
            Review
          </button>
          <button
            onClick={onQuiz}
            className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold"
          >
            Quiz
          </button>
          <button
            onClick={onLearn}
            className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold"
          >
            Learn
          </button>
        </div>
      </div>
    </div>
  )
}
