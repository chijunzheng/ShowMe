/**
 * StoryPrompt - Display story prompt and concept checklist
 *
 * Shows the creative writing prompt, concept checklist to use,
 * and a starter suggestion to help kids begin their story.
 */

import { vibrateShort } from '../../../utils/haptics'
import { playSelectSound } from '../../../utils/soundEffects'

/**
 * @param {Object} props
 * @param {string} props.storyPrompt - The creative writing prompt
 * @param {Array} props.conceptChecklist - List of concepts to use
 * @param {Function} props.onStartRecording - Callback when user starts recording
 * @param {Function} props.onBack - Callback to go back
 */
export default function StoryPrompt({
  storyPrompt,
  conceptChecklist = [],
  onStartRecording,
  onBack
}) {
  const handleStart = () => {
    vibrateShort()
    playSelectSound()
    onStartRecording?.()
  }

  const handleBack = () => {
    vibrateShort()
    onBack?.()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-950">
      {/* Header */}
      <div className="text-center mb-8 max-w-2xl">
        <div className="text-6xl mb-4 animate-bounce">📖</div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3">
          Story Studio
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Create your own illustrated story!
        </p>
      </div>

      {/* Story Prompt Card */}
      <div className="w-full max-w-2xl mb-8">
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-pink-200 dark:border-pink-900 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">
            Your Mission:
          </h2>
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
            {storyPrompt}
          </p>
        </div>
      </div>

      {/* Concept Checklist */}
      {conceptChecklist.length > 0 && (
        <div className="w-full max-w-2xl mb-8">
          <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-rose-200 dark:border-rose-900 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>✓</span>
              <span>Concepts to Include:</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {conceptChecklist.map((concept, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl"
                >
                  <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-xs text-gray-400">☐</span>
                  </div>
                  <span className="text-base text-gray-700 dark:text-gray-300 font-medium">
                    {concept}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center italic">
              Try to use all these concepts in your story!
            </p>
          </div>
        </div>
      )}

      {/* Starter Suggestion */}
      <div className="w-full max-w-2xl mb-8">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <p className="text-sm text-yellow-800 dark:text-yellow-300 text-center">
            <span className="font-medium">💡 Tip:</span> Start with "Once upon a time..." or jump right into the action!
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleBack}
          className="px-6 py-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
        >
          Go Back
        </button>
        <button
          onClick={handleStart}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2"
        >
          <span>🎤</span>
          <span>Start Telling</span>
        </button>
      </div>

      {/* Info Note */}
      <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
        You'll speak your story and AI will create illustrations as you go!
      </p>
    </div>
  )
}
