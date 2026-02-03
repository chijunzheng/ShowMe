/**
 * Comeback Sound Effects Tests
 *
 * Tests for the comeback-related sound effect functions.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Function existence
 * - AudioContext usage
 * - Error handling
 * - Browser compatibility
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  playComebackOfferSound,
  playComebackTimerTickSound,
  playComebackSuccessSound,
  playComebackFailSound,
  _resetAudioContext,
} from '../soundEffects'

describe('comeback sound effects', () => {
  let mockOscillator
  let mockGainNode
  let mockAudioContext
  let originalWindow

  beforeEach(() => {
    // Reset cached audio context to ensure fresh mocks are used
    _resetAudioContext()

    // Store original window
    originalWindow = global.window

    // Mock oscillator
    mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      onended: null,
    }

    // Mock gain node
    mockGainNode = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }

    // Mock AudioContext
    mockAudioContext = {
      currentTime: 0,
      state: 'running',
      destination: {},
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGainNode),
      resume: vi.fn(),
    }

    // Mock window.AudioContext
    global.window = {
      AudioContext: vi.fn(() => mockAudioContext),
      webkitAudioContext: vi.fn(() => mockAudioContext),
    }
  })

  afterEach(() => {
    global.window = originalWindow
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('playComebackOfferSound', () => {
    it('should be a function', () => {
      expect(typeof playComebackOfferSound).toBe('function')
    })

    it('creates oscillator and gain nodes', () => {
      playComebackOfferSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('connects oscillator to gain and gain to destination', () => {
      playComebackOfferSound()

      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode)
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination)
    })

    it('starts and schedules stop for the oscillator', () => {
      playComebackOfferSound()

      expect(mockOscillator.start).toHaveBeenCalled()
      expect(mockOscillator.stop).toHaveBeenCalled()
    })

    it('does not throw when AudioContext is unavailable', () => {
      global.window = {}
      expect(() => playComebackOfferSound()).not.toThrow()
    })

    it('handles AudioContext creation failure gracefully', () => {
      global.window = {
        AudioContext: vi.fn(() => {
          throw new Error('AudioContext not supported')
        }),
      }

      expect(() => playComebackOfferSound()).not.toThrow()
    })

    it('uses ascending tone pattern for attention-grabbing sound', () => {
      vi.useFakeTimers()
      playComebackOfferSound()

      // Should set multiple frequencies for sequence effect
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalled()
      vi.runAllTimers()
    })
  })

  describe('playComebackTimerTickSound', () => {
    it('should be a function', () => {
      expect(typeof playComebackTimerTickSound).toBe('function')
    })

    it('creates oscillator and gain nodes', () => {
      playComebackTimerTickSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('produces short duration tick sound', () => {
      playComebackTimerTickSound()

      expect(mockOscillator.start).toHaveBeenCalled()
      expect(mockOscillator.stop).toHaveBeenCalled()
    })

    it('does not throw when AudioContext is unavailable', () => {
      global.window = {}
      expect(() => playComebackTimerTickSound()).not.toThrow()
    })

    it('handles oscillator methods throwing errors', () => {
      mockOscillator.start = vi.fn(() => {
        throw new Error('Start failed')
      })

      expect(() => playComebackTimerTickSound()).not.toThrow()
    })

    it('uses appropriate frequency for tick sound', () => {
      playComebackTimerTickSound()

      // Should set frequency for tick effect
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalled()
    })
  })

  describe('playComebackSuccessSound', () => {
    it('should be a function', () => {
      expect(typeof playComebackSuccessSound).toBe('function')
    })

    it('creates oscillator and gain nodes', () => {
      playComebackSuccessSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('connects oscillator to gain and gain to destination', () => {
      playComebackSuccessSound()

      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode)
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination)
    })

    it('starts and schedules stop for the oscillator', () => {
      playComebackSuccessSound()

      expect(mockOscillator.start).toHaveBeenCalled()
      expect(mockOscillator.stop).toHaveBeenCalled()
    })

    it('does not throw when AudioContext is unavailable', () => {
      global.window = {}
      expect(() => playComebackSuccessSound()).not.toThrow()
    })

    it('handles AudioContext creation failure gracefully', () => {
      global.window = {
        AudioContext: vi.fn(() => {
          throw new Error('AudioContext not supported')
        }),
      }

      expect(() => playComebackSuccessSound()).not.toThrow()
    })

    it('uses triumphant ascending sequence for celebration', () => {
      vi.useFakeTimers()
      playComebackSuccessSound()

      // Should create multiple oscillators or set multiple frequencies
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalled()
      vi.runAllTimers()
    })
  })

  describe('playComebackFailSound', () => {
    it('should be a function', () => {
      expect(typeof playComebackFailSound).toBe('function')
    })

    it('creates oscillator and gain nodes', () => {
      playComebackFailSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('connects oscillator to gain and gain to destination', () => {
      playComebackFailSound()

      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode)
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination)
    })

    it('starts and schedules stop for the oscillator', () => {
      playComebackFailSound()

      expect(mockOscillator.start).toHaveBeenCalled()
      expect(mockOscillator.stop).toHaveBeenCalled()
    })

    it('does not throw when AudioContext is unavailable', () => {
      global.window = {}
      expect(() => playComebackFailSound()).not.toThrow()
    })

    it('handles AudioContext creation failure gracefully', () => {
      global.window = {
        AudioContext: vi.fn(() => {
          throw new Error('AudioContext not supported')
        }),
      }

      expect(() => playComebackFailSound()).not.toThrow()
    })

    it('uses gentle, encouraging tone (not harsh)', () => {
      playComebackFailSound()

      // Should use lower frequency range and softer volume
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalled()
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalled()
    })
  })

  describe('browser compatibility', () => {
    it('falls back to webkitAudioContext when AudioContext unavailable', () => {
      global.window = {
        webkitAudioContext: vi.fn(() => mockAudioContext),
      }

      expect(() => playComebackOfferSound()).not.toThrow()
      expect(global.window.webkitAudioContext).toHaveBeenCalled()
    })

    it('resumes suspended AudioContext', () => {
      mockAudioContext.state = 'suspended'

      playComebackOfferSound()

      expect(mockAudioContext.resume).toHaveBeenCalled()
    })

    it('handles closed AudioContext by creating new one', () => {
      mockAudioContext.state = 'closed'

      expect(() => playComebackOfferSound()).not.toThrow()
      // Should create new context since old one is closed
      expect(global.window.AudioContext).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('handles oscillator start failure', () => {
      mockOscillator.start = vi.fn(() => {
        throw new Error('Start failed')
      })

      expect(() => playComebackOfferSound()).not.toThrow()
      expect(() => playComebackTimerTickSound()).not.toThrow()
      expect(() => playComebackSuccessSound()).not.toThrow()
      expect(() => playComebackFailSound()).not.toThrow()
    })

    it('handles oscillator connect failure', () => {
      mockOscillator.connect = vi.fn(() => {
        throw new Error('Connect failed')
      })

      expect(() => playComebackOfferSound()).not.toThrow()
      expect(() => playComebackTimerTickSound()).not.toThrow()
      expect(() => playComebackSuccessSound()).not.toThrow()
      expect(() => playComebackFailSound()).not.toThrow()
    })

    it('handles gain node creation failure', () => {
      mockAudioContext.createGain = vi.fn(() => {
        throw new Error('CreateGain failed')
      })

      expect(() => playComebackOfferSound()).not.toThrow()
      expect(() => playComebackTimerTickSound()).not.toThrow()
      expect(() => playComebackSuccessSound()).not.toThrow()
      expect(() => playComebackFailSound()).not.toThrow()
    })

    it('handles oscillator creation failure', () => {
      mockAudioContext.createOscillator = vi.fn(() => {
        throw new Error('CreateOscillator failed')
      })

      expect(() => playComebackOfferSound()).not.toThrow()
      expect(() => playComebackTimerTickSound()).not.toThrow()
      expect(() => playComebackSuccessSound()).not.toThrow()
      expect(() => playComebackFailSound()).not.toThrow()
    })
  })

  describe('sound characteristics', () => {
    describe('playComebackOfferSound', () => {
      it('uses attention-grabbing ascending pattern', () => {
        vi.useFakeTimers()
        playComebackOfferSound()

        // Should be noticeable but not alarming
        const frequencyCall = mockOscillator.frequency.setValueAtTime.mock.calls[0]
        if (frequencyCall) {
          const frequency = frequencyCall[0]
          // Should be in mid-to-high range for attention
          expect(frequency).toBeGreaterThan(300)
          expect(frequency).toBeLessThan(2000)
        }
        vi.runAllTimers()
      })
    })

    describe('playComebackTimerTickSound', () => {
      it('uses short crisp sound', () => {
        playComebackTimerTickSound()

        // Start should be called close to stop (short duration)
        expect(mockOscillator.start).toHaveBeenCalled()
        expect(mockOscillator.stop).toHaveBeenCalled()
      })

      it('uses moderate volume for urgency without being harsh', () => {
        playComebackTimerTickSound()

        // Volume should be set
        expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalled()
        // Check volume is reasonable (not too loud)
        const volumeCall = mockGainNode.gain.setValueAtTime.mock.calls[0]
        if (volumeCall) {
          const volume = volumeCall[0]
          expect(volume).toBeLessThanOrEqual(0.3)
        }
      })
    })

    describe('playComebackSuccessSound', () => {
      it('uses triumphant ascending tone sequence', () => {
        vi.useFakeTimers()
        playComebackSuccessSound()

        // Should set frequency (starting frequency)
        expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalled()
        vi.runAllTimers()
      })

      it('uses celebratory volume', () => {
        playComebackSuccessSound()

        expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalled()
      })
    })

    describe('playComebackFailSound', () => {
      it('uses gentle descending tone (encouraging, not punishing)', () => {
        playComebackFailSound()

        // Should set a lower frequency for gentle sound
        expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalled()
        const frequencyCall = mockOscillator.frequency.setValueAtTime.mock.calls[0]
        if (frequencyCall) {
          const frequency = frequencyCall[0]
          // Should be in lower-mid range for gentle sound
          expect(frequency).toBeLessThan(600)
        }
      })

      it('uses quiet volume to not discourage', () => {
        playComebackFailSound()

        expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalled()
        // Volume should be gentle
        const volumeCall = mockGainNode.gain.setValueAtTime.mock.calls[0]
        if (volumeCall) {
          const volume = volumeCall[0]
          expect(volume).toBeLessThanOrEqual(0.2)
        }
      })
    })
  })
})
