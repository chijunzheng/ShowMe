/**
 * QuickActionBar Component
 *
 * A floating action bar that appears on long-press or double-tap of a world piece,
 * providing quick actions for the selected piece.
 *
 * Actions:
 * - Review (book icon) - Navigate to review slides
 * - Quiz (lightning icon) - Start a quiz for the piece
 * - Related (link icon) - Show related topics
 * - Suggestions (compass icon) - Open suggestions panel
 *
 * Features:
 * - Positioned at screen coordinates via position prop
 * - Zone-specific styling (nature=green, civilization=indigo, arcane=purple)
 * - Keyboard accessible (Enter/Space for actions, Escape to close)
 * - Optional auto-dismiss timeout
 * - Backdrop dismisses on click
 * - Entrance/exit animations
 */

import { useCallback, useEffect } from 'react'

/**
 * Zone-specific accent configurations
 * Each zone has distinct visual characteristics
 */
const ZONE_ACCENTS = {
  nature: {
    accent: 'text-green-600',
    accentBg: 'bg-green-100',
    border: 'border-green-200',
    hoverBg: 'hover:bg-green-50',
  },
  civilization: {
    accent: 'text-indigo-600',
    accentBg: 'bg-indigo-100',
    border: 'border-indigo-200',
    hoverBg: 'hover:bg-indigo-50',
  },
  arcane: {
    accent: 'text-purple-600',
    accentBg: 'bg-purple-100',
    border: 'border-purple-200',
    hoverBg: 'hover:bg-purple-50',
  },
}

/**
 * Default fallback accent for unknown zones
 */
const DEFAULT_ZONE_ACCENT = {
  accent: 'text-slate-600',
  accentBg: 'bg-slate-100',
  border: 'border-slate-200',
  hoverBg: 'hover:bg-slate-50',
}

/**
 * Action button configuration
 * Each action has an id, label, icon, and aria-label
 */
const ACTIONS = [
  {
    id: 'review',
    label: 'Review',
    ariaLabel: 'review slides',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: 'quiz',
    label: 'Quiz',
    ariaLabel: 'start quiz',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: 'related',
    label: 'Related',
    ariaLabel: 'show related topics',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    id: 'suggestions',
    label: 'Suggestions',
    ariaLabel: 'open suggestions',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
]

/**
 * ActionButton - Individual action button within the bar
 */
function ActionButton({
  action,
  zoneAccent,
  onClick,
  animationDelay,
}) {
  /**
   * Handle button click - trigger action callback
   */
  const handleClick = useCallback(() => {
    onClick?.(action.id)
  }, [onClick, action.id])

  /**
   * Handle keyboard activation
   */
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }, [handleClick])

  return (
    <button
      type="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        flex flex-col items-center justify-center
        w-14 h-14 p-2
        rounded-lg
        ${zoneAccent.accent}
        ${zoneAccent.hoverBg}
        transition-all duration-200 ease-out
        hover:scale-110
        active:scale-95
        focus:outline-none focus:ring-2 focus:ring-primary/50
        animate-fade-in
      `}
      style={{ animationDelay: `${animationDelay}ms` }}
      aria-label={action.ariaLabel}
    >
      {action.icon}
      <span className="text-xs mt-1 font-medium">{action.label}</span>
    </button>
  )
}

/**
 * CloseButton - X button to dismiss the action bar
 */
function CloseButton({ onClick }) {
  /**
   * Handle keyboard activation
   */
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick?.()
    }
  }, [onClick])

  return (
    <button
      type="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`
        flex items-center justify-center
        w-6 h-6 p-1
        rounded-full
        text-slate-400
        hover:text-slate-600 hover:bg-slate-100
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-primary/50
      `}
      aria-label="close action bar"
    >
      <span className="sr-only">×</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )
}

/**
 * QuickActionBar - Floating action bar for quick piece actions
 *
 * @param {Object} props - Component props
 * @param {Object} props.piece - The piece data
 * @param {string} props.piece.id - Unique piece identifier
 * @param {string} props.piece.name - Display name for the piece
 * @param {string} [props.piece.zone] - Zone type (nature, civilization, arcane)
 * @param {string} [props.piece.icon] - Emoji icon for the piece
 * @param {Object} props.position - Screen position for the bar
 * @param {number} props.position.x - X coordinate (left offset)
 * @param {number} props.position.y - Y coordinate (top offset)
 * @param {Function} [props.onAction] - Callback when an action is triggered
 * @param {Function} props.onClose - Callback to close the bar
 * @param {number} [props.dismissAfter] - Optional auto-dismiss timeout in milliseconds
 */
function QuickActionBar({
  piece,
  position,
  onAction,
  onClose,
  dismissAfter,
}) {
  // Handle undefined zone gracefully
  const zone = piece?.zone || 'nature'
  const zoneAccent = ZONE_ACCENTS[zone] || DEFAULT_ZONE_ACCENT

  /**
   * Handle action button click
   * Triggers the action callback and closes the bar
   */
  const handleAction = useCallback((actionId) => {
    onAction?.(actionId)
    onClose?.()
  }, [onAction, onClose])

  /**
   * Handle toolbar click - prevent propagation to backdrop
   */
  const handleToolbarClick = useCallback((event) => {
    event.stopPropagation()
  }, [])

  /**
   * Handle Escape key to close
   */
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  /**
   * Auto-dismiss after timeout if dismissAfter is specified
   */
  useEffect(() => {
    if (typeof dismissAfter !== 'number' || dismissAfter <= 0) {
      return
    }

    const timeoutId = setTimeout(() => {
      onClose?.()
    }, dismissAfter)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [dismissAfter, onClose])

  return (
    <>
      {/* Backdrop overlay */}
      <div
        data-testid="quick-action-backdrop"
        className="fixed inset-0 z-40 bg-black/10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Action bar toolbar */}
      <div
        role="toolbar"
        aria-label={`Quick actions for ${piece?.name || 'piece'}`}
        className={`
          fixed z-50
          flex flex-col
          bg-white
          rounded-xl
          shadow-lg
          border ${zoneAccent.border}
          p-3
          transform -translate-x-1/2
          transition-all duration-300 ease-out
          animate-fade-in
        `}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onClick={handleToolbarClick}
      >
        {/* Header with piece name and close button */}
        <div
          data-testid="quick-action-header"
          className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100"
        >
          <div className="flex items-center gap-2">
            {piece?.icon && (
              <span className="text-lg" aria-hidden="true">
                {piece.icon}
              </span>
            )}
            <span className={`font-medium text-sm ${zoneAccent.accent} truncate max-w-[150px]`}>
              {piece?.name || ''}
            </span>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {/* Action buttons row */}
        <div
          data-testid="quick-action-buttons"
          className="flex gap-1"
        >
          {ACTIONS.map((action, index) => (
            <ActionButton
              key={action.id}
              action={action}
              zoneAccent={zoneAccent}
              onClick={handleAction}
              animationDelay={index * 50}
            />
          ))}
        </div>
      </div>
    </>
  )
}

export default QuickActionBar
