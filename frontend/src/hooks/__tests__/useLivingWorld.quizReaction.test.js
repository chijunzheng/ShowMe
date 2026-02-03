/**
 * useLivingWorld Quiz Reaction Tests
 *
 * TDD: These tests define the behavior for quiz reaction integration
 * in the Living World hook BEFORE implementation.
 *
 * New functionality:
 * - pendingQuizReaction: State for current quiz reaction to display
 * - triggerQuizReaction(type, options): Method to trigger a tree reaction
 *
 * Test Coverage Target: 80%+
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
  topicsLearned: ['Volcanoes', 'Pyramids', 'Dinosaurs'],
  evolutions: [
    { topicName: 'Volcanoes', category: 'nature', timestamp: '2024-01-01' },
    { topicName: 'Pyramids', category: 'history', timestamp: '2024-01-02' },
    { topicName: 'Dinosaurs', category: 'animals', timestamp: '2024-01-03' },
  ],
  worldImageUrl: 'https://example.com/world.png',
}

describe('useLivingWorld - Quiz Reaction Integration', () => {
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

  describe('pendingQuizReaction state', () => {
    it('returns pendingQuizReaction in hook result', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current).toHaveProperty('pendingQuizReaction')
    })

    it('pendingQuizReaction is null initially', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.pendingQuizReaction).toBeNull()
    })
  })

  describe('triggerQuizReaction method', () => {
    it('returns triggerQuizReaction function', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(typeof result.current.triggerQuizReaction).toBe('function')
    })

    it('sets pendingQuizReaction when called with "pass"', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.triggerQuizReaction('pass', { score: 80 })
      })

      expect(result.current.pendingQuizReaction).toEqual({
        type: 'pass',
        score: 80,
        timestamp: expect.any(Number),
      })
    })

    it('sets pendingQuizReaction when called with "perfect"', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.triggerQuizReaction('perfect', { score: 100, topicName: 'Volcanoes' })
      })

      expect(result.current.pendingQuizReaction).toEqual({
        type: 'perfect',
        score: 100,
        topicName: 'Volcanoes',
        timestamp: expect.any(Number),
      })
    })

    it('sets pendingQuizReaction when called with "boss_victory"', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.triggerQuizReaction('boss_victory', {
          score: 100,
          topicName: 'Boss Battle',
        })
      })

      expect(result.current.pendingQuizReaction).toEqual({
        type: 'boss_victory',
        score: 100,
        topicName: 'Boss Battle',
        timestamp: expect.any(Number),
      })
    })

    it('sets pendingQuizReaction when called with "streak"', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.triggerQuizReaction('streak', { streakCount: 5 })
      })

      expect(result.current.pendingQuizReaction).toEqual({
        type: 'streak',
        streakCount: 5,
        timestamp: expect.any(Number),
      })
    })

    it('sets pendingQuizReaction when called with "fail"', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.triggerQuizReaction('fail', { score: 40 })
      })

      expect(result.current.pendingQuizReaction).toEqual({
        type: 'fail',
        score: 40,
        timestamp: expect.any(Number),
      })
    })

    it('includes timestamp in pendingQuizReaction', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const beforeTime = Date.now()

      act(() => {
        result.current.triggerQuizReaction('pass', { score: 75 })
      })

      const afterTime = Date.now()

      expect(result.current.pendingQuizReaction.timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(result.current.pendingQuizReaction.timestamp).toBeLessThanOrEqual(afterTime)
    })

    it('handles call without options', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.triggerQuizReaction('pass')
      })

      expect(result.current.pendingQuizReaction).toEqual({
        type: 'pass',
        timestamp: expect.any(Number),
      })
    })

    it('overwrites previous reaction when called again', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.triggerQuizReaction('pass', { score: 70 })
      })

      expect(result.current.pendingQuizReaction.type).toBe('pass')

      act(() => {
        result.current.triggerQuizReaction('perfect', { score: 100 })
      })

      expect(result.current.pendingQuizReaction.type).toBe('perfect')
      expect(result.current.pendingQuizReaction.score).toBe(100)
    })
  })

  describe('clearQuizReaction method', () => {
    it('returns clearQuizReaction function', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(typeof result.current.clearQuizReaction).toBe('function')
    })

    it('clears pendingQuizReaction when called', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Trigger a reaction
      act(() => {
        result.current.triggerQuizReaction('pass', { score: 80 })
      })

      expect(result.current.pendingQuizReaction).not.toBeNull()

      // Clear it
      act(() => {
        result.current.clearQuizReaction()
      })

      expect(result.current.pendingQuizReaction).toBeNull()
    })

    it('does nothing when pendingQuizReaction is already null', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.pendingQuizReaction).toBeNull()

      // Should not throw
      expect(() => {
        act(() => {
          result.current.clearQuizReaction()
        })
      }).not.toThrow()

      expect(result.current.pendingQuizReaction).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('handles unknown reaction type by falling back to pass', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.triggerQuizReaction('unknown_type', { score: 50 })
      })

      // Should still set the reaction with the provided type
      // The component/config will handle the fallback
      expect(result.current.pendingQuizReaction.type).toBe('unknown_type')
    })

    it('handles null type gracefully', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.triggerQuizReaction(null, { score: 50 })
      })

      // Should not crash, may set null type
      expect(result.current.pendingQuizReaction).toBeDefined()
    })

    it('handles undefined type gracefully', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.triggerQuizReaction(undefined)
      })

      // Should not crash
      expect(result.current.pendingQuizReaction).toBeDefined()
    })

    it('preserves other hook state when triggering reaction', async () => {
      const { result } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const originalWorldState = result.current.worldState
      const originalTreeLevel = result.current.treeLevel

      act(() => {
        result.current.triggerQuizReaction('perfect', { score: 100 })
      })

      // Original state should be preserved
      expect(result.current.worldState).toEqual(originalWorldState)
      expect(result.current.treeLevel).toBe(originalTreeLevel)
      expect(result.current.pendingQuizReaction.type).toBe('perfect')
    })
  })

  describe('integration with other hook state', () => {
    it('reaction can be triggered during evolution', async () => {
      let resolveEvolve
      const evolvePromise = new Promise((resolve) => {
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
        evolveResultPromise = result.current.evolveWorld('NewTopic', 'Summary')
      })

      await waitFor(() => {
        expect(result.current.isEvolving).toBe(true)
      })

      // Trigger reaction while evolving
      act(() => {
        result.current.triggerQuizReaction('pass', { score: 80 })
      })

      expect(result.current.pendingQuizReaction).not.toBeNull()
      expect(result.current.isEvolving).toBe(true)

      // Complete evolution
      await act(async () => {
        resolveEvolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              worldState: { ...mockWorldState, topicsLearned: [...mockWorldState.topicsLearned, 'NewTopic'] },
            }),
        })
        await evolveResultPromise
      })

      // Reaction should still be present after evolution completes
      expect(result.current.pendingQuizReaction).not.toBeNull()
      expect(result.current.isEvolving).toBe(false)
    })

    it('reaction state is independent of loading state', async () => {
      const { result } = renderHook(() => useLivingWorld())

      // While loading
      expect(result.current.isLoading).toBe(true)

      act(() => {
        result.current.triggerQuizReaction('pass', { score: 75 })
      })

      // Reaction should be set even while loading
      expect(result.current.pendingQuizReaction).not.toBeNull()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Reaction should persist after loading completes
      expect(result.current.pendingQuizReaction).not.toBeNull()
    })
  })

  describe('function reference stability', () => {
    it('triggerQuizReaction maintains stable reference', async () => {
      const { result, rerender } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const firstRef = result.current.triggerQuizReaction

      rerender()

      const secondRef = result.current.triggerQuizReaction

      expect(firstRef).toBe(secondRef)
    })

    it('clearQuizReaction maintains stable reference', async () => {
      const { result, rerender } = renderHook(() => useLivingWorld())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const firstRef = result.current.clearQuizReaction

      rerender()

      const secondRef = result.current.clearQuizReaction

      expect(firstRef).toBe(secondRef)
    })
  })
})
