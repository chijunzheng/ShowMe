/**
 * ComebackChallenge - Lightning round challenge UI component
 *
 * Displays the comeback challenge with timer countdown, question display,
 * answer options, and progress indicators. Handles answer selection,
 * auto-advance on timeout, and early termination.
 *
 * @param {Object} props
 * @param {Array} props.questions - Array of question objects
 * @param {'simple'|'standard'|'deep'} props.level - Difficulty level for styling
 * @param {number} props.timePerQuestion - Seconds per question (default: 15)
 * @param {Function} props.onAnswer - Callback when answer selected (questionIndex, selectedIndex, isCorrect)
 * @param {Function} props.onComplete - Callback when challenge completes ({ passed, correctCount })
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import { getStyleForLevel, COMEBACK_CONFIG } from '@/hooks/game/comebackConfig'
import {
  playComebackTimerTickSound,
  playCorrectSound,
  playIncorrectSound,
  playSelectSound,
} from '@/utils/soundEffects'

/**
 * Level-specific class mappings for styling.
 */
const LEVEL_CLASSES = {
  simple: 'simple emerald green',
  standard: 'standard cyan blue',
  deep: 'deep violet purple',
}

/**
 * Timer threshold below which urgency styling is applied.
 */
const URGENCY_THRESHOLD = 5

export default function ComebackChallenge({
  questions = [],
  level,
  timePerQuestion = 15,
  onAnswer,
  onComplete,
}) {
  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion || COMEBACK_CONFIG.challenge.timePerQuestion)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [answerResults, setAnswerResults] = useState([]) // Track each answer
  const [isAnswered, setIsAnswered] = useState(false)

  // Refs
  const timerRef = useRef(null)
  const transitionTimerRef = useRef(null)
  const isMountedRef = useRef(true)

  // Derived values
  const levelStyle = useMemo(() => getStyleForLevel(level), [level])
  const levelClass = LEVEL_CLASSES[level] || LEVEL_CLASSES.simple
  const effectiveTimePerQuestion = timePerQuestion > 0 ? timePerQuestion : COMEBACK_CONFIG.challenge.timePerQuestion
  const currentQuestion = questions[currentQuestionIndex] || null
  const totalQuestions = Math.min(questions.length, COMEBACK_CONFIG.challenge.questionCount)
  const isUrgent = timeRemaining <= URGENCY_THRESHOLD
  const requiredCorrect = COMEBACK_CONFIG.challenge.requiredCorrect
  const maxWrong = totalQuestions - requiredCorrect

  /**
   * Clear all timers.
   */
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = null
    }
  }, [])

  /**
   * Complete the challenge with result.
   */
  const finishChallenge = useCallback((passed, finalCorrectCount) => {
    clearTimers()
    if (onComplete) {
      onComplete({
        passed,
        correctCount: finalCorrectCount,
      })
    }
  }, [clearTimers, onComplete])

  /**
   * Advance to the next question or finish.
   */
  const advanceQuestion = useCallback((newCorrect, newWrong) => {
    const nextIndex = currentQuestionIndex + 1

    // Check for early success (2+ correct = immediate win)
    if (newCorrect >= requiredCorrect) {
      transitionTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          finishChallenge(true, newCorrect)
        }
      }, COMEBACK_CONFIG.timing.questionTransition)
      return
    }

    // Check for early failure (too many wrong answers)
    if (newWrong > maxWrong) {
      transitionTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          finishChallenge(false, newCorrect)
        }
      }, COMEBACK_CONFIG.timing.questionTransition)
      return
    }

    // Check if all questions done
    if (nextIndex >= totalQuestions) {
      const passed = newCorrect >= requiredCorrect
      transitionTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          finishChallenge(passed, newCorrect)
        }
      }, COMEBACK_CONFIG.timing.questionTransition)
      return
    }

    // Move to next question
    transitionTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setCurrentQuestionIndex(nextIndex)
        setSelectedIndex(null)
        setIsAnswered(false)
        setTimeRemaining(effectiveTimePerQuestion)
      }
    }, COMEBACK_CONFIG.timing.questionTransition)
  }, [currentQuestionIndex, requiredCorrect, maxWrong, totalQuestions, effectiveTimePerQuestion, finishChallenge])

  /**
   * Handle answer selection.
   */
  const handleAnswer = useCallback((answerIndex) => {
    if (isAnswered || !currentQuestion) return

    // Play select sound
    try {
      playSelectSound()
    } catch {
      // Silently ignore audio errors
    }

    setSelectedIndex(answerIndex)
    setIsAnswered(true)

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Check if correct
    const isCorrect = answerIndex === currentQuestion.correctIndex

    // Update counts
    let newCorrect = correctCount
    let newWrong = wrongCount

    if (isCorrect) {
      newCorrect = correctCount + 1
      setCorrectCount(newCorrect)
      try {
        playCorrectSound()
      } catch {
        // Silently ignore audio errors
      }
    } else {
      newWrong = wrongCount + 1
      setWrongCount(newWrong)
      try {
        playIncorrectSound()
      } catch {
        // Silently ignore audio errors
      }
    }

    // Track result
    setAnswerResults((prev) => [...prev, isCorrect ? 'correct' : 'incorrect'])

    // Call onAnswer callback
    if (onAnswer) {
      onAnswer(currentQuestionIndex, answerIndex, isCorrect)
    }

    // Advance to next question
    advanceQuestion(newCorrect, newWrong)
  }, [isAnswered, currentQuestion, correctCount, wrongCount, currentQuestionIndex, onAnswer, advanceQuestion])

  /**
   * Handle timeout (counts as wrong answer).
   */
  const handleTimeout = useCallback(() => {
    if (isAnswered) return

    setIsAnswered(true)

    // Track as wrong
    const newWrong = wrongCount + 1
    setWrongCount(newWrong)
    setAnswerResults((prev) => [...prev, 'timeout'])

    // Call onAnswer if provided (with null for timeout)
    if (onAnswer) {
      onAnswer(currentQuestionIndex, null, false)
    }

    // Advance
    advanceQuestion(correctCount, newWrong)
  }, [isAnswered, wrongCount, currentQuestionIndex, onAnswer, correctCount, advanceQuestion])

  // Handle empty questions array
  useEffect(() => {
    if (questions.length === 0) {
      if (onComplete) {
        onComplete({ passed: false, correctCount: 0 })
      }
    }
  }, [questions.length, onComplete])

  // Timer effect
  useEffect(() => {
    if (questions.length === 0) return

    // Start countdown
    timerRef.current = setInterval(() => {
      if (!isMountedRef.current) return

      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          timerRef.current = null
          // Handle timeout
          handleTimeout()
          return 0
        }

        // Play tick sound when urgent
        if (prev <= URGENCY_THRESHOLD + 1) {
          try {
            playComebackTimerTickSound()
          } catch {
            // Silently ignore audio errors
          }
        }

        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [currentQuestionIndex, questions.length, handleTimeout])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      clearTimers()
    }
  }, [clearTimers])

  // Don't render if no questions
  if (questions.length === 0) {
    return null
  }

  return (
    <div
      data-testid="comeback-challenge"
      role="region"
      aria-label="Comeback Challenge"
      className={`
        w-full max-w-lg mx-auto p-6
        ${levelClass}
        animate transition-all
      `}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          <span aria-hidden="true">{levelStyle.icon}</span> Lightning Comeback
        </h2>
      </div>

      {/* Timer */}
      <div
        data-testid="comeback-timer"
        role="timer"
        aria-live="polite"
        aria-label={`${timeRemaining} seconds remaining`}
        className={`
          text-center mb-4 p-3 rounded-xl font-bold text-2xl
          transition-all duration-300
          ${isUrgent
            ? 'bg-red-500/20 text-red-600 dark:text-red-400 animate-pulse urgent red warning'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }
        `}
      >
        <span aria-hidden="true">&#x23F1;</span> {timeRemaining}s
      </div>

      {/* Progress indicators */}
      <div data-testid="comeback-progress" className="flex justify-center gap-2 mb-6">
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          let dotClass = 'bg-gray-300 dark:bg-gray-600'
          if (idx < answerResults.length) {
            dotClass = answerResults[idx] === 'correct'
              ? 'bg-green-500'
              : 'bg-red-400'
          } else if (idx === currentQuestionIndex) {
            dotClass = 'bg-blue-500 animate-pulse'
          }
          return (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full ${dotClass} transition-all`}
              aria-label={`Question ${idx + 1} ${
                idx < answerResults.length
                  ? (answerResults[idx] === 'correct' ? 'correct' : 'incorrect')
                  : (idx === currentQuestionIndex ? 'current' : 'pending')
              }`}
            />
          )
        })}
      </div>

      {/* Question counter */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        Question {currentQuestionIndex + 1} of {totalQuestions}
      </div>

      {/* Question text */}
      {currentQuestion && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white text-center">
            {currentQuestion.question}
          </h3>
        </div>
      )}

      {/* Answer options */}
      <div className="space-y-3">
        {currentQuestion?.options?.map((option, idx) => {
          const isSelected = selectedIndex === idx
          const isCorrectAnswer = idx === currentQuestion.correctIndex
          const showFeedback = isAnswered

          let optionClass = `
            w-full p-4 rounded-xl text-left font-medium
            border-2 transition-all duration-200
          `

          if (showFeedback && isCorrectAnswer) {
            optionClass += ' bg-green-100 border-green-500 text-green-800 correct green selected active animate-scale'
          } else if (showFeedback && isSelected && !isCorrectAnswer) {
            optionClass += ' bg-red-100 border-red-400 text-red-800 incorrect selected active animate-scale'
          } else if (isSelected) {
            optionClass += ' bg-blue-100 border-blue-500 text-blue-800 selected active animate-scale'
          } else {
            optionClass += ' bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700'
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleAnswer(idx)}
              disabled={isAnswered}
              className={optionClass}
              aria-label={isAnswered && isCorrectAnswer ? `${option} - correct` : undefined}
            >
              {option}
            </button>
          )
        })}
      </div>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

ComebackChallenge.propTypes = {
  questions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      question: PropTypes.string.isRequired,
      options: PropTypes.arrayOf(PropTypes.string).isRequired,
      correctIndex: PropTypes.number.isRequired,
    })
  ),
  level: PropTypes.oneOf(['simple', 'standard', 'deep']),
  timePerQuestion: PropTypes.number,
  onAnswer: PropTypes.func,
  onComplete: PropTypes.func,
}
