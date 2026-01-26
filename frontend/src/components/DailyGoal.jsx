/**
 * DailyGoal Component
 * v2.0: Displays daily learning goal progress
 * Shows questions asked today vs. daily target
 */

export default function DailyGoal({
  questionsToday = 0,
  dailyGoal = 3,
  className = ''
}) {
  const progress = Math.min(100, Math.round((questionsToday / dailyGoal) * 100))
  const isComplete = questionsToday >= dailyGoal
  const remaining = Math.max(0, dailyGoal - questionsToday)

  return (
    <div
      className={`
        p-4 rounded-2xl
        bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm
        shadow-md border border-gray-100 dark:border-slate-700
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{isComplete ? '🎯' : '📚'}</span>
          <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
            Daily Goal
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {questionsToday}/{dailyGoal}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete
              ? 'bg-gradient-to-r from-green-400 to-emerald-500'
              : 'bg-gradient-to-r from-primary to-cyan-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status text */}
      <p className="text-xs text-gray-600 dark:text-gray-400">
        {isComplete ? (
          <span className="text-green-500 font-medium">Goal complete! Keep exploring!</span>
        ) : (
          <span>
            {remaining} more {remaining === 1 ? 'topic' : 'topics'} to reach your goal
          </span>
        )}
      </p>
    </div>
  )
}
