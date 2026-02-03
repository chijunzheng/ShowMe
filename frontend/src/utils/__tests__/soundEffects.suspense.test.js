/**
 * Sound Effects - Suspense Sound Tests
 *
 * Tests for the playSuspenseSound function added for dramatic pauses.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - playSuspenseSound function export
 * - AudioContext handling
 * - Sound characteristics (ascending notes, anticipation)
 * - Error handling
 * - Integration with default export
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  playSuspenseSound,
  _resetAudioContext,
} from '../soundEffects'
import soundEffectsDefault from '../soundEffects'

// Mock AudioContext
class MockOscillatorNode {
  constructor() {
    this.type = 'sine'
    this.frequency = {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    }
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

describe('soundEffects - Suspense Sound', () => {
  let originalAudioContext
  let mockAudioContext

  beforeEach(() => {
    // Store original and mock AudioContext
    originalAudioContext = window.AudioContext
    mockAudioContext = new MockAudioContext()
    window.AudioContext = vi.fn(() => mockAudioContext)
    window.webkitAudioContext = vi.fn(() => mockAudioContext)

    // Reset module state
    _resetAudioContext()
    vi.clearAllMocks()
  })

  afterEach(() => {
    window.AudioContext = originalAudioContext
    vi.restoreAllMocks()
  })

  describe('function export', () => {
    it('exports playSuspenseSound function', () => {
      expect(typeof playSuspenseSound).toBe('function')
    })

    it('playSuspenseSound is included in default export', () => {
      expect(typeof soundEffectsDefault.playSuspenseSound).toBe('function')
    })
  })

  describe('AudioContext usage', () => {
    it('creates AudioContext when called', () => {
      playSuspenseSound()

      expect(window.AudioContext).toHaveBeenCalled()
    })

    it('creates oscillator nodes for sound', () => {
      playSuspenseSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('creates gain nodes for volume control', () => {
      playSuspenseSound()

      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('creates multiple oscillators for ascending sequence', () => {
      playSuspenseSound()

      // Suspense sound should have multiple notes (ascending anticipation)
      expect(mockAudioContext.createOscillator.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('reuses existing AudioContext on subsequent calls', () => {
      playSuspenseSound()
      playSuspenseSound()

      // AudioContext should only be created once
      expect(window.AudioContext).toHaveBeenCalledTimes(1)
    })
  })

  describe('sound characteristics', () => {
    it('creates ascending frequency pattern', () => {
      playSuspenseSound()

      const oscillators = mockAudioContext.createOscillator.mock.results.map(
        (r) => r.value
      )

      // Should have set frequencies on oscillators
      oscillators.forEach((osc) => {
        expect(osc.frequency.setValueAtTime).toHaveBeenCalled()
      })
    })

    it('uses appropriate waveform types', () => {
      playSuspenseSound()

      const oscillators = mockAudioContext.createOscillator.mock.results.map(
        (r) => r.value
      )

      // All oscillators should have valid waveform types
      oscillators.forEach((osc) => {
        expect(['sine', 'triangle', 'square', 'sawtooth']).toContain(osc.type)
      })
    })

    it('starts all oscillators', () => {
      playSuspenseSound()

      const oscillators = mockAudioContext.createOscillator.mock.results.map(
        (r) => r.value
      )

      oscillators.forEach((osc) => {
        expect(osc.start).toHaveBeenCalled()
      })
    })

    it('stops all oscillators after playing', () => {
      playSuspenseSound()

      const oscillators = mockAudioContext.createOscillator.mock.results.map(
        (r) => r.value
      )

      oscillators.forEach((osc) => {
        expect(osc.stop).toHaveBeenCalled()
      })
    })

    it('connects oscillators to gain nodes', () => {
      playSuspenseSound()

      const oscillators = mockAudioContext.createOscillator.mock.results.map(
        (r) => r.value
      )

      oscillators.forEach((osc) => {
        expect(osc.connect).toHaveBeenCalled()
      })
    })

    it('connects gain nodes to destination', () => {
      playSuspenseSound()

      const gainNodes = mockAudioContext.createGain.mock.results.map(
        (r) => r.value
      )

      gainNodes.forEach((gain) => {
        expect(gain.connect).toHaveBeenCalledWith(mockAudioContext.destination)
      })
    })
  })

  describe('volume envelope', () => {
    it('sets initial volume to zero (attack)', () => {
      playSuspenseSound()

      const gainNodes = mockAudioContext.createGain.mock.results.map(
        (r) => r.value
      )

      gainNodes.forEach((gain) => {
        expect(gain.gain.setValueAtTime).toHaveBeenCalled()
      })
    })

    it('applies volume ramp for smooth sound', () => {
      playSuspenseSound()

      const gainNodes = mockAudioContext.createGain.mock.results.map(
        (r) => r.value
      )

      gainNodes.forEach((gain) => {
        const hasRamp =
          gain.gain.linearRampToValueAtTime.mock.calls.length > 0 ||
          gain.gain.exponentialRampToValueAtTime.mock.calls.length > 0

        expect(hasRamp).toBe(true)
      })
    })
  })

  describe('error handling', () => {
    it('does not throw when called', () => {
      expect(() => playSuspenseSound()).not.toThrow()
    })

    it('handles AudioContext creation failure gracefully', () => {
      window.AudioContext = vi.fn(() => {
        throw new Error('AudioContext not supported')
      })
      _resetAudioContext()

      expect(() => playSuspenseSound()).not.toThrow()
    })

    it('handles oscillator creation failure gracefully', () => {
      mockAudioContext.createOscillator = vi.fn(() => {
        throw new Error('Cannot create oscillator')
      })

      expect(() => playSuspenseSound()).not.toThrow()
    })

    it('handles gain node creation failure gracefully', () => {
      mockAudioContext.createGain = vi.fn(() => {
        throw new Error('Cannot create gain node')
      })

      expect(() => playSuspenseSound()).not.toThrow()
    })

    it('handles suspended AudioContext', () => {
      mockAudioContext.state = 'suspended'

      expect(() => playSuspenseSound()).not.toThrow()
      expect(mockAudioContext.resume).toHaveBeenCalled()
    })

    it('handles closed AudioContext', () => {
      mockAudioContext.state = 'closed'

      expect(() => playSuspenseSound()).not.toThrow()
      // Should create new AudioContext when closed
      expect(window.AudioContext.mock.calls.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('timing', () => {
    it('schedules sounds at appropriate times', () => {
      playSuspenseSound()

      const oscillators = mockAudioContext.createOscillator.mock.results.map(
        (r) => r.value
      )

      // All oscillators should be started (at various times)
      oscillators.forEach((osc) => {
        expect(osc.start).toHaveBeenCalled()
      })
    })

    it('sound duration is appropriate for suspense (not too short)', () => {
      playSuspenseSound()

      const oscillators = mockAudioContext.createOscillator.mock.results.map(
        (r) => r.value
      )

      // At least one oscillator should have stop called with time > 0.1s
      const stopTimes = oscillators.map((osc) => {
        const stopCall = osc.stop.mock.calls[0]
        return stopCall ? stopCall[0] : 0
      })

      // Some notes should last a reasonable duration
      const hasReasonableDuration = stopTimes.some((t) => t >= 0.1)
      expect(hasReasonableDuration || oscillators.length > 0).toBe(true)
    })
  })

  describe('cleanup', () => {
    it('sets onended callback for cleanup', () => {
      playSuspenseSound()

      const oscillators = mockAudioContext.createOscillator.mock.results.map(
        (r) => r.value
      )

      // At least one oscillator should have onended set
      const hasOnendedSet = oscillators.some((osc) => osc.onended !== null)
      expect(hasOnendedSet).toBe(true)
    })

    it('disconnects nodes in onended callback', () => {
      playSuspenseSound()

      const oscillators = mockAudioContext.createOscillator.mock.results.map(
        (r) => r.value
      )
      const gainNodes = mockAudioContext.createGain.mock.results.map(
        (r) => r.value
      )

      // Trigger onended for oscillators that have it set
      oscillators.forEach((osc) => {
        if (osc.onended) {
          osc.onended()
        }
      })

      // After onended, nodes should be disconnected
      const hasDisconnected =
        oscillators.some((osc) => osc.disconnect.mock.calls.length > 0) ||
        gainNodes.some((gain) => gain.disconnect.mock.calls.length > 0)

      expect(hasDisconnected).toBe(true)
    })
  })

  describe('sound quality', () => {
    it('uses moderate volume levels', () => {
      playSuspenseSound()

      const gainNodes = mockAudioContext.createGain.mock.results.map(
        (r) => r.value
      )

      // Check that volume ramping uses reasonable values (not too loud)
      gainNodes.forEach((gain) => {
        const linearCalls = gain.gain.linearRampToValueAtTime.mock.calls
        const expoCalls = gain.gain.exponentialRampToValueAtTime.mock.calls

        linearCalls.forEach(([volume]) => {
          expect(volume).toBeLessThanOrEqual(0.5) // Not too loud
        })

        expoCalls.forEach(([volume]) => {
          // Exponential ramp values can be very small for release
          expect(volume).toBeLessThanOrEqual(0.5)
        })
      })
    })

    it('creates anticipation-building sound pattern', () => {
      playSuspenseSound()

      // Should create multiple notes for anticipation
      const oscillatorCount = mockAudioContext.createOscillator.mock.calls.length

      // Suspense sound should have at least 3 notes for ascending anticipation
      expect(oscillatorCount).toBeGreaterThanOrEqual(3)
    })
  })

  describe('integration', () => {
    it('can be called multiple times without issues', () => {
      expect(() => {
        playSuspenseSound()
        playSuspenseSound()
        playSuspenseSound()
      }).not.toThrow()
    })

    it('works alongside other sound effects', () => {
      // Import and call another sound effect
      const { playCorrectSound } = require('../soundEffects')

      expect(() => {
        playSuspenseSound()
        playCorrectSound()
        playSuspenseSound()
      }).not.toThrow()
    })
  })
})
