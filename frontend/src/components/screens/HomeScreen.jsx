/**
 * HomeScreen component - Level selection and initial voice trigger
 * Displayed when uiState is HOME and activeTab is 'learn'
 */
import LevelCard from '../LevelCard.jsx'
import { playMicOnSound } from '../../utils/soundEffects.js'
import { LEVEL_CONFIG, EXPLANATION_LEVEL, UI_STATE } from '../../constants/appConfig.js'

/**
 * @param {Object} props
 * @param {string} props.homeHeadline - Random headline to display
 * @param {string} props.selectedLevel - Currently selected explanation level
 * @param {Function} props.setSelectedLevel - Setter for selected level
 * @param {boolean} props.showTextFallback - Whether to show text input instead of voice
 * @param {Function} props.setShowTextFallback - Setter for text fallback visibility
 * @param {string} props.textInput - Current text input value
 * @param {Function} props.setTextInput - Setter for text input
 * @param {Function} props.setIsMicEnabled - Setter to enable/disable mic
 * @param {Function} props.setAllowAutoListen - Setter for auto-listen mode
 * @param {Function} props.setUiState - Setter for UI state
 * @param {Function} props.handleQuestion - Handler for submitting questions
 * @param {Function} props.recordDeepLevelUsed - Gamification tracker for deep level
 */
export default function HomeScreen({
  homeHeadline,
  selectedLevel,
  setSelectedLevel,
  showTextFallback,
  setShowTextFallback,
  textInput,
  setTextInput,
  setIsMicEnabled,
  setAllowAutoListen,
  setUiState,
  handleQuestion,
  recordDeepLevelUsed,
}) {
  function handleLevelSelect(level) {
    playMicOnSound()
    setSelectedLevel(level)
    if (level === EXPLANATION_LEVEL.DEEP) {
      recordDeepLevelUsed()
    }
    setShowTextFallback(false)
    setIsMicEnabled(true)
    setAllowAutoListen(true)
    setUiState(UI_STATE.LISTENING)
  }

  function handleTextSubmit(e) {
    e.preventDefault()
    if (textInput.trim()) {
      handleQuestion(textInput.trim())
      setTextInput('')
      setShowTextFallback(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 px-4 md:px-0 animate-fade-in">
      {/* Headline */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          {homeHeadline}
        </h1>
        <p className="text-gray-500">
          Tap a level and start talking
        </p>
      </div>

      {/* Level cards */}
      <div className="w-full max-w-md space-y-3">
        {Object.entries(LEVEL_CONFIG).map(([level, config], index) => (
          <div
            key={level}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <LevelCard
              level={level}
              icon={config.icon}
              title={config.title}
              description={config.description}
              isSelected={selectedLevel === level}
              onClick={() => handleLevelSelect(level)}
            />
          </div>
        ))}
      </div>

      {/* Text fallback */}
      {!showTextFallback ? (
        <button
          onClick={() => setShowTextFallback(true)}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          can't talk? type here
        </button>
      ) : (
        <div className="w-full max-w-md space-y-3 animate-fade-in">
          {/* Compact level toggle for text mode */}
          <div className="flex justify-center gap-2">
            {Object.entries(LEVEL_CONFIG).map(([level, config]) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`
                  px-3 py-1.5 text-sm rounded-full transition-all
                  ${selectedLevel === level
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {config.icon} {config.title}
              </button>
            ))}
          </div>

          {/* Text input with send button */}
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 px-4 py-3 min-h-[48px] border border-gray-200 rounded-xl focus:border-primary focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className={`
                px-4 py-3 rounded-xl transition-all
                ${textInput.trim()
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>

          {/* Back to voice */}
          <button
            onClick={() => setShowTextFallback(false)}
            className="w-full text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Use voice instead
          </button>
        </div>
      )}
    </div>
  )
}
