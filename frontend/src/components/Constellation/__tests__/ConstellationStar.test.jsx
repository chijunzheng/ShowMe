/**
 * ConstellationStar Component Tests
 *
 * Tests for the star visualization component that represents
 * a single topic in the knowledge constellation.
 *
 * Features tested:
 * - Brightness levels based on mastery
 * - Visual appearance (size, glow)
 * - Click/tap interactions
 * - Keyboard accessibility
 * - Tooltip display
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ConstellationStar from '../ConstellationStar'

/**
 * Create default props for ConstellationStar
 */
const createDefaultProps = (overrides = {}) => ({
  node: {
    id: 'node-1',
    name: 'Volcanoes',
    mastery: 0.5,
    brightness: 'bright',
  },
  position: { x: 100, y: 150 },
  onTap: vi.fn(),
  ...overrides,
})

describe('ConstellationStar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps()
      render(<ConstellationStar {...props} />)

      expect(screen.getByTestId('constellation-star-node-1')).toBeInTheDocument()
    })

    it('renders as a button element', () => {
      const props = createDefaultProps()
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-node-1')
      expect(star.tagName).toBe('BUTTON')
    })

    it('positions star using absolute positioning', () => {
      const props = createDefaultProps({
        position: { x: 200, y: 300 },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-node-1')
      expect(star.style.left).toBe('200px')
      expect(star.style.top).toBe('300px')
    })
  })

  describe('brightness levels', () => {
    it('applies dim styling for dim brightness', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Topic', mastery: 0.1, brightness: 'dim' },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      expect(star.className).toMatch(/w-5|h-5|opacity-60/)
    })

    it('applies glow styling for glow brightness', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Topic', mastery: 0.35, brightness: 'glow' },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      expect(star.className).toMatch(/w-6|h-6|opacity-80/)
    })

    it('applies bright styling for bright brightness', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Topic', mastery: 0.6, brightness: 'bright' },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      expect(star.className).toMatch(/w-7|h-7|opacity-95/)
    })

    it('applies brilliant styling for brilliant brightness', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Topic', mastery: 0.9, brightness: 'brilliant' },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      expect(star.className).toMatch(/w-9|h-9|opacity-100/)
    })

    it('renders rays for brilliant stars', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Topic', mastery: 0.9, brightness: 'brilliant' },
      })
      const { container } = render(<ConstellationStar {...props} />)

      // Should have ray elements (divs with gradient styling)
      const rays = container.querySelectorAll('[class*="gradient"]')
      expect(rays.length).toBeGreaterThan(0)
    })

    it('does not render rays for non-brilliant stars', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Topic', mastery: 0.5, brightness: 'bright' },
      })
      const { container } = render(<ConstellationStar {...props} />)

      // Should not have animated ray container
      const rayContainer = container.querySelector('[style*="animation: spin"]')
      expect(rayContainer).toBeNull()
    })
  })

  describe('click handling', () => {
    it('calls onTap when clicked', () => {
      const onTap = vi.fn()
      const node = { id: 'n1', name: 'Topic', mastery: 0.5, brightness: 'bright' }
      const props = createDefaultProps({ node, onTap })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      fireEvent.click(star)

      expect(onTap).toHaveBeenCalledTimes(1)
      expect(onTap).toHaveBeenCalledWith(node)
    })

    it('handles Enter key press', () => {
      const onTap = vi.fn()
      const node = { id: 'n1', name: 'Topic', mastery: 0.5, brightness: 'bright' }
      const props = createDefaultProps({ node, onTap })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      fireEvent.keyDown(star, { key: 'Enter' })

      expect(onTap).toHaveBeenCalledWith(node)
    })

    it('handles Space key press', () => {
      const onTap = vi.fn()
      const node = { id: 'n1', name: 'Topic', mastery: 0.5, brightness: 'bright' }
      const props = createDefaultProps({ node, onTap })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      fireEvent.keyDown(star, { key: ' ' })

      expect(onTap).toHaveBeenCalledWith(node)
    })

    it('does not crash when onTap is undefined', () => {
      const props = createDefaultProps({ onTap: undefined })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-node-1')
      expect(() => fireEvent.click(star)).not.toThrow()
    })
  })

  describe('tooltip', () => {
    it('shows tooltip with topic name on hover', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Black Holes', mastery: 0.5, brightness: 'bright' },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      fireEvent.mouseEnter(star)

      // Persistent label + tooltip both show name; tooltip has role="tooltip"
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })

    it('shows mastery percentage in tooltip', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Topic', mastery: 0.75, brightness: 'bright' },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      fireEvent.mouseEnter(star)

      expect(screen.getByText(/75%/)).toBeInTheDocument()
    })

    it('hides tooltip on mouse leave', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Black Holes', mastery: 0.5, brightness: 'bright' },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      fireEvent.mouseEnter(star)
      fireEvent.mouseLeave(star)

      // Tooltip content should not be visible (topic name shown only in tooltip)
      const tooltips = screen.queryAllByRole('tooltip')
      expect(tooltips.length).toBe(0)
    })

    it('shows tooltip on focus for keyboard navigation', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Stars', mastery: 0.5, brightness: 'bright' },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      fireEvent.focus(star)

      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })
  })

  describe('visual appearance', () => {
    it('has stardust background color', () => {
      const props = createDefaultProps()
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-node-1')
      expect(star.className).toMatch(/stardust/)
    })

    it('has rounded-full styling', () => {
      const props = createDefaultProps()
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-node-1')
      expect(star.className).toMatch(/rounded-full/)
    })

    it('has hover scale effect', () => {
      const props = createDefaultProps()
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-node-1')
      expect(star.className).toMatch(/hover:scale/)
    })

    it('has transition styling', () => {
      const props = createDefaultProps()
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-node-1')
      expect(star.className).toMatch(/transition/)
    })
  })

  describe('accessibility', () => {
    it('has accessible aria-label with topic name', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Volcanoes', mastery: 0.5, brightness: 'bright' },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      expect(star.getAttribute('aria-label')).toContain('Volcanoes')
    })

    it('has accessible aria-label with mastery percentage', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Topic', mastery: 0.5, brightness: 'bright' },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      expect(star.getAttribute('aria-label')).toContain('50%')
    })

    it('has focus ring styling', () => {
      const props = createDefaultProps()
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-node-1')
      expect(star.className).toMatch(/focus:/)
    })
  })

  describe('edge cases', () => {
    it('handles zero mastery', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Topic', mastery: 0, brightness: 'dim' },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      expect(star.getAttribute('aria-label')).toContain('0%')
    })

    it('handles full mastery', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Topic', mastery: 1, brightness: 'brilliant' },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      expect(star.getAttribute('aria-label')).toContain('100%')
    })

    it('handles undefined mastery', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Topic', brightness: 'glow' },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      expect(star.getAttribute('aria-label')).toContain('0%')
    })

    it('handles missing brightness by defaulting to glow', () => {
      const props = createDefaultProps({
        node: { id: 'n1', name: 'Topic', mastery: 0.5 },
      })
      render(<ConstellationStar {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      // Should have glow-level styling (w-6 h-6)
      expect(star.className).toMatch(/w-6|h-6/)
    })
  })
})
