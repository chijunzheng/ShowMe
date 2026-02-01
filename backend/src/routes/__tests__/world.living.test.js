/**
 * Living World API Endpoints Tests
 * TDD: Tests written FIRST before implementation
 *
 * Test Coverage:
 * - POST /api/world/living/initialize - Create initial barren world
 * - POST /api/world/living/evolve - Evolve world with topic
 * - GET /api/world/living - Get current world state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import worldRouter from '../world.js'

// Mock dependencies BEFORE importing the module under test
vi.mock('../../services/worldEvolution.js', () => ({
  createInitialWorldState: vi.fn(),
  calculateTier: vi.fn(),
  evolveWorld: vi.fn(),
  getEvolutionWorldState: vi.fn(),
  setEvolutionWorldState: vi.fn(),
  resetEvolutionWorldState: vi.fn(),
  WORLD_STYLE: { base: 'mock style' },
}))

vi.mock('../../services/worldPromptBuilder.js', () => ({
  buildBaseWorldPrompt: vi.fn(),
  buildEvolutionPrompt: vi.fn(),
  WORLD_STYLE: { base: 'mock style' }
}))

vi.mock('../../services/gemini.js', () => ({
  isGeminiAvailable: vi.fn(() => true),
  classifyTopicZone: vi.fn(),
  generateWorldPiecePrompt: vi.fn(),
  generateWorldPieceImage: vi.fn(),
  generateLivingWorldEvolutionPlan: vi.fn(),
  generateLivingWorldImage: vi.fn(),
}))

vi.mock('../../services/livingWorldStore.js', () => ({
  loadLivingWorldState: vi.fn(),
  saveLivingWorldState: vi.fn(),
}))

vi.mock('../../utils/sanitize.js', () => ({
  sanitizeId: vi.fn((id) => ({ sanitized: id, error: null })),
  sanitizeQuery: vi.fn((q) => ({ sanitized: q, error: null }))
}))

vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    time: vi.fn(),
    timeEnd: vi.fn()
  }
}))

// Import mocked modules
import {
  createInitialWorldState,
  calculateTier,
  evolveWorld,
  getEvolutionWorldState,
  setEvolutionWorldState,
  resetEvolutionWorldState
} from '../../services/worldEvolution.js'
import { buildBaseWorldPrompt, buildEvolutionPrompt } from '../../services/worldPromptBuilder.js'
import { isGeminiAvailable, generateLivingWorldEvolutionPlan, generateLivingWorldImage } from '../../services/gemini.js'
import { loadLivingWorldState, saveLivingWorldState } from '../../services/livingWorldStore.js'
import { sanitizeId } from '../../utils/sanitize.js'

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

async function testRequest(method, path, { query = {}, body = null } = {}) {
  const req = {
    method,
    url: path,
    query,
    body,
  }

  const res = createMockRes()

  worldRouter.handle(req, res, (error) => {
    if (error) {
      res.__done.reject(error)
    } else {
      res.__done.resolve()
    }
  })

  await res.__done.promise
  return { status: res.statusCode, body: res.body, headers: res.headers }
}

describe('Living World API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/world/living/initialize', () => {
    const mockInitialState = {
      clientId: 'test-client-123',
      worldImageUrl: null,
      styleDescriptor: 'mock style',
      compositionMap: {
        sky: { state: 'overcast', topics: [] },
        background: { state: 'barren_hills', topics: [] },
        midground: { state: 'empty_plains', topics: [] },
        foreground: { state: 'cracked_earth', topics: [] }
      },
      ecosystems: [],
      interconnections: [],
      tier: 'barren',
      totalTopics: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('creates new world state for valid clientId', async () => {
      // Arrange
      getEvolutionWorldState.mockReturnValueOnce({ worldState: null, error: null })
      loadLivingWorldState.mockResolvedValueOnce(null)
      createInitialWorldState.mockReturnValue(mockInitialState)
      buildBaseWorldPrompt.mockReturnValue('Generate a barren world...')
      generateLivingWorldImage.mockResolvedValue({
        imageUrl: 'data:image/png;base64,mockImageData',
        error: null
      })
      saveLivingWorldState.mockResolvedValueOnce(true)

      // Act
      const response = await testRequest('POST', '/living/initialize', {
        body: { clientId: 'test-client-123' }
      })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.worldState).toBeDefined()
      expect(response.body.worldState.tier).toBe('barren')
      expect(response.body.worldImageUrl).toBeDefined()
    })

    it('is idempotent when world already exists', async () => {
      // Arrange
      getEvolutionWorldState.mockReturnValueOnce({
        worldState: {
          ...mockInitialState,
          worldImageUrl: 'data:image/png;base64,existingWorld',
        },
        error: null,
      })

      // Act
      const response = await testRequest('POST', '/living/initialize', {
        body: { clientId: 'test-client-123' }
      })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.worldImageUrl).toBe('data:image/png;base64,existingWorld')
      expect(createInitialWorldState).not.toHaveBeenCalled()
      expect(buildBaseWorldPrompt).not.toHaveBeenCalled()
      expect(generateLivingWorldImage).not.toHaveBeenCalled()
    })

    it('generates barren world image using buildBaseWorldPrompt', async () => {
      // Arrange
      getEvolutionWorldState.mockReturnValueOnce({ worldState: null, error: null })
      loadLivingWorldState.mockResolvedValueOnce(null)
      createInitialWorldState.mockReturnValue(mockInitialState)
      buildBaseWorldPrompt.mockReturnValue('Generate a barren world prompt')
      generateLivingWorldImage.mockResolvedValue({
        imageUrl: 'data:image/png;base64,barrenWorld',
        error: null
      })
      saveLivingWorldState.mockResolvedValueOnce(true)

      // Act
      const response = await testRequest('POST', '/living/initialize', {
        body: { clientId: 'test-client-123' }
      })

      // Assert
      expect(buildBaseWorldPrompt).toHaveBeenCalled()
      expect(generateLivingWorldImage).toHaveBeenCalledWith(
        'Generate a barren world prompt',
        expect.objectContaining({ aspectRatio: '16:9', resolution: '2k' })
      )
      expect(response.body.worldImageUrl).toBe('data:image/png;base64,barrenWorld')
      expect(setEvolutionWorldState).toHaveBeenCalled()
      expect(saveLivingWorldState).toHaveBeenCalled()
    })

    it('returns 400 if clientId is missing', async () => {
      // Act
      const response = await testRequest('POST', '/living/initialize', { body: {} })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toContain('clientId')
    })

    it('returns 400 if clientId is invalid type', async () => {
      // Act
      const response = await testRequest('POST', '/living/initialize', { body: { clientId: 12345 } })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toContain('clientId')
    })

    it('returns 400 if clientId fails sanitization', async () => {
      // Arrange
      sanitizeId.mockReturnValueOnce({ sanitized: null, error: 'Invalid ID format' })

      // Act
      const response = await testRequest('POST', '/living/initialize', {
        body: { clientId: '<script>alert("xss")</script>' }
      })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid ID format')
    })

    it('returns 503 when Gemini is unavailable', async () => {
      // Arrange
      getEvolutionWorldState.mockReturnValueOnce({ worldState: null, error: null })
      loadLivingWorldState.mockResolvedValueOnce(null)
      isGeminiAvailable.mockReturnValue(false)

      // Act
      const response = await testRequest('POST', '/living/initialize', {
        body: { clientId: 'test-client-123' }
      })

      // Assert
      expect(response.status).toBe(503)
      expect(response.body.error).toContain('unavailable')
    })

    it('returns 500 when image generation fails', async () => {
      // Arrange
      getEvolutionWorldState.mockReturnValueOnce({ worldState: null, error: null })
      loadLivingWorldState.mockResolvedValueOnce(null)
      createInitialWorldState.mockReturnValue(mockInitialState)
      buildBaseWorldPrompt.mockReturnValue('Generate a barren world...')
      generateLivingWorldImage.mockResolvedValue({
        imageUrl: null,
        error: 'GENERATION_FAILED'
      })

      // Act
      const response = await testRequest('POST', '/living/initialize', {
        body: { clientId: 'test-client-123' }
      })

      // Assert
      expect(response.status).toBe(500)
      expect(response.body.error).toContain('Failed')
    })
  })

  describe('POST /api/world/living/evolve', () => {
    const mockEvolutionResult = {
      changesApplied: {
        tierChanged: false,
        previousTier: 'barren',
        newTier: 'barren',
        elementAdded: 'a small planned element',
        placementHint: 'midground center'
      },
      tier: 'barren',
      tierUpgrade: null
    }

    const mockBaseWorldState = {
      clientId: 'test-client-123',
      worldImageUrl: 'data:image/png;base64,baseWorld',
      tier: 'barren',
      totalTopics: 0,
      topicsLearned: [],
      evolutions: []
    }

    const mockWorldState = {
      clientId: 'test-client-123',
      worldImageUrl: 'data:image/png;base64,currentWorld',
      tier: 'barren',
      totalTopics: 1,
      topicsLearned: [],
      evolutions: []
    }

    beforeEach(() => {
      vi.clearAllMocks()
      calculateTier.mockReturnValue('barren')
      generateLivingWorldEvolutionPlan.mockResolvedValue({
        elementToAdd: 'a small planned element',
        placementHint: 'midground center',
        targetLayer: 'midground',
        error: null,
      })
    })

    it('updates world with topic using evolveWorld service', async () => {
      // Arrange
      evolveWorld.mockResolvedValue(mockEvolutionResult)
      getEvolutionWorldState
        .mockReturnValueOnce({ worldState: mockWorldState, error: null }) // hydrate
        .mockReturnValueOnce({ worldState: mockWorldState, error: null }) // after evolve

      buildEvolutionPrompt.mockReturnValue('Evolve prompt')
      generateLivingWorldImage.mockResolvedValue({
        imageUrl: 'data:image/png;base64,evolvedWorld',
        error: null,
      })
      saveLivingWorldState.mockResolvedValueOnce(true)

      // Act
      const response = await testRequest('POST', '/living/evolve', {
        body: {
          clientId: 'test-client-123',
          topicName: 'coral reefs',
          summary: 'Underwater ecosystems',
        }
      })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(evolveWorld).toHaveBeenCalledWith(
        'test-client-123',
        'coral reefs',
        'Underwater ecosystems',
        expect.objectContaining({
          elementAdded: 'a small planned element',
          placementHint: 'midground center',
        })
      )
    })

    it('returns changesApplied object with tier change info', async () => {
      // Arrange
      evolveWorld.mockResolvedValue(mockEvolutionResult)
      getEvolutionWorldState
        .mockReturnValueOnce({ worldState: mockWorldState, error: null }) // hydrate
        .mockReturnValueOnce({ worldState: mockWorldState, error: null }) // after evolve
      buildEvolutionPrompt.mockReturnValue('Evolve prompt')
      generateLivingWorldImage.mockResolvedValue({ imageUrl: 'data:image/png;base64,evolvedWorld', error: null })

      // Act
      const response = await testRequest('POST', '/living/evolve', {
        body: {
          clientId: 'test-client-123',
          topicName: 'ocean life',
        }
      })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.changesApplied).toBeDefined()
      expect(response.body.changesApplied.tierChanged).toBe(false)
      expect(response.body.changesApplied.previousTier).toBe('barren')
      expect(response.body.changesApplied.newTier).toBe('barren')
    })

    it('returns updated worldState and tier', async () => {
      // Arrange
      evolveWorld.mockResolvedValue({
        ...mockEvolutionResult,
        tier: 'sprouting',
        tierUpgrade: { from: 'barren', to: 'sprouting' }
      })
      getEvolutionWorldState
        .mockReturnValueOnce({ worldState: mockWorldState, error: null }) // hydrate
        .mockReturnValueOnce({ worldState: { ...mockWorldState, tier: 'sprouting' }, error: null }) // after evolve
      buildEvolutionPrompt.mockReturnValue('Evolve prompt')
      generateLivingWorldImage.mockResolvedValue({ imageUrl: 'data:image/png;base64,evolvedWorld', error: null })

      // Act
      const response = await testRequest('POST', '/living/evolve', {
        body: {
          clientId: 'test-client-123',
          topicName: 'fifth topic',
        }
      })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.tier).toBe('sprouting')
      expect(response.body.worldState).toBeDefined()
    })

    it('auto-initializes base world if missing', async () => {
      // Arrange
      getEvolutionWorldState
        .mockReturnValueOnce({ worldState: null, error: null }) // hydrate cache miss
        .mockReturnValueOnce({ worldState: mockWorldState, error: null }) // after evolve
      loadLivingWorldState.mockResolvedValueOnce(null)
      createInitialWorldState.mockReturnValue(mockBaseWorldState)
      buildBaseWorldPrompt.mockReturnValue('Base prompt')
      buildEvolutionPrompt.mockReturnValue('Evolve prompt')
      generateLivingWorldImage
        .mockResolvedValueOnce({ imageUrl: 'data:image/png;base64,baseWorld', error: null })
        .mockResolvedValueOnce({ imageUrl: 'data:image/png;base64,evolvedWorld', error: null })
      evolveWorld.mockResolvedValue(mockEvolutionResult)
      saveLivingWorldState.mockResolvedValue(true)

      // Act
      const response = await testRequest('POST', '/living/evolve', {
        body: {
          clientId: 'non-existent-client',
          topicName: 'some topic',
        }
      })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.worldImageUrl).toBe('data:image/png;base64,evolvedWorld')
    })

    it('returns 400 if clientId is missing', async () => {
      // Act
      const response = await testRequest('POST', '/living/evolve', {
        body: { topicName: 'ocean' }
      })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toContain('clientId')
    })

    it('returns 400 if topicName is missing', async () => {
      // Act
      const response = await testRequest('POST', '/living/evolve', {
        body: { clientId: 'test-client-123' }
      })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toContain('topicName')
    })

    it('handles optional summary parameter', async () => {
      // Arrange
      evolveWorld.mockResolvedValue(mockEvolutionResult)
      getEvolutionWorldState
        .mockReturnValueOnce({ worldState: mockWorldState, error: null }) // hydrate
        .mockReturnValueOnce({ worldState: mockWorldState, error: null }) // after evolve
      buildEvolutionPrompt.mockReturnValue('Evolve prompt')
      generateLivingWorldImage.mockResolvedValue({ imageUrl: 'data:image/png;base64,evolvedWorld', error: null })

      // Act - without summary
      const response = await testRequest('POST', '/living/evolve', {
        body: {
          clientId: 'test-client-123',
          topicName: 'volcanoes',
        }
      })

      // Assert
      expect(response.status).toBe(200)
      expect(evolveWorld).toHaveBeenCalledWith(
        'test-client-123',
        'volcanoes',
        undefined,
        expect.any(Object)
      )
    })

    it('returns 500 when evolveWorld throws an error', async () => {
      // Arrange
      evolveWorld.mockRejectedValue(new Error('Evolution failed'))
      getEvolutionWorldState.mockReturnValueOnce({ worldState: mockWorldState, error: null })

      // Act
      const response = await testRequest('POST', '/living/evolve', {
        body: {
          clientId: 'test-client-123',
          topicName: 'thunderstorms',
        }
      })

      // Assert
      expect(response.status).toBe(500)
      expect(response.body.error).toContain('Internal server error')
    })
  })

  describe('GET /api/world/living', () => {
    it('returns world state for existing user', async () => {
      // Arrange
      const mockState = {
        clientId: 'existing-client',
        worldImageUrl: 'data:image/png;base64,worldImage',
        tier: 'sprouting',
        totalTopics: 7,
        compositionMap: {
          sky: { state: 'clearing', topics: [] },
          background: { state: 'rocky_peaks', topics: [] },
          midground: { state: 'scattered_brush', topics: [] },
          foreground: { state: 'grassy_field', topics: [] }
        }
      }
      getEvolutionWorldState.mockReturnValueOnce({ worldState: mockState, error: null })

      // Act
      const response = await testRequest('GET', '/living', { query: { clientId: 'existing-client' } })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.worldState).toBeDefined()
      expect(response.body.worldState.clientId).toBe('existing-client')
      expect(response.body.worldState.tier).toBe('sprouting')
      expect(response.body.worldImageUrl).toBe('data:image/png;base64,worldImage')
    })

    it('returns 404 for new user without error', async () => {
      // Arrange
      getEvolutionWorldState.mockReturnValueOnce({ worldState: null, error: null })
      loadLivingWorldState.mockResolvedValueOnce(null)

      // Act
      const response = await testRequest('GET', '/living', { query: { clientId: 'new-user' } })

      // Assert
      expect(response.status).toBe(404)
      expect(response.body.worldState).toBeNull()
      expect(response.body.worldImageUrl).toBeNull()
    })

    it('returns 400 if clientId query param is missing', async () => {
      // Act
      const response = await testRequest('GET', '/living')

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toContain('clientId')
    })

    it('returns 400 if clientId fails sanitization', async () => {
      // Arrange
      sanitizeId.mockReturnValueOnce({ sanitized: null, error: 'Invalid ID' })

      // Act
      const response = await testRequest('GET', '/living', { query: { clientId: '<invalid>' } })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid ID')
    })

  })

  describe('Edge cases', () => {
    it('handles very long clientIds gracefully', async () => {
      // Arrange
      const longId = 'a'.repeat(500)
      getEvolutionWorldState.mockReturnValueOnce({ worldState: null, error: null })
      loadLivingWorldState.mockResolvedValueOnce(null)
      createInitialWorldState.mockReturnValue({
        clientId: longId,
        tier: 'barren',
        totalTopics: 0
      })
      buildBaseWorldPrompt.mockReturnValue('prompt')
      generateLivingWorldImage.mockResolvedValue({
        imageUrl: 'data:image/png;base64,img',
        error: null
      })
      saveLivingWorldState.mockResolvedValueOnce(true)

      // Act
      const response = await testRequest('POST', '/living/initialize', { body: { clientId: longId } })

      // Assert - should still process (sanitize handles length limits)
      expect(response.status).toBe(200)
    })

    it('handles unicode in topic names', async () => {
      // Arrange
      const existingWorldState = {
        clientId: 'test-client',
        worldImageUrl: 'data:image/png;base64,currentWorld',
        tier: 'barren',
        totalTopics: 1,
        topicsLearned: [],
        evolutions: [],
      }
      getEvolutionWorldState
        .mockReturnValueOnce({ worldState: existingWorldState, error: null })
        .mockReturnValueOnce({ worldState: existingWorldState, error: null })
      calculateTier.mockReturnValue('barren')
      generateLivingWorldEvolutionPlan.mockResolvedValueOnce({
        elementToAdd: 'a subtle glowing symbol etched into a rock',
        placementHint: 'foreground lower-left near the rock formations',
        targetLayer: 'foreground',
        error: null,
      })
      evolveWorld.mockResolvedValue({
        changesApplied: {
          tierChanged: false,
          previousTier: 'barren',
          newTier: 'barren',
          elementAdded: 'a subtle glowing symbol etched into a rock',
          placementHint: 'foreground lower-left near the rock formations',
        },
        tier: 'barren',
        tierUpgrade: null,
      })
      buildEvolutionPrompt.mockReturnValue('Evolve prompt')
      generateLivingWorldImage.mockResolvedValue({ imageUrl: 'data:image/png;base64,evolvedWorld', error: null })

      // Act
      const response = await testRequest('POST', '/living/evolve', {
        body: {
          clientId: 'test-client',
          topicName: 'Quantum physics',
          summary: 'Interesting science',
        }
      })

      // Assert
      expect(response.status).toBe(200)
    })

    it('handles rate limiting error from Gemini', async () => {
      // Arrange
      getEvolutionWorldState.mockReturnValueOnce({ worldState: null, error: null })
      loadLivingWorldState.mockResolvedValueOnce(null)
      createInitialWorldState.mockReturnValue({ clientId: 'test', tier: 'barren' })
      buildBaseWorldPrompt.mockReturnValue('prompt')
      generateLivingWorldImage.mockResolvedValue({
        imageUrl: null,
        error: 'RATE_LIMITED'
      })

      // Act
      const response = await testRequest('POST', '/living/initialize', { body: { clientId: 'test-client' } })

      // Assert
      expect(response.status).toBe(429)
      expect(response.body.error).toContain('Rate limit')
    })
  })
})
