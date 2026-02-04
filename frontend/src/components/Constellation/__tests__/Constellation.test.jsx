/**
 * Constellation Component Tests
 *
 * Tests for the main constellation container component that
 * orchestrates the knowledge graph visualization.
 *
 * Features tested:
 * - Rendering nodes, edges, clusters, and gaps
 * - Pan and zoom interactions
 * - Event handling (node tap, edge tap, gap tap)
 * - Empty state
 * - Accessibility
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import Constellation from '../Constellation'

/**
 * Sample test data
 */
const sampleNodes = [
  { id: 'n1', name: 'Volcanoes', mastery: 0.8, brightness: 'bright' },
  { id: 'n2', name: 'Earthquakes', mastery: 0.5, brightness: 'glow' },
  { id: 'n3', name: 'Plate Tectonics', mastery: 0.3, brightness: 'dim' },
]

const sampleEdges = [
  { id: 'e1', from: 'n1', to: 'n2', type: 'prerequisite', strength: 0.9, discovered: true },
  { id: 'e2', from: 'n2', to: 'n3', type: 'extends', strength: 0.7, discovered: false },
]

const sampleClusters = [
  { id: 'c1', name: 'Earth Science', icon: '🌍', color: '#22C55E', nodeIds: ['n1', 'n2', 'n3'] },
]

const sampleGaps = [
  { id: 'g1', suggestedTopic: 'Tsunamis', curiosityHook: 'Giant waves of doom!', connectsTo: ['n2'] },
]

/**
 * Create default props for Constellation
 */
const createDefaultProps = (overrides = {}) => ({
  nodes: sampleNodes,
  edges: sampleEdges,
  clusters: sampleClusters,
  gaps: sampleGaps,
  onNodeTap: vi.fn(),
  onEdgeTap: vi.fn(),
  onGapTap: vi.fn(),
  className: '',
  ...overrides,
})

describe('Constellation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      expect(screen.getByTestId('constellation')).toBeInTheDocument()
    })

    it('renders all nodes as stars', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      expect(screen.getByTestId('constellation-star-n1')).toBeInTheDocument()
      expect(screen.getByTestId('constellation-star-n2')).toBeInTheDocument()
      expect(screen.getByTestId('constellation-star-n3')).toBeInTheDocument()
    })

    it('renders all edges', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      expect(screen.getByTestId('constellation-edge-e1')).toBeInTheDocument()
      expect(screen.getByTestId('constellation-edge-e2')).toBeInTheDocument()
    })

    it('renders cluster labels', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      expect(screen.getByTestId('constellation-cluster-c1')).toBeInTheDocument()
      expect(screen.getByText('Earth Science')).toBeInTheDocument()
    })

    it('renders gap suggestions', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      expect(screen.getByTestId('constellation-gap-g1')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      const props = createDefaultProps({ className: 'custom-class' })
      render(<Constellation {...props} />)

      const container = screen.getByTestId('constellation')
      expect(container.className).toContain('custom-class')
    })
  })

  describe('empty state', () => {
    it('shows empty state message when no nodes', () => {
      const props = createDefaultProps({ nodes: [], edges: [], clusters: [], gaps: [] })
      render(<Constellation {...props} />)

      expect(screen.getByText(/constellation awaits/i)).toBeInTheDocument()
    })

    it('shows guidance to start learning', () => {
      const props = createDefaultProps({ nodes: [], edges: [], clusters: [], gaps: [] })
      render(<Constellation {...props} />)

      expect(screen.getByText(/start learning/i)).toBeInTheDocument()
    })
  })

  describe('node tap handling', () => {
    it('calls onNodeTap when a star is clicked', () => {
      const onNodeTap = vi.fn()
      const props = createDefaultProps({ onNodeTap })
      render(<Constellation {...props} />)

      const star = screen.getByTestId('constellation-star-n1')
      fireEvent.click(star)

      expect(onNodeTap).toHaveBeenCalledTimes(1)
      expect(onNodeTap).toHaveBeenCalledWith(sampleNodes[0])
    })
  })

  describe('edge tap handling', () => {
    it('calls onEdgeTap when an edge is clicked', () => {
      const onEdgeTap = vi.fn()
      const props = createDefaultProps({ onEdgeTap })
      render(<Constellation {...props} />)

      const edge = screen.getByTestId('constellation-edge-e1')
      fireEvent.click(edge)

      expect(onEdgeTap).toHaveBeenCalledTimes(1)
      expect(onEdgeTap).toHaveBeenCalledWith(sampleEdges[0])
    })
  })

  describe('gap tap handling', () => {
    it('calls onGapTap when a gap is clicked', () => {
      const onGapTap = vi.fn()
      const props = createDefaultProps({ onGapTap })
      render(<Constellation {...props} />)

      const gap = screen.getByTestId('constellation-gap-g1')
      fireEvent.click(gap)

      expect(onGapTap).toHaveBeenCalledTimes(1)
      expect(onGapTap).toHaveBeenCalledWith(sampleGaps[0])
    })
  })

  describe('zoom controls', () => {
    it('renders zoom in button', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument()
    })

    it('renders zoom out button', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument()
    })

    it('zoom buttons are clickable', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      const zoomIn = screen.getByLabelText('Zoom in')
      const zoomOut = screen.getByLabelText('Zoom out')

      expect(() => fireEvent.click(zoomIn)).not.toThrow()
      expect(() => fireEvent.click(zoomOut)).not.toThrow()
    })
  })

  describe('pan interaction', () => {
    it('supports pointer down on background', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      const container = screen.getByTestId('constellation')
      expect(() => fireEvent.pointerDown(container, { clientX: 100, clientY: 100 })).not.toThrow()
    })

    it('supports pointer move', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      const container = screen.getByTestId('constellation')
      fireEvent.pointerDown(container, { clientX: 100, clientY: 100 })
      expect(() => fireEvent.pointerMove(container, { clientX: 150, clientY: 150 })).not.toThrow()
    })

    it('supports pointer up', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      const container = screen.getByTestId('constellation')
      fireEvent.pointerDown(container, { clientX: 100, clientY: 100 })
      expect(() => fireEvent.pointerUp(container)).not.toThrow()
    })
  })

  describe('wheel zoom', () => {
    it('supports wheel event for zooming', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      const container = screen.getByTestId('constellation')
      expect(() => fireEvent.wheel(container, { deltaY: -100 })).not.toThrow()
    })
  })

  describe('accessibility', () => {
    it('has role="application" for interactive graph', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      const container = screen.getByTestId('constellation')
      expect(container.getAttribute('role')).toBe('application')
    })

    it('has aria-label describing the constellation', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      const container = screen.getByTestId('constellation')
      expect(container.getAttribute('aria-label')).toContain('constellation')
    })

    it('zoom controls have group role', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      expect(screen.getByRole('group', { name: /zoom controls/i })).toBeInTheDocument()
    })
  })

  describe('visual styling', () => {
    it('has dark background', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      const container = screen.getByTestId('constellation')
      expect(container.className).toMatch(/bg-slate-950/)
    })

    it('has overflow hidden', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      const container = screen.getByTestId('constellation')
      expect(container.className).toMatch(/overflow-hidden/)
    })

    it('has touch-none for gesture control', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      const container = screen.getByTestId('constellation')
      expect(container.className).toMatch(/touch-none/)
    })
  })

  describe('edge cases', () => {
    it('handles undefined nodes', () => {
      const props = createDefaultProps({ nodes: undefined })
      expect(() => render(<Constellation {...props} />)).not.toThrow()
    })

    it('handles undefined edges', () => {
      const props = createDefaultProps({ edges: undefined })
      expect(() => render(<Constellation {...props} />)).not.toThrow()
    })

    it('handles undefined clusters', () => {
      const props = createDefaultProps({ clusters: undefined })
      expect(() => render(<Constellation {...props} />)).not.toThrow()
    })

    it('handles undefined gaps', () => {
      const props = createDefaultProps({ gaps: undefined })
      expect(() => render(<Constellation {...props} />)).not.toThrow()
    })

    it('handles edge with missing node positions', () => {
      const props = createDefaultProps({
        nodes: [{ id: 'n1', name: 'Test', mastery: 0.5, brightness: 'glow' }],
        edges: [{ id: 'e1', from: 'n1', to: 'missing', type: 'extends', strength: 0.5, discovered: true }],
      })
      expect(() => render(<Constellation {...props} />)).not.toThrow()
    })

    it('handles cluster with no matching nodes', () => {
      const props = createDefaultProps({
        nodes: [],
        clusters: [{ id: 'c1', name: 'Empty', icon: '?', color: '#888', nodeIds: ['missing1', 'missing2'] }],
      })
      expect(() => render(<Constellation {...props} />)).not.toThrow()
    })
  })
})
