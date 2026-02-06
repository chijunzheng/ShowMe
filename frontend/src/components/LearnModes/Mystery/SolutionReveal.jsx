/**
 * SolutionReveal - Solution reveal screen for Mystery Lab
 *
 * Shows evaluation result, solution explanation, matched concepts, and XP earned.
 * Scene image displayed as faded background with gradient overlay.
 */

import { useState, useEffect } from 'react'
import { vibrateShort } from '../../../utils/haptics'

/**
 * @param {Object} props
 * @param {string} props.solutionExplanation - Full explanation of the mystery solution
 * @param {string} props.revealNarration - TTS narration text for the reveal
 * @param {string|null} props.sceneImage - URL to manga scene image
 * @param {Object} props.evaluationResult - Evaluation data
 * @param {boolean} props.evaluationResult.isCorrect - Whether solution was correct
 * @param {string[]} props.evaluationResult.matchedConcepts - Array of matched concepts
 * @param {number} props.evaluationResult.xpEarned - XP earned
 * @param {string} props.evaluationResult.feedback - Additional feedback text
 * @param {Function} props.onCelebrate - "Continue" button callback
 */
export default function SolutionReveal({
  solutionExplanation,
  revealNarration: _revealNarration, // Reserved for future TTS integration
  sceneImage = null,
  evaluationResult = null,
  onCelebrate,
}) {
  const [showXp, setShowXp] = useState(false)

  // Delay XP animation for dramatic effect
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowXp(true)
    }, 500)
    return () => clearTimeout(timeout)
  }, [])

  const handleContinue = () => {
    vibrateShort()
    onCelebrate()
  }

  const isCorrect = evaluationResult?.isCorrect ?? false
  const matchedConcepts = evaluationResult?.matchedConcepts ?? []
  const xpEarned = evaluationResult?.xpEarned ?? 0

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-6 py-12 overflow-hidden">
      {/* Background Scene Image - Faded */}
      {sceneImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${sceneImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/95 via-white/95 to-indigo-50/95 dark:from-gray-900/95 dark:via-gray-800/95 dark:to-purple-950/95" />
        </>
      )}

      {/* Content - Above background */}
      <div className="relative z-10 max-w-2xl w-full space-y-6 animate-fade-in">
        {/* Correct/Incorrect Badge */}
        {evaluationResult && (
          <div className="flex justify-center">
            <div
              className={`inline-flex items-center gap-3 px-6 py-3 rounded-full border-2 shadow-lg ${
                isCorrect
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600'
                  : 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600'
              }`}
            >
              <span className="text-3xl">{isCorrect ? '✓' : '✗'}</span>
              <span
                className={`font-bold text-xl ${
                  isCorrect
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {isCorrect ? 'Case Solved!' : 'Case Remains Open'}
              </span>
            </div>
          </div>
        )}

        {/* Solution Explanation */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border-2 border-purple-200 dark:border-purple-700 shadow-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <h2 className="text-xl font-bold text-white">The Solution</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              {solutionExplanation}
            </p>
          </div>
        </div>

        {/* Matched Concepts */}
        {matchedConcepts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🎯</span>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Concepts Identified
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {matchedConcepts.map((concept, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* XP Earned - Animated */}
        {evaluationResult && xpEarned > 0 && (
          <div
            className={`flex justify-center transition-all duration-500 ${
              showXp ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-success-100 dark:bg-success-900/30 rounded-full border-2 border-success-300 dark:border-success-700 shadow-lg">
              <svg
                className="w-6 h-6 text-success-600 dark:text-success-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              <span className="text-success-600 dark:text-success-400 font-bold text-xl">
                +{xpEarned} XP
              </span>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={handleContinue}
            className="px-8 py-4 rounded-full font-medium text-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
          >
            Continue ✨
          </button>
        </div>
      </div>
    </div>
  )
}
