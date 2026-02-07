/**
 * BonusFactCard - Display bonus mind-expanding fact
 *
 * Shows an interesting extra fact related to the scenario
 */

/**
 * @param {Object} props
 * @param {string} props.fact - The bonus fact to display
 */
export default function BonusFactCard({ fact }) {
  if (!fact) {
    return null
  }

  return (
    <div className="w-full max-w-3xl mt-6">
      <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-300 dark:border-purple-700 rounded-2xl p-6 shadow-xl">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 text-4xl">🎁</div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-purple-700 dark:text-purple-300 mb-2">
              Bonus Mind-Expanding Fact
            </h3>
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
              {fact}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
