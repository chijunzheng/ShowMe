/**
 * useQuizComebackSystem Hook - Comeback Challenge State Management
 *
 * Manages the comeback system state including eligibility checking,
 * phase transitions, timer countdown, question answering, and results.
 *
 * Phases:
 * - idle: Initial state, no comeback active
 * - offering: Showing comeback offer to user
 * - active: Actively answering comeback challenge questions
 * - success: Comeback completed successfully (2+ correct)
 * - failure: Comeback failed (2+ wrong or all questions done with <2 correct)
 *
 * Early Termination:
 * - 2 correct answers = immediate success
 * - 2 wrong answers = immediate failure
 *
 * Usage:
 *   const {
 *     phase,
 *     isEligible,
 *     currentQuestion,
 *     timeRemaining,
 *     correctCount,
 *     questions,
 *     result,
 *     config,
 *     checkEligibility,
 *     offerComeback,
 *     acceptOffer,
 *     declineOffer,
 *     answerQuestion,
 *     reset,
 *   } = useQuizComebackSystem()
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { COMEBACK_CONFIG, checkComebackEligibility } from './comebackConfig'

/**
 * Default pass threshold if not provided.
 */
const DEFAULT_PASS_THRESHOLD = 60

/**
 * Phase constants for type safety.
 */
const PHASES = {
  IDLE: 'idle',
  OFFERING: 'offering',
  ACTIVE: 'active',
  SUCCESS: 'success',
  FAILURE: 'failure',
}

/**
 * Hook for managing the comeback challenge system.
 *
 * @returns {Object} Comeback system state and control functions
 */
export default function useQuizComebackSystem() {
  // State
  const [phase, setPhase] = useState(PHASES.IDLE)
  const [isEligible, setIsEligible] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [questions, setQuestions] = useState([])
  const [result, setResult] = useState(null)

  // Refs for cleanup and synchronous access
  const timerRef = useRef(null)
  const transitionTimerRef = useRef(null)
  const isMountedRef = useRef(true)
  const phaseRef = useRef(PHASES.IDLE)
  const eligibleRef = useRef(false)
  const questionsRef = useRef([])
  const correctCountRef = useRef(0)
  const wrongCountRef = useRef(0)
  const currentQuestionRef = useRef(null)

  // Sync refs with state
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    eligibleRef.current = isEligible
  }, [isEligible])

  useEffect(() => {
    questionsRef.current = questions
  }, [questions])

  useEffect(() => {
    correctCountRef.current = correctCount
  }, [correctCount])

  useEffect(() => {
    wrongCountRef.current = wrongCount
  }, [wrongCount])

  useEffect(() => {
    currentQuestionRef.current = currentQuestion
  }, [currentQuestion])

  /**
   * Clear all active timers.
   */
  const clearAllTimers = useCallback(() => {
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
   * Check if user is eligible for comeback based on score.
   *
   * @param {number} score - User's quiz score percentage
   * @param {number} [passThreshold] - Pass threshold percentage
   * @returns {boolean} Whether user is eligible
   */
  const checkEligibilityFn = useCallback((score, passThreshold = DEFAULT_PASS_THRESHOLD) => {
    const eligible = checkComebackEligibility(
      score,
      passThreshold,
      COMEBACK_CONFIG.trigger.marginPercent
    )
    setIsEligible(eligible)
    eligibleRef.current = eligible
    return eligible
  }, [])

  /**
   * Start the countdown timer for the current question.
   */
  const startTimer = useCallback(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    timerRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        clearInterval(timerRef.current)
        return
      }

      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          // Time ran out - counts as wrong answer
          clearInterval(timerRef.current)
          timerRef.current = null

          // Handle timeout as wrong answer
          const newWrongCount = wrongCountRef.current + 1
          setWrongCount(newWrongCount)
          wrongCountRef.current = newWrongCount

          const requiredCorrect = COMEBACK_CONFIG.challenge.requiredCorrect
          const totalQuestions = COMEBACK_CONFIG.challenge.questionCount
          const maxPossibleWrong = totalQuestions - requiredCorrect

          // Check for early failure
          if (newWrongCount > maxPossibleWrong) {
            // Too many wrong, early failure
            setTimeout(() => {
              if (isMountedRef.current) {
                setResult({
                  passed: false,
                  correctCount: correctCountRef.current,
                  totalQuestions,
                })
                setPhase(PHASES.FAILURE)
                phaseRef.current = PHASES.FAILURE
              }
            }, COMEBACK_CONFIG.timing.resultDelay)
          } else {
            // Move to next question
            const nextQ = (currentQuestionRef.current ?? 0) + 1
            if (nextQ >= totalQuestions) {
              // All questions done
              setTimeout(() => {
                if (isMountedRef.current) {
                  const passed = correctCountRef.current >= requiredCorrect
                  setResult({
                    passed,
                    correctCount: correctCountRef.current,
                    totalQuestions,
                  })
                  setPhase(passed ? PHASES.SUCCESS : PHASES.FAILURE)
                  phaseRef.current = passed ? PHASES.SUCCESS : PHASES.FAILURE
                }
              }, COMEBACK_CONFIG.timing.resultDelay)
            } else {
              // Reset timer for next question
              setCurrentQuestion(nextQ)
              currentQuestionRef.current = nextQ
              setTimeRemaining(COMEBACK_CONFIG.challenge.timePerQuestion)
            }
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  /**
   * Offer comeback to the user (transition to offering phase).
   *
   * @param {Array} questionList - Questions for the comeback challenge
   */
  const offerComeback = useCallback((questionList) => {
    // Only allow transition from idle phase when eligible
    if (phaseRef.current !== PHASES.IDLE || !eligibleRef.current) {
      // Still set questions if provided
      if (Array.isArray(questionList)) {
        setQuestions(questionList)
        questionsRef.current = questionList
      }
      return
    }

    // Set questions (handle undefined/null)
    const validQuestions = Array.isArray(questionList) ? questionList : []
    setQuestions(validQuestions)
    questionsRef.current = validQuestions

    // Transition to offering phase
    setPhase(PHASES.OFFERING)
    phaseRef.current = PHASES.OFFERING
  }, [])

  /**
   * Accept the comeback offer and start the challenge.
   */
  const acceptOffer = useCallback(() => {
    if (phaseRef.current !== PHASES.OFFERING) {
      return
    }

    // Reset challenge state
    setCurrentQuestion(0)
    currentQuestionRef.current = 0
    setCorrectCount(0)
    correctCountRef.current = 0
    setWrongCount(0)
    wrongCountRef.current = 0
    setResult(null)
    setTimeRemaining(COMEBACK_CONFIG.challenge.timePerQuestion)

    // Transition to active
    setPhase(PHASES.ACTIVE)
    phaseRef.current = PHASES.ACTIVE

    // Start timer
    startTimer()
  }, [startTimer])

  /**
   * Decline the comeback offer.
   */
  const declineOffer = useCallback(() => {
    if (phaseRef.current !== PHASES.OFFERING) {
      return
    }

    setIsEligible(false)
    eligibleRef.current = false
    setQuestions([])
    questionsRef.current = []
    setPhase(PHASES.IDLE)
    phaseRef.current = PHASES.IDLE
  }, [])

  /**
   * Answer the current question.
   *
   * @param {number} selectedIndex - Index of the selected answer
   */
  const answerQuestion = useCallback((selectedIndex) => {
    if (phaseRef.current !== PHASES.ACTIVE) {
      return
    }

    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const currentQ = currentQuestionRef.current
    const currentQuestions = questionsRef.current

    if (currentQ === null || currentQ >= currentQuestions.length) {
      return
    }

    const question = currentQuestions[currentQ]
    const isCorrect = question && selectedIndex === question.correctIndex

    const requiredCorrect = COMEBACK_CONFIG.challenge.requiredCorrect
    const totalQuestions = COMEBACK_CONFIG.challenge.questionCount
    const maxPossibleWrong = totalQuestions - requiredCorrect

    if (isCorrect) {
      const newCorrect = correctCountRef.current + 1
      setCorrectCount(newCorrect)
      correctCountRef.current = newCorrect

      // Check for early success
      if (newCorrect >= requiredCorrect) {
        transitionTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setResult({
              passed: true,
              correctCount: newCorrect,
              totalQuestions,
            })
            setPhase(PHASES.SUCCESS)
            phaseRef.current = PHASES.SUCCESS
          }
        }, COMEBACK_CONFIG.timing.resultDelay)
        return
      }
    } else {
      const newWrong = wrongCountRef.current + 1
      setWrongCount(newWrong)
      wrongCountRef.current = newWrong

      // Check for early failure
      if (newWrong > maxPossibleWrong) {
        transitionTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setResult({
              passed: false,
              correctCount: correctCountRef.current,
              totalQuestions,
            })
            setPhase(PHASES.FAILURE)
            phaseRef.current = PHASES.FAILURE
          }
        }, COMEBACK_CONFIG.timing.resultDelay)
        return
      }
    }

    // Advance to next question
    const nextQ = currentQ + 1
    if (nextQ >= totalQuestions) {
      // All questions done
      const finalCorrect = correctCountRef.current
      transitionTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          const passed = finalCorrect >= requiredCorrect
          setResult({
            passed,
            correctCount: finalCorrect,
            totalQuestions,
          })
          setPhase(passed ? PHASES.SUCCESS : PHASES.FAILURE)
          phaseRef.current = passed ? PHASES.SUCCESS : PHASES.FAILURE
        }
      }, COMEBACK_CONFIG.timing.resultDelay)
    } else {
      // Move to next question after transition
      transitionTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setCurrentQuestion(nextQ)
          currentQuestionRef.current = nextQ
          setTimeRemaining(COMEBACK_CONFIG.challenge.timePerQuestion)
          startTimer()
        }
      }, COMEBACK_CONFIG.timing.questionTransition)
    }
  }, [startTimer])

  /**
   * Reset the comeback system to initial state.
   */
  const reset = useCallback(() => {
    clearAllTimers()
    setPhase(PHASES.IDLE)
    phaseRef.current = PHASES.IDLE
    setIsEligible(false)
    eligibleRef.current = false
    setCurrentQuestion(null)
    currentQuestionRef.current = null
    setTimeRemaining(null)
    setCorrectCount(0)
    correctCountRef.current = 0
    setWrongCount(0)
    wrongCountRef.current = 0
    setQuestions([])
    questionsRef.current = []
    setResult(null)
  }, [clearAllTimers])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      clearAllTimers()
    }
  }, [clearAllTimers])

  return {
    // State
    phase,
    isEligible,
    currentQuestion,
    timeRemaining,
    correctCount,
    questions,
    result,
    config: COMEBACK_CONFIG,

    // Actions
    checkEligibility: checkEligibilityFn,
    offerComeback,
    acceptOffer,
    declineOffer,
    answerQuestion,
    reset,
  }
}
