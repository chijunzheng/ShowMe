/**
 * Custom hook for voice recording functionality
 * Handles MediaRecorder setup, audio analysis, and speech detection
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import logger from '../utils/logger.js'
import { AUDIO_CONFIG, PERMISSION_STATE } from '../constants/appConfig.js'

/**
 * Hook for managing voice recording with speech detection
 * @param {Object} options - Configuration options
 * @param {Function} options.onVoiceComplete - Callback when voice recording completes
 * @param {Function} options.onTranscriptionUpdate - Callback to update live transcription text
 * @returns {Object} Voice recording state and controls
 */
export default function useVoiceRecording({ onVoiceComplete, onTranscriptionUpdate }) {
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
  const speechStartedAtRef = useRef(null)
  const speechFrameCountRef = useRef(0)
  const isProcessingRecordingRef = useRef(false)
  const isStartingListeningRef = useRef(false)

  // Refs for callbacks (to avoid stale closures)
  const onVoiceCompleteRef = useRef(onVoiceComplete)
  const onTranscriptionUpdateRef = useRef(onTranscriptionUpdate)

  useEffect(() => {
    onVoiceCompleteRef.current = onVoiceComplete
  }, [onVoiceComplete])

  useEffect(() => {
    onTranscriptionUpdateRef.current = onTranscriptionUpdate
  }, [onTranscriptionUpdate])

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
      const now = Date.now()
      lastSpeechTimeRef.current = now
      if (!speechStartedAtRef.current) {
        speechStartedAtRef.current = now
      }
      speechFrameCountRef.current += 1
      onTranscriptionUpdateRef.current?.('')

      // Clear any existing silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
    } else if (lastSpeechTimeRef.current) {
      // User was speaking but is now silent - check for silence duration
      const silenceDuration = Date.now() - lastSpeechTimeRef.current

      if (silenceDuration >= AUDIO_CONFIG.SILENCE_DURATION && !silenceTimerRef.current) {
        logger.debug('AUDIO', 'Silence detected, triggering generation', {
          silenceDurationMs: silenceDuration,
          threshold: AUDIO_CONFIG.SILENCE_DURATION,
        })
        // Silence threshold exceeded - trigger generation
        onTranscriptionUpdateRef.current?.('Processing...')
        silenceTimerRef.current = setTimeout(() => {
          onVoiceCompleteRef.current?.()
        }, 100) // Small delay to ensure we capture any trailing audio
      }
    }

    // Continue the animation loop
    animationFrameRef.current = requestAnimationFrame(analyzeAudio)
  }, [isListening])

  /**
   * Starts the audio analysis loop when listening begins.
   */
  useEffect(() => {
    if (isListening && analyserRef.current) {
      analyzeAudio()
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isListening, analyzeAudio])

  /**
   * Stops voice recording and cleans up audio resources.
   */
  const stopListening = useCallback(() => {
    logger.info('AUDIO', 'Recording stopped')

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
    speechStartedAtRef.current = null
    speechFrameCountRef.current = 0
  }, [])

  /**
   * Starts voice capture by requesting microphone permission and
   * initializing Web Audio API components for analysis and recording.
   */
  const startListening = useCallback(async () => {
    if (isStartingListeningRef.current || isListening) {
      return
    }

    isStartingListeningRef.current = true
    logger.debug('AUDIO', 'Requesting microphone permission')

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

      logger.info('AUDIO', 'Recording started', {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: stream.getAudioTracks()[0]?.getSettings()?.sampleRate || 'unknown',
      })

      // Create audio context for real-time analysis
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = audioContext

      // Create analyser node for frequency data (drives waveform visualization)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = AUDIO_CONFIG.FFT_SIZE
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      // Connect microphone stream to analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

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

      // Reset state for new recording session
      audioChunksRef.current = []
      mediaRecorder.start(100) // Emit data every 100ms
      lastSpeechTimeRef.current = null
      speechStartedAtRef.current = null
      speechFrameCountRef.current = 0
      isProcessingRecordingRef.current = false
      setIsListening(true)
      onTranscriptionUpdateRef.current?.('')
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionState(PERMISSION_STATE.DENIED)
        logger.warn('AUDIO', 'Microphone permission denied by user')
      } else {
        logger.error('AUDIO', 'Failed to access microphone', {
          errorName: error.name,
          errorMessage: error.message,
        })
      }
    } finally {
      isStartingListeningRef.current = false
    }
  }, [isListening])

  /**
   * Gets the current audio recording data for transcription
   * @returns {Object} Recording data including chunks, MIME type, and speech info
   */
  const getRecordingData = useCallback(async () => {
    // Capture MIME type before cleanup
    const recorder = mediaRecorderRef.current
    const mimeType = recorder?.mimeType || 'audio/webm'

    // Stop recording and wait for the final dataavailable before reading chunks
    if (recorder && recorder.state === 'recording') {
      await new Promise((resolve) => {
        const handleStop = () => resolve()
        recorder.addEventListener('stop', handleStop, { once: true })
        recorder.stop()
      })
    }

    // Copy chunks AFTER stop so we get the final chunk from ondataavailable
    const chunks = [...audioChunksRef.current]

    const speechStartedAt = speechStartedAtRef.current
    const speechEndedAt = lastSpeechTimeRef.current
    const speechDurationMs = speechStartedAt && speechEndedAt
      ? Math.max(0, speechEndedAt - speechStartedAt)
      : 0
    const hasSpeech = speechStartedAt
      && speechDurationMs >= AUDIO_CONFIG.MIN_SPEECH_DURATION_MS
      && speechFrameCountRef.current >= AUDIO_CONFIG.MIN_SPEECH_FRAMES

    return {
      chunks,
      mimeType,
      hasSpeech,
      speechDurationMs,
      speechFrameCount: speechFrameCountRef.current,
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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

  return {
    // State
    isListening,
    audioLevel,
    permissionState,

    // Controls
    startListening,
    stopListening,
    getRecordingData,

    // Refs for external access
    isProcessingRecordingRef,
    isStartingListeningRef,
  }
}
