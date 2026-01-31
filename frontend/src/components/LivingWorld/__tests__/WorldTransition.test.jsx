/**
 * WorldTransition Component Tests
 *
 * Tests for the WorldTransition component that handles smooth visual transitions
 * when the world evolves between states.
 *
 * TDD: These tests are written FIRST, before implementation.
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import WorldTransition from '../WorldTransition'

// Mock matchMedia for prefers-reduced-motion tests
const mockMatchMedia = (matches) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('WorldTransition', () => {
  beforeEach(() => {
    // Default: no reduced motion
    mockMatchMedia(false)
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('basic rendering', () => {
    it('renders both images when transitioning', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
        />
      )

      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(2)
      expect(images[0]).toHaveAttribute('src', 'https://example.com/old-world.png')
      expect(images[1]).toHaveAttribute('src', 'https://example.com/new-world.png')
    })

    it('shows only newImage when not transitioning', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={false}
          onTransitionComplete={() => {}}
        />
      )

      const images = screen.getAllByRole('img')
      // Should only show the new image
      expect(images).toHaveLength(1)
      expect(images[0]).toHaveAttribute('src', 'https://example.com/new-world.png')
    })

    it('maintains 16:9 aspect ratio container', () => {
      render(
        <WorldTransition
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={false}
          onTransitionComplete={() => {}}
        />
      )

      const container = screen.getByTestId('world-transition-container')
      expect(container.className).toMatch(/aspect-video|aspect-\[16\/9\]/)
    })

    it('has proper accessibility attributes', () => {
      render(
        <WorldTransition
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={false}
          onTransitionComplete={() => {}}
        />
      )

      const images = screen.getAllByRole('img')
      images.forEach((img) => {
        expect(img).toHaveAttribute('alt')
        expect(img.getAttribute('alt')).toBeTruthy()
      })
    })
  })

  describe('transition callback', () => {
    it('calls onTransitionComplete after transition duration for crossfade', async () => {
      const onComplete = vi.fn()

      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={onComplete}
          transitionType="crossfade"
        />
      )

      expect(onComplete).not.toHaveBeenCalled()

      // Crossfade is 1.5s = 1500ms
      act(() => {
        vi.advanceTimersByTime(1500)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('calls onTransitionComplete after transition duration for reveal', async () => {
      const onComplete = vi.fn()

      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={onComplete}
          transitionType="reveal"
          highlightRegion={{ x: 0.5, y: 0.5, radius: 100 }}
        />
      )

      expect(onComplete).not.toHaveBeenCalled()

      // Reveal transition duration
      act(() => {
        vi.advanceTimersByTime(1500)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('calls onTransitionComplete after transition duration for morph', async () => {
      const onComplete = vi.fn()

      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={onComplete}
          transitionType="morph"
        />
      )

      expect(onComplete).not.toHaveBeenCalled()

      // Morph transition duration
      act(() => {
        vi.advanceTimersByTime(1500)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('does not call onTransitionComplete when not transitioning', () => {
      const onComplete = vi.fn()

      render(
        <WorldTransition
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={false}
          onTransitionComplete={onComplete}
        />
      )

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(onComplete).not.toHaveBeenCalled()
    })
  })

  describe('prefers-reduced-motion', () => {
    it('respects prefers-reduced-motion with instant transition', () => {
      mockMatchMedia(true) // Enable reduced motion

      const onComplete = vi.fn()

      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={onComplete}
          transitionType="crossfade"
        />
      )

      // With reduced motion, transition should complete immediately
      act(() => {
        vi.advanceTimersByTime(50) // Small delay for instant transition
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('skips animation classes when reduced motion is enabled', () => {
      mockMatchMedia(true)

      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
          transitionType="crossfade"
        />
      )

      const container = screen.getByTestId('world-transition-container')
      // Should not have animation classes when reduced motion is preferred
      expect(container.className).not.toMatch(/transition-opacity/)
    })
  })

  describe('transition types', () => {
    it('applies crossfade transition class when transitionType is crossfade', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
          transitionType="crossfade"
        />
      )

      const container = screen.getByTestId('world-transition-container')
      expect(container.className).toMatch(/crossfade|transition-opacity/)
    })

    it('applies reveal transition class when transitionType is reveal', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
          transitionType="reveal"
          highlightRegion={{ x: 0.5, y: 0.5, radius: 100 }}
        />
      )

      const container = screen.getByTestId('world-transition-container')
      expect(container.className).toMatch(/reveal/)
    })

    it('applies morph transition class when transitionType is morph', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
          transitionType="morph"
        />
      )

      const container = screen.getByTestId('world-transition-container')
      expect(container.className).toMatch(/morph/)
    })

    it('defaults to crossfade when no transitionType specified', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
        />
      )

      const container = screen.getByTestId('world-transition-container')
      expect(container.className).toMatch(/crossfade|transition-opacity/)
    })
  })

  describe('highlight region glow effect', () => {
    it('creates glow effect at specified position', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
          highlightRegion={{ x: 0.3, y: 0.7, radius: 50 }}
        />
      )

      const glow = screen.getByTestId('highlight-glow')
      expect(glow).toBeInTheDocument()

      // Check that glow is positioned correctly
      const style = glow.style
      expect(style.left).toBe('30%')
      expect(style.top).toBe('70%')
    })

    it('does not render glow when highlightRegion is not provided', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
        />
      )

      const glow = screen.queryByTestId('highlight-glow')
      expect(glow).not.toBeInTheDocument()
    })

    it('does not render glow when not transitioning', () => {
      render(
        <WorldTransition
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={false}
          onTransitionComplete={() => {}}
          highlightRegion={{ x: 0.5, y: 0.5, radius: 50 }}
        />
      )

      const glow = screen.queryByTestId('highlight-glow')
      expect(glow).not.toBeInTheDocument()
    })

    it('glow has pulsing animation', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
          highlightRegion={{ x: 0.5, y: 0.5, radius: 50 }}
        />
      )

      const glow = screen.getByTestId('highlight-glow')
      expect(glow.className).toMatch(/animate-pulse|glow|shadow/)
    })
  })

  describe('edge cases', () => {
    it('handles missing oldImageUrl gracefully - just shows new image', () => {
      expect(() => {
        render(
          <WorldTransition
            newImageUrl="https://example.com/new-world.png"
            isTransitioning={true}
            onTransitionComplete={() => {}}
          />
        )
      }).not.toThrow()

      const images = screen.getAllByRole('img')
      // Should just show the new image
      expect(images).toHaveLength(1)
      expect(images[0]).toHaveAttribute('src', 'https://example.com/new-world.png')
    })

    it('handles missing newImageUrl gracefully', () => {
      expect(() => {
        render(
          <WorldTransition
            oldImageUrl="https://example.com/old-world.png"
            isTransitioning={false}
            onTransitionComplete={() => {}}
          />
        )
      }).not.toThrow()
    })

    it('handles undefined onTransitionComplete', () => {
      expect(() => {
        render(
          <WorldTransition
            newImageUrl="https://example.com/new-world.png"
            isTransitioning={true}
          />
        )

        act(() => {
          vi.advanceTimersByTime(2000)
        })
      }).not.toThrow()
    })

    it('cleans up timer on unmount', () => {
      const onComplete = vi.fn()
      const { unmount } = render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={onComplete}
        />
      )

      // Unmount before transition completes
      unmount()

      // Advance timer
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Should not call callback after unmount
      expect(onComplete).not.toHaveBeenCalled()
    })

    it('handles rapid isTransitioning toggles', () => {
      const onComplete = vi.fn()
      const { rerender } = render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={onComplete}
        />
      )

      // Toggle off quickly
      act(() => {
        vi.advanceTimersByTime(500)
      })

      rerender(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={false}
          onTransitionComplete={onComplete}
        />
      )

      // Toggle back on
      rerender(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={onComplete}
        />
      )

      // Complete the new transition
      act(() => {
        vi.advanceTimersByTime(1500)
      })

      // Should only call once for the completed transition
      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('handles invalid highlightRegion coordinates gracefully', () => {
      expect(() => {
        render(
          <WorldTransition
            oldImageUrl="https://example.com/old-world.png"
            newImageUrl="https://example.com/new-world.png"
            isTransitioning={true}
            onTransitionComplete={() => {}}
            highlightRegion={{ x: -0.5, y: 1.5, radius: 50 }}
          />
        )
      }).not.toThrow()

      // Coordinates should be clamped to valid range
      const glow = screen.getByTestId('highlight-glow')
      expect(glow.style.left).toBe('0%') // Clamped from -0.5 to 0
      expect(glow.style.top).toBe('100%') // Clamped from 1.5 to 1
    })
  })

  describe('visual effects', () => {
    it('shows particle/sparkle effect during transition', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
        />
      )

      const particles = screen.getByTestId('transition-particles')
      expect(particles).toBeInTheDocument()
    })

    it('hides particle effect when not transitioning', () => {
      render(
        <WorldTransition
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={false}
          onTransitionComplete={() => {}}
        />
      )

      const particles = screen.queryByTestId('transition-particles')
      expect(particles).not.toBeInTheDocument()
    })

    it('shows dark overlay during transition to focus attention', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
        />
      )

      const overlay = screen.getByTestId('transition-overlay')
      expect(overlay).toBeInTheDocument()
      expect(overlay.className).toMatch(/bg-black|opacity/)
    })
  })

  describe('text overlay', () => {
    it('shows "Your world grows..." text when showText prop is true', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
          showText={true}
        />
      )

      expect(screen.getByText(/your world grows/i)).toBeInTheDocument()
    })

    it('does not show text when showText is false', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
          showText={false}
        />
      )

      expect(screen.queryByText(/your world grows/i)).not.toBeInTheDocument()
    })

    it('does not show text when not transitioning', () => {
      render(
        <WorldTransition
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={false}
          onTransitionComplete={() => {}}
          showText={true}
        />
      )

      expect(screen.queryByText(/your world grows/i)).not.toBeInTheDocument()
    })
  })

  describe('image positioning', () => {
    it('images are absolutely positioned for layering', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
        />
      )

      const images = screen.getAllByRole('img')
      images.forEach((img) => {
        expect(img.className).toMatch(/absolute/)
      })
    })

    it('images cover full container', () => {
      render(
        <WorldTransition
          oldImageUrl="https://example.com/old-world.png"
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={true}
          onTransitionComplete={() => {}}
        />
      )

      const images = screen.getAllByRole('img')
      images.forEach((img) => {
        expect(img.className).toMatch(/inset-0|w-full.*h-full/)
      })
    })
  })

  describe('dark mode support', () => {
    it('container has dark mode compatible styling', () => {
      render(
        <WorldTransition
          newImageUrl="https://example.com/new-world.png"
          isTransitioning={false}
          onTransitionComplete={() => {}}
        />
      )

      const container = screen.getByTestId('world-transition-container')
      expect(container.className).toMatch(/dark:|bg-/)
    })
  })
})
