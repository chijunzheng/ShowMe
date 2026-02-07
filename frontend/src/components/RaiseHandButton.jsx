/**
 * RaiseHandButton component - Floating button for voice input during slideshow
 * Includes mic status, text input fallback, and positioning for sidebar layout
 */

/**
 * @param {Object} props
 * @param {boolean} props.hasSidebar - Whether the sidebar is visible
 * @param {boolean} props.showTextFallback - Whether to show text input
 * @param {Function} props.setShowTextFallback - Setter for text fallback visibility
 * @param {boolean} props.isMicEnabled - Whether mic is enabled
 * @param {boolean} props.isListening - Whether actively listening
 * @param {boolean} props.isRaiseHandPending - Whether waiting for sentence end
 * @param {string} props.liveTranscription - Current transcription text
 * @param {Function} props.handleRaiseHandClick - Handler for raise hand button click
 * @param {string} props.textInput - Current text input value
 * @param {Function} props.setTextInput - Setter for text input
 * @param {Function} props.handleQuestion - Handler for submitting questions
 * @param {Function} props.interruptActiveAudio - Function to stop playback
 * @param {Function} props.setIsPlaying - Setter for playback state
 */
export default function RaiseHandButton({
  hasSidebar,
  showTextFallback,
  setShowTextFallback,
  isMicEnabled,
  isListening,
  isRaiseHandPending,
  liveTranscription,
  handleRaiseHandClick,
  textInput,
  setTextInput,
  handleQuestion,
  interruptActiveAudio,
  setIsPlaying,
}) {
  function handleTextSubmit(e) {
    e.preventDefault()
    if (textInput.trim()) {
      handleQuestion(textInput.trim())
      setTextInput('')
      setShowTextFallback(false)
    }
  }

  function handleInputFocus() {
    interruptActiveAudio()
    setIsPlaying(false)
  }

  function getMicStatusText() {
    if (liveTranscription) return liveTranscription
    if (isListening) return 'Listening...'
    if (isRaiseHandPending) return 'Waiting for the current sentence...'
    return 'Mic on'
  }

  return (
    <div
      className={`fixed z-50 pointer-events-none left-1/2 -translate-x-1/2 ${
        hasSidebar ? 'md:left-[calc(50%+128px)]' : ''
      }`}
      style={{
        // Position above the BottomTabBar (h-16 = 64px) + gap
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex flex-col items-center gap-2 pointer-events-auto">
        {!showTextFallback && (
          <>
            {isMicEnabled && (
              <span className="text-xs text-gray-500 bg-white/90 px-3 py-1 rounded-full shadow-sm">
                {getMicStatusText()}
              </span>
            )}
            <button
              onClick={handleRaiseHandClick}
              aria-label={isMicEnabled ? 'Lower hand' : 'Raise hand'}
              className={`w-14 h-14 min-h-[44px] rounded-full shadow-lg text-2xl transition-all select-none flex items-center justify-center ${
                isMicEnabled
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-primary hover:scale-105'
              }`}
              style={{
                WebkitTouchCallout: 'none',
                userSelect: 'none',
              }}
            >
              {isMicEnabled ? '\uD83E\uDD1A' : '\u270B'}
            </button>
            <button
              onClick={() => setShowTextFallback(true)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1"
            >
              can't talk? type here
            </button>
          </>
        )}

        {showTextFallback && (
          <div className="w-72 bg-white rounded-xl shadow-lg p-3 animate-fade-in">
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onFocus={handleInputFocus}
                placeholder="Type your question..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-primary focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className={`
                  px-3 py-2 rounded-lg transition-all
                  ${textInput.trim()
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
            <button
              onClick={() => setShowTextFallback(false)}
              className="w-full text-xs text-gray-400 hover:text-gray-600 mt-2 transition-colors"
            >
              x close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
