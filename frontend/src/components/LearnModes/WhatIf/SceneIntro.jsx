/**
 * SceneIntro - Scene setup screen for Wonder Lab
 *
 * Shows hero image, scenario question, and "Make Your Predictions" button.
 * Image fades in when loaded, with star emoji placeholder.
 * Uses blue/cyan gradient theme to distinguish from Mystery Lab's purple/indigo.
 */

import { useState } from "react";
import { vibrateShort } from "../../../utils/haptics";

/**
 * @param {Object} props
 * @param {string} props.scenario - The "What if..." question
 * @param {string|null} props.scenarioImage - URL to scenario image
 * @param {boolean} props.isTtsPlaying - Whether TTS is currently playing
 * @param {Function} props.onNext - Callback when "Make Your Predictions" clicked
 */
export default function SceneIntro({
  scenario,
  scenarioImage = null,
  isTtsPlaying = false,
  onNext,
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleNext = () => {
    vibrateShort();
    onNext();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950">
      <div className="max-w-2xl w-full space-y-6 animate-fade-in">
        {/* Hero Image Container - 16:9 aspect ratio */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-blue-200 dark:border-blue-700 bg-gray-100 dark:bg-gray-800">
          {/* Star emoji placeholder - shown while loading or if no image */}
          {(!scenarioImage || !imageLoaded) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30">
              <div className="text-8xl animate-pulse">🌟</div>
            </div>
          )}

          {/* Scenario image - fades in when loaded */}
          {scenarioImage && (
            <img
              src={scenarioImage}
              alt="Scenario scene"
              onLoad={handleImageLoad}
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        {/* Scenario Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">🔬</span>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 mb-3">
                Wonder Lab
              </h2>
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                {scenario}
              </p>
            </div>
          </div>
        </div>

        {/* Make Your Predictions Button */}
        <button
          onClick={handleNext}
          disabled={isTtsPlaying}
          className={`w-full px-8 py-4 rounded-full font-medium text-lg shadow-lg transform transition-all duration-200 ${
            isTtsPlaying
              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:shadow-xl hover:scale-105 active:scale-95"
          }`}
        >
          {isTtsPlaying ? "Narrating..." : "🔮 Make Your Predictions"}
        </button>
      </div>
    </div>
  );
}
