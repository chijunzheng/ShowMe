/**
 * QuizPromptScreen component - Wrapper for quiz prompt before quiz starts
 * Displayed when uiState is QUIZ_PROMPT and activeTab is 'learn'
 */
import QuizPrompt from '../QuizPrompt.jsx'

/**
 * @param {Object} props
 * @param {string} props.topicName - Name of the topic for the quiz
 * @param {Function} props.onStart - Handler when user starts the quiz
 * @param {Function} props.onSkip - Handler when user skips the quiz
 * @param {boolean} props.isLoading - Whether quiz questions are being loaded
 */
export default function QuizPromptScreen({
  topicName,
  onStart,
  onSkip,
  isLoading,
}) {
  return (
    <QuizPrompt
      topicName={topicName}
      onStart={onStart}
      onSkip={onSkip}
      isLoading={isLoading}
    />
  )
}
