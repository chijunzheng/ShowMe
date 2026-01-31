/**
 * useLivingWorld Hook Tests
 *
 * TDD tests for the Living World feature hook.
 * Tests follow Red-Green-Refactor cycle.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import useLivingWorld from '../useLivingWorld'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock getClientId utility
vi.mock('../../utils/clientId', () => ({
  getClientId: () => 'test-client-123',
  default: () => 'test-client-123',
}))

// Test fixtures
const mockWorldState = {
  id: 'world-1',
  tier: 'sprouting',
  topicsLearned: 3,
  compositionMap: {
    regions: [
      { x: 100, y: 200, topicName: 'Volcanoes', layer: 'nature' },
      { x: 300, y: 150, topicName: 'Pyramids', layer: 'civilization' },
    ],
  },
  imageUrl: 'https://example.com/world-sprouting.png',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
}

const mockBarrenWorldState = {
  id: 'world-new',
  tier: 'barren',
  topicsLearned: 0,
  compositionMap: { regions: [] },
  imageUrl: 'https://example.com/world-barren.png',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockEvolveResponse = {
  success: true,
  worldState: {
    ...mockWorldState,
    tier: 'growing',
    topicsLearned: 4,
    imageUrl: 'https://example.com/world-growing.png',
    compositionMap: {
      regions: [
        ...mockWorldState.compositionMap.regions,
        { x: 200, y: 300, topicName: 'Dinosaurs', layer: 'nature' },
      ],
    },
  },
  changesApplied: {
    newRegion: { x: 200, y: 300, topicName: 'Dinosaurs', layer: 'nature' },
    tierChanged: true,
    previousTier: 'sprouting',
    newTier: 'growing',
  },
}

describe('useLivingWorld', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default successful fetch for world state
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, worldState: mockWorldState }),
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('returns expected initial state structure', () => {
      const { result } = renderHook(() => useLivingWorld())

      expect(result.current.worldState).toBe(null)
      expect(result.current.worldImageUrl).toBe(null)
      expect(result.current.isLoading).toBe(true) // Loading on mount
      expect(result.current.isEvolving).toBe(false)
      expect(result.current.tier).toBe(null)
      expect(result.current.hotspots).toEqual([])
      expect(result.current.error).toBe(null)
      expect(typeof result.current.evolveWorld).toBe('function')
      expect(typeof result.current.initializeWorld).toBe('function')
    })
  })

  describe('fetching world state on mount', () => {
    it('fetches world state on mount', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/world/living'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        )
      })
    })

    it('sets isLoading to false after fetch completes', async () => {
      const { result } = renderHook(() => useLivingWorld())

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('populates worldState from API response', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.worldState).toEqual(mockWorldState)
      })
    })

    it('extracts worldImageUrl from worldState', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.worldImageUrl).toBe('https://example.com/world-sprouting.png')
      })
    })

    it('returns tier from worldState', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.tier).toBe('sprouting')
      })
    })

    it('parses hotspots from compositionMap', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.hotspots).toHaveLength(2)
        expect(result.current.hotspots[0]).toEqual({
          x: 100,
          y: 200,
          topicName: 'Volcanoes',
          layer: 'nature',
        })
        expect(result.current.hotspots[1]).toEqual({
          x: 300,
          y: 150,
          topicName: 'Pyramids',
          layer: 'civilization',
        })
      })
    })

    it('sets error on API failure', async () => {
      // Mock enough failures to exhaust retries (MAX_RETRIES = 2, so 3 total failures)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 5000 })
    })

    it('sets error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.error).toBe('Network error')
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('initializeWorld', () => {
    it('calls POST /api/world/living/initialize', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: null }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockBarrenWorldState }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.initializeWorld()
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/world/living/initialize'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('sets worldState after successful initialization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: null }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockBarrenWorldState }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.initializeWorld()
      })

      expect(result.current.worldState).toEqual(mockBarrenWorldState)
      expect(result.current.tier).toBe('barren')
    })

    it('returns success result from initializeWorld', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: null }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockBarrenWorldState }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let initResult
      await act(async () => {
        initResult = await result.current.initializeWorld()
      })

      expect(initResult).toEqual({ success: true })
    })

    it('sets error on initialization failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: null }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Failed to initialize' }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let initResult
      await act(async () => {
        initResult = await result.current.initializeWorld()
      })

      expect(initResult).toEqual({ success: false, error: expect.any(String) })
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('evolveWorld', () => {
    it('calls POST /api/world/living/evolve with topicName and summary', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvolveResponse),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.evolveWorld('Dinosaurs', 'Large prehistoric reptiles')
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/world/living/evolve'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Dinosaurs'),
        })
      )

      // Verify body contains expected data
      const evolveCall = mockFetch.mock.calls.find(call =>
        typeof call[0] === 'string' && call[0].includes('/api/world/living/evolve')
      )
      expect(evolveCall).toBeDefined()
      expect(evolveCall[1]).toBeDefined()
      expect(evolveCall[1].body).toBeDefined()
      const body = JSON.parse(evolveCall[1].body)
      expect(body.topicName).toBe('Dinosaurs')
      expect(body.summary).toBe('Large prehistoric reptiles')
      expect(body.clientId).toBe('test-client-123')
    })

    it('sets isEvolving to true during request', async () => {
      let resolveEvolve
      const evolvePromise = new Promise(resolve => {
        resolveEvolve = resolve
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockWorldState }),
      })
      mockFetch.mockReturnValueOnce(evolvePromise)

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Start evolution
      let evolveResultPromise
      act(() => {
        evolveResultPromise = result.current.evolveWorld('Dinosaurs', 'Summary')
      })

      // isEvolving should be true during request
      await waitFor(() => {
        expect(result.current.isEvolving).toBe(true)
      })

      // Complete the request
      await act(async () => {
        resolveEvolve({
          ok: true,
          json: () => Promise.resolve(mockEvolveResponse),
        })
        await evolveResultPromise
      })

      // isEvolving should be false after completion
      expect(result.current.isEvolving).toBe(false)
    })

    it('updates worldImageUrl on successful evolution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvolveResponse),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.worldImageUrl).toBe('https://example.com/world-sprouting.png')
      })

      await act(async () => {
        await result.current.evolveWorld('Dinosaurs', 'Large prehistoric reptiles')
      })

      expect(result.current.worldImageUrl).toBe('https://example.com/world-growing.png')
    })

    it('updates worldState with response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvolveResponse),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.tier).toBe('sprouting')
      })

      await act(async () => {
        await result.current.evolveWorld('Dinosaurs', 'Large prehistoric reptiles')
      })

      expect(result.current.worldState).toEqual(mockEvolveResponse.worldState)
      expect(result.current.tier).toBe('growing')
    })

    it('updates hotspots after evolution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvolveResponse),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.hotspots).toHaveLength(2)
      })

      await act(async () => {
        await result.current.evolveWorld('Dinosaurs', 'Large prehistoric reptiles')
      })

      expect(result.current.hotspots).toHaveLength(3)
      expect(result.current.hotspots[2]).toEqual({
        x: 200,
        y: 300,
        topicName: 'Dinosaurs',
        layer: 'nature',
      })
    })

    it('returns success and changesApplied from evolveWorld', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvolveResponse),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let evolveResult
      await act(async () => {
        evolveResult = await result.current.evolveWorld('Dinosaurs', 'Large prehistoric reptiles')
      })

      expect(evolveResult).toEqual({
        success: true,
        changesApplied: mockEvolveResponse.changesApplied,
      })
    })

    it('sets error on evolution failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Evolution failed' }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let evolveResult
      await act(async () => {
        evolveResult = await result.current.evolveWorld('Dinosaurs', 'Summary')
      })

      expect(evolveResult).toEqual({ success: false, error: expect.any(String) })
      expect(result.current.error).toBeTruthy()
      expect(result.current.isEvolving).toBe(false)
    })

    it('sets isEvolving to false on network error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockWorldState }),
      })
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.evolveWorld('Dinosaurs', 'Summary')
      })

      expect(result.current.isEvolving).toBe(false)
      expect(result.current.error).toBe('Network error')
    })
  })

  describe('error handling', () => {
    it('gracefully handles empty compositionMap', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          worldState: {
            ...mockWorldState,
            compositionMap: null,
          },
        }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.hotspots).toEqual([])
    })

    it('gracefully handles missing regions in compositionMap', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          worldState: {
            ...mockWorldState,
            compositionMap: {},
          },
        }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.hotspots).toEqual([])
    })

    it('handles 404 response for new user (no world yet)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'World not found' }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should not set error for 404 - user just needs to initialize
      expect(result.current.worldState).toBe(null)
      expect(result.current.error).toBe(null)
    })
  })

  describe('retry logic', () => {
    it('retries on transient failure (5xx)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'Service unavailable' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockWorldState }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.worldState).toEqual(mockWorldState)
      }, { timeout: 3000 })

      // Should have made 2 calls (initial + retry)
      const getCalls = mockFetch.mock.calls.filter(call =>
        call[0].includes('/api/world/living') && call[1].method === 'GET'
      )
      expect(getCalls.length).toBe(2)
    })

    it('does not retry on 4xx errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad request' }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should have made only 1 call (no retry for 4xx)
      const getCalls = mockFetch.mock.calls.filter(call =>
        call[0].includes('/api/world/living') && call[1].method === 'GET'
      )
      expect(getCalls.length).toBe(1)
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('derived state', () => {
    it('worldImageUrl is null when worldState is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'World not found' }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.worldImageUrl).toBe(null)
    })

    it('tier is null when worldState is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'World not found' }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.tier).toBe(null)
    })

    it('hotspots is empty array when worldState is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'World not found' }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.hotspots).toEqual([])
    })
  })

  describe('multiple evolutions', () => {
    it('can evolve world multiple times', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockWorldState }),
      })

      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // First evolution
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvolveResponse),
      })

      await act(async () => {
        await result.current.evolveWorld('Dinosaurs', 'Summary 1')
      })

      expect(result.current.tier).toBe('growing')

      // Second evolution
      const secondEvolveResponse = {
        success: true,
        worldState: {
          ...mockEvolveResponse.worldState,
          tier: 'flourishing',
          topicsLearned: 5,
        },
        changesApplied: {
          tierChanged: true,
          previousTier: 'growing',
          newTier: 'flourishing',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(secondEvolveResponse),
      })

      await act(async () => {
        await result.current.evolveWorld('Robots', 'Summary 2')
      })

      expect(result.current.tier).toBe('flourishing')
    })
  })
})
