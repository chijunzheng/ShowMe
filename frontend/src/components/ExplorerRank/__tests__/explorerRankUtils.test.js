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
  getExplorerRankByTopics,
  checkRankUp,
  getRankProgress,
  getRankProgressByTopics,
  getRankColors,
  getRankTailwindColors,
} from '../explorerRankUtils'

describe('explorerRankUtils', () => {
  describe('EXPLORER_RANKS constant', () => {
    it('has 12 rank levels', () => {
      expect(EXPLORER_RANKS).toHaveLength(12)
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
        expect(rank).toHaveProperty('minXP')
        expect(rank).toHaveProperty('description')
      })
    })
  })

  describe('getExplorerRank', () => {
    it('returns first rank (Stargazer) for 0 topics', () => {
      const rank = getExplorerRank(0, 0)
      expect(rank.id).toBe('stargazer')
      expect(rank.level).toBe(1)
    })

    it('returns first rank for negative topic count', () => {
      const rank = getExplorerRank(-5, 0)
      expect(rank.id).toBe('stargazer')
    })

    it('returns first rank for null input', () => {
      const rank = getExplorerRank(null, 0)
      expect(rank.id).toBe('stargazer')
    })

    it('returns first rank for undefined input', () => {
      const rank = getExplorerRank(undefined, 0)
      expect(rank.id).toBe('stargazer')
    })

    it('returns first rank for NaN input', () => {
      const rank = getExplorerRank(NaN, 0)
      expect(rank.id).toBe('stargazer')
    })

    it('handles string numeric input', () => {
      const rank = getExplorerRank('10', 400)
      expect(rank.id).toBe('navigator')
    })

    it('floors floating point numbers', () => {
      const rank = getExplorerRank(7.9, 200)
      expect(rank.id).toBe('cadet') // 7.9 floors to 7, still in cadet range (3-7)
    })

    it('returns Space Cadet for 3-7 topics with enough XP', () => {
      expect(getExplorerRank(3, 150).id).toBe('cadet')
      expect(getExplorerRank(7, 200).id).toBe('cadet')
    })

    it('does not promote without XP threshold', () => {
      const rank = getExplorerRank(10, 0)
      expect(rank.id).toBe('stargazer')
    })

    it('returns Navigator for 8-14 topics with enough XP', () => {
      expect(getExplorerRank(8, 350).id).toBe('navigator')
      expect(getExplorerRank(14, 500).id).toBe('navigator')
    })

    it('returns Explorer for 15-24 topics with enough XP', () => {
      expect(getExplorerRank(15, 600).id).toBe('explorer')
      expect(getExplorerRank(24, 800).id).toBe('explorer')
    })

    it('returns Voyager for 25-37 topics with enough XP', () => {
      expect(getExplorerRank(25, 900).id).toBe('voyager')
      expect(getExplorerRank(37, 1200).id).toBe('voyager')
    })

    it('returns Astronaut for 38-51 topics with enough XP', () => {
      expect(getExplorerRank(38, 1300).id).toBe('astronaut')
      expect(getExplorerRank(51, 1700).id).toBe('astronaut')
    })

    it('returns Pioneer for 52-67 topics with enough XP', () => {
      expect(getExplorerRank(52, 1800).id).toBe('pioneer')
      expect(getExplorerRank(67, 2400).id).toBe('pioneer')
    })

    it('returns Star Captain for 68-83 topics with enough XP', () => {
      expect(getExplorerRank(68, 2500).id).toBe('captain')
      expect(getExplorerRank(83, 3300).id).toBe('captain')
    })

    it('returns Celestial Sage for 84-99 topics with enough XP', () => {
      expect(getExplorerRank(84, 3400).id).toBe('sage')
      expect(getExplorerRank(99, 4500).id).toBe('sage')
    })

    it('returns Cosmic Pioneer for 100-109 topics with enough XP', () => {
      expect(getExplorerRank(100, 4600).id).toBe('cosmic')
      expect(getExplorerRank(109, 6100).id).toBe('cosmic')
    })

    it('returns Galactic Legend for 110-119 topics with enough XP', () => {
      expect(getExplorerRank(110, 6200).id).toBe('legend')
      expect(getExplorerRank(119, 8900).id).toBe('legend')
    })

    it('returns Legendary Luminary for 120+ topics with enough XP', () => {
      expect(getExplorerRank(120, 9000).id).toBe('luminary')
      expect(getExplorerRank(140, 12000).id).toBe('luminary')
    })

    it('includes topicsToNextRank for non-max ranks', () => {
      const rank = getExplorerRank(5, 200)
      expect(rank.topicsToNextRank).toBe(3) // 8 - 5 = 3
    })

    it('includes nextRank for non-max ranks', () => {
      const rank = getExplorerRank(5, 200)
      expect(rank.nextRank).toBeTruthy()
      expect(rank.nextRank.id).toBe('navigator')
    })

    it('includes xpToNextRank for non-max ranks', () => {
      const rank = getExplorerRank(5, 200)
      expect(rank.xpToNextRank).toBe(150) // 350 - 200 = 150
    })

    it('has topicsToNextRank of 0 for max rank', () => {
      const rank = getExplorerRank(120, 9000)
      expect(rank.topicsToNextRank).toBe(0)
    })

    it('has xpToNextRank of 0 for max rank', () => {
      const rank = getExplorerRank(120, 9000)
      expect(rank.xpToNextRank).toBe(0)
    })

    it('has null nextRank for max rank', () => {
      const rank = getExplorerRank(120, 9000)
      expect(rank.nextRank).toBeNull()
    })
  })

  describe('checkRankUp', () => {
    it('returns rankUp: false when staying at same rank', () => {
      const result = checkRankUp(0, 2, 0, 100)
      expect(result.rankUp).toBe(false)
    })

    it('returns rankUp: true when crossing threshold', () => {
      const result = checkRankUp(2, 3, 100, 150)
      expect(result.rankUp).toBe(true)
      expect(result.newRank.id).toBe('cadet')
      expect(result.previousRank.id).toBe('stargazer')
    })

    it('returns rankUp: true for multi-rank jump', () => {
      const result = checkRankUp(0, 15, 0, 600)
      expect(result.rankUp).toBe(true)
      expect(result.newRank.id).toBe('explorer')
      expect(result.previousRank.id).toBe('stargazer')
    })

    it('returns rankUp: false when topic count decreases', () => {
      const result = checkRankUp(10, 5, 400, 200)
      expect(result.rankUp).toBe(false)
    })

    it('returns correct ranks for threshold boundary', () => {
      const result = checkRankUp(7, 8, 200, 350)
      expect(result.rankUp).toBe(true)
      expect(result.newRank.id).toBe('navigator')
    })

    it('does not rank up without required XP', () => {
      const result = checkRankUp(7, 8, 200, 300)
      expect(result.rankUp).toBe(false)
    })
  })

  describe('getRankProgress', () => {
    it('returns 0 at rank minimum', () => {
      const progress = getRankProgress(0, 0)
      expect(progress).toBe(0)
    })

    it('returns 100 at max rank', () => {
      const progress = getRankProgress(120, 9000)
      expect(progress).toBe(100)
    })

    it('returns percentage within rank range', () => {
      // Stargazer: 0-2 topics and 0-149 XP (range to Space Cadet)
      // At 1 topic + 50 XP, progress = min(1/3, 50/150) = 33%
      const progress = getRankProgress(1, 50)
      expect(progress).toBe(33)
    })

    it('returns correct progress at boundary', () => {
      // Just below next rank
      const progress = getRankProgress(2, 100)
      expect(progress).toBe(67) // 2/3 = 67%
    })

    it('caps at 100%', () => {
      const progress = getRankProgress(1000, 20000)
      expect(progress).toBeLessThanOrEqual(100)
    })
  })

  describe('getExplorerRankByTopics', () => {
    it('promotes based on topics without XP gating', () => {
      expect(getExplorerRankByTopics(3).id).toBe('cadet')
      expect(getExplorerRankByTopics(8).id).toBe('navigator')
    })

    it('handles invalid inputs', () => {
      expect(getExplorerRankByTopics(null).id).toBe('stargazer')
      expect(getExplorerRankByTopics(-2).id).toBe('stargazer')
    })
  })

  describe('getRankProgressByTopics', () => {
    it('returns 0 at rank minimum', () => {
      const progress = getRankProgressByTopics(0)
      expect(progress).toBe(0)
    })

    it('returns 100 at max rank', () => {
      const progress = getRankProgressByTopics(120)
      expect(progress).toBe(100)
    })

    it('returns percentage within rank range', () => {
      const progress = getRankProgressByTopics(1)
      expect(progress).toBe(33)
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
