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

    it('renders cross-cluster edges as curved paths', () => {
      const nodes = [
        { id: 'n1', name: 'Alpha', mastery: 0.4, brightness: 'glow' },
        { id: 'n2', name: 'Beta', mastery: 0.6, brightness: 'bright' },
      ]
      const clusters = [
        { id: 'c1', name: 'Cluster A', icon: 'A', color: '#22C55E', nodeIds: ['n1'] },
        { id: 'c2', name: 'Cluster B', icon: 'B', color: '#60A5FA', nodeIds: ['n2'] },
      ]
      const edges = [
        { id: 'e1', from: 'n1', to: 'n2', type: 'bridges', strength: 0.8, discovered: true },
      ]

      const props = createDefaultProps({ nodes, clusters, edges, gaps: [] })
      render(<Constellation {...props} />)

      const crossEdge = screen.getByTestId('constellation-cross-edge-e1')
      expect(crossEdge).toBeInTheDocument()
      expect(crossEdge.getAttribute('stroke-dasharray')).toBe('none')
      expect(screen.queryByTestId('constellation-edge-e1')).not.toBeInTheDocument()
    })

    it('hides category labels on the map by default', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      expect(screen.queryByTestId('constellation-cluster-c1')).not.toBeInTheDocument()
    })

    it('renders a collapsible category legend', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      const toggle = screen.getByRole('button', { name: /categories/i })
      expect(toggle).toBeInTheDocument()
      expect(screen.queryByText('Earth Science')).not.toBeInTheDocument()

      fireEvent.click(toggle)
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

      expect(screen.getByText(/your knowledge constellation/i)).toBeInTheDocument()
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

    it('renders fullscreen toggle button', () => {
      const props = createDefaultProps()
      render(<Constellation {...props} />)

      expect(screen.getByLabelText('Toggle fullscreen')).toBeInTheDocument()
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
      expect(container.className).toMatch(/bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950/)
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

  describe('fullscreen', () => {
    it('requests fullscreen when toggle clicked', () => {
      const requestFullscreen = vi.fn().mockResolvedValue()
      Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
        configurable: true,
        value: requestFullscreen,
      })
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        writable: true,
        value: null,
      })

      const props = createDefaultProps()
      render(<Constellation {...props} />)

      const button = screen.getByLabelText('Toggle fullscreen')
      fireEvent.click(button)

      expect(requestFullscreen).toHaveBeenCalledTimes(1)
    })
  })
})
