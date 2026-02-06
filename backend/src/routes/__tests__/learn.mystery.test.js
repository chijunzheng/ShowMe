/**
 * Learn Routes - Mystery Lab Tests
 *
 * Validates request validation and error/status mapping for:
 * - POST /api/learn/mystery
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Disable rate limiting for unit tests (middleware pass-through)
vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => (req, res, next) => next()),
}))

// Mock mystery generator service functions
vi.mock('../../services/mysteryGenerator.js', () => ({
  generateMystery: vi.fn(),
  evaluateMysteryTheory: vi.fn(),
}))

vi.mock('../../services/gemini.js', () => ({
  generateWhatIfScenario: vi.fn(),
  detectLanguage: vi.fn(() => 'en'),
  generateStoryPrompt: vi.fn(),
  extractStoryScene: vi.fn(),
  generateEducationalImage: vi.fn(),
}))

vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import learnRouter from '../learn.js'
import { generateMystery, evaluateMysteryTheory } from '../../services/mysteryGenerator.js'
import { generateEducationalImage } from '../../services/gemini.js'

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    set(header, value) {
      this.headers[header] = value
      return this
    },
    json(payload) {
      this.body = payload
      this.__done?.resolve()
      return this
    },
  }

  res.__done = {}
  res.__done.promise = new Promise((resolve, reject) => {
    res.__done.resolve = resolve
    res.__done.reject = reject
  })

  return res
}

async function testRequest(method, path, { body = null } = {}) {
  const req = {
    method,
    url: path,
    body,
    ip: '127.0.0.1',
  }

  const res = createMockRes()

  learnRouter.handle(req, res, (error) => {
    if (error) {
      res.__done.reject(error)
    } else {
      res.__done.resolve()
    }
  })

  await res.__done.promise
  return res
}

describe('Learn Routes - Mystery', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 400 when topicName is missing', async () => {
    const res = await testRequest('POST', '/mystery', {
      body: {
        slides: [{ subtitle: 'Slide 1' }],
        explanationLevel: 'standard',
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('Missing or invalid topicName')
    expect(generateMystery).not.toHaveBeenCalled()
  })

  it('returns 400 when slides are missing or empty', async () => {
    const res = await testRequest('POST', '/mystery', {
      body: {
        topicName: 'Test Topic',
        slides: [],
        explanationLevel: 'standard',
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('Slides must contain subtitle or script content')
    expect(generateMystery).not.toHaveBeenCalled()
  })

  it('returns 503 when service returns API_NOT_AVAILABLE', async () => {
    generateMystery.mockResolvedValueOnce({ error: 'API_NOT_AVAILABLE' })

    const res = await testRequest('POST', '/mystery', {
      body: {
        topicName: 'Test Topic',
        slides: [{ subtitle: 'Slide 1' }],
        explanationLevel: 'standard',
      },
    })

    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({ error: 'API_NOT_AVAILABLE' })
  })

  it('returns 429 when service returns RATE_LIMITED', async () => {
    generateMystery.mockResolvedValueOnce({ error: 'RATE_LIMITED' })

    const res = await testRequest('POST', '/mystery', {
      body: {
        topicName: 'Test Topic',
        slides: [{ subtitle: 'Slide 1' }],
        explanationLevel: 'standard',
      },
    })

    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: 'RATE_LIMITED' })
  })

  it('returns 200 and mystery payload on success', async () => {
    const payload = {
      mysteryTitle: 'The Case',
      mysterySetup: 'A thing happened.',
      imagePrompt: 'An illustration prompt.',
      clues: [{ text: 'Clue', slideRef: 1 }],
      expectedConcepts: ['concept1'],
      solutionExplanation: 'Solved.',
    }
    generateMystery.mockResolvedValueOnce(payload)

    const res = await testRequest('POST', '/mystery', {
      body: {
        topicName: 'Test Topic',
        slides: [{ subtitle: 'Slide 1' }],
        explanationLevel: 'standard',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(payload)
  })
})

describe('Learn Routes - Mystery Image', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 400 when imagePrompt is missing', async () => {
    const res = await testRequest('POST', '/mystery/image', {
      body: {
        topicName: 'Test Topic',
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('Missing or invalid imagePrompt')
    expect(generateEducationalImage).not.toHaveBeenCalled()
  })

  it('returns 200 with imageUrl when image generation succeeds', async () => {
    generateEducationalImage.mockResolvedValueOnce({ imageUrl: 'data:image/png;base64,abc' })

    const res = await testRequest('POST', '/mystery/image', {
      body: {
        imagePrompt: 'A detective classroom scene',
        topicName: 'Test Topic',
        explanationLevel: 'standard',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      success: true,
      imageUrl: 'data:image/png;base64,abc',
    })
  })
})

describe('Learn Routes - Mystery Evaluate (Crime Scene Ops)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('evaluates scene-scan with required hotspots', async () => {
    const res = await testRequest('POST', '/mystery/evaluate', {
      body: {
        solveMethod: 'scene-scan',
        userAnswer: { foundHotspotIds: ['h1', 'h2', 'h3'] },
        mysteryData: {
          crimeScene: {
            requiredHotspotCount: 3,
            hotspots: [
              { id: 'h1' },
              { id: 'h2' },
              { id: 'h3' },
              { id: 'h4', bonus: true },
            ],
          },
          verdict: { expectedConcepts: ['heat transfer'] },
        },
        explanationLevel: 'simple',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body?.isCorrect).toBe(true)
    expect(res.body?.xpEarned).toBeGreaterThan(0)
  })

  it('requires contradiction handling in deep witness-room', async () => {
    const res = await testRequest('POST', '/mystery/evaluate', {
      body: {
        solveMethod: 'witness-room',
        userAnswer: { askedQuestionIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'], resolvedContradictions: 0 },
        mysteryData: {
          witnesses: [
            { id: 'w1', questionCards: ['q1', 'q2', 'q3'] },
            { id: 'w2', questionCards: ['q4', 'q5'] },
            { id: 'w3', questionCards: ['q6', 'q7'] },
          ],
          verdict: { expectedConcepts: ['convection'] },
        },
        explanationLevel: 'deep',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body?.isCorrect).toBe(false)
    expect(String(res.body?.feedback || '')).toMatch(/contradiction/i)
  })

  it('evaluates timeline-rebuild order', async () => {
    const res = await testRequest('POST', '/mystery/evaluate', {
      body: {
        solveMethod: 'timeline-rebuild',
        userAnswer: {
          orderedEventIds: ['t1', 't2', 't3', 't4'],
          causalLinks: [{ from: 't1', to: 't2' }, { from: 't2', to: 't3' }],
        },
        mysteryData: {
          timeline: {
            events: [
              { id: 't1', order: 1, text: 'a' },
              { id: 't2', order: 2, text: 'b' },
              { id: 't3', order: 3, text: 'c' },
              { id: 't4', order: 4, text: 'd', isRedHerring: true },
            ],
            causalLinks: [{ from: 't1', to: 't2' }, { from: 't2', to: 't3' }],
          },
          verdict: { expectedConcepts: ['concept'] },
        },
        explanationLevel: 'standard',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body?.isCorrect).toBe(true)
  })

  it('requires rationale on deep warrant-decision', async () => {
    const res = await testRequest('POST', '/mystery/evaluate', {
      body: {
        solveMethod: 'warrant-decision',
        userAnswer: {
          selectedIndex: 0,
          confidence: 88,
        },
        mysteryData: {
          verdict: {
            options: ['A', 'B', 'C', 'D'],
            correctIndex: 0,
            expectedConcepts: ['concept1', 'concept2'],
          },
        },
        explanationLevel: 'deep',
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.field).toBe('userAnswer.rationale')
  })

  it('uses rationale scoring for deep warrant-decision', async () => {
    evaluateMysteryTheory.mockResolvedValueOnce({
      result: 'solved',
      matchedConcepts: ['concept1'],
      xpEarned: 50,
      hint: null,
    })

    const res = await testRequest('POST', '/mystery/evaluate', {
      body: {
        solveMethod: 'warrant-decision',
        userAnswer: {
          selectedIndex: 1,
          confidence: 82,
          rationale: 'I linked concept one with the observed outcome.',
        },
        mysteryData: {
          verdict: {
            options: ['A', 'B', 'C', 'D'],
            correctIndex: 1,
            expectedConcepts: ['concept1', 'concept2'],
          },
        },
        explanationLevel: 'deep',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(evaluateMysteryTheory).toHaveBeenCalledTimes(1)
    expect(res.body?.isCorrect).toBe(true)
    expect(res.body?.xpEarned).toBeGreaterThan(0)
  })
})
