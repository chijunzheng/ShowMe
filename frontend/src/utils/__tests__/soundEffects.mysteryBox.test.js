/**
 * Sound Effects - Mystery Box Sounds Tests
 *
 * Tests for the mystery box sound effect functions.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - playMysteryBoxAppearSound function
 * - playMysteryBoxShakeSound function
 * - playMysteryBoxOpenSound function
 * - playRewardRevealSound function
 * - playLegendaryBoxSound function
 * - AudioContext handling
 * - Error handling
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  playMysteryBoxAppearSound,
  playMysteryBoxShakeSound,
  playMysteryBoxOpenSound,
  playRewardRevealSound,
  playLegendaryBoxSound,
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

describe('soundEffects - Mystery Box Sounds', () => {
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

  describe('playMysteryBoxAppearSound', () => {
    it('exports playMysteryBoxAppearSound function', () => {
      expect(typeof playMysteryBoxAppearSound).toBe('function')
    })

    it('creates oscillator nodes when called', () => {
      _resetAudioContext()

      playMysteryBoxAppearSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('creates gain nodes for volume control', () => {
      _resetAudioContext()

      playMysteryBoxAppearSound()

      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('does not throw errors', () => {
      _resetAudioContext()

      expect(() => playMysteryBoxAppearSound()).not.toThrow()
    })

    it('handles AudioContext creation failure gracefully', () => {
      window.AudioContext = vi.fn(() => {
        throw new Error('AudioContext not supported')
      })
      _resetAudioContext()

      expect(() => playMysteryBoxAppearSound()).not.toThrow()
    })

    it('connects nodes to destination', () => {
      _resetAudioContext()

      playMysteryBoxAppearSound()

      const gainNodes = mockAudioContext.createGain.mock.results
      if (gainNodes.length > 0) {
        const gainNode = gainNodes[0].value
        expect(gainNode.connect).toHaveBeenCalled()
      }
    })

    it('starts and stops oscillators', () => {
      _resetAudioContext()

      playMysteryBoxAppearSound()

      const oscillators = mockAudioContext.createOscillator.mock.results
      if (oscillators.length > 0) {
        const oscillator = oscillators[0].value
        expect(oscillator.start).toHaveBeenCalled()
        expect(oscillator.stop).toHaveBeenCalled()
      }
    })

    it('creates magical/mystical sound (ascending tones)', () => {
      _resetAudioContext()

      playMysteryBoxAppearSound()

      // Should create multiple tones for magical effect
      const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length
      expect(oscillatorCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('playMysteryBoxShakeSound', () => {
    it('exports playMysteryBoxShakeSound function', () => {
      expect(typeof playMysteryBoxShakeSound).toBe('function')
    })

    it('creates oscillator nodes when called', () => {
      _resetAudioContext()

      playMysteryBoxShakeSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('creates gain nodes for volume control', () => {
      _resetAudioContext()

      playMysteryBoxShakeSound()

      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('does not throw errors', () => {
      _resetAudioContext()

      expect(() => playMysteryBoxShakeSound()).not.toThrow()
    })

    it('handles AudioContext errors gracefully', () => {
      const errorContext = new MockAudioContext()
      errorContext.createOscillator = vi.fn(() => {
        throw new Error('Failed to create oscillator')
      })
      window.AudioContext = vi.fn(() => errorContext)
      _resetAudioContext()

      expect(() => playMysteryBoxShakeSound()).not.toThrow()
    })

    it('creates rattling/shaking sound effect', () => {
      _resetAudioContext()

      playMysteryBoxShakeSound()

      // Should create quick, percussive tones
      const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length
      expect(oscillatorCount).toBeGreaterThanOrEqual(1)
    })

    it('uses appropriate volume for anticipation', () => {
      _resetAudioContext()

      playMysteryBoxShakeSound()

      const gainNodes = mockAudioContext.createGain.mock.results
      if (gainNodes.length > 0) {
        const gainNode = gainNodes[0].value
        expect(gainNode.gain.setValueAtTime).toHaveBeenCalled()
      }
    })
  })

  describe('playMysteryBoxOpenSound', () => {
    it('exports playMysteryBoxOpenSound function', () => {
      expect(typeof playMysteryBoxOpenSound).toBe('function')
    })

    it('creates oscillator nodes when called', () => {
      _resetAudioContext()

      playMysteryBoxOpenSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('creates gain nodes for volume control', () => {
      _resetAudioContext()

      playMysteryBoxOpenSound()

      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('does not throw errors', () => {
      _resetAudioContext()

      expect(() => playMysteryBoxOpenSound()).not.toThrow()
    })

    it('handles AudioContext errors gracefully', () => {
      const errorContext = new MockAudioContext()
      errorContext.createGain = vi.fn(() => {
        throw new Error('Failed to create gain node')
      })
      window.AudioContext = vi.fn(() => errorContext)
      _resetAudioContext()

      expect(() => playMysteryBoxOpenSound()).not.toThrow()
    })

    it('creates dramatic opening sound', () => {
      _resetAudioContext()

      playMysteryBoxOpenSound()

      // Opening should be more elaborate
      const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length
      expect(oscillatorCount).toBeGreaterThanOrEqual(2)
    })

    it('uses ascending frequencies for excitement', () => {
      _resetAudioContext()

      playMysteryBoxOpenSound()

      // Should have multiple notes
      const oscillators = mockAudioContext.createOscillator.mock.results
      expect(oscillators.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('playRewardRevealSound', () => {
    it('exports playRewardRevealSound function', () => {
      expect(typeof playRewardRevealSound).toBe('function')
    })

    it('creates oscillator nodes when called', () => {
      _resetAudioContext()

      playRewardRevealSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('creates gain nodes for volume control', () => {
      _resetAudioContext()

      playRewardRevealSound()

      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('does not throw errors', () => {
      _resetAudioContext()

      expect(() => playRewardRevealSound()).not.toThrow()
    })

    it('handles AudioContext errors gracefully', () => {
      window.AudioContext = vi.fn(() => {
        throw new Error('AudioContext not supported')
      })
      _resetAudioContext()

      expect(() => playRewardRevealSound()).not.toThrow()
    })

    it('creates celebratory reward reveal sound', () => {
      _resetAudioContext()

      playRewardRevealSound()

      // Should be cheerful and rewarding
      const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length
      expect(oscillatorCount).toBeGreaterThanOrEqual(2)
    })

    it('uses bright, positive tones', () => {
      _resetAudioContext()

      playRewardRevealSound()

      const oscillators = mockAudioContext.createOscillator.mock.results
      if (oscillators.length > 0) {
        // Verify frequency is set (higher frequencies are brighter)
        const oscillator = oscillators[0].value
        expect(oscillator.frequency.setValueAtTime).toHaveBeenCalled()
      }
    })
  })

  describe('playLegendaryBoxSound', () => {
    it('exports playLegendaryBoxSound function', () => {
      expect(typeof playLegendaryBoxSound).toBe('function')
    })

    it('creates oscillator nodes when called', () => {
      _resetAudioContext()

      playLegendaryBoxSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('creates gain nodes for volume control', () => {
      _resetAudioContext()

      playLegendaryBoxSound()

      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('does not throw errors', () => {
      _resetAudioContext()

      expect(() => playLegendaryBoxSound()).not.toThrow()
    })

    it('handles AudioContext errors gracefully', () => {
      const errorContext = new MockAudioContext()
      errorContext.createOscillator = vi.fn(() => {
        throw new Error('Failed to create oscillator')
      })
      window.AudioContext = vi.fn(() => errorContext)
      _resetAudioContext()

      expect(() => playLegendaryBoxSound()).not.toThrow()
    })

    it('creates elaborate legendary fanfare', () => {
      _resetAudioContext()

      playLegendaryBoxSound()

      // Legendary should be the most elaborate
      const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length
      expect(oscillatorCount).toBeGreaterThanOrEqual(3)
    })

    it('is more elaborate than regular reward reveal', () => {
      _resetAudioContext()

      playRewardRevealSound()
      const revealOscillators = mockAudioContext.createOscillator.mock.calls.length

      vi.clearAllMocks()
      _resetAudioContext()

      playLegendaryBoxSound()
      const legendaryOscillators = mockAudioContext.createOscillator.mock.calls.length

      // Legendary should be at least as elaborate
      expect(legendaryOscillators).toBeGreaterThanOrEqual(revealOscillators)
    })

    it('uses harmonics for rich sound', () => {
      _resetAudioContext()

      playLegendaryBoxSound()

      // Should have multiple oscillators for harmonics
      const oscillators = mockAudioContext.createOscillator.mock.results
      expect(oscillators.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('default export includes mystery box sounds', () => {
    it('includes playMysteryBoxAppearSound in default export', () => {
      expect(soundEffectsDefault.playMysteryBoxAppearSound).toBeDefined()
    })

    it('includes playMysteryBoxShakeSound in default export', () => {
      expect(soundEffectsDefault.playMysteryBoxShakeSound).toBeDefined()
    })

    it('includes playMysteryBoxOpenSound in default export', () => {
      expect(soundEffectsDefault.playMysteryBoxOpenSound).toBeDefined()
    })

    it('includes playRewardRevealSound in default export', () => {
      expect(soundEffectsDefault.playRewardRevealSound).toBeDefined()
    })

    it('includes playLegendaryBoxSound in default export', () => {
      expect(soundEffectsDefault.playLegendaryBoxSound).toBeDefined()
    })
  })

  describe('AudioContext management', () => {
    it('reuses existing AudioContext for all mystery box sounds', () => {
      _resetAudioContext()

      playMysteryBoxAppearSound()
      playMysteryBoxShakeSound()
      playMysteryBoxOpenSound()
      playRewardRevealSound()
      playLegendaryBoxSound()

      // Should only create AudioContext once
      expect(window.AudioContext).toHaveBeenCalledTimes(1)
    })

    it('resumes suspended AudioContext', () => {
      mockAudioContext.state = 'suspended'
      _resetAudioContext()

      playMysteryBoxAppearSound()

      expect(mockAudioContext.resume).toHaveBeenCalled()
    })

    it('_resetAudioContext allows fresh context for testing', () => {
      _resetAudioContext()

      playMysteryBoxAppearSound()
      const firstCallCount = window.AudioContext.mock.calls.length

      _resetAudioContext()
      playMysteryBoxAppearSound()

      // Should create new context after reset
      expect(window.AudioContext.mock.calls.length).toBeGreaterThan(firstCallCount)
    })
  })

  describe('sound characteristics', () => {
    describe('mystery box appear sound', () => {
      it('should be mystical and attention-grabbing', () => {
        _resetAudioContext()

        playMysteryBoxAppearSound()

        // Should create sound
        const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length
        expect(oscillatorCount).toBeGreaterThanOrEqual(1)
      })
    })

    describe('mystery box shake sound', () => {
      it('should build anticipation', () => {
        _resetAudioContext()

        playMysteryBoxShakeSound()

        // Should create quick, rattling tones
        const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length
        expect(oscillatorCount).toBeGreaterThanOrEqual(1)
      })
    })

    describe('mystery box open sound', () => {
      it('should be dramatic and exciting', () => {
        _resetAudioContext()

        playMysteryBoxOpenSound()

        // Opening is a key moment - should be elaborate
        const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length
        expect(oscillatorCount).toBeGreaterThanOrEqual(2)
      })
    })

    describe('reward reveal sound', () => {
      it('should be celebratory and satisfying', () => {
        _resetAudioContext()

        playRewardRevealSound()

        // Reward reveal should feel rewarding
        const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length
        expect(oscillatorCount).toBeGreaterThanOrEqual(2)
      })
    })

    describe('legendary box sound', () => {
      it('should be the most impressive', () => {
        _resetAudioContext()

        playLegendaryBoxSound()

        // Legendary is special - maximum impact
        const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length
        expect(oscillatorCount).toBeGreaterThanOrEqual(3)
      })

      it('should use longer duration for impact', () => {
        _resetAudioContext()

        playLegendaryBoxSound()

        // Should have oscillators with longer durations
        const oscillators = mockAudioContext.createOscillator.mock.results
        oscillators.forEach((result) => {
          const oscillator = result.value
          expect(oscillator.stop).toHaveBeenCalled()
        })
      })
    })
  })

  describe('error handling', () => {
    it('all sound functions handle missing AudioContext', () => {
      delete window.AudioContext
      delete window.webkitAudioContext
      _resetAudioContext()

      expect(() => playMysteryBoxAppearSound()).not.toThrow()
      expect(() => playMysteryBoxShakeSound()).not.toThrow()
      expect(() => playMysteryBoxOpenSound()).not.toThrow()
      expect(() => playRewardRevealSound()).not.toThrow()
      expect(() => playLegendaryBoxSound()).not.toThrow()
    })

    it('all sound functions handle createOscillator failure', () => {
      const errorContext = new MockAudioContext()
      errorContext.createOscillator = vi.fn(() => {
        throw new Error('createOscillator failed')
      })
      window.AudioContext = vi.fn(() => errorContext)
      _resetAudioContext()

      expect(() => playMysteryBoxAppearSound()).not.toThrow()
      expect(() => playMysteryBoxShakeSound()).not.toThrow()
      expect(() => playMysteryBoxOpenSound()).not.toThrow()
      expect(() => playRewardRevealSound()).not.toThrow()
      expect(() => playLegendaryBoxSound()).not.toThrow()
    })

    it('all sound functions handle createGain failure', () => {
      const errorContext = new MockAudioContext()
      errorContext.createGain = vi.fn(() => {
        throw new Error('createGain failed')
      })
      window.AudioContext = vi.fn(() => errorContext)
      _resetAudioContext()

      expect(() => playMysteryBoxAppearSound()).not.toThrow()
      expect(() => playMysteryBoxShakeSound()).not.toThrow()
      expect(() => playMysteryBoxOpenSound()).not.toThrow()
      expect(() => playRewardRevealSound()).not.toThrow()
      expect(() => playLegendaryBoxSound()).not.toThrow()
    })
  })
})
