/**
 * StatDetailSheet Component
 *
 * Bottom sheet overlay that shows detailed information for a tapped stat.
 * Reuses the same bottom sheet pattern as TopicActionSheet.
 *
 * Stat types: 'streak', 'xp', 'topics', 'trophies'
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import PropTypes from 'prop-types'
import { getExplorerRank } from '../ExplorerRank/explorerRankUtils'
import { computeDisplayedMastery, getClusterStyle } from '../../hooks/useKnowledgeGraph'
import TrophyShowcase from './TrophyShowcase'
import MyStoriesSheet from '../ProgressTab/MyStoriesSheet'
import StoryReplaySheet from '../ProgressTab/StoryReplaySheet'

/**
 * StreakContent - Shows streak details with monthly calendar view
 */
function StreakContent({ streak }) {
  const current = typeof streak === 'number' ? streak : streak?.current || 0
  const longest = typeof streak === 'number' ? streak : streak?.longest || current
  const activeDates = typeof streak === 'object' ? streak?.activeDates : null
  const activeDateSet = useMemo(() => {
    if (!Array.isArray(activeDates)) return new Set()
    const normalized = activeDates
      .map((d) => (typeof d === 'string' ? d.split('T')[0] : null))
      .filter(Boolean)
    return new Set(normalized)
  }, [activeDates])

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const isCurrentMonth = useMemo(() => {
    const now = new Date()
    return viewMonth.year === now.getFullYear() && viewMonth.month === now.getMonth()
  }, [viewMonth])

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewMonth.year, viewMonth.month, 1)
    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate()
    const startDow = firstDay.getDay()
    const grid = []
    for (let i = 0; i < startDow; i++) grid.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      grid.push({ day: d, active: activeDateSet.has(key) })
    }
    return grid
  }, [viewMonth, activeDateSet])

  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleString('default', { month: 'long', year: 'numeric' })

  const handlePrevMonth = useCallback(() => {
    setViewMonth((prev) => {
      const m = prev.month - 1
      if (m < 0) return { year: prev.year - 1, month: 11 }
      return { ...prev, month: m }
    })
  }, [])

  const handleNextMonth = useCallback(() => {
    if (isCurrentMonth) return
    setViewMonth((prev) => {
      const m = prev.month + 1
      if (m > 11) return { year: prev.year + 1, month: 0 }
      return { ...prev, month: m }
    })
  }, [isCurrentMonth])

  const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

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
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Previous month"
          >
            {'\u2039'}
          </button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{monthLabel}</span>
          <button
            type="button"
            onClick={handleNextMonth}
            disabled={isCurrentMonth}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isCurrentMonth
                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            aria-label="Next month"
          >
            {'\u203a'}
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-[10px] text-slate-400 dark:text-slate-500 font-medium py-1">
              {d}
            </div>
          ))}
          {calendarDays.map((cell, i) => (
            <div
              key={i}
              className={`
                w-full aspect-square rounded-full flex items-center justify-center text-xs
                ${cell === null
                  ? ''
                  : cell.active
                    ? 'bg-orange-400 text-white font-bold'
                    : 'text-slate-400 dark:text-slate-500'
                }
              `}
            >
              {cell?.day || ''}
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
      activeDates: PropTypes.arrayOf(PropTypes.string),
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
  const topics = useMemo(() => (Array.isArray(topicList) ? topicList : []), [topicList])

  const grouped = useMemo(() => {
    const groups = {}

    topics.forEach((topic) => {
      const name = topic?.topicName || topic?.name || 'Unknown'
      const graphNode = Array.isArray(graphNodes)
        ? graphNodes.find((n) => n.name?.toLowerCase() === name.toLowerCase())
        : null
      const category = (graphNode?.category || 'general').toLowerCase()

      if (!groups[category]) {
        groups[category] = []
      }

      let mastery = 0.25
      if (graphNode?.masteryScores) {
        mastery = computeDisplayedMastery(graphNode.masteryScores, graphNode.lastReviewedAt)
      } else if (graphNode?.mastery != null) {
        mastery = graphNode.mastery
      }

      groups[category].push({ name, mastery, category })
    })

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items]) => {
        const config = getClusterStyle(category)
        const displayName = category.charAt(0).toUpperCase() + category.slice(1)
        return {
          category,
          displayName,
          icon: config.icon,
          color: config.color,
          items: items.sort((a, b) => b.mastery - a.mastery),
        }
      })
  }, [topics, graphNodes])

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
        <div className="space-y-4 max-h-[50vh] overflow-y-auto">
          {grouped.map(({ category, displayName, icon, color, items }) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{icon}</span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {displayName}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">({items.length})</span>
              </div>
              <div className="space-y-1.5">
                {items.map(({ name, mastery }) => {
                  const percent = Math.round(mastery * 100)
                  return (
                    <div key={name} className="flex items-center gap-3 px-2 py-1.5">
                      <span className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1 min-w-0">
                        {name}
                      </span>
                      <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right flex-shrink-0">
                        {percent}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
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
  stories,
  onDeleteStory,
  onLoadStoryContent,
}) {
  const sheetRef = useRef(null)

  const [replayStory, setReplayStory] = useState(null)

  const handleSelectStory = useCallback((storyId) => {
    if (!onLoadStoryContent) return
    const content = onLoadStoryContent(storyId)
    if (content) setReplayStory(content)
  }, [onLoadStoryContent])

  const handleCloseReplay = useCallback(() => {
    setReplayStory(null)
  }, [])

  const handleDeleteFromReplay = useCallback((storyId) => {
    onDeleteStory?.(storyId)
    setReplayStory(null)
  }, [onDeleteStory])

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
          max-h-[85vh] overflow-y-auto
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
        {statType === 'stories' && (
          <MyStoriesSheet
            stories={stories}
            onSelectStory={handleSelectStory}
            onDeleteStory={onDeleteStory}
          />
        )}
      </div>

      {replayStory && (
        <StoryReplaySheet
          story={replayStory}
          onClose={handleCloseReplay}
          onDelete={handleDeleteFromReplay}
        />
      )}
    </div>
  )
}

StatDetailSheet.propTypes = {
  statType: PropTypes.oneOf(['streak', 'xp', 'topics', 'trophies', 'stories']),
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
  stories: PropTypes.array,
  onDeleteStory: PropTypes.func,
  onLoadStoryContent: PropTypes.func,
}
