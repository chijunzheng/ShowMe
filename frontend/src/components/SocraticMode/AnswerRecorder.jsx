/**
 * AnswerRecorder Component
 * SOCRATIC-003: Records user's spoken answer
 * T004: Mic button available to record answer
 * T005: Waveform shows during recording
 * T006: Stop button ends recording and submits
 */

import { useState, useRef, useEffect, useCallback } from 'react'

export default function AnswerRecorder({
  onRecordingComplete,
  onSkip,
  isDisabled = false
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const mediaRecorderRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

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
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

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

        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }

        onRecordingComplete?.(blob)
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
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }, [onRecordingComplete])

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

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Waveform visualization (T005) */}
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

      {/* Recording duration */}
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Recording: {formatDuration(recordingDuration)}
        </div>
      )}

      {/* Main action button (T004, T006) */}
      <div className="flex items-center gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isDisabled}
            className={`
              w-20 h-20 rounded-full flex items-center justify-center
              bg-gradient-to-br from-primary to-cyan-500 text-white
              shadow-lg hover:shadow-xl transform hover:scale-105
              transition-all duration-200
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-label="Start recording your answer"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>
        ) : (
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
      </div>

      {/* Instructions */}
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
        {isRecording
          ? 'Tap the button when you\'re done'
          : 'Tap to record your answer'}
      </p>

      {/* Skip button (T008) */}
      {!isRecording && (
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Skip this question
        </button>
      )}
    </div>
  )
}
