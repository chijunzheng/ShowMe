/**
 * TrophyShowcase Component
 *
 * Displays earned trophies/badges in a horizontally scrollable showcase.
 * Shows empty state when no trophies earned.
 */

import { useCallback, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

/**
 * Trophy icon mapping
 */
const TROPHY_ICONS = {
  'question-mark': '\u2753',
  fire: '\ud83d\udd25',
  'flame-small': '\ud83d\udd25',
  'flame-medium': '\ud83d\udd25',
  'flame-large': '\ud83d\udd25',
  compass: '\ud83e\udded',
  star: '\u2b50',
  trophy: '\ud83c\udfc6',
  book: '\ud83d\udcd6',
  lightbulb: '\ud83d\udca1',
  brain: '\ud83e\udde0',
  'thought-bubble': '\ud83d\udcad',
  rocket: '\ud83d\ude80',
  medal: '\ud83c\udfc5',
}

/**
 * Trophy type styles
 */
const TROPHY_STYLES = {
  'first-question': 'bg-purple-100 dark:bg-purple-900/30 border-purple-300',
  'streak-7': 'bg-orange-100 dark:bg-orange-900/30 border-orange-300',
  'topics-10': 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300',
  default: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300',
}

/**
 * Check if a trophy was recently earned (within last 24 hours)
 */
function isRecentlyEarned(earnedAt) {
  if (!earnedAt) return false
  const earnedDate = new Date(earnedAt)
  const now = new Date()
  const hoursSinceEarned = (now - earnedDate) / (1000 * 60 * 60)
  return hoursSinceEarned <= 24
}

/**
 * Get most recently earned trophy
 */
function getMostRecent(trophies) {
  if (!trophies || trophies.length === 0) return null
  return trophies.reduce((most, current) => {
    if (!most) return current
    const mostDate = new Date(most.earnedAt || 0)
    const currentDate = new Date(current.earnedAt || 0)
    return currentDate > mostDate ? current : most
  }, null)
}

/**
 * Skeleton loader for trophies
 */
function TrophyShowcaseSkeleton() {
  return (
    <div
      data-testid="trophy-showcase-skeleton"
      className="
        flex items-center gap-4 overflow-x-auto
        p-4
        bg-slate-100 dark:bg-slate-800
        rounded-xl
        animate-pulse
      "
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          data-testid="trophy-skeleton-item"
          className="flex flex-col items-center gap-2 min-w-[80px]"
        >
          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      ))}
    </div>
  )
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div
      data-testid="trophy-empty-state"
      className="
        flex flex-col items-center justify-center
        py-8 px-4
        text-center
      "
    >
      <div
        data-testid="locked-trophy-icon"
        className="
          w-16 h-16
          flex items-center justify-center
          bg-slate-200 dark:bg-slate-700
          rounded-full
          mb-4
          opacity-50
        "
      >
        <span className="text-3xl">{'\ud83d\udd12'}</span>
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-sm">
        Earn your first trophy by exploring topics!
      </p>
    </div>
  )
}

/**
 * Individual trophy item
 */
function TrophyItem({ trophy, isRecent, isMostRecent, isSelected, onClick }) {
  const handleClick = useCallback(() => {
    onClick?.(trophy)
  }, [onClick, trophy])

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        onClick?.(trophy)
      }
    },
    [onClick, trophy]
  )

  const icon = TROPHY_ICONS[trophy.icon] || TROPHY_ICONS.trophy
  const styleClass = TROPHY_STYLES[trophy.id] || TROPHY_STYLES.default
  const isLocked = !!trophy.locked
  const showNew = isRecent && !isLocked

  return (
    <div
      data-testid={`trophy-item-${trophy.id}`}
      className={`
        relative
        flex flex-col items-center gap-2
        p-3
        rounded-lg
        border
        ${styleClass}
        ${isMostRecent ? 'ring-2 ring-amber-400 ring-offset-2 highlight' : ''}
        ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}
        ${isLocked ? 'opacity-60 grayscale' : ''}
        cursor-pointer
        hover:scale-105
        transition-transform duration-200
        focus:outline-none focus:ring-2 focus:ring-amber-300
      `}
      role="listitem"
      tabIndex="0"
      aria-label={`${trophy.name || 'Unknown trophy'}${trophy.description ? `, ${trophy.description}` : ''}${isLocked ? ', locked' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Trophy icon */}
      <div
        data-testid="trophy-icon"
        className="
          w-12 h-12
          flex items-center justify-center
          bg-white dark:bg-slate-800
          rounded-full
          shadow-sm
        "
      >
        <span className="text-2xl">{icon}</span>
      </div>

      {/* Trophy name */}
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">
        {trophy.name || 'Unknown'}
      </span>

      {/* Criteria / description always visible */}
      <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-tight">
        {isLocked
          ? trophy.criteriaText || 'Keep exploring to unlock!'
          : trophy.description || ''}
      </span>

      {/* New badge */}
      {showNew && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-amber-400 text-white text-[10px] font-bold rounded-full">
          New
        </span>
      )}

      {isLocked && (
        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full">
          Locked
        </span>
      )}
    </div>
  )
}

TrophyItem.propTypes = {
  trophy: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    criteriaText: PropTypes.string,
    icon: PropTypes.string,
    earnedAt: PropTypes.string,
  }).isRequired,
  isRecent: PropTypes.bool,
  isMostRecent: PropTypes.bool,
  isSelected: PropTypes.bool,
  onClick: PropTypes.func,
}

/**
 * TrophyShowcase - Trophy display component
 *
 * @param {Object} props
 * @param {Array} props.trophies - Array of trophy objects
 * @param {Function} props.onTrophyClick - Callback when trophy is clicked
 * @param {boolean} props.isLoading - Whether trophies are loading
 * @param {number} props.maxVisible - Maximum trophies to show before "see all"
 */
export default function TrophyShowcase({
  trophies = [],
  onTrophyClick,
  isLoading = false,
  maxVisible = 10,
  showNewBadgeForIds = null,
}) {
  const [selectedTrophyId, setSelectedTrophyId] = useState(null)

  // Safe trophies array
  const safeTrophies = useMemo(() => {
    if (!trophies || !Array.isArray(trophies)) return []
    return trophies
  }, [trophies])

  // Most recently earned trophy
  const mostRecent = useMemo(() => getMostRecent(safeTrophies), [safeTrophies])

  const newBadgeSet = useMemo(() => {
    if (!showNewBadgeForIds) return null
    if (showNewBadgeForIds instanceof Set) return showNewBadgeForIds
    if (Array.isArray(showNewBadgeForIds)) return new Set(showNewBadgeForIds)
    return null
  }, [showNewBadgeForIds])

  const handleTrophyClick = useCallback(
    (trophy) => {
      setSelectedTrophyId((prev) => (prev === trophy.id ? null : trophy.id))
      onTrophyClick?.(trophy)
    },
    [onTrophyClick]
  )

  // Determine visible trophies
  const needsShowAll = safeTrophies.length > maxVisible
  const visibleTrophies = needsShowAll ? safeTrophies.slice(0, maxVisible) : safeTrophies

  // Show skeleton when loading
  if (isLoading) {
    return <TrophyShowcaseSkeleton />
  }

  // Show empty state
  if (safeTrophies.length === 0) {
    return (
      <div
        data-testid="trophy-showcase"
        className="
          flex flex-row overflow-x-auto gap-4
          p-4
          bg-slate-50 dark:bg-slate-900
          rounded-xl
          scrollbar-hide
        "
        role="list"
      >
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Trophy count header */}
      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {safeTrophies.length} Trophies
        </span>
      </div>

      {/* Trophy showcase */}
      <div
        data-testid="trophy-showcase"
        className="
          grid grid-cols-3 gap-3
          p-4
          bg-slate-50 dark:bg-slate-900
          rounded-xl
        "
        role="list"
      >
        {visibleTrophies.map((trophy) => (
          <TrophyItem
            key={trophy.id || `trophy-${Math.random()}`}
            trophy={trophy}
            isRecent={newBadgeSet ? newBadgeSet.has(trophy.id) : isRecentlyEarned(trophy.earnedAt)}
            isMostRecent={mostRecent?.id === trophy.id}
            isSelected={selectedTrophyId === trophy.id}
            onClick={handleTrophyClick}
          />
        ))}

        {/* See all button */}
        {needsShowAll && (
          <button
            type="button"
            className="
              flex items-center justify-center
              h-20
              bg-slate-200 dark:bg-slate-700
              rounded-lg
              text-sm text-slate-600 dark:text-slate-300
              hover:bg-slate-300 dark:hover:bg-slate-600
              transition-colors
            "
          >
            +{safeTrophies.length - maxVisible} more
          </button>
        )}
      </div>
    </div>
  )
}

TrophyShowcase.propTypes = {
  trophies: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      description: PropTypes.string,
      criteriaText: PropTypes.string,
      icon: PropTypes.string,
      earnedAt: PropTypes.string,
      locked: PropTypes.bool,
    })
  ),
  onTrophyClick: PropTypes.func,
  isLoading: PropTypes.bool,
  maxVisible: PropTypes.number,
  showNewBadgeForIds: PropTypes.oneOfType([
    PropTypes.instanceOf(Set),
    PropTypes.arrayOf(PropTypes.string),
  ]),
}
