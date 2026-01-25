/**
 * SocraticFeedback Component
 * SOCRATIC-003: Displays AI evaluation of user's answer
 * T007: Displays AI response with score and feedback
 */

import { useEffect, useRef } from 'react'

// Score to stars mapping
const getStars = (score) => {
  return '⭐'.repeat(score)
}

// Score to color mapping
const getScoreColor = (score) => {
  if (score >= 4) return 'text-green-500'
  if (score >= 3) return 'text-yellow-500'
  return 'text-orange-500'
}

// Score to label mapping
const getScoreLabel = (score) => {
  if (score >= 5) return 'Excellent!'
  if (score >= 4) return 'Great job!'
  if (score >= 3) return 'Good thinking!'
  if (score >= 2) return 'Nice try!'
  return 'Keep learning!'
}

export default function SocraticFeedback({
  feedback,
  score,
  correctAspects = [],
  suggestions = [],
  followUpQuestion,
  audioUrl,
  suggestedQuestions = [],
  onContinue,
  onFollowUp
}) {
  const audioRef = useRef(null)

  // Auto-play feedback audio
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl
      audioRef.current.play().catch((err) => {
        console.warn('Feedback TTS autoplay blocked:', err)
      })
    }
  }, [audioUrl])

  if (!feedback) return null

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      {/* Score display */}
      <div className="text-center mb-6">
        <div className={`text-4xl ${getScoreColor(score)} mb-2`}>
          {getStars(score)}
        </div>
        <p className={`text-xl font-semibold ${getScoreColor(score)}`}>
          {getScoreLabel(score)}
        </p>
      </div>

      {/* Feedback card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
        {/* Main feedback */}
        <p className="text-lg text-gray-800 dark:text-gray-100 leading-relaxed mb-4">
          {feedback}
        </p>

        {/* What you got right */}
        {correctAspects.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
              <span>✓</span> What you got right:
            </h4>
            <ul className="space-y-1">
              {correctAspects.map((aspect, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 pl-4">
                  • {aspect}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions for improvement */}
        {suggestions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
              <span>💡</span> To explore further:
            </h4>
            <ul className="space-y-1">
              {suggestions.map((suggestion, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 pl-4">
                  • {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Follow-up question prompt */}
        {followUpQuestion && (
          <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
            <p className="text-sm font-medium text-primary mb-2">
              Want to go deeper?
            </p>
            <p className="text-gray-700 dark:text-gray-300 italic">
              "{followUpQuestion}"
            </p>
            <button
              onClick={() => onFollowUp?.(followUpQuestion)}
              className="mt-3 text-sm text-primary hover:text-primary/80 font-medium"
            >
              Explore this →
            </button>
          </div>
        )}
      </div>

      {/* Suggested questions for continued learning */}
      {suggestedQuestions.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 text-center">
            Want to explore more?
          </h4>
          <div className="flex flex-col gap-2">
            {suggestedQuestions.slice(0, 3).map((question, i) => (
              <button
                key={i}
                onClick={() => onFollowUp?.(question)}
                className="
                  w-full px-4 py-3 rounded-xl text-left
                  bg-gray-50 dark:bg-slate-700/50
                  border border-gray-200 dark:border-slate-600
                  text-gray-700 dark:text-gray-200
                  hover:bg-primary/5 hover:border-primary/30
                  dark:hover:bg-primary/10 dark:hover:border-primary/40
                  transition-all duration-200
                "
              >
                <span className="text-primary mr-2">→</span>
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons (T009) */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={onContinue}
          className="
            px-6 py-3 rounded-full
            bg-gradient-to-r from-primary to-cyan-500 text-white
            font-medium shadow-lg hover:shadow-xl
            transform hover:scale-105 transition-all duration-200
          "
        >
          {suggestedQuestions.length > 0 ? 'Back to Home' : 'Continue Learning'}
        </button>
      </div>

      {/* Hidden audio element for TTS */}
      <audio ref={audioRef} className="hidden" />
    </div>
  )
}
