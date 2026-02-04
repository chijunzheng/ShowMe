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

vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import learnRouter from '../learn.js'
import { generateMystery } from '../../services/mysteryGenerator.js'

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

