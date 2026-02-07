/**
 * ListeningScreen component - Voice input with waveform visualization
 * Displayed when uiState is LISTENING and activeTab is 'learn'
 */
import { LEVEL_CONFIG, AUDIO_CONFIG, PERMISSION_STATE, UI_STATE } from '../../constants/appConfig.js'

/**
 * @param {Object} props
 * @param {string} props.selectedLevel - Currently selected explanation level
 * @param {boolean} props.isListening - Whether actively listening for voice
 * @param {number} props.audioLevel - Current audio level (0-100)
 * @param {string} props.liveTranscription - Current transcription text
 * @param {string} props.permissionState - Microphone permission state
 * @param {Function} props.stopListening - Function to stop listening
 * @param {Function} props.setUiState - Setter for UI state
 */
export default function ListeningScreen({
  selectedLevel,
  isListening,
  audioLevel,
  liveTranscription,
  permissionState,
  stopListening,
  setUiState,
}) {
  function handleCancel() {
    stopListening()
    setUiState(UI_STATE.HOME)
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 md:px-0 animate-fade-in">
      {/* Level indicator - shows what mode they're in */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>{LEVEL_CONFIG[selectedLevel]?.icon}</span>
        <span>{LEVEL_CONFIG[selectedLevel]?.title} mode</span>
      </div>

      {/* Waveform visualization - responds to audio input when listening */}
      <div className="flex items-center justify-center gap-1 h-24">
        {[...Array(AUDIO_CONFIG.WAVEFORM_BARS)].map((_, i) => {
          const baseHeight = 12
          const maxAdditionalHeight = 60
          const middleIndex = AUDIO_CONFIG.WAVEFORM_BARS / 2
          const distanceFromMiddle = Math.abs(i - middleIndex)
          const positionFactor = 1 - (distanceFromMiddle / middleIndex) * 0.5

          let height
          if (isListening && audioLevel > 0) {
            const randomFactor = 0.8 + Math.random() * 0.4
            height = baseHeight + (audioLevel / 100) * maxAdditionalHeight * positionFactor * randomFactor
          } else {
            height = baseHeight + Math.sin(Date.now() / 500 + i * 0.5) * 5 + 10
          }

          return (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-75 ${
                isListening ? 'bg-primary' : 'bg-primary/50'
              }`}
              style={{ height: `${Math.max(baseHeight, Math.min(80, height))}px` }}
            />
          )
        })}
      </div>

      {/* Live transcription or listening status */}
      <p className={`text-xl text-center max-w-md transition-all duration-300 min-h-[2rem] ${
        liveTranscription ? 'text-primary font-medium' : 'text-gray-400'
      }`}>
        {liveTranscription || (isListening ? 'Listening...' : 'Starting mic...')}
      </p>

      {/* Permission denied message */}
      {permissionState === PERMISSION_STATE.DENIED && (
        <div className="text-center">
          <p className="text-sm text-red-500 mb-2">
            Microphone access denied. Please enable it in your browser settings.
          </p>
          <button
            onClick={() => setUiState(UI_STATE.HOME)}
            className="text-sm text-primary hover:underline"
          >
            Go back and type instead
          </button>
        </div>
      )}

      {/* Cancel button */}
      <button
        onClick={handleCancel}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
