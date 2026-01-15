import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import FunFactCard from './components/FunFactCard'
import SuggestionCard from './components/SuggestionCard'
import Toast from './components/Toast'
import TopicHeader from './components/TopicHeader'

// App states
const UI_STATE = {
  LISTENING: 'listening',
  GENERATING: 'generating',
  SLIDESHOW: 'slideshow',
}

// Microphone permission states
const PERMISSION_STATE = {
  PROMPT: 'prompt',
  GRANTED: 'granted',
  DENIED: 'denied',
}

// Maximum number of topics to retain in state (LRU eviction beyond this - F041, F042)
const MAX_TOPICS = 3

// Example questions for cold start
const EXAMPLE_QUESTIONS = [
  "How do black holes work?",
  "Why do we dream?",
  "How does WiFi work?",
]

// Audio configuration constants
const AUDIO_CONFIG = {
  // Number of bars in the waveform visualization
  WAVEFORM_BARS: 20,
  // Silence detection threshold (0-255 range from analyser)
  SILENCE_THRESHOLD: 15,
  // Duration of silence before triggering generation (ms)
  SILENCE_DURATION: 1500,
  // Audio analyser FFT size (must be power of 2)
  FFT_SIZE: 256,
  // Animation frame interval for waveform updates (ms)
  ANIMATION_INTERVAL: 50,
}

/**
 * Creates a header slide object for a topic (F040, F043)
 * Header slides display the topic icon and name as a divider
 * @param {Object} topic - Topic object with id, name, icon
 * @returns {Object} Header slide object
 */
function createHeaderSlide(topic) {
  return {
    id: `header_${topic.id}`,
    type: 'header',
    topicId: topic.id,
    topicName: topic.name,
    topicIcon: topic.icon,
    // Header slides don't have imageUrl, audioUrl, subtitle, or duration
    // They are rendered using the TopicHeader component
  }
}

function App() {
  const [uiState, setUiState] = useState(UI_STATE.LISTENING)
  const [isColdStart, setIsColdStart] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [liveTranscription, setLiveTranscription] = useState('')
  const [textInput, setTextInput] = useState('')
  const [engagement, setEngagement] = useState(null)
  const [questionQueue, setQuestionQueue] = useState([])

  /**
   * Topics state structure (F041):
   * Array of topic objects, each containing:
   * - id: Unique topic identifier
   * - name: Display name for the topic
   * - icon: Emoji icon for the topic
   * - headerSlide: The header/divider slide for this topic (F040, F043)
   * - slides: Array of content slides for this topic
   * - createdAt: Timestamp for LRU ordering
   *
   * Topics are ordered by creation time (oldest first).
   * When a 4th topic is added, the oldest (first) is evicted (F042).
   */
  const [topics, setTopics] = useState([])

  /**
   * Computed flat array of all slides from all topics for navigation (F044)
   * Includes header slides at the start of each topic
   * Order: [topic1Header, topic1Slides..., topic2Header, topic2Slides..., ...]
   */
  const allSlides = useMemo(() => {
    const slides = []
    for (const topic of topics) {
      // Add header slide first (F040, F043)
      if (topic.headerSlide) {
        slides.push(topic.headerSlide)
      }
      // Add content slides
      if (topic.slides && topic.slides.length > 0) {
        slides.push(...topic.slides)
      }
    }
    return slides
  }, [topics])

  /**
   * Get the currently active topic (most recently added)
   * Used for classify API calls
   */
  const activeTopic = useMemo(() => {
    if (topics.length === 0) return null
    return topics[topics.length - 1]
  }, [topics])

  // Toast notification state for queue feedback (F047)
  const [toast, setToast] = useState({ visible: false, message: '' })

  // Voice input state
  const [isListening, setIsListening] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [permissionState, setPermissionState] = useState(PERMISSION_STATE.PROMPT)

  // Audio refs - these persist across renders without causing re-renders
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const animationFrameRef = useRef(null)
  const lastSpeechTimeRef = useRef(null)

  // Track whether slideshow just finished (for auto-trigger of queued questions - F048)
  const hasFinishedSlideshowRef = useRef(false)

  // Default slide duration in milliseconds (used when slide.duration is not available)
  const DEFAULT_SLIDE_DURATION = 5000

  // Navigation helper functions with bounds checking (F044)
  const goToNextSlide = useCallback(() => {
    setCurrentIndex((prev) => Math.min(allSlides.length - 1, prev + 1))
  }, [allSlides.length])

  const goToPrevSlide = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  /**
   * Show a toast notification (F047)
   * @param {string} message - Message to display
   */
  const showToast = useCallback((message) => {
    setToast({ visible: true, message })
  }, [])

  /**
   * Hide the toast notification
   */
  const hideToast = useCallback(() => {
    setToast({ visible: false, message: '' })
  }, [])

  /**
   * Toggle a question's queue status (F047)
   * Adds if not in queue, removes if already queued
   * @param {string} question - Question to toggle
   */
  const toggleQueueStatus = useCallback((question) => {
    setQuestionQueue((prev) => {
      if (prev.includes(question)) {
        // Remove from queue - no toast for removal
        return prev.filter((q) => q !== question)
      }
      // Add to queue and show confirmation toast
      showToast('Question added to queue')
      return [...prev, question]
    })
  }, [showToast])

  /**
   * Check if a question is currently in the queue
   * @param {string} question - Question to check
   * @returns {boolean} Whether the question is queued
   */
  const isQuestionQueued = useCallback((question) => {
    return questionQueue.includes(question)
  }, [questionQueue])

  // Auto-advance slideshow when playing (F044)
  // Uses slide.duration if available, otherwise falls back to DEFAULT_SLIDE_DURATION
  // Header slides advance faster since they're just dividers
  useEffect(() => {
    // Only run auto-advance when in slideshow state, playing, and slides exist
    if (uiState !== UI_STATE.SLIDESHOW || !isPlaying || allSlides.length === 0) {
      return
    }

    // Get duration for current slide (in milliseconds)
    const currentSlide = allSlides[currentIndex]
    // Header slides should advance faster since they're just dividers (2 seconds)
    const duration = currentSlide?.type === 'header'
      ? 2000
      : (currentSlide?.duration || DEFAULT_SLIDE_DURATION)

    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1
        // If we reach the end, stop playing and mark slideshow as finished (F048)
        if (nextIndex >= allSlides.length) {
          setIsPlaying(false)
          hasFinishedSlideshowRef.current = true
          return prev
        }
        return nextIndex
      })
    }, duration)

    // Cleanup interval on unmount or when dependencies change
    return () => clearInterval(intervalId)
  }, [uiState, isPlaying, currentIndex, allSlides])

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
    if (uiState === UI_STATE.SLIDESHOW && allSlides.length > 0) {
      setIsPlaying(true)
    }
  }, [uiState, allSlides.length])

  // Auto-trigger queued questions after slideshow ends (F048)
  // This creates a seamless learning flow where users can queue questions
  // during generation and have them automatically explored
  useEffect(() => {
    // Only trigger when slideshow just finished and there are queued questions
    if (!hasFinishedSlideshowRef.current || questionQueue.length === 0) {
      return
    }

    // Small delay before auto-triggering to let user see the final slide
    const timer = setTimeout(() => {
      // Get the next question from the queue
      const nextQuestion = questionQueue[0]

      // Remove it from the queue
      setQuestionQueue((prev) => prev.slice(1))

      // Reset the flag
      hasFinishedSlideshowRef.current = false

      // Trigger the question
      handleQuestion(nextQuestion)
    }, 1500) // 1.5 second delay for natural transition

    return () => clearTimeout(timer)
  }, [questionQueue])

  /**
   * Analyzes audio frequency data to calculate overall audio level.
   * Uses the AnalyserNode to get real-time frequency data and computes
   * an average that drives the waveform visualization.
   */
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isListening) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Calculate average audio level from frequency data (0-255 range)
    const sum = dataArray.reduce((acc, val) => acc + val, 0)
    const average = sum / dataArray.length

    // Normalize to 0-100 scale for easier UI consumption
    const normalizedLevel = Math.min(100, (average / 255) * 100 * 2)
    setAudioLevel(normalizedLevel)

    // Speech detection: if audio level exceeds threshold, user is speaking
    const isSpeaking = average > AUDIO_CONFIG.SILENCE_THRESHOLD

    if (isSpeaking) {
      // User is speaking - record the time and update transcription status
      lastSpeechTimeRef.current = Date.now()
      setLiveTranscription('Listening...')

      // Clear any existing silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
    } else if (lastSpeechTimeRef.current) {
      // User was speaking but is now silent - check for silence duration
      const silenceDuration = Date.now() - lastSpeechTimeRef.current

      if (silenceDuration >= AUDIO_CONFIG.SILENCE_DURATION && !silenceTimerRef.current) {
        // Silence threshold exceeded - trigger generation
        setLiveTranscription('Processing...')
        silenceTimerRef.current = setTimeout(() => {
          handleVoiceComplete()
        }, 100) // Small delay to ensure we capture any trailing audio
      }
    }

    // Continue the animation loop
    animationFrameRef.current = requestAnimationFrame(analyzeAudio)
  }, [isListening])

  /**
   * Starts the audio analysis loop when listening begins.
   * This effect manages the requestAnimationFrame cycle.
   */
  useEffect(() => {
    if (isListening && analyserRef.current) {
      analyzeAudio()
    }

    return () => {
      // Cancel animation frame on cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isListening, analyzeAudio])

  /**
   * Stops voice recording and cleans up audio resources.
   * Called when user manually stops or when silence is detected.
   */
  const stopListening = useCallback(() => {
    setIsListening(false)
    setAudioLevel(0)

    // Stop the media recorder if it's recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    // Stop all tracks in the media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Close the audio context to free resources
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Clear any pending timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    analyserRef.current = null
    mediaRecorderRef.current = null
    lastSpeechTimeRef.current = null
  }, [])

  // Cleanup audio resources when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all audio resources on unmount
      // Direct cleanup without calling stopListening to avoid stale closure
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  /**
   * Handles completion of voice recording.
   * Stops recording, processes audio chunks, and triggers generation.
   */
  const handleVoiceComplete = useCallback(() => {
    // Stop the media recorder to trigger ondataavailable with final chunk
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    stopListening()

    // Process collected audio (in real implementation, send to STT API)
    // For now, use placeholder text since real STT integration comes later
    if (audioChunksRef.current.length > 0) {
      // In production: send audioChunksRef.current to Gemini STT
      // For now, trigger with placeholder to test the flow
      const placeholderQuery = "How do computers work?"
      handleQuestion(placeholderQuery)
    }

    // Reset audio chunks for next recording
    audioChunksRef.current = []
  }, [stopListening])

  /**
   * Starts voice capture by requesting microphone permission and
   * initializing Web Audio API components for analysis and recording.
   */
  const startListening = useCallback(async () => {
    try {
      // Request microphone permission with audio-only constraint
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Permission granted - update state
      setPermissionState(PERMISSION_STATE.GRANTED)
      streamRef.current = stream

      // Create audio context for real-time analysis
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = audioContext

      // Create analyser node for frequency data (drives waveform visualization)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = AUDIO_CONFIG.FFT_SIZE
      analyser.smoothingTimeConstant = 0.8 // Smooth out rapid changes
      analyserRef.current = analyser

      // Connect microphone stream to analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      // Note: We don't connect to destination to avoid feedback

      // Create MediaRecorder for capturing audio chunks
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      })
      mediaRecorderRef.current = mediaRecorder

      // Collect audio chunks as they become available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Handle recording stop
      mediaRecorder.onstop = () => {
        // Audio blob could be created here for processing:
        // const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      }

      // Start recording with timeslice for periodic data chunks
      mediaRecorder.start(100) // Emit data every 100ms

      // Reset state for new recording session
      audioChunksRef.current = []
      lastSpeechTimeRef.current = null
      setIsListening(true)
      setLiveTranscription('Listening...')
    } catch (error) {
      // Handle permission denial or other errors
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionState(PERMISSION_STATE.DENIED)
        console.warn('Microphone permission denied')
      } else {
        console.error('Error accessing microphone:', error)
      }
    }
  }, [])

  /**
   * Handles mic button click - toggles recording on/off.
   * If not listening, requests permission and starts capture.
   * If already listening, stops and processes the recording.
   */
  const handleMicClick = useCallback(() => {
    if (isListening) {
      // Stop current recording and trigger generation
      handleVoiceComplete()
    } else {
      // Start new recording session
      startListening()
    }
  }, [isListening, handleVoiceComplete, startListening])

  /**
   * Classify a query to determine if it's a follow-up or new topic
   * @param {string} query - The user's question
   * @returns {Promise<{classification: string, shouldEvictOldest: boolean, evictTopicId: string|null}>}
   */
  const classifyQuery = async (query) => {
    // If no active topic, it's always a new topic
    if (!activeTopic) {
      return {
        classification: 'new_topic',
        shouldEvictOldest: false,
        evictTopicId: null,
      }
    }

    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          activeTopicId: activeTopic.id,
          activeTopic: {
            name: activeTopic.name,
            icon: activeTopic.icon,
          },
          conversationHistory: [], // Could be enhanced with actual history
          topicCount: topics.length,
          oldestTopicId: topics.length > 0 ? topics[0].id : null,
        }),
      })

      if (!response.ok) {
        throw new Error(`Classify API failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Classification failed:', error)
      // Default to new topic on error
      return {
        classification: 'new_topic',
        shouldEvictOldest: topics.length >= MAX_TOPICS,
        evictTopicId: topics.length >= MAX_TOPICS ? topics[0].id : null,
      }
    }
  }

  /**
   * Handle a user question (from voice or text input)
   * Classifies the query, handles follow-up vs new topic, manages LRU eviction
   * F039: Follow-up appends slides
   * F040: New topic creates header card
   * F041: Max 3 topics retained
   * F042: 4th topic evicts oldest (LRU)
   */
  const handleQuestion = async (query) => {
    if (!query.trim()) return

    // Reset engagement from previous queries and transition to generating state
    setEngagement(null)
    setIsColdStart(false)
    setUiState(UI_STATE.GENERATING)
    setLiveTranscription('')
    setTextInput('')
    // Reset the slideshow finished flag when starting new generation
    hasFinishedSlideshowRef.current = false

    try {
      // Start engagement call immediately for fast feedback
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
          // Note: suggestedQuestions are displayed but NOT auto-added to queue
          // Users must tap them to add (F047)
          setEngagement(data)
        })
        .catch((err) => {
          // Engagement failure is non-critical, log but continue
          console.warn('Engagement fetch failed:', err.message)
        })

      // Classify the query to determine if it's a follow-up or new topic
      const classifyResult = await classifyQuery(query)
      const isFollowUp = classifyResult.classification === 'follow_up'

      let generateData
      let newTopicData = null

      if (isFollowUp && activeTopic) {
        // F039: Follow-up query appends slides to current topic
        const response = await fetch('/api/generate/follow-up', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query.trim(),
            topicId: activeTopic.id,
            conversationHistory: [],
          }),
        })

        if (!response.ok) {
          throw new Error(`Follow-up API failed: ${response.status}`)
        }

        generateData = await response.json()
      } else {
        // F040, F041, F042: New topic - generate with header card
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query.trim(),
            topicId: null,
            conversationHistory: [],
          }),
        })

        if (!response.ok) {
          throw new Error(`Generate API failed: ${response.status}`)
        }

        generateData = await response.json()
        newTopicData = generateData.topic
      }

      // Wait for engagement to complete before transitioning (if still pending)
      await engagementPromise

      // Update state based on whether it's a follow-up or new topic
      if (isFollowUp && activeTopic && generateData.slides?.length > 0) {
        // F039: Append new slides to current topic, navigate to first new slide
        const previousSlideCount = activeTopic.slides?.length || 0

        setTopics((prev) => {
          const updated = [...prev]
          const topicIndex = updated.findIndex((t) => t.id === activeTopic.id)
          if (topicIndex !== -1) {
            updated[topicIndex] = {
              ...updated[topicIndex],
              slides: [...updated[topicIndex].slides, ...generateData.slides],
            }
          }
          return updated
        })

        // Navigate to the first new slide after appending
        // Calculate the index: sum of all previous topic slides + headers + current topic's previous slides + header
        let newSlideIndex = 0
        for (const topic of topics) {
          if (topic.id === activeTopic.id) {
            // Add 1 for header + previous slides count
            newSlideIndex += 1 + previousSlideCount
            break
          }
          // Count header + all slides for previous topics
          newSlideIndex += 1 + (topic.slides?.length || 0)
        }
        setCurrentIndex(newSlideIndex)
        setUiState(UI_STATE.SLIDESHOW)

      } else if (newTopicData && generateData.slides?.length > 0) {
        // F040, F041, F042: Create new topic with header card
        const newTopic = {
          id: newTopicData.id,
          name: newTopicData.name,
          icon: newTopicData.icon,
          headerSlide: createHeaderSlide(newTopicData),
          slides: generateData.slides,
          createdAt: Date.now(),
        }

        let newSlideIndex = 0

        setTopics((prev) => {
          let updated = [...prev]

          // F042: If we have 3 topics, evict the oldest (LRU)
          if (updated.length >= MAX_TOPICS) {
            // Remove the oldest topic (first in array)
            updated = updated.slice(1)
          }

          // Calculate the index for the new topic's header slide
          // This will be after all existing topics' slides
          for (const topic of updated) {
            newSlideIndex += 1 + (topic.slides?.length || 0)
          }

          // Add the new topic
          updated.push(newTopic)
          return updated
        })

        // Navigate to the header slide of the new topic
        setCurrentIndex(newSlideIndex)
        setUiState(UI_STATE.SLIDESHOW)

      } else {
        // No slides returned - stay in generating state with a message
        console.warn('No slides returned from API')
        setUiState(UI_STATE.LISTENING)
      }
    } catch (error) {
      console.error('API request failed:', error)
      // Return to listening state on error so user can try again
      setUiState(UI_STATE.LISTENING)
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
            {/* Waveform visualization - responds to audio input when listening */}
            <div className="flex items-center justify-center gap-1 h-16">
              {[...Array(AUDIO_CONFIG.WAVEFORM_BARS)].map((_, i) => {
                // Calculate bar height based on audio level when listening
                // Each bar gets a slightly different height for visual variety
                const baseHeight = 10
                const maxAdditionalHeight = 50

                // When listening, use actual audio level; otherwise use subtle animation
                let height
                if (isListening && audioLevel > 0) {
                  // Create wave effect by varying height based on bar position
                  // Bars in the middle are taller, creating a natural wave shape
                  const middleIndex = AUDIO_CONFIG.WAVEFORM_BARS / 2
                  const distanceFromMiddle = Math.abs(i - middleIndex)
                  const positionFactor = 1 - (distanceFromMiddle / middleIndex) * 0.5

                  // Add some randomness for organic feel
                  const randomFactor = 0.8 + Math.random() * 0.4

                  height = baseHeight + (audioLevel / 100) * maxAdditionalHeight * positionFactor * randomFactor
                } else {
                  // Default idle animation - gentle wave
                  height = baseHeight + Math.sin(Date.now() / 500 + i * 0.5) * 5 + 10
                }

                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isListening ? 'bg-primary' : 'bg-primary/50'
                    }`}
                    style={{
                      height: `${Math.max(baseHeight, Math.min(60, height))}px`,
                      // Only use CSS animation when not actively listening
                      animation: isListening ? 'none' : `wave 0.5s ease-in-out infinite`,
                      animationDelay: isListening ? '0s' : `${i * 0.05}s`,
                    }}
                  />
                )
              })}
            </div>

            {/* Status text or live transcription */}
            <p className={`text-lg ${isListening ? 'text-primary font-medium' : 'text-gray-500'}`}>
              {liveTranscription || "Ask me anything..."}
            </p>

            {/* Permission denied message */}
            {permissionState === PERMISSION_STATE.DENIED && (
              <p className="text-sm text-red-500">
                Microphone access denied. Please enable it in your browser settings.
              </p>
            )}

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

            {/* Fun fact card - displays while slides are generating (F045) */}
            {engagement?.funFact && (
              <FunFactCard funFact={engagement.funFact} />
            )}

            {/* Suggestion cards - follow-up questions to queue (F046, F047) */}
            {engagement?.suggestedQuestions && engagement.suggestedQuestions.length > 0 && (
              <div className="w-full max-w-md space-y-2 mt-2">
                <p className="text-sm text-gray-400">You might also wonder...</p>
                {engagement.suggestedQuestions.map((question, i) => (
                  <SuggestionCard
                    key={i}
                    question={question}
                    isQueued={isQuestionQueued(question)}
                    onToggleQueue={toggleQueueStatus}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {uiState === UI_STATE.SLIDESHOW && allSlides.length > 0 && (
          <div className="flex flex-col items-center gap-4">
            {/* Current slide content - F043, F044: handles both header and content slides */}
            {allSlides[currentIndex]?.type === 'header' ? (
              // F043: Render topic header card with TopicHeader component
              <div className="w-full aspect-video bg-surface rounded-xl shadow-lg overflow-hidden">
                <TopicHeader
                  icon={allSlides[currentIndex].topicIcon}
                  name={allSlides[currentIndex].topicName}
                />
              </div>
            ) : (
              // Regular content slide with image and subtitle
              <>
                <div className="w-full aspect-video bg-surface rounded-xl shadow-lg overflow-hidden">
                  <img
                    src={allSlides[currentIndex]?.imageUrl}
                    alt="Slide diagram"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Subtitle - only shown for content slides */}
                <p className="text-lg text-center max-h-20 overflow-hidden">
                  {allSlides[currentIndex]?.subtitle}
                </p>
              </>
            )}

            {/* F044: Progress dots - show all slides across all topics */}
            <div className="flex items-center gap-2 flex-wrap justify-center" role="tablist" aria-label="Slide navigation">
              {allSlides.map((slide, i) => {
                // Use different styling for header vs content dots
                const isHeader = slide.type === 'header'
                return (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentIndex(i)}
                    role="tab"
                    aria-selected={i === currentIndex}
                    aria-label={
                      isHeader
                        ? `Go to ${slide.topicName} topic header`
                        : `Go to slide ${i + 1} of ${allSlides.length}`
                    }
                    className={`transition-colors cursor-pointer hover:scale-125 ${
                      isHeader
                        ? `w-4 h-3 rounded ${i === currentIndex ? 'bg-primary' : 'bg-gray-400 hover:bg-gray-500'}`
                        : `w-3 h-3 rounded-full ${i === currentIndex ? 'bg-primary' : 'bg-gray-300 hover:bg-gray-400'}`
                    }`}
                  />
                )
              })}
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
                disabled={currentIndex === allSlides.length - 1}
                aria-label="Next slide"
                className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                  currentIndex === allSlides.length - 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:text-primary hover:bg-gray-100'
                }`}
              >
                <span aria-hidden="true">&#9654;</span>
              </button>
            </div>

            {/* Queue indicator - shows number of questions waiting (F048) */}
            {questionQueue.length > 0 && (
              <p className="text-sm text-gray-400 mt-2">
                {questionQueue.length} question{questionQueue.length > 1 ? 's' : ''} queued
              </p>
            )}
          </div>
        )}
      </main>

      {/* Mic button - always visible, with pulse animation when listening */}
      <button
        onClick={handleMicClick}
        disabled={uiState === UI_STATE.GENERATING}
        aria-label={isListening ? 'Stop recording' : 'Start recording'}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all ${
          uiState === UI_STATE.GENERATING
            ? 'bg-gray-300 cursor-not-allowed'
            : isListening
              ? 'bg-red-500 hover:bg-red-600 scale-110 mic-pulse'
              : 'bg-primary hover:scale-105'
        } text-white`}
      >
        {/* Show stop icon when listening, mic icon otherwise */}
        {isListening ? (
          <span aria-hidden="true" className="w-5 h-5 bg-white rounded" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-8 h-8"
            aria-hidden="true"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      {/* Toast notification for queue feedback (F047) */}
      <Toast
        message={toast.message}
        visible={toast.visible}
        onDismiss={hideToast}
      />
    </div>
  )
}

export default App
