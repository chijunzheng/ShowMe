/**
 * ThinkPrompts - Display thinking prompts to guide reasoning
 *
 * Shows helpful hints to guide the user's prediction without giving away answers
 */

/**
 * @param {Object} props
 * @param {Array<string>} props.hints - Thinking prompts to display
 */
export default function ThinkPrompts({ hints = [] }) {
  if (!hints || hints.length === 0) {
    return null
  }

  return (
    <div className="w-full max-w-3xl mb-8">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <span>💭</span>
        Think about...
      </h3>

      <div className="space-y-3">
        {hints.map((hint, index) => (
          <div
            key={index}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4"
          >
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {hint}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
