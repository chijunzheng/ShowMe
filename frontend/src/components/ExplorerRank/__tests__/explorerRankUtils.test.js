/**
 * Explorer Rank Utilities Tests
 *
 * Tests for rank calculation and progression utilities.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  EXPLORER_RANKS,
  getExplorerRank,
  checkRankUp,
  getRankProgress,
  getRankColors,
  getRankTailwindColors,
} from '../explorerRankUtils'

describe('explorerRankUtils', () => {
  describe('EXPLORER_RANKS constant', () => {
    it('has 7 rank levels', () => {
      expect(EXPLORER_RANKS).toHaveLength(7)
    })

    it('has ranks in ascending level order', () => {
      for (let i = 0; i < EXPLORER_RANKS.length - 1; i++) {
        expect(EXPLORER_RANKS[i].level).toBeLessThan(EXPLORER_RANKS[i + 1].level)
      }
    })

    it('has ranks with ascending minTopics thresholds', () => {
      for (let i = 0; i < EXPLORER_RANKS.length - 1; i++) {
        expect(EXPLORER_RANKS[i].minTopics).toBeLessThan(EXPLORER_RANKS[i + 1].minTopics)
      }
    })

    it('starts at 0 topics for first rank', () => {
      expect(EXPLORER_RANKS[0].minTopics).toBe(0)
    })

    it('each rank has required fields', () => {
      EXPLORER_RANKS.forEach((rank) => {
        expect(rank).toHaveProperty('level')
        expect(rank).toHaveProperty('id')
        expect(rank).toHaveProperty('title')
        expect(rank).toHaveProperty('icon')
        expect(rank).toHaveProperty('minTopics')
        expect(rank).toHaveProperty('description')
      })
    })
  })

  describe('getExplorerRank', () => {
    it('returns first rank (Stargazer) for 0 topics', () => {
      const rank = getExplorerRank(0)
      expect(rank.id).toBe('stargazer')
      expect(rank.level).toBe(1)
    })

    it('returns first rank for negative topic count', () => {
      const rank = getExplorerRank(-5)
      expect(rank.id).toBe('stargazer')
    })

    it('returns first rank for null input', () => {
      const rank = getExplorerRank(null)
      expect(rank.id).toBe('stargazer')
    })

    it('returns first rank for undefined input', () => {
      const rank = getExplorerRank(undefined)
      expect(rank.id).toBe('stargazer')
    })

    it('returns first rank for NaN input', () => {
      const rank = getExplorerRank(NaN)
      expect(rank.id).toBe('stargazer')
    })

    it('handles string numeric input', () => {
      const rank = getExplorerRank('10')
      expect(rank.id).toBe('navigator')
    })

    it('floors floating point numbers', () => {
      const rank = getExplorerRank(7.9)
      expect(rank.id).toBe('cadet') // 7.9 floors to 7, still in cadet range (3-7)
    })

    it('returns Space Cadet for 3-7 topics', () => {
      expect(getExplorerRank(3).id).toBe('cadet')
      expect(getExplorerRank(7).id).toBe('cadet')
    })

    it('returns Navigator for 8-14 topics', () => {
      expect(getExplorerRank(8).id).toBe('navigator')
      expect(getExplorerRank(14).id).toBe('navigator')
    })

    it('returns Explorer for 15-24 topics', () => {
      expect(getExplorerRank(15).id).toBe('explorer')
      expect(getExplorerRank(24).id).toBe('explorer')
    })

    it('returns Voyager for 25-39 topics', () => {
      expect(getExplorerRank(25).id).toBe('voyager')
      expect(getExplorerRank(39).id).toBe('voyager')
    })

    it('returns Astronaut for 40-59 topics', () => {
      expect(getExplorerRank(40).id).toBe('astronaut')
      expect(getExplorerRank(59).id).toBe('astronaut')
    })

    it('returns Pioneer for 60+ topics', () => {
      expect(getExplorerRank(60).id).toBe('pioneer')
      expect(getExplorerRank(100).id).toBe('pioneer')
    })

    it('includes topicsToNextRank for non-max ranks', () => {
      const rank = getExplorerRank(5)
      expect(rank.topicsToNextRank).toBe(3) // 8 - 5 = 3
    })

    it('has topicsToNextRank of 0 for max rank', () => {
      const rank = getExplorerRank(60)
      expect(rank.topicsToNextRank).toBe(0)
    })

    it('includes nextRank for non-max ranks', () => {
      const rank = getExplorerRank(5)
      expect(rank.nextRank).toBeTruthy()
      expect(rank.nextRank.id).toBe('navigator')
    })

    it('has null nextRank for max rank', () => {
      const rank = getExplorerRank(60)
      expect(rank.nextRank).toBeNull()
    })
  })

  describe('checkRankUp', () => {
    it('returns rankUp: false when staying at same rank', () => {
      const result = checkRankUp(0, 2)
      expect(result.rankUp).toBe(false)
    })

    it('returns rankUp: true when crossing threshold', () => {
      const result = checkRankUp(2, 3)
      expect(result.rankUp).toBe(true)
      expect(result.newRank.id).toBe('cadet')
      expect(result.previousRank.id).toBe('stargazer')
    })

    it('returns rankUp: true for multi-rank jump', () => {
      const result = checkRankUp(0, 15)
      expect(result.rankUp).toBe(true)
      expect(result.newRank.id).toBe('explorer')
      expect(result.previousRank.id).toBe('stargazer')
    })

    it('returns rankUp: false when topic count decreases', () => {
      const result = checkRankUp(10, 5)
      expect(result.rankUp).toBe(false)
    })

    it('returns correct ranks for threshold boundary', () => {
      const result = checkRankUp(7, 8)
      expect(result.rankUp).toBe(true)
      expect(result.newRank.id).toBe('navigator')
    })
  })

  describe('getRankProgress', () => {
    it('returns 0 at rank minimum', () => {
      const progress = getRankProgress(0)
      expect(progress).toBe(0)
    })

    it('returns 100 at max rank', () => {
      const progress = getRankProgress(60)
      expect(progress).toBe(100)
    })

    it('returns percentage within rank range', () => {
      // Stargazer: 0-2 topics (range of 3 for Space Cadet at 3)
      // At 1 topic, progress = 1/3 = 33%
      const progress = getRankProgress(1)
      expect(progress).toBe(33)
    })

    it('returns correct progress at boundary', () => {
      // Just below next rank
      const progress = getRankProgress(2)
      expect(progress).toBe(67) // 2/3 = 67%
    })

    it('caps at 100%', () => {
      const progress = getRankProgress(1000)
      expect(progress).toBeLessThanOrEqual(100)
    })
  })

  describe('getRankColors', () => {
    it('returns colors for level 1', () => {
      const colors = getRankColors(1)
      expect(colors).toHaveProperty('primary')
      expect(colors).toHaveProperty('secondary')
      expect(colors).toHaveProperty('glow')
    })

    it('returns colors for level 7', () => {
      const colors = getRankColors(7)
      expect(colors.primary).toBe('#EF4444') // Red for Pioneer
    })

    it('returns default colors for invalid level', () => {
      const colors = getRankColors(0)
      expect(colors).toHaveProperty('primary')
    })

    it('returns different colors for different levels', () => {
      const level1 = getRankColors(1)
      const level7 = getRankColors(7)
      expect(level1.primary).not.toBe(level7.primary)
    })
  })

  describe('getRankTailwindColors', () => {
    it('returns Tailwind classes for level 1', () => {
      const colors = getRankTailwindColors(1)
      expect(colors).toHaveProperty('bg')
      expect(colors).toHaveProperty('text')
      expect(colors).toHaveProperty('border')
      expect(colors).toHaveProperty('gradient')
    })

    it('returns slate colors for Stargazer', () => {
      const colors = getRankTailwindColors(1)
      expect(colors.bg).toContain('slate')
    })

    it('returns red colors for Pioneer', () => {
      const colors = getRankTailwindColors(7)
      expect(colors.bg).toContain('red')
    })

    it('returns fallback for invalid level', () => {
      const colors = getRankTailwindColors(99)
      expect(colors).toHaveProperty('bg')
    })
  })
})
