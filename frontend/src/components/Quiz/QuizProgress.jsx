/**
 * QuizProgress Component
 * WB002/WB003: Shows progress through quiz questions
 *
 * Features:
 * - Displays current question number and total
 * - Shows question type with icon
 * - Animated progress bar
 */

const QUESTION_TYPE_CONFIG = {
  mcq: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    label: 'Multiple Choice'
  },
  fill_blank: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    label: 'Fill in the Blank'
  },
  true_false: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'True or False'
  }
}

export default function QuizProgress({ current, total, questionType = 'mcq' }) {
  const config = QUESTION_TYPE_CONFIG[questionType] || QUESTION_TYPE_CONFIG.mcq
  const progressPercent = ((current) / total) * 100

  return (
    <div className="w-full mb-6">
      {/* Top row: Question type and counter */}
      <div className="flex items-center justify-between mb-2">
        {/* Question type badge */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="text-primary">{config.icon}</span>
          <span className="font-medium">{config.label}</span>
        </div>

        {/* Question counter */}
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {current}
          </span>
          <span className="text-gray-400 dark:text-gray-500">/</span>
          <span className="text-gray-500 dark:text-gray-400">
            {total}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-cyan-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Progress dots (alternative visualization) */}
      <div className="flex justify-center gap-1.5 mt-3">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`
              w-2 h-2 rounded-full transition-all duration-300
              ${i < current
                ? 'bg-primary scale-100'
                : i === current
                  ? 'bg-primary/50 scale-125'
                  : 'bg-gray-300 dark:bg-slate-600 scale-100'
              }
            `}
          />
        ))}
      </div>
    </div>
  )
}
