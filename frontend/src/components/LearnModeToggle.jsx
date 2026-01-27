/**
 * LearnModeToggle Component (UI003)
 *
 * A toggle switch for selecting between Quick and Full learning modes.
 * - Quick mode: Slideshow only, no quiz
 * - Full mode: Slideshow + quiz for knowledge retention and piece unlocking
 *
 * @param {Object} props - Component props
 * @param {'quick' | 'full'} props.mode - Current learn mode
 * @param {Function} props.onChange - Callback when mode changes
 */

export default function LearnModeToggle({ mode = 'full', onChange }) {
  const handleToggle = (newMode) => {
    if (onChange && newMode !== mode) {
      onChange(newMode)
    }
  }

  return (
    <div
      className="inline-flex items-center bg-gray-100 dark:bg-slate-700 rounded-full p-1"
      role="radiogroup"
      aria-label="Learning mode"
    >
      {/* Quick mode option */}
      <button
        onClick={() => handleToggle('quick')}
        role="radio"
        aria-checked={mode === 'quick'}
        className={`
          relative px-4 py-2 rounded-full text-sm font-medium
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1
          ${mode === 'quick'
            ? 'bg-white dark:bg-slate-600 text-gray-800 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }
        `}
      >
        <span className="flex items-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Quick
        </span>
      </button>

      {/* Full mode option */}
      <button
        onClick={() => handleToggle('full')}
        role="radio"
        aria-checked={mode === 'full'}
        className={`
          relative px-4 py-2 rounded-full text-sm font-medium
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1
          ${mode === 'full'
            ? 'bg-white dark:bg-slate-600 text-gray-800 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }
        `}
      >
        <span className="flex items-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Full
        </span>
      </button>
    </div>
  )
}
