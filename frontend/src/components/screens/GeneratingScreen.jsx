/**
 * GeneratingScreen component - Shows generation progress
 * Displayed when uiState is GENERATING and activeTab is 'learn'
 */
import FunFactCard from '../FunFactCard.jsx'

/**
 * @param {Object} props
 * @param {boolean} props.isStillWorking - Whether generation is taking longer than expected
 * @param {Object} props.generationProgress - Progress state object
 * @param {string} props.generationProgress.message - Human-readable progress message
 * @param {number} props.generationProgress.slidesReady - Number of slides ready
 * @param {number} props.generationProgress.totalSlides - Total slides being generated
 * @param {number} props.generationProgressPercent - Progress percentage (0-100)
 * @param {Function} props.cancelGeneration - Function to cancel generation
 * @param {Object|null} props.engagement - Engagement data with funFact
 */
export default function GeneratingScreen({
  isStillWorking,
  generationProgress,
  generationProgressPercent,
  cancelGeneration,
  engagement,
}) {
  return (
    <div className="flex flex-col items-center gap-6 px-4 md:px-0">
      {/* Loader */}
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />

      {/* Single clean status message */}
      <p className="text-lg text-gray-600">
        {isStillWorking
          ? 'Still working...'
          : generationProgress.message || 'Creating your explanation...'}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div
          role="progressbar"
          aria-valuenow={generationProgressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full bg-gray-200 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${generationProgressPercent}%` }}
          />
        </div>
        {generationProgress.totalSlides > 0 && (
          <p className="mt-2 text-xs text-gray-500 text-center">
            {generationProgress.slidesReady > 0
              ? `${generationProgress.slidesReady} of ${generationProgress.totalSlides} slides ready`
              : `${generationProgress.totalSlides} slides in progress`}
          </p>
        )}
      </div>

      {/* Cancel button - always visible during generation */}
      <button
        onClick={cancelGeneration}
        className="px-4 py-2 min-h-[44px] text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg transition-colors"
      >
        Cancel
      </button>

      {/* Fun fact card - displays while slides are generating (F045) */}
      {engagement?.funFact && (
        <FunFactCard funFact={engagement.funFact} />
      )}
    </div>
  )
}
