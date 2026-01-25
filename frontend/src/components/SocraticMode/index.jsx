/**
 * SocraticMode Component
 * SOCRATIC-003: Main orchestrator for Socratic interaction flow
 * T001: After slideshow ends, SOCRATIC state activates
 * T010: Smooth transitions between Socratic states
 */

import { useState, useCallback, useEffect } from 'react'
import SocraticQuestion from './SocraticQuestion'
import AnswerRecorder from './AnswerRecorder'
import SocraticFeedback from './SocraticFeedback'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

// Internal states for Socratic flow
const SOCRATIC_STATE = {
  LOADING_QUESTION: 'loading_question',
  SHOWING_QUESTION: 'showing_question',
  RECORDING: 'recording',
  EVALUATING: 'evaluating',
  SHOWING_FEEDBACK: 'showing_feedback'
}

export default function SocraticMode({
  slides,
  topicName,
  language = 'en',
  suggestedQuestions = [],
  onComplete,
  onFollowUp,
  onSkip
}) {
  const [state, setState] = useState(SOCRATIC_STATE.LOADING_QUESTION)
  const [question, setQuestion] = useState(null)
  const [questionType, setQuestionType] = useState(null)
  const [expectedTopics, setExpectedTopics] = useState([])
  const [questionAudioUrl, setQuestionAudioUrl] = useState(null)
  const [isQuestionPlaying, setIsQuestionPlaying] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)

  // Fetch Socratic question on mount
  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        setState(SOCRATIC_STATE.LOADING_QUESTION)

        const response = await fetch(`${API_BASE}/api/socratic/question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slides, topicName, language })
        })

        if (!response.ok) {
          throw new Error('Failed to generate question')
        }

        const data = await response.json()
        setQuestion(data.question)
        setQuestionType(data.questionType)
        setExpectedTopics(data.expectedTopics || [])

        // Generate TTS for the question
        const ttsResponse = await fetch(`${API_BASE}/api/voice/speak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: data.question, language })
        })

        if (ttsResponse.ok) {
          const ttsData = await ttsResponse.json()
          setQuestionAudioUrl(ttsData.audioUrl)
        }

        setState(SOCRATIC_STATE.SHOWING_QUESTION)
        setIsQuestionPlaying(true)
      } catch (err) {
        console.error('Failed to fetch Socratic question:', err)
        setError(err.message)
        // Skip Socratic mode on error
        onSkip?.()
      }
    }

    fetchQuestion()
  }, [slides, topicName, language, onSkip])

  // Handle question TTS completion
  const handleQuestionSpoken = useCallback(() => {
    setIsQuestionPlaying(false)
    setState(SOCRATIC_STATE.RECORDING)
  }, [])

  // Handle recording completion - send to evaluation endpoint
  const handleRecordingComplete = useCallback(async (audioBlob) => {
    setState(SOCRATIC_STATE.EVALUATING)

    try {
      // First transcribe the audio
      const formData = new FormData()
      formData.append('audio', audioBlob, 'answer.webm')

      const transcribeResponse = await fetch(`${API_BASE}/api/transcribe`, {
        method: 'POST',
        body: formData
      })

      let answerText = ''
      if (transcribeResponse.ok) {
        const transcribeData = await transcribeResponse.json()
        answerText = transcribeData.transcription || ''
      }

      // Then evaluate the answer
      const evalResponse = await fetch(`${API_BASE}/api/socratic/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: answerText,
          question,
          expectedTopics,
          slideContext: slides[0] || {},
          language,
          generateAudio: true
        })
      })

      if (!evalResponse.ok) {
        throw new Error('Failed to evaluate answer')
      }

      const evalData = await evalResponse.json()
      setFeedback(evalData)
      setState(SOCRATIC_STATE.SHOWING_FEEDBACK)
    } catch (err) {
      console.error('Failed to evaluate answer:', err)
      setError(err.message)
      // Show a generic encouraging feedback on error
      setFeedback({
        feedback: "Great effort! Keep exploring and learning.",
        score: 3,
        correctAspects: [],
        suggestions: [],
        followUpQuestion: null
      })
      setState(SOCRATIC_STATE.SHOWING_FEEDBACK)
    }
  }, [question, expectedTopics, slides, language])

  // Handle skip
  const handleSkip = useCallback(() => {
    onSkip?.()
  }, [onSkip])

  // Handle continue (return to home)
  const handleContinue = useCallback(() => {
    onComplete?.()
  }, [onComplete])

  // Handle follow-up question
  const handleFollowUp = useCallback((followUpQuestion) => {
    onFollowUp?.(followUpQuestion)
  }, [onFollowUp])

  // Error state
  if (error && state === SOCRATIC_STATE.LOADING_QUESTION) {
    return null // Will trigger onSkip
  }

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center py-8 px-4">
      {/* Loading question */}
      {state === SOCRATIC_STATE.LOADING_QUESTION && (
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">
            Thinking of a question for you...
          </p>
        </div>
      )}

      {/* Question display */}
      {(state === SOCRATIC_STATE.SHOWING_QUESTION || state === SOCRATIC_STATE.RECORDING) && question && (
        <div className="w-full space-y-8 animate-fade-in">
          <SocraticQuestion
            question={question}
            questionType={questionType}
            audioUrl={questionAudioUrl}
            isPlaying={isQuestionPlaying}
            onQuestionSpoken={handleQuestionSpoken}
          />

          {state === SOCRATIC_STATE.RECORDING && (
            <AnswerRecorder
              onRecordingComplete={handleRecordingComplete}
              onSkip={handleSkip}
            />
          )}
        </div>
      )}

      {/* Evaluating state */}
      {state === SOCRATIC_STATE.EVALUATING && (
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">
            Thinking about your answer...
          </p>
        </div>
      )}

      {/* Feedback display */}
      {state === SOCRATIC_STATE.SHOWING_FEEDBACK && feedback && (
        <SocraticFeedback
          feedback={feedback.feedback}
          score={feedback.score}
          correctAspects={feedback.correctAspects}
          suggestions={feedback.suggestions}
          followUpQuestion={feedback.followUpQuestion}
          audioUrl={feedback.audioUrl}
          suggestedQuestions={suggestedQuestions}
          onContinue={handleContinue}
          onFollowUp={handleFollowUp}
        />
      )}
    </div>
  )
}
