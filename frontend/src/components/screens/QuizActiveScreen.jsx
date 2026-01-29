/**
 * QuizActiveScreen component - Wrapper for active quiz questions
 * Displayed when uiState is QUIZ and activeTab is 'learn'
 */
import Quiz from '../Quiz/index.jsx'

/**
 * @param {Object} props
 * @param {Array} props.questions - Quiz questions to display
 * @param {Function} props.onComplete - Handler when quiz is completed
 * @param {Function} props.onSkip - Handler when user skips the quiz
 */
export default function QuizActiveScreen({
  questions,
  onComplete,
  onSkip,
}) {
  return (
    <Quiz
      questions={questions}
      onComplete={onComplete}
      onSkip={onSkip}
    />
  )
}
