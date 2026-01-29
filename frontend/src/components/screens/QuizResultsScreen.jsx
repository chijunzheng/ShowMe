/**
 * QuizResultsScreen component - Shows quiz results after completion
 * Displayed when uiState is QUIZ_RESULTS
 */

/**
 * @param {Object} props
 * @param {Object} props.results - Quiz results object
 * @param {number} props.results.percentage - Score percentage
 * @param {number} props.results.correctCount - Number of correct answers
 * @param {number} props.results.totalQuestions - Total number of questions
 * @param {Function} props.onContinue - Handler for continue button
 */
export default function QuizResultsScreen({ results, onContinue }) {
  const passed = results.percentage >= 60

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8 animate-fade-in">
      {/* Result icon */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
        passed
          ? 'bg-green-100 dark:bg-green-900/30'
          : 'bg-orange-100 dark:bg-orange-900/30'
      }`}>
        <span className="text-4xl">
          {passed ? '' : ''}
        </span>
      </div>

      {/* Score */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          {results.percentage}%
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {results.correctCount} of {results.totalQuestions} correct
        </p>
      </div>

      {/* Result message */}
      <p className={`text-lg font-medium ${
        passed
          ? 'text-green-600 dark:text-green-400'
          : 'text-orange-600 dark:text-orange-400'
      }`}>
        {passed
          ? 'Great job! You earned a new piece!'
          : 'Keep learning! Try again to unlock the piece.'}
      </p>

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
      >
        Continue
      </button>
    </div>
  )
}
