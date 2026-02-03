/**
 * useQuizComebackSystem Hook Tests
 *
 * Tests for the Comeback System state management hook.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Initial state
 * - Phase transitions (idle -> offering -> active -> success/failure)
 * - Eligibility checking
 * - Timer behavior with fake timers
 * - Early termination (2 correct = pass, 2 wrong = fail)
 * - Question answering
 * - Reset functionality
 * - Edge cases
 * - Cleanup on unmount
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useQuizComebackSystem from '../useQuizComebackSystem'
import { COMEBACK_CONFIG } from '../comebackConfig'

describe('useQuizComebackSystem', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('returns initial phase as idle', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      expect(result.current.phase).toBe('idle')
    })

    it('returns isEligible as false initially', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      expect(result.current.isEligible).toBe(false)
    })

    it('returns currentQuestion as null initially', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      expect(result.current.currentQuestion).toBeNull()
    })

    it('returns timeRemaining as null initially', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      expect(result.current.timeRemaining).toBeNull()
    })

    it('returns correctCount as 0 initially', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      expect(result.current.correctCount).toBe(0)
    })

    it('returns questions as empty array initially', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      expect(result.current.questions).toEqual([])
    })

    it('returns result as null initially', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      expect(result.current.result).toBeNull()
    })

    it('returns config object', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      expect(result.current.config).toBeDefined()
      expect(result.current.config).toEqual(COMEBACK_CONFIG)
    })

    it('exposes required functions', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      expect(typeof result.current.checkEligibility).toBe('function')
      expect(typeof result.current.offerComeback).toBe('function')
      expect(typeof result.current.acceptOffer).toBe('function')
      expect(typeof result.current.declineOffer).toBe('function')
      expect(typeof result.current.answerQuestion).toBe('function')
      expect(typeof result.current.reset).toBe('function')
    })
  })

  describe('checkEligibility', () => {
    it('sets isEligible to true when score is within margin', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60) // Within 10% margin
      })

      expect(result.current.isEligible).toBe(true)
    })

    it('sets isEligible to false when score is above threshold', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(65, 60) // Passed
      })

      expect(result.current.isEligible).toBe(false)
    })

    it('sets isEligible to false when score is below margin', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(45, 60) // Too far below
      })

      expect(result.current.isEligible).toBe(false)
    })

    it('returns the eligibility result', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      let eligibility
      act(() => {
        eligibility = result.current.checkEligibility(55, 60)
      })

      expect(eligibility).toBe(true)
    })

    it('does not change phase when checking eligibility', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
      })

      expect(result.current.phase).toBe('idle')
    })

    it('uses default pass threshold if not provided', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55) // Default threshold should be 60
      })

      expect(result.current.isEligible).toBe(true)
    })
  })

  describe('offerComeback', () => {
    it('transitions phase to offering when eligible', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback()
      })

      expect(result.current.phase).toBe('offering')
    })

    it('does not transition when not eligible', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(45, 60) // Not eligible
        result.current.offerComeback()
      })

      expect(result.current.phase).toBe('idle')
    })

    it('accepts questions array', () => {
      const mockQuestions = [
        { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
        { id: 2, question: 'Q2', options: ['A', 'B'], correctIndex: 1 },
        { id: 3, question: 'Q3', options: ['A', 'B'], correctIndex: 0 },
      ]

      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
      })

      expect(result.current.questions).toEqual(mockQuestions)
    })

    it('does not transition if already in non-idle phase', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback()
      })

      expect(result.current.phase).toBe('offering')

      act(() => {
        result.current.offerComeback()
      })

      // Should stay in offering
      expect(result.current.phase).toBe('offering')
    })
  })

  describe('acceptOffer', () => {
    const mockQuestions = [
      { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
      { id: 2, question: 'Q2', options: ['A', 'B'], correctIndex: 1 },
      { id: 3, question: 'Q3', options: ['A', 'B'], correctIndex: 0 },
    ]

    it('transitions phase from offering to active', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      expect(result.current.phase).toBe('active')
    })

    it('sets currentQuestion to first question (index 0)', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      expect(result.current.currentQuestion).toBe(0)
    })

    it('starts timer at timePerQuestion seconds', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      expect(result.current.timeRemaining).toBe(COMEBACK_CONFIG.challenge.timePerQuestion)
    })

    it('resets correctCount to 0', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      expect(result.current.correctCount).toBe(0)
    })

    it('does nothing if not in offering phase', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.acceptOffer()
      })

      expect(result.current.phase).toBe('idle')
    })
  })

  describe('declineOffer', () => {
    const mockQuestions = [
      { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
    ]

    it('transitions phase from offering to idle', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.declineOffer()
      })

      expect(result.current.phase).toBe('idle')
    })

    it('sets isEligible to false', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
      })

      expect(result.current.isEligible).toBe(true)

      act(() => {
        result.current.declineOffer()
      })

      expect(result.current.isEligible).toBe(false)
    })

    it('clears questions', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.declineOffer()
      })

      expect(result.current.questions).toEqual([])
    })

    it('does nothing if not in offering phase', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.declineOffer()
      })

      expect(result.current.phase).toBe('idle')
      expect(result.current.isEligible).toBe(true) // Should remain eligible
    })
  })

  describe('timer behavior', () => {
    const mockQuestions = [
      { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
      { id: 2, question: 'Q2', options: ['A', 'B'], correctIndex: 1 },
      { id: 3, question: 'Q3', options: ['A', 'B'], correctIndex: 0 },
    ]

    it('decrements timeRemaining every second', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      const initialTime = result.current.timeRemaining

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.timeRemaining).toBe(initialTime - 1)
    })

    it('auto-advances to next question when timer reaches 0', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      expect(result.current.currentQuestion).toBe(0)

      act(() => {
        vi.advanceTimersByTime(COMEBACK_CONFIG.challenge.timePerQuestion * 1000)
      })

      // Should advance to next question
      expect(result.current.currentQuestion).toBe(1)
    })

    it('timeout counts as incorrect answer', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      const initialCorrect = result.current.correctCount

      act(() => {
        vi.advanceTimersByTime(COMEBACK_CONFIG.challenge.timePerQuestion * 1000)
      })

      // Correct count should not increase on timeout
      expect(result.current.correctCount).toBe(initialCorrect)
    })

    it('resets timer when advancing to next question', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      act(() => {
        vi.advanceTimersByTime(COMEBACK_CONFIG.challenge.timePerQuestion * 1000)
      })

      // Timer should be reset for new question
      expect(result.current.timeRemaining).toBe(COMEBACK_CONFIG.challenge.timePerQuestion)
    })
  })

  describe('answerQuestion', () => {
    const mockQuestions = [
      { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
      { id: 2, question: 'Q2', options: ['A', 'B'], correctIndex: 1 },
      { id: 3, question: 'Q3', options: ['A', 'B'], correctIndex: 0 },
    ]

    it('increments correctCount when answer is correct', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      expect(result.current.correctCount).toBe(0)

      act(() => {
        result.current.answerQuestion(0) // Correct answer for Q1
      })

      expect(result.current.correctCount).toBe(1)
    })

    it('does not increment correctCount when answer is wrong', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      act(() => {
        result.current.answerQuestion(1) // Wrong answer for Q1
      })

      expect(result.current.correctCount).toBe(0)
    })

    it('advances to next question after answering', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      expect(result.current.currentQuestion).toBe(0)

      act(() => {
        result.current.answerQuestion(0)
      })

      // Wait for transition
      act(() => {
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
      })

      expect(result.current.currentQuestion).toBe(1)
    })

    it('resets timer after answering', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      // Advance timer a bit
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.timeRemaining).toBeLessThan(COMEBACK_CONFIG.challenge.timePerQuestion)

      act(() => {
        result.current.answerQuestion(0)
      })

      act(() => {
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
      })

      // Timer should be reset
      expect(result.current.timeRemaining).toBe(COMEBACK_CONFIG.challenge.timePerQuestion)
    })

    it('does nothing when not in active phase', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.answerQuestion(0)
      })

      expect(result.current.correctCount).toBe(0)
      expect(result.current.phase).toBe('idle')
    })
  })

  describe('early termination - success (2 correct)', () => {
    const mockQuestions = [
      { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
      { id: 2, question: 'Q2', options: ['A', 'B'], correctIndex: 1 },
      { id: 3, question: 'Q3', options: ['A', 'B'], correctIndex: 0 },
    ]

    it('transitions to success when 2 correct answers (requiredCorrect)', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      // Answer Q1 correctly
      act(() => {
        result.current.answerQuestion(0)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
      })

      // Answer Q2 correctly
      act(() => {
        result.current.answerQuestion(1)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.resultDelay)
      })

      expect(result.current.phase).toBe('success')
    })

    it('sets result to passed on early success', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      // Answer 2 correctly
      act(() => {
        result.current.answerQuestion(0)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
      })

      act(() => {
        result.current.answerQuestion(1)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.resultDelay)
      })

      expect(result.current.result).toEqual({
        passed: true,
        correctCount: 2,
        totalQuestions: 3,
      })
    })

    it('does not continue to Q3 after early success', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      // Answer 2 correctly
      act(() => {
        result.current.answerQuestion(0)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
      })

      act(() => {
        result.current.answerQuestion(1)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.resultDelay)
      })

      // Should not be at Q3
      expect(result.current.currentQuestion).not.toBe(2)
      expect(result.current.phase).toBe('success')
    })
  })

  describe('early termination - failure (2 wrong)', () => {
    const mockQuestions = [
      { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
      { id: 2, question: 'Q2', options: ['A', 'B'], correctIndex: 1 },
      { id: 3, question: 'Q3', options: ['A', 'B'], correctIndex: 0 },
    ]

    it('transitions to failure when 2 wrong answers', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      // Answer Q1 incorrectly
      act(() => {
        result.current.answerQuestion(1) // Wrong
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
      })

      // Answer Q2 incorrectly
      act(() => {
        result.current.answerQuestion(0) // Wrong
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.resultDelay)
      })

      expect(result.current.phase).toBe('failure')
    })

    it('sets result to failed on early failure', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      // Answer 2 incorrectly
      act(() => {
        result.current.answerQuestion(1)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
      })

      act(() => {
        result.current.answerQuestion(0)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.resultDelay)
      })

      expect(result.current.result).toEqual({
        passed: false,
        correctCount: 0,
        totalQuestions: 3,
      })
    })

    it('does not continue to Q3 after early failure', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      // Answer 2 incorrectly
      act(() => {
        result.current.answerQuestion(1)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
      })

      act(() => {
        result.current.answerQuestion(0)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.resultDelay)
      })

      expect(result.current.currentQuestion).not.toBe(2)
      expect(result.current.phase).toBe('failure')
    })
  })

  describe('completion after all questions', () => {
    const mockQuestions = [
      { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
      { id: 2, question: 'Q2', options: ['A', 'B'], correctIndex: 1 },
      { id: 3, question: 'Q3', options: ['A', 'B'], correctIndex: 0 },
    ]

    it('transitions to success if 2+ correct after all questions', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      // Q1: Correct
      act(() => {
        result.current.answerQuestion(0)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
      })

      // Q2: Wrong
      act(() => {
        result.current.answerQuestion(0) // Wrong answer
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
      })

      // Q3: Correct (now have 2 correct total)
      act(() => {
        result.current.answerQuestion(0)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.resultDelay)
      })

      expect(result.current.phase).toBe('success')
      expect(result.current.result.passed).toBe(true)
      expect(result.current.result.correctCount).toBe(2)
    })

    it('transitions to failure if less than 2 correct after all questions', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      // Q1: Correct
      act(() => {
        result.current.answerQuestion(0)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
      })

      // Q2: Wrong
      act(() => {
        result.current.answerQuestion(0) // Wrong
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
      })

      // Q3: Wrong (only 1 correct total)
      act(() => {
        result.current.answerQuestion(1) // Wrong
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.resultDelay)
      })

      expect(result.current.phase).toBe('failure')
      expect(result.current.result.passed).toBe(false)
      expect(result.current.result.correctCount).toBe(1)
    })
  })

  describe('reset', () => {
    const mockQuestions = [
      { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
    ]

    it('resets phase to idle', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      expect(result.current.phase).toBe('active')

      act(() => {
        result.current.reset()
      })

      expect(result.current.phase).toBe('idle')
    })

    it('resets isEligible to false', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
      })

      expect(result.current.isEligible).toBe(true)

      act(() => {
        result.current.reset()
      })

      expect(result.current.isEligible).toBe(false)
    })

    it('resets currentQuestion to null', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      expect(result.current.currentQuestion).toBe(0)

      act(() => {
        result.current.reset()
      })

      expect(result.current.currentQuestion).toBeNull()
    })

    it('resets timeRemaining to null', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      expect(result.current.timeRemaining).toBe(COMEBACK_CONFIG.challenge.timePerQuestion)

      act(() => {
        result.current.reset()
      })

      expect(result.current.timeRemaining).toBeNull()
    })

    it('resets correctCount to 0', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
        result.current.answerQuestion(0)
      })

      expect(result.current.correctCount).toBe(1)

      act(() => {
        result.current.reset()
      })

      expect(result.current.correctCount).toBe(0)
    })

    it('resets questions to empty array', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
      })

      expect(result.current.questions).toEqual(mockQuestions)

      act(() => {
        result.current.reset()
      })

      expect(result.current.questions).toEqual([])
    })

    it('resets result to null', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
        result.current.answerQuestion(0)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.resultDelay)
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.result).toBeNull()
    })

    it('cancels all pending timers', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      act(() => {
        result.current.reset()
      })

      // Advance timers - should stay in idle
      act(() => {
        vi.advanceTimersByTime(100000)
      })

      expect(result.current.phase).toBe('idle')
    })
  })

  describe('edge cases', () => {
    it('handles empty questions array', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback([])
        result.current.acceptOffer()
      })

      // Should handle gracefully
      expect(result.current.questions).toEqual([])
    })

    it('handles undefined questions', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(undefined)
      })

      expect(result.current.questions).toEqual([])
    })

    it('handles answering with invalid index', () => {
      const mockQuestions = [
        { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
      ]

      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      expect(() => {
        act(() => {
          result.current.answerQuestion(99) // Invalid index
        })
      }).not.toThrow()

      expect(result.current.correctCount).toBe(0)
    })

    it('handles multiple checkEligibility calls', () => {
      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
      })

      expect(result.current.isEligible).toBe(true)

      act(() => {
        result.current.checkEligibility(45, 60) // Now not eligible
      })

      expect(result.current.isEligible).toBe(false)
    })

    it('handles unmount during active phase', () => {
      const mockQuestions = [
        { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
      ]

      const { result, unmount } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      expect(() => unmount()).not.toThrow()
    })
  })

  describe('cleanup', () => {
    it('clears timers on unmount', () => {
      const mockQuestions = [
        { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
      ]

      const { result, unmount } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      unmount()

      // Should not throw when timers fire after unmount
      expect(() => {
        vi.advanceTimersByTime(100000)
      }).not.toThrow()
    })

    it('clears timers on reset', () => {
      const mockQuestions = [
        { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
      ]

      const { result } = renderHook(() => useQuizComebackSystem())

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
        result.current.acceptOffer()
      })

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      act(() => {
        result.current.reset()
      })

      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('phase state consistency', () => {
    it('follows correct phase order: idle -> offering -> active -> success', () => {
      const mockQuestions = [
        { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
        { id: 2, question: 'Q2', options: ['A', 'B'], correctIndex: 1 },
        { id: 3, question: 'Q3', options: ['A', 'B'], correctIndex: 0 },
      ]

      const { result } = renderHook(() => useQuizComebackSystem())
      const phases = []

      phases.push(result.current.phase) // idle

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
      })

      phases.push(result.current.phase) // offering

      act(() => {
        result.current.acceptOffer()
      })

      phases.push(result.current.phase) // active

      act(() => {
        result.current.answerQuestion(0)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
        result.current.answerQuestion(1)
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.resultDelay)
      })

      phases.push(result.current.phase) // success

      expect(phases).toEqual(['idle', 'offering', 'active', 'success'])
    })

    it('follows correct phase order: idle -> offering -> active -> failure', () => {
      const mockQuestions = [
        { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0 },
        { id: 2, question: 'Q2', options: ['A', 'B'], correctIndex: 1 },
        { id: 3, question: 'Q3', options: ['A', 'B'], correctIndex: 0 },
      ]

      const { result } = renderHook(() => useQuizComebackSystem())
      const phases = []

      phases.push(result.current.phase) // idle

      act(() => {
        result.current.checkEligibility(55, 60)
        result.current.offerComeback(mockQuestions)
      })

      phases.push(result.current.phase) // offering

      act(() => {
        result.current.acceptOffer()
      })

      phases.push(result.current.phase) // active

      act(() => {
        result.current.answerQuestion(1) // Wrong
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.questionTransition)
        result.current.answerQuestion(0) // Wrong
        vi.advanceTimersByTime(COMEBACK_CONFIG.timing.resultDelay)
      })

      phases.push(result.current.phase) // failure

      expect(phases).toEqual(['idle', 'offering', 'active', 'failure'])
    })
  })
})
