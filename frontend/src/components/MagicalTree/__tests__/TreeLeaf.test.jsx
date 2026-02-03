/**
 * TreeLeaf Component Tests
 *
 * TDD: These tests define the behavior for the TreeLeaf component
 * BEFORE implementation. TreeLeaf represents a single topic on the
 * magical learning tree.
 *
 * Features:
 * - Displays topic name
 * - Colored by zone (nature=green, civilization=amber, arcane=purple)
 * - Clickable to view topic details
 * - Animated appearance for new topics
 * - Shows tooltip on hover
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import TreeLeaf from '../TreeLeaf'

/**
 * Default props for TreeLeaf component
 */
const createDefaultProps = (overrides = {}) => ({
  topic: {
    id: '1',
    name: 'Lions',
    category: 'Animals',
  },
  zone: 'nature',
  onClick: vi.fn(),
  isNew: false,
  position: { x: 50, y: 50 },
  ...overrides,
})

describe('TreeLeaf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps()
      render(<TreeLeaf {...props} />)

      expect(screen.getByTestId('tree-leaf')).toBeInTheDocument()
    })

    it('displays topic name', () => {
      const props = createDefaultProps({
        topic: { id: '1', name: 'Dinosaurs', category: 'Animals' },
      })
      render(<TreeLeaf {...props} />)

      expect(screen.getByText('Dinosaurs')).toBeInTheDocument()
    })

    it('applies correct test id with topic id', () => {
      const props = createDefaultProps({
        topic: { id: 'topic-123', name: 'Stars', category: 'Space' },
      })
      render(<TreeLeaf {...props} />)

      expect(screen.getByTestId('tree-leaf-topic-123')).toBeInTheDocument()
    })
  })

  describe('zone coloring', () => {
    it('applies green color for nature zone', () => {
      const props = createDefaultProps({ zone: 'nature' })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf.className).toMatch(/green|emerald/)
    })

    it('applies amber color for civilization zone', () => {
      const props = createDefaultProps({
        topic: { id: '1', name: 'Pyramids', category: 'History' },
        zone: 'civilization',
      })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf.className).toMatch(/amber|yellow|orange/)
    })

    it('applies purple color for arcane zone', () => {
      const props = createDefaultProps({
        topic: { id: '1', name: 'Black Holes', category: 'Space' },
        zone: 'arcane',
      })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf.className).toMatch(/purple|violet|indigo/)
    })

    it('defaults to nature (green) for unknown zone', () => {
      const props = createDefaultProps({ zone: 'unknown' })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf.className).toMatch(/green|emerald/)
    })
  })

  describe('click handling', () => {
    it('calls onClick with topic when clicked', () => {
      const onClick = vi.fn()
      const topic = { id: '1', name: 'Lions', category: 'Animals' }
      const props = createDefaultProps({ topic, onClick })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      fireEvent.click(leaf)

      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onClick).toHaveBeenCalledWith(topic)
    })

    it('handles Enter key press', () => {
      const onClick = vi.fn()
      const topic = { id: '1', name: 'Lions', category: 'Animals' }
      const props = createDefaultProps({ topic, onClick })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      fireEvent.keyDown(leaf, { key: 'Enter' })

      expect(onClick).toHaveBeenCalledWith(topic)
    })

    it('handles Space key press', () => {
      const onClick = vi.fn()
      const topic = { id: '1', name: 'Lions', category: 'Animals' }
      const props = createDefaultProps({ topic, onClick })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      fireEvent.keyDown(leaf, { key: ' ' })

      expect(onClick).toHaveBeenCalledWith(topic)
    })

    it('does not crash when onClick is undefined', () => {
      const props = createDefaultProps({ onClick: undefined })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(() => fireEvent.click(leaf)).not.toThrow()
    })
  })

  describe('new leaf animation', () => {
    it('applies grow animation when isNew is true', () => {
      const props = createDefaultProps({ isNew: true })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf.className).toMatch(/new|grow|appear|scale/)
    })

    it('does not apply grow animation when isNew is false', () => {
      const props = createDefaultProps({ isNew: false })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      // Should not have the specific "new" animation class
      expect(leaf.className).not.toMatch(/animate-grow-in/)
    })
  })

  describe('positioning', () => {
    it('applies position from props', () => {
      const props = createDefaultProps({
        position: { x: 25, y: 75 },
      })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      // Position should be applied via style or transform
      expect(leaf.style.left || leaf.style.transform).toBeTruthy()
    })

    it('handles missing position gracefully', () => {
      const props = createDefaultProps({ position: undefined })

      expect(() => render(<TreeLeaf {...props} />)).not.toThrow()
    })
  })

  describe('tooltip', () => {
    it('shows tooltip with category on hover', async () => {
      const props = createDefaultProps({
        topic: { id: '1', name: 'Lions', category: 'Animals' },
      })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      fireEvent.mouseEnter(leaf)

      await waitFor(() => {
        expect(screen.getByText(/Animals/)).toBeInTheDocument()
      })
    })

    it('hides tooltip on mouse leave', async () => {
      const props = createDefaultProps({
        topic: { id: '1', name: 'Lions', category: 'Animals' },
      })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      fireEvent.mouseEnter(leaf)
      fireEvent.mouseLeave(leaf)

      await waitFor(() => {
        expect(screen.queryByTestId('leaf-tooltip')).not.toBeInTheDocument()
      })
    })
  })

  describe('visual states', () => {
    it('has hover effect styles', () => {
      const props = createDefaultProps()
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf.className).toMatch(/hover:|cursor-pointer/)
    })

    it('has focus visible styles for accessibility', () => {
      const props = createDefaultProps()
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf.className).toMatch(/focus:|focus-visible:|ring/)
    })

    it('renders as a leaf shape visual', () => {
      const props = createDefaultProps()
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      // Should have leaf-like styling (rounded, specific shape)
      expect(leaf.className).toMatch(/rounded|leaf/)
    })
  })

  describe('accessibility', () => {
    it('has role="button"', () => {
      const props = createDefaultProps()
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf).toHaveAttribute('role', 'button')
    })

    it('has tabIndex="0" for keyboard focus', () => {
      const props = createDefaultProps()
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf).toHaveAttribute('tabIndex', '0')
    })

    it('has aria-label describing the topic', () => {
      const props = createDefaultProps({
        topic: { id: '1', name: 'Lions', category: 'Animals' },
      })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf.getAttribute('aria-label')).toContain('Lions')
    })

    it('has aria-label including category', () => {
      const props = createDefaultProps({
        topic: { id: '1', name: 'Lions', category: 'Animals' },
      })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf.getAttribute('aria-label')).toContain('Animals')
    })
  })

  describe('edge cases', () => {
    it('handles topic with missing name gracefully', () => {
      const props = createDefaultProps({
        topic: { id: '1', category: 'Animals' },
      })

      expect(() => render(<TreeLeaf {...props} />)).not.toThrow()
    })

    it('handles topic with missing category gracefully', () => {
      const props = createDefaultProps({
        topic: { id: '1', name: 'Unknown Topic' },
      })
      render(<TreeLeaf {...props} />)

      expect(screen.getByText('Unknown Topic')).toBeInTheDocument()
    })

    it('handles null topic gracefully', () => {
      const props = createDefaultProps({ topic: null })
      const { container } = render(<TreeLeaf {...props} />)

      // Should render nothing or empty state
      expect(container.firstChild).toBeNull()
    })

    it('handles undefined topic gracefully', () => {
      const props = createDefaultProps({ topic: undefined })
      const { container } = render(<TreeLeaf {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('handles very long topic names with truncation', () => {
      const props = createDefaultProps({
        topic: {
          id: '1',
          name: 'This is a very long topic name that should be truncated to fit within the leaf',
          category: 'Animals',
        },
      })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf.className).toMatch(/truncate|overflow|ellipsis/)
    })
  })

  describe('size variants', () => {
    it('supports size prop for different leaf sizes', () => {
      const props = createDefaultProps({ size: 'large' })
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf.className).toMatch(/large|w-|h-/)
    })

    it('defaults to medium size', () => {
      const props = createDefaultProps()
      render(<TreeLeaf {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      // Should have some size class (not necessarily "medium" in name)
      expect(leaf.className).toMatch(/w-|h-|size/)
    })
  })
})
