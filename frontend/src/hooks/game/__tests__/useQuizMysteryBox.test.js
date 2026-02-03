/**
 * useQuizMysteryBox Hook Tests
 *
 * Tests for the Mystery Box reward calculation and ceremony state hook.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Initial state
 * - Phase transitions
 * - Reward calculation
 * - Opening ceremony flow
 * - Skip functionality
 * - Reset functionality
 * - Edge cases
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import useQuizMysteryBox from '../useQuizMysteryBox'
import { MYSTERY_BOX_TIERS, MYSTERY_BOX_TIMING } from '../mysteryBoxConfig'

describe('useQuizMysteryBox', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('returns initial phase as hidden', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      expect(result.current.phase).toBe('hidden')
    })

    it('returns null rewards initially', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      expect(result.current.rewards).toBeNull()
    })

    it('returns isOpen as false initially', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      expect(result.current.isOpen).toBe(false)
    })

    it('returns hasBox as false initially', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      expect(result.current.hasBox).toBe(false)
    })

    it('returns timing configuration', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      expect(result.current.timing).toBeDefined()
      expect(result.current.timing).toEqual(MYSTERY_BOX_TIMING)
    })

    it('exposes required functions', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      expect(typeof result.current.calculateRewards).toBe('function')
      expect(typeof result.current.startOpeningCeremony).toBe('function')
      expect(typeof result.current.skipToReveal).toBe('function')
      expect(typeof result.current.reset).toBe('function')
    })
  })

  describe('calculateRewards', () => {
    it('sets hasBox to true when score qualifies (>= 60%)', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(75)
      })

      expect(result.current.hasBox).toBe(true)
    })

    it('sets hasBox to false when score does not qualify (< 60%)', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(50)
      })

      expect(result.current.hasBox).toBe(false)
    })

    it('calculates rewards for bronze tier (60-74%)', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(65)
      })

      expect(result.current.rewards).not.toBeNull()
      expect(result.current.rewards.tier).toEqual(MYSTERY_BOX_TIERS.bronze)
      expect(result.current.rewards.xpBonus).toBeGreaterThanOrEqual(
        MYSTERY_BOX_TIERS.bronze.rewards.xpMin
      )
      expect(result.current.rewards.xpBonus).toBeLessThanOrEqual(
        MYSTERY_BOX_TIERS.bronze.rewards.xpMax
      )
    })

    it('calculates rewards for silver tier (75-89%)', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(82)
      })

      expect(result.current.rewards.tier).toEqual(MYSTERY_BOX_TIERS.silver)
    })

    it('calculates rewards for gold tier (90-99%)', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(95)
      })

      expect(result.current.rewards.tier).toEqual(MYSTERY_BOX_TIERS.gold)
    })

    it('calculates rewards for legendary tier (100%)', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(100)
      })

      expect(result.current.rewards.tier).toEqual(MYSTERY_BOX_TIERS.legendary)
    })

    it('includes pieceRarity in rewards', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
      })

      expect(result.current.rewards.pieceRarity).toBeDefined()
      expect(['common', 'rare', 'epic', 'legendary']).toContain(
        result.current.rewards.pieceRarity
      )
    })

    it('may include powerUp for silver and above', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      // Run multiple times since powerUp is probabilistic
      let foundPowerUp = false
      for (let i = 0; i < 20; i++) {
        act(() => {
          result.current.reset()
          result.current.calculateRewards(100) // Legendary = guaranteed power-up
        })
        if (result.current.rewards.powerUp !== null) {
          foundPowerUp = true
          break
        }
      }

      expect(foundPowerUp).toBe(true)
    })

    it('returns null rewards when score is below 60%', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(55)
      })

      expect(result.current.rewards).toBeNull()
    })

    it('accepts bossVictory flag for tier upgrade', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(65, { bossVictory: true })
      })

      // Bronze + boss victory upgrade = Silver
      expect(result.current.rewards.tier).toEqual(MYSTERY_BOX_TIERS.silver)
    })

    it('upgrades legendary tier on boss victory but stays legendary', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(100, { bossVictory: true })
      })

      // Legendary + boss victory = still legendary (max tier)
      expect(result.current.rewards.tier).toEqual(MYSTERY_BOX_TIERS.legendary)
    })
  })

  describe('startOpeningCeremony', () => {
    it('transitions phase to appearing', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
      })

      expect(result.current.phase).toBe('appearing')
    })

    it('does nothing if hasBox is false', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(50) // Below threshold
        result.current.startOpeningCeremony()
      })

      expect(result.current.phase).toBe('hidden')
    })

    it('transitions to shaking after appearDelay', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
      })

      expect(result.current.phase).toBe('appearing')

      act(() => {
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.appearDelay)
      })

      expect(result.current.phase).toBe('shaking')
    })

    it('transitions to opening after shakesDuration', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
      })

      act(() => {
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.appearDelay)
      })

      expect(result.current.phase).toBe('shaking')

      act(() => {
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.shakesDuration)
      })

      expect(result.current.phase).toBe('opening')
    })

    it('transitions to revealed after openDuration', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
      })

      act(() => {
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.appearDelay)
      })

      act(() => {
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.shakesDuration)
      })

      act(() => {
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.openDuration)
      })

      expect(result.current.phase).toBe('revealed')
    })

    it('sets isOpen to true when phase becomes opening', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
      })

      expect(result.current.isOpen).toBe(false)

      act(() => {
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.appearDelay)
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.shakesDuration)
      })

      expect(result.current.isOpen).toBe(true)
    })
  })

  describe('phase transitions', () => {
    it('follows correct phase order: hidden -> appearing -> shaking -> opening -> revealed', () => {
      const { result } = renderHook(() => useQuizMysteryBox())
      const phases = []

      act(() => {
        result.current.calculateRewards(80)
        phases.push(result.current.phase) // hidden
        result.current.startOpeningCeremony()
        phases.push(result.current.phase) // appearing
      })

      act(() => {
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.appearDelay)
        phases.push(result.current.phase) // shaking
      })

      act(() => {
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.shakesDuration)
        phases.push(result.current.phase) // opening
      })

      act(() => {
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.openDuration)
        phases.push(result.current.phase) // revealed
      })

      expect(phases).toEqual(['hidden', 'appearing', 'shaking', 'opening', 'revealed'])
    })

    it('stays in revealed phase after completion', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
      })

      // Complete all transitions
      act(() => {
        vi.advanceTimersByTime(
          MYSTERY_BOX_TIMING.appearDelay +
          MYSTERY_BOX_TIMING.shakesDuration +
          MYSTERY_BOX_TIMING.openDuration +
          1000 // Extra time
        )
      })

      expect(result.current.phase).toBe('revealed')
    })
  })

  describe('skipToReveal', () => {
    it('immediately transitions to revealed phase', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
      })

      expect(result.current.phase).toBe('appearing')

      act(() => {
        result.current.skipToReveal()
      })

      expect(result.current.phase).toBe('revealed')
    })

    it('sets isOpen to true', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
        result.current.skipToReveal()
      })

      expect(result.current.isOpen).toBe(true)
    })

    it('does nothing if phase is hidden', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.skipToReveal()
      })

      expect(result.current.phase).toBe('hidden')
    })

    it('does nothing if already revealed', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
        result.current.skipToReveal()
      })

      expect(result.current.phase).toBe('revealed')

      act(() => {
        result.current.skipToReveal()
      })

      expect(result.current.phase).toBe('revealed')
    })

    it('cancels pending timers', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
      })

      act(() => {
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.appearDelay / 2)
        result.current.skipToReveal()
      })

      // Advance remaining time - phase should stay revealed
      act(() => {
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.appearDelay * 2)
      })

      expect(result.current.phase).toBe('revealed')
    })
  })

  describe('reset', () => {
    it('resets phase to hidden', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
        result.current.skipToReveal()
      })

      expect(result.current.phase).toBe('revealed')

      act(() => {
        result.current.reset()
      })

      expect(result.current.phase).toBe('hidden')
    })

    it('resets rewards to null', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
      })

      expect(result.current.rewards).not.toBeNull()

      act(() => {
        result.current.reset()
      })

      expect(result.current.rewards).toBeNull()
    })

    it('resets isOpen to false', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
        result.current.skipToReveal()
      })

      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.reset()
      })

      expect(result.current.isOpen).toBe(false)
    })

    it('resets hasBox to false', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
      })

      expect(result.current.hasBox).toBe(true)

      act(() => {
        result.current.reset()
      })

      expect(result.current.hasBox).toBe(false)
    })

    it('cancels all pending timers', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
      })

      act(() => {
        result.current.reset()
      })

      // Advance all timers - should stay hidden
      act(() => {
        vi.advanceTimersByTime(10000)
      })

      expect(result.current.phase).toBe('hidden')
    })
  })

  describe('reward structure', () => {
    it('rewards object has correct shape', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(85)
      })

      expect(result.current.rewards).toHaveProperty('tier')
      expect(result.current.rewards).toHaveProperty('xpBonus')
      expect(result.current.rewards).toHaveProperty('powerUp')
      expect(result.current.rewards).toHaveProperty('pieceRarity')
    })

    it('tier is a valid tier object', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(85)
      })

      const tierIds = Object.keys(MYSTERY_BOX_TIERS)
      expect(tierIds).toContain(result.current.rewards.tier.id)
    })

    it('xpBonus is a positive integer', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(85)
      })

      expect(result.current.rewards.xpBonus).toBeGreaterThan(0)
      expect(Number.isInteger(result.current.rewards.xpBonus)).toBe(true)
    })

    it('powerUp is null or valid power-up object', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(100)
      })

      if (result.current.rewards.powerUp !== null) {
        expect(result.current.rewards.powerUp).toHaveProperty('id')
        expect(result.current.rewards.powerUp).toHaveProperty('name')
        expect(result.current.rewards.powerUp).toHaveProperty('icon')
      }
    })

    it('pieceRarity is valid rarity string', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(85)
      })

      const validRarities = ['common', 'rare', 'epic', 'legendary']
      expect(validRarities).toContain(result.current.rewards.pieceRarity)
    })
  })

  describe('edge cases', () => {
    it('handles multiple calculateRewards calls', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(65)
      })

      expect(result.current.rewards.tier.id).toBe('bronze')

      act(() => {
        result.current.calculateRewards(95)
      })

      expect(result.current.rewards.tier.id).toBe('gold')
    })

    it('handles starting ceremony twice', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
      })

      act(() => {
        vi.advanceTimersByTime(MYSTERY_BOX_TIMING.appearDelay / 2)
      })

      // Start again mid-ceremony
      act(() => {
        result.current.startOpeningCeremony()
      })

      // Should not break, phase continues
      expect(['appearing', 'shaking']).toContain(result.current.phase)
    })

    it('handles unmount during ceremony gracefully', () => {
      const { result, unmount } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
      })

      // Unmount during animation
      expect(() => unmount()).not.toThrow()
    })

    it('handles zero score', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(0)
      })

      expect(result.current.hasBox).toBe(false)
      expect(result.current.rewards).toBeNull()
    })

    it('handles score of exactly 60', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(60)
      })

      expect(result.current.hasBox).toBe(true)
      expect(result.current.rewards.tier.id).toBe('bronze')
    })

    it('handles score of 59.99', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(59.99)
      })

      expect(result.current.hasBox).toBe(false)
    })

    it('handles negative score', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(-10)
      })

      expect(result.current.hasBox).toBe(false)
      expect(result.current.rewards).toBeNull()
    })

    it('handles score above 100', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(110)
      })

      // Should clamp to legendary tier
      expect(result.current.rewards.tier.id).toBe('legendary')
    })
  })

  describe('cleanup', () => {
    it('clears timers on unmount', () => {
      const { result, unmount } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
      })

      unmount()

      // Should not throw when timers fire after unmount
      expect(() => {
        vi.advanceTimersByTime(10000)
      }).not.toThrow()
    })

    it('clears timers on reset', () => {
      const { result } = renderHook(() => useQuizMysteryBox())

      act(() => {
        result.current.calculateRewards(80)
        result.current.startOpeningCeremony()
      })

      act(() => {
        result.current.reset()
      })

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      act(() => {
        result.current.calculateRewards(90)
        result.current.startOpeningCeremony()
        result.current.reset()
      })

      // Should have called clearTimeout
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })
})
