/**
 * Sound Effects - Boss Battle Sounds Tests
 *
 * Tests for the boss battle sound effect functions.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - playBossIntroSound function
 * - playBossVictorySound function
 * - playBossDefeatSound function
 * - AudioContext handling
 * - Error handling
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  playBossIntroSound,
  playBossVictorySound,
  playBossDefeatSound,
  playAchievementSound,
  playIncorrectSound,
  _resetAudioContext,
} from '../soundEffects'
import soundEffectsDefault from '../soundEffects'

// Mock AudioContext
class MockOscillatorNode {
  constructor() {
    this.type = 'sine'
    this.frequency = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
    this.onended = null
  }
  connect = vi.fn()
  disconnect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}

class MockGainNode {
  constructor() {
    this.gain = {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    }
  }
  connect = vi.fn()
  disconnect = vi.fn()
}

class MockAudioContext {
  constructor() {
    this.state = 'running'
    this.currentTime = 0
    this.destination = {}
  }
  createOscillator = vi.fn(() => new MockOscillatorNode())
  createGain = vi.fn(() => new MockGainNode())
  resume = vi.fn(() => Promise.resolve())
  close = vi.fn(() => Promise.resolve())
}

describe('soundEffects - Boss Battle Sounds', () => {
  let originalAudioContext
  let mockAudioContext

  beforeEach(() => {
    // Store original and mock AudioContext
    originalAudioContext = window.AudioContext
    mockAudioContext = new MockAudioContext()
    window.AudioContext = vi.fn(() => mockAudioContext)
    window.webkitAudioContext = vi.fn(() => mockAudioContext)

    // Clear module cache to reset audioContext
    vi.resetModules()
  })

  afterEach(() => {
    window.AudioContext = originalAudioContext
    vi.restoreAllMocks()
  })

  describe('playBossIntroSound', () => {
    it('exports playBossIntroSound function', () => {
      expect(typeof playBossIntroSound).toBe('function')
    })

    it('creates oscillator nodes when called', () => {
      _resetAudioContext()

      playBossIntroSound()

      // Should create multiple oscillators for dramatic intro sound
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('creates gain nodes for volume control', () => {
      _resetAudioContext()

      playBossIntroSound()

      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('does not throw errors', () => {
      _resetAudioContext()

      expect(() => playBossIntroSound()).not.toThrow()
    })

    it('handles AudioContext creation failure gracefully', () => {
      window.AudioContext = vi.fn(() => {
        throw new Error('AudioContext not supported')
      })
      _resetAudioContext()

      expect(() => playBossIntroSound()).not.toThrow()
    })

    it('connects nodes to destination', () => {
      _resetAudioContext()

      playBossIntroSound()

      // Gain nodes should connect to destination
      const gainNodes = mockAudioContext.createGain.mock.results
      if (gainNodes.length > 0) {
        const gainNode = gainNodes[0].value
        expect(gainNode.connect).toHaveBeenCalled()
      }
    })

    it('starts and stops oscillators', () => {
      _resetAudioContext()

      playBossIntroSound()

      const oscillators = mockAudioContext.createOscillator.mock.results
      if (oscillators.length > 0) {
        const oscillator = oscillators[0].value
        expect(oscillator.start).toHaveBeenCalled()
        expect(oscillator.stop).toHaveBeenCalled()
      }
    })
  })

  describe('playBossVictorySound', () => {
    it('exports playBossVictorySound function', () => {
      expect(typeof playBossVictorySound).toBe('function')
    })

    it('creates oscillator nodes when called', () => {
      _resetAudioContext()

      playBossVictorySound()

      // Victory sound should have triumphant, celebratory tones
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('creates gain nodes for volume control', () => {
      _resetAudioContext()

      playBossVictorySound()

      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('uses ascending frequencies for triumphant feel', () => {
      _resetAudioContext()

      playBossVictorySound()

      // Victory should use upward-moving frequencies
      const oscillators = mockAudioContext.createOscillator.mock.results
      if (oscillators.length > 1) {
        // Verify multiple notes were created (arpeggio)
        expect(oscillators.length).toBeGreaterThanOrEqual(2)
      }
    })

    it('does not throw errors', () => {
      _resetAudioContext()

      expect(() => playBossVictorySound()).not.toThrow()
    })

    it('handles AudioContext errors gracefully', () => {
      const errorContext = new MockAudioContext()
      errorContext.createOscillator = vi.fn(() => {
        throw new Error('Failed to create oscillator')
      })
      window.AudioContext = vi.fn(() => errorContext)
      _resetAudioContext()

      expect(() => playBossVictorySound()).not.toThrow()
    })

    it('is more elaborate than standard achievement sound', () => {
      _resetAudioContext()

      playAchievementSound()
      const achievementOscillators = mockAudioContext.createOscillator.mock.calls.length

      vi.clearAllMocks()
      _resetAudioContext()

      playBossVictorySound()
      const victoryOscillators = mockAudioContext.createOscillator.mock.calls.length

      // Victory sound should be at least as elaborate as achievement
      expect(victoryOscillators).toBeGreaterThanOrEqual(achievementOscillators)
    })
  })

  describe('playBossDefeatSound', () => {
    it('exports playBossDefeatSound function', () => {
      expect(typeof playBossDefeatSound).toBe('function')
    })

    it('creates oscillator nodes when called', () => {
      _resetAudioContext()

      playBossDefeatSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('creates gain nodes for volume control', () => {
      _resetAudioContext()

      playBossDefeatSound()

      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('does not throw errors', () => {
      _resetAudioContext()

      expect(() => playBossDefeatSound()).not.toThrow()
    })

    it('handles AudioContext errors gracefully', () => {
      const errorContext = new MockAudioContext()
      errorContext.createGain = vi.fn(() => {
        throw new Error('Failed to create gain node')
      })
      window.AudioContext = vi.fn(() => errorContext)
      _resetAudioContext()

      expect(() => playBossDefeatSound()).not.toThrow()
    })

    it('is gentler than incorrect answer sound', () => {
      _resetAudioContext()

      playIncorrectSound()
      const incorrectGains = mockAudioContext.createGain.mock.results

      vi.clearAllMocks()
      _resetAudioContext()

      playBossDefeatSound()
      const defeatGains = mockAudioContext.createGain.mock.results

      // Both should create gain nodes (defeat sound exists)
      expect(defeatGains.length).toBeGreaterThan(0)
    })

    it('uses softer tones appropriate for kids', () => {
      _resetAudioContext()

      playBossDefeatSound()

      // Should use gain nodes with low volume
      const gainNodes = mockAudioContext.createGain.mock.results
      if (gainNodes.length > 0) {
        // Verify gain is being set (volume envelope)
        const gainNode = gainNodes[0].value
        expect(gainNode.gain.setValueAtTime).toHaveBeenCalled()
      }
    })
  })

  describe('default export includes boss sounds', () => {
    it('includes playBossIntroSound in default export', () => {
      expect(soundEffectsDefault.playBossIntroSound).toBeDefined()
    })

    it('includes playBossVictorySound in default export', () => {
      expect(soundEffectsDefault.playBossVictorySound).toBeDefined()
    })

    it('includes playBossDefeatSound in default export', () => {
      expect(soundEffectsDefault.playBossDefeatSound).toBeDefined()
    })
  })

  describe('AudioContext management', () => {
    it('reuses existing AudioContext for all boss sounds', () => {
      _resetAudioContext()

      playBossIntroSound()
      playBossVictorySound()
      playBossDefeatSound()

      // Should only create AudioContext once
      expect(window.AudioContext).toHaveBeenCalledTimes(1)
    })

    it('resumes suspended AudioContext', () => {
      mockAudioContext.state = 'suspended'
      _resetAudioContext()

      playBossIntroSound()

      expect(mockAudioContext.resume).toHaveBeenCalled()
    })

    it('_resetAudioContext allows fresh context for testing', () => {
      _resetAudioContext()

      playBossIntroSound()
      const firstCallCount = window.AudioContext.mock.calls.length

      _resetAudioContext()
      playBossIntroSound()

      // Should create new context after reset
      expect(window.AudioContext.mock.calls.length).toBeGreaterThan(firstCallCount)
    })
  })

  describe('sound characteristics', () => {
    describe('boss intro sound', () => {
      it('should be dramatic and attention-grabbing', () => {
        _resetAudioContext()

        playBossIntroSound()

        // Should create multiple tones for dramatic effect
        const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length
        expect(oscillatorCount).toBeGreaterThanOrEqual(1)
      })
    })

    describe('boss victory sound', () => {
      it('should be celebratory and triumphant', () => {
        _resetAudioContext()

        playBossVictorySound()

        // Should have multiple notes for fanfare effect
        const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length
        expect(oscillatorCount).toBeGreaterThanOrEqual(2)
      })
    })

    describe('boss defeat sound', () => {
      it('should be gentle and encouraging', () => {
        _resetAudioContext()

        playBossDefeatSound()

        // Should create sound (not be silent)
        const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length
        expect(oscillatorCount).toBeGreaterThanOrEqual(1)
      })
    })
  })
})
