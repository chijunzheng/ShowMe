import { useState } from 'react'

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

            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentIndex ? 'bg-primary' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                className="p-2 text-gray-500 hover:text-primary"
              >
                ◀
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 bg-primary text-white rounded-full"
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <button
                onClick={() => setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))}
                className="p-2 text-gray-500 hover:text-primary"
              >
                ▶
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
