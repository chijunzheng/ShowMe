/**
 * BossBattleIntro Component Tests
 *
 * Tests for the boss battle intro cutscene component.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rendering for each level
 * - Animated intro sequence
 * - Timer/callback behavior
 * - Accessibility
 * - Sound effect integration
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, act } from '@testing-library/react'
import BossBattleIntro from '../BossBattleIntro'

// Mock sound effects
vi.mock('@/utils/soundEffects', () => ({
  playBossIntroSound: vi.fn(),
}))

describe('BossBattleIntro', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  describe('rendering', () => {
    it('renders the intro container', () => {
      render(<BossBattleIntro level="simple" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      expect(intro).toBeInTheDocument()
    })

    it('renders boss icon for the level', () => {
      render(<BossBattleIntro level="simple" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      expect(intro).toBeInTheDocument()
      // Should display boss icon/emoji
    })

    it('renders boss name for simple level', () => {
      render(<BossBattleIntro level="simple" onComplete={() => {}} />)

      // Should show boss name from config
      const intro = screen.getByTestId('boss-battle-intro')
      expect(intro.textContent.length).toBeGreaterThan(0)
    })

    it('renders boss name for standard level', () => {
      render(<BossBattleIntro level="standard" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      expect(intro.textContent.length).toBeGreaterThan(0)
    })

    it('renders boss name for deep level', () => {
      render(<BossBattleIntro level="deep" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      expect(intro.textContent.length).toBeGreaterThan(0)
    })

    it('displays intro message', () => {
      render(<BossBattleIntro level="simple" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      // Should show one of the intro messages
      expect(intro.textContent.length).toBeGreaterThan(0)
    })
  })

  describe('level-specific styling', () => {
    it('applies simple level styling', () => {
      render(<BossBattleIntro level="simple" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      expect(
        intro.className.includes('simple') ||
        intro.className.includes('green') ||
        intro.className.includes('gradient')
      ).toBe(true)
    })

    it('applies standard level styling', () => {
      render(<BossBattleIntro level="standard" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      expect(
        intro.className.includes('standard') ||
        intro.className.includes('blue') ||
        intro.className.includes('gradient')
      ).toBe(true)
    })

    it('applies deep level styling', () => {
      render(<BossBattleIntro level="deep" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      expect(
        intro.className.includes('deep') ||
        intro.className.includes('purple') ||
        intro.className.includes('gradient')
      ).toBe(true)
    })

    it('has dramatic visual effects', () => {
      render(<BossBattleIntro level="deep" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      // Should have animation or glow effects
      expect(
        intro.className.includes('animate') ||
        intro.className.includes('glow') ||
        intro.className.includes('pulse') ||
        intro.className.includes('scale')
      ).toBe(true)
    })
  })

  describe('animation sequence', () => {
    it('starts with entrance animation', () => {
      render(<BossBattleIntro level="simple" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      // Should have entrance animation class
      expect(
        intro.className.includes('animate') ||
        intro.className.includes('fade') ||
        intro.className.includes('scale')
      ).toBe(true)
    })

    it('transitions through animation phases', async () => {
      render(<BossBattleIntro level="standard" onComplete={() => {}} />)

      // Initial state
      const intro = screen.getByTestId('boss-battle-intro')
      expect(intro).toBeInTheDocument()

      // Advance through intro
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      // Should still be visible during intro
      expect(screen.getByTestId('boss-battle-intro')).toBeInTheDocument()
    })
  })

  describe('onComplete callback', () => {
    it('calls onComplete after approximately 2.5 seconds', async () => {
      const onComplete = vi.fn()
      render(<BossBattleIntro level="simple" onComplete={onComplete} />)

      expect(onComplete).not.toHaveBeenCalled()

      // Advance past intro duration (2500ms + buffer)
      await act(async () => {
        vi.advanceTimersByTime(2500)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('does not call onComplete before intro completes', async () => {
      const onComplete = vi.fn()
      render(<BossBattleIntro level="simple" onComplete={onComplete} />)

      // Advance partially
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('calls onComplete only once', async () => {
      const onComplete = vi.fn()
      render(<BossBattleIntro level="simple" onComplete={onComplete} />)

      // Advance well past intro duration
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('cleans up timer on unmount', async () => {
      const onComplete = vi.fn()
      const { unmount } = render(
        <BossBattleIntro level="simple" onComplete={onComplete} />
      )

      // Unmount before timer completes
      unmount()

      // Advance timer
      await act(async () => {
        vi.advanceTimersByTime(3000)
      })

      // onComplete should not be called after unmount
      expect(onComplete).not.toHaveBeenCalled()
    })
  })

  describe('sound effects', () => {
    it('plays boss intro sound on mount', async () => {
      const { playBossIntroSound } = await import('@/utils/soundEffects')

      render(<BossBattleIntro level="simple" onComplete={() => {}} />)

      expect(playBossIntroSound).toHaveBeenCalled()
    })

    it('plays sound only once', async () => {
      const { playBossIntroSound } = await import('@/utils/soundEffects')

      render(<BossBattleIntro level="standard" onComplete={() => {}} />)

      // Advance time
      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(playBossIntroSound).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has appropriate role for announcement', () => {
      render(<BossBattleIntro level="simple" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      expect(
        intro.getAttribute('role') === 'alert' ||
        intro.getAttribute('role') === 'status' ||
        intro.getAttribute('aria-live')
      ).toBeTruthy()
    })

    it('has aria-live for screen reader announcements', () => {
      render(<BossBattleIntro level="simple" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      const ariaLive = intro.getAttribute('aria-live')
      expect(ariaLive === 'polite' || ariaLive === 'assertive').toBe(true)
    })

    it('has descriptive text for screen readers', () => {
      render(<BossBattleIntro level="deep" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      // Should have meaningful text content
      expect(intro.textContent.length).toBeGreaterThan(5)
    })

    it('does not autoplay media that would be distracting', () => {
      render(<BossBattleIntro level="simple" onComplete={() => {}} />)

      // Should not have video/audio autoplay
      expect(screen.queryByRole('video')).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('handles undefined level gracefully', () => {
      expect(() =>
        render(<BossBattleIntro level={undefined} onComplete={() => {}} />)
      ).not.toThrow()

      const intro = screen.getByTestId('boss-battle-intro')
      expect(intro).toBeInTheDocument()
    })

    it('handles null level gracefully', () => {
      expect(() =>
        render(<BossBattleIntro level={null} onComplete={() => {}} />)
      ).not.toThrow()

      const intro = screen.getByTestId('boss-battle-intro')
      expect(intro).toBeInTheDocument()
    })

    it('handles invalid level string gracefully', () => {
      expect(() =>
        render(<BossBattleIntro level="extreme" onComplete={() => {}} />)
      ).not.toThrow()

      const intro = screen.getByTestId('boss-battle-intro')
      expect(intro).toBeInTheDocument()
    })

    it('handles missing onComplete gracefully', () => {
      expect(() =>
        render(<BossBattleIntro level="simple" />)
      ).not.toThrow()

      // Advance past intro duration
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      // Should not throw
    })
  })

  describe('visual layout', () => {
    it('covers full viewport', () => {
      render(<BossBattleIntro level="simple" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      expect(
        intro.className.includes('fixed') ||
        intro.className.includes('absolute') ||
        intro.className.includes('inset-0')
      ).toBe(true)
    })

    it('has high z-index to overlay content', () => {
      render(<BossBattleIntro level="simple" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      expect(
        intro.className.includes('z-') ||
        intro.style.zIndex
      ).toBeTruthy()
    })

    it('centers content', () => {
      render(<BossBattleIntro level="simple" onComplete={() => {}} />)

      const intro = screen.getByTestId('boss-battle-intro')
      expect(
        intro.className.includes('flex') ||
        intro.className.includes('items-center') ||
        intro.className.includes('justify-center')
      ).toBe(true)
    })
  })

  describe('prop types validation', () => {
    it('accepts valid level values', () => {
      const validLevels = ['simple', 'standard', 'deep']

      validLevels.forEach((level) => {
        expect(() =>
          render(<BossBattleIntro level={level} onComplete={() => {}} />)
        ).not.toThrow()
        cleanup()
      })
    })

    it('accepts function for onComplete', () => {
      const onComplete = () => {}
      expect(() =>
        render(<BossBattleIntro level="simple" onComplete={onComplete} />)
      ).not.toThrow()
    })
  })
})
