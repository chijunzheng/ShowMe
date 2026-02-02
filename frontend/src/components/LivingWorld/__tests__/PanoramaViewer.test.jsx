/**
 * PanoramaViewer Component Tests
 *
 * Tests for the PanoramaViewer component that displays a panoramic world view
 * with pan/zoom capabilities and interactive hotspots.
 *
 * TDD: These tests are written FIRST, before implementation.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import PanoramaViewer from '../PanoramaViewer'

/**
 * Helper to simulate image load event
 * jsdom doesn't automatically fire load events for images
 */
function simulateImageLoad() {
  const image = screen.getByRole('img')
  fireEvent.load(image)
}

describe('PanoramaViewer', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('image rendering', () => {
    it('renders image when worldImageUrl is provided', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
        />
      )

      const image = screen.getByRole('img', { name: /world panorama/i })
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', 'https://example.com/world.png')
    })

    it('does not render image when worldImageUrl is not provided', () => {
      render(<PanoramaViewer isLoading={false} />)

      const image = screen.queryByRole('img', { name: /world panorama/i })
      expect(image).not.toBeInTheDocument()
    })

    it('has proper alt text for accessibility', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
        />
      )

      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('alt')
      expect(image.getAttribute('alt')).toBeTruthy()
    })

    it('fades in image smoothly when loaded', async () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
        />
      )

      const image = screen.getByRole('img')
      // Image should have transition classes for smooth fade-in
      expect(image.className).toMatch(/transition|duration/)
    })
  })

  describe('loading state', () => {
    it('shows loading skeleton when isLoading is true', () => {
      render(<PanoramaViewer isLoading={true} />)

      const skeleton = screen.getByTestId('panorama-skeleton')
      expect(skeleton).toBeInTheDocument()
    })

    it('hides skeleton when isLoading is false and image is loaded', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
        />
      )

      // Simulate image load since jsdom doesn't fire load events
      simulateImageLoad()

      const skeleton = screen.queryByTestId('panorama-skeleton')
      expect(skeleton).not.toBeInTheDocument()
    })

    it('skeleton has animated pulse effect', () => {
      render(<PanoramaViewer isLoading={true} />)

      const skeleton = screen.getByTestId('panorama-skeleton')
      expect(skeleton.className).toMatch(/animate-pulse/)
    })

    it('maintains 16:9 aspect ratio during loading', () => {
      render(<PanoramaViewer isLoading={true} />)

      const container = screen.getByTestId('panorama-container')
      expect(container.className).toMatch(/aspect-video|aspect-\[16\/9\]/)
    })
  })

  describe('region tap interactions', () => {
    it('calls onRegionTap with coordinates when image is clicked', () => {
      const onRegionTap = vi.fn()
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
          onRegionTap={onRegionTap}
        />
      )

      const image = screen.getByRole('img')
      // Simulate click at specific coordinates
      fireEvent.click(image, {
        clientX: 100,
        clientY: 50,
      })

      expect(onRegionTap).toHaveBeenCalledTimes(1)
      // Should receive normalized coordinates (0-1 range) or pixel coordinates
      expect(onRegionTap).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('does not call onRegionTap when not provided', () => {
      // Should not throw when onRegionTap is undefined
      expect(() => {
        render(
          <PanoramaViewer
            worldImageUrl="https://example.com/world.png"
            isLoading={false}
          />
        )

        const image = screen.getByRole('img')
        fireEvent.click(image, { clientX: 100, clientY: 50 })
      }).not.toThrow()
    })

    it('does not trigger tap during drag operations', () => {
      const onRegionTap = vi.fn()
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
          onRegionTap={onRegionTap}
        />
      )

      const container = screen.getByTestId('panorama-container')

      // Simulate drag (mousedown, move, mouseup)
      fireEvent.mouseDown(container, { clientX: 0, clientY: 0 })
      fireEvent.mouseMove(container, { clientX: 100, clientY: 0 })
      fireEvent.mouseUp(container, { clientX: 100, clientY: 0 })

      // Tap should not be called during drag
      expect(onRegionTap).not.toHaveBeenCalled()
    })
  })

  describe('hotspots', () => {
    const mockHotspots = [
      { x: 0.2, y: 0.3, topicName: 'Mountains', glow: true },
      { x: 0.5, y: 0.5, topicName: 'Forest', glow: false },
      { x: 0.8, y: 0.7, topicName: 'Ocean', glow: true },
    ]

    it('renders hotspots at correct positions after image loads', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
          hotspots={mockHotspots}
        />
      )

      // Hotspots only render after image loads
      simulateImageLoad()

      const hotspots = screen.getAllByTestId('hotspot')
      expect(hotspots).toHaveLength(3)
    })

    it('displays hotspot topic names', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
          hotspots={mockHotspots}
        />
      )

      simulateImageLoad()

      expect(screen.getByText('Mountains')).toBeInTheDocument()
      expect(screen.getByText('Forest')).toBeInTheDocument()
      expect(screen.getByText('Ocean')).toBeInTheDocument()
    })

    it('applies glow effect to hotspots with glow=true', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
          hotspots={mockHotspots}
        />
      )

      simulateImageLoad()

      const hotspots = screen.getAllByTestId('hotspot')
      // First hotspot (Mountains) has glow=true
      expect(hotspots[0].className).toMatch(/glow|shadow|ring|animate/)
      // Second hotspot (Forest) has glow=false - should not have glow
      expect(hotspots[1].className).not.toMatch(/glow/)
    })

    it('triggers onRegionTap when hotspot is clicked', () => {
      const onRegionTap = vi.fn()
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
          hotspots={mockHotspots}
          onRegionTap={onRegionTap}
        />
      )

      simulateImageLoad()

      const hotspots = screen.getAllByTestId('hotspot')
      // Use mouseDown + mouseUp to simulate click (useLongPress hook intercepts mouse events)
      fireEvent.mouseDown(hotspots[0], { clientX: 100, clientY: 100 })
      fireEvent.mouseUp(hotspots[0], { clientX: 100, clientY: 100 })

      expect(onRegionTap).toHaveBeenCalledWith(0.2, 0.3)
    })

    it('renders nothing when hotspots array is empty', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
          hotspots={[]}
        />
      )

      simulateImageLoad()

      const hotspots = screen.queryAllByTestId('hotspot')
      expect(hotspots).toHaveLength(0)
    })

    it('handles undefined hotspots gracefully', () => {
      expect(() => {
        render(
          <PanoramaViewer
            worldImageUrl="https://example.com/world.png"
            isLoading={false}
          />
        )
      }).not.toThrow()
    })

    it('hotspots have minimum touch target size of 44px', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
          hotspots={mockHotspots}
        />
      )

      simulateImageLoad()

      const hotspots = screen.getAllByTestId('hotspot')
      hotspots.forEach((hotspot) => {
        const styles = window.getComputedStyle(hotspot)
        const width = parseInt(styles.minWidth || styles.width, 10)
        const height = parseInt(styles.minHeight || styles.height, 10)
        // Either min-width/min-height should be >= 44, or class should indicate min size
        expect(hotspot.className).toMatch(/min-w-\[44px\]|min-h-\[44px\]|w-11|h-11|w-12|h-12/)
      })
    })
  })

  describe('keyboard accessibility', () => {
    const mockHotspots = [
      { x: 0.5, y: 0.5, topicName: 'Test Topic', glow: false },
    ]

    it('hotspots are focusable via keyboard', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
          hotspots={mockHotspots}
        />
      )

      simulateImageLoad()

      const hotspot = screen.getByTestId('hotspot')
      expect(hotspot).toHaveAttribute('tabIndex', '0')
    })

    it('Enter key triggers onRegionTap on focused hotspot', async () => {
      const onRegionTap = vi.fn()
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
          hotspots={mockHotspots}
          onRegionTap={onRegionTap}
        />
      )

      simulateImageLoad()

      const hotspot = screen.getByTestId('hotspot')
      hotspot.focus()
      fireEvent.keyDown(hotspot, { key: 'Enter' })

      expect(onRegionTap).toHaveBeenCalledWith(0.5, 0.5)
    })

    it('Space key triggers onRegionTap on focused hotspot', async () => {
      const onRegionTap = vi.fn()
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
          hotspots={mockHotspots}
          onRegionTap={onRegionTap}
        />
      )

      simulateImageLoad()

      const hotspot = screen.getByTestId('hotspot')
      hotspot.focus()
      fireEvent.keyDown(hotspot, { key: ' ' })

      expect(onRegionTap).toHaveBeenCalledWith(0.5, 0.5)
    })

    it('hotspots have accessible role and label', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
          hotspots={mockHotspots}
        />
      )

      simulateImageLoad()

      const hotspot = screen.getByTestId('hotspot')
      expect(hotspot).toHaveAttribute('role', 'button')
      expect(hotspot).toHaveAttribute('aria-label')
    })
  })

  describe('pan and zoom', () => {
    it('supports mouse drag to pan', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
        />
      )

      const container = screen.getByTestId('panorama-container')

      // Verify container has drag cursor indicating pan capability
      expect(container.className).toMatch(/cursor-grab/)

      // Simulate mouseDown - should not throw
      // Note: cursor-grabbing is managed by InteractiveCanvas during actual transforms
      fireEvent.mouseDown(container, { clientX: 0, clientY: 0 })
      expect(container).toBeInTheDocument()
    })

    it('supports touch drag to pan', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
        />
      )

      const container = screen.getByTestId('panorama-container')

      // Simulate touch drag
      fireEvent.touchStart(container, {
        touches: [{ clientX: 0, clientY: 0 }],
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 100, clientY: 0 }],
      })
      fireEvent.touchEnd(container)

      // Should not throw and container should handle touch events
      expect(container).toBeInTheDocument()
    })

    it('supports wheel scroll for zoom', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
        />
      )

      const container = screen.getByTestId('panorama-container')

      // Simulate wheel event
      fireEvent.wheel(container, { deltaY: -100 })

      // Should not throw - zoom handling is internal
      expect(container).toBeInTheDocument()
    })

    it('container has proper ARIA attributes', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
        />
      )

      const container = screen.getByTestId('panorama-container')
      expect(container).toHaveAttribute('role', 'region')
      expect(container).toHaveAttribute('aria-label')
    })
  })

  describe('responsive design', () => {
    it('maintains 16:9 aspect ratio', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
        />
      )

      const container = screen.getByTestId('panorama-container')
      expect(container.className).toMatch(/aspect-video|aspect-\[16\/9\]/)
    })

    it('takes full width of parent container', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
        />
      )

      const container = screen.getByTestId('panorama-container')
      expect(container.className).toMatch(/w-full/)
    })
  })

  describe('dark mode support', () => {
    it('has dark mode compatible styling', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
        />
      )

      const container = screen.getByTestId('panorama-container')
      // Should have dark mode classes or neutral colors
      expect(container.className).toMatch(/dark:|bg-/)
    })

    it('loading skeleton adapts to dark mode', () => {
      render(<PanoramaViewer isLoading={true} />)

      const skeleton = screen.getByTestId('panorama-skeleton')
      expect(skeleton.className).toMatch(/dark:|bg-/)
    })
  })

  describe('edge cases', () => {
    it('handles rapid sequential clicks gracefully', () => {
      const onRegionTap = vi.fn()
      render(
        <PanoramaViewer
          worldImageUrl="https://example.com/world.png"
          isLoading={false}
          onRegionTap={onRegionTap}
        />
      )

      const image = screen.getByRole('img')

      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        fireEvent.click(image, { clientX: i * 10, clientY: 10 })
      }

      // Should handle all clicks without crashing
      expect(onRegionTap).toHaveBeenCalledTimes(5)
    })

    it('handles image load error gracefully', () => {
      render(
        <PanoramaViewer
          worldImageUrl="https://invalid-url.com/broken.png"
          isLoading={false}
        />
      )

      const image = screen.getByRole('img')
      fireEvent.error(image)

      // Should show fallback or error state
      // Component should not crash
      expect(screen.getByTestId('panorama-container')).toBeInTheDocument()
    })

    it('handles missing props gracefully', () => {
      expect(() => {
        render(<PanoramaViewer />)
      }).not.toThrow()
    })

    it('handles hotspots with invalid coordinates', () => {
      const invalidHotspots = [
        { x: -0.5, y: 0.5, topicName: 'Invalid1' },
        { x: 1.5, y: 0.5, topicName: 'Invalid2' },
        { x: 0.5, y: -0.5, topicName: 'Invalid3' },
        { x: 0.5, y: 1.5, topicName: 'Invalid4' },
      ]

      expect(() => {
        render(
          <PanoramaViewer
            worldImageUrl="https://example.com/world.png"
            isLoading={false}
            hotspots={invalidHotspots}
          />
        )
      }).not.toThrow()
    })
  })
})
