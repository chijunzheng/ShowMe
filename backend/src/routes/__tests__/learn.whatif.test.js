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
  detectLanguage: vi.fn(() => 'en'),
  generateStoryPrompt: vi.fn(),
  extractStoryScene: vi.fn(),
  generateEducationalImage: vi.fn(),
  generateTTS: vi.fn(),
}))

vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import learnRouter from '../learn.js'
import { generateWhatIfScenario, generateEducationalImage, generateTTS } from '../../services/gemini.js'

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

  it('returns 200 and scenario payload with new schema on success', async () => {
    const payload = {
      scenario: 'What if the ocean was twice as salty?',
      scenarioImagePrompt: 'A dramatic ocean scene.',
      predictionCards: [
        { id: 'card-1', title: 'Ocean Life', revealNarration: 'Fish would struggle...', revealImagePrompt: 'Fish struggling...' }
      ],
      scenarioNarration: 'Imagine the ocean was twice as salty...',
      bonusFact: 'Salt changes density.',
      bonusFactNarration: 'Here is a mind-blowing fact...',
      error: null,
    }

    generateWhatIfScenario.mockResolvedValueOnce(payload)

    const res = await testRequest('POST', '/whatif', {
      body: { topicName: 'Test Topic', slides: [{ subtitle: 'Slide 1' }], explanationLevel: 'standard' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      scenario: payload.scenario,
      scenarioImagePrompt: payload.scenarioImagePrompt,
      predictionCards: payload.predictionCards,
      scenarioNarration: payload.scenarioNarration,
      bonusFact: payload.bonusFact,
      bonusFactNarration: payload.bonusFactNarration,
    })
  })
})

describe('Learn Routes - What If Evaluate (Deprecated)', () => {
  it('no longer has an evaluate route handler', async () => {
    const routes = learnRouter.stack
      .filter(layer => layer.route)
      .map(layer => ({ path: layer.route.path, method: Object.keys(layer.route.methods)[0] }))

    const evaluateRoute = routes.find(r => r.path === '/whatif/evaluate' && r.method === 'post')
    expect(evaluateRoute).toBeUndefined()
  })
})

describe('Learn Routes - What If Reveal Assets', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 400 when consequences are missing or empty', async () => {
    const res = await testRequest('POST', '/whatif/reveal-assets', {
      body: {
        consequences: [],
        scenarioNarration: 'Test',
        bonusFactNarration: 'Test',
        topicName: 'Test Topic',
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('Missing or invalid consequences array')
    expect(generateEducationalImage).not.toHaveBeenCalled()
    expect(generateTTS).not.toHaveBeenCalled()
  })

  it('returns 400 when scenarioNarration is missing', async () => {
    const res = await testRequest('POST', '/whatif/reveal-assets', {
      body: {
        consequences: [{ id: 'card-1', revealNarration: 'Test', revealImagePrompt: 'Test' }],
        bonusFactNarration: 'Test',
        topicName: 'Test Topic',
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('Missing or invalid scenarioNarration')
  })

  it('returns 400 when bonusFactNarration is missing', async () => {
    const res = await testRequest('POST', '/whatif/reveal-assets', {
      body: {
        consequences: [{ id: 'card-1', revealNarration: 'Test', revealImagePrompt: 'Test' }],
        scenarioNarration: 'Test',
        topicName: 'Test Topic',
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('Missing or invalid bonusFactNarration')
  })

  it('returns 400 when topicName is missing', async () => {
    const res = await testRequest('POST', '/whatif/reveal-assets', {
      body: {
        consequences: [{ id: 'card-1', revealNarration: 'Test', revealImagePrompt: 'Test' }],
        scenarioNarration: 'Test',
        bonusFactNarration: 'Test',
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('Missing or invalid topicName')
  })

  it('returns 200 with all assets on success', async () => {
    generateTTS.mockResolvedValue('data:audio/mp3;base64,ABC123')
    generateEducationalImage.mockResolvedValue({ imageUrl: 'data:image/png;base64,XYZ789' })

    const res = await testRequest('POST', '/whatif/reveal-assets', {
      body: {
        consequences: [
          { id: 'card-1', revealNarration: 'Test narration', revealImagePrompt: 'Test image prompt' }
        ],
        scenarioNarration: 'Scenario narration',
        bonusFactNarration: 'Bonus fact narration',
        topicName: 'Test Topic',
        explanationLevel: 'standard',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('scenarioAudioUrl', 'data:audio/mp3;base64,ABC123')
    expect(res.body).toHaveProperty('bonusFactAudioUrl', 'data:audio/mp3;base64,ABC123')
    expect(res.body.revealAssets).toHaveLength(1)
    expect(res.body.revealAssets[0]).toEqual({
      id: 'card-1',
      imageUrl: 'data:image/png;base64,XYZ789',
      audioUrl: 'data:audio/mp3;base64,ABC123',
    })
  })

  it('returns 200 with nulls for failed asset generation (graceful degradation)', async () => {
    generateTTS.mockResolvedValue('data:audio/mp3;base64,ABC123')
    generateEducationalImage.mockResolvedValue({ error: 'IMAGE_GENERATION_FAILED' })

    const res = await testRequest('POST', '/whatif/reveal-assets', {
      body: {
        consequences: [
          { id: 'card-1', revealNarration: 'Test narration', revealImagePrompt: 'Test image prompt' }
        ],
        scenarioNarration: 'Scenario narration',
        bonusFactNarration: 'Bonus fact narration',
        topicName: 'Test Topic',
        explanationLevel: 'standard',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body.revealAssets[0]).toEqual({
      id: 'card-1',
      imageUrl: null,
      audioUrl: 'data:audio/mp3;base64,ABC123',
    })
  })
})

