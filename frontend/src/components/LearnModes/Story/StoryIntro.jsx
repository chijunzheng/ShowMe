/**
 * StoryIntro - Story setup screen for Story Studio
 *
 * Shows scene image, story hook narration, concept ingredient cards,
 * and "Begin Your Story" button.
 */

import { useState } from "react";
import { vibrateShort } from "../../../utils/haptics";
import ConceptCards from "./ConceptCards";

/**
 * @param {Object} props
 * @param {string} props.storyTitle - Story/topic title
 * @param {string} props.missionHook - Hook text (narrated via TTS)
 * @param {string|null} props.sceneImage - URL to scene image
 * @param {Array} props.conceptCards - Array of {concept, icon, description}
 * @param {boolean} props.isTtsPlaying - Whether TTS is currently playing
 * @param {Function} props.onNext - Callback when "Begin" clicked
 */
export default function StoryIntro({
  storyTitle,
  missionHook,
  sceneImage = null,
  conceptCards = [],
  isTtsPlaying = false,
  onNext,
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleBegin = () => {
    vibrateShort();
    onNext();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-950">
      <div className="max-w-2xl w-full space-y-6 animate-fade-in">
        {/* Scene Image Container - 16:9 aspect ratio */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-pink-200 dark:border-pink-700 bg-gray-100 dark:bg-gray-800">
          {/* Placeholder emoji - shown while loading or if no image */}
          {(!sceneImage || !imageLoaded) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30">
              <div className="text-8xl animate-pulse">📖</div>
            </div>
          )}

          {/* Scene image - fades in when loaded */}
          {sceneImage && (
            <img
              src={sceneImage}
              alt="Story scene"
              onLoad={handleImageLoad}
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Story Title - positioned over gradient */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
              {storyTitle}
            </h1>
          </div>
        </div>

        {/* Mission Hook Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">📋</span>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
                Your Story Mission
              </h2>
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                {missionHook}
              </p>
            </div>
          </div>
        </div>

        {/* Story Ingredients (Concept Cards) */}
        {conceptCards.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>🧪</span>
              <span>Story Ingredients</span>
            </h2>
            <ConceptCards conceptCards={conceptCards} />
          </div>
        )}

        {/* Begin Button */}
        <button
          onClick={handleBegin}
          disabled={isTtsPlaying}
          className={`w-full px-8 py-4 rounded-full font-medium text-lg shadow-lg transform transition-all duration-200 ${
            isTtsPlaying
              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:shadow-xl hover:scale-105 active:scale-95"
          }`}
        >
          {isTtsPlaying ? "Narrating..." : "📖 Begin Your Story"}
        </button>
      </div>
    </div>
  );
}
