/**
 * ConsequenceReveal - Show matched and missed predictions with encouragement
 *
 * Displays user's predictions that matched expected consequences and
 * reveals missed consequences as learning opportunities (never punitive)
 */

/**
 * @param {Object} props
 * @param {string} props.userPrediction - The user's full prediction text
 * @param {Array} props.matchedPredictions - Predictions that matched { concept, userPhrase, feedback }
 * @param {Array} props.missedConsequences - Consequences not mentioned { concept, reveal }
 * @param {number} props.xpEarned - XP awarded (always positive)
 */
export default function ConsequenceReveal({
  userPrediction,
  matchedPredictions = [],
  missedConsequences = [],
  xpEarned = 10,
}) {
  const matchCount = matchedPredictions.length

  // Get encouragement message based on matches
  const getEncouragementMessage = () => {
    if (matchCount >= 3) {
      return 'Amazing scientific thinking!'
    } else if (matchCount === 2) {
      return 'Great predictions!'
    } else if (matchCount === 1) {
      return 'Good start! Here\'s more...'
    } else {
      return 'Interesting ideas! Let\'s see...'
    }
  }

  return (
    <div className="w-full max-w-3xl space-y-6">
      {/* XP Award Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-2xl shadow-xl">
          <span className="text-4xl">⭐</span>
          <div className="text-left">
            <div className="text-3xl font-bold">+{xpEarned} XP</div>
            <div className="text-sm opacity-90">{getEncouragementMessage()}</div>
          </div>
        </div>
      </div>

      {/* User's Prediction */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
          Your prediction:
        </h3>
        <p className="text-lg text-gray-800 dark:text-gray-100 leading-relaxed">
          "{userPrediction}"
        </p>
      </div>

      {/* Matched Predictions */}
      {matchedPredictions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span>✓</span>
            You got these right!
          </h3>

          {matchedPredictions.map((match, index) => (
            <div
              key={index}
              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                    "{match.userPhrase}"
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {match.feedback}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Missed Consequences (Learning Opportunities) */}
      {missedConsequences.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span>💡</span>
            Here's more to discover:
          </h3>

          {missedConsequences.map((consequence, index) => (
            <div
              key={index}
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="flex-1">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {consequence.reveal}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
