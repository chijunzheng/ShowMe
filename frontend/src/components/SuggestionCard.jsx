/**
 * SuggestionCard - Displays a follow-up question suggestion with queue toggle
 *
 * Each card shows a question text and an icon that toggles between [+] (not queued)
 * and [checkmark] (queued). Tapping the card adds the question to the queue,
 * providing a seamless way to explore related topics after the current slideshow.
 *
 * @param {Object} props - Component props
 * @param {string} props.question - The suggested question text
 * @param {boolean} props.isQueued - Whether this question is already in the queue
 * @param {Function} props.onToggleQueue - Callback when user taps to toggle queue status
 */
function SuggestionCard({ question, isQueued, onToggleQueue }) {
  // Guard against missing question
  if (!question) {
    return null
  }

  /**
   * Handle card click - toggle the queue status
   * Prevents event bubbling to avoid triggering parent handlers
   */
  const handleClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (onToggleQueue) {
      onToggleQueue(question)
    }
  }

  /**
   * Handle keyboard interaction for accessibility
   * Supports Enter and Space keys
   */
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick(event)
    }
  }

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        flex items-center justify-between w-full px-4 py-3
        bg-surface border rounded-lg
        transition-all duration-200 cursor-pointer
        hover:bg-gray-50 hover:border-primary/50
        focus:outline-none focus:ring-2 focus:ring-primary/50
        ${isQueued ? 'border-accent bg-accent/5' : 'border-gray-200'}
      `}
      aria-pressed={isQueued}
      aria-label={isQueued ? `${question} - queued` : `${question} - tap to queue`}
    >
      {/* Question text */}
      <span className="text-left text-gray-700 pr-3">
        {question}
      </span>

      {/* Toggle icon - plus or checkmark */}
      <span
        className={`
          flex-shrink-0 w-6 h-6 flex items-center justify-center
          rounded-full text-sm font-bold
          transition-colors duration-200
          ${isQueued
            ? 'bg-accent text-white'
            : 'bg-primary/10 text-primary'
          }
        `}
        aria-hidden="true"
      >
        {isQueued ? (
          // Checkmark icon (Unicode checkmark)
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          // Plus icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        )}
      </span>
    </button>
  )
}

export default SuggestionCard
