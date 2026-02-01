/**
 * DensityManager Utility Tests
 *
 * TDD tests for the DensityManager utility that handles piece density
 * calculations, freshness tracking, and smart sampling for zones.
 *
 * Density modes:
 * - sparse: < 8 pieces
 * - moderate: 8-15 pieces
 * - dense: 15-25 pieces
 * - crowded: > 25 pieces
 *
 * Freshness categories (based on days since last review):
 * - fresh: reviewed within 7 days
 * - fading: 7-14 days since review
 * - sleepy: 14+ days (urgent review needed)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getDensityMode,
  getDaysSinceReview,
  getFreshnessCategory,
  samplePieces,
  DENSITY_MODES,
  FRESHNESS_THRESHOLDS,
} from '../DensityManager'

// Helper to create mock pieces with specific dates
const createMockPiece = (id, daysAgo, options = {}) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)

  return {
    id,
    name: options.name || `Piece ${id}`,
    zone: options.zone || 'default',
    lastReviewedAt: options.useUnlockedAt ? null : date.toISOString(),
    unlockedAt: options.useUnlockedAt ? date.toISOString() : null,
    ...options,
  }
}

// Helper to create array of mock pieces
const createMockPieces = (count, daysAgo = 0) => {
  return Array.from({ length: count }, (_, i) =>
    createMockPiece(`piece-${i}`, daysAgo)
  )
}

describe('DensityManager', () => {
  describe('constants', () => {
    describe('DENSITY_MODES', () => {
      it('exports DENSITY_MODES object with all expected modes', () => {
        expect(DENSITY_MODES).toBeDefined()
        expect(DENSITY_MODES.SPARSE).toBe('sparse')
        expect(DENSITY_MODES.MODERATE).toBe('moderate')
        expect(DENSITY_MODES.DENSE).toBe('dense')
        expect(DENSITY_MODES.CROWDED).toBe('crowded')
      })
    })

    describe('FRESHNESS_THRESHOLDS', () => {
      it('exports FRESHNESS_THRESHOLDS with correct day boundaries', () => {
        expect(FRESHNESS_THRESHOLDS).toBeDefined()
        expect(FRESHNESS_THRESHOLDS.FRESH).toBe(7)
        expect(FRESHNESS_THRESHOLDS.FADING).toBe(14)
      })
    })
  })

  describe('getDensityMode', () => {
    describe('sparse mode (< 8 pieces)', () => {
      it('returns sparse for 0 pieces', () => {
        expect(getDensityMode(0)).toBe('sparse')
      })

      it('returns sparse for 1 piece', () => {
        expect(getDensityMode(1)).toBe('sparse')
      })

      it('returns sparse for 7 pieces', () => {
        expect(getDensityMode(7)).toBe('sparse')
      })
    })

    describe('moderate mode (8-15 pieces)', () => {
      it('returns moderate for 8 pieces (lower boundary)', () => {
        expect(getDensityMode(8)).toBe('moderate')
      })

      it('returns moderate for 12 pieces (middle)', () => {
        expect(getDensityMode(12)).toBe('moderate')
      })

      it('returns moderate for 15 pieces (upper boundary)', () => {
        expect(getDensityMode(15)).toBe('moderate')
      })
    })

    describe('dense mode (15-25 pieces)', () => {
      it('returns dense for 16 pieces (lower boundary)', () => {
        expect(getDensityMode(16)).toBe('dense')
      })

      it('returns dense for 20 pieces (middle)', () => {
        expect(getDensityMode(20)).toBe('dense')
      })

      it('returns dense for 25 pieces (upper boundary)', () => {
        expect(getDensityMode(25)).toBe('dense')
      })
    })

    describe('crowded mode (> 25 pieces)', () => {
      it('returns crowded for 26 pieces', () => {
        expect(getDensityMode(26)).toBe('crowded')
      })

      it('returns crowded for 50 pieces', () => {
        expect(getDensityMode(50)).toBe('crowded')
      })

      it('returns crowded for 100 pieces', () => {
        expect(getDensityMode(100)).toBe('crowded')
      })
    })

    describe('edge cases', () => {
      it('handles negative numbers gracefully (returns sparse)', () => {
        expect(getDensityMode(-1)).toBe('sparse')
      })

      it('handles non-integer values by flooring', () => {
        expect(getDensityMode(7.9)).toBe('sparse')
        expect(getDensityMode(8.1)).toBe('moderate')
      })

      it('handles undefined input (returns sparse)', () => {
        expect(getDensityMode(undefined)).toBe('sparse')
      })

      it('handles null input (returns sparse)', () => {
        expect(getDensityMode(null)).toBe('sparse')
      })
    })
  })

  describe('getDaysSinceReview', () => {
    beforeEach(() => {
      // Mock current date for consistent testing
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    describe('using lastReviewedAt', () => {
      it('returns 0 for piece reviewed today', () => {
        const piece = createMockPiece('1', 0)
        expect(getDaysSinceReview(piece)).toBe(0)
      })

      it('returns 1 for piece reviewed yesterday', () => {
        const piece = createMockPiece('1', 1)
        expect(getDaysSinceReview(piece)).toBe(1)
      })

      it('returns 7 for piece reviewed a week ago', () => {
        const piece = createMockPiece('1', 7)
        expect(getDaysSinceReview(piece)).toBe(7)
      })

      it('returns 30 for piece reviewed a month ago', () => {
        const piece = createMockPiece('1', 30)
        expect(getDaysSinceReview(piece)).toBe(30)
      })
    })

    describe('using unlockedAt as fallback', () => {
      it('uses unlockedAt when lastReviewedAt is null', () => {
        const piece = createMockPiece('1', 5, { useUnlockedAt: true })
        expect(getDaysSinceReview(piece)).toBe(5)
      })

      it('uses unlockedAt when lastReviewedAt is undefined', () => {
        const piece = {
          id: '1',
          unlockedAt: new Date('2024-06-10T12:00:00Z').toISOString(),
        }
        expect(getDaysSinceReview(piece)).toBe(5)
      })
    })

    describe('edge cases', () => {
      it('returns 0 for piece with no dates (treated as fresh)', () => {
        const piece = { id: '1' }
        expect(getDaysSinceReview(piece)).toBe(0)
      })

      it('returns 0 for null piece', () => {
        expect(getDaysSinceReview(null)).toBe(0)
      })

      it('returns 0 for undefined piece', () => {
        expect(getDaysSinceReview(undefined)).toBe(0)
      })

      it('returns 0 for piece with invalid date strings', () => {
        const piece = { id: '1', lastReviewedAt: 'invalid-date' }
        expect(getDaysSinceReview(piece)).toBe(0)
      })

      it('handles future dates gracefully (returns 0)', () => {
        const futureDate = new Date('2024-06-20T12:00:00Z')
        const piece = { id: '1', lastReviewedAt: futureDate.toISOString() }
        expect(getDaysSinceReview(piece)).toBe(0)
      })

      it('rounds partial days down', () => {
        // 1.5 days ago should return 1
        const piece = {
          id: '1',
          lastReviewedAt: new Date('2024-06-14T00:00:00Z').toISOString(),
        }
        expect(getDaysSinceReview(piece)).toBe(1)
      })
    })
  })

  describe('getFreshnessCategory', () => {
    describe('fresh category (< 7 days)', () => {
      it('returns fresh for 0 days', () => {
        expect(getFreshnessCategory(0)).toBe('fresh')
      })

      it('returns fresh for 3 days', () => {
        expect(getFreshnessCategory(3)).toBe('fresh')
      })

      it('returns fresh for 6 days', () => {
        expect(getFreshnessCategory(6)).toBe('fresh')
      })

      it('returns fresh for 6.9 days (boundary)', () => {
        expect(getFreshnessCategory(6.9)).toBe('fresh')
      })
    })

    describe('fading category (7-14 days)', () => {
      it('returns fading for 7 days (lower boundary)', () => {
        expect(getFreshnessCategory(7)).toBe('fading')
      })

      it('returns fading for 10 days', () => {
        expect(getFreshnessCategory(10)).toBe('fading')
      })

      it('returns fading for 13 days', () => {
        expect(getFreshnessCategory(13)).toBe('fading')
      })

      it('returns fading for 13.9 days (boundary)', () => {
        expect(getFreshnessCategory(13.9)).toBe('fading')
      })
    })

    describe('sleepy category (14+ days)', () => {
      it('returns sleepy for 14 days (boundary)', () => {
        expect(getFreshnessCategory(14)).toBe('sleepy')
      })

      it('returns sleepy for 21 days', () => {
        expect(getFreshnessCategory(21)).toBe('sleepy')
      })

      it('returns sleepy for 30 days', () => {
        expect(getFreshnessCategory(30)).toBe('sleepy')
      })

      it('returns sleepy for 100 days', () => {
        expect(getFreshnessCategory(100)).toBe('sleepy')
      })
    })

    describe('edge cases', () => {
      it('returns fresh for negative days', () => {
        expect(getFreshnessCategory(-1)).toBe('fresh')
      })

      it('returns fresh for undefined (defaults to 0)', () => {
        expect(getFreshnessCategory(undefined)).toBe('fresh')
      })

      it('returns fresh for null (defaults to 0)', () => {
        expect(getFreshnessCategory(null)).toBe('fresh')
      })

      it('returns fresh for NaN (defaults to 0)', () => {
        expect(getFreshnessCategory(NaN)).toBe('fresh')
      })
    })
  })

  describe('samplePieces', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    describe('empty input handling', () => {
      it('returns empty array for empty pieces array', () => {
        const result = samplePieces([])
        expect(result).toEqual([])
      })

      it('returns empty array for null pieces', () => {
        const result = samplePieces(null)
        expect(result).toEqual([])
      })

      it('returns empty array for undefined pieces', () => {
        const result = samplePieces(undefined)
        expect(result).toEqual([])
      })
    })

    describe('sparse mode (< 8 pieces)', () => {
      it('returns all pieces when count is less than 8', () => {
        const pieces = createMockPieces(5)
        const result = samplePieces(pieces)
        expect(result).toHaveLength(5)
        expect(result).toEqual(pieces)
      })

      it('returns all pieces when count is exactly 7', () => {
        const pieces = createMockPieces(7)
        const result = samplePieces(pieces)
        expect(result).toHaveLength(7)
      })
    })

    describe('moderate mode (8-15 pieces)', () => {
      it('respects maximum of 12 pieces for moderate mode', () => {
        const pieces = createMockPieces(15)
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(12)
      })

      it('samples pieces when exactly 8 pieces', () => {
        const pieces = createMockPieces(8)
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(12)
        expect(result.length).toBeGreaterThan(0)
      })
    })

    describe('dense mode (15-25 pieces)', () => {
      it('respects maximum of 10 pieces for dense mode', () => {
        const pieces = createMockPieces(20)
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(10)
      })

      it('samples pieces for 25 pieces', () => {
        const pieces = createMockPieces(25)
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(10)
      })
    })

    describe('crowded mode (> 25 pieces)', () => {
      it('respects maximum of 8 pieces for crowded mode', () => {
        const pieces = createMockPieces(30)
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(8)
      })

      it('samples pieces for 50 pieces', () => {
        const pieces = createMockPieces(50)
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(8)
      })

      it('samples pieces for 100 pieces', () => {
        const pieces = createMockPieces(100)
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(8)
      })
    })

    describe('freshness-based sampling', () => {
      it('includes 3-5 fresh pieces when available', () => {
        // Create mixed freshness pieces
        const freshPieces = Array.from({ length: 10 }, (_, i) =>
          createMockPiece(`fresh-${i}`, 3)
        )
        const fadingPieces = Array.from({ length: 10 }, (_, i) =>
          createMockPiece(`fading-${i}`, 10)
        )
        const sleepyPieces = Array.from({ length: 10 }, (_, i) =>
          createMockPiece(`sleepy-${i}`, 20)
        )
        const allPieces = [...freshPieces, ...fadingPieces, ...sleepyPieces]

        const result = samplePieces(allPieces)

        const freshInResult = result.filter((p) => p.id.startsWith('fresh'))
        expect(freshInResult.length).toBeGreaterThanOrEqual(3)
        expect(freshInResult.length).toBeLessThanOrEqual(5)
      })

      it('includes 3-5 fading pieces when available', () => {
        const freshPieces = Array.from({ length: 10 }, (_, i) =>
          createMockPiece(`fresh-${i}`, 3)
        )
        const fadingPieces = Array.from({ length: 10 }, (_, i) =>
          createMockPiece(`fading-${i}`, 10)
        )
        const sleepyPieces = Array.from({ length: 10 }, (_, i) =>
          createMockPiece(`sleepy-${i}`, 20)
        )
        const allPieces = [...freshPieces, ...fadingPieces, ...sleepyPieces]

        const result = samplePieces(allPieces)

        const fadingInResult = result.filter((p) => p.id.startsWith('fading'))
        expect(fadingInResult.length).toBeGreaterThanOrEqual(3)
        expect(fadingInResult.length).toBeLessThanOrEqual(5)
      })

      it('includes 2-3 sleepy pieces (urgent review) when available', () => {
        const freshPieces = Array.from({ length: 10 }, (_, i) =>
          createMockPiece(`fresh-${i}`, 3)
        )
        const fadingPieces = Array.from({ length: 10 }, (_, i) =>
          createMockPiece(`fading-${i}`, 10)
        )
        const sleepyPieces = Array.from({ length: 10 }, (_, i) =>
          createMockPiece(`sleepy-${i}`, 20)
        )
        const allPieces = [...freshPieces, ...fadingPieces, ...sleepyPieces]

        const result = samplePieces(allPieces)

        const sleepyInResult = result.filter((p) => p.id.startsWith('sleepy'))
        expect(sleepyInResult.length).toBeGreaterThanOrEqual(2)
        expect(sleepyInResult.length).toBeLessThanOrEqual(3)
      })
    })

    describe('all pieces in one freshness category', () => {
      it('handles all fresh pieces', () => {
        const pieces = Array.from({ length: 20 }, (_, i) =>
          createMockPiece(`piece-${i}`, 2)
        )
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(10) // dense mode max
        expect(result.length).toBeGreaterThan(0)
      })

      it('handles all fading pieces', () => {
        const pieces = Array.from({ length: 20 }, (_, i) =>
          createMockPiece(`piece-${i}`, 10)
        )
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(10)
        expect(result.length).toBeGreaterThan(0)
      })

      it('handles all sleepy pieces', () => {
        const pieces = Array.from({ length: 20 }, (_, i) =>
          createMockPiece(`piece-${i}`, 20)
        )
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(10)
        expect(result.length).toBeGreaterThan(0)
      })
    })

    describe('pieces without dates', () => {
      it('treats pieces without lastReviewedAt or unlockedAt as fresh', () => {
        const piecesWithoutDates = Array.from({ length: 15 }, (_, i) => ({
          id: `piece-${i}`,
          name: `Piece ${i}`,
          zone: 'default',
        }))

        const result = samplePieces(piecesWithoutDates)

        // All should be treated as fresh, so sampling should still work
        expect(result.length).toBeGreaterThan(0)
        expect(result.length).toBeLessThanOrEqual(12) // moderate mode max
      })

      it('includes pieces without dates in fresh category', () => {
        const piecesWithoutDates = Array.from({ length: 5 }, (_, i) => ({
          id: `nodate-${i}`,
          name: `No Date Piece ${i}`,
        }))
        const oldPieces = Array.from({ length: 25 }, (_, i) =>
          createMockPiece(`old-${i}`, 20)
        )

        const allPieces = [...piecesWithoutDates, ...oldPieces]
        const result = samplePieces(allPieces)

        // Should include some pieces without dates as they're treated as fresh
        const noDatesInResult = result.filter((p) => p.id.startsWith('nodate'))
        expect(noDatesInResult.length).toBeGreaterThanOrEqual(1)
      })
    })

    describe('zone representation', () => {
      it('includes representative samples from multiple zones', () => {
        const zone1Pieces = Array.from({ length: 10 }, (_, i) =>
          createMockPiece(`zone1-${i}`, 5, { zone: 'nature' })
        )
        const zone2Pieces = Array.from({ length: 10 }, (_, i) =>
          createMockPiece(`zone2-${i}`, 5, { zone: 'civilization' })
        )
        const zone3Pieces = Array.from({ length: 10 }, (_, i) =>
          createMockPiece(`zone3-${i}`, 5, { zone: 'technology' })
        )

        const allPieces = [...zone1Pieces, ...zone2Pieces, ...zone3Pieces]
        const result = samplePieces(allPieces)

        // Should have representation from each zone
        const zones = new Set(result.map((p) => p.zone))
        expect(zones.size).toBeGreaterThanOrEqual(2)
      })

      it('handles single zone correctly', () => {
        const pieces = Array.from({ length: 20 }, (_, i) =>
          createMockPiece(`piece-${i}`, 5, { zone: 'nature' })
        )
        const result = samplePieces(pieces)

        expect(result.length).toBeGreaterThan(0)
        expect(result.every((p) => p.zone === 'nature')).toBe(true)
      })
    })

    describe('mixed freshness distribution', () => {
      it('prioritizes sleepy pieces for urgent review', () => {
        // Create uneven distribution: many fresh, few sleepy
        const freshPieces = Array.from({ length: 25 }, (_, i) =>
          createMockPiece(`fresh-${i}`, 2)
        )
        const sleepyPieces = Array.from({ length: 3 }, (_, i) =>
          createMockPiece(`sleepy-${i}`, 20)
        )

        const allPieces = [...freshPieces, ...sleepyPieces]
        const result = samplePieces(allPieces)

        // Should include all sleepy pieces since they need urgent review
        const sleepyInResult = result.filter((p) => p.id.startsWith('sleepy'))
        expect(sleepyInResult.length).toBe(3)
      })

      it('balances sampling when one category has few pieces', () => {
        const freshPieces = Array.from({ length: 20 }, (_, i) =>
          createMockPiece(`fresh-${i}`, 2)
        )
        const fadingPieces = Array.from({ length: 2 }, (_, i) =>
          createMockPiece(`fading-${i}`, 10)
        )
        const sleepyPieces = Array.from({ length: 1 }, (_, i) =>
          createMockPiece(`sleepy-${i}`, 20)
        )

        const allPieces = [...freshPieces, ...fadingPieces, ...sleepyPieces]
        const result = samplePieces(allPieces)

        // Should include all fading and sleepy since they're under the minimum
        const fadingInResult = result.filter((p) => p.id.startsWith('fading'))
        const sleepyInResult = result.filter((p) => p.id.startsWith('sleepy'))

        expect(fadingInResult.length).toBe(2)
        expect(sleepyInResult.length).toBe(1)
      })
    })

    describe('deterministic sampling', () => {
      it('returns consistent results for same input', () => {
        const pieces = Array.from({ length: 30 }, (_, i) =>
          createMockPiece(`piece-${i}`, i % 20)
        )

        const result1 = samplePieces(pieces)
        const result2 = samplePieces(pieces)

        // Should return same pieces (though order might vary based on implementation)
        const ids1 = result1.map((p) => p.id).sort()
        const ids2 = result2.map((p) => p.id).sort()
        expect(ids1).toEqual(ids2)
      })
    })

    describe('boundary conditions', () => {
      it('handles exactly 8 pieces (moderate boundary)', () => {
        const pieces = createMockPieces(8)
        const result = samplePieces(pieces)
        expect(result.length).toBe(8) // Should return all since it's under max
      })

      it('handles exactly 15 pieces (moderate/dense boundary)', () => {
        const pieces = createMockPieces(15)
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(12)
      })

      it('handles exactly 16 pieces (dense mode start)', () => {
        const pieces = createMockPieces(16)
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(10)
      })

      it('handles exactly 25 pieces (dense/crowded boundary)', () => {
        const pieces = createMockPieces(25)
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(10)
      })

      it('handles exactly 26 pieces (crowded mode start)', () => {
        const pieces = createMockPieces(26)
        const result = samplePieces(pieces)
        expect(result.length).toBeLessThanOrEqual(8)
      })
    })

    describe('result uniqueness', () => {
      it('returns unique pieces (no duplicates)', () => {
        const pieces = Array.from({ length: 30 }, (_, i) =>
          createMockPiece(`piece-${i}`, i % 15)
        )
        const result = samplePieces(pieces)

        const ids = result.map((p) => p.id)
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(ids.length)
      })
    })

    describe('original array immutability', () => {
      it('does not modify the original pieces array', () => {
        const pieces = createMockPieces(20)
        const originalLength = pieces.length
        const originalFirst = { ...pieces[0] }

        samplePieces(pieces)

        expect(pieces.length).toBe(originalLength)
        expect(pieces[0]).toEqual(originalFirst)
      })
    })
  })
})
