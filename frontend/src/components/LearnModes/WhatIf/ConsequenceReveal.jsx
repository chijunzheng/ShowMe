/**
 * ConsequenceReveal - Step-by-step reveal of consequences
 *
 * Steps through correct predictions one at a time, showing dramatic images
 * and narration. Celebrates correct predictions and reveals missed consequences
 * with gentle encouragement.
 */

import { useState, useEffect, useCallback } from 'react'
import { vibrateSuccess, vibrateShort } from '../../../utils/haptics'

/**
 * @param {Object} props
 * @param {Array} props.revealAssets - Array of {id, imageUrl, audioUrl, text, isCorrect, revealNarration}
 * @param {Set} props.userSelections - Set of card IDs the user selected
 * @param {Function} props.narrate - JIT narration function from useWonderNarration
 * @param {Function} props.play - Play pre-generated audio URL directly (backwards compat)
 * @param {Function} props.prefetch - Prefetch TTS for upcoming narration text
 * @param {boolean} props.isPlaying - TTS playing state
 * @param {boolean} props.isLoading - TTS loading state
 * @param {Function} props.onComplete - Callback when all reveals done
 */
export default function ConsequenceReveal({
  revealAssets = [],
  userSelections = new Set(),
  narrate,
  play,
  prefetch,
  isPlaying = false,
  isLoading = false,
  onComplete,
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [hasNarrated, setHasNarrated] = useState(false)

  const currentAsset = revealAssets[currentIndex]
  const isLastReveal = currentIndex === revealAssets.length - 1
  const userPredictedCorrectly = currentAsset && userSelections.has(currentAsset.id)

  const advanceToNextReveal = useCallback(() => {
    setCurrentIndex((prev) => prev + 1)
    setImageLoaded(false)
    setHasNarrated(false)
  }, [])

  // Auto-narrate when new consequence appears
  useEffect(() => {
    if (!currentAsset || hasNarrated) {
      return
    }

    setHasNarrated(true)

    // Use pre-generated audioUrl if available, else fall back to narrate()
    if (currentAsset.audioUrl && play) {
      play(currentAsset.audioUrl)
    } else if (currentAsset.revealNarration) {
      void narrate(currentAsset.revealNarration, `reveal-${currentAsset.id}`)
    }

    // Pipeline: prefetch next consequence's TTS
    const nextAsset = revealAssets[currentIndex + 1]
    if (nextAsset?.revealNarration && prefetch) {
      prefetch(nextAsset.revealNarration, `reveal-${nextAsset.id}`)
    }

    // Vibrate for correct prediction
    if (userPredictedCorrectly) {
      vibrateSuccess()
    }
  }, [currentAsset, narrate, play, hasNarrated, userPredictedCorrectly, prefetch, currentIndex, revealAssets])

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleNext = () => {
    if (isLastReveal) {
      vibrateShort()
      onComplete()
      return
    }

    vibrateShort()
    advanceToNextReveal()
  }

  if (!currentAsset) {
    return null
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950">
      <div className="max-w-2xl w-full space-y-6 animate-fade-in">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {revealAssets.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 bg-blue-500 dark:bg-blue-400'
                  : index < currentIndex
                  ? 'w-2 bg-blue-300 dark:bg-blue-600'
                  : 'w-2 bg-gray-300 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Consequence Image Container - 16:9 aspect ratio */}
        <div
          className={`relative w-full aspect-video rounded-2xl overflow-hidden border-4 transition-all duration-300 ${
            userPredictedCorrectly
              ? 'border-green-500 dark:border-green-400 shadow-lg shadow-green-500/50'
              : 'border-blue-400 dark:border-blue-500 shadow-lg shadow-blue-500/30'
          }`}
        >
          {/* Placeholder while loading */}
          {(!currentAsset.imageUrl || !imageLoaded) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30">
              <div className="text-8xl animate-pulse">
                {userPredictedCorrectly ? '🎯' : '🔬'}
              </div>
            </div>
          )}

          {/* Consequence image - fades in when loaded */}
          {currentAsset.imageUrl && (
            <img
              src={currentAsset.imageUrl}
              alt="Consequence visualization"
              onLoad={handleImageLoad}
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Correct prediction badge */}
          {userPredictedCorrectly && (
            <div className="absolute top-4 right-4 bg-green-500 dark:bg-green-400 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg animate-bounce-in">
              ✓ You predicted this!
            </div>
          )}
        </div>

        {/* Consequence Card */}
        <div
          className={`bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 shadow-lg ${
            userPredictedCorrectly
              ? 'border-green-300 dark:border-green-700'
              : 'border-blue-200 dark:border-blue-700'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">
              {userPredictedCorrectly ? '🎉' : '💡'}
            </span>
            <div className="flex-1">
              <h3
                className={`text-lg font-semibold mb-2 ${
                  userPredictedCorrectly
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-blue-700 dark:text-blue-300'
                }`}
              >
                {userPredictedCorrectly ? 'Great prediction!' : "Here's what actually happens"}
              </h3>
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                {currentAsset.text}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                {currentAsset.revealNarration}
              </p>
            </div>
          </div>
        </div>

        {/* Next button - Manual override for auto-advance */}
        <button
          onClick={handleNext}
          disabled={isPlaying || isLoading}
          className={`w-full px-8 py-4 rounded-full font-medium text-lg shadow-lg transform transition-all duration-200 ${
            isPlaying || isLoading
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : isLastReveal
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl hover:scale-105 active:scale-95'
              : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:shadow-xl hover:scale-105 active:scale-95'
          }`}
        >
          {isPlaying || isLoading
            ? '🎙️ Narrating...'
            : isLastReveal
            ? '🎊 See Results'
            : '➡️ Next Consequence'}
        </button>
      </div>
    </div>
  )
}
