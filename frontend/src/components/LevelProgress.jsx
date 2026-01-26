/**
 * LevelProgress Component
 * v2.0: Displays user's current level and XP progress
 * Shows in the top bar alongside streak counter
 */

// Level tier colors matching LevelUpModal
const LEVEL_COLORS = {
  Curious: { bg: 'bg-emerald-500', text: 'text-emerald-500', gradient: 'from-emerald-400 to-teal-500' },
  Explorer: { bg: 'bg-blue-500', text: 'text-blue-500', gradient: 'from-blue-400 to-indigo-500' },
  Scholar: { bg: 'bg-purple-500', text: 'text-purple-500', gradient: 'from-purple-400 to-violet-500' },
  Expert: { bg: 'bg-amber-500', text: 'text-amber-500', gradient: 'from-amber-400 to-orange-500' },
  Master: { bg: 'bg-rose-500', text: 'text-rose-500', gradient: 'from-rose-400 to-red-500' }
}

export default function LevelProgress({
  levelInfo,
  compact = false,
  className = ''
}) {
  if (!levelInfo) return null

  const tierColors = LEVEL_COLORS[levelInfo.name] || LEVEL_COLORS.Curious

  if (compact) {
    // Compact version for top bar
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Level badge */}
        <div
          className={`
            flex items-center justify-center
            w-7 h-7 rounded-full
            bg-gradient-to-br ${tierColors.gradient}
            text-white text-xs font-bold
            shadow-sm
          `}
        >
          {levelInfo.level}
        </div>

        {/* Level name and XP (hidden on very small screens) */}
        <div className="hidden sm:flex flex-col">
          <span className={`text-xs font-medium ${tierColors.text}`}>
            {levelInfo.name}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            {levelInfo.totalXP} XP
          </span>
        </div>
      </div>
    )
  }

  // Full version with progress bar
  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-1">
        {/* Level info */}
        <div className="flex items-center gap-2">
          <div
            className={`
              flex items-center justify-center
              w-8 h-8 rounded-full
              bg-gradient-to-br ${tierColors.gradient}
              text-white text-sm font-bold
              shadow-md
            `}
          >
            {levelInfo.level}
          </div>
          <div>
            <span className={`font-semibold ${tierColors.text}`}>
              {levelInfo.name}
            </span>
          </div>
        </div>

        {/* XP count */}
        <div className="text-right">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {levelInfo.currentXP} / {levelInfo.nextLevelXP} XP
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${tierColors.gradient} rounded-full transition-all duration-500`}
          style={{ width: `${levelInfo.progress}%` }}
        />
      </div>

      {/* Total XP */}
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
        Total: {levelInfo.totalXP} XP
      </div>
    </div>
  )
}
