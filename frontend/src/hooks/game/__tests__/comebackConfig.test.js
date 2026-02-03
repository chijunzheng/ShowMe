/**
 * Comeback Config Tests
 *
 * Tests for the Comeback System configuration and utility functions.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Comeback config structure and constants
 * - Trigger configuration
 * - Challenge configuration
 * - Timing configuration
 * - Reward values
 * - Style definitions per level
 * - Message arrays
 * - Utility functions (eligibility, rewards, style)
 * - Immutability
 * - Edge cases and fallback behavior
 */

import { describe, it, expect } from 'vitest'
import {
  COMEBACK_CONFIG,
  getStyleForLevel,
  checkComebackEligibility,
  calculateComebackRewards,
} from '../comebackConfig'

describe('comebackConfig', () => {
  describe('COMEBACK_CONFIG', () => {
    it('exports COMEBACK_CONFIG object', () => {
      expect(COMEBACK_CONFIG).toBeDefined()
      expect(typeof COMEBACK_CONFIG).toBe('object')
    })

    describe('trigger configuration', () => {
      it('has trigger object with all required properties', () => {
        expect(COMEBACK_CONFIG.trigger).toBeDefined()
        expect(typeof COMEBACK_CONFIG.trigger).toBe('object')
      })

      it('has enabled flag set to true by default', () => {
        expect(COMEBACK_CONFIG.trigger.enabled).toBe(true)
      })

      it('has marginPercent of 10', () => {
        expect(COMEBACK_CONFIG.trigger.marginPercent).toBe(10)
      })

      it('has maxAttemptsPerQuiz of 1', () => {
        expect(COMEBACK_CONFIG.trigger.maxAttemptsPerQuiz).toBe(1)
      })

      it('marginPercent is a positive number', () => {
        expect(COMEBACK_CONFIG.trigger.marginPercent).toBeGreaterThan(0)
        expect(typeof COMEBACK_CONFIG.trigger.marginPercent).toBe('number')
      })

      it('maxAttemptsPerQuiz is a positive integer', () => {
        expect(COMEBACK_CONFIG.trigger.maxAttemptsPerQuiz).toBeGreaterThan(0)
        expect(Number.isInteger(COMEBACK_CONFIG.trigger.maxAttemptsPerQuiz)).toBe(true)
      })
    })

    describe('challenge configuration', () => {
      it('has challenge object with all required properties', () => {
        expect(COMEBACK_CONFIG.challenge).toBeDefined()
        expect(typeof COMEBACK_CONFIG.challenge).toBe('object')
      })

      it('has questionCount of 3', () => {
        expect(COMEBACK_CONFIG.challenge.questionCount).toBe(3)
      })

      it('has timePerQuestion of 15 seconds', () => {
        expect(COMEBACK_CONFIG.challenge.timePerQuestion).toBe(15)
      })

      it('has requiredCorrect of 2', () => {
        expect(COMEBACK_CONFIG.challenge.requiredCorrect).toBe(2)
      })

      it('requiredCorrect is less than or equal to questionCount', () => {
        expect(COMEBACK_CONFIG.challenge.requiredCorrect).toBeLessThanOrEqual(
          COMEBACK_CONFIG.challenge.questionCount
        )
      })

      it('all challenge values are positive integers', () => {
        expect(COMEBACK_CONFIG.challenge.questionCount).toBeGreaterThan(0)
        expect(COMEBACK_CONFIG.challenge.timePerQuestion).toBeGreaterThan(0)
        expect(COMEBACK_CONFIG.challenge.requiredCorrect).toBeGreaterThan(0)
        expect(Number.isInteger(COMEBACK_CONFIG.challenge.questionCount)).toBe(true)
        expect(Number.isInteger(COMEBACK_CONFIG.challenge.timePerQuestion)).toBe(true)
        expect(Number.isInteger(COMEBACK_CONFIG.challenge.requiredCorrect)).toBe(true)
      })
    })

    describe('timing configuration', () => {
      it('has timing object with all required properties', () => {
        expect(COMEBACK_CONFIG.timing).toBeDefined()
        expect(typeof COMEBACK_CONFIG.timing).toBe('object')
      })

      it('has offerDelay for modal animation', () => {
        expect(COMEBACK_CONFIG.timing.offerDelay).toBeDefined()
        expect(typeof COMEBACK_CONFIG.timing.offerDelay).toBe('number')
        expect(COMEBACK_CONFIG.timing.offerDelay).toBeGreaterThanOrEqual(0)
      })

      it('has questionTransition for between questions', () => {
        expect(COMEBACK_CONFIG.timing.questionTransition).toBeDefined()
        expect(typeof COMEBACK_CONFIG.timing.questionTransition).toBe('number')
        expect(COMEBACK_CONFIG.timing.questionTransition).toBeGreaterThan(0)
      })

      it('has resultDelay for showing result', () => {
        expect(COMEBACK_CONFIG.timing.resultDelay).toBeDefined()
        expect(typeof COMEBACK_CONFIG.timing.resultDelay).toBe('number')
        expect(COMEBACK_CONFIG.timing.resultDelay).toBeGreaterThan(0)
      })

      it('has celebrationDuration for success celebration', () => {
        expect(COMEBACK_CONFIG.timing.celebrationDuration).toBeDefined()
        expect(typeof COMEBACK_CONFIG.timing.celebrationDuration).toBe('number')
        expect(COMEBACK_CONFIG.timing.celebrationDuration).toBeGreaterThan(0)
      })

      it('has failMessageDuration for failure message', () => {
        expect(COMEBACK_CONFIG.timing.failMessageDuration).toBeDefined()
        expect(typeof COMEBACK_CONFIG.timing.failMessageDuration).toBe('number')
        expect(COMEBACK_CONFIG.timing.failMessageDuration).toBeGreaterThan(0)
      })

      it('celebrationDuration is longer than resultDelay', () => {
        expect(COMEBACK_CONFIG.timing.celebrationDuration).toBeGreaterThan(
          COMEBACK_CONFIG.timing.resultDelay
        )
      })
    })

    describe('rewards configuration', () => {
      it('has rewards object with all required properties', () => {
        expect(COMEBACK_CONFIG.rewards).toBeDefined()
        expect(typeof COMEBACK_CONFIG.rewards).toBe('object')
      })

      it('has xpMultiplier of 0.7', () => {
        expect(COMEBACK_CONFIG.rewards.xpMultiplier).toBe(0.7)
      })

      it('has mysteryBoxTier of bronze', () => {
        expect(COMEBACK_CONFIG.rewards.mysteryBoxTier).toBe('bronze')
      })

      it('has grantsPiece set to true', () => {
        expect(COMEBACK_CONFIG.rewards.grantsPiece).toBe(true)
      })

      it('xpMultiplier is between 0 and 1', () => {
        expect(COMEBACK_CONFIG.rewards.xpMultiplier).toBeGreaterThan(0)
        expect(COMEBACK_CONFIG.rewards.xpMultiplier).toBeLessThanOrEqual(1)
      })

      it('mysteryBoxTier is a valid tier string', () => {
        const validTiers = ['bronze', 'silver', 'gold', 'legendary']
        expect(validTiers).toContain(COMEBACK_CONFIG.rewards.mysteryBoxTier)
      })
    })

    describe('styles configuration', () => {
      it('has styles object with all three levels', () => {
        expect(COMEBACK_CONFIG.styles).toBeDefined()
        expect(COMEBACK_CONFIG.styles.simple).toBeDefined()
        expect(COMEBACK_CONFIG.styles.standard).toBeDefined()
        expect(COMEBACK_CONFIG.styles.deep).toBeDefined()
      })

      describe('simple level style', () => {
        it('has required style properties', () => {
          const style = COMEBACK_CONFIG.styles.simple
          expect(style.icon).toBeDefined()
          expect(style.title).toBeDefined()
          expect(style.bgGradient).toBeDefined()
          expect(style.borderColor).toBeDefined()
          expect(style.glowColor).toBeDefined()
        })

        it('has appropriate title for comeback', () => {
          expect(COMEBACK_CONFIG.styles.simple.title).toBeTruthy()
          expect(typeof COMEBACK_CONFIG.styles.simple.title).toBe('string')
        })
      })

      describe('standard level style', () => {
        it('has required style properties', () => {
          const style = COMEBACK_CONFIG.styles.standard
          expect(style.icon).toBeDefined()
          expect(style.title).toBeDefined()
          expect(style.bgGradient).toBeDefined()
          expect(style.borderColor).toBeDefined()
          expect(style.glowColor).toBeDefined()
        })

        it('has different styling than simple', () => {
          const simple = COMEBACK_CONFIG.styles.simple
          const standard = COMEBACK_CONFIG.styles.standard
          expect(standard.bgGradient).not.toBe(simple.bgGradient)
        })
      })

      describe('deep level style', () => {
        it('has required style properties', () => {
          const style = COMEBACK_CONFIG.styles.deep
          expect(style.icon).toBeDefined()
          expect(style.title).toBeDefined()
          expect(style.bgGradient).toBeDefined()
          expect(style.borderColor).toBeDefined()
          expect(style.glowColor).toBeDefined()
        })

        it('has most intense styling', () => {
          const style = COMEBACK_CONFIG.styles.deep
          expect(style.bgGradient).toBeDefined()
          expect(style.glowColor).toBeDefined()
        })
      })
    })

    describe('messages configuration', () => {
      it('has messages object with offer and result messages', () => {
        expect(COMEBACK_CONFIG.messages).toBeDefined()
        expect(COMEBACK_CONFIG.messages.offer).toBeDefined()
        expect(COMEBACK_CONFIG.messages.success).toBeDefined()
        expect(COMEBACK_CONFIG.messages.failure).toBeDefined()
      })

      describe('offer messages', () => {
        it('has title for offer modal', () => {
          expect(COMEBACK_CONFIG.messages.offer.title).toBeDefined()
          expect(typeof COMEBACK_CONFIG.messages.offer.title).toBe('string')
          expect(COMEBACK_CONFIG.messages.offer.title.length).toBeGreaterThan(0)
        })

        it('has subtitle for offer modal', () => {
          expect(COMEBACK_CONFIG.messages.offer.subtitle).toBeDefined()
          expect(typeof COMEBACK_CONFIG.messages.offer.subtitle).toBe('string')
        })

        it('has acceptLabel for accept button', () => {
          expect(COMEBACK_CONFIG.messages.offer.acceptLabel).toBeDefined()
          expect(typeof COMEBACK_CONFIG.messages.offer.acceptLabel).toBe('string')
        })

        it('has declineLabel for decline button', () => {
          expect(COMEBACK_CONFIG.messages.offer.declineLabel).toBeDefined()
          expect(typeof COMEBACK_CONFIG.messages.offer.declineLabel).toBe('string')
        })
      })

      describe('success messages', () => {
        it('is an array of messages', () => {
          expect(Array.isArray(COMEBACK_CONFIG.messages.success)).toBe(true)
        })

        it('has at least 3 messages for variety', () => {
          expect(COMEBACK_CONFIG.messages.success.length).toBeGreaterThanOrEqual(3)
        })

        it('all messages are non-empty strings', () => {
          COMEBACK_CONFIG.messages.success.forEach((msg) => {
            expect(typeof msg).toBe('string')
            expect(msg.length).toBeGreaterThan(0)
          })
        })
      })

      describe('failure messages', () => {
        it('is an array of encouraging messages', () => {
          expect(Array.isArray(COMEBACK_CONFIG.messages.failure)).toBe(true)
        })

        it('has at least 3 messages for variety', () => {
          expect(COMEBACK_CONFIG.messages.failure.length).toBeGreaterThanOrEqual(3)
        })

        it('all messages are non-empty strings', () => {
          COMEBACK_CONFIG.messages.failure.forEach((msg) => {
            expect(typeof msg).toBe('string')
            expect(msg.length).toBeGreaterThan(0)
          })
        })
      })
    })
  })

  describe('getStyleForLevel', () => {
    it('returns simple style for simple level', () => {
      const style = getStyleForLevel('simple')
      expect(style).toEqual(COMEBACK_CONFIG.styles.simple)
    })

    it('returns standard style for standard level', () => {
      const style = getStyleForLevel('standard')
      expect(style).toEqual(COMEBACK_CONFIG.styles.standard)
    })

    it('returns deep style for deep level', () => {
      const style = getStyleForLevel('deep')
      expect(style).toEqual(COMEBACK_CONFIG.styles.deep)
    })

    describe('fallback behavior', () => {
      it('returns simple style for undefined level', () => {
        const style = getStyleForLevel(undefined)
        expect(style).toEqual(COMEBACK_CONFIG.styles.simple)
      })

      it('returns simple style for null level', () => {
        const style = getStyleForLevel(null)
        expect(style).toEqual(COMEBACK_CONFIG.styles.simple)
      })

      it('returns simple style for invalid level string', () => {
        const style = getStyleForLevel('invalid')
        expect(style).toEqual(COMEBACK_CONFIG.styles.simple)
      })

      it('returns simple style for empty string', () => {
        const style = getStyleForLevel('')
        expect(style).toEqual(COMEBACK_CONFIG.styles.simple)
      })

      it('returns simple style for numeric input', () => {
        const style = getStyleForLevel(42)
        expect(style).toEqual(COMEBACK_CONFIG.styles.simple)
      })
    })
  })

  describe('checkComebackEligibility', () => {
    it('returns true when score is within margin of passing threshold', () => {
      // Score 55, threshold 60, margin 10 -> within range (50-60)
      const result = checkComebackEligibility(55, 60, 10)
      expect(result).toBe(true)
    })

    it('returns true when score is exactly at margin boundary', () => {
      // Score 50, threshold 60, margin 10 -> exactly at boundary (60 - 10 = 50)
      const result = checkComebackEligibility(50, 60, 10)
      expect(result).toBe(true)
    })

    it('returns false when score is above passing threshold', () => {
      // Score 65, threshold 60 -> passed, no comeback needed
      const result = checkComebackEligibility(65, 60, 10)
      expect(result).toBe(false)
    })

    it('returns false when score is exactly at passing threshold', () => {
      // Score 60, threshold 60 -> passed, no comeback needed
      const result = checkComebackEligibility(60, 60, 10)
      expect(result).toBe(false)
    })

    it('returns false when score is below margin range', () => {
      // Score 45, threshold 60, margin 10 -> below range (50-60)
      const result = checkComebackEligibility(45, 60, 10)
      expect(result).toBe(false)
    })

    it('works with different thresholds', () => {
      // Score 65, threshold 70, margin 10 -> within range (60-70)
      expect(checkComebackEligibility(65, 70, 10)).toBe(true)
      // Score 55, threshold 70, margin 10 -> below range
      expect(checkComebackEligibility(55, 70, 10)).toBe(false)
    })

    it('works with different margin percentages', () => {
      // Score 52, threshold 60, margin 15 -> within range (45-60)
      expect(checkComebackEligibility(52, 60, 15)).toBe(true)
      // Score 40, threshold 60, margin 15 -> below range
      expect(checkComebackEligibility(40, 60, 15)).toBe(false)
    })

    it('uses default margin from config when not provided', () => {
      // Using default margin of 10%
      const result = checkComebackEligibility(55, 60)
      expect(result).toBe(true)
    })

    describe('edge cases', () => {
      it('handles zero score', () => {
        const result = checkComebackEligibility(0, 60, 10)
        expect(result).toBe(false)
      })

      it('handles negative score', () => {
        const result = checkComebackEligibility(-5, 60, 10)
        expect(result).toBe(false)
      })

      it('handles zero threshold', () => {
        const result = checkComebackEligibility(5, 0, 10)
        expect(result).toBe(false)
      })

      it('handles zero margin', () => {
        // With zero margin, only exact threshold - 0 would qualify (none)
        const result = checkComebackEligibility(59, 60, 0)
        expect(result).toBe(false)
      })

      it('handles 100% threshold', () => {
        // Score 95, threshold 100, margin 10 -> within range (90-100)
        const result = checkComebackEligibility(95, 100, 10)
        expect(result).toBe(true)
      })

      it('handles decimal scores', () => {
        const result = checkComebackEligibility(55.5, 60, 10)
        expect(result).toBe(true)
      })

      it('handles undefined inputs gracefully', () => {
        expect(() => checkComebackEligibility(undefined, 60, 10)).not.toThrow()
        expect(() => checkComebackEligibility(50, undefined, 10)).not.toThrow()
      })

      it('returns false for undefined score', () => {
        const result = checkComebackEligibility(undefined, 60, 10)
        expect(result).toBe(false)
      })

      it('returns false for null score', () => {
        const result = checkComebackEligibility(null, 60, 10)
        expect(result).toBe(false)
      })
    })
  })

  describe('calculateComebackRewards', () => {
    it('returns rewards object with correct shape', () => {
      const rewards = calculateComebackRewards(100)
      expect(rewards).toHaveProperty('xp')
      expect(rewards).toHaveProperty('tier')
      expect(rewards).toHaveProperty('grantsPiece')
    })

    it('calculates XP with 0.7 multiplier', () => {
      const baseXp = 100
      const rewards = calculateComebackRewards(baseXp)
      expect(rewards.xp).toBe(Math.round(baseXp * 0.7))
    })

    it('returns bronze tier', () => {
      const rewards = calculateComebackRewards(100)
      expect(rewards.tier).toBe('bronze')
    })

    it('returns grantsPiece as true', () => {
      const rewards = calculateComebackRewards(100)
      expect(rewards.grantsPiece).toBe(true)
    })

    it('rounds XP to nearest integer', () => {
      const baseXp = 33 // 33 * 0.7 = 23.1
      const rewards = calculateComebackRewards(baseXp)
      expect(Number.isInteger(rewards.xp)).toBe(true)
      expect(rewards.xp).toBe(23)
    })

    it('handles large XP values', () => {
      const rewards = calculateComebackRewards(1000)
      expect(rewards.xp).toBe(700)
    })

    it('handles zero XP', () => {
      const rewards = calculateComebackRewards(0)
      expect(rewards.xp).toBe(0)
    })

    describe('edge cases', () => {
      it('handles undefined baseXp', () => {
        expect(() => calculateComebackRewards(undefined)).not.toThrow()
        const rewards = calculateComebackRewards(undefined)
        expect(rewards.xp).toBe(0)
      })

      it('handles null baseXp', () => {
        expect(() => calculateComebackRewards(null)).not.toThrow()
        const rewards = calculateComebackRewards(null)
        expect(rewards.xp).toBe(0)
      })

      it('handles negative baseXp', () => {
        const rewards = calculateComebackRewards(-50)
        expect(rewards.xp).toBe(0)
      })

      it('handles decimal baseXp', () => {
        const rewards = calculateComebackRewards(100.5)
        expect(Number.isInteger(rewards.xp)).toBe(true)
      })
    })
  })

  describe('type safety and immutability', () => {
    it('COMEBACK_CONFIG is frozen (immutable)', () => {
      expect(Object.isFrozen(COMEBACK_CONFIG)).toBe(true)
    })

    it('trigger object is frozen', () => {
      expect(Object.isFrozen(COMEBACK_CONFIG.trigger)).toBe(true)
    })

    it('challenge object is frozen', () => {
      expect(Object.isFrozen(COMEBACK_CONFIG.challenge)).toBe(true)
    })

    it('timing object is frozen', () => {
      expect(Object.isFrozen(COMEBACK_CONFIG.timing)).toBe(true)
    })

    it('rewards object is frozen', () => {
      expect(Object.isFrozen(COMEBACK_CONFIG.rewards)).toBe(true)
    })

    it('styles object is frozen', () => {
      expect(Object.isFrozen(COMEBACK_CONFIG.styles)).toBe(true)
    })

    it('messages object is frozen', () => {
      expect(Object.isFrozen(COMEBACK_CONFIG.messages)).toBe(true)
    })

    it('individual style objects are frozen', () => {
      Object.values(COMEBACK_CONFIG.styles).forEach((style) => {
        expect(Object.isFrozen(style)).toBe(true)
      })
    })

    it('cannot modify COMEBACK_CONFIG', () => {
      expect(() => {
        COMEBACK_CONFIG.newProp = 'test'
      }).toThrow()
    })

    it('cannot modify trigger values', () => {
      expect(() => {
        COMEBACK_CONFIG.trigger.marginPercent = 9999
      }).toThrow()
    })

    it('cannot modify challenge values', () => {
      expect(() => {
        COMEBACK_CONFIG.challenge.questionCount = 9999
      }).toThrow()
    })

    it('cannot modify rewards values', () => {
      expect(() => {
        COMEBACK_CONFIG.rewards.xpMultiplier = 9999
      }).toThrow()
    })
  })

  describe('level name constants', () => {
    it('recognizes simple as valid level', () => {
      const style = getStyleForLevel('simple')
      expect(style).toBeDefined()
      expect(style.title).toBeTruthy()
    })

    it('recognizes standard as valid level', () => {
      const style = getStyleForLevel('standard')
      expect(style).toBeDefined()
      expect(style.title).toBeTruthy()
    })

    it('recognizes deep as valid level', () => {
      const style = getStyleForLevel('deep')
      expect(style).toBeDefined()
      expect(style.title).toBeTruthy()
    })

    it('all levels have unique titles', () => {
      const titles = [
        COMEBACK_CONFIG.styles.simple.title,
        COMEBACK_CONFIG.styles.standard.title,
        COMEBACK_CONFIG.styles.deep.title,
      ]
      const uniqueTitles = new Set(titles)
      expect(uniqueTitles.size).toBe(3)
    })
  })
})
