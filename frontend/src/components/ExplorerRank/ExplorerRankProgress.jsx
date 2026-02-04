/**
 * ExplorerRankProgress Component
 *
 * Shows progress toward the next explorer rank.
 * Displays current topics learned and topics needed for next rank.
 *
 * @param {Object} props
 * @param {number} props.currentTopics - Number of topics learned
 * @param {number} props.topicsForNextRank - Topics needed for next rank
 * @param {Object} props.currentRank - Current rank info
 * @param {Object} [props.nextRank] - Next rank info (null if max rank)
 */

import PropTypes from 'prop-types'
import { getRankProgress, getRankTailwindColors } from './explorerRankUtils'

export default function ExplorerRankProgress({
  currentTopics,
  topicsForNextRank,
  currentRank,
  nextRank,
}) {
  // Calculate progress percentage
  const progress = getRankProgress(currentTopics)
  const isMaxRank = !nextRank

  // Get colors for current rank
  const currentColors = getRankTailwindColors(currentRank?.level || 1)

  // Calculate topics remaining
  const topicsRemaining = topicsForNextRank > 0 ? topicsForNextRank : 0

  // Build progress text
  const progressText = isMaxRank
    ? 'Maximum rank achieved!'
    : `${topicsRemaining} topic${topicsRemaining === 1 ? '' : 's'} to ${nextRank?.title || 'next rank'}`

  return (
    <div
      data-testid="explorer-rank-progress"
      className="w-full max-w-xs mx-auto"
    >
      {/* Progress bar container */}
      <div className="flex items-center gap-2">
        {/* Current rank icon */}
        <div
          className={`
            flex-shrink-0
            w-8 h-8
            flex items-center justify-center
            rounded-full
            ${currentColors.bg}
            ${currentColors.border}
            border
          `}
          aria-hidden="true"
        >
          <span className="text-lg">{currentRank?.icon || '\uD83D\uDD2D'}</span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 relative">
          <div
            className="
              h-3
              bg-slate-200 dark:bg-slate-700
              rounded-full
              overflow-hidden
            "
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress to ${nextRank?.title || 'max rank'}: ${progress}%`}
          >
            {/* Filled portion with gradient */}
            <div
              className={`
                h-full
                bg-gradient-to-r from-indigo-500 to-purple-500
                rounded-full
                transition-all duration-500 ease-out
              `}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Next rank icon (or star if max) */}
        <div
          className={`
            flex-shrink-0
            w-8 h-8
            flex items-center justify-center
            rounded-full
            ${isMaxRank
              ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
            }
            border
            ${isMaxRank ? 'shimmer' : 'opacity-60'}
          `}
          aria-hidden="true"
        >
          <span className="text-lg">
            {isMaxRank ? '\u2B50' : nextRank?.icon || '\uD83D\uDE80'}
          </span>
        </div>
      </div>

      {/* Progress text */}
      <p
        className="
          mt-2
          text-center
          text-sm
          text-slate-600 dark:text-slate-400
        "
      >
        {isMaxRank ? (
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {progressText}
          </span>
        ) : (
          <>
            <span className="font-semibold">{currentTopics}</span>
            <span className="text-slate-400 dark:text-slate-500">
              /{nextRank?.minTopics || 0}
            </span>
            <span className="ml-1">{progressText}</span>
          </>
        )}
      </p>
    </div>
  )
}

ExplorerRankProgress.propTypes = {
  currentTopics: PropTypes.number.isRequired,
  topicsForNextRank: PropTypes.number.isRequired,
  currentRank: PropTypes.shape({
    level: PropTypes.number,
    id: PropTypes.string,
    title: PropTypes.string,
    icon: PropTypes.string,
    minTopics: PropTypes.number,
    description: PropTypes.string,
  }).isRequired,
  nextRank: PropTypes.shape({
    level: PropTypes.number,
    id: PropTypes.string,
    title: PropTypes.string,
    icon: PropTypes.string,
    minTopics: PropTypes.number,
    description: PropTypes.string,
  }),
}
