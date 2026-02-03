/**
 * StreakFlames Component Tests
 *
 * Tests for the streak flames celebration effect component.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rendering based on show prop
 * - Streak number display/thresholds
 * - Intensity levels (low, medium, high, inferno)
 * - Position prop (left, right, both)
 * - Animation effects
 * - Sound effect integration
 * - Accessibility
 * - Edge cases
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import StreakFlames from '../StreakFlames'

// Mock sound effects
vi.mock('@/utils/soundEffects', () => ({
  playStreakSound: vi.fn(),
}))

import { playStreakSound } from '@/utils/soundEffects'

describe('StreakFlames', () => {
  const defaultProps = {
    streak: 5,
    intensity: 'medium',
    show: true,
    position: 'both',
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
      render(<StreakFlames {...defaultProps} />)

      const flames = screen.getByTestId('streak-flames')
      expect(flames).toBeInTheDocument()
    })

    it('does not render when show is false', () => {
      render(<StreakFlames {...defaultProps} show={false} />)

      expect(screen.queryByTestId('streak-flames')).toBeNull()
    })

    it('renders flame elements', () => {
      render(<StreakFlames {...defaultProps} />)

      // Should have flame elements (visual indicators)
      const flameElements = screen.getAllByTestId(/flame/)
      expect(flameElements.length).toBeGreaterThan(0)
    })

    it('displays streak count', () => {
      render(<StreakFlames {...defaultProps} streak={7} />)

      const flames = screen.getByTestId('streak-flames')
      expect(flames.textContent).toContain('7')
    })
  })

  describe('intensity levels', () => {
    it('applies low intensity styling for streak 3', () => {
      render(<StreakFlames {...defaultProps} streak={3} intensity="low" />)

      const flames = screen.getByTestId('streak-flames')
      expect(
        flames.className.includes('low') ||
        flames.dataset.intensity === 'low' ||
        flames.getAttribute('data-intensity') === 'low'
      ).toBe(true)
    })

    it('applies medium intensity styling for streak 5', () => {
      render(<StreakFlames {...defaultProps} streak={5} intensity="medium" />)

      const flames = screen.getByTestId('streak-flames')
      expect(
        flames.className.includes('medium') ||
        flames.dataset.intensity === 'medium' ||
        flames.getAttribute('data-intensity') === 'medium'
      ).toBe(true)
    })

    it('applies high intensity styling for streak 7', () => {
      render(<StreakFlames {...defaultProps} streak={7} intensity="high" />)

      const flames = screen.getByTestId('streak-flames')
      expect(
        flames.className.includes('high') ||
        flames.dataset.intensity === 'high' ||
        flames.getAttribute('data-intensity') === 'high'
      ).toBe(true)
    })

    it('applies inferno intensity styling for streak 10', () => {
      render(<StreakFlames {...defaultProps} streak={10} intensity="inferno" />)

      const flames = screen.getByTestId('streak-flames')
      expect(
        flames.className.includes('inferno') ||
        flames.dataset.intensity === 'inferno' ||
        flames.getAttribute('data-intensity') === 'inferno'
      ).toBe(true)
    })

    it('increases visual intensity from low to inferno', () => {
      const { rerender } = render(
        <StreakFlames {...defaultProps} intensity="low" />
      )
      const lowFlames = screen.getByTestId('streak-flames')
      const lowClasses = lowFlames.className

      rerender(<StreakFlames {...defaultProps} intensity="inferno" />)
      const infernoFlames = screen.getByTestId('streak-flames')
      const infernoClasses = infernoFlames.className

      // Inferno should have different (more intense) styling
      expect(lowClasses).not.toBe(infernoClasses)
    })

    it('renders more flame particles at higher intensities', () => {
      const { rerender } = render(
        <StreakFlames {...defaultProps} intensity="low" />
      )
      const lowFlameCount = screen.getAllByTestId(/flame/).length

      rerender(<StreakFlames {...defaultProps} intensity="inferno" />)
      const infernoFlameCount = screen.getAllByTestId(/flame/).length

      // Inferno should have more flames (or at least not fewer)
      expect(infernoFlameCount).toBeGreaterThanOrEqual(lowFlameCount)
    })

    it('defaults to medium intensity when not provided', () => {
      render(<StreakFlames streak={5} show={true} position="both" />)

      const flames = screen.getByTestId('streak-flames')
      // Should render without error and have some styling
      expect(flames).toBeInTheDocument()
    })
  })

  describe('position prop', () => {
    it('renders flames on left side only when position is left', () => {
      render(<StreakFlames {...defaultProps} position="left" />)

      const flames = screen.getByTestId('streak-flames')
      expect(
        flames.className.includes('left') ||
        flames.dataset.position === 'left' ||
        flames.getAttribute('data-position') === 'left'
      ).toBe(true)
    })

    it('renders flames on right side only when position is right', () => {
      render(<StreakFlames {...defaultProps} position="right" />)

      const flames = screen.getByTestId('streak-flames')
      expect(
        flames.className.includes('right') ||
        flames.dataset.position === 'right' ||
        flames.getAttribute('data-position') === 'right'
      ).toBe(true)
    })

    it('renders flames on both sides when position is both', () => {
      render(<StreakFlames {...defaultProps} position="both" />)

      const flames = screen.getByTestId('streak-flames')
      expect(
        flames.className.includes('both') ||
        flames.dataset.position === 'both' ||
        flames.getAttribute('data-position') === 'both' ||
        // Or check for multiple flame containers
        flames.querySelectorAll('[class*="flame"]').length >= 2
      ).toBe(true)
    })

    it('defaults to both when position is not provided', () => {
      render(<StreakFlames streak={5} intensity="medium" show={true} />)

      const flames = screen.getByTestId('streak-flames')
      // Should render without error, defaulting to both
      expect(flames).toBeInTheDocument()
    })

    it('has different visual layouts for different positions', () => {
      const { rerender } = render(
        <StreakFlames {...defaultProps} position="left" />
      )
      const leftLayout = screen.getByTestId('streak-flames').className

      rerender(<StreakFlames {...defaultProps} position="right" />)
      const rightLayout = screen.getByTestId('streak-flames').className

      // Different positions should have different styling
      expect(leftLayout).not.toBe(rightLayout)
    })
  })

  describe('streak thresholds', () => {
    it('handles streak of exactly 3 (first milestone)', () => {
      render(<StreakFlames {...defaultProps} streak={3} intensity="low" />)

      const flames = screen.getByTestId('streak-flames')
      expect(flames.textContent).toContain('3')
    })

    it('handles streak of exactly 5 (second milestone)', () => {
      render(<StreakFlames {...defaultProps} streak={5} intensity="medium" />)

      const flames = screen.getByTestId('streak-flames')
      expect(flames.textContent).toContain('5')
    })

    it('handles streak of exactly 7 (third milestone)', () => {
      render(<StreakFlames {...defaultProps} streak={7} intensity="high" />)

      const flames = screen.getByTestId('streak-flames')
      expect(flames.textContent).toContain('7')
    })

    it('handles streak of exactly 10 (inferno milestone)', () => {
      render(<StreakFlames {...defaultProps} streak={10} intensity="inferno" />)

      const flames = screen.getByTestId('streak-flames')
      expect(flames.textContent).toContain('10')
    })

    it('handles streaks above 10', () => {
      render(<StreakFlames {...defaultProps} streak={15} intensity="inferno" />)

      const flames = screen.getByTestId('streak-flames')
      expect(flames.textContent).toContain('15')
    })
  })

  describe('animation effects', () => {
    it('has fire/flame animation classes', () => {
      render(<StreakFlames {...defaultProps} />)

      const flames = screen.getByTestId('streak-flames')
      // Should have animation classes for flame effect
      expect(
        flames.className.includes('animate') ||
        flames.className.includes('flame') ||
        flames.className.includes('fire') ||
        flames.querySelector('[class*="animate"]') !== null
      ).toBe(true)
    })

    it('has flickering or pulsing effect', () => {
      render(<StreakFlames {...defaultProps} />)

      const flameElements = screen.getAllByTestId(/flame/)
      const hasFlickerAnimation = flameElements.some(
        (el) =>
          el.className.includes('flicker') ||
          el.className.includes('pulse') ||
          el.className.includes('animate') ||
          el.className.includes('glow')
      )

      expect(hasFlickerAnimation).toBe(true)
    })

    it('renders with fire-colored styling (orange/red/yellow)', () => {
      render(<StreakFlames {...defaultProps} />)

      const flames = screen.getByTestId('streak-flames')
      // Should have fire colors in styling
      expect(
        flames.className.includes('orange') ||
        flames.className.includes('red') ||
        flames.className.includes('yellow') ||
        flames.className.includes('amber') ||
        flames.innerHTML.includes('orange') ||
        flames.innerHTML.includes('red') ||
        flames.innerHTML.includes('yellow')
      ).toBe(true)
    })
  })

  describe('sound effects', () => {
    it('plays streak sound when shown', () => {
      render(<StreakFlames {...defaultProps} />)

      expect(playStreakSound).toHaveBeenCalled()
    })

    it('does not play sound when show is false', () => {
      render(<StreakFlames {...defaultProps} show={false} />)

      expect(playStreakSound).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has appropriate ARIA attributes', () => {
      render(<StreakFlames {...defaultProps} />)

      const flames = screen.getByTestId('streak-flames')
      const isAccessible =
        flames.getAttribute('aria-hidden') === 'true' ||
        flames.getAttribute('role') === 'img' ||
        flames.getAttribute('role') === 'presentation' ||
        flames.getAttribute('aria-live') !== null

      expect(isAccessible).toBe(true)
    })

    it('has accessible description of streak', () => {
      render(<StreakFlames {...defaultProps} streak={5} />)

      const flames = screen.getByTestId('streak-flames')
      // Should have streak info available
      expect(
        flames.textContent.includes('5') ||
        flames.getAttribute('aria-label')?.includes('5') ||
        flames.getAttribute('aria-label')?.includes('streak')
      ).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles zero streak gracefully', () => {
      expect(() => {
        render(<StreakFlames {...defaultProps} streak={0} />)
      }).not.toThrow()
    })

    it('handles negative streak gracefully', () => {
      expect(() => {
        render(<StreakFlames {...defaultProps} streak={-1} />)
      }).not.toThrow()
    })

    it('handles very large streak numbers', () => {
      render(<StreakFlames {...defaultProps} streak={999} />)

      const flames = screen.getByTestId('streak-flames')
      expect(flames.textContent).toContain('999')
    })

    it('handles invalid intensity gracefully', () => {
      expect(() => {
        render(<StreakFlames {...defaultProps} intensity="invalid" />)
      }).not.toThrow()
    })

    it('handles invalid position gracefully', () => {
      expect(() => {
        render(<StreakFlames {...defaultProps} position="invalid" />)
      }).not.toThrow()
    })

    it('handles unmount cleanly', () => {
      const { unmount } = render(<StreakFlames {...defaultProps} />)

      expect(() => unmount()).not.toThrow()
    })

    it('handles rapid show/hide toggling', () => {
      const { rerender } = render(<StreakFlames {...defaultProps} show={true} />)

      // Toggle rapidly
      for (let i = 0; i < 5; i++) {
        rerender(<StreakFlames {...defaultProps} show={i % 2 === 0} />)
      }

      // Should not crash
      expect(true).toBe(true)
    })
  })

  describe('visual layout', () => {
    it('is positioned at screen edges', () => {
      render(<StreakFlames {...defaultProps} />)

      const flames = screen.getByTestId('streak-flames')
      // Should have fixed/absolute positioning
      expect(
        flames.className.includes('fixed') ||
        flames.className.includes('absolute') ||
        flames.className.includes('inset')
      ).toBe(true)
    })

    it('does not block user interaction', () => {
      render(<StreakFlames {...defaultProps} />)

      const flames = screen.getByTestId('streak-flames')
      // Should have pointer-events-none or similar
      expect(
        flames.className.includes('pointer-events-none') ||
        flames.style.pointerEvents === 'none' ||
        window.getComputedStyle(flames).pointerEvents === 'none'
      ).toBe(true)
    })
  })
})
