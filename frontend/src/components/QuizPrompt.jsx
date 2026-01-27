/**
 * QuizPrompt Component (WB001)
 *
 * A prompt screen shown after a slideshow ends (in Full learning mode).
 * Encourages users to take a quiz to test their knowledge and unlock
 * a piece for their World.
 *
 * @param {Object} props - Component props
 * @param {string} [props.topicName] - Name of the topic just learned
 * @param {Function} props.onStart - Callback when user clicks "Take Quiz"
 * @param {Function} props.onSkip - Callback when user clicks "Skip"
 * @param {boolean} [props.isLoading] - Whether quiz questions are being generated
 */

import { useState, useEffect } from 'react'

export default function QuizPrompt({
  topicName,
  onStart,
  onSkip,
  isLoading = false,
}) {
  const [isVisible, setIsVisible] = useState(false)

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`
        flex flex-col items-center gap-6 px-4 py-8
        transition-all duration-500
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      {/* Trophy/Quiz icon */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <span className="text-5xl" role="img" aria-label="Quiz">

          </span>
        </div>
        {/* Sparkle decorations */}
        <div className="absolute -top-1 -right-1 text-yellow-400 text-lg animate-pulse">
          &#10022;
        </div>
        <div className="absolute -bottom-1 -left-2 text-primary text-sm animate-pulse" style={{ animationDelay: '0.3s' }}>
          &#10022;
        </div>
      </div>

      {/* Heading */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Test Your Knowledge!
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-sm">
          {topicName
            ? `Take a quick quiz about "${topicName}" to unlock a piece for your World.`
            : 'Take a quick quiz to reinforce what you learned and unlock a new piece for your World.'}
        </p>
      </div>

      {/* Reward preview */}
      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-full">
        <span className="text-lg"></span>
        <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
          Pass to earn a World piece!
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onStart}
          disabled={isLoading}
          className={`
            w-full py-4 px-6
            bg-primary text-white font-semibold text-lg
            rounded-xl
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
            ${isLoading
              ? 'opacity-70 cursor-wait'
              : 'hover:bg-primary/90 hover:scale-[1.02] active:scale-98'
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Preparing Quiz...
            </span>
          ) : (
            'Take the Quiz'
          )}
        </button>

        <button
          onClick={onSkip}
          disabled={isLoading}
          className="
            w-full py-3 px-6
            text-gray-500 dark:text-gray-400
            hover:text-gray-700 dark:hover:text-gray-200
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 rounded-lg
          "
        >
          Skip for now
        </button>
      </div>

      {/* Info text */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center max-w-xs">
        Quizzes are 3-5 short questions. You can retake them anytime from the topic menu.
      </p>
    </div>
  )
}
