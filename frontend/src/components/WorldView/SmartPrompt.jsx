/**
 * SmartPrompt Component
 *
 * Context-aware prompt card that appears at the bottom of the World view.
 * Shows personalized guidance based on world state:
 * - Sleepy pieces needing review
 * - Streak maintenance
 * - Evolution opportunities
 * - Zone encouragement
 *
 * @module components/WorldView/SmartPrompt
 */

import { useMemo } from 'react'
import { calculateTopPrompt, getPromptUrgency, PROMPT_TYPES } from '../../utils/promptCalculator'

/**
 * Urgency-based styling configuration
 */
const URGENCY_STYLES = {
  high: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-300 dark:border-amber-600',
    iconBg: 'bg-amber-100 dark:bg-amber-800',
    button: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  medium: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
    border: 'border-indigo-300 dark:border-indigo-600',
    iconBg: 'bg-indigo-100 dark:bg-indigo-800',
    button: 'bg-indigo-500 hover:bg-indigo-600 text-white',
  },
  low: {
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-slate-100 dark:bg-slate-700',
    button: 'bg-slate-600 hover:bg-slate-700 text-white dark:bg-slate-500 dark:hover:bg-slate-400',
  },
}

/**
 * SmartPrompt - Contextual guidance card for World tab
 *
 * @param {Object} props - Component props
 * @param {Array} props.pieces - World pieces array
 * @param {Object} props.streak - Streak info { current: number, todayCompleted: boolean }
 * @param {string} props.tier - Current world tier
 * @param {number} props.totalPieces - Total piece count
 * @param {Function} props.onAction - Callback when action button is clicked
 * @param {string} [props.className] - Additional CSS classes
 */
function SmartPrompt({
  pieces = [],
  streak = {},
  tier,
  totalPieces = 0,
  onAction,
  className = '',
}) {
  // Calculate the top prompt based on world state
  const prompt = useMemo(
    () => calculateTopPrompt({ pieces, streak, tier, totalPieces }),
    [pieces, streak, tier, totalPieces]
  )

  // Get urgency level for styling
  const urgency = useMemo(
    () => getPromptUrgency(prompt.type),
    [prompt.type]
  )

  const styles = URGENCY_STYLES[urgency]

  /**
   * Handle action button click
   */
  const handleAction = () => {
    onAction?.(prompt.payload.actionType, prompt.payload)
  }

  return (
    <div
      data-testid="smart-prompt"
      className={`
        ${styles.bg}
        ${styles.border}
        border
        rounded-xl
        shadow-lg
        backdrop-blur-sm
        p-3
        flex items-center gap-3
        animate-fade-in
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <div
        className={`
          ${styles.iconBg}
          w-10 h-10
          rounded-full
          flex items-center justify-center
          flex-shrink-0
        `}
      >
        <span className="text-xl" role="img" aria-hidden="true">
          {prompt.icon}
        </span>
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
          {prompt.message}
        </p>
        {prompt.type === PROMPT_TYPES.REVIEW_URGENT && prompt.payload.pieces?.length > 1 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {prompt.payload.pieces.slice(0, 2).map(p => p.topicName || p.name).join(', ')}
            {prompt.payload.pieces.length > 2 && ` +${prompt.payload.pieces.length - 2} more`}
          </p>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={handleAction}
        className={`
          ${styles.button}
          px-4 py-2
          rounded-lg
          text-sm font-medium
          whitespace-nowrap
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
          active:scale-95
        `}
      >
        {prompt.action}
      </button>
    </div>
  )
}

export default SmartPrompt
