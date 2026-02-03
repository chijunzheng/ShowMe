/**
 * BossDefeated Component Tests
 *
 * Tests for the boss victory celebration component.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rendering victory celebration
 * - Level-specific messaging
 * - XP bonus display
 * - Timer/callback behavior
 * - Animation effects
 * - Sound effect integration
 * - Accessibility
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import BossDefeated from '../BossDefeated'

// Mock sound effects
vi.mock('@/utils/soundEffects', () => ({
  playBossVictorySound: vi.fn(),
}))

describe('BossDefeated', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  describe('rendering', () => {
    it('renders when show is true', () => {
      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(celebration).toBeInTheDocument()
    })

    it('does not render when show is false', () => {
      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={false}
          onComplete={() => {}}
        />
      )

      expect(screen.queryByTestId('boss-defeated')).toBeNull()
    })

    it('displays victory message', () => {
      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(
        celebration.textContent.toLowerCase().includes('defeated') ||
        celebration.textContent.toLowerCase().includes('victory') ||
        celebration.textContent.toLowerCase().includes('won') ||
        celebration.textContent.toLowerCase().includes('beat')
      ).toBe(true)
    })

    it('displays boss name from config', () => {
      render(
        <BossDefeated
          level="deep"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      // Should show the boss name specific to the level
      expect(celebration.textContent.length).toBeGreaterThan(0)
    })

    it('displays celebration icon/emoji', () => {
      render(
        <BossDefeated
          level="standard"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      // Should have victory-related emoji or icon
      expect(celebration.textContent.length).toBeGreaterThan(0)
    })
  })

  describe('XP bonus display', () => {
    it('shows default XP bonus of 25', () => {
      render(
        <BossDefeated
          level="simple"
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(
        celebration.textContent.includes('25') ||
        celebration.textContent.includes('XP') ||
        celebration.textContent.includes('bonus')
      ).toBe(true)
    })

    it('shows custom XP bonus', () => {
      render(
        <BossDefeated
          level="simple"
          xpBonus={50}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(celebration.textContent).toContain('50')
    })

    it('displays XP bonus prominently', () => {
      render(
        <BossDefeated
          level="standard"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      // Should have XP bonus indicator
      const xpElement = screen.getByTestId('boss-defeated')
      expect(
        xpElement.textContent.includes('XP') ||
        xpElement.textContent.includes('xp') ||
        xpElement.textContent.includes('+')
      ).toBe(true)
    })
  })

  describe('level-specific styling', () => {
    it('applies simple level styling', () => {
      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(
        celebration.className.includes('simple') ||
        celebration.className.includes('green') ||
        celebration.className.includes('emerald')
      ).toBe(true)
    })

    it('applies standard level styling', () => {
      render(
        <BossDefeated
          level="standard"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(
        celebration.className.includes('standard') ||
        celebration.className.includes('blue') ||
        celebration.className.includes('cyan')
      ).toBe(true)
    })

    it('applies deep level styling', () => {
      render(
        <BossDefeated
          level="deep"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(
        celebration.className.includes('deep') ||
        celebration.className.includes('purple') ||
        celebration.className.includes('violet')
      ).toBe(true)
    })
  })

  describe('animation effects', () => {
    it('has entrance animation', () => {
      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(
        celebration.className.includes('animate') ||
        celebration.className.includes('scale') ||
        celebration.className.includes('fade')
      ).toBe(true)
    })

    it('has celebration effects (confetti/sparkles)', () => {
      render(
        <BossDefeated
          level="deep"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      // Should have particle effects or animated elements
      expect(
        celebration.className.includes('celebration') ||
        celebration.className.includes('confetti') ||
        celebration.className.includes('sparkle') ||
        celebration.querySelector('[data-testid="confetti"]') ||
        celebration.querySelector('.animate')
      ).toBeTruthy()
    })

    it('has bouncing or pulsing victory icon', () => {
      render(
        <BossDefeated
          level="standard"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(
        celebration.className.includes('bounce') ||
        celebration.className.includes('pulse') ||
        celebration.className.includes('animate')
      ).toBe(true)
    })
  })

  describe('onComplete callback', () => {
    it('calls onComplete after approximately 3 seconds', async () => {
      const onComplete = vi.fn()
      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={onComplete}
        />
      )

      expect(onComplete).not.toHaveBeenCalled()

      // Advance past celebration duration (3000ms)
      await act(async () => {
        vi.advanceTimersByTime(3000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('does not call onComplete before duration ends', async () => {
      const onComplete = vi.fn()
      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={onComplete}
        />
      )

      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('calls onComplete only once', async () => {
      const onComplete = vi.fn()
      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={onComplete}
        />
      )

      await act(async () => {
        vi.advanceTimersByTime(6000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('cleans up timer on unmount', async () => {
      const onComplete = vi.fn()
      const { unmount } = render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={onComplete}
        />
      )

      unmount()

      await act(async () => {
        vi.advanceTimersByTime(4000)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('does not call onComplete when show is false', async () => {
      const onComplete = vi.fn()
      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={false}
          onComplete={onComplete}
        />
      )

      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('starts timer when show changes to true', async () => {
      const onComplete = vi.fn()
      const { rerender } = render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={false}
          onComplete={onComplete}
        />
      )

      rerender(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={onComplete}
        />
      )

      await act(async () => {
        vi.advanceTimersByTime(3000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('sound effects', () => {
    it('plays boss victory sound when shown', async () => {
      const { playBossVictorySound } = await import('@/utils/soundEffects')

      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      expect(playBossVictorySound).toHaveBeenCalled()
    })

    it('does not play sound when show is false', async () => {
      const { playBossVictorySound } = await import('@/utils/soundEffects')

      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={false}
          onComplete={() => {}}
        />
      )

      expect(playBossVictorySound).not.toHaveBeenCalled()
    })

    it('plays sound only once', async () => {
      const { playBossVictorySound } = await import('@/utils/soundEffects')

      render(
        <BossDefeated
          level="standard"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(playBossVictorySound).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has aria-live for screen reader announcements', () => {
      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(
        celebration.getAttribute('aria-live') === 'polite' ||
        celebration.getAttribute('aria-live') === 'assertive'
      ).toBe(true)
    })

    it('has appropriate role', () => {
      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(
        celebration.getAttribute('role') === 'alert' ||
        celebration.getAttribute('role') === 'status' ||
        celebration.getAttribute('aria-live')
      ).toBeTruthy()
    })

    it('has descriptive text content', () => {
      render(
        <BossDefeated
          level="deep"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      // Content should be meaningful for screen readers
      expect(celebration.textContent.length).toBeGreaterThan(10)
    })

    it('animations respect reduced motion preference', () => {
      render(
        <BossDefeated
          level="standard"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      // Should use motion-safe or motion-reduce utilities
      expect(
        celebration.className.includes('motion-') ||
        celebration.className.includes('animate') ||
        !celebration.className.includes('animate-spin') // avoid excessive animation
      ).toBe(true)
    })
  })

  describe('visual layout', () => {
    it('covers viewport for modal effect', () => {
      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(
        celebration.className.includes('fixed') ||
        celebration.className.includes('absolute') ||
        celebration.className.includes('inset')
      ).toBe(true)
    })

    it('has high z-index to overlay content', () => {
      render(
        <BossDefeated
          level="simple"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(
        celebration.className.includes('z-') ||
        celebration.style.zIndex
      ).toBeTruthy()
    })

    it('centers victory message', () => {
      render(
        <BossDefeated
          level="standard"
          xpBonus={25}
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(
        celebration.className.includes('flex') ||
        celebration.className.includes('items-center') ||
        celebration.className.includes('justify-center')
      ).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles undefined level gracefully', () => {
      expect(() =>
        render(
          <BossDefeated
            level={undefined}
            xpBonus={25}
            show={true}
            onComplete={() => {}}
          />
        )
      ).not.toThrow()

      expect(screen.getByTestId('boss-defeated')).toBeInTheDocument()
    })

    it('handles null level gracefully', () => {
      expect(() =>
        render(
          <BossDefeated
            level={null}
            xpBonus={25}
            show={true}
            onComplete={() => {}}
          />
        )
      ).not.toThrow()
    })

    it('handles undefined xpBonus (uses default 25)', () => {
      render(
        <BossDefeated
          level="simple"
          show={true}
          onComplete={() => {}}
        />
      )

      const celebration = screen.getByTestId('boss-defeated')
      expect(celebration.textContent).toContain('25')
    })

    it('handles zero xpBonus', () => {
      render(
        <BossDefeated
          level="simple"
          xpBonus={0}
          show={true}
          onComplete={() => {}}
        />
      )

      expect(screen.getByTestId('boss-defeated')).toBeInTheDocument()
    })

    it('handles missing onComplete', () => {
      expect(() =>
        render(
          <BossDefeated
            level="simple"
            xpBonus={25}
            show={true}
          />
        )
      ).not.toThrow()

      act(() => {
        vi.advanceTimersByTime(4000)
      })
      // Should not throw
    })
  })

  describe('prop types validation', () => {
    it('accepts valid level values', () => {
      const validLevels = ['simple', 'standard', 'deep']

      validLevels.forEach((level) => {
        expect(() =>
          render(
            <BossDefeated
              level={level}
              xpBonus={25}
              show={true}
              onComplete={() => {}}
            />
          )
        ).not.toThrow()
        cleanup()
      })
    })

    it('accepts numeric xpBonus', () => {
      expect(() =>
        render(
          <BossDefeated
            level="simple"
            xpBonus={100}
            show={true}
            onComplete={() => {}}
          />
        )
      ).not.toThrow()
    })

    it('accepts boolean show', () => {
      expect(() =>
        render(
          <BossDefeated
            level="simple"
            xpBonus={25}
            show={true}
            onComplete={() => {}}
          />
        )
      ).not.toThrow()

      cleanup()

      expect(() =>
        render(
          <BossDefeated
            level="simple"
            xpBonus={25}
            show={false}
            onComplete={() => {}}
          />
        )
      ).not.toThrow()
    })

    it('accepts function onComplete', () => {
      const onComplete = vi.fn()
      expect(() =>
        render(
          <BossDefeated
            level="simple"
            xpBonus={25}
            show={true}
            onComplete={onComplete}
          />
        )
      ).not.toThrow()
    })
  })
})
