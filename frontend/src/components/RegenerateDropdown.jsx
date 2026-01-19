import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * RegenerateDropdown - Dropdown for regenerating slides at different explanation levels
 *
 * Shows a regenerate icon button that opens a dropdown with level options.
 * When a level is selected, triggers regeneration and shows loading state.
 *
 * @param {Object} props - Component props
 * @param {Object} props.levelConfig - Level configuration object with icons/titles/descriptions
 * @param {string} props.currentLevel - Currently active explanation level
 * @param {Function} props.onRegenerate - Callback when level is selected, receives level string
 * @param {boolean} props.isRegenerating - Whether regeneration is in progress
 * @param {boolean} props.disabled - Whether the dropdown should be disabled
 */
function RegenerateDropdown({
  levelConfig,
  currentLevel,
  onRegenerate,
  isRegenerating = false,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)

  /**
   * Handle click outside to close dropdown
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  /**
   * Close dropdown on Escape key
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  /**
   * Toggle dropdown open/closed
   */
  const handleToggle = useCallback(() => {
    if (!disabled && !isRegenerating) {
      setIsOpen((prev) => !prev)
    }
  }, [disabled, isRegenerating])

  /**
   * Handle level selection
   */
  const handleSelectLevel = useCallback(
    (level) => {
      if (onRegenerate && !isRegenerating) {
        onRegenerate(level)
        setIsOpen(false)
      }
    },
    [onRegenerate, isRegenerating]
  )

  return (
    <div className="relative inline-block">
      {/* Regenerate button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={disabled || isRegenerating}
        className={`
          flex items-center justify-center
          w-8 h-8 rounded-full
          transition-all duration-200
          ${isRegenerating
            ? 'bg-gray-100 text-gray-400 cursor-wait'
            : disabled
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary'
          }
        `}
        aria-label={isRegenerating ? 'Regenerating...' : 'Regenerate with different level'}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {isRegenerating ? (
          // Loading spinner
          <svg
            className="w-4 h-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          // Regenerate icon (circular arrow)
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}
      </button>

      {/* Dropdown menu - opens upward and centered to avoid overflow */}
      {isOpen && !isRegenerating && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-fade-in"
          role="listbox"
          aria-label="Select explanation level"
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Regenerate as
            </p>
          </div>

          {Object.entries(levelConfig).map(([level, config]) => {
            const isCurrentLevel = level === currentLevel
            return (
              <button
                key={level}
                onClick={() => handleSelectLevel(level)}
                role="option"
                aria-selected={isCurrentLevel}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5
                  text-left transition-colors
                  ${isCurrentLevel
                    ? 'bg-primary/5 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {/* Level icon */}
                <span className="text-lg flex-shrink-0">{config.icon}</span>

                {/* Level info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isCurrentLevel ? 'text-primary' : 'text-gray-900'}`}>
                      {config.title}
                    </span>
                    {isCurrentLevel && (
                      <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                        current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{config.description}</p>
                </div>

                {/* Checkmark for current level */}
                {isCurrentLevel && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-primary flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default RegenerateDropdown
