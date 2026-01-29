/**
 * LevelIndicator component - Shows current level and version switcher
 * Includes regenerate dropdown and version history buttons
 */
import RegenerateDropdown from './RegenerateDropdown.jsx'
import { LEVEL_CONFIG, EXPLANATION_LEVEL } from '../constants/appConfig.js'

/**
 * Gets the current version level for a topic
 * @param {Object} topic - The topic object
 * @returns {string} The explanation level
 */
function getCurrentVersionLevel(topic) {
  if (!topic) return EXPLANATION_LEVEL.STANDARD
  const versionIndex = topic.currentVersionIndex ?? 0
  const version = topic.versions?.[versionIndex]
  return version?.explanationLevel || topic.explanationLevel || EXPLANATION_LEVEL.STANDARD
}

/**
 * @param {Object} props
 * @param {Object} props.activeTopic - The active topic object
 * @param {Function} props.handleRegenerate - Handler for regeneration
 * @param {Function} props.handleVersionSwitch - Handler for version switch
 * @param {boolean} props.isRegenerating - Whether currently regenerating
 */
export default function LevelIndicator({
  activeTopic,
  handleRegenerate,
  handleVersionSwitch,
  isRegenerating,
}) {
  if (!activeTopic) {
    return null
  }

  const currentLevel = getCurrentVersionLevel(activeTopic)

  return (
    <div className="flex flex-col items-center gap-3 mt-4 mb-16">
      {/* Current level indicator with regenerate dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Level:</span>
        <span className="px-2 py-1 text-xs rounded-full bg-primary text-white">
          {LEVEL_CONFIG[currentLevel]?.icon}{' '}
          {LEVEL_CONFIG[currentLevel]?.title}
        </span>
        <RegenerateDropdown
          levelConfig={LEVEL_CONFIG}
          currentLevel={currentLevel}
          onRegenerate={handleRegenerate}
          isRegenerating={isRegenerating}
          disabled={!activeTopic.query}
        />
      </div>

      {/* Version switcher - only shown when multiple versions exist */}
      {activeTopic.versions && activeTopic.versions.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 mr-1">Versions:</span>
          {activeTopic.versions.map((version, index) => {
            const isActive = (activeTopic.currentVersionIndex ?? 0) === index
            const levelConfig = LEVEL_CONFIG[version.explanationLevel] || LEVEL_CONFIG[EXPLANATION_LEVEL.STANDARD]
            return (
              <button
                key={version.id}
                onClick={() => handleVersionSwitch(index)}
                className={`
                  px-2 py-1 text-xs rounded-md transition-all
                  flex items-center gap-1
                  ${isActive
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent'
                  }
                `}
                title={`${levelConfig.title} - ${new Date(version.createdAt).toLocaleString()}`}
              >
                <span>{levelConfig.icon}</span>
                <span className="hidden sm:inline">{levelConfig.title}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Regenerating indicator */}
      {isRegenerating && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg
            className="w-3 h-3 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Regenerating slides...</span>
        </div>
      )}
    </div>
  )
}
