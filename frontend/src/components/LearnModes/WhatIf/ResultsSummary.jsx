/**
 * ResultsSummary - Final results screen with score and XP
 *
 * Shows how many predictions were correct, awards XP with animation,
 * and provides Done/Retry buttons.
 */

import { useState, useEffect } from 'react'
import { vibrateSuccess } from '../../../utils/haptics'

/**
 * @param {Object} props
 * @param {number} props.correctCount - Number of correct predictions (0, 1, or 2)
 * @param {number} props.totalCorrect - Always 2
 * @param {number} props.xpEarned - XP to display
 * @param {Function} props.onComplete - Done callback
 * @param {Function} props.onRetry - Try another scenario callback
 */
export default function ResultsSummary({
  correctCount = 0,
  totalCorrect = 2,
  xpEarned = 0,
  onComplete,
  onRetry,
}) {
  const [showXpAnimation, setShowXpAnimation] = useState(false)

  // Trigger XP animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowXpAnimation(true)
      vibrateSuccess()
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  // Get message based on score
  const getMessage = () => {
    if (correctCount === totalCorrect) {
      return 'Perfect prediction!'
    } else if (correctCount === 1) {
      return 'Good thinking!'
    } else {
      return 'Keep exploring!'
    }
  }

  // Get emoji based on score
  const getEmoji = () => {
    if (correctCount === totalCorrect) {
      return '🎯'
    } else if (correctCount === 1) {
      return '⭐'
    } else {
      return '🔬'
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950">
      <div className="max-w-2xl w-full space-y-8 animate-fade-in">
        {/* Score Display */}
        <div className="text-center space-y-4">
          <div className="text-8xl animate-bounce-in">{getEmoji()}</div>

          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {getMessage()}
          </h2>

          <div className="inline-flex items-center gap-3 px-8 py-4 bg-white dark:bg-gray-800 rounded-2xl border-2 border-blue-200 dark:border-blue-700 shadow-lg">
            <span className="text-5xl font-bold text-blue-600 dark:text-blue-400">
              {correctCount}/{totalCorrect}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              correct
              <br />
              predictions
            </span>
          </div>
        </div>

        {/* XP Award with animation */}
        <div
          className={`transform transition-all duration-500 ${
            showXpAnimation ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
          }`}
        >
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-2xl p-6 shadow-xl text-center">
            <div className="text-sm font-medium opacity-90 mb-2">XP Earned</div>
            <div className="text-5xl font-bold">+{xpEarned}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onRetry}
            className="flex-1 px-8 py-4 rounded-full font-medium text-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
          >
            🔄 Try Another Scenario
          </button>

          <button
            onClick={onComplete}
            className="flex-1 px-8 py-4 rounded-full font-medium text-lg bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 active:scale-95"
          >
            ✓ Done
          </button>
        </div>
      </div>
    </div>
  )
}
