/**
 * MicroCelebration Component Tests
 *
 * Tests for the micro-celebration overlay component used in quiz gamification.
 * Uses @testing-library/react for component testing.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import MicroCelebration from './MicroCelebration'

describe('MicroCelebration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  describe('rendering', () => {
    it('renders nothing when isActive is false', () => {
      const { container } = render(
        <MicroCelebration isActive={false} xpGained={10} streak={1} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders celebration overlay when isActive is true', () => {
      render(<MicroCelebration isActive={true} xpGained={10} streak={1} />)

      const celebration = screen.getByTestId('micro-celebration')
      expect(celebration).toBeTruthy()
    })

    it('displays XP gained with plus sign', () => {
      render(<MicroCelebration isActive={true} xpGained={25} streak={1} />)

      const xpText = screen.getByTestId('xp-text')
      expect(xpText.textContent).toContain('+25')
      expect(xpText.textContent).toContain('XP')
    })

    it('displays different XP values correctly', () => {
      render(<MicroCelebration isActive={true} xpGained={50} streak={1} />)

      const xpText = screen.getByTestId('xp-text')
      expect(xpText.textContent).toContain('+50')
    })
  })

  describe('encouraging messages', () => {
    it('displays an encouraging message', () => {
      render(<MicroCelebration isActive={true} xpGained={10} streak={1} />)

      const celebration = screen.getByTestId('micro-celebration')
      const messageRegex = /Great!|Nice!|Awesome!|Yes!|Perfect!/

      expect(celebration.textContent).toMatch(messageRegex)
    })

    it('selects from valid message options', () => {
      render(<MicroCelebration isActive={true} xpGained={10} streak={1} />)

      const validMessages = ['Great!', 'Nice!', 'Awesome!', 'Yes!', 'Perfect!']
      const celebration = screen.getByTestId('micro-celebration')
      const hasValidMessage = validMessages.some((msg) =>
        celebration.textContent.includes(msg)
      )

      expect(hasValidMessage).toBe(true)
    })
  })

  describe('particle effects', () => {
    it('renders mini particle burst elements', () => {
      render(<MicroCelebration isActive={true} xpGained={10} streak={1} />)

      const particles = screen.getAllByTestId('particle')
      // Should have 6-10 particles as per spec
      expect(particles.length).toBeGreaterThanOrEqual(6)
      expect(particles.length).toBeLessThanOrEqual(10)
    })

    it('particles have styles applied', () => {
      render(<MicroCelebration isActive={true} xpGained={10} streak={1} />)

      const particles = screen.getAllByTestId('particle')
      particles.forEach((particle) => {
        expect(particle.style.left).toBeTruthy()
        expect(particle.style.top).toBeTruthy()
        expect(particle.style.backgroundColor).toBeTruthy()
      })
    })
  })

  describe('animation and timing', () => {
    it('has animation class on XP text', () => {
      render(<MicroCelebration isActive={true} xpGained={10} streak={1} />)

      const xpText = screen.getByTestId('xp-text')
      expect(xpText.className).toContain('animate')
    })

    it('calls onComplete callback after 800ms', async () => {
      const onComplete = vi.fn()
      render(
        <MicroCelebration
          isActive={true}
          xpGained={10}
          streak={1}
          onComplete={onComplete}
        />
      )

      // Should not be called immediately
      expect(onComplete).not.toHaveBeenCalled()

      // Advance time by 800ms
      await act(async () => {
        vi.advanceTimersByTime(800)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('duration is approximately 800ms', async () => {
      const onComplete = vi.fn()
      render(
        <MicroCelebration
          isActive={true}
          xpGained={10}
          streak={1}
          onComplete={onComplete}
        />
      )

      // At 700ms, should not be complete
      await act(async () => {
        vi.advanceTimersByTime(700)
      })
      expect(onComplete).not.toHaveBeenCalled()

      // At 800ms, should be complete
      await act(async () => {
        vi.advanceTimersByTime(100)
      })
      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has appropriate ARIA attributes', () => {
      render(<MicroCelebration isActive={true} xpGained={10} streak={1} />)

      const celebration = screen.getByTestId('micro-celebration')
      // Should be marked as decorative or status
      const isAccessible =
        celebration.getAttribute('aria-hidden') === 'true' ||
        celebration.getAttribute('role') === 'status'
      expect(isAccessible).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles zero XP gracefully', () => {
      render(<MicroCelebration isActive={true} xpGained={0} streak={1} />)

      const xpText = screen.getByTestId('xp-text')
      expect(xpText.textContent).toContain('+0')
    })

    it('handles missing onComplete callback', async () => {
      render(<MicroCelebration isActive={true} xpGained={10} streak={1} />)

      // Should not throw when timer fires without callback
      await expect(
        act(async () => {
          vi.advanceTimersByTime(800)
        })
      ).resolves.not.toThrow()
    })

    it('handles unmount before completion', async () => {
      const onComplete = vi.fn()
      const { unmount } = render(
        <MicroCelebration
          isActive={true}
          xpGained={10}
          streak={1}
          onComplete={onComplete}
        />
      )

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

    it('handles default props', () => {
      render(<MicroCelebration isActive={true} />)

      // Should render with defaults (xpGained=10, streak=1)
      const xpText = screen.getByTestId('xp-text')
      expect(xpText.textContent).toContain('+10')
    })
  })
})
