/**
 * SocraticQuestion Component
 * SOCRATIC-003: Displays the Socratic question with animation
 * T002: Displays question text
 * T003: Question is spoken via TTS automatically
 */

import { useEffect, useRef } from 'react'

const QUESTION_TYPE_ICONS = {
  comprehension: '💡',
  application: '🔧',
  analysis: '🔍',
  prediction: '🔮'
}

const QUESTION_TYPE_LABELS = {
  comprehension: 'Understanding Check',
  application: 'Apply It',
  analysis: 'Think Deeper',
  prediction: 'What If?'
}

export default function SocraticQuestion({
  question,
  questionType = 'comprehension',
  onQuestionSpoken,
  audioUrl,
  isPlaying = false
}) {
  const audioRef = useRef(null)

  // Auto-play audio when component mounts (T003)
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl
      audioRef.current.play().catch((err) => {
        console.warn('TTS autoplay blocked:', err)
        // Still mark as spoken even if blocked
        onQuestionSpoken?.()
      })
    }
  }, [audioUrl, onQuestionSpoken])

  const handleAudioEnded = () => {
    onQuestionSpoken?.()
  }

  if (!question) return null

  const icon = QUESTION_TYPE_ICONS[questionType] || '💭'
  const label = QUESTION_TYPE_LABELS[questionType] || 'Think About It'

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      {/* Question type badge */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm font-medium text-primary uppercase tracking-wide">
          {label}
        </span>
      </div>

      {/* Question card */}
      <div className="relative bg-gradient-to-br from-primary/10 to-cyan-500/10 rounded-2xl p-6 md:p-8 border border-primary/20">
        {/* Decorative owl icon */}
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg">
          <span className="text-2xl">🦉</span>
        </div>

        {/* Question text */}
        <p className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-100 leading-relaxed">
          {question}
        </p>

        {/* Speaking indicator */}
        {isPlaying && (
          <div className="mt-4 flex items-center gap-2 text-sm text-primary">
            <div className="flex gap-1">
              <span className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Speaking...</span>
          </div>
        )}
      </div>

      {/* Hidden audio element for TTS */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        className="hidden"
      />
    </div>
  )
}
