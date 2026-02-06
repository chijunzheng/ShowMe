/**
 * Learn Routes - Story Studio Tests
 *
 * Validates request validation and error/status mapping for:
 * - POST /api/learn/story
 * - POST /api/learn/story/chapter
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
  detectLanguage: vi.fn(() => 'en'),
  generateStoryPrompt: vi.fn(),
  generateStoryChapter: vi.fn(),
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
import { generateStoryPrompt, generateStoryChapter, generateEducationalImage, generateTTS } from '../../services/gemini.js'

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

  describe('POST /api/learn/story', () => {
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
        missionHook: '',
        sceneImagePrompt: '',
        conceptCards: [],
        chapters: {},
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
        missionHook: '',
        sceneImagePrompt: '',
        conceptCards: [],
        chapters: {},
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
        missionHook: '',
        sceneImagePrompt: '',
        conceptCards: [],
        chapters: {},
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
      expect(res.body).toHaveProperty('missionHook')
      expect(res.body).toHaveProperty('conceptCards')
      expect(res.body).toHaveProperty('chapters')
      expect(res.body).toHaveProperty('sceneImage')
      expect(res.body).toHaveProperty('missionHookAudio')
    })

    it('returns 200 and new fields on success', async () => {
      generateStoryPrompt.mockResolvedValueOnce({
        storyPrompt: 'Write a story about deep sea life.',
        conceptChecklist: ['pressure', 'bioluminescence', 'giant squid'],
        starterSuggestion: 'Far below the waves...',
        imageStyle: "children's book illustration, colorful, friendly",
        missionHook: 'Dive into the mysterious depths where bizarre creatures glow in the dark!',
        sceneImagePrompt: 'A colorful underwater scene with glowing creatures',
        conceptCards: [
          { concept: 'pressure', icon: '🌊', description: 'The force of deep water' },
          { concept: 'bioluminescence', icon: '✨', description: 'Living light in the dark' }
        ],
        chapters: {
          '1': {
            prompt: 'Where does our story begin?',
            icon: '📖',
            choices: [
              { id: '1a', emoji: '🚀', text: 'Deep in the ocean trench...', conceptHints: ['pressure'] },
              { id: '1b', emoji: '🌑', text: 'In the darkest depths...', conceptHints: ['bioluminescence'] }
            ]
          }
        },
        error: null,
      })

      generateEducationalImage.mockResolvedValueOnce({
        imageUrl: 'data:image/png;base64,scene123',
        error: null
      })

      generateTTS.mockResolvedValueOnce({
        audioUrl: 'data:audio/mp3;base64,audio123',
        error: null
      })

      const res = await testRequest('POST', '/story', {
        body: { topicName: 'Deep Sea Life', slides: [{ subtitle: 'Deep sea organisms' }] },
      })

      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual({
        storyPrompt: 'Write a story about deep sea life.',
        conceptChecklist: ['pressure', 'bioluminescence', 'giant squid'],
        starterSuggestion: 'Far below the waves...',
        imageStyle: "children's book illustration, colorful, friendly",
        missionHook: 'Dive into the mysterious depths where bizarre creatures glow in the dark!',
        sceneImagePrompt: 'A colorful underwater scene with glowing creatures',
        conceptCards: [
          { concept: 'pressure', icon: '🌊', description: 'The force of deep water' },
          { concept: 'bioluminescence', icon: '✨', description: 'Living light in the dark' }
        ],
        chapters: {
          '1': {
            prompt: 'Where does our story begin?',
            icon: '📖',
            choices: [
              { id: '1a', emoji: '🚀', text: 'Deep in the ocean trench...', conceptHints: ['pressure'] },
              { id: '1b', emoji: '🌑', text: 'In the darkest depths...', conceptHints: ['bioluminescence'] }
            ]
          }
        },
        sceneImage: 'data:image/png;base64,scene123',
        missionHookAudio: 'data:audio/mp3;base64,audio123'
      })
    })

    it('handles missing new fields gracefully (backward compatibility)', async () => {
      // Simulate old version of gemini service not returning new fields
      generateStoryPrompt.mockResolvedValueOnce({
        storyPrompt: 'Write a story about robots.',
        conceptChecklist: ['circuits', 'AI'],
        starterSuggestion: 'In a world of machines...',
        imageStyle: "children's book illustration",
        // Missing: missionHook, sceneImagePrompt, conceptCards, chapters
        error: null,
      })

      const res = await testRequest('POST', '/story', {
        body: { topicName: 'Robots', slides: [{ subtitle: 'Robot basics' }] },
      })

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty('storyPrompt', 'Write a story about robots.')
      expect(res.body).toHaveProperty('missionHook')
      expect(res.body).toHaveProperty('sceneImagePrompt')
      expect(res.body).toHaveProperty('conceptCards')
      expect(res.body).toHaveProperty('chapters')
      expect(res.body).toHaveProperty('sceneImage', null) // No image because no sceneImagePrompt
      expect(res.body).toHaveProperty('missionHookAudio', null) // No audio because no missionHook
    })

    it('continues when image generation fails (non-fatal)', async () => {
      generateStoryPrompt.mockResolvedValueOnce({
        storyPrompt: 'Write a story about space.',
        conceptChecklist: ['planets', 'stars'],
        starterSuggestion: 'Among the stars...',
        imageStyle: "children's book illustration",
        missionHook: 'Blast off to the cosmos!',
        sceneImagePrompt: 'A rocket launching into space',
        conceptCards: [],
        chapters: {},
        error: null,
      })

      // Image generation fails
      generateEducationalImage.mockResolvedValueOnce({
        imageUrl: null,
        error: 'GENERATION_FAILED'
      })

      generateTTS.mockResolvedValueOnce({
        audioUrl: 'data:audio/mp3;base64,audio456',
        error: null
      })

      const res = await testRequest('POST', '/story', {
        body: { topicName: 'Space', slides: [{ subtitle: 'The solar system' }] },
      })

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty('sceneImage', null)
      expect(res.body).toHaveProperty('missionHookAudio', 'data:audio/mp3;base64,audio456')
    })

    it('continues when TTS generation fails (non-fatal)', async () => {
      generateStoryPrompt.mockResolvedValueOnce({
        storyPrompt: 'Write a story about dinosaurs.',
        conceptChecklist: ['extinction', 'fossils'],
        starterSuggestion: 'Long ago...',
        imageStyle: "children's book illustration",
        missionHook: 'Travel back to the age of dinosaurs!',
        sceneImagePrompt: 'A T-Rex in a prehistoric jungle',
        conceptCards: [],
        chapters: {},
        error: null,
      })

      generateEducationalImage.mockResolvedValueOnce({
        imageUrl: 'data:image/png;base64,dino123',
        error: null
      })

      // TTS generation fails
      generateTTS.mockRejectedValueOnce(new Error('TTS service unavailable'))

      const res = await testRequest('POST', '/story', {
        body: { topicName: 'Dinosaurs', slides: [{ subtitle: 'Prehistoric life' }] },
      })

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty('sceneImage', 'data:image/png;base64,dino123')
      expect(res.body).toHaveProperty('missionHookAudio', null)
    })

    it('continues when both image and TTS generation fail (non-fatal)', async () => {
      generateStoryPrompt.mockResolvedValueOnce({
        storyPrompt: 'Write a story about volcanoes.',
        conceptChecklist: ['lava', 'magma'],
        starterSuggestion: 'Deep underground...',
        imageStyle: "children's book illustration",
        missionHook: 'Explore the fiery depths!',
        sceneImagePrompt: 'A volcano erupting',
        conceptCards: [],
        chapters: {},
        error: null,
      })

      generateEducationalImage.mockRejectedValueOnce(new Error('Image service down'))
      generateTTS.mockRejectedValueOnce(new Error('TTS service down'))

      const res = await testRequest('POST', '/story', {
        body: { topicName: 'Volcanoes', slides: [{ subtitle: 'Volcanic activity' }] },
      })

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty('sceneImage', null)
      expect(res.body).toHaveProperty('missionHookAudio', null)
      // Main story data should still be present
      expect(res.body).toHaveProperty('storyPrompt', 'Write a story about volcanoes.')
      expect(res.body).toHaveProperty('missionHook', 'Explore the fiery depths!')
    })
  })

  describe('POST /api/learn/story/chapter', () => {
    it('returns 400 when topicName is missing', async () => {
      const res = await testRequest('POST', '/story/chapter', {
        body: {
          previousChapters: [{ chapter: 1, selectedText: 'Something happened' }],
          currentChapter: 2
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.body?.error).toBe('Missing or invalid topicName')
      expect(generateStoryChapter).not.toHaveBeenCalled()
    })

    it('returns 400 when previousChapters is missing', async () => {
      const res = await testRequest('POST', '/story/chapter', {
        body: {
          topicName: 'Test Topic',
          currentChapter: 2
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.body?.error).toBe('Missing or invalid previousChapters array (must be non-empty)')
      expect(generateStoryChapter).not.toHaveBeenCalled()
    })

    it('returns 400 when previousChapters is empty', async () => {
      const res = await testRequest('POST', '/story/chapter', {
        body: {
          topicName: 'Test Topic',
          previousChapters: [],
          currentChapter: 2
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.body?.error).toBe('Missing or invalid previousChapters array (must be non-empty)')
      expect(generateStoryChapter).not.toHaveBeenCalled()
    })

    it('returns 400 when currentChapter is less than 2', async () => {
      const res = await testRequest('POST', '/story/chapter', {
        body: {
          topicName: 'Test Topic',
          previousChapters: [{ chapter: 1, selectedText: 'Something happened' }],
          currentChapter: 1
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.body?.error).toBe('Invalid currentChapter (must be 2 or 3)')
      expect(generateStoryChapter).not.toHaveBeenCalled()
    })

    it('returns 400 when currentChapter is greater than 3', async () => {
      const res = await testRequest('POST', '/story/chapter', {
        body: {
          topicName: 'Test Topic',
          previousChapters: [{ chapter: 1, selectedText: 'Something happened' }],
          currentChapter: 4
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.body?.error).toBe('Invalid currentChapter (must be 2 or 3)')
      expect(generateStoryChapter).not.toHaveBeenCalled()
    })

    it('returns chapter 2 with illustration and next chapter (happy path)', async () => {
      generateStoryChapter.mockResolvedValueOnce({
        illustration: {
          imagePrompt: 'A robot entering a colorful maze',
          sceneDescription: 'Sparky explores the thinking maze'
        },
        nextChapter: {
          prompt: 'What happens next?',
          icon: '⚡',
          choices: [
            { id: '2a', emoji: '🔢', text: 'Sparky hit a wall of numbers...', conceptHints: ['weights'] },
            { id: '2b', emoji: '🚪', text: 'A gatekeeper blocked the path...', conceptHints: ['activation'] }
          ]
        },
        conceptsFound: ['input layers'],
        error: null
      })

      generateEducationalImage.mockResolvedValueOnce({
        imageUrl: 'data:image/png;base64,chapter2img',
        error: null
      })

      const res = await testRequest('POST', '/story/chapter', {
        body: {
          topicName: 'Neural Networks',
          conceptChecklist: ['input layers', 'weights', 'activation'],
          previousChapters: [
            { chapter: 1, selectedText: 'Sparky zoomed into the maze...' }
          ],
          currentChapter: 2,
          imageStyle: "children's book illustration",
          language: 'en'
        },
      })

      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual({
        illustration: {
          imageUrl: 'data:image/png;base64,chapter2img',
          sceneDescription: 'Sparky explores the thinking maze'
        },
        nextChapter: {
          prompt: 'What happens next?',
          icon: '⚡',
          choices: [
            { id: '2a', emoji: '🔢', text: 'Sparky hit a wall of numbers...', conceptHints: ['weights'] },
            { id: '2b', emoji: '🚪', text: 'A gatekeeper blocked the path...', conceptHints: ['activation'] }
          ]
        },
        conceptsFound: ['input layers']
      })
    })

    it('returns chapter 3 with no nextChapter (final chapter)', async () => {
      generateStoryChapter.mockResolvedValueOnce({
        illustration: {
          imagePrompt: 'Sparky reaching the maze exit',
          sceneDescription: 'The final gate opens'
        },
        nextChapter: null,
        conceptsFound: ['input layers', 'weights'],
        error: null
      })

      generateEducationalImage.mockResolvedValueOnce({
        imageUrl: 'data:image/png;base64,chapter3img',
        error: null
      })

      const res = await testRequest('POST', '/story/chapter', {
        body: {
          topicName: 'Neural Networks',
          conceptChecklist: ['input layers', 'weights', 'activation'],
          previousChapters: [
            { chapter: 1, selectedText: 'Sparky zoomed into the maze...' },
            { chapter: 2, selectedText: 'Sparky hit a wall of numbers...' }
          ],
          currentChapter: 3,
          imageStyle: "children's book illustration"
        },
      })

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty('nextChapter', null)
      expect(res.body).toHaveProperty('conceptsFound')
      expect(res.body.conceptsFound).toEqual(['input layers', 'weights'])
    })

    it('returns conceptsFound array', async () => {
      generateStoryChapter.mockResolvedValueOnce({
        illustration: {
          imagePrompt: 'Test scene',
          sceneDescription: 'Test description'
        },
        nextChapter: {
          prompt: 'Next?',
          icon: '📖',
          choices: []
        },
        conceptsFound: ['concept A', 'concept B', 'concept C'],
        error: null
      })

      generateEducationalImage.mockResolvedValueOnce({
        imageUrl: 'data:image/png;base64,test',
        error: null
      })

      const res = await testRequest('POST', '/story/chapter', {
        body: {
          topicName: 'Test',
          previousChapters: [{ chapter: 1, selectedText: 'Test' }],
          currentChapter: 2
        },
      })

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty('conceptsFound')
      expect(res.body.conceptsFound).toEqual(['concept A', 'concept B', 'concept C'])
    })

    it('returns null imageUrl when image generation fails (non-fatal)', async () => {
      generateStoryChapter.mockResolvedValueOnce({
        illustration: {
          imagePrompt: 'A mysterious scene',
          sceneDescription: 'Something happens'
        },
        nextChapter: null,
        conceptsFound: [],
        error: null
      })

      // Image generation fails
      generateEducationalImage.mockRejectedValueOnce(new Error('Image service down'))

      const res = await testRequest('POST', '/story/chapter', {
        body: {
          topicName: 'Test',
          previousChapters: [{ chapter: 1, selectedText: 'Test' }],
          currentChapter: 2
        },
      })

      expect(res.statusCode).toBe(200)
      expect(res.body.illustration).toEqual({
        imageUrl: null,
        sceneDescription: 'Something happens'
      })
    })

    it('returns 503 when service returns API_NOT_AVAILABLE', async () => {
      generateStoryChapter.mockResolvedValueOnce({
        illustration: { imagePrompt: '', sceneDescription: '' },
        nextChapter: null,
        conceptsFound: [],
        error: 'API_NOT_AVAILABLE'
      })

      const res = await testRequest('POST', '/story/chapter', {
        body: {
          topicName: 'Test',
          previousChapters: [{ chapter: 1, selectedText: 'Test' }],
          currentChapter: 2
        },
      })

      expect(res.statusCode).toBe(503)
      expect(res.body).toEqual({ error: 'API_NOT_AVAILABLE' })
    })

    it('returns 429 when service returns RATE_LIMITED', async () => {
      generateStoryChapter.mockResolvedValueOnce({
        illustration: { imagePrompt: '', sceneDescription: '' },
        nextChapter: null,
        conceptsFound: [],
        error: 'RATE_LIMITED'
      })

      const res = await testRequest('POST', '/story/chapter', {
        body: {
          topicName: 'Test',
          previousChapters: [{ chapter: 1, selectedText: 'Test' }],
          currentChapter: 2
        },
      })

      expect(res.statusCode).toBe(429)
      expect(res.body).toEqual({ error: 'RATE_LIMITED' })
    })

    it('returns 500 when service returns other error', async () => {
      generateStoryChapter.mockResolvedValueOnce({
        illustration: { imagePrompt: '', sceneDescription: '' },
        nextChapter: null,
        conceptsFound: [],
        error: 'UNKNOWN_ERROR'
      })

      const res = await testRequest('POST', '/story/chapter', {
        body: {
          topicName: 'Test',
          previousChapters: [{ chapter: 1, selectedText: 'Test' }],
          currentChapter: 2
        },
      })

      expect(res.statusCode).toBe(500)
      expect(res.body).toEqual({ error: 'UNKNOWN_ERROR' })
    })
  })
})

