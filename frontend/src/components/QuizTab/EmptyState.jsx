/**
 * EmptyState - Shown when user has no topics to quiz
 *
 * Displays a friendly message encouraging user to complete a lesson first,
 * with a CTA button to navigate to the Learn tab.
 */

/**
 * @param {Object} props
 * @param {Function} props.onNavigateToLearn - Callback to navigate to Learn tab
 */
export default function EmptyState({ onNavigateToLearn }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      {/* Illustration */}
      <div className="text-6xl mb-6 animate-bounce-in">
        &#x1F331;
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
        Your garden awaits
      </h2>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xs">
        Complete a lesson to unlock your first quiz topic!
      </p>

      {/* CTA Button */}
      <button
        onClick={onNavigateToLearn}
        className="
          px-6 py-3 rounded-2xl
          bg-gradient-primary text-white
          font-semibold text-lg
          shadow-lg hover:shadow-xl
          transform hover:scale-105
          transition-all duration-200
          flex items-center gap-2
        "
      >
        Go to Learn
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  )
}
