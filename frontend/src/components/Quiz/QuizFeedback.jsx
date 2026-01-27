/**
 * QuizFeedback Component
 * WB002/WB003: Per-question feedback display
 *
 * Features:
 * - Shows checkmark or X based on correctness
 * - Displays explanation text
 * - Shows correct answer if user was wrong
 * - Animated entry
 * - Continue button to proceed
 */

export default function QuizFeedback({
  isCorrect,
  isPartial = false,
  explanation,
  correctAnswer,
  userAnswer,
  onContinue
}) {
  // Get feedback icon and colors based on result
  const getFeedbackStyle = () => {
    if (isCorrect) {
      return {
        icon: (
          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        ),
        title: 'Correct!',
        titleColor: 'text-success',
        bgColor: 'bg-success/10',
        borderColor: 'border-success/30',
        iconBg: 'bg-success'
      }
    }

    if (isPartial) {
      return {
        icon: (
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        title: 'Almost there!',
        titleColor: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        iconBg: 'bg-yellow-500'
      }
    }

    return {
      icon: (
        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
        </svg>
      ),
      title: 'Not quite right',
      titleColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-500'
    }
  }

  const style = getFeedbackStyle()

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      {/* Feedback card */}
      <div className={`
        rounded-2xl p-6 border
        ${style.bgColor} ${style.borderColor}
      `}>
        {/* Icon and title */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`
            flex-shrink-0 w-14 h-14 rounded-full
            flex items-center justify-center
            ${style.iconBg} text-white
            animate-bounce-in
          `}>
            {style.icon}
          </div>
          <h3 className={`text-2xl font-bold ${style.titleColor}`}>
            {style.title}
          </h3>
        </div>

        {/* Explanation */}
        {explanation && (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            {explanation}
          </p>
        )}

        {/* User's answer (if wrong) */}
        {!isCorrect && userAnswer && (
          <div className="mb-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Your answer:
            </p>
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              {userAnswer}
            </p>
          </div>
        )}

        {/* Correct answer (if wrong or partial) */}
        {!isCorrect && correctAnswer && (
          <div className="p-3 bg-success/10 rounded-lg border border-success/20">
            <p className="text-sm text-success dark:text-success-400 mb-1">
              Correct answer:
            </p>
            <p className="text-success dark:text-success-400 font-semibold text-lg">
              {correctAnswer}
            </p>
          </div>
        )}
      </div>

      {/* Continue button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={onContinue}
          className="
            px-8 py-3 rounded-full font-medium
            bg-gradient-to-r from-primary to-cyan-500 text-white
            shadow-lg hover:shadow-xl
            transform hover:scale-105 active:scale-95
            transition-all duration-200
          "
        >
          Continue
        </button>
      </div>
    </div>
  )
}
