/**
 * QuizModeSelector - Choose between Quick, Deep, Challenge modes
 *
 * Displays three mode options in a grid:
 * - Quick Review: 3 questions for fast practice
 * - Deep Practice: 10 questions for thorough review
 * - Challenge: 5 mixed topics for variety
 */

const MODES = [
  {
    id: 'quick',
    icon: '\u26A1',
    label: 'Quick Review',
    description: '3 questions',
    color: 'bg-primary-50 border-primary-200 dark:bg-primary/20 dark:border-primary/40',
  },
  {
    id: 'deep',
    icon: '\u{1F3AF}',
    label: 'Deep Practice',
    description: '10 questions',
    color: 'bg-success-50 border-success-200 dark:bg-success/20 dark:border-success/40',
  },
  {
    id: 'challenge',
    icon: '\u{1F3C6}',
    label: 'Challenge',
    description: '5 mixed topics',
    color: 'bg-accent/10 border-accent/30 dark:bg-accent/20 dark:border-accent/40',
  },
]

/**
 * @param {Object} props
 * @param {Function} props.onSelectMode - Callback when mode is selected, receives mode id
 * @param {boolean} props.disabled - Whether selector is disabled (no topics)
 */
export default function QuizModeSelector({ onSelectMode, disabled = false }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {MODES.map(mode => (
        <button
          key={mode.id}
          onClick={() => onSelectMode(mode.id)}
          disabled={disabled}
          className={`
            p-4 rounded-2xl border-2 text-center
            transition-all duration-200
            ${mode.color}
            ${disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:scale-105 hover:shadow-lg active:scale-95'
            }
          `}
        >
          <span className="text-2xl block mb-1">{mode.icon}</span>
          <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{mode.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{mode.description}</p>
        </button>
      ))}
    </div>
  )
}
