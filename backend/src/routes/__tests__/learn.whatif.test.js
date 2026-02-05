/**
 * Learn Routes - Wonder Lab (What If) Tests
 *
 * Validates request validation and error/status mapping for:
 * - POST /api/learn/whatif
 * - POST /api/learn/whatif/evaluate
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Disable rate limiting for unit tests (middleware pass-through)
vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => (req, res, next) => next()),
}))

vi.mock('../../services/mysteryGenerator.js', () => ({
  generateMystery: vi.fn(),
  evaluateMysteryTheory: vi.fn(),
}))

vi.mock('../../services/gemini.js', () => ({
  generateWhatIfScenario: vi.fn(),
  evaluateWhatIfPrediction: vi.fn(),
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
import { generateWhatIfScenario, evaluateWhatIfPrediction } from '../../services/gemini.js'

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

describe('Learn Routes - What If', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 400 when slides are missing or empty', async () => {
    const res = await testRequest('POST', '/whatif', {
      body: { topicName: 'Test Topic', slides: [] },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('Missing or invalid slides array')
    expect(generateWhatIfScenario).not.toHaveBeenCalled()
  })

  it('returns 400 when topicName is missing', async () => {
    const res = await testRequest('POST', '/whatif', {
      body: { slides: [{ subtitle: 'Slide 1' }] },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('Missing or invalid topicName')
    expect(generateWhatIfScenario).not.toHaveBeenCalled()
  })

  it('returns 503 when service returns API_NOT_AVAILABLE', async () => {
    generateWhatIfScenario.mockResolvedValueOnce({ error: 'API_NOT_AVAILABLE' })

    const res = await testRequest('POST', '/whatif', {
      body: { topicName: 'Test Topic', slides: [{ subtitle: 'Slide 1' }], explanationLevel: 'standard' },
    })

    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({ error: 'API_NOT_AVAILABLE' })
  })

  it('returns 429 when service returns RATE_LIMITED', async () => {
    generateWhatIfScenario.mockResolvedValueOnce({ error: 'RATE_LIMITED' })

    const res = await testRequest('POST', '/whatif', {
      body: { topicName: 'Test Topic', slides: [{ subtitle: 'Slide 1' }], explanationLevel: 'standard' },
    })

    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: 'RATE_LIMITED' })
  })

  it('returns 502 when service returns PARSE_ERROR', async () => {
    generateWhatIfScenario.mockResolvedValueOnce({ error: 'PARSE_ERROR' })

    const res = await testRequest('POST', '/whatif', {
      body: { topicName: 'Test Topic', slides: [{ subtitle: 'Slide 1' }], explanationLevel: 'standard' },
    })

    expect(res.statusCode).toBe(502)
    expect(res.body).toEqual({ error: 'PARSE_ERROR' })
  })

  it('returns 200 and scenario payload on success', async () => {
    const payload = {
      scenario: 'What if the ocean was twice as salty?',
      imagePrompt: 'A dramatic ocean scene.',
      thinkAboutHints: ['Hint 1'],
      expectedConsequences: [{ concept: 'density', consequence: 'Things float differently.' }],
      bonusFact: 'Salt changes density.',
      error: null,
    }

    generateWhatIfScenario.mockResolvedValueOnce(payload)

    const res = await testRequest('POST', '/whatif', {
      body: { topicName: 'Test Topic', slides: [{ subtitle: 'Slide 1' }], explanationLevel: 'standard' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      scenario: payload.scenario,
      imagePrompt: payload.imagePrompt,
      thinkAboutHints: payload.thinkAboutHints,
      expectedConsequences: payload.expectedConsequences,
      bonusFact: payload.bonusFact,
    })
  })
})

describe('Learn Routes - What If Evaluate', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 400 when expectedConsequences are missing or empty', async () => {
    const res = await testRequest('POST', '/whatif/evaluate', {
      body: { userPrediction: 'My prediction', expectedConsequences: [] },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('Missing or invalid expectedConsequences array')
    expect(evaluateWhatIfPrediction).not.toHaveBeenCalled()
  })

  it('returns 503 when service returns API_NOT_AVAILABLE', async () => {
    evaluateWhatIfPrediction.mockResolvedValueOnce({ error: 'API_NOT_AVAILABLE' })

    const res = await testRequest('POST', '/whatif/evaluate', {
      body: { userPrediction: 'My prediction', expectedConsequences: [{ concept: 'c', consequence: 'd' }] },
    })

    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({ error: 'API_NOT_AVAILABLE' })
  })

  it('returns 200 and evaluation payload on success', async () => {
    const payload = {
      matchedPredictions: [{ concept: 'c', userPhrase: 'x', feedback: 'Nice' }],
      missedConsequences: [{ concept: 'y', reveal: 'More info' }],
      xpEarned: 20,
      error: null,
    }

    evaluateWhatIfPrediction.mockResolvedValueOnce(payload)

    const res = await testRequest('POST', '/whatif/evaluate', {
      body: { userPrediction: 'My prediction', expectedConsequences: [{ concept: 'c', consequence: 'd' }] },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      matchedPredictions: payload.matchedPredictions,
      missedConsequences: payload.missedConsequences,
      xpEarned: payload.xpEarned,
    })
  })
})

