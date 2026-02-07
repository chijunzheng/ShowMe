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
  generateFinalStoryFromAnswers: vi.fn(),
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
import { generateStoryPrompt, generateStoryChapter, generateFinalStoryFromAnswers, generateEducationalImage, generateTTS } from '../../services/gemini.js'

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
      expect(res.body).toMatchObject({
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
        sceneImage: 'data:image/png;base64,scene123'
      })
      expect(Array.isArray(res.body?.questionFlow)).toBe(true)
      expect(res.body.questionFlow).toHaveLength(3)
      expect(res.body.questionFlow.map((chapter) => chapter.chapterNumber)).toEqual([1, 2, 3])
      expect(res.body.questionFlow[0].choices).toHaveLength(3)
      expect(res.body.questionFlow[0].choices[0].text).toBe('Deep in the ocean trench...')
      expect(res.body.questionFlow[0].choices[1].text).toBe('In the darkest depths...')
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
      expect(res.body).toHaveProperty('questionFlow')
      expect(Array.isArray(res.body.questionFlow)).toBe(true)
      expect(res.body.questionFlow).toHaveLength(3)
      expect(res.body).toHaveProperty('sceneImage', null) // No image because no sceneImagePrompt
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
      // Main story data should still be present
      expect(res.body).toHaveProperty('storyPrompt', 'Write a story about volcanoes.')
      expect(res.body).toHaveProperty('missionHook', 'Explore the fiery depths!')
    })
  })

  describe('POST /api/learn/story/finalize', () => {
    const validFinalizeBody = {
      topicName: 'Neural Networks',
      conceptChecklist: ['input layers', 'weights', 'activation'],
      imageStyle: "children's book illustration, colorful, friendly",
      answers: [
        { chapterNumber: 1, choiceId: '1a', selectedText: 'Sparky enters the maze.', conceptHints: ['input layers'] },
        { chapterNumber: 2, choiceId: '2b', selectedText: 'Sparky faces weighted gates.', conceptHints: ['weights'] },
        { chapterNumber: 3, choiceId: '3c', selectedText: 'Sparky unlocks the final activation gate.', conceptHints: ['activation'] },
      ],
      language: 'en',
    }

    const mockFinalScenes = [
      {
        chapterNumber: 1,
        chapterTitle: 'Chapter 1: The Beginning',
        narrativeText: 'Sparky enters the maze and studies the first clues.',
        sceneDescription: 'Sparky enters the maze',
        imagePrompt: 'Prompt chapter 1',
        panelCaptions: ['Beat 1', 'Beat 2', 'Beat 3', 'Beat 4'],
      },
      {
        chapterNumber: 2,
        chapterTitle: 'Chapter 2: The Adventure',
        narrativeText: 'Sparky handles weighted routes and keeps going.',
        sceneDescription: 'Sparky solves weighted routes',
        imagePrompt: 'Prompt chapter 2',
        panelCaptions: ['Beat 1', 'Beat 2', 'Beat 3', 'Beat 4'],
      },
      {
        chapterNumber: 3,
        chapterTitle: 'Chapter 3: The Ending',
        narrativeText: 'Sparky opens the final gate and wins.',
        sceneDescription: 'Sparky wins',
        imagePrompt: 'Prompt chapter 3',
        panelCaptions: ['Beat 1', 'Beat 2', 'Beat 3', 'Beat 4'],
      },
    ]

    it('returns 400 when answers are missing or invalid', async () => {
      const res = await testRequest('POST', '/story/finalize', {
        body: { topicName: 'Neural Networks', answers: [{ chapterNumber: 1, selectedText: 'Only one answer' }] },
      })

      expect(res.statusCode).toBe(400)
      expect(res.body?.error).toBe('Invalid answers (must include exactly 3 chapter answers)')
      expect(generateFinalStoryFromAnswers).not.toHaveBeenCalled()
    })

    it('returns 200 with 3 scenes on success', async () => {
      generateFinalStoryFromAnswers.mockResolvedValueOnce({
        scenes: mockFinalScenes,
        conceptsFound: ['input layers', 'weights'],
        error: null,
      })

      generateEducationalImage
        .mockResolvedValueOnce({ imageUrl: 'data:image/png;base64,ch1', error: null })
        .mockResolvedValueOnce({ imageUrl: 'data:image/png;base64,ch2', error: null })
        .mockResolvedValueOnce({ imageUrl: 'data:image/png;base64,ch3', error: null })

      const res = await testRequest('POST', '/story/finalize', {
        body: validFinalizeBody,
      })

      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body?.scenes)).toBe(true)
      expect(res.body.scenes).toHaveLength(3)
      expect(res.body.scenes[0]).toMatchObject({
        chapterNumber: 1,
        chapterTitle: 'Chapter 1: The Beginning',
        narrativeText: expect.any(String),
        sceneDescription: expect.any(String),
        panelCaptions: expect.any(Array),
        imageUrl: 'data:image/png;base64,ch1',
      })
      expect(res.body.scenes.every((scene) => Array.isArray(scene.panelCaptions) && scene.panelCaptions.length <= 4)).toBe(true)
      expect(res.body.conceptsFound).toEqual(['input layers', 'weights'])
      expect(generateEducationalImage).toHaveBeenNthCalledWith(
        1,
        'Prompt chapter 1',
        expect.objectContaining({
          topic: 'Neural Networks',
          explanationLevel: 'simple',
          language: 'en',
          comicPanel: true,
        })
      )
    })

    it('keeps scene text when some image generations fail', async () => {
      generateFinalStoryFromAnswers.mockResolvedValueOnce({
        scenes: mockFinalScenes,
        conceptsFound: ['input layers'],
        error: null,
      })

      generateEducationalImage
        .mockResolvedValueOnce({ imageUrl: 'data:image/png;base64,ch1', error: null })
        .mockRejectedValueOnce(new Error('image provider timeout'))
        .mockResolvedValueOnce({ imageUrl: null, error: 'GENERATION_FAILED' })

      const res = await testRequest('POST', '/story/finalize', {
        body: validFinalizeBody,
      })

      expect(res.statusCode).toBe(200)
      expect(res.body.scenes).toHaveLength(3)
      expect(res.body.scenes[0].imageUrl).toBe('data:image/png;base64,ch1')
      expect(res.body.scenes[1].imageUrl).toBeNull()
      expect(res.body.scenes[2].imageUrl).toBeNull()
      expect(res.body.scenes[1].narrativeText).toBe('Sparky handles weighted routes and keeps going.')
      expect(res.body.scenes[2].panelCaptions).toEqual(['Beat 1', 'Beat 2', 'Beat 3', 'Beat 4'])
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
      expect(res.body?.error).toBe('Invalid currentChapter (must be 2, 3, or 4)')
      expect(generateStoryChapter).not.toHaveBeenCalled()
    })

    it('returns 400 when currentChapter is greater than 4', async () => {
      const res = await testRequest('POST', '/story/chapter', {
        body: {
          topicName: 'Test Topic',
          previousChapters: [{ chapter: 1, selectedText: 'Something happened' }],
          currentChapter: 5
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.body?.error).toBe('Invalid currentChapter (must be 2, 3, or 4)')
      expect(generateStoryChapter).not.toHaveBeenCalled()
    })

    it('returns chapter 2 with illustration and next chapter (happy path)', async () => {
      generateStoryChapter.mockResolvedValueOnce({
        illustration: {
          imagePrompt: 'A robot entering a colorful maze',
          sceneDescription: 'Sparky explores the thinking maze',
          panelCaptions: [
            'Sparky steps into the maze.',
            'A puzzle gate appears ahead.',
            'He decodes the glowing symbols.',
            'The path opens to the next challenge.',
          ],
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
          sceneDescription: 'Sparky explores the thinking maze',
          panelCaptions: [
            'Sparky steps into the maze.',
            'A puzzle gate appears ahead.',
            'He decodes the glowing symbols.',
            'The path opens to the next challenge.',
          ],
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
      expect(generateEducationalImage).toHaveBeenCalledWith(
        'A robot entering a colorful maze',
        expect.objectContaining({
          topic: 'Neural Networks',
          explanationLevel: 'simple',
          language: 'en',
          comicPanel: true,
        })
      )
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
      expect(res.body.illustration).toHaveProperty('panelCaptions')
      expect(res.body.illustration.panelCaptions).toEqual([])
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
      expect(res.body.illustration).toHaveProperty('panelCaptions')
      expect(res.body.illustration.panelCaptions).toEqual([])
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
        sceneDescription: 'Something happens',
        panelCaptions: [],
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
