/**
 * BadgeCollection Component
 * GAMIFY-003: Grid display of all badges
 * T008: Shows all badges in grid
 * T009: Locked badges appear grayed out
 */

import AchievementBadge from './AchievementBadge'

// Default badge order for display
const BADGE_ORDER = [
  'CURIOUS_MIND',
  'QUESTION_10',
  'STREAK_3',
  'STREAK_7',
  'STREAK_30',
  'DEEP_THINKER',
  'SOCRATIC_5'
]

export default function BadgeCollection({
  badges = {},
  unlockedBadges = [],
  badgeUnlockDates = {},
  showAll = true
}) {
  // Get badges to display in order
  const badgesToShow = showAll
    ? BADGE_ORDER.map(id => badges[id]).filter(Boolean)
    : unlockedBadges.map(id => badges[id]).filter(Boolean)

  if (badgesToShow.length === 0 && !showAll) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        <p className="text-lg">No badges yet</p>
        <p className="text-sm mt-1">Keep learning to earn badges!</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Your Achievements
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {unlockedBadges.length} / {Object.keys(badges).length} earned
        </span>
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {BADGE_ORDER.map(badgeId => {
          const badge = badges[badgeId]
          if (!badge) return null

          const isUnlocked = unlockedBadges.includes(badgeId)
          const unlockDate = badgeUnlockDates[badgeId]

          return (
            <AchievementBadge
              key={badgeId}
              badge={badge}
              isUnlocked={isUnlocked}
              unlockDate={unlockDate}
              showDetails={true}
              size="md"
            />
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Badge Progress</span>
          <span>{Math.round((unlockedBadges.length / Object.keys(badges).length) * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${(unlockedBadges.length / Math.max(Object.keys(badges).length, 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
