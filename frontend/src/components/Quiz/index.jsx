/**
 * Quiz Component
 * WB002/WB003: Main orchestrator for quiz flow
 *
 * Features:
 * - Manages quiz state (current question, answers, feedback)
 * - Handles navigation between questions
 * - Supports MCQ and Fill-in-blank question types
 * - Tracks results and calls onComplete when finished
 * - Animated transitions between questions
 */

import { useState, useCallback, useMemo } from 'react'
import QuizProgress from './QuizProgress'
import MCQQuestion from './MCQQuestion'
import FillBlankQuestion from './FillBlankQuestion'
import VoiceQuestion from './VoiceQuestion'
import QuizFeedback from './QuizFeedback'
import QuizPrompt from './QuizPrompt'
import QuizResults, { AnimatedXP } from './QuizResults'
import { fuzzyMatch } from '../../utils/fuzzyMatch'

/**
 * Question types supported by the quiz
 * @typedef {'mcq' | 'fill_blank' | 'true_false' | 'voice'} QuestionType
 */

/**
 * Question object structure
 * @typedef {Object} QuizQuestion
 * @property {string} id - Unique question identifier
 * @property {QuestionType} type - Question type
 * @property {string} question - Question text (for MCQ) or sentence with blank (for fill_blank)
 * @property {string[]} [options] - Answer options (MCQ only)
 * @property {number} [correctIndex] - Index of correct option (MCQ only)
 * @property {string|string[]} [correctAnswer] - Correct answer(s) (fill_blank only)
 * @property {string} [explanation] - Explanation shown after answering
 */

/**
 * Quiz result object
 * @typedef {Object} QuizResult
 * @property {string} questionId - Question ID
 * @property {boolean} isCorrect - Whether answer was correct
 * @property {boolean} isPartial - Whether answer was partially correct (fill_blank)
 * @property {number} similarity - Similarity score for fill_blank (0-1)
 * @property {*} userAnswer - User's answer
 * @property {*} correctAnswer - Correct answer
 */

// Quiz internal states
const QUIZ_STATE = {
  ANSWERING: 'answering',
  SHOWING_FEEDBACK: 'showing_feedback',
  COMPLETED: 'completed'
}

export default function Quiz({
  questions = [],
  onComplete,
  onSkip
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [state, setState] = useState(QUIZ_STATE.ANSWERING)
  const [answers, setAnswers] = useState([])
  const [currentFeedback, setCurrentFeedback] = useState(null)

  // Current question
  const currentQuestion = useMemo(() => {
    return questions[currentIndex] || null
  }, [questions, currentIndex])

  // Total questions
  const totalQuestions = questions.length

  // Calculate final results
  const calculateResults = useCallback(() => {
    const correctCount = answers.filter(a => a.isCorrect).length
    const partialCount = answers.filter(a => a.isPartial && !a.isCorrect).length
    const totalScore = answers.reduce((sum, a) => {
      if (a.isCorrect) return sum + 1
      if (a.isPartial) return sum + 0.5
      return sum
    }, 0)

    return {
      totalQuestions,
      correctCount,
      partialCount,
      incorrectCount: totalQuestions - correctCount - partialCount,
      score: totalScore,
      percentage: Math.round((totalScore / totalQuestions) * 100),
      answers
    }
  }, [answers, totalQuestions])

  // Handle MCQ answer
  const handleMCQAnswer = useCallback((selectedIndex) => {
    if (!currentQuestion || currentQuestion.type !== 'mcq') return

    const isCorrect = selectedIndex === currentQuestion.correctIndex
    const feedback = {
      isCorrect,
      isPartial: false,
      similarity: isCorrect ? 1 : 0,
      questionId: currentQuestion.id,
      userAnswer: selectedIndex,
      correctAnswer: currentQuestion.correctIndex,
      explanation: currentQuestion.explanation
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion])

  // Handle Fill-in-blank answer
  const handleFillBlankAnswer = useCallback((userAnswer) => {
    if (!currentQuestion || currentQuestion.type !== 'fill_blank') return

    // Use fuzzy matching to evaluate the answer
    const matchResult = fuzzyMatch(userAnswer, currentQuestion.correctAnswer, {
      exactThreshold: 0.95, // Allow for minor typos
      partialThreshold: 0.75, // Partial credit for close answers
      minSimilarity: 0.5
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
      explanation: currentQuestion.explanation
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion])

  // Handle Voice answer
  // Voice answers are evaluated semantically: user's response should cover expectedTopics
  const handleVoiceAnswer = useCallback((userTranscript) => {
    if (!currentQuestion || currentQuestion.type !== 'voice') return

    const expectedTopics = currentQuestion.expectedTopics || []
    const correctAnswer = currentQuestion.correctAnswer || currentQuestion.sampleAnswer || ''

    // Count how many expected topics are mentioned in the user's answer
    // Uses case-insensitive substring matching for semantic evaluation
    const normalizedTranscript = userTranscript.toLowerCase()
    let topicsMatched = 0

    for (const topic of expectedTopics) {
      if (normalizedTranscript.includes(topic.toLowerCase())) {
        topicsMatched++
      }
    }

    // Determine correctness based on topic coverage
    // Correct if majority of topics are covered (>= 50%)
    // Partial credit if at least one topic is mentioned
    const totalTopics = expectedTopics.length
    let isCorrect = false
    let isPartial = false

    if (totalTopics > 0) {
      const coverage = topicsMatched / totalTopics
      if (coverage >= 0.5) {
        isCorrect = true
      } else if (topicsMatched > 0) {
        isPartial = true
      }
    } else {
      // Fallback: if no expectedTopics, use fuzzy match against correctAnswer
      const matchResult = fuzzyMatch(userTranscript, correctAnswer, {
        exactThreshold: 0.7, // More lenient for spoken answers
        partialThreshold: 0.5,
        minSimilarity: 0.3
      })
      isCorrect = matchResult.isCorrect
      isPartial = matchResult.isPartial
    }

    const feedback = {
      isCorrect,
      isPartial,
      similarity: totalTopics > 0 ? topicsMatched / totalTopics : 0,
      questionId: currentQuestion.id,
      userAnswer: userTranscript,
      correctAnswer,
      explanation: currentQuestion.explanation
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion])

  // Handle continue after feedback
  const handleContinue = useCallback(() => {
    // Save the answer
    setAnswers(prev => [...prev, currentFeedback])

    // Move to next question or complete
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1)
      setCurrentFeedback(null)
      setState(QUIZ_STATE.ANSWERING)
    } else {
      setState(QUIZ_STATE.COMPLETED)
      // Calculate and return results
      const finalAnswers = [...answers, currentFeedback]
      const correctCount = finalAnswers.filter(a => a.isCorrect).length
      const partialCount = finalAnswers.filter(a => a.isPartial && !a.isCorrect).length
      const totalScore = finalAnswers.reduce((sum, a) => {
        if (a.isCorrect) return sum + 1
        if (a.isPartial) return sum + 0.5
        return sum
      }, 0)

      onComplete?.({
        totalQuestions,
        correctCount,
        partialCount,
        incorrectCount: totalQuestions - correctCount - partialCount,
        score: totalScore,
        percentage: Math.round((totalScore / totalQuestions) * 100),
        answers: finalAnswers
      })
    }
  }, [currentFeedback, currentIndex, totalQuestions, answers, onComplete])

  // Handle skip quiz
  const handleSkip = useCallback(() => {
    onSkip?.()
  }, [onSkip])

  // Guard: No questions
  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No quiz questions available.</p>
      </div>
    )
  }

  // Guard: Quiz completed
  if (state === QUIZ_STATE.COMPLETED) {
    return null // Parent component handles completion UI
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-6 px-4">
      {/* Skip button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleSkip}
          className="
            text-sm text-gray-400 dark:text-gray-500
            hover:text-gray-600 dark:hover:text-gray-300
            transition-colors
          "
        >
          Skip Quiz
        </button>
      </div>

      {/* Progress indicator */}
      <QuizProgress
        current={currentIndex + 1}
        total={totalQuestions}
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
            blankSentence={currentQuestion.question}
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
              blankSentence={currentQuestion.question}
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

        {/* Voice Question */}
        {currentQuestion?.type === 'voice' && state === QUIZ_STATE.ANSWERING && (
          <VoiceQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            expectedTopics={currentQuestion.expectedTopics}
            sampleAnswer={currentQuestion.sampleAnswer || currentQuestion.correctAnswer}
            onAnswer={handleVoiceAnswer}
            showFeedback={false}
          />
        )}

        {/* Voice with feedback */}
        {currentQuestion?.type === 'voice' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <VoiceQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              expectedTopics={currentQuestion.expectedTopics}
              sampleAnswer={currentQuestion.sampleAnswer || currentQuestion.correctAnswer}
              onAnswer={() => {}}
              showFeedback={true}
              feedback={{
                correct: currentFeedback.isCorrect,
                explanation: currentQuestion.explanation
              }}
              userTranscript={currentFeedback.userAnswer}
              correctAnswer={currentFeedback.correctAnswer}
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

// Export sub-components for individual use
export {
  QuizProgress,
  MCQQuestion,
  FillBlankQuestion,
  VoiceQuestion,
  QuizFeedback,
  QuizPrompt,
  QuizResults,
  AnimatedXP
}
