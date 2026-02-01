/**
 * WorldFAB Component
 *
 * Floating Action Button for the World tab that expands to show actions:
 * - Ask New Question (mic) - Go to Learn tab
 * - Quick Quiz (lightning) - Random piece quiz
 * - Explore Suggestions (compass) - Open suggestions panel
 *
 * @module components/WorldView/WorldFAB
 */

import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * FAB action definitions
 */
const FAB_ACTIONS = [
  {
    id: 'learn',
    icon: '🎤',
    label: 'Learn New',
    description: 'Ask a question',
  },
  {
    id: 'quick_quiz',
    icon: '⚡',
    label: 'Quick Quiz',
    description: 'Random topic',
  },
  {
    id: 'suggestions',
    icon: '🧭',
    label: 'Suggestions',
    description: 'What to learn next',
  },
]

/**
 * WorldFAB - Floating action button with expandable menu
 *
 * @param {Object} props - Component props
 * @param {Function} props.onAction - Callback when an action is selected
 * @param {boolean} [props.disabled=false] - Whether FAB is disabled
 * @param {string} [props.className] - Additional CSS classes
 */
function WorldFAB({ onAction, disabled = false, className = '' }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const fabRef = useRef(null)

  /**
   * Toggle expanded state
   */
  const toggleExpanded = useCallback(() => {
    if (!disabled) {
      setIsExpanded(prev => !prev)
    }
  }, [disabled])

  /**
   * Handle action selection
   */
  const handleAction = useCallback((actionId) => {
    setIsExpanded(false)
    onAction?.(actionId)
  }, [onAction])

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      setIsExpanded(false)
    }
  }, [])

  /**
   * Close menu when clicking outside
   */
  useEffect(() => {
    if (!isExpanded) return

    const handleClickOutside = (event) => {
      if (fabRef.current && !fabRef.current.contains(event.target)) {
        setIsExpanded(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded])

  return (
    <div
      ref={fabRef}
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Expanded Menu */}
      {isExpanded && (
        <div
          className="
            absolute bottom-16 right-0
            bg-white dark:bg-slate-800
            rounded-xl
            shadow-xl
            border border-slate-200 dark:border-slate-700
            overflow-hidden
            animate-slide-up
            min-w-[180px]
          "
          role="menu"
          aria-label="World actions"
        >
          {FAB_ACTIONS.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className={`
                w-full
                flex items-center gap-3
                px-4 py-3
                text-left
                hover:bg-slate-50 dark:hover:bg-slate-700
                transition-colors duration-150
                focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-700
                ${index !== FAB_ACTIONS.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''}
              `}
              role="menuitem"
            >
              <span className="text-xl" role="img" aria-hidden="true">
                {action.icon}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {action.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {action.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={toggleExpanded}
        disabled={disabled}
        className={`
          w-14 h-14
          rounded-full
          bg-indigo-500 hover:bg-indigo-600
          dark:bg-indigo-600 dark:hover:bg-indigo-500
          shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isExpanded ? 'rotate-45 bg-slate-500 hover:bg-slate-600' : ''}
        `}
        aria-label={isExpanded ? 'Close menu' : 'Open world actions'}
        aria-expanded={isExpanded}
        aria-haspopup="menu"
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  )
}

export default WorldFAB
