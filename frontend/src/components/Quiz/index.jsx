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

import { useState, useCallback, useMemo, useEffect } from 'react'
import QuizProgress from './QuizProgress'
import MCQQuestion from './MCQQuestion'
import FillBlankQuestion from './FillBlankQuestion'
import VoiceQuestion from './VoiceQuestion'
import YesNoQuestion from './YesNoQuestion'
import PictureMatchQuestion from './PictureMatchQuestion'
import FindErrorQuestion from './FindErrorQuestion'
import SpotItQuestion from './SpotItQuestion'
import SequenceQuestion from './SequenceQuestion'
import ApplyConceptQuestion from './ApplyConceptQuestion'
import QuizFeedback from './QuizFeedback'
import QuizPrompt from './QuizPrompt'
import QuizResults, { AnimatedXP } from './QuizResults'
import QuizSlidePreview from './QuizSlidePreview'
import ComboIndicator from './ComboIndicator'
import StreakCelebration from './StreakCelebration'
import QuizTimer from './QuizTimer'
import useQuizGamification from './useQuizGamification'
import { fuzzyMatch } from '../../utils/fuzzyMatch'

/**
 * Question types supported by the quiz
 * @typedef {'mcq' | 'fill_blank' | 'true_false' | 'voice' | 'yes_no' | 'picture_match' | 'find_error' | 'spot_it' | 'sequence' | 'apply_concept'} QuestionType
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
  slides = [],
  level = 'standard',
  onComplete,
  onSkip
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [state, setState] = useState(QUIZ_STATE.ANSWERING)
  const [answers, setAnswers] = useState([])
  const [currentFeedback, setCurrentFeedback] = useState(null)
  const [timerActive, setTimerActive] = useState(true)

  // Initialize gamification system based on level
  const gamification = useQuizGamification(level)

  // Start timer when question changes
  useEffect(() => {
    if (state === QUIZ_STATE.ANSWERING) {
      gamification.startQuestionTimer()
      setTimerActive(true)
    } else {
      setTimerActive(false)
    }
  }, [currentIndex, state, gamification.startQuestionTimer])

  // Current question
  const currentQuestion = useMemo(() => {
    return questions[currentIndex] || null
  }, [questions, currentIndex])

  // Get slide image for current question based on slideReference
  const currentSlideImage = useMemo(() => {
    if (!currentQuestion || currentQuestion.slideReference === undefined) {
      return null
    }
    const slide = slides[currentQuestion.slideReference]
    return slide?.imageUrl || null
  }, [currentQuestion, slides])

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

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, false)

    const feedback = {
      isCorrect,
      isPartial: false,
      similarity: isCorrect ? 1 : 0,
      questionId: currentQuestion.id,
      userAnswer: selectedIndex,
      correctAnswer: currentQuestion.correctIndex,
      explanation: currentQuestion.explanation,
      xpGained: gamificationResult.xpGained,
      speedBonus: gamificationResult.speedBonus
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion, gamification])

  // Handle Fill-in-blank answer
  const handleFillBlankAnswer = useCallback((userAnswer) => {
    if (!currentQuestion || currentQuestion.type !== 'fill_blank') return

    // Use fuzzy matching to evaluate the answer
    const matchResult = fuzzyMatch(userAnswer, currentQuestion.correctAnswer, {
      exactThreshold: 0.95, // Allow for minor typos
      partialThreshold: 0.75, // Partial credit for close answers
      minSimilarity: 0.5
    })

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(matchResult.isCorrect, matchResult.isPartial)

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
      xpGained: gamificationResult.xpGained,
      speedBonus: gamificationResult.speedBonus
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion, gamification])

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

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, isPartial)

    const feedback = {
      isCorrect,
      isPartial,
      similarity: totalTopics > 0 ? topicsMatched / totalTopics : 0,
      questionId: currentQuestion.id,
      userAnswer: userTranscript,
      correctAnswer,
      explanation: currentQuestion.explanation,
      xpGained: gamificationResult.xpGained,
      speedBonus: gamificationResult.speedBonus
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion, gamification])

  // Handle Yes/No answer
  // yes_no type expects a boolean answer (true/false)
  const handleYesNoAnswer = useCallback((userAnswer) => {
    if (!currentQuestion || currentQuestion.type !== 'yes_no') return

    const isCorrect = userAnswer === currentQuestion.correctAnswer

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, false)

    const feedback = {
      isCorrect,
      isPartial: false,
      similarity: isCorrect ? 1 : 0,
      questionId: currentQuestion.id,
      userAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation,
      xpGained: gamificationResult.xpGained,
      speedBonus: gamificationResult.speedBonus
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion, gamification])

  // Handle Picture Match answer
  // picture_match type expects a slide index selection
  const handlePictureMatchAnswer = useCallback((selectedSlideIndex) => {
    if (!currentQuestion || currentQuestion.type !== 'picture_match') return

    const isCorrect = selectedSlideIndex === currentQuestion.correctSlideIndex

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, false)

    const feedback = {
      isCorrect,
      isPartial: false,
      similarity: isCorrect ? 1 : 0,
      questionId: currentQuestion.id,
      userAnswer: selectedSlideIndex,
      correctAnswer: currentQuestion.correctSlideIndex,
      explanation: currentQuestion.explanation,
      xpGained: gamificationResult.xpGained,
      speedBonus: gamificationResult.speedBonus
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion, gamification])

  // Handle Find Error answer
  // find_error type expects text input describing the error
  const handleFindErrorAnswer = useCallback((userAnswer) => {
    if (!currentQuestion || currentQuestion.type !== 'find_error') return

    // Use fuzzy matching to evaluate the answer
    const matchResult = fuzzyMatch(userAnswer, currentQuestion.correctAnswer, {
      exactThreshold: 0.85, // Allow for different wording
      partialThreshold: 0.6, // Partial credit for related answers
      minSimilarity: 0.4
    })

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(matchResult.isCorrect, matchResult.isPartial)

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
      xpGained: gamificationResult.xpGained,
      speedBonus: gamificationResult.speedBonus
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion, gamification])

  // Handle Spot It answer
  // spot_it type expects {x, y} coordinates where user tapped on the image
  const handleSpotItAnswer = useCallback((coordinates) => {
    if (!currentQuestion || currentQuestion.type !== 'spot_it') return

    // Check if user's tap is within the target area
    // Target area is defined by correctArea: { x, y, radius } or { x, y, width, height }
    const targetArea = currentQuestion.correctArea
    let isCorrect = false

    if (targetArea) {
      const dx = coordinates.x - targetArea.x
      const dy = coordinates.y - targetArea.y

      if (targetArea.radius) {
        // Circular target area
        const distance = Math.sqrt(dx * dx + dy * dy)
        isCorrect = distance <= targetArea.radius
      } else if (targetArea.width && targetArea.height) {
        // Rectangular target area
        isCorrect = Math.abs(dx) <= targetArea.width / 2 &&
                    Math.abs(dy) <= targetArea.height / 2
      }
    }

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, false)

    const feedback = {
      isCorrect,
      isPartial: false,
      similarity: isCorrect ? 1 : 0,
      questionId: currentQuestion.id,
      userAnswer: coordinates,
      correctAnswer: targetArea,
      explanation: currentQuestion.explanation,
      xpGained: gamificationResult.xpGained,
      speedBonus: gamificationResult.speedBonus
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion, gamification])

  // Handle Sequence answer
  // sequence type expects an array of indices representing the order
  const handleSequenceAnswer = useCallback((userSequence) => {
    if (!currentQuestion || currentQuestion.type !== 'sequence') return

    const correctSequence = currentQuestion.correctSequence
    let isCorrect = false
    let isPartial = false
    let correctCount = 0

    if (Array.isArray(userSequence) && Array.isArray(correctSequence)) {
      // Check exact match first
      isCorrect = userSequence.length === correctSequence.length &&
                  userSequence.every((val, idx) => val === correctSequence[idx])

      // If not exact match, check for partial credit
      if (!isCorrect) {
        // Count positions that are correct
        const minLength = Math.min(userSequence.length, correctSequence.length)
        for (let i = 0; i < minLength; i++) {
          if (userSequence[i] === correctSequence[i]) {
            correctCount++
          }
        }
        // Partial credit if at least half are in correct position
        isPartial = correctCount >= correctSequence.length / 2
      }
    }

    const similarity = correctSequence.length > 0
      ? (isCorrect ? 1 : correctCount / correctSequence.length)
      : 0

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, isPartial)

    const feedback = {
      isCorrect,
      isPartial,
      similarity,
      questionId: currentQuestion.id,
      userAnswer: userSequence,
      correctAnswer: correctSequence,
      explanation: currentQuestion.explanation,
      xpGained: gamificationResult.xpGained,
      speedBonus: gamificationResult.speedBonus
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion, gamification])

  // Handle Apply Concept answer
  // apply_concept type expects text input applying a concept to a new scenario
  const handleApplyConceptAnswer = useCallback((userAnswer) => {
    if (!currentQuestion || currentQuestion.type !== 'apply_concept') return

    // Check against expected key points in the answer
    const expectedKeyPoints = currentQuestion.expectedKeyPoints || []
    const correctAnswer = currentQuestion.correctAnswer || currentQuestion.sampleAnswer || ''

    let isCorrect = false
    let isPartial = false
    let keyPointsMatched = 0

    const normalizedAnswer = userAnswer.toLowerCase()

    if (expectedKeyPoints.length > 0) {
      // Check how many key points are mentioned in the answer
      for (const keyPoint of expectedKeyPoints) {
        if (normalizedAnswer.includes(keyPoint.toLowerCase())) {
          keyPointsMatched++
        }
      }

      // Correct if majority of key points are covered
      const coverage = keyPointsMatched / expectedKeyPoints.length
      if (coverage >= 0.6) {
        isCorrect = true
      } else if (keyPointsMatched > 0) {
        isPartial = true
      }
    } else {
      // Fallback to fuzzy matching if no expectedKeyPoints defined
      const matchResult = fuzzyMatch(userAnswer, correctAnswer, {
        exactThreshold: 0.75,
        partialThreshold: 0.5,
        minSimilarity: 0.3
      })
      isCorrect = matchResult.isCorrect
      isPartial = matchResult.isPartial
    }

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, isPartial)

    const feedback = {
      isCorrect,
      isPartial,
      similarity: expectedKeyPoints.length > 0
        ? keyPointsMatched / expectedKeyPoints.length
        : 0,
      questionId: currentQuestion.id,
      userAnswer,
      correctAnswer: Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer,
      explanation: currentQuestion.explanation,
      xpGained: gamificationResult.xpGained,
      speedBonus: gamificationResult.speedBonus
    }

    setCurrentFeedback(feedback)
    setState(QUIZ_STATE.SHOWING_FEEDBACK)
  }, [currentQuestion, gamification])

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

      // Calculate gamification results
      const gamificationResults = gamification.calculateFinalResults(correctCount, totalQuestions)

      onComplete?.({
        totalQuestions,
        correctCount,
        partialCount,
        incorrectCount: totalQuestions - correctCount - partialCount,
        score: totalScore,
        percentage: Math.round((totalScore / totalQuestions) * 100),
        answers: finalAnswers,
        // Gamification data
        level,
        ...gamificationResults
      })
    }
  }, [currentFeedback, currentIndex, totalQuestions, answers, onComplete, gamification, level])

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
    <div className="w-full max-w-2xl mx-auto py-6 px-4 relative">
      {/* Streak Celebration Overlay */}
      <StreakCelebration
        streak={gamification.streak}
        celebrationStyle={gamification.rules.celebrationStyle}
        show={gamification.showStreakCelebration}
      />

      {/* Combo Indicator - Top right corner */}
      <ComboIndicator
        multiplier={gamification.currentMultiplier}
        comboLevel={gamification.comboLevel}
        showComboUp={gamification.showComboUp}
        celebrationStyle={gamification.rules.celebrationStyle}
      />

      {/* Quiz Timer - Top left corner */}
      <QuizTimer
        isActive={timerActive}
        speedThreshold={gamification.rules.speedThreshold}
        level={level}
      />

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
        {/* Slide preview - shows diagram from learning content */}
        {currentSlideImage && (
          <div className="mb-4 flex justify-center">
            <QuizSlidePreview
              imageUrl={currentSlideImage}
              alt={`Diagram for question ${currentIndex + 1}`}
            />
          </div>
        )}

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

        {/* Yes/No Question */}
        {currentQuestion?.type === 'yes_no' && state === QUIZ_STATE.ANSWERING && (
          <YesNoQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            statement={currentQuestion.statement}
            onAnswer={handleYesNoAnswer}
            showFeedback={false}
            correctAnswer={currentQuestion.correctAnswer}
          />
        )}

        {/* Yes/No with feedback */}
        {currentQuestion?.type === 'yes_no' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <YesNoQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              statement={currentQuestion.statement}
              onAnswer={() => {}}
              showFeedback={true}
              correctAnswer={currentQuestion.correctAnswer}
              userAnswer={currentFeedback.userAnswer}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              explanation={currentQuestion.explanation}
              correctAnswer={currentFeedback.correctAnswer ? 'True' : 'False'}
              userAnswer={currentFeedback.userAnswer ? 'True' : 'False'}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Picture Match Question */}
        {currentQuestion?.type === 'picture_match' && state === QUIZ_STATE.ANSWERING && (
          <PictureMatchQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            imageOptions={currentQuestion.imageOptions}
            slides={slides}
            onAnswer={handlePictureMatchAnswer}
            showFeedback={false}
            correctSlideIndex={currentQuestion.correctSlideIndex}
          />
        )}

        {/* Picture Match with feedback */}
        {currentQuestion?.type === 'picture_match' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <PictureMatchQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              imageOptions={currentQuestion.imageOptions}
              slides={slides}
              onAnswer={() => {}}
              showFeedback={true}
              correctSlideIndex={currentQuestion.correctSlideIndex}
              userAnswer={currentFeedback.userAnswer}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              explanation={currentQuestion.explanation}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Find Error Question */}
        {currentQuestion?.type === 'find_error' && state === QUIZ_STATE.ANSWERING && (
          <FindErrorQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            incorrectStatement={currentQuestion.incorrectStatement}
            onAnswer={handleFindErrorAnswer}
            showFeedback={false}
            correctAnswer={
              Array.isArray(currentQuestion.correctAnswer)
                ? currentQuestion.correctAnswer[0]
                : currentQuestion.correctAnswer
            }
          />
        )}

        {/* Find Error with feedback */}
        {currentQuestion?.type === 'find_error' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <FindErrorQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              incorrectStatement={currentQuestion.incorrectStatement}
              onAnswer={() => {}}
              showFeedback={true}
              correctAnswer={currentFeedback.correctAnswer}
              userAnswer={currentFeedback.userAnswer}
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
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

        {/* Spot It Question */}
        {currentQuestion?.type === 'spot_it' && state === QUIZ_STATE.ANSWERING && (
          <SpotItQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            imageUrl={currentSlideImage}
            hint={currentQuestion.hint}
            onAnswer={handleSpotItAnswer}
            showFeedback={false}
            correctArea={currentQuestion.correctArea}
          />
        )}

        {/* Spot It with feedback */}
        {currentQuestion?.type === 'spot_it' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <SpotItQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              imageUrl={currentSlideImage}
              hint={currentQuestion.hint}
              onAnswer={() => {}}
              showFeedback={true}
              correctArea={currentQuestion.correctArea}
              userAnswer={currentFeedback.userAnswer}
              isCorrect={currentFeedback.isCorrect}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              explanation={currentQuestion.explanation}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Sequence Question */}
        {currentQuestion?.type === 'sequence' && state === QUIZ_STATE.ANSWERING && (
          <SequenceQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            items={currentQuestion.items}
            onAnswer={handleSequenceAnswer}
            showFeedback={false}
            correctSequence={currentQuestion.correctSequence}
          />
        )}

        {/* Sequence with feedback */}
        {currentQuestion?.type === 'sequence' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <SequenceQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              items={currentQuestion.items}
              onAnswer={() => {}}
              showFeedback={true}
              correctSequence={currentQuestion.correctSequence}
              userAnswer={currentFeedback.userAnswer}
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
              explanation={currentQuestion.explanation}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Apply Concept Question */}
        {currentQuestion?.type === 'apply_concept' && state === QUIZ_STATE.ANSWERING && (
          <ApplyConceptQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            scenario={currentQuestion.scenario}
            concept={currentQuestion.concept}
            expectedKeyPoints={currentQuestion.expectedKeyPoints}
            onAnswer={handleApplyConceptAnswer}
            showFeedback={false}
            sampleAnswer={currentQuestion.sampleAnswer || currentQuestion.correctAnswer}
          />
        )}

        {/* Apply Concept with feedback */}
        {currentQuestion?.type === 'apply_concept' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <ApplyConceptQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              scenario={currentQuestion.scenario}
              concept={currentQuestion.concept}
              expectedKeyPoints={currentQuestion.expectedKeyPoints}
              onAnswer={() => {}}
              showFeedback={true}
              sampleAnswer={currentQuestion.sampleAnswer || currentQuestion.correctAnswer}
              userAnswer={currentFeedback.userAnswer}
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
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
  YesNoQuestion,
  PictureMatchQuestion,
  FindErrorQuestion,
  SpotItQuestion,
  SequenceQuestion,
  ApplyConceptQuestion,
  QuizFeedback,
  QuizPrompt,
  QuizResults,
  QuizSlidePreview,
  AnimatedXP,
  ComboIndicator,
  StreakCelebration,
  QuizTimer,
  useQuizGamification
}
