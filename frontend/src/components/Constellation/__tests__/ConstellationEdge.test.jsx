/**
 * ConstellationEdge Component Tests
 *
 * Tests for the edge/line component that connects
 * topic stars in the knowledge constellation.
 *
 * Features tested:
 * - Minimal edge styling
 * - Discovered vs undiscovered appearance
 * - Click/tap interactions
 * - SVG rendering
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ConstellationEdge from '../ConstellationEdge'

/**
 * Create default props for ConstellationEdge
 */
const createDefaultProps = (overrides = {}) => ({
  edge: {
    id: 'edge-1',
    from: 'node-1',
    to: 'node-2',
    type: 'prerequisite',
    strength: 0.8,
    discovered: true,
  },
  fromPos: { x: 100, y: 100 },
  toPos: { x: 200, y: 200 },
  onTap: vi.fn(),
  ...overrides,
})

/**
 * Helper to render edge inside SVG
 */
const renderInSvg = (component) => {
  return render(<svg>{component}</svg>)
}

describe('ConstellationEdge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps()
      renderInSvg(<ConstellationEdge {...props} />)

      expect(screen.getByTestId('constellation-edge-edge-1')).toBeInTheDocument()
    })

    it('renders as a line element', () => {
      const props = createDefaultProps()
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(edge.tagName).toBe('line')
    })

    it('sets correct start coordinates', () => {
      const props = createDefaultProps({
        fromPos: { x: 50, y: 75 },
      })
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(edge.getAttribute('x1')).toBe('50')
      expect(edge.getAttribute('y1')).toBe('75')
    })

    it('sets correct end coordinates', () => {
      const props = createDefaultProps({
        toPos: { x: 250, y: 300 },
      })
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(edge.getAttribute('x2')).toBe('250')
      expect(edge.getAttribute('y2')).toBe('300')
    })
  })

  describe('edge styling', () => {
    it('uses a single muted stroke style for all types', () => {
      const props = createDefaultProps({
        edge: { ...createDefaultProps().edge, type: 'bridges' },
      })
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(edge.getAttribute('stroke')).toContain('rgba(148, 163, 184')
      expect(edge.getAttribute('stroke-dasharray')).toBe('none')
    })
  })

  describe('discovered vs undiscovered', () => {
    it('shows higher opacity when discovered', () => {
      const props = createDefaultProps({
        edge: { ...createDefaultProps().edge, discovered: true, strength: 1 },
      })
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(parseFloat(edge.getAttribute('opacity'))).toBeGreaterThan(0.35)
    })

    it('shows reduced opacity when undiscovered', () => {
      const props = createDefaultProps({
        edge: { ...createDefaultProps().edge, discovered: false, strength: 1 },
      })
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(parseFloat(edge.getAttribute('opacity'))).toBeLessThan(0.4)
    })
  })

  describe('strength', () => {
    it('factors strength into opacity for discovered edges', () => {
      const props = createDefaultProps({
        edge: { ...createDefaultProps().edge, discovered: true, strength: 0.5 },
      })
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(parseFloat(edge.getAttribute('opacity'))).toBeLessThan(0.3)
    })

    it('factors strength into opacity for undiscovered edges', () => {
      const props = createDefaultProps({
        edge: { ...createDefaultProps().edge, discovered: false, strength: 0.5 },
      })
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(parseFloat(edge.getAttribute('opacity'))).toBeLessThan(0.3)
    })

    it('defaults strength to 1 when not provided', () => {
      const props = createDefaultProps({
        edge: { id: 'e1', from: 'n1', to: 'n2', type: 'extends', discovered: true },
      })
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-e1')
      expect(parseFloat(edge.getAttribute('opacity'))).toBeGreaterThan(0.35)
    })
  })

  describe('click handling', () => {
    it('calls onTap when clicked', () => {
      const onTap = vi.fn()
      const edge = { id: 'e1', from: 'n1', to: 'n2', type: 'extends', strength: 1, discovered: true }
      const props = createDefaultProps({ edge, onTap })
      renderInSvg(<ConstellationEdge {...props} />)

      const edgeEl = screen.getByTestId('constellation-edge-e1')
      fireEvent.click(edgeEl)

      expect(onTap).toHaveBeenCalledTimes(1)
      expect(onTap).toHaveBeenCalledWith(edge)
    })

    it('handles Enter key press', () => {
      const onTap = vi.fn()
      const edge = { id: 'e1', from: 'n1', to: 'n2', type: 'extends', strength: 1, discovered: true }
      const props = createDefaultProps({ edge, onTap })
      renderInSvg(<ConstellationEdge {...props} />)

      const edgeEl = screen.getByTestId('constellation-edge-e1')
      fireEvent.keyDown(edgeEl, { key: 'Enter' })

      expect(onTap).toHaveBeenCalledWith(edge)
    })

    it('does not crash when onTap is undefined', () => {
      const props = createDefaultProps({ onTap: undefined })
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(() => fireEvent.click(edge)).not.toThrow()
    })
  })

  describe('accessibility', () => {
    it('has role="button"', () => {
      const props = createDefaultProps()
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(edge.getAttribute('role')).toBe('button')
    })

    it('has tabIndex for keyboard focus', () => {
      const props = createDefaultProps()
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(edge.getAttribute('tabindex')).toBe('0')
    })

    it('has aria-label describing the connection', () => {
      const props = createDefaultProps({
        edge: { id: 'e1', from: 'volcanoes', to: 'earthquakes', type: 'prerequisite', strength: 1, discovered: true },
      })
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-e1')
      expect(edge.getAttribute('aria-label')).toContain('volcanoes')
      expect(edge.getAttribute('aria-label')).toContain('earthquakes')
      expect(edge.getAttribute('aria-label')).toContain('prerequisite')
    })
  })

  describe('SVG styling', () => {
    it('has rounded line caps', () => {
      const props = createDefaultProps()
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(edge.getAttribute('stroke-linecap')).toBe('round')
    })

    it('has cursor pointer styling', () => {
      const props = createDefaultProps()
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(edge.className.baseVal || edge.getAttribute('class')).toMatch(/cursor-pointer/)
    })

    it('has transition styling', () => {
      const props = createDefaultProps()
      renderInSvg(<ConstellationEdge {...props} />)

      const edge = screen.getByTestId('constellation-edge-edge-1')
      expect(edge.className.baseVal || edge.getAttribute('class')).toMatch(/transition/)
    })
  })
})
