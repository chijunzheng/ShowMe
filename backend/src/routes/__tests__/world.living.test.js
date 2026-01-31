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
import express from 'express'

// Mock dependencies BEFORE importing the module under test
vi.mock('../../services/worldEvolution.js', () => ({
  createInitialWorldState: vi.fn(),
  evolveWorld: vi.fn(),
  getEvolutionWorldState: vi.fn(),
  resetEvolutionWorldState: vi.fn(),
  WORLD_STYLE: { base: 'mock style' },
  COMPOSITION_STATES: {}
}))

vi.mock('../../services/worldPromptBuilder.js', () => ({
  buildBaseWorldPrompt: vi.fn(),
  buildEvolutionPrompt: vi.fn(),
  WORLD_STYLE: { base: 'mock style' }
}))

vi.mock('../../services/gemini.js', () => ({
  isGeminiAvailable: vi.fn(() => true),
  generateWorldPieceImage: vi.fn()
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
  evolveWorld,
  getEvolutionWorldState,
  resetEvolutionWorldState
} from '../../services/worldEvolution.js'
import { buildBaseWorldPrompt } from '../../services/worldPromptBuilder.js'
import { isGeminiAvailable, generateWorldPieceImage } from '../../services/gemini.js'
import { sanitizeId } from '../../utils/sanitize.js'

// Import the router (will be added after tests)
import worldRouter from '../world.js'

// Create test app
function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/world', worldRouter)
  return app
}

// Helper to make test requests
async function testRequest(app, method, path, body = null) {
  const { default: request } = await import('supertest')

  if (method === 'GET') {
    return request(app).get(path)
  } else if (method === 'POST') {
    return request(app).post(path).send(body)
  }
}

describe('Living World API Endpoints', () => {
  let app

  beforeEach(() => {
    vi.clearAllMocks()
    app = createTestApp()
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
      createInitialWorldState.mockReturnValue(mockInitialState)
      buildBaseWorldPrompt.mockReturnValue('Generate a barren world...')
      generateWorldPieceImage.mockResolvedValue({
        imageUrl: 'data:image/png;base64,mockImageData',
        error: null
      })

      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/initialize', {
        clientId: 'test-client-123'
      })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.worldState).toBeDefined()
      expect(response.body.worldState.tier).toBe('barren')
      expect(response.body.worldImageUrl).toBeDefined()
    })

    it('generates barren world image using buildBaseWorldPrompt', async () => {
      // Arrange
      createInitialWorldState.mockReturnValue(mockInitialState)
      buildBaseWorldPrompt.mockReturnValue('Generate a barren world prompt')
      generateWorldPieceImage.mockResolvedValue({
        imageUrl: 'data:image/png;base64,barrenWorld',
        error: null
      })

      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/initialize', {
        clientId: 'test-client-123'
      })

      // Assert
      expect(buildBaseWorldPrompt).toHaveBeenCalled()
      expect(generateWorldPieceImage).toHaveBeenCalledWith('Generate a barren world prompt')
      expect(response.body.worldImageUrl).toBe('data:image/png;base64,barrenWorld')
    })

    it('returns 400 if clientId is missing', async () => {
      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/initialize', {})

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toContain('clientId')
    })

    it('returns 400 if clientId is invalid type', async () => {
      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/initialize', {
        clientId: 12345
      })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toContain('clientId')
    })

    it('returns 400 if clientId fails sanitization', async () => {
      // Arrange
      sanitizeId.mockReturnValueOnce({ sanitized: null, error: 'Invalid ID format' })

      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/initialize', {
        clientId: '<script>alert("xss")</script>'
      })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid ID format')
    })

    it('returns 503 when Gemini is unavailable', async () => {
      // Arrange
      createInitialWorldState.mockReturnValue(mockInitialState)
      isGeminiAvailable.mockReturnValue(false)

      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/initialize', {
        clientId: 'test-client-123'
      })

      // Assert
      expect(response.status).toBe(503)
      expect(response.body.error).toContain('unavailable')
    })

    it('returns 500 when image generation fails', async () => {
      // Arrange
      createInitialWorldState.mockReturnValue(mockInitialState)
      buildBaseWorldPrompt.mockReturnValue('Generate a barren world...')
      generateWorldPieceImage.mockResolvedValue({
        imageUrl: null,
        error: 'GENERATION_FAILED'
      })

      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/initialize', {
        clientId: 'test-client-123'
      })

      // Assert
      expect(response.status).toBe(500)
      expect(response.body.error).toContain('Failed')
    })
  })

  describe('POST /api/world/living/evolve', () => {
    const mockEvolutionResult = {
      worldImageUrl: 'data:image/png;base64,evolvedWorld',
      changesApplied: {
        zone: 'nature',
        terrainEffect: 'water',
        layer: 'foreground',
        previousState: 'cracked_earth',
        newState: 'muddy_ground'
      },
      tier: 'barren',
      tierUpgrade: null
    }

    const mockWorldState = {
      clientId: 'test-client-123',
      worldImageUrl: 'data:image/png;base64,currentWorld',
      tier: 'barren',
      totalTopics: 1,
      compositionMap: {
        sky: { state: 'overcast', topics: [] },
        background: { state: 'barren_hills', topics: [] },
        midground: { state: 'empty_plains', topics: [] },
        foreground: { state: 'muddy_ground', topics: [{ name: 'ocean' }] }
      }
    }

    beforeEach(() => {
      getEvolutionWorldState.mockReturnValue({ worldState: mockWorldState, error: null })
    })

    it('updates world with topic using evolveWorld service', async () => {
      // Arrange
      evolveWorld.mockResolvedValue(mockEvolutionResult)

      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/evolve', {
        clientId: 'test-client-123',
        topicName: 'coral reefs',
        summary: 'Underwater ecosystems'
      })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(evolveWorld).toHaveBeenCalledWith(
        'test-client-123',
        'coral reefs',
        'Underwater ecosystems'
      )
    })

    it('returns changesApplied object with zone, terrainEffect, and layer', async () => {
      // Arrange
      evolveWorld.mockResolvedValue(mockEvolutionResult)

      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/evolve', {
        clientId: 'test-client-123',
        topicName: 'ocean life'
      })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.changesApplied).toBeDefined()
      expect(response.body.changesApplied.zone).toBe('nature')
      expect(response.body.changesApplied.terrainEffect).toBe('water')
      expect(response.body.changesApplied.layer).toBe('foreground')
    })

    it('returns updated worldState and tier', async () => {
      // Arrange
      evolveWorld.mockResolvedValue({
        ...mockEvolutionResult,
        tier: 'sprouting',
        tierUpgrade: { from: 'barren', to: 'sprouting' }
      })

      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/evolve', {
        clientId: 'test-client-123',
        topicName: 'fifth topic'
      })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.tier).toBe('sprouting')
      expect(response.body.worldState).toBeDefined()
    })

    it('returns 404 if world does not exist for clientId', async () => {
      // Arrange
      getEvolutionWorldState.mockReturnValue({ worldState: null, error: null })

      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/evolve', {
        clientId: 'non-existent-client',
        topicName: 'some topic'
      })

      // Assert
      expect(response.status).toBe(404)
      expect(response.body.error).toContain('not found')
    })

    it('returns 400 if clientId is missing', async () => {
      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/evolve', {
        topicName: 'ocean'
      })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toContain('clientId')
    })

    it('returns 400 if topicName is missing', async () => {
      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/evolve', {
        clientId: 'test-client-123'
      })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toContain('topicName')
    })

    it('handles optional summary parameter', async () => {
      // Arrange
      evolveWorld.mockResolvedValue(mockEvolutionResult)

      // Act - without summary
      const response = await testRequest(app, 'POST', '/api/world/living/evolve', {
        clientId: 'test-client-123',
        topicName: 'volcanoes'
      })

      // Assert
      expect(response.status).toBe(200)
      expect(evolveWorld).toHaveBeenCalledWith(
        'test-client-123',
        'volcanoes',
        undefined
      )
    })

    it('returns 500 when evolveWorld throws an error', async () => {
      // Arrange
      evolveWorld.mockRejectedValue(new Error('Evolution failed'))

      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/evolve', {
        clientId: 'test-client-123',
        topicName: 'thunderstorms'
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
      getEvolutionWorldState.mockReturnValue({ worldState: mockState, error: null })

      // Act
      const response = await testRequest(app, 'GET', '/api/world/living?clientId=existing-client')

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.worldState).toBeDefined()
      expect(response.body.worldState.clientId).toBe('existing-client')
      expect(response.body.worldState.tier).toBe('sprouting')
      expect(response.body.worldImageUrl).toBe('data:image/png;base64,worldImage')
    })

    it('returns null for new user without error', async () => {
      // Arrange
      getEvolutionWorldState.mockReturnValue({ worldState: null, error: null })

      // Act
      const response = await testRequest(app, 'GET', '/api/world/living?clientId=new-user')

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.worldState).toBeNull()
      expect(response.body.worldImageUrl).toBeNull()
    })

    it('returns 400 if clientId query param is missing', async () => {
      // Act
      const response = await testRequest(app, 'GET', '/api/world/living')

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toContain('clientId')
    })

    it('returns 400 if clientId fails sanitization', async () => {
      // Arrange
      sanitizeId.mockReturnValueOnce({ sanitized: null, error: 'Invalid ID' })

      // Act
      const response = await testRequest(app, 'GET', '/api/world/living?clientId=<invalid>')

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid ID')
    })

    it('returns 500 when getEvolutionWorldState returns error', async () => {
      // Arrange
      getEvolutionWorldState.mockReturnValue({ worldState: null, error: 'Database error' })

      // Act
      const response = await testRequest(app, 'GET', '/api/world/living?clientId=test-client')

      // Assert
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Database error')
    })
  })

  describe('Edge cases', () => {
    it('handles very long clientIds gracefully', async () => {
      // Arrange
      const longId = 'a'.repeat(500)
      createInitialWorldState.mockReturnValue({
        clientId: longId,
        tier: 'barren',
        totalTopics: 0
      })
      buildBaseWorldPrompt.mockReturnValue('prompt')
      generateWorldPieceImage.mockResolvedValue({
        imageUrl: 'data:image/png;base64,img',
        error: null
      })

      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/initialize', {
        clientId: longId
      })

      // Assert - should still process (sanitize handles length limits)
      expect(response.status).toBe(200)
    })

    it('handles unicode in topic names', async () => {
      // Arrange
      getEvolutionWorldState.mockReturnValue({
        worldState: { clientId: 'test', tier: 'barren' },
        error: null
      })
      evolveWorld.mockResolvedValue({
        changesApplied: { zone: 'nature', terrainEffect: 'water', layer: 'foreground' },
        tier: 'barren'
      })

      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/evolve', {
        clientId: 'test-client',
        topicName: 'Quantum physics',
        summary: 'Interesting science'
      })

      // Assert
      expect(response.status).toBe(200)
    })

    it('handles rate limiting error from Gemini', async () => {
      // Arrange
      createInitialWorldState.mockReturnValue({ clientId: 'test', tier: 'barren' })
      buildBaseWorldPrompt.mockReturnValue('prompt')
      generateWorldPieceImage.mockResolvedValue({
        imageUrl: null,
        error: 'RATE_LIMITED'
      })

      // Act
      const response = await testRequest(app, 'POST', '/api/world/living/initialize', {
        clientId: 'test-client'
      })

      // Assert
      expect(response.status).toBe(429)
      expect(response.body.error).toContain('Rate limit')
    })
  })
})
