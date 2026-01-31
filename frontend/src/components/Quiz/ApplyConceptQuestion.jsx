/**
 * ApplyConceptQuestion Component
 * Analytical question for high school students applying concepts to new scenarios
 *
 * Features:
 * - Scenario displayed in highlighted box with professional styling
 * - Textarea for multi-line answer input (3-4 rows)
 * - Show expected topics covered in feedback
 * - Professional UI targeting older students
 * - Dark mode support with Tailwind styling
 */

import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * @param {Object} props
 * @param {string} props.question - The question prompt
 * @param {string} props.scenario - Novel situation to analyze
 * @param {Function} props.onAnswer - Callback with answer text
 * @param {boolean} props.showFeedback - Whether to show feedback state
 * @param {string} props.correctAnswer - The model answer
 * @param {string[]} props.expectedTopics - Key concepts the answer should cover (alias for expectedKeyPoints)
 * @param {string[]} props.expectedKeyPoints - Key concepts the answer should cover (used by Quiz orchestrator)
 * @param {string} props.sampleAnswer - Example of a complete answer
 * @param {string} props.userAnswer - User's submitted answer (for feedback)
 * @param {boolean} props.isCorrect - Whether the user's answer was correct
 * @param {boolean} props.isPartial - Whether partial credit was given
 */
export default function ApplyConceptQuestion({
  question,
  scenario,
  onAnswer,
  showFeedback = false,
  correctAnswer,
  expectedTopics: expectedTopicsProp = [],
  expectedKeyPoints = [],
  sampleAnswer,
  userAnswer = '',
  isCorrect = false,
  isPartial = false,
}) {
  // Support both prop names for compatibility - expectedKeyPoints takes precedence if both provided
  const expectedTopics = expectedKeyPoints.length > 0 ? expectedKeyPoints : expectedTopicsProp
  const [answer, setAnswer] = useState('')
  const textareaRef = useRef(null)

  // Focus textarea on mount when not showing feedback
  useEffect(() => {
    if (!showFeedback && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [showFeedback])

  // Handle text input change
  const handleInputChange = useCallback((event) => {
    if (showFeedback) return
    setAnswer(event.target.value)
  }, [showFeedback])

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (!answer.trim() || showFeedback) return
    onAnswer?.(answer.trim())
  }, [answer, showFeedback, onAnswer])

  // Handle keyboard shortcuts (Ctrl/Cmd+Enter to submit)
  const handleKeyDown = useCallback((event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  // Get word count for the answer
  const getWordCount = (text) => {
    if (!text.trim()) return 0
    return text.trim().split(/\s+/).length
  }

  // Get textarea styling based on feedback state
  const getTextareaClasses = () => {
    const baseClasses = `
      w-full px-4 py-3 rounded-xl border-2
      text-base leading-relaxed
      transition-all duration-200
      resize-none
      focus:outline-none focus:ring-2 focus:ring-offset-2
    `

    if (showFeedback) {
      if (isCorrect) {
        return `${baseClasses}
          border-success bg-success/5 text-gray-800 dark:text-gray-100
          ring-2 ring-success/30
        `
      }
      if (isPartial) {
        return `${baseClasses}
          border-yellow-500 bg-yellow-50/50 text-gray-800
          dark:bg-yellow-900/10 dark:text-gray-100
          ring-2 ring-yellow-500/30
        `
      }
      return `${baseClasses}
        border-red-400 bg-red-50/50 text-gray-800
        dark:bg-red-900/10 dark:text-gray-100
        ring-2 ring-red-400/30
      `
    }

    return `${baseClasses}
      border-gray-200 dark:border-slate-600
      bg-white dark:bg-slate-800
      text-gray-800 dark:text-gray-100
      placeholder:text-gray-400 dark:placeholder:text-gray-500
      focus:border-primary-500 focus:ring-primary-500/20
    `
  }

  // Get feedback status badge info
  const getFeedbackStatus = () => {
    if (isCorrect) {
      return {
        label: 'Excellent analysis',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        ),
        bgColor: 'bg-success/10',
        borderColor: 'border-success/30',
        textColor: 'text-success dark:text-success-400',
      }
    }
    if (isPartial) {
      return {
        label: 'Good start - missing some concepts',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-300 dark:border-yellow-700',
        textColor: 'text-yellow-700 dark:text-yellow-400',
      }
    }
    return {
      label: 'Review the key concepts',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
        </svg>
      ),
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-300 dark:border-red-700',
      textColor: 'text-red-600 dark:text-red-400',
    }
  }

  // Check which topics were mentioned in the user's answer
  const getTopicsCoverage = () => {
    if (!userAnswer || !expectedTopics.length) return []

    const normalizedAnswer = userAnswer.toLowerCase()
    return expectedTopics.map((topic) => ({
      topic,
      covered: normalizedAnswer.includes(topic.toLowerCase()),
    }))
  }

  if (!question) return null

  const wordCount = showFeedback ? getWordCount(userAnswer) : getWordCount(answer)
  const feedbackStatus = getFeedbackStatus()
  const topicsCoverage = getTopicsCoverage()

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      {/* Question prompt */}
      <div className="mb-6">
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 leading-relaxed">
          {question}
        </h3>
      </div>

      {/* Scenario box - highlighted with professional styling */}
      <div className="relative mb-6">
        <div className="
          px-5 py-4 rounded-xl
          bg-primary-50 dark:bg-primary-900/20
          border border-primary-200 dark:border-primary-700
        ">
          {/* Scenario label */}
          <div className="absolute -top-3 left-4 px-2 bg-primary-50 dark:bg-gray-900 rounded">
            <span className="text-primary-600 dark:text-primary-400 text-sm font-medium flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Scenario
            </span>
          </div>

          <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed mt-1">
            {scenario}
          </p>
        </div>
      </div>

      {/* Answer input section */}
      {!showFeedback ? (
        <div className="space-y-4">
          {/* Label and textarea */}
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Apply the concepts you've learned to analyze this scenario:
            </span>
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Explain your analysis using the key concepts..."
              rows={4}
              className={getTextareaClasses()}
              aria-label="Your analysis"
            />
          </label>

          {/* Helper text and word count */}
          <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <span>
              {wordCount > 0 ? `${wordCount} words` : 'Think about the key concepts that apply here'}
            </span>
            <span className="text-xs">
              Ctrl+Enter to submit
            </span>
          </div>

          {/* Expected topics hint (before answering) */}
          {expectedTopics.length > 0 && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Concepts to consider:
              </p>
              <div className="flex flex-wrap gap-2">
                {expectedTopics.map((topic, index) => (
                  <span
                    key={index}
                    className="
                      inline-flex items-center px-2.5 py-1 rounded-full
                      text-xs font-medium
                      bg-gray-100 dark:bg-slate-700
                      text-gray-600 dark:text-gray-300
                    "
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Submit button */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!answer.trim()}
              className={`
                px-8 py-3 rounded-xl font-semibold text-base
                transition-all duration-200 transform
                ${answer.trim()
                  ? 'bg-gradient-to-r from-primary to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}
              `}
            >
              Submit Analysis
            </button>
          </div>
        </div>
      ) : (
        /* Feedback display */
        <div className="space-y-5">
          {/* Status badge */}
          <div className={`
            flex items-center gap-3 p-3 rounded-xl
            ${feedbackStatus.bgColor} ${feedbackStatus.borderColor} border
          `}>
            <span className={feedbackStatus.textColor}>
              {feedbackStatus.icon}
            </span>
            <span className={`font-medium ${feedbackStatus.textColor}`}>
              {feedbackStatus.label}
            </span>
          </div>

          {/* User's answer with feedback styling */}
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Your analysis:
            </p>
            <div className={`p-4 rounded-xl border-2 ${
              isCorrect
                ? 'border-success/30 bg-success/5'
                : isPartial
                  ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10'
                  : 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
            }`}>
              <p className="text-gray-800 dark:text-gray-100 leading-relaxed">
                {userAnswer}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {getWordCount(userAnswer)} words
              </p>
            </div>
          </div>

          {/* Topics coverage feedback */}
          {expectedTopics.length > 0 && (
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Key concepts coverage:
              </p>
              <div className="flex flex-wrap gap-2">
                {topicsCoverage.map(({ topic, covered }, index) => (
                  <span
                    key={index}
                    className={`
                      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                      text-sm font-medium transition-colors
                      ${covered
                        ? 'bg-success/10 text-success dark:text-success-400 border border-success/30'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-600'}
                    `}
                  >
                    {covered ? (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                      </svg>
                    )}
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sample answer (shown if not fully correct) */}
          {!isCorrect && (sampleAnswer || correctAnswer) && (
            <div className="p-4 bg-success/5 dark:bg-success/10 rounded-xl border border-success/20">
              <p className="text-sm font-medium text-success dark:text-success-400 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Sample analysis:
              </p>
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                {sampleAnswer || correctAnswer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
