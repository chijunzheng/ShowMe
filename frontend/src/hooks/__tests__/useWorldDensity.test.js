/**
 * useWorldDensity Hook Tests
 *
 * TDD tests for the World Density management hook.
 * This hook analyzes pieces by zone and returns density classifications,
 * visible pieces, stats, and indicators for overflow.
 *
 * Density Thresholds:
 * - Sparse: < 8 pieces per zone
 * - Moderate: 8-15 pieces per zone
 * - Dense: 15-25 pieces per zone
 * - Crowded: 25+ pieces per zone
 *
 * Freshness States:
 * - Fresh: 0-7 days since last review
 * - Fading: 7-14 days since last review
 * - Sleepy: 14+ days since last review
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Note: The hook will be implemented based on these tests (TDD approach)
// For now, we import from the expected location
import useWorldDensity, {
  DensityManager,
  DENSITY_THRESHOLDS,
  calculateFreshness,
  groupByTopicSimilarity,
  smartSamplePieces,
} from '../useWorldDensity'

// Test fixtures - pieces with various zones and freshness states
const createPiece = (overrides = {}) => ({
  id: `piece_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
  name: 'Test Topic',
  zone: 'nature',
  icon: '🌿',
  imageUrl: null,
  unlockedAt: new Date().toISOString(),
  lastReviewedAt: null,
  evolutionTier: 'seedling',
  ...overrides,
})

// Helper to create multiple pieces
const createPieces = (count, overrides = {}) => {
  return Array.from({ length: count }, (_, i) =>
    createPiece({
      id: `piece_${i}`,
      name: `Topic ${i}`,
      ...overrides,
    })
  )
}

// Helper to create pieces with specific zones
const createZonedPieces = (naturePieces, civPieces, arcanePieces) => {
  return [
    ...createPieces(naturePieces, { zone: 'nature' }),
    ...createPieces(civPieces, { zone: 'civilization' }),
    ...createPieces(arcanePieces, { zone: 'arcane' }),
  ]
}

// Helper to create dated piece for freshness testing
const createDatedPiece = (daysAgo, overrides = {}) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return createPiece({
    lastReviewedAt: date.toISOString(),
    ...overrides,
  })
}

describe('useWorldDensity', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-31T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('returns expected initial state structure', () => {
      const { result } = renderHook(() => useWorldDensity([]))

      expect(result.current).toEqual({
        zoneDensities: {
          nature: 'sparse',
          civilization: 'sparse',
          arcane: 'sparse',
        },
        visiblePieces: {
          nature: [],
          civilization: [],
          arcane: [],
        },
        stats: {
          total: 0,
          freshCount: 0,
          fadingCount: 0,
          sleepyCount: 0,
        },
        showMoreIndicator: {
          nature: false,
          civilization: false,
          arcane: false,
        },
      })
    })

    it('accepts undefined pieces and returns defaults', () => {
      const { result } = renderHook(() => useWorldDensity(undefined))

      expect(result.current.zoneDensities).toBeDefined()
      expect(result.current.visiblePieces).toBeDefined()
      expect(result.current.stats.total).toBe(0)
    })

    it('accepts null pieces and returns defaults', () => {
      const { result } = renderHook(() => useWorldDensity(null))

      expect(result.current.zoneDensities.nature).toBe('sparse')
      expect(result.current.stats.total).toBe(0)
    })
  })

  describe('sparse zone (< 8 pieces)', () => {
    it('classifies zone with 0 pieces as sparse', () => {
      const pieces = createZonedPieces(0, 5, 3)
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.zoneDensities.nature).toBe('sparse')
    })

    it('classifies zone with 1-7 pieces as sparse', () => {
      const pieces = createZonedPieces(5, 0, 0)
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.zoneDensities.nature).toBe('sparse')
    })

    it('shows all pieces in sparse zone', () => {
      const pieces = createPieces(5, { zone: 'nature' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.visiblePieces.nature).toHaveLength(5)
      expect(result.current.visiblePieces.nature).toEqual(pieces)
    })

    it('does not show more indicator for sparse zone', () => {
      const pieces = createPieces(7, { zone: 'civilization' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.showMoreIndicator.civilization).toBe(false)
    })

    it('classifies exactly 7 pieces as sparse (boundary)', () => {
      const pieces = createPieces(7, { zone: 'arcane' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.zoneDensities.arcane).toBe('sparse')
    })
  })

  describe('moderate zone (8-15 pieces)', () => {
    it('classifies zone with 8 pieces as moderate (lower boundary)', () => {
      const pieces = createPieces(8, { zone: 'nature' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.zoneDensities.nature).toBe('moderate')
    })

    it('classifies zone with 15 pieces as moderate (upper boundary)', () => {
      const pieces = createPieces(15, { zone: 'civilization' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.zoneDensities.civilization).toBe('moderate')
    })

    it('classifies zone with 12 pieces as moderate', () => {
      const pieces = createPieces(12, { zone: 'arcane' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.zoneDensities.arcane).toBe('moderate')
    })

    it('groups similar topics in moderate zone', () => {
      const pieces = [
        createPiece({ zone: 'nature', name: 'Volcano Formation' }),
        createPiece({ zone: 'nature', name: 'Volcano Eruptions' }),
        createPiece({ zone: 'nature', name: 'Volcanic Ash' }),
        createPiece({ zone: 'nature', name: 'Mountain Ranges' }),
        createPiece({ zone: 'nature', name: 'Mountain Climbing' }),
        createPiece({ zone: 'nature', name: 'River Flow' }),
        createPiece({ zone: 'nature', name: 'Ocean Currents' }),
        createPiece({ zone: 'nature', name: 'Ocean Depths' }),
      ]
      const { result } = renderHook(() => useWorldDensity(pieces))

      // Should have grouped some pieces
      expect(result.current.visiblePieces.nature.length).toBeLessThanOrEqual(8)
      expect(result.current.zoneDensities.nature).toBe('moderate')
    })

    it('may show more indicator for moderate zone when pieces are grouped', () => {
      const pieces = createPieces(12, { zone: 'nature' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      // With 12 pieces, some may be hidden due to grouping
      // The exact behavior depends on the grouping algorithm
      expect(result.current.zoneDensities.nature).toBe('moderate')
    })
  })

  describe('dense zone (15-25 pieces)', () => {
    it('classifies zone with 16 pieces as dense (lower boundary)', () => {
      const pieces = createPieces(16, { zone: 'nature' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.zoneDensities.nature).toBe('dense')
    })

    it('classifies zone with 25 pieces as dense (upper boundary)', () => {
      const pieces = createPieces(25, { zone: 'civilization' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.zoneDensities.civilization).toBe('dense')
    })

    it('classifies zone with 20 pieces as dense', () => {
      const pieces = createPieces(20, { zone: 'arcane' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.zoneDensities.arcane).toBe('dense')
    })

    it('shows zone summary (reduced visible pieces) for dense zone', () => {
      const pieces = createPieces(20, { zone: 'nature' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      // Dense zones should show a summarized view
      expect(result.current.visiblePieces.nature.length).toBeLessThan(20)
    })

    it('shows more indicator for dense zone', () => {
      const pieces = createPieces(20, { zone: 'civilization' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.showMoreIndicator.civilization).toBe(true)
    })

    it('prioritizes fresh and high-tier pieces in dense zone summary', () => {
      const pieces = [
        // Fresh legendary piece
        createPiece({
          id: 'legendary-fresh',
          zone: 'nature',
          name: 'Important Topic',
          evolutionTier: 'legendary',
          lastReviewedAt: new Date().toISOString(),
        }),
        // Sleepy seedling pieces
        ...Array.from({ length: 19 }, (_, i) =>
          createDatedPiece(20, {
            id: `old-${i}`,
            zone: 'nature',
            name: `Old Topic ${i}`,
            evolutionTier: 'seedling',
          })
        ),
      ]
      const { result } = renderHook(() => useWorldDensity(pieces))

      // The legendary fresh piece should be included
      const legendaryPiece = result.current.visiblePieces.nature.find(
        (p) => p.id === 'legendary-fresh'
      )
      expect(legendaryPiece).toBeDefined()
    })
  })

  describe('crowded zone (25+ pieces)', () => {
    it('classifies zone with 26 pieces as crowded (lower boundary)', () => {
      const pieces = createPieces(26, { zone: 'nature' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.zoneDensities.nature).toBe('crowded')
    })

    it('classifies zone with 50 pieces as crowded', () => {
      const pieces = createPieces(50, { zone: 'civilization' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.zoneDensities.civilization).toBe('crowded')
    })

    it('classifies zone with 100 pieces as crowded', () => {
      const pieces = createPieces(100, { zone: 'arcane' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.zoneDensities.arcane).toBe('crowded')
    })

    it('uses smart sampling for crowded zone', () => {
      const pieces = createPieces(50, { zone: 'nature' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      // Crowded zones should show a small sampled subset
      expect(result.current.visiblePieces.nature.length).toBeLessThanOrEqual(12)
    })

    it('shows more indicator for crowded zone', () => {
      const pieces = createPieces(30, { zone: 'arcane' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.showMoreIndicator.arcane).toBe(true)
    })

    it('smart sampling includes diverse evolution tiers', () => {
      const pieces = [
        ...Array.from({ length: 10 }, (_, i) =>
          createPiece({
            id: `legendary-${i}`,
            zone: 'nature',
            evolutionTier: 'legendary',
          })
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          createPiece({
            id: `flourishing-${i}`,
            zone: 'nature',
            evolutionTier: 'flourishing',
          })
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          createPiece({
            id: `growing-${i}`,
            zone: 'nature',
            evolutionTier: 'growing',
          })
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          createPiece({
            id: `seedling-${i}`,
            zone: 'nature',
            evolutionTier: 'seedling',
          })
        ),
      ]
      const { result } = renderHook(() => useWorldDensity(pieces))

      const visibleTiers = result.current.visiblePieces.nature.map(
        (p) => p.evolutionTier
      )

      // Smart sampling should include some variety of tiers
      const hasSomeHighTier = visibleTiers.some(
        (t) => t === 'legendary' || t === 'flourishing'
      )
      expect(hasSomeHighTier).toBe(true)
    })

    it('smart sampling prioritizes recently reviewed pieces', () => {
      const pieces = [
        // Fresh pieces
        ...Array.from({ length: 5 }, (_, i) =>
          createPiece({
            id: `fresh-${i}`,
            zone: 'civilization',
            lastReviewedAt: new Date().toISOString(),
          })
        ),
        // Sleepy pieces (20+ days old)
        ...Array.from({ length: 30 }, (_, i) =>
          createDatedPiece(25, {
            id: `sleepy-${i}`,
            zone: 'civilization',
          })
        ),
      ]
      const { result } = renderHook(() => useWorldDensity(pieces))

      // Fresh pieces should be represented in the sample
      const freshPiecesInSample = result.current.visiblePieces.civilization.filter(
        (p) => p.id.startsWith('fresh-')
      )
      expect(freshPiecesInSample.length).toBeGreaterThan(0)
    })
  })

  describe('freshness distribution stats', () => {
    it('counts fresh pieces (0-7 days)', () => {
      const pieces = [
        createDatedPiece(0, { zone: 'nature' }), // Today
        createDatedPiece(3, { zone: 'nature' }), // 3 days ago
        createDatedPiece(7, { zone: 'nature' }), // 7 days ago (boundary)
      ]
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.stats.freshCount).toBe(3)
    })

    it('counts fading pieces (7-14 days)', () => {
      const pieces = [
        createDatedPiece(8, { zone: 'civilization' }), // 8 days ago
        createDatedPiece(10, { zone: 'civilization' }), // 10 days ago
        createDatedPiece(14, { zone: 'civilization' }), // 14 days ago (boundary)
      ]
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.stats.fadingCount).toBe(3)
    })

    it('counts sleepy pieces (14+ days)', () => {
      const pieces = [
        createDatedPiece(15, { zone: 'arcane' }), // 15 days ago
        createDatedPiece(30, { zone: 'arcane' }), // 30 days ago
        createDatedPiece(100, { zone: 'arcane' }), // 100 days ago
      ]
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.stats.sleepyCount).toBe(3)
    })

    it('calculates total piece count across all zones', () => {
      const pieces = createZonedPieces(5, 10, 3)
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.stats.total).toBe(18)
    })

    it('correctly calculates mixed freshness distribution', () => {
      const pieces = [
        // Fresh (3 pieces)
        createDatedPiece(0, { zone: 'nature' }),
        createDatedPiece(5, { zone: 'civilization' }),
        createDatedPiece(7, { zone: 'arcane' }),
        // Fading (2 pieces)
        createDatedPiece(10, { zone: 'nature' }),
        createDatedPiece(12, { zone: 'civilization' }),
        // Sleepy (2 pieces)
        createDatedPiece(20, { zone: 'arcane' }),
        createDatedPiece(50, { zone: 'nature' }),
      ]
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.stats.total).toBe(7)
      expect(result.current.stats.freshCount).toBe(3)
      expect(result.current.stats.fadingCount).toBe(2)
      expect(result.current.stats.sleepyCount).toBe(2)
    })

    it('treats pieces without lastReviewedAt as fresh (uses unlockedAt)', () => {
      const recentUnlockedPiece = createPiece({
        zone: 'nature',
        lastReviewedAt: null,
        unlockedAt: new Date().toISOString(),
      })
      const { result } = renderHook(() => useWorldDensity([recentUnlockedPiece]))

      expect(result.current.stats.freshCount).toBe(1)
    })

    it('treats pieces without any date as fresh', () => {
      const piece = createPiece({
        zone: 'nature',
        lastReviewedAt: null,
        unlockedAt: null,
      })
      const { result } = renderHook(() => useWorldDensity([piece]))

      // Pieces without dates default to fresh (conservative assumption)
      expect(result.current.stats.freshCount).toBe(1)
    })
  })

  describe('showMoreIndicator', () => {
    it('is false when all pieces are shown (sparse)', () => {
      const pieces = createPieces(5, { zone: 'nature' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.showMoreIndicator.nature).toBe(false)
      expect(result.current.showMoreIndicator.civilization).toBe(false)
      expect(result.current.showMoreIndicator.arcane).toBe(false)
    })

    it('is true when pieces are hidden due to density', () => {
      const pieces = createPieces(30, { zone: 'civilization' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.showMoreIndicator.civilization).toBe(true)
    })

    it('is zone-specific', () => {
      const pieces = [
        ...createPieces(5, { zone: 'nature' }), // sparse - no indicator
        ...createPieces(30, { zone: 'civilization' }), // crowded - has indicator
        ...createPieces(3, { zone: 'arcane' }), // sparse - no indicator
      ]
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.showMoreIndicator.nature).toBe(false)
      expect(result.current.showMoreIndicator.civilization).toBe(true)
      expect(result.current.showMoreIndicator.arcane).toBe(false)
    })

    it('correctly reflects hidden piece count', () => {
      const pieces = createPieces(25, { zone: 'arcane' })
      const { result } = renderHook(() => useWorldDensity(pieces))

      const visibleCount = result.current.visiblePieces.arcane.length
      const hasMore = result.current.showMoreIndicator.arcane

      // If there are hidden pieces, indicator should be true
      if (visibleCount < 25) {
        expect(hasMore).toBe(true)
      }
    })
  })

  describe('multiple zones simultaneously', () => {
    it('handles different density levels per zone', () => {
      const pieces = [
        ...createPieces(3, { zone: 'nature' }), // sparse
        ...createPieces(12, { zone: 'civilization' }), // moderate
        ...createPieces(35, { zone: 'arcane' }), // crowded
      ]
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.zoneDensities.nature).toBe('sparse')
      expect(result.current.zoneDensities.civilization).toBe('moderate')
      expect(result.current.zoneDensities.arcane).toBe('crowded')
    })

    it('separates visible pieces correctly by zone', () => {
      const naturePieces = createPieces(4, { zone: 'nature' })
      const civPieces = createPieces(6, { zone: 'civilization' })
      const pieces = [...naturePieces, ...civPieces]

      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.visiblePieces.nature).toHaveLength(4)
      expect(result.current.visiblePieces.civilization).toHaveLength(6)
      expect(result.current.visiblePieces.arcane).toHaveLength(0)

      // Verify pieces are in correct zones
      result.current.visiblePieces.nature.forEach((p) => {
        expect(p.zone).toBe('nature')
      })
      result.current.visiblePieces.civilization.forEach((p) => {
        expect(p.zone).toBe('civilization')
      })
    })

    it('calculates total stats across all zones', () => {
      const pieces = [
        createDatedPiece(2, { zone: 'nature' }), // fresh
        createDatedPiece(10, { zone: 'civilization' }), // fading
        createDatedPiece(20, { zone: 'arcane' }), // sleepy
      ]
      const { result } = renderHook(() => useWorldDensity(pieces))

      expect(result.current.stats.total).toBe(3)
      expect(result.current.stats.freshCount).toBe(1)
      expect(result.current.stats.fadingCount).toBe(1)
      expect(result.current.stats.sleepyCount).toBe(1)
    })
  })

  describe('reactivity', () => {
    it('updates when pieces array changes', () => {
      const initialPieces = createPieces(5, { zone: 'nature' })
      const { result, rerender } = renderHook(
        ({ pieces }) => useWorldDensity(pieces),
        { initialProps: { pieces: initialPieces } }
      )

      expect(result.current.stats.total).toBe(5)
      expect(result.current.zoneDensities.nature).toBe('sparse')

      // Add more pieces to trigger moderate density
      const morePieces = [...initialPieces, ...createPieces(5, { zone: 'nature' })]
      rerender({ pieces: morePieces })

      expect(result.current.stats.total).toBe(10)
      expect(result.current.zoneDensities.nature).toBe('moderate')
    })

    it('updates when piece content changes', () => {
      const initialPieces = [createDatedPiece(5, { zone: 'nature' })]
      const { result, rerender } = renderHook(
        ({ pieces }) => useWorldDensity(pieces),
        { initialProps: { pieces: initialPieces } }
      )

      expect(result.current.stats.freshCount).toBe(1)

      // Update piece to be older
      const olderPieces = [createDatedPiece(20, { zone: 'nature' })]
      rerender({ pieces: olderPieces })

      expect(result.current.stats.sleepyCount).toBe(1)
      expect(result.current.stats.freshCount).toBe(0)
    })

    it('memoizes results for stable references', () => {
      const pieces = createPieces(5, { zone: 'nature' })
      const { result, rerender } = renderHook(
        ({ pieces }) => useWorldDensity(pieces),
        { initialProps: { pieces } }
      )

      const firstResult = result.current
      rerender({ pieces }) // Same pieces

      // Same input should produce stable references
      expect(result.current.zoneDensities).toEqual(firstResult.zoneDensities)
    })
  })

  describe('edge cases', () => {
    it('handles empty pieces array', () => {
      const { result } = renderHook(() => useWorldDensity([]))

      expect(result.current.stats.total).toBe(0)
      expect(result.current.zoneDensities.nature).toBe('sparse')
      expect(result.current.visiblePieces.nature).toEqual([])
    })

    it('handles pieces with unknown zone', () => {
      const pieces = [
        createPiece({ zone: 'unknown' }),
        createPiece({ zone: 'nature' }),
      ]
      const { result } = renderHook(() => useWorldDensity(pieces))

      // Unknown zone pieces should be handled gracefully
      expect(result.current.stats.total).toBe(2)
      expect(result.current.visiblePieces.nature).toHaveLength(1)
    })

    it('handles pieces with missing zone property', () => {
      const pieceWithoutZone = { id: 'no-zone', name: 'No Zone Piece' }
      const pieces = [pieceWithoutZone, createPiece({ zone: 'nature' })]
      const { result } = renderHook(() => useWorldDensity(pieces))

      // Should not crash, count valid pieces
      expect(result.current.visiblePieces.nature).toHaveLength(1)
    })

    it('handles very large piece counts efficiently', () => {
      const pieces = createPieces(1000, { zone: 'civilization' })
      const startTime = performance.now()

      const { result } = renderHook(() => useWorldDensity(pieces))

      const endTime = performance.now()

      expect(result.current.zoneDensities.civilization).toBe('crowded')
      expect(result.current.visiblePieces.civilization.length).toBeLessThanOrEqual(
        15
      )
      // Should complete reasonably quickly (< 100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('handles duplicate piece IDs gracefully', () => {
      const pieces = [
        createPiece({ id: 'same-id', zone: 'nature' }),
        createPiece({ id: 'same-id', zone: 'nature' }),
        createPiece({ id: 'different-id', zone: 'nature' }),
      ]
      const { result } = renderHook(() => useWorldDensity(pieces))

      // Should handle duplicates without crashing
      expect(result.current.stats.total).toBe(3)
    })
  })
})

describe('DensityManager utility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-31T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getDensityLevel', () => {
    it('returns sparse for 0-7 pieces', () => {
      expect(DensityManager.getDensityLevel(0)).toBe('sparse')
      expect(DensityManager.getDensityLevel(5)).toBe('sparse')
      expect(DensityManager.getDensityLevel(7)).toBe('sparse')
    })

    it('returns moderate for 8-15 pieces', () => {
      expect(DensityManager.getDensityLevel(8)).toBe('moderate')
      expect(DensityManager.getDensityLevel(12)).toBe('moderate')
      expect(DensityManager.getDensityLevel(15)).toBe('moderate')
    })

    it('returns dense for 16-25 pieces', () => {
      expect(DensityManager.getDensityLevel(16)).toBe('dense')
      expect(DensityManager.getDensityLevel(20)).toBe('dense')
      expect(DensityManager.getDensityLevel(25)).toBe('dense')
    })

    it('returns crowded for 26+ pieces', () => {
      expect(DensityManager.getDensityLevel(26)).toBe('crowded')
      expect(DensityManager.getDensityLevel(50)).toBe('crowded')
      expect(DensityManager.getDensityLevel(100)).toBe('crowded')
    })
  })

  describe('getVisiblePieces', () => {
    it('returns all pieces for sparse density', () => {
      const pieces = createPieces(5, { zone: 'nature' })
      const result = DensityManager.getVisiblePieces(pieces, 'sparse')

      expect(result).toHaveLength(5)
      expect(result).toEqual(pieces)
    })

    it('applies grouping for moderate density', () => {
      const pieces = createPieces(12, { zone: 'nature' })
      const result = DensityManager.getVisiblePieces(pieces, 'moderate')

      expect(result.length).toBeLessThanOrEqual(12)
    })

    it('returns summarized pieces for dense density', () => {
      const pieces = createPieces(20, { zone: 'nature' })
      const result = DensityManager.getVisiblePieces(pieces, 'dense')

      expect(result.length).toBeLessThan(20)
    })

    it('returns sampled pieces for crowded density', () => {
      const pieces = createPieces(50, { zone: 'nature' })
      const result = DensityManager.getVisiblePieces(pieces, 'crowded')

      expect(result.length).toBeLessThanOrEqual(12)
    })
  })

  describe('groupPiecesByZone', () => {
    it('correctly groups pieces by zone', () => {
      const pieces = createZonedPieces(3, 5, 2)
      const grouped = DensityManager.groupPiecesByZone(pieces)

      expect(grouped.nature).toHaveLength(3)
      expect(grouped.civilization).toHaveLength(5)
      expect(grouped.arcane).toHaveLength(2)
    })

    it('returns empty arrays for empty zones', () => {
      const pieces = createPieces(5, { zone: 'nature' })
      const grouped = DensityManager.groupPiecesByZone(pieces)

      expect(grouped.nature).toHaveLength(5)
      expect(grouped.civilization).toHaveLength(0)
      expect(grouped.arcane).toHaveLength(0)
    })

    it('handles empty input', () => {
      const grouped = DensityManager.groupPiecesByZone([])

      expect(grouped.nature).toEqual([])
      expect(grouped.civilization).toEqual([])
      expect(grouped.arcane).toEqual([])
    })
  })
})

describe('calculateFreshness utility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-31T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns fresh for pieces reviewed today', () => {
    const piece = createDatedPiece(0)
    expect(calculateFreshness(piece)).toBe('fresh')
  })

  it('returns fresh for pieces reviewed within 7 days', () => {
    expect(calculateFreshness(createDatedPiece(1))).toBe('fresh')
    expect(calculateFreshness(createDatedPiece(5))).toBe('fresh')
    expect(calculateFreshness(createDatedPiece(7))).toBe('fresh')
  })

  it('returns fading for pieces reviewed 8-14 days ago', () => {
    expect(calculateFreshness(createDatedPiece(8))).toBe('fading')
    expect(calculateFreshness(createDatedPiece(10))).toBe('fading')
    expect(calculateFreshness(createDatedPiece(14))).toBe('fading')
  })

  it('returns sleepy for pieces reviewed 15+ days ago', () => {
    expect(calculateFreshness(createDatedPiece(15))).toBe('sleepy')
    expect(calculateFreshness(createDatedPiece(30))).toBe('sleepy')
    expect(calculateFreshness(createDatedPiece(100))).toBe('sleepy')
  })

  it('uses unlockedAt when lastReviewedAt is null', () => {
    const piece = createPiece({
      lastReviewedAt: null,
      unlockedAt: new Date().toISOString(),
    })
    expect(calculateFreshness(piece)).toBe('fresh')
  })

  it('returns fresh for pieces with no dates', () => {
    const piece = createPiece({
      lastReviewedAt: null,
      unlockedAt: null,
    })
    expect(calculateFreshness(piece)).toBe('fresh')
  })
})

describe('groupByTopicSimilarity utility', () => {
  it('groups pieces with similar topic names', () => {
    const pieces = [
      createPiece({ name: 'Volcano Formation' }),
      createPiece({ name: 'Volcano Eruptions' }),
      createPiece({ name: 'Mountain Ranges' }),
    ]
    const grouped = groupByTopicSimilarity(pieces)

    // Should identify volcano-related pieces as similar
    expect(Array.isArray(grouped)).toBe(true)
  })

  it('keeps distinct topics separate', () => {
    const pieces = [
      createPiece({ name: 'Ocean Currents' }),
      createPiece({ name: 'Space Exploration' }),
      createPiece({ name: 'Ancient Egypt' }),
    ]
    const grouped = groupByTopicSimilarity(pieces)

    // Distinct topics should remain separate
    expect(grouped.length).toBeGreaterThanOrEqual(3)
  })

  it('handles empty input', () => {
    const grouped = groupByTopicSimilarity([])
    expect(grouped).toEqual([])
  })

  it('handles single piece', () => {
    const pieces = [createPiece({ name: 'Single Topic' })]
    const grouped = groupByTopicSimilarity(pieces)

    expect(grouped).toHaveLength(1)
  })
})

describe('smartSamplePieces utility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-31T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns all pieces if count is less than max', () => {
    const pieces = createPieces(5, { zone: 'nature' })
    const sampled = smartSamplePieces(pieces, 10)

    expect(sampled).toHaveLength(5)
    expect(sampled).toEqual(pieces)
  })

  it('limits output to maxPieces', () => {
    const pieces = createPieces(50, { zone: 'nature' })
    const sampled = smartSamplePieces(pieces, 10)

    expect(sampled).toHaveLength(10)
  })

  it('prioritizes legendary tier pieces', () => {
    const pieces = [
      ...createPieces(10, { zone: 'nature', evolutionTier: 'seedling' }),
      createPiece({ zone: 'nature', evolutionTier: 'legendary', id: 'legend' }),
    ]
    const sampled = smartSamplePieces(pieces, 5)

    const hasLegendary = sampled.some((p) => p.id === 'legend')
    expect(hasLegendary).toBe(true)
  })

  it('prioritizes fresh pieces', () => {
    const pieces = [
      ...Array.from({ length: 10 }, (_, i) =>
        createDatedPiece(30, { zone: 'nature', id: `old-${i}` })
      ),
      createPiece({
        zone: 'nature',
        id: 'fresh-piece',
        lastReviewedAt: new Date().toISOString(),
      }),
    ]
    const sampled = smartSamplePieces(pieces, 5)

    const hasFresh = sampled.some((p) => p.id === 'fresh-piece')
    expect(hasFresh).toBe(true)
  })

  it('includes variety of tiers when possible', () => {
    const pieces = [
      ...createPieces(5, { zone: 'nature', evolutionTier: 'legendary' }),
      ...createPieces(5, { zone: 'nature', evolutionTier: 'flourishing' }),
      ...createPieces(5, { zone: 'nature', evolutionTier: 'growing' }),
      ...createPieces(5, { zone: 'nature', evolutionTier: 'seedling' }),
    ]
    const sampled = smartSamplePieces(pieces, 8)

    const tiers = new Set(sampled.map((p) => p.evolutionTier))
    expect(tiers.size).toBeGreaterThan(1)
  })

  it('handles empty input', () => {
    const sampled = smartSamplePieces([], 10)
    expect(sampled).toEqual([])
  })

  it('maintains piece identity (no duplication)', () => {
    const pieces = createPieces(20, { zone: 'nature' })
    const sampled = smartSamplePieces(pieces, 10)

    const ids = sampled.map((p) => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
})

describe('DENSITY_THRESHOLDS constant', () => {
  it('exports correct threshold values', () => {
    expect(DENSITY_THRESHOLDS).toEqual({
      SPARSE_MAX: 7,
      MODERATE_MAX: 15,
      DENSE_MAX: 25,
    })
  })
})
