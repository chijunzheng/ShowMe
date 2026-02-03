/**
 * Game Config - QUICK_WINS Configuration Tests
 *
 * Tests for the QUICK_WINS configuration added for Phase 6.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - QUICK_WINS constant export
 * - dramaticPause configuration
 * - streakMilestones configuration
 * - flameIntensity mapping
 * - contextualFeedback configuration
 * - Configuration value validation
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { QUICK_WINS, MISSIONS, POWER_UPS } from '../gameConfig'

describe('gameConfig - QUICK_WINS', () => {
  describe('export', () => {
    it('exports QUICK_WINS constant', () => {
      expect(QUICK_WINS).toBeDefined()
      expect(typeof QUICK_WINS).toBe('object')
    })

    it('QUICK_WINS is not null', () => {
      expect(QUICK_WINS).not.toBeNull()
    })

    it('existing exports (MISSIONS, POWER_UPS) still work', () => {
      expect(MISSIONS).toBeDefined()
      expect(POWER_UPS).toBeDefined()
    })
  })

  describe('dramaticPause configuration', () => {
    it('has dramaticPause configuration object', () => {
      expect(QUICK_WINS.dramaticPause).toBeDefined()
      expect(typeof QUICK_WINS.dramaticPause).toBe('object')
    })

    it('dramaticPause.duration is 800ms', () => {
      expect(QUICK_WINS.dramaticPause.duration).toBe(800)
    })

    it('dramaticPause.showSuspenseText is boolean', () => {
      expect(typeof QUICK_WINS.dramaticPause.showSuspenseText).toBe('boolean')
    })

    it('dramaticPause.showSuspenseText is true by default', () => {
      expect(QUICK_WINS.dramaticPause.showSuspenseText).toBe(true)
    })

    it('dramaticPause.soundEnabled is boolean', () => {
      expect(typeof QUICK_WINS.dramaticPause.soundEnabled).toBe('boolean')
    })

    it('dramaticPause.soundEnabled is true by default', () => {
      expect(QUICK_WINS.dramaticPause.soundEnabled).toBe(true)
    })
  })

  describe('streakMilestones configuration', () => {
    it('has streakMilestones array', () => {
      expect(QUICK_WINS.streakMilestones).toBeDefined()
      expect(Array.isArray(QUICK_WINS.streakMilestones)).toBe(true)
    })

    it('streakMilestones contains [3, 5, 7, 10]', () => {
      expect(QUICK_WINS.streakMilestones).toContain(3)
      expect(QUICK_WINS.streakMilestones).toContain(5)
      expect(QUICK_WINS.streakMilestones).toContain(7)
      expect(QUICK_WINS.streakMilestones).toContain(10)
    })

    it('streakMilestones are in ascending order', () => {
      const milestones = QUICK_WINS.streakMilestones
      for (let i = 1; i < milestones.length; i++) {
        expect(milestones[i]).toBeGreaterThan(milestones[i - 1])
      }
    })

    it('streakMilestones has exactly 4 elements', () => {
      expect(QUICK_WINS.streakMilestones.length).toBe(4)
    })

    it('all streakMilestones are positive integers', () => {
      QUICK_WINS.streakMilestones.forEach((milestone) => {
        expect(Number.isInteger(milestone)).toBe(true)
        expect(milestone).toBeGreaterThan(0)
      })
    })
  })

  describe('flameIntensity mapping', () => {
    it('has flameIntensity object', () => {
      expect(QUICK_WINS.flameIntensity).toBeDefined()
      expect(typeof QUICK_WINS.flameIntensity).toBe('object')
    })

    it('flameIntensity[3] is "low"', () => {
      expect(QUICK_WINS.flameIntensity[3]).toBe('low')
    })

    it('flameIntensity[5] is "medium"', () => {
      expect(QUICK_WINS.flameIntensity[5]).toBe('medium')
    })

    it('flameIntensity[7] is "high"', () => {
      expect(QUICK_WINS.flameIntensity[7]).toBe('high')
    })

    it('flameIntensity[10] is "inferno"', () => {
      expect(QUICK_WINS.flameIntensity[10]).toBe('inferno')
    })

    it('flameIntensity has entry for each streakMilestone', () => {
      QUICK_WINS.streakMilestones.forEach((milestone) => {
        expect(QUICK_WINS.flameIntensity[milestone]).toBeDefined()
        expect(typeof QUICK_WINS.flameIntensity[milestone]).toBe('string')
      })
    })

    it('flameIntensity values are valid intensity levels', () => {
      const validIntensities = ['low', 'medium', 'high', 'inferno']
      Object.values(QUICK_WINS.flameIntensity).forEach((intensity) => {
        expect(validIntensities).toContain(intensity)
      })
    })
  })

  describe('contextualFeedback configuration', () => {
    it('has contextualFeedback object', () => {
      expect(QUICK_WINS.contextualFeedback).toBeDefined()
      expect(typeof QUICK_WINS.contextualFeedback).toBe('object')
    })

    it('contextualFeedback has simple level config', () => {
      expect(QUICK_WINS.contextualFeedback.simple).toBeDefined()
      expect(typeof QUICK_WINS.contextualFeedback.simple).toBe('object')
    })

    it('contextualFeedback has standard level config', () => {
      expect(QUICK_WINS.contextualFeedback.standard).toBeDefined()
      expect(typeof QUICK_WINS.contextualFeedback.standard).toBe('object')
    })

    it('contextualFeedback has deep level config', () => {
      expect(QUICK_WINS.contextualFeedback.deep).toBeDefined()
      expect(typeof QUICK_WINS.contextualFeedback.deep).toBe('object')
    })

    it('each level has celebrationIntensity setting', () => {
      const levels = ['simple', 'standard', 'deep']
      levels.forEach((level) => {
        expect(QUICK_WINS.contextualFeedback[level].celebrationIntensity).toBeDefined()
      })
    })

    it('celebrationIntensity increases with level difficulty', () => {
      const simple = QUICK_WINS.contextualFeedback.simple.celebrationIntensity
      const standard = QUICK_WINS.contextualFeedback.standard.celebrationIntensity
      const deep = QUICK_WINS.contextualFeedback.deep.celebrationIntensity

      // Either numeric values that increase, or string intensity levels
      if (typeof simple === 'number') {
        expect(standard).toBeGreaterThanOrEqual(simple)
        expect(deep).toBeGreaterThanOrEqual(standard)
      } else {
        const intensityOrder = ['low', 'medium', 'high', 'max']
        const simpleIndex = intensityOrder.indexOf(simple)
        const standardIndex = intensityOrder.indexOf(standard)
        const deepIndex = intensityOrder.indexOf(deep)

        expect(standardIndex).toBeGreaterThanOrEqual(simpleIndex)
        expect(deepIndex).toBeGreaterThanOrEqual(standardIndex)
      }
    })
  })

  describe('configuration consistency', () => {
    it('streakMilestones and flameIntensity have matching keys', () => {
      const milestones = QUICK_WINS.streakMilestones
      const intensityKeys = Object.keys(QUICK_WINS.flameIntensity).map(Number)

      milestones.forEach((milestone) => {
        expect(intensityKeys).toContain(milestone)
      })
    })

    it('contextualFeedback levels match quiz levels', () => {
      const expectedLevels = ['simple', 'standard', 'deep']
      const actualLevels = Object.keys(QUICK_WINS.contextualFeedback)

      expectedLevels.forEach((level) => {
        expect(actualLevels).toContain(level)
      })
    })

    it('dramaticPause duration is a reasonable value', () => {
      const duration = QUICK_WINS.dramaticPause.duration

      // Should be between 500ms and 2000ms for good UX
      expect(duration).toBeGreaterThanOrEqual(500)
      expect(duration).toBeLessThanOrEqual(2000)
    })
  })

  describe('immutability concerns', () => {
    it('QUICK_WINS object has expected structure', () => {
      const expectedKeys = [
        'dramaticPause',
        'streakMilestones',
        'flameIntensity',
        'contextualFeedback',
      ]

      expectedKeys.forEach((key) => {
        expect(QUICK_WINS).toHaveProperty(key)
      })
    })

    it('configuration values are not functions', () => {
      // Top-level values should be plain data, not functions
      Object.values(QUICK_WINS).forEach((value) => {
        expect(typeof value).not.toBe('function')
      })
    })
  })

  describe('edge cases and validation', () => {
    it('first streak milestone is greater than 0', () => {
      expect(QUICK_WINS.streakMilestones[0]).toBeGreaterThan(0)
    })

    it('dramaticPause duration is in milliseconds (not seconds)', () => {
      // 800ms is reasonable, 0.8 would be if in seconds
      expect(QUICK_WINS.dramaticPause.duration).toBeGreaterThan(100)
    })

    it('flameIntensity does not have undefined values', () => {
      Object.values(QUICK_WINS.flameIntensity).forEach((value) => {
        expect(value).not.toBeUndefined()
        expect(value).not.toBeNull()
      })
    })

    it('contextualFeedback levels are not empty objects', () => {
      const levels = ['simple', 'standard', 'deep']
      levels.forEach((level) => {
        const config = QUICK_WINS.contextualFeedback[level]
        expect(Object.keys(config).length).toBeGreaterThan(0)
      })
    })
  })
})
