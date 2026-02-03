/**
 * Boss Battle Config Tests
 *
 * Tests for the Boss Battle System configuration and utility functions.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Boss battle config structure and constants
 * - Timing configuration
 * - Reward values
 * - Style definitions per level
 * - Intro message retrieval
 * - Utility functions
 * - Edge cases and fallback behavior
 */

import { describe, it, expect } from 'vitest'
import {
  BOSS_BATTLE_CONFIG,
  getBossStyle,
  getIntroMessages,
  getBossRewards,
} from '../bossBattleConfig'

describe('bossBattleConfig', () => {
  describe('BOSS_BATTLE_CONFIG', () => {
    it('exports BOSS_BATTLE_CONFIG object', () => {
      expect(BOSS_BATTLE_CONFIG).toBeDefined()
      expect(typeof BOSS_BATTLE_CONFIG).toBe('object')
    })

    describe('timing configuration', () => {
      it('has timing object with all required properties', () => {
        expect(BOSS_BATTLE_CONFIG.timing).toBeDefined()
        expect(typeof BOSS_BATTLE_CONFIG.timing).toBe('object')
      })

      it('has introDelay of 500ms', () => {
        expect(BOSS_BATTLE_CONFIG.timing.introDelay).toBe(500)
      })

      it('has introDuration of 2500ms', () => {
        expect(BOSS_BATTLE_CONFIG.timing.introDuration).toBe(2500)
      })

      it('has answerRevealDelay for dramatic pause', () => {
        expect(BOSS_BATTLE_CONFIG.timing.answerRevealDelay).toBeDefined()
        expect(typeof BOSS_BATTLE_CONFIG.timing.answerRevealDelay).toBe('number')
        expect(BOSS_BATTLE_CONFIG.timing.answerRevealDelay).toBeGreaterThan(0)
      })

      it('has victoryDuration of approximately 3000ms', () => {
        expect(BOSS_BATTLE_CONFIG.timing.victoryDuration).toBeDefined()
        expect(BOSS_BATTLE_CONFIG.timing.victoryDuration).toBeGreaterThanOrEqual(2500)
        expect(BOSS_BATTLE_CONFIG.timing.victoryDuration).toBeLessThanOrEqual(4000)
      })

      it('has defeatDuration of approximately 2000ms', () => {
        expect(BOSS_BATTLE_CONFIG.timing.defeatDuration).toBeDefined()
        expect(BOSS_BATTLE_CONFIG.timing.defeatDuration).toBeGreaterThanOrEqual(1500)
        expect(BOSS_BATTLE_CONFIG.timing.defeatDuration).toBeLessThanOrEqual(3000)
      })
    })

    describe('rewards configuration', () => {
      it('has rewards object with all required properties', () => {
        expect(BOSS_BATTLE_CONFIG.rewards).toBeDefined()
        expect(typeof BOSS_BATTLE_CONFIG.rewards).toBe('object')
      })

      it('has victoryXpBonus of 25', () => {
        expect(BOSS_BATTLE_CONFIG.rewards.victoryXpBonus).toBe(25)
      })

      it('has mysteryBoxUpgrade of 1 tier', () => {
        expect(BOSS_BATTLE_CONFIG.rewards.mysteryBoxUpgrade).toBe(1)
      })

      it('rewards values are positive numbers', () => {
        expect(BOSS_BATTLE_CONFIG.rewards.victoryXpBonus).toBeGreaterThan(0)
        expect(BOSS_BATTLE_CONFIG.rewards.mysteryBoxUpgrade).toBeGreaterThan(0)
      })
    })

    describe('styles configuration', () => {
      it('has styles object with all three levels', () => {
        expect(BOSS_BATTLE_CONFIG.styles).toBeDefined()
        expect(BOSS_BATTLE_CONFIG.styles.simple).toBeDefined()
        expect(BOSS_BATTLE_CONFIG.styles.standard).toBeDefined()
        expect(BOSS_BATTLE_CONFIG.styles.deep).toBeDefined()
      })

      describe('simple level style', () => {
        it('has required style properties', () => {
          const style = BOSS_BATTLE_CONFIG.styles.simple
          expect(style.icon).toBeDefined()
          expect(style.name).toBeDefined()
          expect(style.bgGradient).toBeDefined()
          expect(style.borderColor).toBeDefined()
          expect(style.glowColor).toBeDefined()
        })

        it('has appropriate boss name for kids', () => {
          expect(BOSS_BATTLE_CONFIG.styles.simple.name).toBeTruthy()
          expect(typeof BOSS_BATTLE_CONFIG.styles.simple.name).toBe('string')
        })
      })

      describe('standard level style', () => {
        it('has required style properties', () => {
          const style = BOSS_BATTLE_CONFIG.styles.standard
          expect(style.icon).toBeDefined()
          expect(style.name).toBeDefined()
          expect(style.bgGradient).toBeDefined()
          expect(style.borderColor).toBeDefined()
          expect(style.glowColor).toBeDefined()
        })

        it('has more intense styling than simple', () => {
          const simple = BOSS_BATTLE_CONFIG.styles.simple
          const standard = BOSS_BATTLE_CONFIG.styles.standard
          // Standard should have different/more intense visual treatment
          expect(standard.bgGradient).not.toBe(simple.bgGradient)
        })
      })

      describe('deep level style', () => {
        it('has required style properties', () => {
          const style = BOSS_BATTLE_CONFIG.styles.deep
          expect(style.icon).toBeDefined()
          expect(style.name).toBeDefined()
          expect(style.bgGradient).toBeDefined()
          expect(style.borderColor).toBeDefined()
          expect(style.glowColor).toBeDefined()
        })

        it('has most intense styling', () => {
          const style = BOSS_BATTLE_CONFIG.styles.deep
          // Deep should have the most dramatic visual treatment
          expect(style.bgGradient).toBeDefined()
          expect(style.glowColor).toBeDefined()
        })
      })
    })

    describe('introMessages configuration', () => {
      it('has introMessages object with all three levels', () => {
        expect(BOSS_BATTLE_CONFIG.introMessages).toBeDefined()
        expect(BOSS_BATTLE_CONFIG.introMessages.simple).toBeDefined()
        expect(BOSS_BATTLE_CONFIG.introMessages.standard).toBeDefined()
        expect(BOSS_BATTLE_CONFIG.introMessages.deep).toBeDefined()
      })

      it('each level has array of messages', () => {
        expect(Array.isArray(BOSS_BATTLE_CONFIG.introMessages.simple)).toBe(true)
        expect(Array.isArray(BOSS_BATTLE_CONFIG.introMessages.standard)).toBe(true)
        expect(Array.isArray(BOSS_BATTLE_CONFIG.introMessages.deep)).toBe(true)
      })

      it('each level has at least 3 messages for variety', () => {
        expect(BOSS_BATTLE_CONFIG.introMessages.simple.length).toBeGreaterThanOrEqual(3)
        expect(BOSS_BATTLE_CONFIG.introMessages.standard.length).toBeGreaterThanOrEqual(3)
        expect(BOSS_BATTLE_CONFIG.introMessages.deep.length).toBeGreaterThanOrEqual(3)
      })

      it('messages are non-empty strings', () => {
        BOSS_BATTLE_CONFIG.introMessages.simple.forEach((msg) => {
          expect(typeof msg).toBe('string')
          expect(msg.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('getBossStyle', () => {
    it('returns simple style for simple level', () => {
      const style = getBossStyle('simple')
      expect(style).toEqual(BOSS_BATTLE_CONFIG.styles.simple)
    })

    it('returns standard style for standard level', () => {
      const style = getBossStyle('standard')
      expect(style).toEqual(BOSS_BATTLE_CONFIG.styles.standard)
    })

    it('returns deep style for deep level', () => {
      const style = getBossStyle('deep')
      expect(style).toEqual(BOSS_BATTLE_CONFIG.styles.deep)
    })

    describe('fallback behavior', () => {
      it('returns simple style for undefined level', () => {
        const style = getBossStyle(undefined)
        expect(style).toEqual(BOSS_BATTLE_CONFIG.styles.simple)
      })

      it('returns simple style for null level', () => {
        const style = getBossStyle(null)
        expect(style).toEqual(BOSS_BATTLE_CONFIG.styles.simple)
      })

      it('returns simple style for invalid level string', () => {
        const style = getBossStyle('invalid')
        expect(style).toEqual(BOSS_BATTLE_CONFIG.styles.simple)
      })

      it('returns simple style for empty string', () => {
        const style = getBossStyle('')
        expect(style).toEqual(BOSS_BATTLE_CONFIG.styles.simple)
      })

      it('returns simple style for numeric input', () => {
        const style = getBossStyle(42)
        expect(style).toEqual(BOSS_BATTLE_CONFIG.styles.simple)
      })
    })
  })

  describe('getIntroMessages', () => {
    it('returns simple messages for simple level', () => {
      const messages = getIntroMessages('simple')
      expect(messages).toEqual(BOSS_BATTLE_CONFIG.introMessages.simple)
    })

    it('returns standard messages for standard level', () => {
      const messages = getIntroMessages('standard')
      expect(messages).toEqual(BOSS_BATTLE_CONFIG.introMessages.standard)
    })

    it('returns deep messages for deep level', () => {
      const messages = getIntroMessages('deep')
      expect(messages).toEqual(BOSS_BATTLE_CONFIG.introMessages.deep)
    })

    it('returns array of strings', () => {
      const messages = getIntroMessages('simple')
      expect(Array.isArray(messages)).toBe(true)
      messages.forEach((msg) => {
        expect(typeof msg).toBe('string')
      })
    })

    describe('fallback behavior', () => {
      it('returns simple messages for undefined level', () => {
        const messages = getIntroMessages(undefined)
        expect(messages).toEqual(BOSS_BATTLE_CONFIG.introMessages.simple)
      })

      it('returns simple messages for null level', () => {
        const messages = getIntroMessages(null)
        expect(messages).toEqual(BOSS_BATTLE_CONFIG.introMessages.simple)
      })

      it('returns simple messages for invalid level', () => {
        const messages = getIntroMessages('extreme')
        expect(messages).toEqual(BOSS_BATTLE_CONFIG.introMessages.simple)
      })
    })
  })

  describe('getBossRewards', () => {
    it('returns rewards object', () => {
      const rewards = getBossRewards()
      expect(rewards).toBeDefined()
      expect(typeof rewards).toBe('object')
    })

    it('includes victoryXpBonus', () => {
      const rewards = getBossRewards()
      expect(rewards.victoryXpBonus).toBe(BOSS_BATTLE_CONFIG.rewards.victoryXpBonus)
    })

    it('includes mysteryBoxUpgrade', () => {
      const rewards = getBossRewards()
      expect(rewards.mysteryBoxUpgrade).toBe(BOSS_BATTLE_CONFIG.rewards.mysteryBoxUpgrade)
    })
  })

  describe('type safety and immutability', () => {
    it('BOSS_BATTLE_CONFIG is frozen (immutable)', () => {
      expect(Object.isFrozen(BOSS_BATTLE_CONFIG)).toBe(true)
    })

    it('timing object is frozen', () => {
      expect(Object.isFrozen(BOSS_BATTLE_CONFIG.timing)).toBe(true)
    })

    it('rewards object is frozen', () => {
      expect(Object.isFrozen(BOSS_BATTLE_CONFIG.rewards)).toBe(true)
    })

    it('styles object is frozen', () => {
      expect(Object.isFrozen(BOSS_BATTLE_CONFIG.styles)).toBe(true)
    })

    it('individual style objects are frozen', () => {
      Object.values(BOSS_BATTLE_CONFIG.styles).forEach((style) => {
        expect(Object.isFrozen(style)).toBe(true)
      })
    })

    it('cannot modify BOSS_BATTLE_CONFIG', () => {
      expect(() => {
        BOSS_BATTLE_CONFIG.newProp = 'test'
      }).toThrow()
    })

    it('cannot modify timing values', () => {
      expect(() => {
        BOSS_BATTLE_CONFIG.timing.introDelay = 9999
      }).toThrow()
    })

    it('cannot modify rewards values', () => {
      expect(() => {
        BOSS_BATTLE_CONFIG.rewards.victoryXpBonus = 9999
      }).toThrow()
    })
  })

  describe('level name constants', () => {
    it('recognizes simple as valid level', () => {
      const style = getBossStyle('simple')
      expect(style).toBeDefined()
      expect(style.name).toBeTruthy()
    })

    it('recognizes standard as valid level', () => {
      const style = getBossStyle('standard')
      expect(style).toBeDefined()
      expect(style.name).toBeTruthy()
    })

    it('recognizes deep as valid level', () => {
      const style = getBossStyle('deep')
      expect(style).toBeDefined()
      expect(style.name).toBeTruthy()
    })

    it('all levels have unique boss names', () => {
      const names = [
        BOSS_BATTLE_CONFIG.styles.simple.name,
        BOSS_BATTLE_CONFIG.styles.standard.name,
        BOSS_BATTLE_CONFIG.styles.deep.name,
      ]
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(3)
    })
  })
})
