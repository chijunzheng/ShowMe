/**
 * DetectiveReward - Celebration screen for mystery completion
 *
 * Shows celebration for solving the mystery or learning from the solution.
 * Displays XP earned and the full solution explanation.
 */

import MicroCelebration from '../../Quiz/MicroCelebration'
import { useState, useEffect } from 'react'

/**
 * @param {Object} props
 * @param {boolean} props.solved - Whether mystery was solved (vs viewed solution)
 * @param {number} props.xpEarned - XP earned (50 for solve, 5 for view solution)
 * @param {string} props.solutionExplanation - Full explanation of the mystery solution
 * @param {Function} props.onContinue - Callback to continue/exit
 */
export default function DetectiveReward({
  solved = false,
  xpEarned = 0,
  solutionExplanation = '',
  onContinue,
}) {
  const [showCelebration, setShowCelebration] = useState(false)

  // Show celebration animation on mount if solved
  useEffect(() => {
    if (solved) {
      setShowCelebration(true)
    }
  }, [solved])

  const handleCelebrationComplete = () => {
    setShowCelebration(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950">
      {/* Micro Celebration Animation */}
      {showCelebration && (
        <MicroCelebration
          isActive={showCelebration}
          xpGained={xpEarned}
          onComplete={handleCelebrationComplete}
        />
      )}

      <div className="max-w-2xl w-full space-y-6 animate-fade-in">
        {/* Badge/Icon */}
        <div className="text-center">
          <div className="text-8xl mb-4 animate-bounce">
            {solved ? '🎉' : '📖'}
          </div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            {solved ? 'Mystery Solved!' : 'Mystery Revealed'}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {solved
              ? 'You cracked the case like a true detective!'
              : "Here's what was really happening..."}
          </p>
        </div>

        {/* XP Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-success-100 dark:bg-success-900/30 rounded-full border-2 border-success-300 dark:border-success-700">
            <svg className="w-6 h-6 text-success-600 dark:text-success-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <span className="text-success-600 dark:text-success-400 font-bold text-xl">
              +{xpEarned} XP
            </span>
          </div>
        </div>

        {/* Solution Explanation */}
        {solutionExplanation && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl flex-shrink-0">💡</span>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                The Solution
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {solutionExplanation}
            </p>
          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={onContinue}
            className="px-8 py-4 rounded-full font-medium text-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
