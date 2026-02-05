/**
 * Learn Routes - Story Studio Tests
 *
 * Validates request validation and error/status mapping for:
 * - POST /api/learn/story
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

// Mock Gemini service functions used by learn routes
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
import { generateStoryPrompt } from '../../services/gemini.js'

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

describe('Learn Routes - Story', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 400 when topicName is missing', async () => {
    const res = await testRequest('POST', '/story', {
      body: { slides: [{ subtitle: 'Slide 1' }] },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('Missing or invalid topicName')
    expect(generateStoryPrompt).not.toHaveBeenCalled()
  })

  it('returns 400 when slides are missing or empty', async () => {
    const res = await testRequest('POST', '/story', {
      body: { topicName: 'Test Topic', slides: [] },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('Missing or invalid slides array')
    expect(generateStoryPrompt).not.toHaveBeenCalled()
  })

  it('returns 503 when service returns API_NOT_AVAILABLE', async () => {
    generateStoryPrompt.mockResolvedValueOnce({
      storyPrompt: '',
      conceptChecklist: [],
      starterSuggestion: '',
      imageStyle: '',
      error: 'API_NOT_AVAILABLE',
    })

    const res = await testRequest('POST', '/story', {
      body: { topicName: 'Test Topic', slides: [{ subtitle: 'Slide 1' }] },
    })

    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({ error: 'API_NOT_AVAILABLE' })
  })

  it('returns 429 when service returns RATE_LIMITED', async () => {
    generateStoryPrompt.mockResolvedValueOnce({
      storyPrompt: '',
      conceptChecklist: [],
      starterSuggestion: '',
      imageStyle: '',
      error: 'RATE_LIMITED',
    })

    const res = await testRequest('POST', '/story', {
      body: { topicName: 'Test Topic', slides: [{ subtitle: 'Slide 1' }] },
    })

    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: 'RATE_LIMITED' })
  })

  it('returns fallback story payload when service returns PARSE_ERROR', async () => {
    generateStoryPrompt.mockResolvedValueOnce({
      storyPrompt: '',
      conceptChecklist: [],
      starterSuggestion: '',
      imageStyle: '',
      error: 'PARSE_ERROR',
    })

    const res = await testRequest('POST', '/story', {
      body: { topicName: 'Test Topic', slides: [{ subtitle: 'Slide 1' }] },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('storyPrompt')
    expect(res.body).toHaveProperty('conceptChecklist')
    expect(res.body).toHaveProperty('starterSuggestion')
    expect(res.body).toHaveProperty('imageStyle')
  })

  it('returns 200 and story payload on success', async () => {
    generateStoryPrompt.mockResolvedValueOnce({
      storyPrompt: 'Write a story about deep sea life.',
      conceptChecklist: ['pressure', 'bioluminescence', 'giant squid'],
      starterSuggestion: 'Far below the waves...',
      imageStyle: "children's book illustration, colorful, friendly",
      error: null,
    })

    const res = await testRequest('POST', '/story', {
      body: { topicName: 'Test Topic', slides: [{ subtitle: 'Slide 1' }] },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      storyPrompt: 'Write a story about deep sea life.',
      conceptChecklist: ['pressure', 'bioluminescence', 'giant squid'],
      starterSuggestion: 'Far below the waves...',
      imageStyle: "children's book illustration, colorful, friendly",
    })
  })
})

