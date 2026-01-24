/**
 * SectionDivider Component
 *
 * Displays a visual divider card between follow-up sections with:
 * - Animated magnifying glass icon (pulsing)
 * - "Diving deeper into..." label
 * - The follow-up question text (bold, prominent)
 * - Animated bouncing arrow
 * - "Swipe to explore" hint
 *
 * Used as a "chapter marker" when users ask follow-up questions,
 * creating clear visual hierarchy in the learning journey.
 */

/**
 * @typedef {Object} SectionDividerProps
 * @property {string} question - The follow-up question text to display
 */

/**
 * Section divider card component for visual follow-up separation
 * @param {SectionDividerProps} props
 */
function SectionDivider({ question }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-pink-500/10 rounded-xl p-8">
      {/* Animated magnifying glass icon */}
      <div
        className="text-6xl mb-4 animate-pulse select-none"
        role="img"
        aria-label="Diving deeper icon"
      >
        🔍
      </div>

      {/* Label */}
      <p className="text-sm font-medium text-indigo-600 uppercase tracking-wider mb-2">
        Diving deeper into...
      </p>

      {/* Question text - bold and prominent */}
      <h2 className="text-xl font-bold text-gray-800 mb-6 text-center max-w-md leading-relaxed">
        {question}
      </h2>

      {/* Animated arrow */}
      <div className="text-2xl text-indigo-500 animate-bounce" aria-hidden="true">
        ↓
      </div>

      {/* Hint */}
      <p className="text-sm text-gray-400 mt-auto">
        Swipe to explore
      </p>
    </div>
  )
}

export default SectionDivider
