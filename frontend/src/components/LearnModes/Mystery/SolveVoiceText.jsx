/**
 * SolveVoiceText - Voice recording or text input for theory explanation
 *
 * Extracted from TheorySolver.jsx - pure voice/text input component.
 * Handles voice recording, transcription, and text typing modes.
 * Submits theory with metadata about input method.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { playMicOnSound } from '../../../utils/soundEffects'
import logger from '../../../utils/logger'

// API base URL for backend calls
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

// Max recording duration in seconds
const MAX_RECORDING_DURATION = 60

/**
 * @param {Object} props
 * @param {string} props.topicName - The topic/mystery name for context
 * @param {string[]} props.expectedConcepts - Expected concepts (unused but kept for future)
 * @param {Function} props.onSubmit - Callback with {theory: string, isVoice: boolean}
 * @param {boolean} props.disabled - Prevents interaction when true
 */
export default function SolveVoiceText({
  topicName,
  expectedConcepts = [],
  onSubmit,
  disabled = false
}) {
  // Mode state
  const [isVoiceMode, setIsVoiceMode] = useState(true)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingDuration, setRecordingDuration] = useState(0)

  // Transcription state
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState(null)

  // Text input state
  const [typedTheory, setTypedTheory] = useState('')
  const textareaRef = useRef(null)

  // Recording refs
  const mediaRecorderRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  // Cleanup on unmount
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

  // Focus textarea when typing mode is enabled
  useEffect(() => {
    if (!isVoiceMode && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isVoiceMode])

  // Auto-stop recording at max duration
  useEffect(() => {
    if (isRecording && recordingDuration >= MAX_RECORDING_DURATION) {
      stopRecording()
    }
  }, [recordingDuration, isRecording, stopRecording])

  /**
   * Toggle between voice and text mode
   */
  const handleToggleMode = useCallback(() => {
    setIsVoiceMode((prev) => !prev)
    setTranscript('')
    setTypedTheory('')
    setTranscriptionError(null)
  }, [])

  /**
   * Start audio recording
   */
  const startRecording = useCallback(async () => {
    if (disabled) return

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

      // Start audio level animation
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

      playMicOnSound()
    } catch (err) {
      logger.error('MYSTERY', 'Failed to start recording', { error: err.message })
      setTranscriptionError('Microphone access denied. Please allow microphone access.')
      setIsRecording(false)
    }
  }, [disabled])

  /**
   * Stop audio recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      setIsRecording(false)
    }
  }, [])

  /**
   * Transcribe audio blob
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
      logger.error('MYSTERY', 'Transcription error', { error: err.message })
      setTranscriptionError(err.message || 'Failed to transcribe audio. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  /**
   * Submit the theory
   */
  const handleSubmit = useCallback(() => {
    const theory = isVoiceMode ? transcript.trim() : typedTheory.trim()
    if (!theory || disabled) return

    onSubmit?.({
      theory,
      isVoice: isVoiceMode
    })
  }, [isVoiceMode, transcript, typedTheory, disabled, onSubmit])

  /**
   * Retry recording
   */
  const handleRetry = useCallback(() => {
    setTranscript('')
    setTranscriptionError(null)
  }, [])

  /**
   * Format recording duration
   */
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Generate waveform bars
  const waveformBars = Array.from({ length: 20 }, (_, i) => {
    const baseHeight = 8
    const maxHeight = 40
    const variation = Math.sin((i / 20) * Math.PI) * audioLevel
    const height = baseHeight + variation * (maxHeight - baseHeight)
    return height
  })

  const showModeToggle = !isRecording && !isTranscribing && !transcript && !typedTheory

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-700 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🗣️</span>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Your Theory
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Explain what you think is happening
          </p>
        </div>
      </div>

      {/* Mode Toggle */}
      {showModeToggle && (
        <div className="flex justify-center mb-6">
          <button
            onClick={handleToggleMode}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVoiceMode ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V6.75z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 8.25h.01M9 8.25h.01M12 8.25h.01M15 8.25h.01M18 8.25h.01M6 11.25h.01M9 11.25h.01M12 11.25h.01M15 11.25h.01M18 11.25h.01M7.5 14.25h9"
                  />
                </svg>
                <span>Type instead</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
                <span>Use voice</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Text Input Mode */}
      {!isVoiceMode && (
        <div className="space-y-4">
          <textarea
            ref={textareaRef}
            value={typedTheory}
            onChange={(e) => setTypedTheory(e.target.value.slice(0, 500))}
            placeholder="Type your theory here..."
            rows={4}
            maxLength={500}
            disabled={disabled}
            className="w-full px-4 py-3 rounded-xl border-2 text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-offset-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {typedTheory.length}/500 characters
            </span>
            {typedTheory.trim() && (
              <button
                onClick={handleSubmit}
                disabled={disabled}
                className="px-6 py-2 rounded-full font-medium bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Submit Theory
              </button>
            )}
          </div>
        </div>
      )}

      {/* Voice Recording Mode */}
      {isVoiceMode && (
        <div className="flex flex-col items-center gap-4">
          {/* Waveform Visualization */}
          {isRecording && (
            <div className="flex items-center justify-center gap-1 h-12">
              {waveformBars.map((height, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-purple-600 to-indigo-400 rounded-full transition-all duration-75"
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
          )}

          {/* Recording Duration */}
          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Recording: {formatDuration(recordingDuration)} / {formatDuration(MAX_RECORDING_DURATION)}
            </div>
          )}

          {/* Transcribing Indicator */}
          {isTranscribing && (
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Transcribing...</span>
            </div>
          )}

          {/* Transcription Error */}
          {transcriptionError && (
            <div className="w-full p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
              <p className="text-sm text-red-600 dark:text-red-400">{transcriptionError}</p>
              <button
                onClick={handleRetry}
                disabled={disabled}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
              >
                Try again
              </button>
            </div>
          )}

          {/* Transcript Display */}
          {transcript && !isRecording && !isTranscribing && (
            <div className="w-full space-y-3">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-xl">
                <p className="text-gray-800 dark:text-gray-100 leading-relaxed">
                  "{transcript}"
                </p>
              </div>
              <button
                onClick={handleRetry}
                disabled={disabled}
                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                Record again
              </button>
            </div>
          )}

          {/* Mic Button */}
          {!isRecording && !transcript && !isTranscribing && (
            <button
              onClick={startRecording}
              disabled={disabled}
              className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              aria-label="Start recording your theory"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
          )}

          {/* Stop Recording Button */}
          {isRecording && (
            <button
              onClick={stopRecording}
              disabled={disabled}
              className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 animate-pulse disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Stop recording"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          )}

          {/* Instructions */}
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
            {isRecording
              ? "Tap when you're done"
              : transcript
                ? 'Review your theory and submit'
                : 'Tap to record your theory'}
          </p>

          {/* Submit Button */}
          {transcript && !isRecording && !isTranscribing && (
            <button
              onClick={handleSubmit}
              disabled={disabled}
              className="px-8 py-3 rounded-full font-medium bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Submit Theory
            </button>
          )}
        </div>
      )}
    </div>
  )
}
