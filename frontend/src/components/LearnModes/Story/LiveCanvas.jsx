/**
 * LiveCanvas - Display generated scene illustrations in real-time
 *
 * Shows the latest scene images as they are generated, with placeholders
 * while generating.
 */

/**
 * @param {Object} props
 * @param {Array} props.scenes - Array of scene objects with imageUrl
 * @param {boolean} props.pendingSceneImage - Whether a scene is being generated
 */
export default function LiveCanvas({ scenes = [], pendingSceneImage = false }) {
  const latestScene = scenes.length > 0 ? scenes[scenes.length - 1] : null

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
        📖 Your Story So Far
      </h3>

      {/* Latest Scene Display */}
      <div className="aspect-video bg-white dark:bg-slate-800 rounded-xl border-2 border-gray-200 dark:border-slate-700 overflow-hidden shadow-lg mb-4">
        {latestScene && latestScene.imageUrl ? (
          <img
            src={latestScene.imageUrl}
            alt={latestScene.sceneDescription || 'Story scene'}
            className="w-full h-full object-cover"
          />
        ) : pendingSceneImage ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Creating illustration...
            </p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20">
            <div className="text-center p-6">
              <div className="text-6xl mb-3">🎨</div>
              <p className="text-gray-500 dark:text-gray-400">
                Start telling your story!
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Illustrations will appear here as you speak
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Scene Thumbnails */}
      {scenes.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            All scenes:
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {scenes.map((scene, index) => (
              <div
                key={index}
                className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-slate-700 hover:border-primary transition-colors duration-200 cursor-pointer"
                title={scene.narrativeText}
              >
                {scene.imageUrl ? (
                  <img
                    src={scene.imageUrl}
                    alt={`Scene ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">
                      {index + 1}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
