/**
 * QuizTab - Main container for Quiz/Review tab
 *
 * Switches between QuizHomeScreen (when user has topics) and EmptyState (when no topics yet).
 * Parent component handles actual quiz flow when onStartQuiz is called.
 */
import QuizHomeScreen from './QuizHomeScreen'
import EmptyState from './EmptyState'

/**
 * @param {Object} props
 * @param {Array} props.worldPieces - Array of world pieces (topics) user has unlocked
 * @param {Function} props.onStartQuiz - Callback when user starts a quiz, receives { mode, topic }
 * @param {Function} props.onNavigateToLearn - Callback to navigate to Learn tab
 * @param {Object} props.streak - Streak data { current: number, todayCompleted: boolean }
 */
export default function QuizTab({
  worldPieces = [],
  onStartQuiz,
  onNavigateToLearn,
  streak = { current: 0, todayCompleted: false },
}) {
  const isEmpty = worldPieces.length === 0

  if (isEmpty) {
    return <EmptyState onNavigateToLearn={onNavigateToLearn} />
  }

  return (
    <QuizHomeScreen
      worldPieces={worldPieces}
      onStartQuiz={onStartQuiz}
      streak={streak}
    />
  )
}
