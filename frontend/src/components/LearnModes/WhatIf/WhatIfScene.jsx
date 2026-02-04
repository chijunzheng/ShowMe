/**
 * WhatIfScene - Display the dramatic "What If?" scenario
 *
 * Shows the counterfactual question with an optional dramatic visual
 */

/**
 * @param {Object} props
 * @param {string} props.scenario - The "what if?" question
 * @param {string} props.imageUrl - Optional dramatic visual URL
 */
export default function WhatIfScene({ scenario, imageUrl }) {
  return (
    <div className="w-full max-w-3xl mb-8">
      {/* Scenario Image */}
      {imageUrl && (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-6 shadow-2xl">
          <img
            src={imageUrl}
            alt="Scenario visualization"
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      )}

      {/* Scenario Question */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-blue-200 dark:border-blue-900">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 text-5xl">🌟</div>

          {/* Text */}
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 mb-2">
              Wonder Lab
            </h2>
            <p className="text-xl md:text-2xl text-gray-800 dark:text-gray-100 leading-relaxed">
              {scenario}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
