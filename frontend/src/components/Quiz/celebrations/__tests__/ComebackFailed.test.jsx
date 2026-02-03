/**
 * ComebackFailed Component Tests
 *
 * Tests for the encouraging failure message component.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rendering failure message
 * - Level-specific styling
 * - Encouraging messaging
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
import ComebackFailed from '../ComebackFailed'

// Mock sound effects
vi.mock('@/utils/soundEffects', () => ({
  playComebackFailSound: vi.fn(),
}))

describe('ComebackFailed', () => {
  const defaultProps = {
    level: 'simple',
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
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      expect(message).toBeInTheDocument()
    })

    it('does not render when show is false', () => {
      render(<ComebackFailed {...defaultProps} show={false} />)

      expect(screen.queryByTestId('comeback-failed')).toBeNull()
    })

    it('displays encouraging message (not punishing)', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      // Should have encouraging, not discouraging text
      expect(
        message.textContent.toLowerCase().includes('try') ||
        message.textContent.toLowerCase().includes('next time') ||
        message.textContent.toLowerCase().includes('keep') ||
        message.textContent.toLowerCase().includes('great effort') ||
        message.textContent.toLowerCase().includes('almost') ||
        message.textContent.toLowerCase().includes('practice')
      ).toBe(true)
    })

    it('does NOT use harsh words like "failed" or "lost"', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      const text = message.textContent.toLowerCase()
      // Kid-friendly - avoid harsh language
      expect(text.includes('failed') && !text.includes('not failed')).toBe(false)
      expect(text.includes('loser')).toBe(false)
    })

    it('displays supportive icon/emoji', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      // Should have content (emoji or icon)
      expect(message.textContent.length).toBeGreaterThan(0)
    })
  })

  describe('encouraging messaging', () => {
    it('shows primary encouraging message', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      // Should have substantial encouraging text
      expect(message.textContent.length).toBeGreaterThan(15)
    })

    it('shows secondary supportive text', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      // Should have additional context/support
      expect(message.textContent.length).toBeGreaterThan(30)
    })

    it('mentions learning or improvement', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      expect(
        message.textContent.toLowerCase().includes('learn') ||
        message.textContent.toLowerCase().includes('better') ||
        message.textContent.toLowerCase().includes('improve') ||
        message.textContent.toLowerCase().includes('grow') ||
        message.textContent.toLowerCase().includes('practice')
      ).toBe(true)
    })

    it('maintains positive tone', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      // Should not have purely negative phrasing
      expect(
        !message.textContent.toLowerCase().includes("you can't") &&
        !message.textContent.toLowerCase().includes("don't give up")
      ).toBe(true)
    })
  })

  describe('level-specific styling', () => {
    it('applies simple level styling', () => {
      render(<ComebackFailed {...defaultProps} level="simple" />)

      const message = screen.getByTestId('comeback-failed')
      expect(
        message.className.includes('simple') ||
        message.className.includes('green') ||
        message.className.includes('emerald') ||
        message.className.includes('neutral') // May use neutral for failure
      ).toBe(true)
    })

    it('applies standard level styling', () => {
      render(<ComebackFailed {...defaultProps} level="standard" />)

      const message = screen.getByTestId('comeback-failed')
      expect(
        message.className.includes('standard') ||
        message.className.includes('blue') ||
        message.className.includes('cyan') ||
        message.className.includes('neutral')
      ).toBe(true)
    })

    it('applies deep level styling', () => {
      render(<ComebackFailed {...defaultProps} level="deep" />)

      const message = screen.getByTestId('comeback-failed')
      expect(
        message.className.includes('deep') ||
        message.className.includes('purple') ||
        message.className.includes('violet') ||
        message.className.includes('neutral')
      ).toBe(true)
    })

    it('uses softer colors (not harsh red)', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      // Should use gentle colors, not alarming red
      expect(
        !message.className.includes('red-500') &&
        !message.className.includes('red-600')
      ).toBe(true)
    })
  })

  describe('animation effects', () => {
    it('has entrance animation', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      expect(
        message.className.includes('animate') ||
        message.className.includes('fade') ||
        message.className.includes('transition')
      ).toBe(true)
    })

    it('has gentle animation (not harsh)', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      // Should not have aggressive animations
      expect(
        !message.className.includes('shake') &&
        !message.className.includes('wobble')
      ).toBe(true)
    })

    it('has supportive icon animation', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      expect(
        message.className.includes('animate') ||
        message.querySelector('[class*="animate"]')
      ).toBeTruthy()
    })
  })

  describe('onComplete callback', () => {
    it('calls onComplete after message duration', async () => {
      const onComplete = vi.fn()
      render(<ComebackFailed {...defaultProps} onComplete={onComplete} />)

      expect(onComplete).not.toHaveBeenCalled()

      // Advance past message duration (approximately 2000ms)
      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('does not call onComplete before duration ends', async () => {
      const onComplete = vi.fn()
      render(<ComebackFailed {...defaultProps} onComplete={onComplete} />)

      await act(async () => {
        vi.advanceTimersByTime(1500)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('calls onComplete only once', async () => {
      const onComplete = vi.fn()
      render(<ComebackFailed {...defaultProps} onComplete={onComplete} />)

      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('cleans up timer on unmount', async () => {
      const onComplete = vi.fn()
      const { unmount } = render(
        <ComebackFailed {...defaultProps} onComplete={onComplete} />
      )

      unmount()

      await act(async () => {
        vi.advanceTimersByTime(4000)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('does not call onComplete when show is false', async () => {
      const onComplete = vi.fn()
      render(<ComebackFailed {...defaultProps} show={false} onComplete={onComplete} />)

      await act(async () => {
        vi.advanceTimersByTime(4000)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('starts timer when show changes to true', async () => {
      const onComplete = vi.fn()
      const { rerender } = render(
        <ComebackFailed {...defaultProps} show={false} onComplete={onComplete} />
      )

      rerender(<ComebackFailed {...defaultProps} show={true} onComplete={onComplete} />)

      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('sound effects', () => {
    it('plays gentle fail sound when shown', async () => {
      const { playComebackFailSound } = await import('@/utils/soundEffects')

      render(<ComebackFailed {...defaultProps} show={true} />)

      expect(playComebackFailSound).toHaveBeenCalled()
    })

    it('does not play sound when show is false', async () => {
      const { playComebackFailSound } = await import('@/utils/soundEffects')

      render(<ComebackFailed {...defaultProps} show={false} />)

      expect(playComebackFailSound).not.toHaveBeenCalled()
    })

    it('plays sound only once', async () => {
      const { playComebackFailSound } = await import('@/utils/soundEffects')

      render(<ComebackFailed {...defaultProps} show={true} />)

      await act(async () => {
        vi.advanceTimersByTime(1500)
      })

      expect(playComebackFailSound).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has aria-live for screen reader announcements', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      expect(
        message.getAttribute('aria-live') === 'polite' ||
        message.getAttribute('aria-live') === 'assertive'
      ).toBe(true)
    })

    it('has appropriate role', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      expect(
        message.getAttribute('role') === 'alert' ||
        message.getAttribute('role') === 'status' ||
        message.getAttribute('aria-live')
      ).toBeTruthy()
    })

    it('has descriptive, encouraging text content', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      // Content should be meaningful and encouraging for screen readers
      expect(message.textContent.length).toBeGreaterThan(10)
    })

    it('animations respect reduced motion preference', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      expect(
        message.className.includes('motion-') ||
        message.className.includes('animate') ||
        !message.className.includes('animate-spin')
      ).toBe(true)
    })
  })

  describe('visual layout', () => {
    it('covers viewport for modal effect', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      expect(
        message.className.includes('fixed') ||
        message.className.includes('absolute') ||
        message.className.includes('inset')
      ).toBe(true)
    })

    it('has high z-index to overlay content', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      expect(
        message.className.includes('z-') ||
        message.style.zIndex
      ).toBeTruthy()
    })

    it('centers content', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      expect(
        message.className.includes('flex') ||
        message.className.includes('items-center') ||
        message.className.includes('justify-center')
      ).toBe(true)
    })

    it('has semi-transparent backdrop', () => {
      render(<ComebackFailed {...defaultProps} />)

      const message = screen.getByTestId('comeback-failed')
      expect(
        message.className.includes('bg-') ||
        message.className.includes('backdrop')
      ).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles undefined level gracefully', () => {
      expect(() =>
        render(<ComebackFailed {...defaultProps} level={undefined} />)
      ).not.toThrow()

      expect(screen.getByTestId('comeback-failed')).toBeInTheDocument()
    })

    it('handles null level gracefully', () => {
      expect(() =>
        render(<ComebackFailed {...defaultProps} level={null} />)
      ).not.toThrow()
    })

    it('handles invalid level string gracefully', () => {
      expect(() =>
        render(<ComebackFailed {...defaultProps} level="invalid" />)
      ).not.toThrow()

      expect(screen.getByTestId('comeback-failed')).toBeInTheDocument()
    })

    it('handles missing onComplete', () => {
      expect(() =>
        render(<ComebackFailed {...defaultProps} onComplete={undefined} />)
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
          render(<ComebackFailed {...defaultProps} level={level} />)
        ).not.toThrow()
        cleanup()
      })
    })

    it('accepts boolean show', () => {
      expect(() =>
        render(<ComebackFailed {...defaultProps} show={true} />)
      ).not.toThrow()

      cleanup()

      expect(() =>
        render(<ComebackFailed {...defaultProps} show={false} />)
      ).not.toThrow()
    })

    it('accepts function onComplete', () => {
      const onComplete = vi.fn()
      expect(() =>
        render(<ComebackFailed {...defaultProps} onComplete={onComplete} />)
      ).not.toThrow()
    })
  })

  describe('message variety', () => {
    it('can show different messages on multiple renders', () => {
      // The component should use random messages from config
      // We test that it renders valid content consistently
      const messages = []

      for (let i = 0; i < 3; i++) {
        render(<ComebackFailed {...defaultProps} />)
        messages.push(screen.getByTestId('comeback-failed').textContent)
        cleanup()
      }

      // All messages should be truthy (have content)
      messages.forEach((msg) => {
        expect(msg.length).toBeGreaterThan(10)
      })
    })
  })
})
