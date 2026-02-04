/**
 * PredictionRecorder - Voice recording for user predictions
 *
 * Allows users to record their prediction about what would happen in the scenario.
 * Based on VoiceQuestion component patterns.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import logger from '../../../utils/logger'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

/**
 * @param {Object} props
 * @param {Function} props.onStartRecording - Callback when recording starts
 * @param {Function} props.onSubmitPrediction - Callback when prediction is submitted
 * @param {boolean} props.isRecording - Whether currently recording
 * @param {boolean} props.disabled - Whether recording is disabled
 */
export default function PredictionRecorder({
  onStartRecording,
  onSubmitPrediction,
  isRecording = false,
  disabled = false,
}) {
  // Recording state
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingDuration, setRecordingDuration] = useState(0)

  // Transcription state
  const [transcript, setTranscript] = useState('')
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

  /**
   * Start audio recording
   */
  const startRecording = useCallback(async () => {
    if (disabled) return

    // Reset previous state
    setTranscriptionError(null)
    setTranscript('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio analyzer for waveform
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
      setRecordingDuration(0)
      onStartRecording?.()

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
    } catch (err) {
      logger.error('WHATIF', 'Failed to start recording', { error: err.message })
      setTranscriptionError('Microphone access denied. Please allow microphone access.')
    }
  }, [disabled, onStartRecording])

  /**
   * Stop audio recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()

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
   */
  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true)
    setTranscriptionError(null)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch(`${API_BASE}/api/transcribe`, {
        method: 'POST',
        body: formData,
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
      logger.error('WHATIF', 'Transcription error', { error: err.message })
      setTranscriptionError(err.message || 'Failed to transcribe audio. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  /**
   * Submit the transcribed prediction
   */
  const handleSubmit = useCallback(() => {
    if (!transcript.trim() || disabled) return
    onSubmitPrediction?.(transcript.trim())
  }, [transcript, disabled, onSubmitPrediction])

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

  // Generate waveform bars
  const waveformBars = Array.from({ length: 20 }, (_, i) => {
    const baseHeight = 8
    const maxHeight = 40
    const variation = Math.sin((i / 20) * Math.PI) * audioLevel
    const height = baseHeight + variation * (maxHeight - baseHeight)
    return height
  })

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-col items-center gap-6">
        {/* Waveform visualization (shown during recording) */}
        {isRecording && (
          <div className="flex items-center justify-center gap-1 h-12">
            {waveformBars.map((height, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full transition-all duration-75"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        )}

        {/* Recording duration indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Recording: {formatDuration(recordingDuration)}
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
        {transcriptionError && (
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

        {/* Transcript display (after recording, before submission) */}
        {transcript && !isRecording && !isTranscribing && (
          <div className="w-full max-w-md">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 text-center mb-2">
              Your prediction:
            </label>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl">
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

        {/* Mic button (shown when not recording and no transcript yet) */}
        {!isRecording && !transcript && !isTranscribing && (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="
              w-20 h-20 rounded-full flex items-center justify-center
              bg-gradient-to-br from-blue-600 to-cyan-500 text-white
              shadow-lg hover:shadow-xl transform hover:scale-105
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            aria-label="Start recording your prediction"
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
            ? "Speak your prediction, then tap to stop"
            : transcript
              ? 'Review your prediction and submit'
              : 'Tap the mic to share your thinking'}
        </p>

        {/* Submit button (shown after transcription) */}
        {transcript && !isRecording && !isTranscribing && (
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="
              px-8 py-3 rounded-full font-medium
              bg-gradient-to-r from-blue-600 to-cyan-500 text-white
              shadow-lg hover:shadow-xl
              transform hover:scale-105 active:scale-95
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Submit Prediction
          </button>
        )}
      </div>
    </div>
  )
}
