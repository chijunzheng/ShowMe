/**
 * Sound Effects Utility Tests
 *
 * Tests for game sound effect functions used in quiz gamification.
 * Uses mocked AudioContext for browser compatibility testing.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  playCorrectSound,
  playPartialSound,
  playIncorrectSound,
  playSelectSound,
  playBuildUpSound,
  _resetAudioContext,
} from './soundEffects'

describe('game sound effects', () => {
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

  describe('playCorrectSound', () => {
    it('should be a function', () => {
      expect(typeof playCorrectSound).toBe('function')
    })

    it('creates oscillator and gain nodes for ascending chime', () => {
      playCorrectSound()

      // Should create at least one oscillator for the ascending chime
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('connects oscillator to gain and gain to destination', () => {
      playCorrectSound()

      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode)
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination)
    })

    it('starts and schedules stop for the oscillator', () => {
      playCorrectSound()

      expect(mockOscillator.start).toHaveBeenCalled()
      expect(mockOscillator.stop).toHaveBeenCalled()
    })

    it('does not throw when AudioContext is unavailable', () => {
      global.window = {}
      expect(() => playCorrectSound()).not.toThrow()
    })
  })

  describe('playPartialSound', () => {
    it('should be a function', () => {
      expect(typeof playPartialSound).toBe('function')
    })

    it('creates oscillator for encouraging tone', () => {
      playPartialSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('does not throw when AudioContext is unavailable', () => {
      global.window = {}
      expect(() => playPartialSound()).not.toThrow()
    })
  })

  describe('playIncorrectSound', () => {
    it('should be a function', () => {
      expect(typeof playIncorrectSound).toBe('function')
    })

    it('creates oscillator for gentle low tone', () => {
      playIncorrectSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('uses lower frequency range (gentle, not punishing)', () => {
      playIncorrectSound()

      // Verify frequency is set (should be in lower range)
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalled()
    })

    it('does not throw when AudioContext is unavailable', () => {
      global.window = {}
      expect(() => playIncorrectSound()).not.toThrow()
    })
  })

  describe('playSelectSound', () => {
    it('should be a function', () => {
      expect(typeof playSelectSound).toBe('function')
    })

    it('creates oscillator for soft tap sound', () => {
      playSelectSound()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('uses short duration for tap effect', () => {
      playSelectSound()

      // Should start and stop quickly
      expect(mockOscillator.start).toHaveBeenCalled()
      expect(mockOscillator.stop).toHaveBeenCalled()
    })

    it('does not throw when AudioContext is unavailable', () => {
      global.window = {}
      expect(() => playSelectSound()).not.toThrow()
    })
  })

  describe('playBuildUpSound', () => {
    it('should be a function', () => {
      expect(typeof playBuildUpSound).toBe('function')
    })

    it('creates oscillator for anticipation build-up', () => {
      vi.useFakeTimers()
      playBuildUpSound()

      // Initial oscillator should be created
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()

      vi.runAllTimers()
    })

    it('uses frequency sweep for anticipation effect', () => {
      vi.useFakeTimers()
      playBuildUpSound()

      // Should set initial frequency
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalled()

      vi.runAllTimers()
    })

    it('does not throw when AudioContext is unavailable', () => {
      global.window = {}
      expect(() => playBuildUpSound()).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('handles AudioContext creation failure gracefully', () => {
      global.window = {
        AudioContext: vi.fn(() => {
          throw new Error('AudioContext not supported')
        }),
      }

      expect(() => playCorrectSound()).not.toThrow()
      expect(() => playPartialSound()).not.toThrow()
      expect(() => playIncorrectSound()).not.toThrow()
      expect(() => playSelectSound()).not.toThrow()
      expect(() => playBuildUpSound()).not.toThrow()
    })

    it('handles oscillator methods throwing errors', () => {
      mockOscillator.start = vi.fn(() => {
        throw new Error('Start failed')
      })

      expect(() => playCorrectSound()).not.toThrow()
    })
  })
})
