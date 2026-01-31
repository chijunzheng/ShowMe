/**
 * Quiz Messages Utility Tests
 *
 * Tests for the randomized gamification messages used in quiz feedback.
 * TDD: Write tests first, then implement.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CORRECT_MESSAGES,
  INCORRECT_MESSAGES,
  PARTIAL_MESSAGES,
  getRandomCorrectMessage,
  getRandomIncorrectMessage,
  getRandomPartialMessage,
  getChallengeLabel,
  getGameTypeLabel,
} from './quizMessages'

describe('quizMessages', () => {
  describe('message arrays', () => {
    it('CORRECT_MESSAGES contains expected encouraging messages', () => {
      expect(CORRECT_MESSAGES).toContain('Nailed it!')
      expect(CORRECT_MESSAGES).toContain('Perfect!')
      expect(CORRECT_MESSAGES).toContain('Awesome!')
      expect(CORRECT_MESSAGES).toContain('You got it!')
      expect(CORRECT_MESSAGES).toContain('Brilliant!')
      expect(CORRECT_MESSAGES.length).toBeGreaterThanOrEqual(5)
    })

    it('INCORRECT_MESSAGES contains expected supportive messages', () => {
      expect(INCORRECT_MESSAGES).toContain('Nice try!')
      expect(INCORRECT_MESSAGES).toContain('Almost!')
      expect(INCORRECT_MESSAGES).toContain('Keep going!')
      expect(INCORRECT_MESSAGES.length).toBeGreaterThanOrEqual(3)
    })

    it('PARTIAL_MESSAGES contains expected partial-credit messages', () => {
      expect(PARTIAL_MESSAGES).toContain('So close!')
      expect(PARTIAL_MESSAGES).toContain('Almost there!')
      expect(PARTIAL_MESSAGES).toContain('Good thinking!')
      expect(PARTIAL_MESSAGES.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('getRandomCorrectMessage', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('returns a message from CORRECT_MESSAGES', () => {
      const message = getRandomCorrectMessage()
      expect(CORRECT_MESSAGES).toContain(message)
    })

    it('returns first message when random is 0', () => {
      vi.mocked(Math.random).mockReturnValue(0)
      const message = getRandomCorrectMessage()
      expect(message).toBe(CORRECT_MESSAGES[0])
    })

    it('returns last message when random is close to 1', () => {
      vi.mocked(Math.random).mockReturnValue(0.999)
      const message = getRandomCorrectMessage()
      expect(message).toBe(CORRECT_MESSAGES[CORRECT_MESSAGES.length - 1])
    })
  })

  describe('getRandomIncorrectMessage', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('returns a message from INCORRECT_MESSAGES', () => {
      const message = getRandomIncorrectMessage()
      expect(INCORRECT_MESSAGES).toContain(message)
    })

    it('returns first message when random is 0', () => {
      vi.mocked(Math.random).mockReturnValue(0)
      const message = getRandomIncorrectMessage()
      expect(message).toBe(INCORRECT_MESSAGES[0])
    })

    it('returns last message when random is close to 1', () => {
      vi.mocked(Math.random).mockReturnValue(0.999)
      const message = getRandomIncorrectMessage()
      expect(message).toBe(INCORRECT_MESSAGES[INCORRECT_MESSAGES.length - 1])
    })
  })

  describe('getRandomPartialMessage', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('returns a message from PARTIAL_MESSAGES', () => {
      const message = getRandomPartialMessage()
      expect(PARTIAL_MESSAGES).toContain(message)
    })

    it('returns first message when random is 0', () => {
      vi.mocked(Math.random).mockReturnValue(0)
      const message = getRandomPartialMessage()
      expect(message).toBe(PARTIAL_MESSAGES[0])
    })

    it('returns last message when random is close to 1', () => {
      vi.mocked(Math.random).mockReturnValue(0.999)
      const message = getRandomPartialMessage()
      expect(message).toBe(PARTIAL_MESSAGES[PARTIAL_MESSAGES.length - 1])
    })
  })

  describe('getChallengeLabel', () => {
    it('returns "Challenge X" for non-final questions', () => {
      expect(getChallengeLabel(1, 5)).toBe('Challenge 1')
      expect(getChallengeLabel(2, 5)).toBe('Challenge 2')
      expect(getChallengeLabel(4, 5)).toBe('Challenge 4')
    })

    it('returns "Boss Challenge!" for the final question', () => {
      expect(getChallengeLabel(5, 5)).toBe('Boss Challenge!')
      expect(getChallengeLabel(3, 3)).toBe('Boss Challenge!')
      expect(getChallengeLabel(10, 10)).toBe('Boss Challenge!')
    })

    it('handles edge case of single question quiz', () => {
      expect(getChallengeLabel(1, 1)).toBe('Boss Challenge!')
    })
  })

  describe('getGameTypeLabel', () => {
    it('returns game-like labels for question types', () => {
      expect(getGameTypeLabel('mcq')).toBe('Pick the Answer')
      expect(getGameTypeLabel('fill_blank')).toBe('Fill the Gap')
      expect(getGameTypeLabel('true_false')).toBe('True or False')
      expect(getGameTypeLabel('voice')).toBe('Speak Up')
    })

    it('returns "Challenge" for unknown types', () => {
      expect(getGameTypeLabel('unknown')).toBe('Challenge')
      expect(getGameTypeLabel('')).toBe('Challenge')
      expect(getGameTypeLabel(null)).toBe('Challenge')
      expect(getGameTypeLabel(undefined)).toBe('Challenge')
    })
  })
})
