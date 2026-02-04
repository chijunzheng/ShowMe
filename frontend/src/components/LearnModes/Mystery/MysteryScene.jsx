/**
 * MysteryScene - Display mystery setup and scene image
 *
 * Shows the mystery scenario text and a placeholder/generated image
 * representing the mystery scene.
 */

/**
 * @param {Object} props
 * @param {string} props.mysterySetup - The mystery scenario text
 * @param {string} props.imagePrompt - Description for generating scene image
 */
export default function MysteryScene({ mysterySetup, imagePrompt }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border-2 border-purple-200 dark:border-purple-700 shadow-lg">
      {/* Mystery Image Placeholder */}
      <div className="relative aspect-video bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center">
        {/* For now, show a placeholder. In future, could generate image from imagePrompt */}
        <div className="text-center p-8">
          <div className="text-8xl mb-4 animate-pulse">🕵️</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Mystery Scene
          </p>
        </div>
      </div>

      {/* Mystery Setup Text */}
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span className="text-3xl flex-shrink-0">📋</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              The Case
            </h2>
            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              {mysterySetup}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
