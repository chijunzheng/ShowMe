/**
 * StoryPlayback - Slideshow player for completed story
 *
 * Shows the final illustrated story as a slideshow with navigation controls.
 */

import { useState } from 'react'
import { vibrateShort } from '../../../utils/haptics'
import { playSelectSound } from '../../../utils/soundEffects'

/**
 * @param {Object} props
 * @param {string} props.topicName - Topic of the story
 * @param {Array} props.scenes - Array of scene objects
 * @param {number} props.conceptsUsed - Number of concepts used
 * @param {number} props.totalConcepts - Total concepts available
 * @param {Function} props.onShare - Callback to share story
 * @param {Function} props.onRetry - Callback to create new story
 * @param {Function} props.onFinish - Callback when done
 */
export default function StoryPlayback({
  topicName,
  scenes = [],
  conceptsUsed,
  totalConcepts,
  onShare,
  onRetry,
  onFinish
}) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)

  const currentScene = scenes[currentSceneIndex]
  const allConceptsUsed = conceptsUsed === totalConcepts && totalConcepts > 0

  const handlePrevious = () => {
    if (currentSceneIndex > 0) {
      vibrateShort()
      playSelectSound()
      setCurrentSceneIndex(prev => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentSceneIndex < scenes.length - 1) {
      vibrateShort()
      playSelectSound()
      setCurrentSceneIndex(prev => prev + 1)
    }
  }

  const handleShare = () => {
    vibrateShort()
    playSelectSound()
    onShare?.()
  }

  const handleRetry = () => {
    vibrateShort()
    playSelectSound()
    onRetry?.()
  }

  const handleFinish = () => {
    vibrateShort()
    playSelectSound()
    onFinish?.()
  }

  if (scenes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-950">
        <div className="text-center">
          <div className="text-6xl mb-4">📖</div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            No scenes to display
          </p>
          <button
            onClick={handleRetry}
            className="mt-4 px-6 py-3 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-950">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
            📖 Your Story is Ready!
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {topicName}
          </p>
        </div>
      </div>

      {/* Slideshow */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          {/* Chapter Title */}
          {currentScene?.chapterTitle && (
            <div className="text-center mb-3">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                {currentScene.chapterTitle}
              </h2>
            </div>
          )}

          {/* Scene Image */}
          <div className="aspect-video bg-white dark:bg-slate-800 rounded-2xl border-2 border-gray-200 dark:border-slate-700 overflow-hidden shadow-2xl mb-6">
            {currentScene?.imageUrl ? (
              <img
                src={currentScene.imageUrl}
                alt={currentScene.sceneDescription || `Scene ${currentSceneIndex + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-slate-700">
                <span className="text-gray-400 text-4xl">🎨</span>
              </div>
            )}
          </div>

          {/* Scene Text */}
          <div className="mb-6 p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <p className="text-lg text-gray-800 dark:text-gray-100 leading-relaxed text-center">
              {currentScene?.narrativeText || 'Scene text'}
            </p>
          </div>

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {scenes.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  vibrateShort()
                  setCurrentSceneIndex(index)
                }}
                className={`
                  w-2.5 h-2.5 rounded-full transition-all duration-200
                  ${index === currentSceneIndex
                    ? 'bg-primary w-8'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }
                `}
                aria-label={`Go to scene ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={handlePrevious}
              disabled={currentSceneIndex === 0}
              className="px-6 py-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>←</span>
              <span>Previous</span>
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {currentSceneIndex + 1} / {scenes.length}
            </span>

            <button
              onClick={handleNext}
              disabled={currentSceneIndex === scenes.length - 1}
              className="px-6 py-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>Next</span>
              <span>→</span>
            </button>
          </div>

          {/* Stats Summary */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 mb-6">
            <div className="flex items-center justify-center gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{scenes.length}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Scenes</p>
              </div>
              <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
              <div>
                <p className="text-2xl font-bold text-primary">{conceptsUsed}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Concepts Used</p>
              </div>
              {allConceptsUsed && (
                <>
                  <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
                  <div>
                    <p className="text-2xl">🌟</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Master!</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Create Another
            </button>
            <button
              onClick={handleShare}
              className="px-6 py-3 rounded-full bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <span>📤</span>
              <span>Share</span>
            </button>
            <button
              onClick={handleFinish}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold hover:shadow-xl transition-all duration-200"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
