/**
 * VoiceStoryRecorder - Real-time voice recording with scene generation
 *
 * Features:
 * - Continuous voice recording with live transcription
 * - Natural pause detection (>2s silence)
 * - Scene extraction every 20s or on pause
 * - Background image generation for scenes
 * - Live concept tracking
 * - Canvas showing generated illustrations
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import LiveCanvas from './LiveCanvas'
import ConceptTracker from './ConceptTracker'
import logger from '../../../utils/logger'
import { toApiUrl } from '../../../utils/api'

// Speech recognition error messages
const SPEECH_ERROR_MESSAGES = {
  'no-speech': 'No speech detected. Please speak louder.',
  'not-allowed': 'Microphone permission denied. Please enable microphone access in your browser settings.',
  'audio-capture': 'No microphone found. Please connect a microphone.',
  'network': 'Network error. Please check your connection.',
  'aborted': 'Recording was interrupted. Please try again.',
}

// Maximum scenes allowed
const MAX_SCENES = 6

// Scene extraction timing
const SCENE_EXTRACT_INTERVAL_MS = 20000 // 20 seconds
const PAUSE_THRESHOLD_MS = 2000 // 2 second silence triggers scene extraction
const MIN_TRANSCRIPT_LENGTH = 20 // Minimum characters before extracting scene

/**
 * @param {Object} props
 * @param {string} props.topicName - Topic for context
 * @param {Array} props.conceptChecklist - Concepts to detect
 * @param {Set} props.checkedConcepts - Currently checked concepts
 * @param {string} props.imageStyle - Style for image generation
 * @param {Array} props.scenes - Current scenes
 * @param {Function} props.onSceneAdded - Callback when scene added
 * @param {Function} props.onComplete - Callback when recording complete
 * @param {Function} props.onBack - Callback to go back
 */
export default function VoiceStoryRecorder({
  topicName,
  conceptChecklist,
  checkedConcepts,
  imageStyle,
  scenes,
  onSceneAdded,
  onComplete,
  onBack
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [fullTranscript, setFullTranscript] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [isProcessingScene, setIsProcessingScene] = useState(false)
  const [pendingSceneImage, setPendingSceneImage] = useState(false)

  // Refs
  const mediaRecorderRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
  const streamRef = useRef(null)
  const lastSpeechTimeRef = useRef(Date.now())
  const lastSceneExtractTimeRef = useRef(Date.now())
  const pauseCheckIntervalRef = useRef(null)
  const transcriptSinceLastSceneRef = useRef('')
  const audioChunksRef = useRef([])

  /**
   * Start voice recording
   */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio analyzer for waveform
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)

      // Start media recorder for transcription
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Start recording with 1s chunks for continuous transcription
      mediaRecorder.start(1000)
      setIsRecording(true)
      lastSpeechTimeRef.current = Date.now()
      lastSceneExtractTimeRef.current = Date.now()

      // Start audio level animation
      const updateLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average / 255)

          // Track speech activity
          if (average > 30) {
            lastSpeechTimeRef.current = Date.now()
          }
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()

      // Start pause detection
      pauseCheckIntervalRef.current = setInterval(() => {
        checkForPauseOrInterval()
      }, 500)

      logger.info('STORY', 'Recording started')
    } catch (error) {
      logger.error('STORY', 'Failed to start recording', { error: error.message })
      alert('Could not access microphone. Please allow microphone access.')
    }
  }, [])

  /**
   * Stop voice recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (pauseCheckIntervalRef.current) {
      clearInterval(pauseCheckIntervalRef.current)
      pauseCheckIntervalRef.current = null
    }

    logger.info('STORY', 'Recording stopped', {
      totalTranscriptLength: fullTranscript.length,
      sceneCount: scenes.length
    })
  }, [isRecording, fullTranscript.length, scenes.length])

  /**
   * Check for natural pause or time interval to extract scene
   */
  const checkForPauseOrInterval = useCallback(() => {
    const now = Date.now()
    const timeSinceLastSpeech = now - lastSpeechTimeRef.current
    const timeSinceLastScene = now - lastSceneExtractTimeRef.current

    // Extract scene on pause (>2s silence) or every 20s
    const shouldExtract =
      (timeSinceLastSpeech > PAUSE_THRESHOLD_MS && transcriptSinceLastSceneRef.current.length >= MIN_TRANSCRIPT_LENGTH) ||
      (timeSinceLastScene > SCENE_EXTRACT_INTERVAL_MS && transcriptSinceLastSceneRef.current.length >= MIN_TRANSCRIPT_LENGTH)

    if (shouldExtract && !isProcessingScene && scenes.length < MAX_SCENES) {
      extractScene()
    }
  }, [isProcessingScene, scenes.length])

  /**
   * Extract scene from current transcript chunk
   */
  const extractScene = useCallback(async () => {
    const transcriptChunk = transcriptSinceLastSceneRef.current.trim()
    if (!transcriptChunk || transcriptChunk.length < MIN_TRANSCRIPT_LENGTH) {
      return
    }

    setIsProcessingScene(true)
    setPendingSceneImage(true)
    lastSceneExtractTimeRef.current = Date.now()

    // Get previous scene descriptions for continuity
    const previousScenes = scenes.map(s => s.sceneDescription)

    logger.info('STORY', 'Extracting scene', {
      transcriptLength: transcriptChunk.length,
      sceneIndex: scenes.length
    })

    try {
      const response = await fetch(toApiUrl('/api/learn/story/scene'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptChunk,
          topicName,
          conceptChecklist,
          previousScenes,
          imageStyle
        })
      })

      if (!response.ok) {
        throw new Error('Scene extraction failed')
      }

      const sceneData = await response.json()

      // Add scene
      onSceneAdded?.(sceneData)

      // Clear transcript chunk
      transcriptSinceLastSceneRef.current = ''

      logger.info('STORY', 'Scene extracted', {
        sceneIndex: scenes.length,
        hasImage: !!sceneData.imageUrl,
        conceptsFound: sceneData.conceptsFound
      })
    } catch (error) {
      logger.error('STORY', 'Scene extraction failed', { error: error.message })
    } finally {
      setIsProcessingScene(false)
      setPendingSceneImage(false)
    }
  }, [topicName, conceptChecklist, imageStyle, scenes, onSceneAdded])

  /**
   * Handle finish button
   */
  const handleFinish = useCallback(() => {
    stopRecording()

    // Extract final scene if there's remaining transcript
    if (transcriptSinceLastSceneRef.current.trim().length >= MIN_TRANSCRIPT_LENGTH && scenes.length < MAX_SCENES) {
      extractScene().then(() => {
        onComplete?.()
      })
    } else {
      onComplete?.()
    }
  }, [stopRecording, extractScene, scenes.length, onComplete])

  /**
   * Simulate transcription updates (in production, integrate with real STT)
   * For now, we'll use the browser's Web Speech API if available
   */
  useEffect(() => {
    if (!isRecording) return

    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      logger.warn('STORY', 'Speech recognition not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US' // TODO: Detect language from topicName

    recognition.onresult = (event) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        setFullTranscript(prev => prev + finalTranscript)
        transcriptSinceLastSceneRef.current += finalTranscript
        setLiveTranscript('')
      } else if (interimTranscript) {
        setLiveTranscript(interimTranscript)
      }
    }

    recognition.onerror = (event) => {
      logger.error('STORY', 'Speech recognition error', { error: event.error })

      // Provide user feedback based on error type
      const errorMessage = SPEECH_ERROR_MESSAGES[event.error] || 'Speech recognition failed. Please try again.'

      // Show non-blocking feedback for recoverable errors
      if (event.error === 'no-speech') {
        // Just log, don't interrupt - user can continue speaking
        logger.warn('STORY', 'No speech detected, waiting for input')
      } else if (event.error === 'not-allowed') {
        // Critical error - stop recording and alert
        stopRecording()
        alert(errorMessage)
      }
      // For other errors, speech recognition will auto-restart if continuous
    }

    try {
      recognition.start()
    } catch (error) {
      logger.error('STORY', 'Failed to start speech recognition', { error: error.message })
    }

    return () => {
      try {
        recognition.stop()
      } catch (error) {
        // Ignore errors on stop
      }
    }
  }, [isRecording])

  /**
   * Start recording on mount
   */
  useEffect(() => {
    startRecording()

    return () => {
      stopRecording()
    }
  }, [])

  // Generate waveform bars
  const waveformBars = Array.from({ length: 20 }, (_, i) => {
    const baseHeight = 8
    const maxHeight = 48
    const variation = Math.sin((i / 20) * Math.PI) * audioLevel
    return baseHeight + variation * (maxHeight - baseHeight)
  })

  const atMaxScenes = scenes.length >= MAX_SCENES

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-950">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            🎙️ Tell Your Story
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {scenes.length} / {MAX_SCENES} scenes
            </span>
            <button
              onClick={handleFinish}
              disabled={scenes.length === 0}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finish Story
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Live Canvas */}
          <div className="lg:col-span-2">
            <LiveCanvas
              scenes={scenes}
              pendingSceneImage={pendingSceneImage}
            />
          </div>

          {/* Right: Concept Tracker */}
          <div>
            <ConceptTracker
              conceptChecklist={conceptChecklist}
              checkedConcepts={checkedConcepts}
            />
          </div>
        </div>

        {/* Transcription Display */}
        <div className="max-w-4xl mx-auto mt-6">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 min-h-[120px]">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Your story:
            </p>
            <p className="text-base text-gray-800 dark:text-gray-100 leading-relaxed">
              {fullTranscript}
              {liveTranscript && (
                <span className="text-gray-400 dark:text-gray-500 italic">
                  {liveTranscript}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="max-w-4xl mx-auto mt-6 flex flex-col items-center gap-4">
            {/* Waveform */}
            <div className="flex items-center justify-center gap-1 h-16">
              {waveformBars.map((height, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-pink-500 to-rose-400 rounded-full transition-all duration-75"
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>Recording... Keep talking!</span>
            </div>

            {atMaxScenes && (
              <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300 text-center">
                  Maximum scenes reached. Click "Finish Story" when ready!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Processing Indicator */}
      {isProcessingScene && (
        <div className="fixed bottom-6 right-6 px-4 py-3 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-gray-200 dark:border-slate-700 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Creating scene...
          </span>
        </div>
      )}
    </div>
  )
}
