import { useState, useEffect } from 'react'

/**
 * ExperimentLoader - Animated loading screen for Wonder Lab
 *
 * Shows a spinner with progress bar and cycling messages while the experiment is running.
 * Science-themed with beaker emoji and blue/cyan gradient background.
 */

const LOADING_MESSAGES = [
  'Creating scenario...',
  'Generating the scene...',
  'Preparing narration...',
]

/**
 * @param {Object} props
 * @param {string} props.message - Main loading message (title)
 * @param {number} props.progress - Progress value (0-100)
 * @param {string|null} props.bonusFact - Topic-specific fun fact (appears when scenario loads)
 */
export default function ExperimentLoader({
  message = "Running the experiment...",
  progress = 0,
  bonusFact = null,
}) {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => prev + 1)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const currentMessage = LOADING_MESSAGES[messageIndex % LOADING_MESSAGES.length]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950">
      <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
        {/* Spinner with beaker emoji */}
        <div className="relative w-24 h-24 mx-auto">
          {/* Rotating border */}
          <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />

          {/* Beaker emoji in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl animate-pulse">🧪</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs mx-auto">
          <div className="h-2 bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-2">
          <p className="text-xl font-medium text-gray-800 dark:text-gray-100 animate-pulse">
            {message}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {currentMessage}
          </p>
        </div>

        {/* Fun fact card */}
        {bonusFact && (
          <div className="p-4 bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm rounded-xl border border-blue-200 dark:border-blue-700/50 max-w-sm mx-auto animate-fade-in">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
              🔬 Did you know?
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {bonusFact}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
