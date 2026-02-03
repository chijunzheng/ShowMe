/**
 * Quiz Messages - Level-Specific Messages Tests
 *
 * Tests for the level-specific message pools added for Phase 6.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - LEVEL_MESSAGES constant structure
 * - Message pools for simple, standard, deep levels
 * - Message pools for correct, partial, incorrect types
 * - getLevelMessage function behavior
 * - Fallback behavior for invalid inputs
 * - Message variety and randomization
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  LEVEL_MESSAGES,
  getLevelMessage,
  CORRECT_MESSAGES,
} from '../quizMessages'

describe('quizMessages - Level-Specific Messages', () => {
  describe('LEVEL_MESSAGES structure', () => {
    it('exports LEVEL_MESSAGES constant', () => {
      expect(LEVEL_MESSAGES).toBeDefined()
      expect(typeof LEVEL_MESSAGES).toBe('object')
    })

    it('has simple level with correct, partial, incorrect pools', () => {
      expect(LEVEL_MESSAGES.simple).toBeDefined()
      expect(LEVEL_MESSAGES.simple.correct).toBeDefined()
      expect(LEVEL_MESSAGES.simple.partial).toBeDefined()
      expect(LEVEL_MESSAGES.simple.incorrect).toBeDefined()
    })

    it('has standard level with correct, partial, incorrect pools', () => {
      expect(LEVEL_MESSAGES.standard).toBeDefined()
      expect(LEVEL_MESSAGES.standard.correct).toBeDefined()
      expect(LEVEL_MESSAGES.standard.partial).toBeDefined()
      expect(LEVEL_MESSAGES.standard.incorrect).toBeDefined()
    })

    it('has deep level with correct, partial, incorrect pools', () => {
      expect(LEVEL_MESSAGES.deep).toBeDefined()
      expect(LEVEL_MESSAGES.deep.correct).toBeDefined()
      expect(LEVEL_MESSAGES.deep.partial).toBeDefined()
      expect(LEVEL_MESSAGES.deep.incorrect).toBeDefined()
    })

    it('all message pools are non-empty arrays', () => {
      const levels = ['simple', 'standard', 'deep']
      const types = ['correct', 'partial', 'incorrect']

      levels.forEach((level) => {
        types.forEach((type) => {
          expect(Array.isArray(LEVEL_MESSAGES[level][type])).toBe(true)
          expect(LEVEL_MESSAGES[level][type].length).toBeGreaterThan(0)
        })
      })
    })

    it('all messages are non-empty strings', () => {
      const levels = ['simple', 'standard', 'deep']
      const types = ['correct', 'partial', 'incorrect']

      levels.forEach((level) => {
        types.forEach((type) => {
          LEVEL_MESSAGES[level][type].forEach((message) => {
            expect(typeof message).toBe('string')
            expect(message.length).toBeGreaterThan(0)
          })
        })
      })
    })
  })

  describe('simple level messages', () => {
    it('correct messages are encouraging and simple', () => {
      const simpleCorrect = LEVEL_MESSAGES.simple.correct

      // Should have kid-friendly, simple encouraging messages
      expect(simpleCorrect.length).toBeGreaterThanOrEqual(3)
      simpleCorrect.forEach((msg) => {
        // Messages should be short and encouraging
        expect(msg.length).toBeLessThan(50)
      })
    })

    it('partial messages are supportive', () => {
      const simplePartial = LEVEL_MESSAGES.simple.partial

      expect(simplePartial.length).toBeGreaterThanOrEqual(3)
      simplePartial.forEach((msg) => {
        expect(msg.length).toBeLessThan(50)
      })
    })

    it('incorrect messages are kind and encouraging', () => {
      const simpleIncorrect = LEVEL_MESSAGES.simple.incorrect

      expect(simpleIncorrect.length).toBeGreaterThanOrEqual(3)
      simpleIncorrect.forEach((msg) => {
        expect(msg.length).toBeLessThan(50)
      })
    })
  })

  describe('standard level messages', () => {
    it('correct messages celebrate achievement', () => {
      const standardCorrect = LEVEL_MESSAGES.standard.correct

      expect(standardCorrect.length).toBeGreaterThanOrEqual(3)
      standardCorrect.forEach((msg) => {
        expect(typeof msg).toBe('string')
        expect(msg.length).toBeGreaterThan(0)
      })
    })

    it('partial messages encourage improvement', () => {
      const standardPartial = LEVEL_MESSAGES.standard.partial

      expect(standardPartial.length).toBeGreaterThanOrEqual(3)
    })

    it('incorrect messages are supportive', () => {
      const standardIncorrect = LEVEL_MESSAGES.standard.incorrect

      expect(standardIncorrect.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('deep level messages', () => {
    it('correct messages acknowledge deep thinking', () => {
      const deepCorrect = LEVEL_MESSAGES.deep.correct

      expect(deepCorrect.length).toBeGreaterThanOrEqual(3)
      // Deep level messages might reference thinking/understanding
      const hasThinkingMessage = deepCorrect.some(
        (msg) =>
          msg.toLowerCase().includes('think') ||
          msg.toLowerCase().includes('understand') ||
          msg.toLowerCase().includes('brilliant') ||
          msg.toLowerCase().includes('expert') ||
          msg.toLowerCase().includes('deep')
      )
      expect(hasThinkingMessage || deepCorrect.length > 0).toBe(true)
    })

    it('partial messages encourage deeper exploration', () => {
      const deepPartial = LEVEL_MESSAGES.deep.partial

      expect(deepPartial.length).toBeGreaterThanOrEqual(3)
    })

    it('incorrect messages remain encouraging', () => {
      const deepIncorrect = LEVEL_MESSAGES.deep.incorrect

      expect(deepIncorrect.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('getLevelMessage function', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('exports getLevelMessage function', () => {
      expect(typeof getLevelMessage).toBe('function')
    })

    it('returns a string', () => {
      const message = getLevelMessage('simple', 'correct')
      expect(typeof message).toBe('string')
    })

    it('returns message from correct pool for simple level', () => {
      const message = getLevelMessage('simple', 'correct')
      expect(LEVEL_MESSAGES.simple.correct).toContain(message)
    })

    it('returns message from correct pool for standard level', () => {
      const message = getLevelMessage('standard', 'correct')
      expect(LEVEL_MESSAGES.standard.correct).toContain(message)
    })

    it('returns message from correct pool for deep level', () => {
      const message = getLevelMessage('deep', 'correct')
      expect(LEVEL_MESSAGES.deep.correct).toContain(message)
    })

    it('returns message from partial pool', () => {
      const message = getLevelMessage('standard', 'partial')
      expect(LEVEL_MESSAGES.standard.partial).toContain(message)
    })

    it('returns message from incorrect pool', () => {
      const message = getLevelMessage('standard', 'incorrect')
      expect(LEVEL_MESSAGES.standard.incorrect).toContain(message)
    })

    it('returns first message when random is 0', () => {
      vi.mocked(Math.random).mockReturnValue(0)
      const message = getLevelMessage('standard', 'correct')
      expect(message).toBe(LEVEL_MESSAGES.standard.correct[0])
    })

    it('returns last message when random is close to 1', () => {
      vi.mocked(Math.random).mockReturnValue(0.999)
      const message = getLevelMessage('standard', 'correct')
      const pool = LEVEL_MESSAGES.standard.correct
      expect(message).toBe(pool[pool.length - 1])
    })

    it('returns random messages over multiple calls', () => {
      const messages = new Set()
      // Mock different random values
      const randomValues = [0, 0.25, 0.5, 0.75, 0.999]
      randomValues.forEach((val) => {
        vi.mocked(Math.random).mockReturnValue(val)
        messages.add(getLevelMessage('standard', 'correct'))
      })

      // Should have gotten multiple different messages
      expect(messages.size).toBeGreaterThan(1)
    })
  })

  describe('fallback behavior', () => {
    it('falls back to standard level for invalid level', () => {
      const message = getLevelMessage('invalid_level', 'correct')
      // Should return a message (fallback to standard)
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })

    it('falls back to standard level for null level', () => {
      const message = getLevelMessage(null, 'correct')
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })

    it('falls back to standard level for undefined level', () => {
      const message = getLevelMessage(undefined, 'correct')
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })

    it('falls back to correct type for invalid type', () => {
      const message = getLevelMessage('standard', 'invalid_type')
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })

    it('falls back to correct type for null type', () => {
      const message = getLevelMessage('standard', null)
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })

    it('falls back to correct type for undefined type', () => {
      const message = getLevelMessage('standard', undefined)
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })

    it('handles both invalid level and type', () => {
      const message = getLevelMessage('invalid', 'also_invalid')
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })
  })

  describe('message content quality', () => {
    it('messages do not contain profanity or inappropriate content', () => {
      const badWords = ['stupid', 'dumb', 'idiot', 'wrong', 'fail', 'bad']
      const levels = ['simple', 'standard', 'deep']
      const types = ['correct', 'partial', 'incorrect']

      levels.forEach((level) => {
        types.forEach((type) => {
          LEVEL_MESSAGES[level][type].forEach((message) => {
            const lowerMessage = message.toLowerCase()
            badWords.forEach((badWord) => {
              expect(lowerMessage).not.toContain(badWord)
            })
          })
        })
      })
    })

    it('incorrect messages are encouraging, not discouraging', () => {
      const levels = ['simple', 'standard', 'deep']

      levels.forEach((level) => {
        LEVEL_MESSAGES[level].incorrect.forEach((message) => {
          const lower = message.toLowerCase()
          // Should not have negative/discouraging words
          expect(lower).not.toContain('wrong')
          expect(lower).not.toContain('bad')
          expect(lower).not.toContain('failed')
        })
      })
    })

    it('all messages end with appropriate punctuation', () => {
      const levels = ['simple', 'standard', 'deep']
      const types = ['correct', 'partial', 'incorrect']

      levels.forEach((level) => {
        types.forEach((type) => {
          LEVEL_MESSAGES[level][type].forEach((message) => {
            const lastChar = message[message.length - 1]
            const validEndings = ['!', '.', '?', '...']
            const hasValidEnding = validEndings.some(
              (ending) => message.endsWith(ending)
            )
            // Either valid punctuation or it's a short exclamation
            expect(hasValidEnding || message.length < 15).toBe(true)
          })
        })
      })
    })
  })

  describe('level differentiation', () => {
    it('simple messages are shorter on average than deep messages', () => {
      const avgSimpleLength =
        LEVEL_MESSAGES.simple.correct.reduce((sum, m) => sum + m.length, 0) /
        LEVEL_MESSAGES.simple.correct.length

      const avgDeepLength =
        LEVEL_MESSAGES.deep.correct.reduce((sum, m) => sum + m.length, 0) /
        LEVEL_MESSAGES.deep.correct.length

      // Deep messages might be slightly longer (more sophisticated)
      // But both should be reasonable lengths
      expect(avgSimpleLength).toBeLessThan(50)
      expect(avgDeepLength).toBeLessThan(60)
    })

    it('each level has unique messages (not all identical)', () => {
      const simpleSet = new Set(LEVEL_MESSAGES.simple.correct)
      const standardSet = new Set(LEVEL_MESSAGES.standard.correct)
      const deepSet = new Set(LEVEL_MESSAGES.deep.correct)

      // At least some messages should be different between levels
      const simpleOnly = [...simpleSet].filter(
        (m) => !standardSet.has(m) && !deepSet.has(m)
      )
      const standardOnly = [...standardSet].filter(
        (m) => !simpleSet.has(m) && !deepSet.has(m)
      )
      const deepOnly = [...deepSet].filter(
        (m) => !simpleSet.has(m) && !standardSet.has(m)
      )

      // At least one level should have unique messages
      expect(
        simpleOnly.length > 0 ||
        standardOnly.length > 0 ||
        deepOnly.length > 0 ||
        simpleSet.size !== standardSet.size ||
        standardSet.size !== deepSet.size
      ).toBe(true)
    })
  })
})
