/**
 * VoiceQuestion Component
 * WB004: Voice answer quiz question
 *
 * Features:
 * - Display question text prominently
 * - Large mic button (reuses existing mic UI patterns)
 * - Recording state with waveform visualization
 * - "Listening..." indicator during recording
 * - Transcription display after speaking
 * - Submit button after transcription
 * - AI evaluates semantic meaning (not exact match)
 * - Feedback explains why answer was correct/incorrect
 */

import { useState, useRef, useEffect, useCallback } from 'react'

// API base URL for backend calls
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

/**
 * VoiceQuestion component for spoken answer quiz questions
 *
 * @param {Object} props
 * @param {string} props.question - The question text to display
 * @param {string[]} props.expectedTopics - Topics the answer should cover (for semantic evaluation)
 * @param {string} props.sampleAnswer - Example of a correct answer (for reference)
 * @param {function} props.onAnswer - Callback when user submits their transcribed answer
 * @param {boolean} props.showFeedback - Whether to show feedback state
 * @param {Object} props.feedback - Feedback object { correct: boolean, explanation: string }
 * @param {string} props.userTranscript - User's transcribed answer (for feedback display)
 * @param {string} props.correctAnswer - The correct answer (for feedback display)
 */
export default function VoiceQuestion({
  question,
  expectedTopics = [],
  sampleAnswer,
  onAnswer,
  showFeedback = false,
  feedback = null,
  userTranscript = '',
  correctAnswer
}) {
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingDuration, setRecordingDuration] = useState(0)

  // Transcription state
  const [transcript, setTranscript] = useState(userTranscript)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState(null)

  // Refs for recording
  const mediaRecorderRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Sync userTranscript prop with local state (for feedback display)
  useEffect(() => {
    if (showFeedback && userTranscript) {
      setTranscript(userTranscript)
    }
  }, [showFeedback, userTranscript])

  /**
   * Start audio recording
   * Uses MediaRecorder API and Web Audio API for waveform visualization
   */
  const startRecording = useCallback(async () => {
    // Reset any previous state
    setTranscriptionError(null)
    setTranscript('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio analyzer for waveform visualization
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)

      // Start media recorder
      mediaRecorderRef.current = new MediaRecorder(stream)
      chunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null

        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }

        // Send audio for transcription
        await transcribeAudio(blob)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingDuration(0)

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)

      // Start audio level animation for waveform
      const updateLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average / 255)
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()
    } catch (err) {
      console.error('Failed to start recording:', err)
      setTranscriptionError('Microphone access denied. Please allow microphone access to answer.')
    }
  }, [])

  /**
   * Stop audio recording
   * This triggers the onstop handler which sends audio for transcription
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isRecording])

  /**
   * Send audio blob to backend for transcription
   * Uses /api/transcribe endpoint with Gemini STT
   */
  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true)
    setTranscriptionError(null)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch(`${API_BASE}/api/transcribe`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Transcription failed')
      }

      const data = await response.json()

      if (!data.transcription || data.transcription.trim() === '') {
        setTranscriptionError('Could not understand the audio. Please try speaking more clearly.')
        setTranscript('')
      } else {
        setTranscript(data.transcription)
      }
    } catch (err) {
      console.error('Transcription error:', err)
      setTranscriptionError(err.message || 'Failed to transcribe audio. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  /**
   * Submit the transcribed answer
   */
  const handleSubmit = useCallback(() => {
    if (!transcript.trim() || showFeedback) return
    onAnswer?.(transcript.trim())
  }, [transcript, showFeedback, onAnswer])

  /**
   * Clear transcript and allow re-recording
   */
  const handleRetry = useCallback(() => {
    setTranscript('')
    setTranscriptionError(null)
  }, [])

  /**
   * Format recording duration as mm:ss
   */
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Generate waveform bars based on audio level
  const waveformBars = Array.from({ length: 20 }, (_, i) => {
    const baseHeight = 8
    const maxHeight = 40
    const variation = Math.sin((i / 20) * Math.PI) * audioLevel
    const height = baseHeight + variation * (maxHeight - baseHeight)
    return height
  })

  // Get feedback styling
  const getFeedbackStyle = () => {
    if (!showFeedback || !feedback) return null

    if (feedback.correct) {
      return {
        borderColor: 'border-success',
        bgColor: 'bg-success/10',
        textColor: 'text-success',
        icon: (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        )
      }
    }

    return {
      borderColor: 'border-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-600 dark:text-red-400',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
        </svg>
      )
    }
  }

  if (!question) return null

  const feedbackStyle = getFeedbackStyle()

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      {/* Question text */}
      <div className="mb-8 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700">
        <p className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-100 leading-relaxed text-center">
          {question}
        </p>
      </div>

      {/* Recording and Transcription Area */}
      <div className="flex flex-col items-center gap-6">
        {/* Waveform visualization (shown during recording) */}
        {isRecording && (
          <div className="flex items-center justify-center gap-1 h-12">
            {waveformBars.map((height, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-primary to-cyan-400 rounded-full transition-all duration-75"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        )}

        {/* Recording duration indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Listening: {formatDuration(recordingDuration)}
          </div>
        )}

        {/* Transcribing indicator */}
        {isTranscribing && (
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Transcribing...</span>
          </div>
        )}

        {/* Transcription error */}
        {transcriptionError && !showFeedback && (
          <div className="w-full max-w-md p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{transcriptionError}</p>
            <button
              onClick={handleRetry}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Transcript display (after recording, before feedback) */}
        {transcript && !isRecording && !isTranscribing && !showFeedback && (
          <div className="w-full max-w-md">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 text-center mb-2">
              Your answer:
            </label>
            <div className="p-4 bg-primary/5 border-2 border-primary/30 rounded-xl">
              <p className="text-lg text-gray-800 dark:text-gray-100 text-center leading-relaxed">
                "{transcript}"
              </p>
            </div>
            <div className="flex justify-center mt-3">
              <button
                onClick={handleRetry}
                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Record again
              </button>
            </div>
          </div>
        )}

        {/* Transcript display with feedback */}
        {showFeedback && transcript && feedbackStyle && (
          <div className="w-full max-w-md">
            <div className={`p-4 border-2 rounded-xl ${feedbackStyle.borderColor} ${feedbackStyle.bgColor}`}>
              <div className="flex items-start gap-3">
                <span className={feedbackStyle.textColor}>{feedbackStyle.icon}</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Your answer:</p>
                  <p className="text-lg text-gray-800 dark:text-gray-100 leading-relaxed">
                    "{transcript}"
                  </p>
                </div>
              </div>
            </div>

            {/* Show correct answer if wrong */}
            {!feedback?.correct && correctAnswer && (
              <div className="mt-4 p-4 bg-success/10 border border-success/20 rounded-xl">
                <p className="text-sm text-success dark:text-success-400 mb-1">
                  Sample answer:
                </p>
                <p className="text-success dark:text-success-400 font-medium">
                  {correctAnswer}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Mic button (shown when not recording and no transcript yet) */}
        {!isRecording && !transcript && !isTranscribing && !showFeedback && (
          <button
            onClick={startRecording}
            className="
              w-20 h-20 rounded-full flex items-center justify-center
              bg-gradient-to-br from-primary to-cyan-500 text-white
              shadow-lg hover:shadow-xl transform hover:scale-105
              transition-all duration-200
            "
            aria-label="Start recording your answer"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>
        )}

        {/* Stop recording button */}
        {isRecording && (
          <button
            onClick={stopRecording}
            className="
              w-20 h-20 rounded-full flex items-center justify-center
              bg-gradient-to-br from-red-500 to-orange-500 text-white
              shadow-lg hover:shadow-xl transform hover:scale-105
              transition-all duration-200 animate-pulse
            "
            aria-label="Stop recording and submit"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        )}

        {/* Instructions */}
        {!showFeedback && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
            {isRecording
              ? "Tap the button when you're done"
              : transcript
                ? 'Review your answer and submit'
                : 'Tap to record your answer'}
          </p>
        )}

        {/* Submit button (shown after transcription, before feedback) */}
        {transcript && !isRecording && !isTranscribing && !showFeedback && (
          <button
            onClick={handleSubmit}
            className="
              px-8 py-3 rounded-full font-medium
              bg-gradient-to-r from-primary to-cyan-500 text-white
              shadow-lg hover:shadow-xl
              transform hover:scale-105 active:scale-95
              transition-all duration-200
            "
          >
            Check Answer
          </button>
        )}
      </div>
    </div>
  )
}
