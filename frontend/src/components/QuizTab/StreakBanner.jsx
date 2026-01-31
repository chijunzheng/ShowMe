/**
 * StreakBanner - Shows daily streak at top of Quiz tab
 *
 * Displays current streak count and whether today's quiz is completed.
 * Uses gradient backgrounds based on completion state.
 */

/**
 * @param {Object} props
 * @param {Object} props.streak - Streak data { current: number, todayCompleted: boolean }
 */
export default function StreakBanner({ streak = { current: 0, todayCompleted: false } }) {
  const { current, todayCompleted } = streak

  return (
    <div className={`
      mx-auto my-4 p-4 rounded-2xl
      ${todayCompleted
        ? 'bg-gradient-to-r from-success-100 to-success-50 dark:from-success-900/30 dark:to-success-800/20'
        : 'bg-gradient-to-r from-accent/20 to-accent/10 dark:from-accent/30 dark:to-accent/20'
      }
      border ${todayCompleted ? 'border-success-200 dark:border-success-700' : 'border-accent/30 dark:border-accent/40'}
    `}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">
            {current > 0 ? '\u{1F525}' : '\u2728'}
          </span>
          <div>
            <p className="font-bold text-lg text-gray-800 dark:text-gray-100">
              {current > 0 ? `${current} Day Streak!` : 'Start a Streak'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {todayCompleted
                ? "Great job today! Come back tomorrow"
                : "Complete a quiz to keep your streak"}
            </p>
          </div>
        </div>
        {todayCompleted && (
          <span className="text-2xl">{'\u2705'}</span>
        )}
      </div>
    </div>
  )
}
