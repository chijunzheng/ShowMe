/**
 * ShareStory - Share completed story
 *
 * Provides options to share the story (future: export, social sharing, etc.)
 */

import { useState } from 'react'
import { vibrateShort } from '../../../utils/haptics'
import { playSelectSound } from '../../../utils/soundEffects'

/**
 * @param {Object} props
 * @param {string} props.topicName - Topic of the story
 * @param {Array} props.scenes - Array of scene objects
 * @param {Function} props.onBack - Callback to go back to playback
 * @param {Function} props.onComplete - Callback when sharing complete
 */
export default function ShareStory({ topicName, scenes = [], onBack, onComplete }) {
  const [copied, setCopied] = useState(false)

  const handleCopyText = () => {
    vibrateShort()
    playSelectSound()

    // Combine all narrative text
    const storyText = scenes
      .map((scene, index) => `Scene ${index + 1}: ${scene.narrativeText}`)
      .join('\n\n')

    const fullText = `My Story: ${topicName}\n\n${storyText}`

    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleBack = () => {
    vibrateShort()
    onBack?.()
  }

  const handleDone = () => {
    vibrateShort()
    playSelectSound()
    onComplete?.()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-950">
      {/* Header */}
      <div className="text-center mb-8 max-w-2xl">
        <div className="text-6xl mb-4">📤</div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3">
          Share Your Story
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {topicName}
        </p>
      </div>

      {/* Share Options */}
      <div className="w-full max-w-md space-y-4 mb-8">
        {/* Copy Text */}
        <button
          onClick={handleCopyText}
          className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl hover:border-primary transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📋
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800 dark:text-gray-100">
                Copy Story Text
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Copy to clipboard
              </p>
            </div>
          </div>
          {copied && (
            <span className="text-green-500 font-medium text-sm">
              Copied!
            </span>
          )}
        </button>

        {/* Future: Add more sharing options */}
        <div className="p-4 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-2xl">
              🖼️
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-600 dark:text-gray-400">
                Save as PDF
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Coming soon
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-2xl">
              ✉️
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-600 dark:text-gray-400">
                Email Story
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Coming soon
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Story Stats */}
      <div className="w-full max-w-md p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 mb-8">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-3">
          Your story has:
        </p>
        <div className="flex justify-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{scenes.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Scenes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {scenes.filter(s => s.imageUrl).length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Images</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleBack}
          className="px-6 py-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleDone}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold hover:shadow-xl transition-all duration-200"
        >
          Done
        </button>
      </div>
    </div>
  )
}
