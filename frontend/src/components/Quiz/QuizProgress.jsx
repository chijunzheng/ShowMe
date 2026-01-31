/**
 * QuizProgress Component
 * WB002/WB003: Shows progress through quiz challenges
 *
 * Features:
 * - Displays "Challenge X" counter with "Boss Challenge!" for final question
 * - Shows game-like question type labels
 * - Animated progress bar
 */

import { getChallengeLabel, getGameTypeLabel } from './quizMessages'

const QUESTION_TYPE_CONFIG = {
  mcq: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    label: 'Pick the Answer'
  },
  fill_blank: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    label: 'Fill the Gap'
  },
  true_false: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'True or False'
  },
  voice: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    label: 'Speak Up'
  }
}

export default function QuizProgress({ current, total, questionType = 'mcq' }) {
  const config = QUESTION_TYPE_CONFIG[questionType] || QUESTION_TYPE_CONFIG.mcq
  const progressPercent = ((current) / total) * 100
  const isBossChallenge = current === total
  const challengeLabel = getChallengeLabel(current, total)

  return (
    <div className="w-full mb-6">
      {/* Top row: Question type and challenge counter */}
      <div className="flex items-center justify-between mb-2">
        {/* Question type badge */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="text-primary">{config.icon}</span>
          <span className="font-medium">{config.label}</span>
        </div>

        {/* Challenge counter */}
        <div className={`
          flex items-center gap-1.5 px-3 py-1 rounded-full
          ${isBossChallenge
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold animate-pulse'
            : 'bg-gray-100 dark:bg-slate-700'
          }
        `}>
          {isBossChallenge && <span className="text-sm">&#128293;</span>}
          <span className={`
            text-sm font-semibold
            ${isBossChallenge ? 'text-white' : 'text-gray-800 dark:text-gray-200'}
          `}>
            {challengeLabel}
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
