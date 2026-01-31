/**
 * ReviewQuiz Component
 * Simplified quiz for spaced repetition reviews
 *
 * Features:
 * - Only 3 questions for quick review
 * - MCQ and fill_blank types only (no voice for speed)
 * - Simplified scoring: pass = 2/3+, perfect = 3/3
 * - Shows XP earned based on performance
 * - No streak tracking (keep it simple)
 *
 * T001: Generate 3 questions via API
 * T002: Handle MCQ and fill_blank question types
 * T003: Track score and determine pass/perfect
 * T004: Show result screen with XP earned
 * T005: Call onComplete with result data
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import QuizProgress from './QuizProgress'
import MCQQuestion from './MCQQuestion'
import FillBlankQuestion from './FillBlankQuestion'
import QuizFeedback from './QuizFeedback'
import Confetti from '../Confetti'
import { AnimatedXP } from './QuizResults'
import { fuzzyMatch } from '../../utils/fuzzyMatch'

/**
 * API base URL from environment
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

/**
 * Review quiz constants
 */
const REVIEW_QUESTION_COUNT = 3
const PASS_THRESHOLD = 2  // 2 out of 3 to pass
const XP_REWARDS = {
  REFRESHED: 10,  // Passed (2/3+)
  PERFECT: 15,    // All correct (3/3)
  ATTEMPTED: 3,   // Failed but tried
}

// Quiz internal states
const QUIZ_STATE = {
  LOADING: 'loading',
  ANSWERING: 'answering',
  SHOWING_FEEDBACK: 'showing_feedback',
  COMPLETED: 'completed',
  ERROR: 'error',
}

/**
 * ReviewQuiz - Simplified quiz component for review sessions
 *
 * @param {Object} props
 * @param {Object} props.piece - The world piece being reviewed
 * @param {string} props.slideContent - Topic content for question generation
 * @param {Function} props.onComplete - Called with { score, passed, correctCount, xpEarned }
 * @param {Function} props.onCancel - Called when user cancels the review
 */
export default function ReviewQuiz({
  piece,
  slideContent,
  onComplete,
  onCancel,
}) {
  // Quiz state
  const [state, setState] = useState(QUIZ_STATE.LOADING)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [currentFeedback, setCurrentFeedback] = useState(null)
  const [error, setError] = useState(null)

  // Result state
  const [showConfetti, setShowConfetti] = useState(false)

  // Current question
  const currentQuestion = useMemo(() => {
    return questions[currentIndex] || null
  }, [questions, currentIndex])

  // Fetch questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      setState(QUIZ_STATE.LOADING)
      setError(null)

      try {
        // Build content from piece info and optional slide content
        const topicName = piece?.name || piece?.topicName || 'this topic'
        const content = slideContent || piece?.description || topicName

        // Prepare slides payload (API expects this format)
        const slidesPayload = [
          { subtitle: content, script: content },
        ]

        const response = await fetch(`${API_BASE}/api/quiz/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slides: slidesPayload,
            topicName,
            language: 'en',
            explanationLevel: 'standard',
            questionCount: REVIEW_QUESTION_COUNT,
            // Limit to MCQ and fill_blank for review quizzes
            allowedTypes: ['mcq', 'fill_blank'],
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to generate review questions')
        }

        const data = await response.json()
        const generatedQuestions = data.questions || []

        if (generatedQuestions.length === 0) {
          throw new Error('No questions generated')
        }

        // Limit to REVIEW_QUESTION_COUNT and filter to MCQ/fill_blank
        const filteredQuestions = generatedQuestions
          .filter(q => q.type === 'mcq' || q.type === 'fill_blank')
          .slice(0, REVIEW_QUESTION_COUNT)

        if (filteredQuestions.length === 0) {
          throw new Error('No suitable questions for review')
        }

        setQuestions(filteredQuestions)
        setState(QUIZ_STATE.ANSWERING)
      } catch (err) {
        console.error('Failed to generate review questions:', err)
        setError(err.message)
        setState(QUIZ_STATE.ERROR)
      }
    }

    if (piece) {
      fetchQuestions()
    }
  }, [piece, slideContent])

  // Handle MCQ answer
  const handleMCQAnswer = useCallback((selectedIndex) => {
    if (!currentQuestion || currentQuestion.type !== 'mcq') return

    const isCorrect = selectedIndex === currentQuestion.correctIndex

    const feedback = {
      isCorrect,
      isPartial: false,
      questionId: currentQuestion.id,
      userAnswer: selectedIndex,
      correctAnswer: currentQuestion.correctIndex,
      explanation: currentQuestion.explanation,
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion])

  // Handle fill_blank answer
  const handleFillBlankAnswer = useCallback((userAnswer) => {
    if (!currentQuestion || currentQuestion.type !== 'fill_blank') return

    // Use fuzzy matching to evaluate
    const matchResult = fuzzyMatch(userAnswer, currentQuestion.correctAnswer, {
      exactThreshold: 0.95,
      partialThreshold: 0.75,
      minSimilarity: 0.5,
    })

    const feedback = {
      isCorrect: matchResult.isCorrect,
      isPartial: matchResult.isPartial,
      similarity: matchResult.similarity,
      questionId: currentQuestion.id,
      userAnswer,
      correctAnswer: Array.isArray(currentQuestion.correctAnswer)
        ? currentQuestion.correctAnswer[0]
        : currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation,
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion])

  // Handle continue after feedback
  const handleContinue = useCallback(() => {
    // Save the answer
    const newAnswers = [...answers, currentFeedback]
    setAnswers(newAnswers)

    // Check if we have more questions
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setCurrentFeedback(null)
      setState(QUIZ_STATE.ANSWERING)
    } else {
      // Quiz complete - calculate results
      const correctCount = newAnswers.filter(a => a.isCorrect).length
      const totalQuestions = questions.length
      const passed = correctCount >= PASS_THRESHOLD
      const isPerfect = correctCount === totalQuestions

      // Show confetti for pass
      if (passed) {
        setShowConfetti(true)
      }

      setState(QUIZ_STATE.COMPLETED)
    }
  }, [currentFeedback, currentIndex, questions.length, answers])

  // Calculate final results
  const results = useMemo(() => {
    if (state !== QUIZ_STATE.COMPLETED) return null

    const correctCount = answers.filter(a => a.isCorrect).length
    const totalQuestions = questions.length
    const passed = correctCount >= PASS_THRESHOLD
    const isPerfect = correctCount === totalQuestions

    // Calculate XP
    let xpEarned = XP_REWARDS.ATTEMPTED
    if (isPerfect) {
      xpEarned = XP_REWARDS.PERFECT
    } else if (passed) {
      xpEarned = XP_REWARDS.REFRESHED
    }

    return {
      correctCount,
      totalQuestions,
      score: (correctCount / totalQuestions) * 100,
      passed,
      isPerfect,
      xpEarned,
    }
  }, [state, answers, questions.length])

  // Handle final continue (after results)
  const handleFinalContinue = useCallback(() => {
    if (!results) return

    onComplete?.({
      score: results.score,
      passed: results.passed,
      correctCount: results.correctCount,
      xpEarned: results.xpEarned,
    })
  }, [results, onComplete])

  // Handle cancel
  const handleCancel = useCallback(() => {
    onCancel?.()
  }, [onCancel])

  // Loading state
  if (state === QUIZ_STATE.LOADING) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-3xl">📝</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Preparing your review quiz...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (state === QUIZ_STATE.ERROR) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <span className="text-3xl">😕</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Couldn't load quiz
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {error || 'Something went wrong'}
        </p>
        <button
          onClick={handleCancel}
          className="px-6 py-2 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  // Completed state - show results
  if (state === QUIZ_STATE.COMPLETED && results) {
    return (
      <div className="w-full max-w-md mx-auto py-8 px-4">
        {/* Confetti for pass */}
        <Confetti
          isActive={showConfetti}
          duration={3000}
          onComplete={() => setShowConfetti(false)}
        />

        {/* Result card */}
        <div
          className={`
            bg-white dark:bg-slate-800 rounded-2xl shadow-xl
            border border-gray-100 dark:border-slate-700
            p-6 text-center
            animate-fade-in
          `}
        >
          {/* Result icon */}
          <div className="mb-4">
            <div
              className={`
                w-20 h-20 mx-auto rounded-full
                flex items-center justify-center
                ${results.isPerfect
                  ? 'bg-gradient-to-br from-yellow-200 to-amber-200 dark:from-yellow-500/30 dark:to-amber-500/30'
                  : results.passed
                    ? 'bg-gradient-to-br from-green-200 to-emerald-200 dark:from-green-500/30 dark:to-emerald-500/30'
                    : 'bg-gradient-to-br from-amber-200 to-orange-200 dark:from-amber-500/30 dark:to-orange-500/30'
                }
                animate-bounce-in
              `}
            >
              <span className="text-4xl">
                {results.isPerfect ? '⭐' : results.passed ? '💪' : '📚'}
              </span>
            </div>
          </div>

          {/* Result message */}
          <h2
            className={`
              text-2xl font-bold mb-2
              ${results.isPerfect
                ? 'text-amber-600 dark:text-amber-400'
                : results.passed
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-amber-600 dark:text-amber-400'
              }
            `}
          >
            {results.isPerfect ? 'Perfect!' : results.passed ? 'Refreshed!' : 'Keep trying!'}
          </h2>

          {/* Encouraging subtext */}
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {results.isPerfect
              ? 'You nailed it! This topic is fresh in your mind.'
              : results.passed
                ? 'Nice work! Your memory is getting stronger.'
                : "No worries! You'll get it next time."
            }
          </p>

          {/* Score display */}
          <div className="flex items-baseline justify-center gap-1 mb-4">
            <span className="text-4xl font-bold text-gray-800 dark:text-gray-100">
              {results.correctCount}
            </span>
            <span className="text-xl text-gray-400 dark:text-gray-500">/</span>
            <span className="text-xl text-gray-500 dark:text-gray-400">
              {results.totalQuestions}
            </span>
          </div>

          {/* XP earned */}
          <div
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full
              ${results.passed
                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
              }
              font-bold text-lg mb-6
            `}
          >
            <span className="text-xl">{results.isPerfect ? '🌟' : '⭐'}</span>
            <AnimatedXP amount={results.xpEarned} duration={800} />
          </div>

          {/* Topic reminder */}
          {piece && (
            <div className="mb-6 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Reviewed:
              </p>
              <div className="flex items-center justify-center gap-2">
                {piece.icon && (
                  <span className="text-xl">{piece.icon}</span>
                )}
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {piece.name || piece.topicName}
                </span>
              </div>
            </div>
          )}

          {/* Continue button */}
          <button
            onClick={handleFinalContinue}
            className="
              w-full py-3 px-6 rounded-xl
              bg-gradient-to-r from-primary to-cyan-500
              text-white font-semibold text-lg
              hover:shadow-lg hover:scale-[1.02]
              active:scale-[0.98]
              transition-all duration-200
            "
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  // Quiz in progress
  return (
    <div className="w-full max-w-2xl mx-auto py-6 px-4">
      {/* Header with cancel button */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {piece?.icon && (
            <span className="text-xl">{piece.icon}</span>
          )}
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Review: {piece?.name || piece?.topicName || 'Topic'}
          </span>
        </div>
        <button
          onClick={handleCancel}
          className="
            text-sm text-gray-400 dark:text-gray-500
            hover:text-gray-600 dark:hover:text-gray-300
            transition-colors
          "
        >
          Cancel
        </button>
      </div>

      {/* Progress indicator */}
      <QuizProgress
        current={currentIndex + 1}
        total={questions.length}
        questionType={currentQuestion?.type || 'mcq'}
      />

      {/* Question display */}
      <div className="min-h-[300px]">
        {/* MCQ Question */}
        {currentQuestion?.type === 'mcq' && state === QUIZ_STATE.ANSWERING && (
          <MCQQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            options={currentQuestion.options}
            onAnswer={handleMCQAnswer}
            showFeedback={false}
            correctIndex={currentQuestion.correctIndex}
            selectedIndex={null}
          />
        )}

        {/* MCQ with feedback */}
        {currentQuestion?.type === 'mcq' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <MCQQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              options={currentQuestion.options}
              onAnswer={() => {}}
              showFeedback={true}
              correctIndex={currentQuestion.correctIndex}
              selectedIndex={currentFeedback.userAnswer}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              explanation={currentQuestion.explanation}
              correctAnswer={currentQuestion.options?.[currentQuestion.correctIndex]}
              userAnswer={currentQuestion.options?.[currentFeedback.userAnswer]}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Fill-in-blank Question */}
        {currentQuestion?.type === 'fill_blank' && state === QUIZ_STATE.ANSWERING && (
          <FillBlankQuestion
            key={currentQuestion.id}
            blankSentence={currentQuestion.blankSentence || currentQuestion.question}
            wordOptions={currentQuestion.wordOptions || []}
            onAnswer={handleFillBlankAnswer}
            showFeedback={false}
            correctAnswer={
              Array.isArray(currentQuestion.correctAnswer)
                ? currentQuestion.correctAnswer[0]
                : currentQuestion.correctAnswer
            }
          />
        )}

        {/* Fill-in-blank with feedback */}
        {currentQuestion?.type === 'fill_blank' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <FillBlankQuestion
              key={`${currentQuestion.id}-feedback`}
              blankSentence={currentQuestion.blankSentence || currentQuestion.question}
              wordOptions={currentQuestion.wordOptions || []}
              onAnswer={() => {}}
              showFeedback={true}
              correctAnswer={currentFeedback.correctAnswer}
              userAnswer={currentFeedback.userAnswer}
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
              similarity={currentFeedback.similarity}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
              explanation={currentQuestion.explanation}
              correctAnswer={currentFeedback.correctAnswer}
              userAnswer={currentFeedback.userAnswer}
              onContinue={handleContinue}
            />
          </div>
        )}
      </div>
    </div>
  )
}
