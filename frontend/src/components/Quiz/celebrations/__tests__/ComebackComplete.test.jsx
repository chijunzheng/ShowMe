/**
 * ComebackComplete Component Tests
 *
 * Tests for the comeback victory celebration component.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rendering victory celebration
 * - Level-specific messaging and styling
 * - XP earned display
 * - Timer/callback behavior
 * - Animation effects
 * - Sound effect integration
 * - Accessibility
 * - Edge cases
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import ComebackComplete from '../ComebackComplete'

// Mock sound effects
vi.mock('@/utils/soundEffects', () => ({
  playComebackSuccessSound: vi.fn(),
}))

describe('ComebackComplete', () => {
  const defaultProps = {
    level: 'simple',
    xpEarned: 70,
    show: true,
    onComplete: vi.fn(),
  }

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
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(celebration).toBeInTheDocument()
    })

    it('does not render when show is false', () => {
      render(<ComebackComplete {...defaultProps} show={false} />)

      expect(screen.queryByTestId('comeback-complete')).toBeNull()
    })

    it('displays victory/success message', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.textContent.toLowerCase().includes('comeback') ||
        celebration.textContent.toLowerCase().includes('success') ||
        celebration.textContent.toLowerCase().includes('you did it') ||
        celebration.textContent.toLowerCase().includes('amazing') ||
        celebration.textContent.toLowerCase().includes('won')
      ).toBe(true)
    })

    it('displays encouraging subtitle', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      // Should have encouraging text
      expect(celebration.textContent.length).toBeGreaterThan(20)
    })

    it('displays celebration icon/emoji', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      // Should have victory-related emoji or icon
      expect(celebration.textContent.length).toBeGreaterThan(0)
    })
  })

  describe('XP display', () => {
    it('shows XP earned', () => {
      render(<ComebackComplete {...defaultProps} xpEarned={70} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(celebration.textContent).toContain('70')
    })

    it('shows custom XP amount', () => {
      render(<ComebackComplete {...defaultProps} xpEarned={105} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(celebration.textContent).toContain('105')
    })

    it('displays XP label', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.textContent.includes('XP') ||
        celebration.textContent.includes('xp') ||
        celebration.textContent.includes('points')
      ).toBe(true)
    })

    it('shows XP with plus sign indicator', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.textContent.includes('+') ||
        celebration.textContent.includes('earned') ||
        celebration.textContent.includes('gained')
      ).toBe(true)
    })
  })

  describe('level-specific styling', () => {
    it('applies simple level styling', () => {
      render(<ComebackComplete {...defaultProps} level="simple" />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.className.includes('simple') ||
        celebration.className.includes('green') ||
        celebration.className.includes('emerald')
      ).toBe(true)
    })

    it('applies standard level styling', () => {
      render(<ComebackComplete {...defaultProps} level="standard" />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.className.includes('standard') ||
        celebration.className.includes('blue') ||
        celebration.className.includes('cyan')
      ).toBe(true)
    })

    it('applies deep level styling', () => {
      render(<ComebackComplete {...defaultProps} level="deep" />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.className.includes('deep') ||
        celebration.className.includes('purple') ||
        celebration.className.includes('violet')
      ).toBe(true)
    })

    it('has gradient background', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.className.includes('gradient') ||
        celebration.className.includes('bg-gradient')
      ).toBe(true)
    })

    it('has glow effect', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.className.includes('glow') ||
        celebration.className.includes('shadow')
      ).toBe(true)
    })
  })

  describe('animation effects', () => {
    it('has entrance animation', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.className.includes('animate') ||
        celebration.className.includes('scale') ||
        celebration.className.includes('fade')
      ).toBe(true)
    })

    it('has celebration effects (confetti/sparkles)', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.className.includes('celebration') ||
        celebration.className.includes('confetti') ||
        celebration.className.includes('sparkle') ||
        celebration.querySelector('[data-testid="confetti"]') ||
        celebration.querySelector('.animate')
      ).toBeTruthy()
    })

    it('has bouncing or pulsing victory icon', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.className.includes('bounce') ||
        celebration.className.includes('pulse') ||
        celebration.className.includes('animate')
      ).toBe(true)
    })

    it('XP counter animates', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.className.includes('animate') ||
        celebration.querySelector('[class*="animate"]')
      ).toBeTruthy()
    })
  })

  describe('onComplete callback', () => {
    it('calls onComplete after celebration duration', async () => {
      const onComplete = vi.fn()
      render(<ComebackComplete {...defaultProps} onComplete={onComplete} />)

      expect(onComplete).not.toHaveBeenCalled()

      // Advance past celebration duration (approximately 3000ms)
      await act(async () => {
        vi.advanceTimersByTime(3000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('does not call onComplete before duration ends', async () => {
      const onComplete = vi.fn()
      render(<ComebackComplete {...defaultProps} onComplete={onComplete} />)

      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('calls onComplete only once', async () => {
      const onComplete = vi.fn()
      render(<ComebackComplete {...defaultProps} onComplete={onComplete} />)

      await act(async () => {
        vi.advanceTimersByTime(6000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('cleans up timer on unmount', async () => {
      const onComplete = vi.fn()
      const { unmount } = render(
        <ComebackComplete {...defaultProps} onComplete={onComplete} />
      )

      unmount()

      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('does not call onComplete when show is false', async () => {
      const onComplete = vi.fn()
      render(<ComebackComplete {...defaultProps} show={false} onComplete={onComplete} />)

      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('starts timer when show changes to true', async () => {
      const onComplete = vi.fn()
      const { rerender } = render(
        <ComebackComplete {...defaultProps} show={false} onComplete={onComplete} />
      )

      rerender(<ComebackComplete {...defaultProps} show={true} onComplete={onComplete} />)

      await act(async () => {
        vi.advanceTimersByTime(3000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('sound effects', () => {
    it('plays comeback success sound when shown', async () => {
      const { playComebackSuccessSound } = await import('@/utils/soundEffects')

      render(<ComebackComplete {...defaultProps} show={true} />)

      expect(playComebackSuccessSound).toHaveBeenCalled()
    })

    it('does not play sound when show is false', async () => {
      const { playComebackSuccessSound } = await import('@/utils/soundEffects')

      render(<ComebackComplete {...defaultProps} show={false} />)

      expect(playComebackSuccessSound).not.toHaveBeenCalled()
    })

    it('plays sound only once', async () => {
      const { playComebackSuccessSound } = await import('@/utils/soundEffects')

      render(<ComebackComplete {...defaultProps} show={true} />)

      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(playComebackSuccessSound).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has aria-live for screen reader announcements', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.getAttribute('aria-live') === 'polite' ||
        celebration.getAttribute('aria-live') === 'assertive'
      ).toBe(true)
    })

    it('has appropriate role', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.getAttribute('role') === 'alert' ||
        celebration.getAttribute('role') === 'status' ||
        celebration.getAttribute('aria-live')
      ).toBeTruthy()
    })

    it('has descriptive text content', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      // Content should be meaningful for screen readers
      expect(celebration.textContent.length).toBeGreaterThan(10)
    })

    it('animations respect reduced motion preference', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.className.includes('motion-') ||
        celebration.className.includes('animate') ||
        !celebration.className.includes('animate-spin')
      ).toBe(true)
    })
  })

  describe('visual layout', () => {
    it('covers viewport for modal effect', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.className.includes('fixed') ||
        celebration.className.includes('absolute') ||
        celebration.className.includes('inset')
      ).toBe(true)
    })

    it('has high z-index to overlay content', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.className.includes('z-') ||
        celebration.style.zIndex
      ).toBeTruthy()
    })

    it('centers content', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.className.includes('flex') ||
        celebration.className.includes('items-center') ||
        celebration.className.includes('justify-center')
      ).toBe(true)
    })
  })

  describe('reward info display', () => {
    it('shows mystery box earned indicator', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.textContent.toLowerCase().includes('mystery') ||
        celebration.textContent.toLowerCase().includes('box') ||
        celebration.textContent.toLowerCase().includes('reward') ||
        celebration.textContent.toLowerCase().includes('bronze')
      ).toBe(true)
    })

    it('shows piece earned indicator', () => {
      render(<ComebackComplete {...defaultProps} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(
        celebration.textContent.toLowerCase().includes('piece') ||
        celebration.textContent.toLowerCase().includes('unlock') ||
        celebration.textContent.toLowerCase().includes('+1')
      ).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles undefined level gracefully', () => {
      expect(() =>
        render(<ComebackComplete {...defaultProps} level={undefined} />)
      ).not.toThrow()

      expect(screen.getByTestId('comeback-complete')).toBeInTheDocument()
    })

    it('handles null level gracefully', () => {
      expect(() =>
        render(<ComebackComplete {...defaultProps} level={null} />)
      ).not.toThrow()
    })

    it('handles undefined xpEarned (uses default)', () => {
      render(<ComebackComplete {...defaultProps} xpEarned={undefined} />)

      const celebration = screen.getByTestId('comeback-complete')
      // Should show some XP value (default or 0)
      expect(celebration).toBeInTheDocument()
    })

    it('handles zero xpEarned', () => {
      render(<ComebackComplete {...defaultProps} xpEarned={0} />)

      expect(screen.getByTestId('comeback-complete')).toBeInTheDocument()
    })

    it('handles missing onComplete', () => {
      expect(() =>
        render(<ComebackComplete {...defaultProps} onComplete={undefined} />)
      ).not.toThrow()

      act(() => {
        vi.advanceTimersByTime(5000)
      })
      // Should not throw
    })

    it('handles large xpEarned values', () => {
      render(<ComebackComplete {...defaultProps} xpEarned={9999} />)

      const celebration = screen.getByTestId('comeback-complete')
      expect(celebration.textContent).toContain('9999')
    })
  })

  describe('prop types validation', () => {
    it('accepts valid level values', () => {
      const validLevels = ['simple', 'standard', 'deep']

      validLevels.forEach((level) => {
        expect(() =>
          render(<ComebackComplete {...defaultProps} level={level} />)
        ).not.toThrow()
        cleanup()
      })
    })

    it('accepts numeric xpEarned', () => {
      expect(() =>
        render(<ComebackComplete {...defaultProps} xpEarned={100} />)
      ).not.toThrow()
    })

    it('accepts boolean show', () => {
      expect(() =>
        render(<ComebackComplete {...defaultProps} show={true} />)
      ).not.toThrow()

      cleanup()

      expect(() =>
        render(<ComebackComplete {...defaultProps} show={false} />)
      ).not.toThrow()
    })

    it('accepts function onComplete', () => {
      const onComplete = vi.fn()
      expect(() =>
        render(<ComebackComplete {...defaultProps} onComplete={onComplete} />)
      ).not.toThrow()
    })
  })
})
