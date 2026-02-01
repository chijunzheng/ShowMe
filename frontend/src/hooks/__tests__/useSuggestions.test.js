/**
 * useSuggestions Hook Tests
 *
 * TDD tests for the suggestions hook that fetches personalized topic suggestions
 * based on user's learning journey and world zones.
 *
 * API Contract:
 * POST /api/world/suggestions
 * Request: { clientId, learnedTopics, zones, limit }
 * Response: { suggestions: [{ type, topic, reason, zone }], meta: { season, weakestZone, exploredClusters } }
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import useSuggestions, { extractLearnedTopics, countZones, createPiecesHash } from '../useSuggestions'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock getClientId utility
vi.mock('../../utils/clientId', () => ({
  getClientId: () => 'test-client-123',
  default: () => 'test-client-123',
}))

// Test fixtures
const mockSuggestionsResponse = {
  suggestions: [
    {
      type: 'world_gap',
      topic: 'Volcanoes',
      reason: 'Your world is missing natural disasters',
      zone: 'nature',
    },
    {
      type: 'knowledge_bridge',
      topic: 'Tectonic Plates',
      reason: 'Connects to your knowledge of earthquakes',
      zone: 'nature',
    },
    {
      type: 'trending',
      topic: 'Solar Eclipse',
      reason: 'Popular topic this season',
      zone: 'arcane',
    },
  ],
  meta: {
    season: 'spring',
    weakestZone: 'nature',
    exploredClusters: ['physics', 'geography'],
  },
}

const mockEmptySuggestionsResponse = {
  suggestions: [],
  meta: {
    season: 'winter',
    weakestZone: null,
    exploredClusters: [],
  },
}

const mockPieces = [
  { id: '1', topicName: 'Earthquakes', zone: 'nature' },
  { id: '2', topicName: 'Mountains', zone: 'nature' },
  { id: '3', topicName: 'Pyramids', zone: 'civilization' },
]

describe('useSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default successful fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuggestionsResponse),
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('returns expected initial state structure', () => {
      const { result } = renderHook(() => useSuggestions({ autoFetch: false }))

      expect(result.current.suggestions).toEqual([])
      expect(result.current.meta).toBe(null)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(typeof result.current.refresh).toBe('function')
    })

    it('does not fetch suggestions when autoFetch is false', async () => {
      renderHook(() => useSuggestions({ autoFetch: false }))

      // Wait a tick to ensure no fetch is triggered
      await new Promise((r) => setTimeout(r, 50))

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('fetches suggestions on mount when autoFetch is true (default)', async () => {
      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/world/suggestions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })
  })

  describe('fetching suggestions', () => {
    it('calls POST /api/world/suggestions with correct payload', async () => {
      renderHook(() => useSuggestions({ pieces: mockPieces, limit: 5 }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.clientId).toBe('test-client-123')
      expect(body.learnedTopics).toEqual(['Earthquakes', 'Mountains', 'Pyramids'])
      expect(body.zones).toEqual({ nature: 2, civilization: 1, arcane: 0 })
      expect(body.limit).toBe(5)
    })

    it('sets isLoading to true during fetch', async () => {
      let resolvePromise
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      // isLoading should be true during request
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      // Complete the request
      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve(mockSuggestionsResponse),
        })
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('populates suggestions from API response', async () => {
      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(result.current.suggestions).toEqual(mockSuggestionsResponse.suggestions)
      })

      expect(result.current.suggestions).toHaveLength(3)
    })

    it('populates meta from API response', async () => {
      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(result.current.meta).toEqual(mockSuggestionsResponse.meta)
      })

      expect(result.current.meta.season).toBe('spring')
      expect(result.current.meta.weakestZone).toBe('nature')
    })

    it('handles empty suggestions array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEmptySuggestionsResponse),
      })

      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.suggestions).toEqual([])
      expect(result.current.meta).toEqual(mockEmptySuggestionsResponse.meta)
    })

    it('uses default limit of 5 when not specified', async () => {
      renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.limit).toBe(5)
    })

    it('respects custom limit parameter', async () => {
      renderHook(() => useSuggestions({ pieces: mockPieces, limit: 10 }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.limit).toBe(10)
    })
  })

  describe('error handling', () => {
    it('sets error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })

      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch suggestions')
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.suggestions).toEqual([])
    })

    it('sets error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(result.current.error).toBe('Network error')
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('clears previous error on successful fetch', async () => {
      // First fetch fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result, rerender } = renderHook(
        ({ pieces }) => useSuggestions({ pieces }),
        { initialProps: { pieces: mockPieces } }
      )

      await waitFor(() => {
        expect(result.current.error).toBe('Network error')
      })

      // Second fetch succeeds with new pieces
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuggestionsResponse),
      })

      const newPieces = [...mockPieces, { id: '4', topicName: 'Oceans', zone: 'nature' }]
      rerender({ pieces: newPieces })

      await waitFor(() => {
        expect(result.current.error).toBe(null)
      })

      expect(result.current.suggestions).toHaveLength(3)
    })
  })

  describe('refresh functionality', () => {
    it('refresh triggers new API call', async () => {
      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Call refresh
      await act(async () => {
        await result.current.refresh()
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('refresh updates suggestions with new data', async () => {
      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(3)
      })

      // Setup new response for refresh
      const updatedResponse = {
        suggestions: [
          { type: 'trending', topic: 'New Topic', reason: 'Fresh suggestion', zone: 'arcane' },
        ],
        meta: { season: 'summer', weakestZone: 'arcane', exploredClusters: [] },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedResponse),
      })

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.suggestions).toHaveLength(1)
      expect(result.current.suggestions[0].topic).toBe('New Topic')
    })

    it('refresh returns data on success', async () => {
      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let refreshResult
      await act(async () => {
        refreshResult = await result.current.refresh()
      })

      expect(refreshResult).toEqual(mockSuggestionsResponse)
    })

    it('refresh returns null on failure', async () => {
      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockFetch.mockRejectedValueOnce(new Error('Refresh failed'))

      let refreshResult
      await act(async () => {
        refreshResult = await result.current.refresh()
      })

      expect(refreshResult).toBe(null)
      expect(result.current.error).toBe('Refresh failed')
    })
  })

  describe('caching behavior', () => {
    it('does not refetch when pieces have not changed', async () => {
      const { result, rerender } = renderHook(
        ({ pieces }) => useSuggestions({ pieces }),
        { initialProps: { pieces: mockPieces } }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Rerender with same pieces (new array reference but same content)
      rerender({ pieces: [...mockPieces] })

      // Wait a bit to ensure no new fetch is triggered
      await new Promise((r) => setTimeout(r, 50))

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('refetches when pieces change', async () => {
      const { result, rerender } = renderHook(
        ({ pieces }) => useSuggestions({ pieces }),
        { initialProps: { pieces: mockPieces } }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Add a new piece
      const newPieces = [
        ...mockPieces,
        { id: '4', topicName: 'Oceans', zone: 'nature' },
      ]

      rerender({ pieces: newPieces })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('suggestion types', () => {
    it('correctly returns world_gap type suggestions', async () => {
      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(3)
      })

      const worldGapSuggestion = result.current.suggestions.find(
        (s) => s.type === 'world_gap'
      )
      expect(worldGapSuggestion).toBeDefined()
      expect(worldGapSuggestion.topic).toBe('Volcanoes')
      expect(worldGapSuggestion.reason).toBeTruthy()
    })

    it('correctly returns knowledge_bridge type suggestions', async () => {
      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(3)
      })

      const bridgeSuggestion = result.current.suggestions.find(
        (s) => s.type === 'knowledge_bridge'
      )
      expect(bridgeSuggestion).toBeDefined()
      expect(bridgeSuggestion.topic).toBe('Tectonic Plates')
    })

    it('correctly returns trending type suggestions', async () => {
      const { result } = renderHook(() => useSuggestions({ pieces: mockPieces }))

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(3)
      })

      const trendingSuggestion = result.current.suggestions.find(
        (s) => s.type === 'trending'
      )
      expect(trendingSuggestion).toBeDefined()
      expect(trendingSuggestion.topic).toBe('Solar Eclipse')
    })
  })

  describe('empty pieces handling', () => {
    it('handles empty pieces array', async () => {
      const { result } = renderHook(() => useSuggestions({ pieces: [] }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.learnedTopics).toEqual([])
      expect(body.zones).toEqual({ nature: 0, civilization: 0, arcane: 0 })
    })

    it('handles undefined pieces', async () => {
      const { result } = renderHook(() => useSuggestions({}))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.learnedTopics).toEqual([])
    })
  })
})

describe('extractLearnedTopics', () => {
  it('extracts topic names from pieces with topicName', () => {
    const pieces = [
      { id: '1', topicName: 'Volcanoes' },
      { id: '2', topicName: 'Mountains' },
    ]

    const result = extractLearnedTopics(pieces)

    expect(result).toEqual(['Volcanoes', 'Mountains'])
  })

  it('extracts topic names from pieces with name fallback', () => {
    const pieces = [
      { id: '1', name: 'Rivers' },
      { id: '2', name: 'Oceans' },
    ]

    const result = extractLearnedTopics(pieces)

    expect(result).toEqual(['Rivers', 'Oceans'])
  })

  it('prefers topicName over name', () => {
    const pieces = [
      { id: '1', topicName: 'Volcanoes', name: 'volcano-piece' },
    ]

    const result = extractLearnedTopics(pieces)

    expect(result).toEqual(['Volcanoes'])
  })

  it('filters out null/undefined names', () => {
    const pieces = [
      { id: '1', topicName: 'Volcanoes' },
      { id: '2' },
      { id: '3', topicName: null },
      { id: '4', topicName: 'Mountains' },
    ]

    const result = extractLearnedTopics(pieces)

    expect(result).toEqual(['Volcanoes', 'Mountains'])
  })

  it('returns empty array for empty pieces', () => {
    expect(extractLearnedTopics([])).toEqual([])
  })

  it('returns empty array for non-array input', () => {
    expect(extractLearnedTopics(null)).toEqual([])
    expect(extractLearnedTopics(undefined)).toEqual([])
    expect(extractLearnedTopics({})).toEqual([])
  })
})

describe('countZones', () => {
  it('counts pieces per zone correctly', () => {
    const pieces = [
      { id: '1', zone: 'nature' },
      { id: '2', zone: 'nature' },
      { id: '3', zone: 'civilization' },
      { id: '4', zone: 'arcane' },
    ]

    const result = countZones(pieces)

    expect(result).toEqual({
      nature: 2,
      civilization: 1,
      arcane: 1,
    })
  })

  it('handles case-insensitive zone names', () => {
    const pieces = [
      { id: '1', zone: 'Nature' },
      { id: '2', zone: 'CIVILIZATION' },
    ]

    const result = countZones(pieces)

    expect(result).toEqual({
      nature: 1,
      civilization: 1,
      arcane: 0,
    })
  })

  it('ignores unknown zones', () => {
    const pieces = [
      { id: '1', zone: 'nature' },
      { id: '2', zone: 'unknown' },
      { id: '3', zone: 'invalid' },
    ]

    const result = countZones(pieces)

    expect(result).toEqual({
      nature: 1,
      civilization: 0,
      arcane: 0,
    })
  })

  it('returns zero counts for empty pieces', () => {
    expect(countZones([])).toEqual({
      nature: 0,
      civilization: 0,
      arcane: 0,
    })
  })

  it('returns zero counts for non-array input', () => {
    expect(countZones(null)).toEqual({
      nature: 0,
      civilization: 0,
      arcane: 0,
    })
  })
})

describe('createPiecesHash', () => {
  it('creates consistent hash for same pieces', () => {
    const pieces = [
      { id: '1', topicName: 'Volcanoes' },
      { id: '2', topicName: 'Mountains' },
    ]

    const hash1 = createPiecesHash(pieces)
    const hash2 = createPiecesHash([...pieces])

    expect(hash1).toBe(hash2)
  })

  it('creates different hash for different pieces', () => {
    const pieces1 = [{ id: '1', topicName: 'Volcanoes' }]
    const pieces2 = [{ id: '2', topicName: 'Mountains' }]

    const hash1 = createPiecesHash(pieces1)
    const hash2 = createPiecesHash(pieces2)

    expect(hash1).not.toBe(hash2)
  })

  it('returns "empty" for empty array', () => {
    expect(createPiecesHash([])).toBe('empty')
  })

  it('returns "empty" for non-array input', () => {
    expect(createPiecesHash(null)).toBe('empty')
    expect(createPiecesHash(undefined)).toBe('empty')
  })

  it('uses id for hash if available', () => {
    const pieces = [{ id: 'unique-id-123' }]
    const hash = createPiecesHash(pieces)

    expect(hash).toContain('unique-id-123')
  })

  it('falls back to topicName for hash if no id', () => {
    const pieces = [{ topicName: 'Volcanoes' }]
    const hash = createPiecesHash(pieces)

    expect(hash).toContain('Volcanoes')
  })
})
