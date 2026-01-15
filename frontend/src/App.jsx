import { useState, useEffect, useCallback } from 'react'

// App states
const UI_STATE = {
  LISTENING: 'listening',
  GENERATING: 'generating',
  SLIDESHOW: 'slideshow',
}

// Example questions for cold start
const EXAMPLE_QUESTIONS = [
  "How do black holes work?",
  "Why do we dream?",
  "How does WiFi work?",
]

function App() {
  const [uiState, setUiState] = useState(UI_STATE.LISTENING)
  const [isColdStart, setIsColdStart] = useState(true)
  const [slides, setSlides] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [liveTranscription, setLiveTranscription] = useState('')
  const [textInput, setTextInput] = useState('')
  const [engagement, setEngagement] = useState(null)
  const [questionQueue, setQuestionQueue] = useState([])
  const [topics, setTopics] = useState([])

  // Default slide duration in milliseconds (used when slide.duration is not available)
  const DEFAULT_SLIDE_DURATION = 5000

  // Navigation helper functions with bounds checking
  const goToNextSlide = useCallback(() => {
    setCurrentIndex((prev) => Math.min(slides.length - 1, prev + 1))
  }, [slides.length])

  const goToPrevSlide = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  // Auto-advance slideshow when playing
  // Uses slide.duration if available, otherwise falls back to DEFAULT_SLIDE_DURATION
  useEffect(() => {
    // Only run auto-advance when in slideshow state, playing, and slides exist
    if (uiState !== UI_STATE.SLIDESHOW || !isPlaying || slides.length === 0) {
      return
    }

    // Get duration for current slide (in milliseconds)
    const currentSlide = slides[currentIndex]
    const duration = currentSlide?.duration || DEFAULT_SLIDE_DURATION

    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1
        // If we reach the end, stop playing
        if (nextIndex >= slides.length) {
          setIsPlaying(false)
          return prev
        }
        return nextIndex
      })
    }, duration)

    // Cleanup interval on unmount or when dependencies change
    return () => clearInterval(intervalId)
  }, [uiState, isPlaying, currentIndex, slides])

  // Keyboard navigation for slideshow
  // Arrow keys navigate between slides, Space bar toggles play/pause
  useEffect(() => {
    // Only enable keyboard navigation during slideshow
    if (uiState !== UI_STATE.SLIDESHOW) {
      return
    }

    const handleKeyDown = (event) => {
      // Ignore keyboard events when user is typing in an input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return
      }

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault()
          goToNextSlide()
          break
        case 'ArrowLeft':
          event.preventDefault()
          goToPrevSlide()
          break
        case ' ':
          // Space bar toggles play/pause
          event.preventDefault()
          togglePlayPause()
          break
        default:
          break
      }
    }

    // Add event listener
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup on unmount or state change
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [uiState, goToNextSlide, goToPrevSlide, togglePlayPause])

  // Start auto-play when entering slideshow state
  useEffect(() => {
    if (uiState === UI_STATE.SLIDESHOW && slides.length > 0) {
      setIsPlaying(true)
    }
  }, [uiState, slides.length])

  const handleQuestion = async (query) => {
    if (!query.trim()) return

    // Reset engagement from previous queries and transition to generating state
    setEngagement(null)
    setIsColdStart(false)
    setUiState(UI_STATE.GENERATING)
    setLiveTranscription('')
    setTextInput('')

    try {
      // Start both API calls in parallel for optimal performance
      // Engagement call is fast (~1-2s) and provides content to display during generation
      const engagementPromise = fetch('/api/generate/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Engagement API failed: ${res.status}`)
          return res.json()
        })
        .then((data) => {
          // Update engagement state immediately when it arrives
          // This displays fun fact and suggestions while slides are still generating
          setEngagement(data)
          if (data.suggestedQuestions) {
            setQuestionQueue(data.suggestedQuestions)
          }
        })
        .catch((err) => {
          // Engagement failure is non-critical, log but continue
          console.warn('Engagement fetch failed:', err.message)
        })

      // Main generation call - this takes longer (~10-20s)
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          topicId: null, // New topic for now
          conversationHistory: [],
        }),
      })

      if (!generateResponse.ok) {
        throw new Error(`Generate API failed: ${generateResponse.status}`)
      }

      const generateData = await generateResponse.json()

      // Wait for engagement to complete before transitioning (if still pending)
      await engagementPromise

      // Update topics list with the new topic
      if (generateData.topic) {
        setTopics((prev) => {
          // Add new topic, evicting oldest if we have 3 already
          const newTopics = [...prev, generateData.topic]
          if (newTopics.length > 3) {
            return newTopics.slice(-3)
          }
          return newTopics
        })
      }

      // Store slides and transition to slideshow view
      if (generateData.slides && generateData.slides.length > 0) {
        setSlides(generateData.slides)
        setCurrentIndex(0)
        setUiState(UI_STATE.SLIDESHOW)
      } else {
        // No slides returned - stay in generating state with a message
        // In production, the backend would always return slides
        console.warn('No slides returned from API')
        // Fall back to listening state since there's nothing to show
        setUiState(UI_STATE.LISTENING)
      }
    } catch (error) {
      console.error('API request failed:', error)
      // Return to listening state on error so user can try again
      setUiState(UI_STATE.LISTENING)
      // In production, show an error toast/notification to the user
    }
  }

  const handleTextSubmit = (e) => {
    e.preventDefault()
    handleQuestion(textInput)
  }

  const handleExampleClick = (question) => {
    handleQuestion(question)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <main className="w-full max-w-[800px]">
        {uiState === UI_STATE.LISTENING && (
          <div className="flex flex-col items-center gap-6">
            {/* Waveform placeholder */}
            <div className="flex items-center justify-center gap-1 h-16">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full waveform-bar"
                  style={{
                    height: `${Math.random() * 40 + 10}px`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>

            {/* Status text or live transcription */}
            <p className="text-lg text-gray-500">
              {liveTranscription || "Ask me anything..."}
            </p>

            {/* Text input fallback */}
            <form onSubmit={handleTextSubmit} className="w-full max-w-md">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type your question here..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:outline-none"
              />
            </form>

            {/* Example questions (cold start only) */}
            {isColdStart && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-400">Try asking:</p>
                {EXAMPLE_QUESTIONS.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(question)}
                    className="block w-full px-4 py-3 text-left bg-surface hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    "{question}"
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {uiState === UI_STATE.GENERATING && (
          <div className="flex flex-col items-center gap-6">
            {/* Loader */}
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />

            <p className="text-lg">Creating your explanation...</p>
            <p className="text-sm text-gray-500">[0/4 slides ready]</p>

            {/* Fun fact card */}
            {engagement?.funFact && (
              <div className="w-full max-w-md p-4 bg-primary/10 rounded-xl">
                <span className="text-2xl">{engagement.funFact.emoji}</span>
                <p className="mt-2 text-gray-600">{engagement.funFact.text}</p>
              </div>
            )}

            {/* Suggestion cards */}
            {engagement?.suggestedQuestions && (
              <div className="w-full max-w-md space-y-2">
                <p className="text-sm text-gray-400">You might also wonder...</p>
                {engagement.suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    className="flex items-center justify-between w-full px-4 py-3 bg-surface border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <span>{q}</span>
                    <span className="text-primary">+</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {uiState === UI_STATE.SLIDESHOW && slides.length > 0 && (
          <div className="flex flex-col items-center gap-4">
            {/* Slide image */}
            <div className="w-full aspect-video bg-surface rounded-xl shadow-lg overflow-hidden">
              <img
                src={slides[currentIndex]?.imageUrl}
                alt="Slide diagram"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Subtitle */}
            <p className="text-lg text-center max-h-20 overflow-hidden">
              {slides[currentIndex]?.subtitle}
            </p>

            {/* Progress dots - clickable navigation indicators */}
            <div className="flex items-center gap-2" role="tablist" aria-label="Slide navigation">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  role="tab"
                  aria-selected={i === currentIndex}
                  aria-label={`Go to slide ${i + 1} of ${slides.length}`}
                  className={`w-3 h-3 rounded-full transition-colors cursor-pointer hover:scale-125 ${
                    i === currentIndex ? 'bg-primary' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            {/* Controls - arrow buttons and play/pause */}
            <div className="flex items-center gap-4">
              <button
                onClick={goToPrevSlide}
                disabled={currentIndex === 0}
                aria-label="Previous slide"
                className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                  currentIndex === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:text-primary hover:bg-gray-100'
                }`}
              >
                <span aria-hidden="true">&#9664;</span>
              </button>
              <button
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
                className="p-3 min-w-[44px] min-h-[44px] bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
              >
                <span aria-hidden="true">{isPlaying ? '\u275A\u275A' : '\u25B6'}</span>
              </button>
              <button
                onClick={goToNextSlide}
                disabled={currentIndex === slides.length - 1}
                aria-label="Next slide"
                className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                  currentIndex === slides.length - 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:text-primary hover:bg-gray-100'
                }`}
              >
                <span aria-hidden="true">&#9654;</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Mic button - always visible */}
      <button
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-primary text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-105 transition-transform"
        disabled={uiState === UI_STATE.GENERATING}
      >
        🎤
      </button>
    </div>
  )
}

export default App
