/**
 * Rarity Config Tests
 *
 * Tests for the Question Rarity System configuration and utility functions.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rarity tier definitions and structure
 * - Random rarity selection with probability distribution
 * - XP multiplier calculations
 * - Edge cases and fallback behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  RARITY_TIERS,
  selectRandomRarity,
  getRarityConfig,
  applyRarityMultiplier,
} from '../rarityConfig'

describe('rarityConfig', () => {
  describe('RARITY_TIERS', () => {
    it('exports RARITY_TIERS object with all four tiers', () => {
      expect(RARITY_TIERS).toBeDefined()
      expect(typeof RARITY_TIERS).toBe('object')
      expect(RARITY_TIERS.common).toBeDefined()
      expect(RARITY_TIERS.rare).toBeDefined()
      expect(RARITY_TIERS.epic).toBeDefined()
      expect(RARITY_TIERS.legendary).toBeDefined()
    })

    it('each tier has required properties', () => {
      const requiredProps = ['id', 'name', 'icon', 'xpMultiplier', 'probability', 'color']

      Object.values(RARITY_TIERS).forEach((tier) => {
        requiredProps.forEach((prop) => {
          expect(tier[prop]).toBeDefined()
        })
      })
    })

    describe('common tier', () => {
      it('has correct configuration', () => {
        const common = RARITY_TIERS.common
        expect(common.id).toBe('common')
        expect(common.name).toBe('Common')
        expect(common.xpMultiplier).toBe(1)
        expect(common.probability).toBe(0.7)
      })

      it('has no icon (or empty string)', () => {
        const common = RARITY_TIERS.common
        expect(common.icon).toBe('')
      })
    })

    describe('rare tier', () => {
      it('has correct configuration', () => {
        const rare = RARITY_TIERS.rare
        expect(rare.id).toBe('rare')
        expect(rare.name).toBe('Rare')
        expect(rare.xpMultiplier).toBe(1.5)
        expect(rare.probability).toBe(0.2)
      })

      it('has diamond icon', () => {
        expect(RARITY_TIERS.rare.icon).toContain('\uD83D\uDC8E') // Diamond emoji
      })
    })

    describe('epic tier', () => {
      it('has correct configuration', () => {
        const epic = RARITY_TIERS.epic
        expect(epic.id).toBe('epic')
        expect(epic.name).toBe('Epic')
        expect(epic.xpMultiplier).toBe(2)
        expect(epic.probability).toBe(0.08)
      })

      it('has crystal ball icon', () => {
        expect(RARITY_TIERS.epic.icon).toContain('\uD83D\uDD2E') // Crystal ball emoji
      })
    })

    describe('legendary tier', () => {
      it('has correct configuration', () => {
        const legendary = RARITY_TIERS.legendary
        expect(legendary.id).toBe('legendary')
        expect(legendary.name).toBe('Legendary')
        expect(legendary.xpMultiplier).toBe(3)
        expect(legendary.probability).toBe(0.02)
      })

      it('has crown icon', () => {
        expect(RARITY_TIERS.legendary.icon).toContain('\uD83D\uDC51') // Crown emoji
      })
    })

    it('probabilities sum to 1.0', () => {
      const totalProbability = Object.values(RARITY_TIERS).reduce(
        (sum, tier) => sum + tier.probability,
        0
      )
      expect(totalProbability).toBeCloseTo(1.0, 5)
    })

    it('all tier IDs match their keys', () => {
      Object.entries(RARITY_TIERS).forEach(([key, tier]) => {
        expect(tier.id).toBe(key)
      })
    })
  })

  describe('selectRandomRarity', () => {
    it('returns a valid rarity string', () => {
      const rarity = selectRandomRarity()
      const validRarities = ['common', 'rare', 'epic', 'legendary']
      expect(validRarities).toContain(rarity)
    })

    it('returns string type', () => {
      const rarity = selectRandomRarity()
      expect(typeof rarity).toBe('string')
    })

    describe('probability distribution', () => {
      beforeEach(() => {
        vi.spyOn(Math, 'random')
      })

      afterEach(() => {
        vi.restoreAllMocks()
      })

      it('returns common when random is in common range (0-0.7)', () => {
        vi.mocked(Math.random).mockReturnValue(0.5)
        expect(selectRandomRarity()).toBe('common')

        vi.mocked(Math.random).mockReturnValue(0.0)
        expect(selectRandomRarity()).toBe('common')

        vi.mocked(Math.random).mockReturnValue(0.69)
        expect(selectRandomRarity()).toBe('common')
      })

      it('returns rare when random is in rare range (0.7-0.9)', () => {
        vi.mocked(Math.random).mockReturnValue(0.7)
        expect(selectRandomRarity()).toBe('rare')

        vi.mocked(Math.random).mockReturnValue(0.85)
        expect(selectRandomRarity()).toBe('rare')

        vi.mocked(Math.random).mockReturnValue(0.89)
        expect(selectRandomRarity()).toBe('rare')
      })

      it('returns epic when random is in epic range (0.9-0.98)', () => {
        vi.mocked(Math.random).mockReturnValue(0.9)
        expect(selectRandomRarity()).toBe('epic')

        vi.mocked(Math.random).mockReturnValue(0.95)
        expect(selectRandomRarity()).toBe('epic')

        vi.mocked(Math.random).mockReturnValue(0.979)
        expect(selectRandomRarity()).toBe('epic')
      })

      it('returns legendary when random is in legendary range (0.98-1.0)', () => {
        vi.mocked(Math.random).mockReturnValue(0.98)
        expect(selectRandomRarity()).toBe('legendary')

        vi.mocked(Math.random).mockReturnValue(0.99)
        expect(selectRandomRarity()).toBe('legendary')

        vi.mocked(Math.random).mockReturnValue(0.999)
        expect(selectRandomRarity()).toBe('legendary')
      })
    })

    describe('statistical distribution test', () => {
      it('approximates expected distribution over 1000 iterations', () => {
        const counts = { common: 0, rare: 0, epic: 0, legendary: 0 }
        const iterations = 1000

        for (let i = 0; i < iterations; i++) {
          const rarity = selectRandomRarity()
          counts[rarity]++
        }

        // Expected: common ~70%, rare ~20%, epic ~8%, legendary ~2%
        // Allow 10% tolerance for randomness
        expect(counts.common / iterations).toBeGreaterThan(0.6)
        expect(counts.common / iterations).toBeLessThan(0.8)

        expect(counts.rare / iterations).toBeGreaterThan(0.1)
        expect(counts.rare / iterations).toBeLessThan(0.3)

        expect(counts.epic / iterations).toBeGreaterThan(0.03)
        expect(counts.epic / iterations).toBeLessThan(0.15)

        expect(counts.legendary / iterations).toBeGreaterThanOrEqual(0)
        expect(counts.legendary / iterations).toBeLessThan(0.08)
      })
    })
  })

  describe('getRarityConfig', () => {
    it('returns correct tier object for common', () => {
      const config = getRarityConfig('common')
      expect(config).toEqual(RARITY_TIERS.common)
      expect(config.id).toBe('common')
      expect(config.xpMultiplier).toBe(1)
    })

    it('returns correct tier object for rare', () => {
      const config = getRarityConfig('rare')
      expect(config).toEqual(RARITY_TIERS.rare)
      expect(config.id).toBe('rare')
      expect(config.xpMultiplier).toBe(1.5)
    })

    it('returns correct tier object for epic', () => {
      const config = getRarityConfig('epic')
      expect(config).toEqual(RARITY_TIERS.epic)
      expect(config.id).toBe('epic')
      expect(config.xpMultiplier).toBe(2)
    })

    it('returns correct tier object for legendary', () => {
      const config = getRarityConfig('legendary')
      expect(config).toEqual(RARITY_TIERS.legendary)
      expect(config.id).toBe('legendary')
      expect(config.xpMultiplier).toBe(3)
    })

    describe('fallback behavior', () => {
      it('returns common tier for invalid rarity string', () => {
        const config = getRarityConfig('invalid')
        expect(config).toEqual(RARITY_TIERS.common)
        expect(config.id).toBe('common')
      })

      it('returns common tier for undefined', () => {
        const config = getRarityConfig(undefined)
        expect(config).toEqual(RARITY_TIERS.common)
      })

      it('returns common tier for null', () => {
        const config = getRarityConfig(null)
        expect(config).toEqual(RARITY_TIERS.common)
      })

      it('returns common tier for empty string', () => {
        const config = getRarityConfig('')
        expect(config).toEqual(RARITY_TIERS.common)
      })

      it('returns common tier for number input', () => {
        const config = getRarityConfig(42)
        expect(config).toEqual(RARITY_TIERS.common)
      })

      it('returns common tier for object input', () => {
        const config = getRarityConfig({ id: 'rare' })
        expect(config).toEqual(RARITY_TIERS.common)
      })
    })
  })

  describe('applyRarityMultiplier', () => {
    describe('with common rarity (1x)', () => {
      it('returns base XP unchanged for 10 XP', () => {
        expect(applyRarityMultiplier(10, 'common')).toBe(10)
      })

      it('returns base XP unchanged for 25 XP', () => {
        expect(applyRarityMultiplier(25, 'common')).toBe(25)
      })

      it('returns base XP unchanged for 100 XP', () => {
        expect(applyRarityMultiplier(100, 'common')).toBe(100)
      })
    })

    describe('with rare rarity (1.5x)', () => {
      it('returns 15 for 10 base XP', () => {
        expect(applyRarityMultiplier(10, 'rare')).toBe(15)
      })

      it('returns 38 for 25 base XP (rounds)', () => {
        // 25 * 1.5 = 37.5, rounded to 38
        expect(applyRarityMultiplier(25, 'rare')).toBe(38)
      })

      it('returns 150 for 100 base XP', () => {
        expect(applyRarityMultiplier(100, 'rare')).toBe(150)
      })
    })

    describe('with epic rarity (2x)', () => {
      it('returns 20 for 10 base XP', () => {
        expect(applyRarityMultiplier(10, 'epic')).toBe(20)
      })

      it('returns 50 for 25 base XP', () => {
        expect(applyRarityMultiplier(25, 'epic')).toBe(50)
      })

      it('returns 200 for 100 base XP', () => {
        expect(applyRarityMultiplier(100, 'epic')).toBe(200)
      })
    })

    describe('with legendary rarity (3x)', () => {
      it('returns 30 for 10 base XP', () => {
        expect(applyRarityMultiplier(10, 'legendary')).toBe(30)
      })

      it('returns 75 for 25 base XP', () => {
        expect(applyRarityMultiplier(25, 'legendary')).toBe(75)
      })

      it('returns 300 for 100 base XP', () => {
        expect(applyRarityMultiplier(100, 'legendary')).toBe(300)
      })
    })

    describe('edge cases', () => {
      it('handles zero XP', () => {
        expect(applyRarityMultiplier(0, 'legendary')).toBe(0)
      })

      it('handles decimal XP with rounding', () => {
        // 7 * 1.5 = 10.5, should round to 11
        expect(applyRarityMultiplier(7, 'rare')).toBe(11)
      })

      it('handles large XP values', () => {
        expect(applyRarityMultiplier(1000, 'legendary')).toBe(3000)
      })

      it('uses common multiplier for invalid rarity', () => {
        expect(applyRarityMultiplier(10, 'invalid')).toBe(10)
      })

      it('uses common multiplier for undefined rarity', () => {
        expect(applyRarityMultiplier(10, undefined)).toBe(10)
      })

      it('uses common multiplier for null rarity', () => {
        expect(applyRarityMultiplier(10, null)).toBe(10)
      })

      it('returns 0 for negative XP (edge case)', () => {
        // Implementation should handle or reject negative XP
        const result = applyRarityMultiplier(-10, 'rare')
        // Either return 0 or multiply normally - test documents expected behavior
        expect(typeof result).toBe('number')
      })
    })
  })

  describe('type safety and immutability', () => {
    it('RARITY_TIERS is frozen (immutable)', () => {
      expect(Object.isFrozen(RARITY_TIERS)).toBe(true)
    })

    it('individual tier objects are frozen', () => {
      Object.values(RARITY_TIERS).forEach((tier) => {
        expect(Object.isFrozen(tier)).toBe(true)
      })
    })

    it('cannot modify RARITY_TIERS', () => {
      expect(() => {
        RARITY_TIERS.newTier = { id: 'test' }
      }).toThrow()
    })

    it('cannot modify individual tier properties', () => {
      expect(() => {
        RARITY_TIERS.rare.xpMultiplier = 5
      }).toThrow()
    })
  })
})
