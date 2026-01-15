/**
 * TopicHeader Component
 *
 * Displays a divider card between topics with:
 * - Large centered emoji icon
 * - Topic name below the icon
 * - Horizontal divider line
 * - "Swipe to continue" hint at bottom
 *
 * Used as the first "slide" when starting a new topic to visually
 * separate content between different topics in the slideshow.
 */

/**
 * @typedef {Object} TopicHeaderProps
 * @property {string} icon - Emoji icon for the topic
 * @property {string} name - Topic name to display
 */

/**
 * Topic header card component for visual topic separation
 * @param {TopicHeaderProps} props
 */
function TopicHeader({ icon, name }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-8">
      {/* Large centered emoji icon */}
      <div
        className="text-8xl mb-6 select-none"
        role="img"
        aria-label={`${name} topic icon`}
      >
        {icon}
      </div>

      {/* Topic name */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
        {name}
      </h2>

      {/* Horizontal divider */}
      <div className="w-24 h-1 bg-primary rounded-full mb-8" />

      {/* Swipe hint at bottom */}
      <p className="text-sm text-gray-400 mt-auto">
        Swipe to continue
      </p>
    </div>
  )
}

export default TopicHeader
