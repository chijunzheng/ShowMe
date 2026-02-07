/**
 * MysteryIntro - Case setup screen for Mystery Lab
 *
 * Shows manga scene image, case title, mystery setup text, and "Investigate" button.
 * Image fades in when loaded, with detective emoji placeholder.
 */

import { useState } from 'react'
import { vibrateShort } from '../../../utils/haptics'

/**
 * @param {Object} props
 * @param {string} props.mysteryTitle - Case title
 * @param {string} props.mysterySetup - Setup text to display
 * @param {string|null} props.sceneImage - URL to manga scene image
 * @param {boolean} props.isTtsPlaying - Whether TTS is currently playing
 * @param {Function} props.onNext - Callback when "Investigate" clicked
 */
export default function MysteryIntro({
  mysteryTitle,
  mysterySetup,
  sceneImage = null,
  isTtsPlaying = false,
  onNext,
}) {
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleInvestigate = () => {
    vibrateShort()
    onNext()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950">
      <div className="max-w-2xl w-full space-y-6 animate-fade-in">
        {/* Case Title */}
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 text-center">
          {mysteryTitle}
        </h1>

        {/* Scene Image Container - 16:9 aspect ratio */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-purple-200 dark:border-purple-700 bg-gray-100 dark:bg-gray-800">
          {/* Detective emoji placeholder - shown while loading or if no image */}
          {(!sceneImage || !imageLoaded) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30">
              <div className="text-8xl animate-pulse">🕵️</div>
            </div>
          )}

          {/* Scene image - fades in when loaded */}
          {sceneImage && (
            <img
              src={sceneImage}
              alt="Mystery scene"
              onLoad={handleImageLoad}
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
        </div>

        {/* Mystery Setup Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">📋</span>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
                The Case
              </h2>
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                {mysterySetup}
              </p>
            </div>
          </div>
        </div>

        {/* Investigate Button */}
        <button
          onClick={handleInvestigate}
          disabled={isTtsPlaying}
          className={`w-full px-8 py-4 rounded-full font-medium text-lg shadow-lg transform transition-all duration-200 ${
            isTtsPlaying
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:shadow-xl hover:scale-105 active:scale-95'
          }`}
        >
          {isTtsPlaying ? 'Narrating...' : '🔍 Investigate'}
        </button>
      </div>
    </div>
  )
}
