/**
 * useGameInventory Hook Tests
 *
 * TDD: Tests for game inventory system with power-ups.
 * PHASE-5: Power-Ups System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useGameInventory from './useGameInventory'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('useGameInventory', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('returns empty inventory when localStorage is empty', () => {
      const { result } = renderHook(() => useGameInventory())

      expect(result.current.inventory).toEqual({})
      expect(result.current.activeEffects).toEqual([])
    })

    it('loads inventory from localStorage on mount', () => {
      const savedInventory = {
        hint_boost: 3,
        xp_multiplier: 1,
        skip_token: 2,
      }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: savedInventory,
        activeEffects: [],
      }))

      const { result } = renderHook(() => useGameInventory())

      expect(result.current.inventory).toEqual(savedInventory)
    })

    it('loads active effects from localStorage', () => {
      const now = Date.now()
      const savedEffects = [
        { id: 'xp_multiplier', expiresAt: now + 60000, multiplier: 2 },
      ]
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: { xp_multiplier: 0 },
        activeEffects: savedEffects,
      }))

      const { result } = renderHook(() => useGameInventory())

      expect(result.current.activeEffects).toHaveLength(1)
      expect(result.current.activeEffects[0].id).toBe('xp_multiplier')
    })

    it('filters out expired effects on load', () => {
      const now = Date.now()
      const expiredEffect = { id: 'xp_multiplier', expiresAt: now - 1000, multiplier: 2 }
      const validEffect = { id: 'hint_boost', expiresAt: now + 60000 }

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: {},
        activeEffects: [expiredEffect, validEffect],
      }))

      const { result } = renderHook(() => useGameInventory())

      expect(result.current.activeEffects).toHaveLength(1)
      expect(result.current.activeEffects[0].id).toBe('hint_boost')
    })
  })

  describe('addItems', () => {
    it('adds new items to empty inventory', () => {
      const { result } = renderHook(() => useGameInventory())

      act(() => {
        result.current.addItems([
          { id: 'hint_boost', quantity: 2 },
          { id: 'xp_multiplier', quantity: 1 },
        ])
      })

      expect(result.current.inventory.hint_boost).toBe(2)
      expect(result.current.inventory.xp_multiplier).toBe(1)
    })

    it('increments existing item quantities', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: { hint_boost: 3 },
        activeEffects: [],
      }))

      const { result } = renderHook(() => useGameInventory())

      act(() => {
        result.current.addItems([{ id: 'hint_boost', quantity: 2 }])
      })

      expect(result.current.inventory.hint_boost).toBe(5)
    })

    it('persists changes to localStorage', () => {
      const { result } = renderHook(() => useGameInventory())

      act(() => {
        result.current.addItems([{ id: 'skip_token', quantity: 1 }])
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'showme_inventory',
        expect.stringContaining('skip_token')
      )
    })

    it('handles empty items array gracefully', () => {
      const { result } = renderHook(() => useGameInventory())

      act(() => {
        result.current.addItems([])
      })

      expect(result.current.inventory).toEqual({})
    })

    it('handles null/undefined items gracefully', () => {
      const { result } = renderHook(() => useGameInventory())

      expect(() => {
        act(() => {
          result.current.addItems(null)
        })
      }).not.toThrow()

      expect(() => {
        act(() => {
          result.current.addItems(undefined)
        })
      }).not.toThrow()
    })
  })

  describe('useItem', () => {
    it('consumes item and returns effect for hint_boost', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: { hint_boost: 2 },
        activeEffects: [],
      }))

      const { result } = renderHook(() => useGameInventory())

      let effect
      act(() => {
        effect = result.current.useItem('hint_boost')
      })

      expect(result.current.inventory.hint_boost).toBe(1)
      expect(effect).toEqual({
        type: 'hint_boost',
        description: 'Get a helpful hint on your next question',
      })
    })

    it('consumes item and activates timed effect for xp_multiplier', () => {
      const now = Date.now()
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: { xp_multiplier: 1 },
        activeEffects: [],
      }))

      const { result } = renderHook(() => useGameInventory())

      let effect
      act(() => {
        effect = result.current.useItem('xp_multiplier')
      })

      expect(result.current.inventory.xp_multiplier).toBe(0)
      expect(effect.type).toBe('xp_multiplier')
      expect(effect.multiplier).toBe(2)
      expect(result.current.activeEffects).toHaveLength(1)
      expect(result.current.activeEffects[0].expiresAt).toBeGreaterThan(now)
    })

    it('returns null when item count is 0', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: { hint_boost: 0 },
        activeEffects: [],
      }))

      const { result } = renderHook(() => useGameInventory())

      let effect
      act(() => {
        effect = result.current.useItem('hint_boost')
      })

      expect(effect).toBeNull()
      expect(result.current.inventory.hint_boost).toBe(0)
    })

    it('returns null for non-existent item', () => {
      const { result } = renderHook(() => useGameInventory())

      let effect
      act(() => {
        effect = result.current.useItem('non_existent')
      })

      expect(effect).toBeNull()
    })

    it('returns null when same timed effect is already active', () => {
      const now = Date.now()
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: { xp_multiplier: 2 },
        activeEffects: [
          { id: 'xp_multiplier', expiresAt: now + 60000, multiplier: 2 },
        ],
      }))

      const { result } = renderHook(() => useGameInventory())

      let effect
      act(() => {
        effect = result.current.useItem('xp_multiplier')
      })

      // Should not consume when already active
      expect(effect).toBeNull()
      expect(result.current.inventory.xp_multiplier).toBe(2)
    })

    it('persists inventory changes after using item', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: { hint_boost: 1 },
        activeEffects: [],
      }))

      const { result } = renderHook(() => useGameInventory())
      vi.clearAllMocks()

      act(() => {
        result.current.useItem('hint_boost')
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'showme_inventory',
        expect.any(String)
      )
    })
  })

  describe('getItemCount', () => {
    it('returns count for existing item', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: { hint_boost: 5 },
        activeEffects: [],
      }))

      const { result } = renderHook(() => useGameInventory())

      expect(result.current.getItemCount('hint_boost')).toBe(5)
    })

    it('returns 0 for non-existent item', () => {
      const { result } = renderHook(() => useGameInventory())

      expect(result.current.getItemCount('non_existent')).toBe(0)
    })

    it('returns 0 for null/undefined item id', () => {
      const { result } = renderHook(() => useGameInventory())

      expect(result.current.getItemCount(null)).toBe(0)
      expect(result.current.getItemCount(undefined)).toBe(0)
    })
  })

  describe('getActiveEffects', () => {
    it('returns all currently active effects', () => {
      const now = Date.now()
      const activeEffects = [
        { id: 'xp_multiplier', expiresAt: now + 60000, multiplier: 2 },
        { id: 'shield', expiresAt: now + 30000 },
      ]
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: {},
        activeEffects,
      }))

      const { result } = renderHook(() => useGameInventory())

      const effects = result.current.getActiveEffects()
      expect(effects).toHaveLength(2)
      expect(effects.map(e => e.id)).toContain('xp_multiplier')
      expect(effects.map(e => e.id)).toContain('shield')
    })

    it('filters expired effects', () => {
      const now = Date.now()
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: {},
        activeEffects: [
          { id: 'xp_multiplier', expiresAt: now + 60000, multiplier: 2 },
        ],
      }))

      const { result } = renderHook(() => useGameInventory())

      // Advance time past expiration
      act(() => {
        vi.advanceTimersByTime(70000)
      })

      const effects = result.current.getActiveEffects()
      expect(effects).toHaveLength(0)
    })

    it('returns effects with remaining time', () => {
      const now = Date.now()
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: {},
        activeEffects: [
          { id: 'xp_multiplier', expiresAt: now + 60000, multiplier: 2 },
        ],
      }))

      const { result } = renderHook(() => useGameInventory())

      const effects = result.current.getActiveEffects()
      expect(effects[0].remainingMs).toBeGreaterThan(50000)
      expect(effects[0].remainingMs).toBeLessThanOrEqual(60000)
    })
  })

  describe('isEffectActive', () => {
    it('returns true when effect is active', () => {
      const now = Date.now()
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: {},
        activeEffects: [
          { id: 'xp_multiplier', expiresAt: now + 60000, multiplier: 2 },
        ],
      }))

      const { result } = renderHook(() => useGameInventory())

      expect(result.current.isEffectActive('xp_multiplier')).toBe(true)
    })

    it('returns false when effect is not active', () => {
      const { result } = renderHook(() => useGameInventory())

      expect(result.current.isEffectActive('xp_multiplier')).toBe(false)
    })

    it('returns false when effect has expired', () => {
      const now = Date.now()
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: {},
        activeEffects: [
          { id: 'xp_multiplier', expiresAt: now + 10000, multiplier: 2 },
        ],
      }))

      const { result } = renderHook(() => useGameInventory())

      act(() => {
        vi.advanceTimersByTime(15000)
      })

      expect(result.current.isEffectActive('xp_multiplier')).toBe(false)
    })
  })

  describe('effect expiration', () => {
    it('automatically cleans up expired effects', () => {
      const now = Date.now()
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        version: 1,
        items: {},
        activeEffects: [
          { id: 'xp_multiplier', expiresAt: now + 5000, multiplier: 2 },
        ],
      }))

      const { result } = renderHook(() => useGameInventory())

      expect(result.current.activeEffects).toHaveLength(1)

      act(() => {
        vi.advanceTimersByTime(6000)
      })

      expect(result.current.activeEffects).toHaveLength(0)
    })
  })

  describe('error handling', () => {
    it('handles corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json{{{')

      const { result } = renderHook(() => useGameInventory())

      expect(result.current.inventory).toEqual({})
      expect(result.current.activeEffects).toEqual([])
    })

    it('handles localStorage read errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage access denied')
      })

      const { result } = renderHook(() => useGameInventory())

      expect(result.current.inventory).toEqual({})
    })

    it('handles localStorage write errors gracefully', () => {
      const { result } = renderHook(() => useGameInventory())

      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Quota exceeded')
      })

      // Should not throw
      expect(() => {
        act(() => {
          result.current.addItems([{ id: 'hint_boost', quantity: 1 }])
        })
      }).not.toThrow()
    })
  })

  describe('storage versioning', () => {
    it('handles version upgrade from older format', () => {
      // Old format without version
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        hint_boost: 2,
      }))

      const { result } = renderHook(() => useGameInventory())

      // Should migrate legacy format
      expect(result.current.inventory.hint_boost).toBe(2)
    })
  })
})
