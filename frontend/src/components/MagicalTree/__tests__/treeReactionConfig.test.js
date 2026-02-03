/**
 * treeReactionConfig Tests
 *
 * TDD: These tests define the behavior for the tree reaction configuration
 * BEFORE implementation. The config defines how the Magical Tree reacts
 * to quiz results (pass, perfect, boss_victory, streak, fail).
 *
 * Test Coverage Target: 80%+
 */

import { describe, it, expect } from 'vitest'

// Import the module under test (will fail until implemented)
import {
  TREE_REACTIONS,
  PARTICLE_CONFIGS,
  getReactionConfig,
} from '../treeReactionConfig'

describe('treeReactionConfig', () => {
  describe('TREE_REACTIONS constant', () => {
    it('exports TREE_REACTIONS object', () => {
      expect(TREE_REACTIONS).toBeDefined()
      expect(typeof TREE_REACTIONS).toBe('object')
    })

    it('defines all 5 reaction types', () => {
      const expectedTypes = ['pass', 'perfect', 'boss_victory', 'streak', 'fail']
      expectedTypes.forEach((type) => {
        expect(TREE_REACTIONS[type]).toBeDefined()
      })
    })

    describe('pass reaction', () => {
      it('has correct configuration', () => {
        const pass = TREE_REACTIONS.pass
        expect(pass.color).toBe('emerald')
        expect(pass.animation).toBe('shimmer')
        expect(pass.duration).toBe(2000)
        expect(pass.particles).toBe('leaves')
        expect(pass.sound).toBe('playEvolutionSound')
        expect(pass.message).toBe('Your tree is growing!')
      })
    })

    describe('perfect reaction', () => {
      it('has correct configuration', () => {
        const perfect = TREE_REACTIONS.perfect
        expect(perfect.color).toBe('amber')
        expect(perfect.animation).toBe('growth')
        expect(perfect.duration).toBe(3000)
        expect(perfect.particles).toBe('sparkles')
        expect(perfect.sound).toBe('playTierUpSound')
        expect(perfect.message).toBe('Perfect! Your tree shines!')
      })

      it('has longer duration than pass', () => {
        expect(TREE_REACTIONS.perfect.duration).toBeGreaterThan(
          TREE_REACTIONS.pass.duration
        )
      })
    })

    describe('boss_victory reaction', () => {
      it('has correct configuration', () => {
        const bossVictory = TREE_REACTIONS.boss_victory
        expect(bossVictory.color).toBe('purple')
        expect(bossVictory.animation).toBe('dance')
        expect(bossVictory.duration).toBe(3500)
        expect(bossVictory.particles).toBe('fireworks')
        expect(bossVictory.sound).toBe('playBossVictorySound')
        expect(bossVictory.message).toBe('Boss defeated! Tree power!')
      })

      it('has the longest duration', () => {
        const durations = Object.values(TREE_REACTIONS).map((r) => r.duration)
        expect(TREE_REACTIONS.boss_victory.duration).toBe(Math.max(...durations))
      })
    })

    describe('streak reaction', () => {
      it('has correct configuration', () => {
        const streak = TREE_REACTIONS.streak
        expect(streak.color).toBe('cyan')
        expect(streak.animation).toBe('glow')
        expect(streak.duration).toBe(1500)
        expect(streak.particles).toBe('streaks')
        expect(streak.sound).toBe('playStreakSound')
        expect(streak.message).toBeNull()
      })

      it('has the shortest duration (quick feedback)', () => {
        const durations = Object.values(TREE_REACTIONS).map((r) => r.duration)
        expect(TREE_REACTIONS.streak.duration).toBe(Math.min(...durations))
      })

      it('has no message (non-intrusive)', () => {
        expect(TREE_REACTIONS.streak.message).toBeNull()
      })
    })

    describe('fail reaction', () => {
      it('has correct configuration', () => {
        const fail = TREE_REACTIONS.fail
        expect(fail.color).toBe('slate')
        expect(fail.animation).toBe('gentle_droop')
        expect(fail.duration).toBe(1200)
        expect(fail.particles).toBeNull()
        expect(fail.sound).toBeNull()
        expect(fail.message).toBe('Keep learning! Your tree believes in you!')
      })

      it('has no particles (sympathetic, not punishing)', () => {
        expect(TREE_REACTIONS.fail.particles).toBeNull()
      })

      it('has no sound (gentle failure feedback)', () => {
        expect(TREE_REACTIONS.fail.sound).toBeNull()
      })

      it('has encouraging message', () => {
        expect(TREE_REACTIONS.fail.message).toMatch(/keep learning|believes/i)
      })
    })

    describe('immutability', () => {
      it('TREE_REACTIONS is frozen (immutable)', () => {
        expect(Object.isFrozen(TREE_REACTIONS)).toBe(true)
      })

      it('individual reaction configs are frozen', () => {
        Object.values(TREE_REACTIONS).forEach((config) => {
          expect(Object.isFrozen(config)).toBe(true)
        })
      })
    })

    describe('duration constraints', () => {
      it('all durations are positive numbers', () => {
        Object.values(TREE_REACTIONS).forEach((config) => {
          expect(typeof config.duration).toBe('number')
          expect(config.duration).toBeGreaterThan(0)
        })
      })

      it('all durations are reasonable (under 5 seconds)', () => {
        Object.values(TREE_REACTIONS).forEach((config) => {
          expect(config.duration).toBeLessThanOrEqual(5000)
        })
      })
    })
  })

  describe('PARTICLE_CONFIGS constant', () => {
    it('exports PARTICLE_CONFIGS object', () => {
      expect(PARTICLE_CONFIGS).toBeDefined()
      expect(typeof PARTICLE_CONFIGS).toBe('object')
    })

    it('defines all particle types used in reactions', () => {
      const particleTypes = ['leaves', 'sparkles', 'fireworks', 'streaks']
      particleTypes.forEach((type) => {
        expect(PARTICLE_CONFIGS[type]).toBeDefined()
      })
    })

    describe('leaves config', () => {
      it('has correct properties', () => {
        const leaves = PARTICLE_CONFIGS.leaves
        expect(leaves.count).toBeDefined()
        expect(typeof leaves.count).toBe('number')
        expect(leaves.count).toBeGreaterThan(0)
        expect(leaves.colors).toBeDefined()
        expect(Array.isArray(leaves.colors)).toBe(true)
        expect(leaves.colors.length).toBeGreaterThan(0)
        expect(leaves.speed).toBeDefined()
      })

      it('uses green-ish colors for leaves', () => {
        const leaves = PARTICLE_CONFIGS.leaves
        // Should include emerald/green shades
        expect(leaves.colors.some((c) => /green|emerald/i.test(c) || c.includes('22C55E'))).toBe(true)
      })
    })

    describe('sparkles config', () => {
      it('has correct properties', () => {
        const sparkles = PARTICLE_CONFIGS.sparkles
        expect(sparkles.count).toBeDefined()
        expect(sparkles.colors).toBeDefined()
        expect(sparkles.speed).toBeDefined()
      })

      it('uses gold/yellow colors for sparkles', () => {
        const sparkles = PARTICLE_CONFIGS.sparkles
        expect(sparkles.colors.some((c) => /gold|amber|yellow/i.test(c) || c.includes('F59E0B') || c.includes('FBBF24'))).toBe(true)
      })

      it('has more particles than leaves (more celebratory)', () => {
        expect(PARTICLE_CONFIGS.sparkles.count).toBeGreaterThanOrEqual(
          PARTICLE_CONFIGS.leaves.count
        )
      })
    })

    describe('fireworks config', () => {
      it('has correct properties', () => {
        const fireworks = PARTICLE_CONFIGS.fireworks
        expect(fireworks.count).toBeDefined()
        expect(fireworks.colors).toBeDefined()
        expect(fireworks.speed).toBeDefined()
      })

      it('has the most particles (big celebration)', () => {
        const counts = Object.values(PARTICLE_CONFIGS).map((c) => c.count)
        expect(PARTICLE_CONFIGS.fireworks.count).toBe(Math.max(...counts))
      })

      it('uses multiple colors (celebration variety)', () => {
        expect(PARTICLE_CONFIGS.fireworks.colors.length).toBeGreaterThanOrEqual(4)
      })
    })

    describe('streaks config', () => {
      it('has correct properties', () => {
        const streaks = PARTICLE_CONFIGS.streaks
        expect(streaks.count).toBeDefined()
        expect(streaks.colors).toBeDefined()
        expect(streaks.speed).toBeDefined()
      })

      it('has fewer particles (quick, subtle effect)', () => {
        const counts = Object.values(PARTICLE_CONFIGS).map((c) => c.count)
        expect(PARTICLE_CONFIGS.streaks.count).toBe(Math.min(...counts))
      })

      it('has faster speed (streak movement feel)', () => {
        expect(PARTICLE_CONFIGS.streaks.speed).toBeGreaterThan(
          PARTICLE_CONFIGS.leaves.speed
        )
      })
    })

    describe('immutability', () => {
      it('PARTICLE_CONFIGS is frozen', () => {
        expect(Object.isFrozen(PARTICLE_CONFIGS)).toBe(true)
      })

      it('individual particle configs are frozen', () => {
        Object.values(PARTICLE_CONFIGS).forEach((config) => {
          expect(Object.isFrozen(config)).toBe(true)
        })
      })
    })
  })

  describe('getReactionConfig function', () => {
    it('is exported as a function', () => {
      expect(typeof getReactionConfig).toBe('function')
    })

    it('returns pass config for "pass" type', () => {
      const config = getReactionConfig('pass')
      expect(config).toEqual(TREE_REACTIONS.pass)
    })

    it('returns perfect config for "perfect" type', () => {
      const config = getReactionConfig('perfect')
      expect(config).toEqual(TREE_REACTIONS.perfect)
    })

    it('returns boss_victory config for "boss_victory" type', () => {
      const config = getReactionConfig('boss_victory')
      expect(config).toEqual(TREE_REACTIONS.boss_victory)
    })

    it('returns streak config for "streak" type', () => {
      const config = getReactionConfig('streak')
      expect(config).toEqual(TREE_REACTIONS.streak)
    })

    it('returns fail config for "fail" type', () => {
      const config = getReactionConfig('fail')
      expect(config).toEqual(TREE_REACTIONS.fail)
    })

    describe('fallback behavior', () => {
      it('returns pass config for unknown type', () => {
        const config = getReactionConfig('unknown')
        expect(config).toEqual(TREE_REACTIONS.pass)
      })

      it('returns pass config for null', () => {
        const config = getReactionConfig(null)
        expect(config).toEqual(TREE_REACTIONS.pass)
      })

      it('returns pass config for undefined', () => {
        const config = getReactionConfig(undefined)
        expect(config).toEqual(TREE_REACTIONS.pass)
      })

      it('returns pass config for empty string', () => {
        const config = getReactionConfig('')
        expect(config).toEqual(TREE_REACTIONS.pass)
      })
    })

    describe('case sensitivity', () => {
      it('handles lowercase correctly', () => {
        expect(getReactionConfig('pass')).toEqual(TREE_REACTIONS.pass)
        expect(getReactionConfig('perfect')).toEqual(TREE_REACTIONS.perfect)
      })

      it('falls back to pass for incorrect case', () => {
        // Config keys should be exact match
        expect(getReactionConfig('PASS')).toEqual(TREE_REACTIONS.pass)
        expect(getReactionConfig('Perfect')).toEqual(TREE_REACTIONS.pass)
      })
    })

    describe('return value immutability', () => {
      it('returns frozen config (cannot be modified)', () => {
        const config = getReactionConfig('pass')
        expect(Object.isFrozen(config)).toBe(true)
      })
    })
  })
})
