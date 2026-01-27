/**
 * QuizPrompt Component
 * UI004: Post-slideshow quiz prompt screen
 *
 * Shows after slideshow ends in Full mode, prompting user to take the quiz.
 * Displays topic summary, quiz info, and action buttons.
 *
 * Features:
 * - Topic summary card with slide count
 * - "Test your knowledge!" header
 * - "Take Quiz" primary button
 * - "Review Slides" secondary button
 * - Info about earning world piece
 */

import { useState } from 'react'

/**
 * Quiz prompt screen shown after slideshow completion
 *
 * @param {Object} props
 * @param {string} props.topicName - Name of the topic just learned
 * @param {number} props.slideCount - Number of slides in the topic
 * @param {number} props.questionCount - Number of quiz questions (default 5)
 * @param {Function} props.onStartQuiz - Callback when user starts quiz
 * @param {Function} props.onReviewSlides - Callback to review slides again
 * @param {Function} props.onSkip - Callback when user skips the quiz
 */
export default function QuizPrompt({
  topicName = 'This Topic',
  slideCount = 0,
  questionCount = 5,
  onStartQuiz,
  onReviewSlides,
  onSkip
}) {
  const [isAnimated, setIsAnimated] = useState(false)

  // Trigger entrance animation on mount
  useState(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="w-full max-w-md mx-auto py-8 px-4">
      {/* Main content card */}
      <div
        className={`
          bg-white dark:bg-slate-800 rounded-2xl shadow-xl
          border border-gray-100 dark:border-slate-700
          p-6 text-center
          transition-all duration-500
          ${isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        {/* Quiz icon */}
        <div className="mb-4">
          <div
            className="
              w-20 h-20 mx-auto rounded-full
              bg-gradient-to-br from-primary/20 to-cyan-500/20
              flex items-center justify-center
              animate-bounce-in
            "
          >
            <svg
              className="w-10 h-10 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Test Your Knowledge!
        </h2>

        {/* Topic summary */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            You just learned about
          </p>
          <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
            {topicName}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {slideCount} slides completed
          </p>
        </div>

        {/* Quiz info */}
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Answer {questionCount} questions to unlock a{' '}
          <span className="font-semibold text-primary">world piece</span>
        </p>

        {/* World piece preview teaser */}
        <div
          className="
            flex items-center justify-center gap-2
            text-sm text-gray-500 dark:text-gray-400
            mb-6
          "
        >
          <span className="text-2xl">🧩</span>
          <span>Pass to earn a piece for your World!</span>
        </div>

        {/* Primary action: Take Quiz */}
        <button
          onClick={onStartQuiz}
          className="
            w-full py-3 px-6 rounded-xl
            bg-gradient-to-r from-primary to-cyan-500
            text-white font-semibold text-lg
            hover:shadow-lg hover:scale-[1.02]
            active:scale-[0.98]
            transition-all duration-200
            mb-3
          "
        >
          Take Quiz
        </button>

        {/* Secondary action: Review Slides */}
        <button
          onClick={onReviewSlides}
          className="
            w-full py-3 px-6 rounded-xl
            bg-gray-100 dark:bg-slate-700
            text-gray-700 dark:text-gray-200 font-medium
            hover:bg-gray-200 dark:hover:bg-slate-600
            active:scale-[0.98]
            transition-all duration-200
            mb-2
          "
        >
          Review Slides First
        </button>

        {/* Skip option */}
        <button
          onClick={onSkip}
          className="
            text-sm text-gray-400 dark:text-gray-500
            hover:text-gray-600 dark:hover:text-gray-300
            transition-colors
            py-2
          "
        >
          Skip for now
        </button>
      </div>

      {/* Passing score info */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
        You need 75% or higher to pass and unlock rewards
      </p>
    </div>
  )
}
