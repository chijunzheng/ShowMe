/**
 * StatDetailSheet Component
 *
 * Bottom sheet overlay that shows detailed information for a tapped stat.
 * Reuses the same bottom sheet pattern as TopicActionSheet.
 *
 * Stat types: 'streak', 'xp', 'topics', 'trophies'
 */

import { useCallback, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { getExplorerRank } from '../ExplorerRank/explorerRankUtils'
import TrophyShowcase from './TrophyShowcase'

/**
 * Get brightness label from mastery score
 */
function getMasteryLabel(mastery) {
  if (mastery >= 0.75) return 'Brilliant'
  if (mastery >= 0.5) return 'Bright'
  if (mastery >= 0.25) return 'Dim'
  return 'New'
}

/**
 * Get mastery stars string
 */
function getMasteryStars(mastery) {
  if (mastery >= 0.75) return '\u2b50\u2b50\u2b50'
  if (mastery >= 0.5) return '\u2b50\u2b50'
  if (mastery >= 0.25) return '\u2b50'
  return ''
}

/**
 * StreakContent - Shows streak details with 7-day activity dots
 */
function StreakContent({ streak }) {
  const current = typeof streak === 'number' ? streak : streak?.current || 0
  const longest = typeof streak === 'number' ? streak : streak?.longest || current
  const history = typeof streak === 'object' ? streak?.history : null

  // Generate 7-day activity dots
  const dots = []
  for (let i = 6; i >= 0; i--) {
    const active = history
      ? !!history[i]
      : (i === 0 && current > 0)
    dots.push(active)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{'\ud83d\udd25'}</span>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Streak Details</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{current}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Current streak</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{longest}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Longest streak</div>
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Last 7 days</div>
        <div className="flex items-center justify-center gap-2">
          {dots.map((active, i) => (
            <div
              key={i}
              className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs
                ${active
                  ? 'bg-orange-400 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                }
              `}
            >
              {active ? '\u25cf' : '\u25cb'}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

StreakContent.propTypes = {
  streak: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.shape({
      current: PropTypes.number,
      longest: PropTypes.number,
      history: PropTypes.array,
    }),
  ]),
}

/**
 * XPContent - Shows XP progress with rank bar
 */
function XPContent({ totalXP, topicCount }) {
  const rankInfo = getExplorerRank(topicCount, totalXP)
  const nextRank = rankInfo?.nextRank

  const denominator = (nextRank?.minXP || 150) - (rankInfo.currentRankXP || 0)
  const progressPercent = nextRank && denominator > 0
    ? Math.min(100, Math.round(
        ((totalXP - (rankInfo.currentRankXP || 0)) / denominator) * 100
      ))
    : 100

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{'\u2b50'}</span>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">XP Progress</h3>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
        <div className="text-3xl font-bold text-slate-900 dark:text-white text-center">{totalXP} XP</div>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {rankInfo?.icon} {rankInfo?.title}
          </span>
          {nextRank && (
            <span className="text-slate-500 dark:text-slate-400 text-xs">
              {rankInfo?.xpToNextRank || 0} XP to {nextRank.title}
            </span>
          )}
        </div>
        <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
          {topicCount} topic{topicCount !== 1 ? 's' : ''} learned
        </div>
      </div>
    </div>
  )
}

XPContent.propTypes = {
  totalXP: PropTypes.number,
  topicCount: PropTypes.number,
}

/**
 * TopicsContent - Shows topic list with mastery indicators
 */
function TopicsContent({ topicList, graphNodes }) {
  const topics = Array.isArray(topicList) ? topicList : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{'\ud83d\udcda'}</span>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Topics Learned ({topics.length})
        </h3>
      </div>

      {topics.length === 0 ? (
        <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm">
          No topics learned yet. Ask a question to get started!
        </div>
      ) : (
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {topics.map((topic) => {
            const name = topic?.topicName || topic?.name || 'Unknown'
            const graphNode = Array.isArray(graphNodes)
              ? graphNodes.find((n) => n.name?.toLowerCase() === name.toLowerCase())
              : null
            const mastery = graphNode?.mastery || 0.25
            const label = getMasteryLabel(mastery)
            const stars = getMasteryStars(mastery)

            return (
              <div
                key={name}
                className="flex items-center justify-between px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{'\u2b50'}</span>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                  {stars && <span className="text-xs">{stars}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

TopicsContent.propTypes = {
  topicList: PropTypes.array,
  graphNodes: PropTypes.array,
}

/**
 * TrophiesContent - Shows full trophy showcase
 */
function TrophiesContent({ trophyList, onTrophyClick }) {
  const earned = Array.isArray(trophyList) ? trophyList.filter((t) => !t.locked).length : 0
  const total = Array.isArray(trophyList) ? trophyList.length : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{'\ud83c\udfc6'}</span>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Trophies ({earned}/{total} earned)
        </h3>
      </div>

      <TrophyShowcase
        trophies={trophyList}
        onTrophyClick={onTrophyClick}
        maxVisible={50}
      />
    </div>
  )
}

TrophiesContent.propTypes = {
  trophyList: PropTypes.array,
  onTrophyClick: PropTypes.func,
}

/**
 * StatDetailSheet - Bottom sheet with stat-specific content
 */
export default function StatDetailSheet({
  statType,
  onClose,
  streak,
  totalXP,
  topicList,
  trophyList,
  graphNodes,
  onTrophyClick,
}) {
  const sheetRef = useRef(null)

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        onClose?.()
      }
    },
    [onClose]
  )

  if (!statType) return null

  const topicCount = Array.isArray(topicList) ? topicList.length : 0

  return (
    <div
      data-testid="progress-overlay"
      className="
        fixed inset-0 z-50
        flex items-start justify-center
        bg-black/40 backdrop-blur-sm
        animate-[fade-in_0.2s_ease-out]
      "
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`${statType} details`}
    >
      <div
        ref={sheetRef}
        className="
          w-full max-w-lg
          bg-white dark:bg-slate-900
          border-2 border-black dark:border-slate-600
          rounded-2xl
          shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]
          mt-16 mx-4
          p-5 pb-5
          animate-[fade-in_0.2s_ease-out]
          max-h-[70vh] overflow-y-auto
        "
      >
        {/* Close button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="
              w-8 h-8 rounded-full
              flex items-center justify-center
              text-slate-400 hover:text-slate-600
              dark:text-slate-500 dark:hover:text-slate-300
              hover:bg-slate-100 dark:hover:bg-slate-800
              transition-colors
            "
            aria-label="Close details"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Content varies by stat type */}
        {statType === 'streak' && <StreakContent streak={streak} />}
        {statType === 'xp' && <XPContent totalXP={totalXP} topicCount={topicCount} />}
        {statType === 'topics' && <TopicsContent topicList={topicList} graphNodes={graphNodes} />}
        {statType === 'trophies' && (
          <TrophiesContent trophyList={trophyList} onTrophyClick={onTrophyClick} />
        )}
      </div>
    </div>
  )
}

StatDetailSheet.propTypes = {
  statType: PropTypes.oneOf(['streak', 'xp', 'topics', 'trophies']),
  onClose: PropTypes.func.isRequired,
  streak: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  totalXP: PropTypes.number,
  topicList: PropTypes.arrayOf(PropTypes.shape({
    topicName: PropTypes.string,
    name: PropTypes.string,
  })),
  trophyList: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    locked: PropTypes.bool,
  })),
  graphNodes: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    mastery: PropTypes.number,
  })),
  onTrophyClick: PropTypes.func,
}
