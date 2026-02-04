/**
 * Mystery Generator Service Tests
 *
 * Validates:
 * - SDK integration uses ai.models.generateContent (mocked)
 * - API key gating returns API_NOT_AVAILABLE
 * - JSON parsing / validation error mapping
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock GenAI SDK to avoid real network calls and to assert correct usage.
vi.mock('@google/genai', () => {
  const generateContent = vi.fn()

  class GoogleGenAI {
    constructor(options = {}) {
      this.options = options
      this.models = {
        generateContent,
      }
    }
  }

  return {
    GoogleGenAI,
    __mock: {
      generateContent,
    },
  }
})

vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { __mock as genAiMock } from '@google/genai'
import { generateMystery, evaluateMysteryTheory } from '../mysteryGenerator.js'

const originalEnv = { ...process.env }

describe('mysteryGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('generateMystery', () => {
    it('returns API_NOT_AVAILABLE when GEMINI_API_KEY is missing', async () => {
      delete process.env.GEMINI_API_KEY

      const result = await generateMystery({
        slides: [{ subtitle: 'Slide 1: test' }],
        topicName: 'Test Topic',
        explanationLevel: 'standard',
      })

      expect(result).toEqual({ error: 'API_NOT_AVAILABLE' })
      expect(genAiMock.generateContent).not.toHaveBeenCalled()
    })

    it('calls ai.models.generateContent and parses JSON response', async () => {
      genAiMock.generateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          mysteryTitle: 'The Missing Magnet',
          mysterySetup: 'Something is wrong in the lab.',
          imagePrompt: 'A colorful educational illustration of a lab scene.',
          clues: [{ text: 'A clue', slideRef: 1 }],
          expectedConcepts: ['magnetism', 'forces'],
          solutionExplanation: 'The magnet fell because of gravity.',
        }),
      })

      const result = await generateMystery({
        slides: [{ subtitle: 'Magnets attract iron.' }],
        topicName: 'Magnets',
        explanationLevel: 'standard',
      })

      expect(genAiMock.generateContent).toHaveBeenCalledTimes(1)
      const callArg = genAiMock.generateContent.mock.calls[0]?.[0]
      expect(callArg).toMatchObject({
        model: 'gemini-3-flash-preview',
      })
      expect(String(callArg?.contents || '')).toContain('Topic: Magnets')

      expect(result.error).toBeUndefined()
      expect(result.mysteryTitle).toBe('The Missing Magnet')
      expect(Array.isArray(result.clues)).toBe(true)
      expect(Array.isArray(result.expectedConcepts)).toBe(true)
    })

    it('returns PARSE_ERROR when response is not valid JSON', async () => {
      genAiMock.generateContent.mockResolvedValueOnce({
        text: 'not json',
      })

      const result = await generateMystery({
        slides: [{ subtitle: 'Slide content' }],
        topicName: 'Test Topic',
        explanationLevel: 'standard',
      })

      expect(result).toEqual({ error: 'PARSE_ERROR' })
    })

    it('returns INVALID_RESPONSE when required fields are missing', async () => {
      genAiMock.generateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          // missing mysteryTitle, expectedConcepts, etc.
          mysterySetup: 'Setup only',
        }),
      })

      const result = await generateMystery({
        slides: [{ subtitle: 'Slide content' }],
        topicName: 'Test Topic',
        explanationLevel: 'standard',
      })

      expect(result).toEqual({ error: 'INVALID_RESPONSE' })
    })
  })

  describe('evaluateMysteryTheory', () => {
    it('returns API_NOT_AVAILABLE when GEMINI_API_KEY is missing', async () => {
      delete process.env.GEMINI_API_KEY

      const result = await evaluateMysteryTheory({
        userTheory: 'My theory',
        expectedConcepts: ['concept1', 'concept2'],
      })

      expect(result).toEqual({ error: 'API_NOT_AVAILABLE' })
    })

    it('returns PARSE_ERROR when evaluation response is not valid JSON', async () => {
      genAiMock.generateContent.mockResolvedValueOnce({
        text: 'nope',
      })

      const result = await evaluateMysteryTheory({
        userTheory: 'My theory',
        expectedConcepts: ['concept1', 'concept2'],
      })

      expect(result).toEqual({ error: 'PARSE_ERROR' })
    })

    it('returns solved when match rate is >= 80%', async () => {
      genAiMock.generateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          matchedConcepts: ['concept1', 'concept2', 'concept3', 'concept4'],
        }),
      })

      const result = await evaluateMysteryTheory({
        userTheory: 'I mentioned everything',
        expectedConcepts: ['concept1', 'concept2', 'concept3', 'concept4', 'concept5'],
      })

      expect(result.error).toBeUndefined()
      expect(result.result).toBe('solved')
      expect(result.xpEarned).toBe(50)
      expect(result.matchedConcepts.length).toBe(4)
    })
  })
})

