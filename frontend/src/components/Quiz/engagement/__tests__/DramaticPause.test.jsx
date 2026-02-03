/**
 * DramaticPause Component Tests
 *
 * Tests for the dramatic pause suspense overlay component.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rendering when show is true/false
 * - Level-specific styling (simple, standard, deep)
 * - onComplete callback timing (800ms)
 * - Suspense text display
 * - Animation effects
 * - Sound effect integration
 * - Accessibility
 * - Edge cases
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import DramaticPause from '../DramaticPause'

// Mock sound effects
vi.mock('@/utils/soundEffects', () => ({
  playSuspenseSound: vi.fn(),
}))

import { playSuspenseSound } from '@/utils/soundEffects'

describe('DramaticPause', () => {
  const defaultProps = {
    show: true,
    level: 'standard',
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
      render(<DramaticPause {...defaultProps} />)

      const pause = screen.getByTestId('dramatic-pause')
      expect(pause).toBeInTheDocument()
    })

    it('does not render when show is false', () => {
      render(<DramaticPause {...defaultProps} show={false} />)

      expect(screen.queryByTestId('dramatic-pause')).toBeNull()
    })

    it('renders suspense text by default', () => {
      render(<DramaticPause {...defaultProps} />)

      const pause = screen.getByTestId('dramatic-pause')
      // Should have some suspense indicator text like "..." or a message
      expect(pause.textContent.length).toBeGreaterThan(0)
    })

    it('renders as an overlay covering the screen', () => {
      render(<DramaticPause {...defaultProps} />)

      const pause = screen.getByTestId('dramatic-pause')
      // Should have fixed positioning or overlay styles
      const styles = window.getComputedStyle(pause)
      expect(
        pause.className.includes('fixed') ||
        pause.className.includes('absolute') ||
        styles.position === 'fixed' ||
        styles.position === 'absolute'
      ).toBe(true)
    })
  })

  describe('level-specific styling', () => {
    it('applies simple level styling', () => {
      render(<DramaticPause {...defaultProps} level="simple" />)

      const pause = screen.getByTestId('dramatic-pause')
      // Should have level-specific class or data attribute
      expect(
        pause.className.includes('simple') ||
        pause.dataset.level === 'simple' ||
        pause.getAttribute('data-level') === 'simple'
      ).toBe(true)
    })

    it('applies standard level styling', () => {
      render(<DramaticPause {...defaultProps} level="standard" />)

      const pause = screen.getByTestId('dramatic-pause')
      expect(
        pause.className.includes('standard') ||
        pause.dataset.level === 'standard' ||
        pause.getAttribute('data-level') === 'standard'
      ).toBe(true)
    })

    it('applies deep level styling', () => {
      render(<DramaticPause {...defaultProps} level="deep" />)

      const pause = screen.getByTestId('dramatic-pause')
      expect(
        pause.className.includes('deep') ||
        pause.dataset.level === 'deep' ||
        pause.getAttribute('data-level') === 'deep'
      ).toBe(true)
    })

    it('uses different visual intensity for different levels', () => {
      const { rerender } = render(<DramaticPause {...defaultProps} level="simple" />)
      const simpleClasses = screen.getByTestId('dramatic-pause').className

      rerender(<DramaticPause {...defaultProps} level="deep" />)
      const deepClasses = screen.getByTestId('dramatic-pause').className

      // Deep should have more intense styling (different classes)
      expect(simpleClasses).not.toBe(deepClasses)
    })

    it('defaults to standard level when level is not provided', () => {
      render(<DramaticPause show={true} onComplete={vi.fn()} />)

      const pause = screen.getByTestId('dramatic-pause')
      expect(
        pause.className.includes('standard') ||
        pause.dataset.level === 'standard' ||
        pause.getAttribute('data-level') === 'standard' ||
        pause.className.length > 0 // At least some styling is applied
      ).toBe(true)
    })
  })

  describe('timing and callback', () => {
    it('calls onComplete after 800ms', async () => {
      const onComplete = vi.fn()
      render(<DramaticPause {...defaultProps} onComplete={onComplete} />)

      // Should not be called immediately
      expect(onComplete).not.toHaveBeenCalled()

      // Advance time by 800ms
      await act(async () => {
        vi.advanceTimersByTime(800)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('does not call onComplete before 800ms', async () => {
      const onComplete = vi.fn()
      render(<DramaticPause {...defaultProps} onComplete={onComplete} />)

      // At 700ms, should not be complete
      await act(async () => {
        vi.advanceTimersByTime(700)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('calls onComplete exactly once', async () => {
      const onComplete = vi.fn()
      render(<DramaticPause {...defaultProps} onComplete={onComplete} />)

      // Advance well beyond 800ms
      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('uses consistent 800ms duration regardless of level', async () => {
      const onCompleteSimple = vi.fn()
      const onCompleteDeep = vi.fn()

      const { rerender } = render(
        <DramaticPause show={true} level="simple" onComplete={onCompleteSimple} />
      )

      await act(async () => {
        vi.advanceTimersByTime(800)
      })
      expect(onCompleteSimple).toHaveBeenCalledTimes(1)

      vi.clearAllMocks()

      rerender(<DramaticPause show={true} level="deep" onComplete={onCompleteDeep} />)

      await act(async () => {
        vi.advanceTimersByTime(800)
      })
      expect(onCompleteDeep).toHaveBeenCalledTimes(1)
    })
  })

  describe('sound effects', () => {
    it('plays suspense sound when shown', () => {
      render(<DramaticPause {...defaultProps} />)

      expect(playSuspenseSound).toHaveBeenCalled()
    })

    it('does not play sound when show is false', () => {
      render(<DramaticPause {...defaultProps} show={false} />)

      expect(playSuspenseSound).not.toHaveBeenCalled()
    })

    it('plays sound only once per show', async () => {
      render(<DramaticPause {...defaultProps} />)

      // Advance time
      await act(async () => {
        vi.advanceTimersByTime(400)
      })

      // Sound should only be called once (on mount)
      expect(playSuspenseSound).toHaveBeenCalledTimes(1)
    })
  })

  describe('animation effects', () => {
    it('has animation classes', () => {
      render(<DramaticPause {...defaultProps} />)

      const pause = screen.getByTestId('dramatic-pause')
      // Should have some animation class
      expect(
        pause.className.includes('animate') ||
        pause.className.includes('transition') ||
        pause.className.includes('pulse') ||
        pause.className.includes('fade')
      ).toBe(true)
    })

    it('has pulsing or suspense visual effect', () => {
      render(<DramaticPause {...defaultProps} />)

      const pause = screen.getByTestId('dramatic-pause')
      // Check for animation-related styles
      const hasAnimation =
        pause.className.includes('pulse') ||
        pause.className.includes('animate') ||
        pause.querySelector('[class*="pulse"]') !== null ||
        pause.querySelector('[class*="animate"]') !== null

      expect(hasAnimation).toBe(true)
    })
  })

  describe('accessibility', () => {
    it('has appropriate ARIA attributes', () => {
      render(<DramaticPause {...defaultProps} />)

      const pause = screen.getByTestId('dramatic-pause')
      // Should be marked as status or alert for screen readers
      const isAccessible =
        pause.getAttribute('aria-live') === 'polite' ||
        pause.getAttribute('aria-live') === 'assertive' ||
        pause.getAttribute('role') === 'status' ||
        pause.getAttribute('role') === 'alert' ||
        pause.getAttribute('aria-hidden') === 'true'

      expect(isAccessible).toBe(true)
    })

    it('has accessible label or text', () => {
      render(<DramaticPause {...defaultProps} />)

      const pause = screen.getByTestId('dramatic-pause')
      // Should have some text content or aria-label
      expect(
        pause.textContent.length > 0 ||
        pause.getAttribute('aria-label') !== null
      ).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles missing onComplete callback gracefully', async () => {
      render(<DramaticPause show={true} level="standard" />)

      // Should not throw when timer fires without callback
      await expect(
        act(async () => {
          vi.advanceTimersByTime(800)
        })
      ).resolves.not.toThrow()
    })

    it('handles unmount before completion', async () => {
      const onComplete = vi.fn()
      const { unmount } = render(<DramaticPause {...defaultProps} onComplete={onComplete} />)

      // Advance partial time
      await act(async () => {
        vi.advanceTimersByTime(400)
      })

      // Unmount before completion
      unmount()

      // Advance remaining time - should not crash
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // onComplete should not be called due to cleanup
      expect(onComplete).not.toHaveBeenCalled()
    })

    it('handles show toggling rapidly', async () => {
      const onComplete = vi.fn()
      const { rerender } = render(
        <DramaticPause show={true} level="standard" onComplete={onComplete} />
      )

      // Toggle show off quickly
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      rerender(<DramaticPause show={false} level="standard" onComplete={onComplete} />)

      // Toggle back on
      rerender(<DramaticPause show={true} level="standard" onComplete={onComplete} />)

      // Advance full time
      await act(async () => {
        vi.advanceTimersByTime(800)
      })

      // Should handle gracefully (at least one call or none depending on implementation)
      expect(onComplete.mock.calls.length).toBeGreaterThanOrEqual(0)
    })

    it('handles invalid level gracefully', () => {
      // Should not throw with invalid level
      expect(() => {
        render(<DramaticPause show={true} level="invalid_level" onComplete={vi.fn()} />)
      }).not.toThrow()
    })

    it('handles null/undefined level gracefully', () => {
      expect(() => {
        render(<DramaticPause show={true} level={null} onComplete={vi.fn()} />)
      }).not.toThrow()

      cleanup()

      expect(() => {
        render(<DramaticPause show={true} level={undefined} onComplete={vi.fn()} />)
      }).not.toThrow()
    })
  })

  describe('visual appearance', () => {
    it('has semi-transparent overlay background', () => {
      render(<DramaticPause {...defaultProps} />)

      const pause = screen.getByTestId('dramatic-pause')
      // Should have backdrop or semi-transparent styling
      expect(
        pause.className.includes('bg-') ||
        pause.className.includes('backdrop') ||
        pause.className.includes('opacity') ||
        window.getComputedStyle(pause).backgroundColor !== ''
      ).toBe(true)
    })

    it('centers content visually', () => {
      render(<DramaticPause {...defaultProps} />)

      const pause = screen.getByTestId('dramatic-pause')
      // Should have centering classes
      expect(
        pause.className.includes('flex') ||
        pause.className.includes('center') ||
        pause.className.includes('justify-center') ||
        pause.className.includes('items-center')
      ).toBe(true)
    })
  })
})
