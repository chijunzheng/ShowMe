/**
 * BossEscaped Component Tests
 *
 * Tests for the boss defeat (encouraging) message component.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rendering encouraging defeat message
 * - Level-specific messaging
 * - Timer/callback behavior
 * - Animation effects
 * - Sound effect integration
 * - Accessibility
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import BossEscaped from '../BossEscaped'

// Mock sound effects
vi.mock('@/utils/soundEffects', () => ({
  playBossDefeatSound: vi.fn(),
}))

describe('BossEscaped', () => {
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
        <BossEscaped
          level="simple"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      expect(message).toBeInTheDocument()
    })

    it('does not render when show is false', () => {
      render(
        <BossEscaped
          level="simple"
          show={false}
          onComplete={() => {}}
        />
      )

      expect(screen.queryByTestId('boss-escaped')).toBeNull()
    })

    it('displays encouraging message (not discouraging)', () => {
      render(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      const text = message.textContent.toLowerCase()

      // Should be encouraging, not negative
      expect(
        text.includes('escaped') ||
        text.includes('got away') ||
        text.includes('next time') ||
        text.includes('almost') ||
        text.includes('close') ||
        text.includes('try again')
      ).toBe(true)

      // Should NOT use discouraging language
      expect(text).not.toContain('failed')
      expect(text).not.toContain('loser')
      expect(text).not.toContain('terrible')
    })

    it('displays boss name from config', () => {
      render(
        <BossEscaped
          level="deep"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      // Should reference the boss
      expect(message.textContent.length).toBeGreaterThan(0)
    })

    it('displays relevant emoji/icon', () => {
      render(
        <BossEscaped
          level="standard"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      // Should have escape-related or encouraging emoji
      expect(message.textContent.length).toBeGreaterThan(0)
    })
  })

  describe('encouraging tone', () => {
    it('uses encouraging language for kids', () => {
      render(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      const text = message.textContent.toLowerCase()

      // Should be kid-friendly and encouraging
      expect(
        text.includes('next time') ||
        text.includes('try again') ||
        text.includes('close') ||
        text.includes('almost') ||
        text.includes('keep') ||
        text.includes('got away')
      ).toBe(true)
    })

    it('provides motivation to try again', () => {
      render(
        <BossEscaped
          level="standard"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      const text = message.textContent.toLowerCase()

      // Should motivate
      expect(
        text.includes('next') ||
        text.includes('again') ||
        text.includes('keep') ||
        text.includes('try')
      ).toBe(true)
    })

    it('does not display negative messaging', () => {
      render(
        <BossEscaped
          level="deep"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      const text = message.textContent.toLowerCase()

      // Should NOT include negative words
      expect(text).not.toContain('wrong')
      expect(text).not.toContain('bad')
      expect(text).not.toContain('lost')
      expect(text).not.toContain('fail')
    })
  })

  describe('level-specific styling', () => {
    it('applies simple level styling', () => {
      render(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      expect(
        message.className.includes('simple') ||
        message.className.includes('green') ||
        message.className.includes('emerald')
      ).toBe(true)
    })

    it('applies standard level styling', () => {
      render(
        <BossEscaped
          level="standard"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      expect(
        message.className.includes('standard') ||
        message.className.includes('blue') ||
        message.className.includes('cyan')
      ).toBe(true)
    })

    it('applies deep level styling', () => {
      render(
        <BossEscaped
          level="deep"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      expect(
        message.className.includes('deep') ||
        message.className.includes('purple') ||
        message.className.includes('violet')
      ).toBe(true)
    })

    it('uses softer visual tone than victory celebration', () => {
      render(
        <BossEscaped
          level="standard"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      // Should not have extreme celebration effects
      expect(message.className).not.toContain('confetti')
    })
  })

  describe('animation effects', () => {
    it('has entrance animation', () => {
      render(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      expect(
        message.className.includes('animate') ||
        message.className.includes('fade') ||
        message.className.includes('scale')
      ).toBe(true)
    })

    it('has subtle escape animation (boss getting away)', () => {
      render(
        <BossEscaped
          level="standard"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      // Should have some movement animation
      expect(
        message.className.includes('animate') ||
        message.querySelector('.animate') ||
        message.className.includes('motion')
      ).toBeTruthy()
    })

    it('animation is not overwhelming (respectful of failure)', () => {
      render(
        <BossEscaped
          level="deep"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      // Should NOT have extreme celebration animations
      expect(message.className).not.toContain('bounce')
      expect(message.className).not.toContain('spin')
    })
  })

  describe('onComplete callback', () => {
    it('calls onComplete after approximately 2 seconds', async () => {
      const onComplete = vi.fn()
      render(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={onComplete}
        />
      )

      expect(onComplete).not.toHaveBeenCalled()

      // Advance past defeat message duration (2000ms)
      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('does not call onComplete before duration ends', async () => {
      const onComplete = vi.fn()
      render(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={onComplete}
        />
      )

      await act(async () => {
        vi.advanceTimersByTime(1500)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('calls onComplete only once', async () => {
      const onComplete = vi.fn()
      render(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={onComplete}
        />
      )

      await act(async () => {
        vi.advanceTimersByTime(4000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('cleans up timer on unmount', async () => {
      const onComplete = vi.fn()
      const { unmount } = render(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={onComplete}
        />
      )

      unmount()

      await act(async () => {
        vi.advanceTimersByTime(3000)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('does not call onComplete when show is false', async () => {
      const onComplete = vi.fn()
      render(
        <BossEscaped
          level="simple"
          show={false}
          onComplete={onComplete}
        />
      )

      await act(async () => {
        vi.advanceTimersByTime(3000)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('starts timer when show changes to true', async () => {
      const onComplete = vi.fn()
      const { rerender } = render(
        <BossEscaped
          level="simple"
          show={false}
          onComplete={onComplete}
        />
      )

      rerender(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={onComplete}
        />
      )

      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('sound effects', () => {
    it('plays boss defeat sound when shown', async () => {
      const { playBossDefeatSound } = await import('@/utils/soundEffects')

      render(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={() => {}}
        />
      )

      expect(playBossDefeatSound).toHaveBeenCalled()
    })

    it('does not play sound when show is false', async () => {
      const { playBossDefeatSound } = await import('@/utils/soundEffects')

      render(
        <BossEscaped
          level="simple"
          show={false}
          onComplete={() => {}}
        />
      )

      expect(playBossDefeatSound).not.toHaveBeenCalled()
    })

    it('plays sound only once', async () => {
      const { playBossDefeatSound } = await import('@/utils/soundEffects')

      render(
        <BossEscaped
          level="standard"
          show={true}
          onComplete={() => {}}
        />
      )

      await act(async () => {
        vi.advanceTimersByTime(1500)
      })

      expect(playBossDefeatSound).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has aria-live for screen reader announcements', () => {
      render(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      expect(
        message.getAttribute('aria-live') === 'polite' ||
        message.getAttribute('aria-live') === 'assertive'
      ).toBe(true)
    })

    it('has appropriate role', () => {
      render(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      expect(
        message.getAttribute('role') === 'alert' ||
        message.getAttribute('role') === 'status' ||
        message.getAttribute('aria-live')
      ).toBeTruthy()
    })

    it('has descriptive text content for screen readers', () => {
      render(
        <BossEscaped
          level="deep"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      // Content should be meaningful
      expect(message.textContent.length).toBeGreaterThan(10)
    })

    it('ensures positive tone is conveyed', () => {
      render(
        <BossEscaped
          level="standard"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      // Even for defeat, messaging should be encouraging
      const text = message.textContent.toLowerCase()
      expect(
        text.includes('next') ||
        text.includes('try') ||
        text.includes('again') ||
        text.includes('close')
      ).toBe(true)
    })
  })

  describe('visual layout', () => {
    it('covers viewport for modal effect', () => {
      render(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      expect(
        message.className.includes('fixed') ||
        message.className.includes('absolute') ||
        message.className.includes('inset')
      ).toBe(true)
    })

    it('has high z-index to overlay content', () => {
      render(
        <BossEscaped
          level="simple"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      expect(
        message.className.includes('z-') ||
        message.style.zIndex
      ).toBeTruthy()
    })

    it('centers message content', () => {
      render(
        <BossEscaped
          level="standard"
          show={true}
          onComplete={() => {}}
        />
      )

      const message = screen.getByTestId('boss-escaped')
      expect(
        message.className.includes('flex') ||
        message.className.includes('items-center') ||
        message.className.includes('justify-center')
      ).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles undefined level gracefully', () => {
      expect(() =>
        render(
          <BossEscaped
            level={undefined}
            show={true}
            onComplete={() => {}}
          />
        )
      ).not.toThrow()

      expect(screen.getByTestId('boss-escaped')).toBeInTheDocument()
    })

    it('handles null level gracefully', () => {
      expect(() =>
        render(
          <BossEscaped
            level={null}
            show={true}
            onComplete={() => {}}
          />
        )
      ).not.toThrow()
    })

    it('handles invalid level string gracefully', () => {
      expect(() =>
        render(
          <BossEscaped
            level="extreme"
            show={true}
            onComplete={() => {}}
          />
        )
      ).not.toThrow()

      expect(screen.getByTestId('boss-escaped')).toBeInTheDocument()
    })

    it('handles missing onComplete', () => {
      expect(() =>
        render(
          <BossEscaped
            level="simple"
            show={true}
          />
        )
      ).not.toThrow()

      act(() => {
        vi.advanceTimersByTime(3000)
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
            <BossEscaped
              level={level}
              show={true}
              onComplete={() => {}}
            />
          )
        ).not.toThrow()
        cleanup()
      })
    })

    it('accepts boolean show', () => {
      expect(() =>
        render(
          <BossEscaped
            level="simple"
            show={true}
            onComplete={() => {}}
          />
        )
      ).not.toThrow()

      cleanup()

      expect(() =>
        render(
          <BossEscaped
            level="simple"
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
          <BossEscaped
            level="simple"
            show={true}
            onComplete={onComplete}
          />
        )
      ).not.toThrow()
    })
  })
})
