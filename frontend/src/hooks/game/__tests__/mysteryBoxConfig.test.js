/**
 * Mystery Box Config Tests
 *
 * Tests for the Mystery Box Rewards System configuration and utility functions.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Mystery box tier definitions and structure
 * - Power-up definitions
 * - Timing configuration
 * - Score-to-tier calculation
 * - XP bonus calculation
 * - Power-up selection with weighted probability
 * - Tier upgrade function
 * - Edge cases and fallback behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  MYSTERY_BOX_TIERS,
  MYSTERY_BOX_POWER_UPS,
  MYSTERY_BOX_TIMING,
  getBoxTierFromScore,
  calculateXpBonus,
  selectPowerUp,
  upgradeTier,
} from '../mysteryBoxConfig'

describe('mysteryBoxConfig', () => {
  describe('MYSTERY_BOX_TIERS', () => {
    it('exports MYSTERY_BOX_TIERS object with all four tiers', () => {
      expect(MYSTERY_BOX_TIERS).toBeDefined()
      expect(typeof MYSTERY_BOX_TIERS).toBe('object')
      expect(MYSTERY_BOX_TIERS.bronze).toBeDefined()
      expect(MYSTERY_BOX_TIERS.silver).toBeDefined()
      expect(MYSTERY_BOX_TIERS.gold).toBeDefined()
      expect(MYSTERY_BOX_TIERS.legendary).toBeDefined()
    })

    it('each tier has required properties', () => {
      const requiredProps = ['id', 'name', 'icon', 'scoreRange', 'rewards', 'colors']

      Object.values(MYSTERY_BOX_TIERS).forEach((tier) => {
        requiredProps.forEach((prop) => {
          expect(tier[prop]).toBeDefined()
        })
      })
    })

    describe('bronze tier', () => {
      it('has correct configuration', () => {
        const bronze = MYSTERY_BOX_TIERS.bronze
        expect(bronze.id).toBe('bronze')
        expect(bronze.name).toBe('Bronze')
        expect(bronze.icon).toBe('\uD83E\uDD49') // Bronze medal emoji
      })

      it('has correct score range (60-74%)', () => {
        const bronze = MYSTERY_BOX_TIERS.bronze
        expect(bronze.scoreRange.min).toBe(60)
        expect(bronze.scoreRange.max).toBe(74)
      })

      it('has rewards configuration', () => {
        const bronze = MYSTERY_BOX_TIERS.bronze
        expect(bronze.rewards).toBeDefined()
        expect(bronze.rewards.xpMin).toBeDefined()
        expect(bronze.rewards.xpMax).toBeDefined()
        expect(bronze.rewards.xpMin).toBeGreaterThan(0)
        expect(bronze.rewards.xpMax).toBeGreaterThanOrEqual(bronze.rewards.xpMin)
      })

      it('has no power-up chance (or very low)', () => {
        const bronze = MYSTERY_BOX_TIERS.bronze
        expect(bronze.powerUpChance).toBeDefined()
        expect(bronze.powerUpChance).toBe(0)
      })

      it('has colors configuration', () => {
        const bronze = MYSTERY_BOX_TIERS.bronze
        expect(bronze.colors).toBeDefined()
        expect(bronze.colors.primary).toBeDefined()
        expect(bronze.colors.glow).toBeDefined()
      })
    })

    describe('silver tier', () => {
      it('has correct configuration', () => {
        const silver = MYSTERY_BOX_TIERS.silver
        expect(silver.id).toBe('silver')
        expect(silver.name).toBe('Silver')
        expect(silver.icon).toBe('\uD83E\uDD48') // Silver medal emoji
      })

      it('has correct score range (75-89%)', () => {
        const silver = MYSTERY_BOX_TIERS.silver
        expect(silver.scoreRange.min).toBe(75)
        expect(silver.scoreRange.max).toBe(89)
      })

      it('has power-up chance of 0.3 (30%)', () => {
        const silver = MYSTERY_BOX_TIERS.silver
        expect(silver.powerUpChance).toBe(0.3)
      })

      it('has better rewards than bronze', () => {
        const bronze = MYSTERY_BOX_TIERS.bronze
        const silver = MYSTERY_BOX_TIERS.silver
        expect(silver.rewards.xpMin).toBeGreaterThan(bronze.rewards.xpMin)
      })
    })

    describe('gold tier', () => {
      it('has correct configuration', () => {
        const gold = MYSTERY_BOX_TIERS.gold
        expect(gold.id).toBe('gold')
        expect(gold.name).toBe('Gold')
        expect(gold.icon).toBe('\uD83E\uDD47') // Gold medal emoji
      })

      it('has correct score range (90-99%)', () => {
        const gold = MYSTERY_BOX_TIERS.gold
        expect(gold.scoreRange.min).toBe(90)
        expect(gold.scoreRange.max).toBe(99)
      })

      it('has power-up chance of 0.6 (60%)', () => {
        const gold = MYSTERY_BOX_TIERS.gold
        expect(gold.powerUpChance).toBe(0.6)
      })

      it('has better rewards than silver', () => {
        const silver = MYSTERY_BOX_TIERS.silver
        const gold = MYSTERY_BOX_TIERS.gold
        expect(gold.rewards.xpMin).toBeGreaterThan(silver.rewards.xpMin)
      })
    })

    describe('legendary tier', () => {
      it('has correct configuration', () => {
        const legendary = MYSTERY_BOX_TIERS.legendary
        expect(legendary.id).toBe('legendary')
        expect(legendary.name).toBe('Legendary')
        expect(legendary.icon).toBe('\uD83D\uDC51') // Crown emoji
      })

      it('has correct score range (100% only)', () => {
        const legendary = MYSTERY_BOX_TIERS.legendary
        expect(legendary.scoreRange.min).toBe(100)
        expect(legendary.scoreRange.max).toBe(100)
      })

      it('has power-up chance of 1.0 (guaranteed)', () => {
        const legendary = MYSTERY_BOX_TIERS.legendary
        expect(legendary.powerUpChance).toBe(1.0)
      })

      it('has the best rewards', () => {
        const gold = MYSTERY_BOX_TIERS.gold
        const legendary = MYSTERY_BOX_TIERS.legendary
        expect(legendary.rewards.xpMin).toBeGreaterThan(gold.rewards.xpMin)
      })
    })

    it('all tier IDs match their keys', () => {
      Object.entries(MYSTERY_BOX_TIERS).forEach(([key, tier]) => {
        expect(tier.id).toBe(key)
      })
    })

    it('score ranges do not overlap', () => {
      const bronze = MYSTERY_BOX_TIERS.bronze
      const silver = MYSTERY_BOX_TIERS.silver
      const gold = MYSTERY_BOX_TIERS.gold
      const legendary = MYSTERY_BOX_TIERS.legendary

      // Bronze ends before silver starts
      expect(bronze.scoreRange.max).toBeLessThan(silver.scoreRange.min)
      // Silver ends before gold starts
      expect(silver.scoreRange.max).toBeLessThan(gold.scoreRange.min)
      // Gold ends before legendary starts
      expect(gold.scoreRange.max).toBeLessThan(legendary.scoreRange.min)
    })

    it('score ranges cover 60-100%', () => {
      // Bronze starts at 60
      expect(MYSTERY_BOX_TIERS.bronze.scoreRange.min).toBe(60)
      // Legendary ends at 100
      expect(MYSTERY_BOX_TIERS.legendary.scoreRange.max).toBe(100)
    })
  })

  describe('MYSTERY_BOX_POWER_UPS', () => {
    it('exports MYSTERY_BOX_POWER_UPS object with all three power-ups', () => {
      expect(MYSTERY_BOX_POWER_UPS).toBeDefined()
      expect(typeof MYSTERY_BOX_POWER_UPS).toBe('object')
      expect(MYSTERY_BOX_POWER_UPS.streak_shield).toBeDefined()
      expect(MYSTERY_BOX_POWER_UPS.time_freeze).toBeDefined()
      expect(MYSTERY_BOX_POWER_UPS.hint_token).toBeDefined()
    })

    it('each power-up has required properties', () => {
      const requiredProps = ['id', 'name', 'icon', 'description', 'effect', 'weight']

      Object.values(MYSTERY_BOX_POWER_UPS).forEach((powerUp) => {
        requiredProps.forEach((prop) => {
          expect(powerUp[prop]).toBeDefined()
        })
      })
    })

    describe('streak_shield power-up', () => {
      it('has correct configuration', () => {
        const shield = MYSTERY_BOX_POWER_UPS.streak_shield
        expect(shield.id).toBe('streak_shield')
        expect(shield.name).toBe('Streak Shield')
        expect(shield.icon).toBe('\uD83D\uDEE1\uFE0F') // Shield emoji
      })

      it('has weight of 40', () => {
        expect(MYSTERY_BOX_POWER_UPS.streak_shield.weight).toBe(40)
      })

      it('has description and effect', () => {
        const shield = MYSTERY_BOX_POWER_UPS.streak_shield
        expect(shield.description.length).toBeGreaterThan(0)
        expect(shield.effect).toBeDefined()
      })
    })

    describe('time_freeze power-up', () => {
      it('has correct configuration', () => {
        const freeze = MYSTERY_BOX_POWER_UPS.time_freeze
        expect(freeze.id).toBe('time_freeze')
        expect(freeze.name).toBe('Time Freeze')
        expect(freeze.icon).toBe('\u23F1\uFE0F') // Stopwatch emoji
      })

      it('has weight of 35', () => {
        expect(MYSTERY_BOX_POWER_UPS.time_freeze.weight).toBe(35)
      })
    })

    describe('hint_token power-up', () => {
      it('has correct configuration', () => {
        const hint = MYSTERY_BOX_POWER_UPS.hint_token
        expect(hint.id).toBe('hint_token')
        expect(hint.name).toBe('Hint Token')
        expect(hint.icon).toBe('\uD83D\uDCA1') // Lightbulb emoji
      })

      it('has weight of 25', () => {
        expect(MYSTERY_BOX_POWER_UPS.hint_token.weight).toBe(25)
      })
    })

    it('all power-up IDs match their keys', () => {
      Object.entries(MYSTERY_BOX_POWER_UPS).forEach(([key, powerUp]) => {
        expect(powerUp.id).toBe(key)
      })
    })

    it('weights sum to 100', () => {
      const totalWeight = Object.values(MYSTERY_BOX_POWER_UPS).reduce(
        (sum, powerUp) => sum + powerUp.weight,
        0
      )
      expect(totalWeight).toBe(100)
    })
  })

  describe('MYSTERY_BOX_TIMING', () => {
    it('exports MYSTERY_BOX_TIMING object', () => {
      expect(MYSTERY_BOX_TIMING).toBeDefined()
      expect(typeof MYSTERY_BOX_TIMING).toBe('object')
    })

    it('has appearDelay property', () => {
      expect(MYSTERY_BOX_TIMING.appearDelay).toBeDefined()
      expect(typeof MYSTERY_BOX_TIMING.appearDelay).toBe('number')
      expect(MYSTERY_BOX_TIMING.appearDelay).toBeGreaterThan(0)
    })

    it('has shakesDuration property', () => {
      expect(MYSTERY_BOX_TIMING.shakesDuration).toBeDefined()
      expect(typeof MYSTERY_BOX_TIMING.shakesDuration).toBe('number')
      expect(MYSTERY_BOX_TIMING.shakesDuration).toBeGreaterThan(0)
    })

    it('has openDuration property', () => {
      expect(MYSTERY_BOX_TIMING.openDuration).toBeDefined()
      expect(typeof MYSTERY_BOX_TIMING.openDuration).toBe('number')
      expect(MYSTERY_BOX_TIMING.openDuration).toBeGreaterThan(0)
    })

    it('has revealDelay property', () => {
      expect(MYSTERY_BOX_TIMING.revealDelay).toBeDefined()
      expect(typeof MYSTERY_BOX_TIMING.revealDelay).toBe('number')
      expect(MYSTERY_BOX_TIMING.revealDelay).toBeGreaterThan(0)
    })

    it('has celebrationDuration property', () => {
      expect(MYSTERY_BOX_TIMING.celebrationDuration).toBeDefined()
      expect(typeof MYSTERY_BOX_TIMING.celebrationDuration).toBe('number')
      expect(MYSTERY_BOX_TIMING.celebrationDuration).toBeGreaterThan(0)
    })

    it('all timing values are in milliseconds (reasonable range)', () => {
      Object.values(MYSTERY_BOX_TIMING).forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(100)
        expect(value).toBeLessThanOrEqual(5000)
      })
    })
  })

  describe('getBoxTierFromScore', () => {
    it('exports getBoxTierFromScore function', () => {
      expect(typeof getBoxTierFromScore).toBe('function')
    })

    it('returns null for score below 60%', () => {
      expect(getBoxTierFromScore(0)).toBeNull()
      expect(getBoxTierFromScore(30)).toBeNull()
      expect(getBoxTierFromScore(59)).toBeNull()
    })

    it('returns bronze tier for 60-74%', () => {
      expect(getBoxTierFromScore(60)).toEqual(MYSTERY_BOX_TIERS.bronze)
      expect(getBoxTierFromScore(67)).toEqual(MYSTERY_BOX_TIERS.bronze)
      expect(getBoxTierFromScore(74)).toEqual(MYSTERY_BOX_TIERS.bronze)
    })

    it('returns silver tier for 75-89%', () => {
      expect(getBoxTierFromScore(75)).toEqual(MYSTERY_BOX_TIERS.silver)
      expect(getBoxTierFromScore(82)).toEqual(MYSTERY_BOX_TIERS.silver)
      expect(getBoxTierFromScore(89)).toEqual(MYSTERY_BOX_TIERS.silver)
    })

    it('returns gold tier for 90-99%', () => {
      expect(getBoxTierFromScore(90)).toEqual(MYSTERY_BOX_TIERS.gold)
      expect(getBoxTierFromScore(95)).toEqual(MYSTERY_BOX_TIERS.gold)
      expect(getBoxTierFromScore(99)).toEqual(MYSTERY_BOX_TIERS.gold)
    })

    it('returns legendary tier for exactly 100%', () => {
      expect(getBoxTierFromScore(100)).toEqual(MYSTERY_BOX_TIERS.legendary)
    })

    describe('edge cases', () => {
      it('returns null for negative scores', () => {
        expect(getBoxTierFromScore(-1)).toBeNull()
        expect(getBoxTierFromScore(-100)).toBeNull()
      })

      it('returns legendary for scores above 100 (clamped)', () => {
        // Scores above 100 should be treated as 100
        expect(getBoxTierFromScore(101)).toEqual(MYSTERY_BOX_TIERS.legendary)
        expect(getBoxTierFromScore(150)).toEqual(MYSTERY_BOX_TIERS.legendary)
      })

      it('returns null for undefined', () => {
        expect(getBoxTierFromScore(undefined)).toBeNull()
      })

      it('returns null for null', () => {
        expect(getBoxTierFromScore(null)).toBeNull()
      })

      it('returns null for NaN', () => {
        expect(getBoxTierFromScore(NaN)).toBeNull()
      })

      it('returns null for non-number types', () => {
        expect(getBoxTierFromScore('80')).toBeNull()
        expect(getBoxTierFromScore({})).toBeNull()
        expect(getBoxTierFromScore([])).toBeNull()
      })

      it('handles decimal percentages correctly', () => {
        expect(getBoxTierFromScore(59.9)).toBeNull()
        expect(getBoxTierFromScore(60.0)).toEqual(MYSTERY_BOX_TIERS.bronze)
        expect(getBoxTierFromScore(74.9)).toEqual(MYSTERY_BOX_TIERS.bronze)
        expect(getBoxTierFromScore(75.0)).toEqual(MYSTERY_BOX_TIERS.silver)
      })

      it('handles boundary values precisely', () => {
        // Exact boundaries
        expect(getBoxTierFromScore(59.99)).toBeNull()
        expect(getBoxTierFromScore(60.01)).toEqual(MYSTERY_BOX_TIERS.bronze)
        expect(getBoxTierFromScore(99.99)).toEqual(MYSTERY_BOX_TIERS.gold)
        expect(getBoxTierFromScore(100.00)).toEqual(MYSTERY_BOX_TIERS.legendary)
      })
    })
  })

  describe('calculateXpBonus', () => {
    it('exports calculateXpBonus function', () => {
      expect(typeof calculateXpBonus).toBe('function')
    })

    it('returns a number', () => {
      const bronze = MYSTERY_BOX_TIERS.bronze
      const result = calculateXpBonus(bronze)
      expect(typeof result).toBe('number')
    })

    it('returns value within bronze range for bronze tier', () => {
      const bronze = MYSTERY_BOX_TIERS.bronze
      for (let i = 0; i < 20; i++) {
        const xp = calculateXpBonus(bronze)
        expect(xp).toBeGreaterThanOrEqual(bronze.rewards.xpMin)
        expect(xp).toBeLessThanOrEqual(bronze.rewards.xpMax)
      }
    })

    it('returns value within silver range for silver tier', () => {
      const silver = MYSTERY_BOX_TIERS.silver
      for (let i = 0; i < 20; i++) {
        const xp = calculateXpBonus(silver)
        expect(xp).toBeGreaterThanOrEqual(silver.rewards.xpMin)
        expect(xp).toBeLessThanOrEqual(silver.rewards.xpMax)
      }
    })

    it('returns value within gold range for gold tier', () => {
      const gold = MYSTERY_BOX_TIERS.gold
      for (let i = 0; i < 20; i++) {
        const xp = calculateXpBonus(gold)
        expect(xp).toBeGreaterThanOrEqual(gold.rewards.xpMin)
        expect(xp).toBeLessThanOrEqual(gold.rewards.xpMax)
      }
    })

    it('returns value within legendary range for legendary tier', () => {
      const legendary = MYSTERY_BOX_TIERS.legendary
      for (let i = 0; i < 20; i++) {
        const xp = calculateXpBonus(legendary)
        expect(xp).toBeGreaterThanOrEqual(legendary.rewards.xpMin)
        expect(xp).toBeLessThanOrEqual(legendary.rewards.xpMax)
      }
    })

    it('returns integer values', () => {
      Object.values(MYSTERY_BOX_TIERS).forEach((tier) => {
        const xp = calculateXpBonus(tier)
        expect(Number.isInteger(xp)).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('returns 0 for null tier', () => {
        expect(calculateXpBonus(null)).toBe(0)
      })

      it('returns 0 for undefined tier', () => {
        expect(calculateXpBonus(undefined)).toBe(0)
      })

      it('returns 0 for invalid tier object', () => {
        expect(calculateXpBonus({})).toBe(0)
        expect(calculateXpBonus({ rewards: null })).toBe(0)
      })
    })

    describe('statistical distribution', () => {
      it('produces varied results (not always min or max)', () => {
        const bronze = MYSTERY_BOX_TIERS.bronze
        const results = new Set()

        for (let i = 0; i < 50; i++) {
          results.add(calculateXpBonus(bronze))
        }

        // Should produce at least a few different values
        expect(results.size).toBeGreaterThan(1)
      })
    })
  })

  describe('selectPowerUp', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('exports selectPowerUp function', () => {
      expect(typeof selectPowerUp).toBe('function')
    })

    it('returns null for bronze tier (0% chance)', () => {
      const bronze = MYSTERY_BOX_TIERS.bronze
      for (let i = 0; i < 10; i++) {
        expect(selectPowerUp(bronze)).toBeNull()
      }
    })

    it('returns null or power-up for silver tier (30% chance)', () => {
      const silver = MYSTERY_BOX_TIERS.silver

      // Test when random is below chance threshold (should get power-up)
      vi.mocked(Math.random).mockReturnValueOnce(0.1) // < 0.3 = gets power-up
        .mockReturnValueOnce(0.5) // For power-up selection
      const result1 = selectPowerUp(silver)
      expect(result1 === null || MYSTERY_BOX_POWER_UPS[result1?.id]).toBeTruthy()

      // Test when random is above chance threshold (no power-up)
      vi.mocked(Math.random).mockReturnValueOnce(0.5) // >= 0.3 = no power-up
      const result2 = selectPowerUp(silver)
      expect(result2).toBeNull()
    })

    it('returns null or power-up for gold tier (60% chance)', () => {
      const gold = MYSTERY_BOX_TIERS.gold

      // Test when random is below chance threshold
      vi.mocked(Math.random).mockReturnValueOnce(0.3) // < 0.6 = gets power-up
        .mockReturnValueOnce(0.5) // For power-up selection
      const result = selectPowerUp(gold)
      expect(result === null || MYSTERY_BOX_POWER_UPS[result?.id]).toBeTruthy()
    })

    it('always returns power-up for legendary tier (100% chance)', () => {
      const legendary = MYSTERY_BOX_TIERS.legendary

      vi.mocked(Math.random).mockReturnValueOnce(0.99) // Always passes 1.0 threshold
        .mockReturnValueOnce(0.5) // For power-up selection
      const result = selectPowerUp(legendary)
      expect(result).not.toBeNull()
      expect(MYSTERY_BOX_POWER_UPS[result.id]).toBeDefined()
    })

    it('returns power-up with correct structure', () => {
      const legendary = MYSTERY_BOX_TIERS.legendary
      vi.mocked(Math.random).mockReturnValue(0.5)

      const powerUp = selectPowerUp(legendary)

      expect(powerUp).toBeDefined()
      expect(powerUp.id).toBeDefined()
      expect(powerUp.name).toBeDefined()
      expect(powerUp.icon).toBeDefined()
    })

    describe('weighted selection', () => {
      it('selects streak_shield when random falls in first 40%', () => {
        const legendary = MYSTERY_BOX_TIERS.legendary
        vi.mocked(Math.random)
          .mockReturnValueOnce(0.5) // Passes power-up chance
          .mockReturnValueOnce(0.2) // 20 out of 100 = streak_shield (0-40 range)

        const powerUp = selectPowerUp(legendary)
        expect(powerUp.id).toBe('streak_shield')
      })

      it('selects time_freeze when random falls in 40-75% range', () => {
        const legendary = MYSTERY_BOX_TIERS.legendary
        vi.mocked(Math.random)
          .mockReturnValueOnce(0.5) // Passes power-up chance
          .mockReturnValueOnce(0.5) // 50 out of 100 = time_freeze (40-75 range)

        const powerUp = selectPowerUp(legendary)
        expect(powerUp.id).toBe('time_freeze')
      })

      it('selects hint_token when random falls in 75-100% range', () => {
        const legendary = MYSTERY_BOX_TIERS.legendary
        vi.mocked(Math.random)
          .mockReturnValueOnce(0.5) // Passes power-up chance
          .mockReturnValueOnce(0.8) // 80 out of 100 = hint_token (75-100 range)

        const powerUp = selectPowerUp(legendary)
        expect(powerUp.id).toBe('hint_token')
      })
    })

    describe('edge cases', () => {
      it('returns null for null tier', () => {
        expect(selectPowerUp(null)).toBeNull()
      })

      it('returns null for undefined tier', () => {
        expect(selectPowerUp(undefined)).toBeNull()
      })

      it('returns null for tier without powerUpChance', () => {
        expect(selectPowerUp({})).toBeNull()
        expect(selectPowerUp({ powerUpChance: undefined })).toBeNull()
      })
    })

    describe('statistical distribution test', () => {
      it('approximates expected distribution over many iterations', () => {
        const legendary = MYSTERY_BOX_TIERS.legendary
        const counts = { streak_shield: 0, time_freeze: 0, hint_token: 0 }
        const iterations = 500

        vi.restoreAllMocks() // Use real random for this test

        for (let i = 0; i < iterations; i++) {
          const powerUp = selectPowerUp(legendary)
          if (powerUp) {
            counts[powerUp.id]++
          }
        }

        // Expected: streak_shield ~40%, time_freeze ~35%, hint_token ~25%
        // Allow wide tolerance for randomness
        const total = counts.streak_shield + counts.time_freeze + counts.hint_token

        expect(counts.streak_shield / total).toBeGreaterThan(0.25)
        expect(counts.streak_shield / total).toBeLessThan(0.55)

        expect(counts.time_freeze / total).toBeGreaterThan(0.2)
        expect(counts.time_freeze / total).toBeLessThan(0.5)

        expect(counts.hint_token / total).toBeGreaterThan(0.1)
        expect(counts.hint_token / total).toBeLessThan(0.4)
      })
    })
  })

  describe('upgradeTier', () => {
    it('exports upgradeTier function', () => {
      expect(typeof upgradeTier).toBe('function')
    })

    it('upgrades bronze to silver', () => {
      const result = upgradeTier(MYSTERY_BOX_TIERS.bronze)
      expect(result).toEqual(MYSTERY_BOX_TIERS.silver)
    })

    it('upgrades silver to gold', () => {
      const result = upgradeTier(MYSTERY_BOX_TIERS.silver)
      expect(result).toEqual(MYSTERY_BOX_TIERS.gold)
    })

    it('upgrades gold to legendary', () => {
      const result = upgradeTier(MYSTERY_BOX_TIERS.gold)
      expect(result).toEqual(MYSTERY_BOX_TIERS.legendary)
    })

    it('keeps legendary at legendary (max tier)', () => {
      const result = upgradeTier(MYSTERY_BOX_TIERS.legendary)
      expect(result).toEqual(MYSTERY_BOX_TIERS.legendary)
    })

    describe('edge cases', () => {
      it('returns bronze for null tier', () => {
        const result = upgradeTier(null)
        expect(result).toEqual(MYSTERY_BOX_TIERS.bronze)
      })

      it('returns bronze for undefined tier', () => {
        const result = upgradeTier(undefined)
        expect(result).toEqual(MYSTERY_BOX_TIERS.bronze)
      })

      it('returns bronze for invalid tier object', () => {
        const result = upgradeTier({})
        expect(result).toEqual(MYSTERY_BOX_TIERS.bronze)
      })

      it('handles tier ID string lookup', () => {
        // If passed a string ID instead of tier object
        const result = upgradeTier({ id: 'silver' })
        expect(result).toEqual(MYSTERY_BOX_TIERS.gold)
      })
    })
  })

  describe('type safety and immutability', () => {
    it('MYSTERY_BOX_TIERS is frozen (immutable)', () => {
      expect(Object.isFrozen(MYSTERY_BOX_TIERS)).toBe(true)
    })

    it('individual tier objects are frozen', () => {
      Object.values(MYSTERY_BOX_TIERS).forEach((tier) => {
        expect(Object.isFrozen(tier)).toBe(true)
      })
    })

    it('MYSTERY_BOX_POWER_UPS is frozen (immutable)', () => {
      expect(Object.isFrozen(MYSTERY_BOX_POWER_UPS)).toBe(true)
    })

    it('individual power-up objects are frozen', () => {
      Object.values(MYSTERY_BOX_POWER_UPS).forEach((powerUp) => {
        expect(Object.isFrozen(powerUp)).toBe(true)
      })
    })

    it('MYSTERY_BOX_TIMING is frozen (immutable)', () => {
      expect(Object.isFrozen(MYSTERY_BOX_TIMING)).toBe(true)
    })

    it('cannot modify MYSTERY_BOX_TIERS', () => {
      expect(() => {
        MYSTERY_BOX_TIERS.newTier = { id: 'test' }
      }).toThrow()
    })

    it('cannot modify tier properties', () => {
      expect(() => {
        MYSTERY_BOX_TIERS.bronze.powerUpChance = 1.0
      }).toThrow()
    })

    it('cannot modify MYSTERY_BOX_POWER_UPS', () => {
      expect(() => {
        MYSTERY_BOX_POWER_UPS.super_power = { id: 'super' }
      }).toThrow()
    })

    it('cannot modify timing values', () => {
      expect(() => {
        MYSTERY_BOX_TIMING.appearDelay = 9999
      }).toThrow()
    })
  })
})
