/**
 * AchievementBadge Component
 * GAMIFY-003: Individual badge display
 * T008: Part of BadgeCollection grid
 * T009: Locked badges appear grayed out
 */

// Badge icon mappings
const BADGE_ICONS = {
  'lightbulb': '💡',
  'flame-small': '🔥',
  'flame-medium': '🔥',
  'flame-large': '🔥',
  'brain': '🧠',
  'trophy': '🏆',
  'thought-bubble': '💭'
}

// Badge icon sizes for flame variations
const BADGE_SIZES = {
  'flame-small': 'text-2xl',
  'flame-medium': 'text-3xl',
  'flame-large': 'text-4xl'
}

export default function AchievementBadge({
  badge,
  isUnlocked = false,
  unlockDate,
  size = 'md',
  showDetails = false
}) {
  if (!badge) return null

  const icon = BADGE_ICONS[badge.icon] || '🏅'
  const iconSize = BADGE_SIZES[badge.icon] || (size === 'lg' ? 'text-4xl' : 'text-2xl')

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  }

  const containerSize = sizeClasses[size] || sizeClasses.md

  return (
    <div
      className={`
        flex flex-col items-center gap-2
        ${isUnlocked ? '' : 'opacity-50'}
      `}
    >
      {/* Badge icon container */}
      <div
        className={`
          ${containerSize} rounded-full flex items-center justify-center
          ${isUnlocked
            ? 'bg-gradient-to-br from-primary/20 to-cyan-500/20 border-2 border-primary/50'
            : 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
          }
          ${isUnlocked ? 'shadow-lg' : 'grayscale'}
          transition-all duration-300
        `}
      >
        <span className={iconSize}>
          {isUnlocked ? icon : '🔒'}
        </span>
      </div>

      {/* Badge details */}
      {showDetails && (
        <div className="text-center">
          <p className={`
            text-sm font-medium
            ${isUnlocked ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'}
          `}>
            {badge.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[120px]">
            {badge.description}
          </p>
          {isUnlocked && unlockDate && (
            <p className="text-xs text-primary mt-1">
              Earned {new Date(unlockDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
