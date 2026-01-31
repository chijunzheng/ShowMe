/**
 * Haptics Utility Tests
 *
 * Tests for the vibration feedback utility functions.
 * Uses mocked navigator.vibrate for browser compatibility testing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  vibrateShort,
  vibrateSuccess,
  vibrateStreak,
  vibrateError,
  isHapticsSupported,
} from './haptics'

describe('haptics utility', () => {
  let originalNavigator
  let mockVibrate

  beforeEach(() => {
    // Store original navigator.vibrate
    originalNavigator = global.navigator
    mockVibrate = vi.fn()

    // Mock navigator with vibrate support
    Object.defineProperty(global, 'navigator', {
      value: {
        vibrate: mockVibrate,
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
    vi.clearAllMocks()
  })

  describe('isHapticsSupported', () => {
    it('returns true when navigator.vibrate is available', () => {
      expect(isHapticsSupported()).toBe(true)
    })

    it('returns false when navigator.vibrate is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      })
      expect(isHapticsSupported()).toBe(false)
    })

    it('returns false when navigator is undefined', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      expect(isHapticsSupported()).toBe(false)
    })
  })

  describe('vibrateShort', () => {
    it('calls navigator.vibrate with short duration', () => {
      vibrateShort()
      expect(mockVibrate).toHaveBeenCalledTimes(1)
      expect(mockVibrate).toHaveBeenCalledWith(10)
    })

    it('does not throw when vibration is not supported', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      })
      expect(() => vibrateShort()).not.toThrow()
    })
  })

  describe('vibrateSuccess', () => {
    it('calls navigator.vibrate with success pattern', () => {
      vibrateSuccess()
      expect(mockVibrate).toHaveBeenCalledTimes(1)
      // Success pattern: two quick pulses [30, 50, 30]
      expect(mockVibrate).toHaveBeenCalledWith([30, 50, 30])
    })

    it('does not throw when vibration is not supported', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      })
      expect(() => vibrateSuccess()).not.toThrow()
    })
  })

  describe('vibrateStreak', () => {
    it('calls navigator.vibrate with streak milestone pattern', () => {
      vibrateStreak()
      expect(mockVibrate).toHaveBeenCalledTimes(1)
      // Streak pattern: building pattern [20, 30, 40, 30, 60]
      expect(mockVibrate).toHaveBeenCalledWith([20, 30, 40, 30, 60])
    })

    it('does not throw when vibration is not supported', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      })
      expect(() => vibrateStreak()).not.toThrow()
    })
  })

  describe('vibrateError', () => {
    it('calls navigator.vibrate with longer error buzz', () => {
      vibrateError()
      expect(mockVibrate).toHaveBeenCalledTimes(1)
      // Error pattern: single longer buzz [100]
      expect(mockVibrate).toHaveBeenCalledWith(100)
    })

    it('does not throw when vibration is not supported', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      })
      expect(() => vibrateError()).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('handles vibrate throwing an error gracefully', () => {
      mockVibrate.mockImplementation(() => {
        throw new Error('Vibration not allowed')
      })
      expect(() => vibrateShort()).not.toThrow()
      expect(() => vibrateSuccess()).not.toThrow()
      expect(() => vibrateStreak()).not.toThrow()
      expect(() => vibrateError()).not.toThrow()
    })
  })
})
