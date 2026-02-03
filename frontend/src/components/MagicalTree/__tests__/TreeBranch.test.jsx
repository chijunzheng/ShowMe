/**
 * TreeBranch Component Tests
 *
 * TDD: These tests define the behavior for the TreeBranch component
 * BEFORE implementation. TreeBranch represents a category zone branch
 * that holds multiple TreeLeaf components.
 *
 * Features:
 * - Groups leaves by zone (nature, civilization, arcane)
 * - Visual branch connecting leaves
 * - Zone-specific coloring
 * - Expandable/collapsible for many topics
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import TreeBranch from '../TreeBranch'

/**
 * Default props for TreeBranch component
 */
const createDefaultProps = (overrides = {}) => ({
  zone: 'nature',
  topics: [
    { id: '1', name: 'Lions', category: 'Animals' },
    { id: '2', name: 'Trees', category: 'Plants' },
  ],
  onLeafClick: vi.fn(),
  position: 'left',
  ...overrides,
})

describe('TreeBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps()
      render(<TreeBranch {...props} />)

      expect(screen.getByTestId('branch-nature')).toBeInTheDocument()
    })

    it('uses zone name in test id', () => {
      const props = createDefaultProps({ zone: 'arcane' })
      render(<TreeBranch {...props} />)

      expect(screen.getByTestId('branch-arcane')).toBeInTheDocument()
    })

    it('renders a leaf for each topic', () => {
      const props = createDefaultProps({
        topics: [
          { id: '1', name: 'Lions', category: 'Animals' },
          { id: '2', name: 'Trees', category: 'Plants' },
          { id: '3', name: 'Rivers', category: 'Geography' },
        ],
      })
      render(<TreeBranch {...props} />)

      const leaves = screen.getAllByTestId(/tree-leaf/)
      expect(leaves).toHaveLength(3)
    })
  })

  describe('zone coloring', () => {
    it('applies green styling for nature zone', () => {
      const props = createDefaultProps({ zone: 'nature' })
      render(<TreeBranch {...props} />)

      const branch = screen.getByTestId('branch-nature')
      expect(branch.className).toMatch(/green|emerald/)
    })

    it('applies amber styling for civilization zone', () => {
      const props = createDefaultProps({ zone: 'civilization' })
      render(<TreeBranch {...props} />)

      const branch = screen.getByTestId('branch-civilization')
      expect(branch.className).toMatch(/amber|yellow|orange/)
    })

    it('applies purple styling for arcane zone', () => {
      const props = createDefaultProps({ zone: 'arcane' })
      render(<TreeBranch {...props} />)

      const branch = screen.getByTestId('branch-arcane')
      expect(branch.className).toMatch(/purple|violet|indigo/)
    })
  })

  describe('branch visual', () => {
    it('renders branch line/stem visual', () => {
      const props = createDefaultProps()
      render(<TreeBranch {...props} />)

      expect(screen.getByTestId('branch-stem')).toBeInTheDocument()
    })

    it('stem curves based on position', () => {
      const propsLeft = createDefaultProps({ position: 'left' })
      const propsRight = createDefaultProps({ position: 'right' })

      const { unmount } = render(<TreeBranch {...propsLeft} />)
      const leftBranch = screen.getByTestId('branch-stem')
      const leftTransform = leftBranch.style.transform || leftBranch.className

      unmount()

      render(<TreeBranch {...propsRight} />)
      const rightBranch = screen.getByTestId('branch-stem')
      const rightTransform = rightBranch.style.transform || rightBranch.className

      // Left and right branches should have different transforms/styles
      expect(leftTransform).not.toBe(rightTransform)
    })
  })

  describe('leaf click handling', () => {
    it('passes onLeafClick to child leaves', () => {
      const onLeafClick = vi.fn()
      const topic = { id: '1', name: 'Lions', category: 'Animals' }
      const props = createDefaultProps({
        topics: [topic],
        onLeafClick,
      })
      render(<TreeBranch {...props} />)

      const leaf = screen.getByTestId('tree-leaf-1')
      fireEvent.click(leaf)

      expect(onLeafClick).toHaveBeenCalledWith(topic)
    })
  })

  describe('zone label', () => {
    it('displays zone label', () => {
      const props = createDefaultProps({ zone: 'nature' })
      render(<TreeBranch {...props} />)

      expect(screen.getByText(/nature/i)).toBeInTheDocument()
    })

    it('displays friendly label for each zone', () => {
      const zones = [
        { zone: 'nature', label: /nature|natural/i },
        { zone: 'civilization', label: /civilization|society/i },
        { zone: 'arcane', label: /arcane|science|mystery/i },
      ]

      zones.forEach(({ zone, label }) => {
        cleanup()
        const props = createDefaultProps({ zone })
        render(<TreeBranch {...props} />)

        expect(screen.getByText(label)).toBeInTheDocument()
      })
    })
  })

  describe('topic count', () => {
    it('shows topic count badge', () => {
      const props = createDefaultProps({
        topics: [
          { id: '1', name: 'Lions', category: 'Animals' },
          { id: '2', name: 'Trees', category: 'Plants' },
          { id: '3', name: 'Rivers', category: 'Geography' },
        ],
      })
      render(<TreeBranch {...props} />)

      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('expandable behavior', () => {
    it('collapses when more than 5 topics', () => {
      const manyTopics = Array.from({ length: 8 }, (_, i) => ({
        id: String(i + 1),
        name: `Topic ${i + 1}`,
        category: 'Animals',
      }))

      const props = createDefaultProps({ topics: manyTopics })
      render(<TreeBranch {...props} />)

      // Should show collapse indicator or limited visible leaves
      expect(screen.getByTestId('branch-expand-toggle')).toBeInTheDocument()
    })

    it('shows all leaves when expanded', async () => {
      const manyTopics = Array.from({ length: 8 }, (_, i) => ({
        id: String(i + 1),
        name: `Topic ${i + 1}`,
        category: 'Animals',
      }))

      const props = createDefaultProps({ topics: manyTopics })
      render(<TreeBranch {...props} />)

      const expandButton = screen.getByTestId('branch-expand-toggle')
      fireEvent.click(expandButton)

      const leaves = screen.getAllByTestId(/tree-leaf-/)
      expect(leaves).toHaveLength(8)
    })

    it('does not show expand toggle when 5 or fewer topics', () => {
      const props = createDefaultProps({
        topics: [
          { id: '1', name: 'Topic 1', category: 'Animals' },
          { id: '2', name: 'Topic 2', category: 'Animals' },
        ],
      })
      render(<TreeBranch {...props} />)

      expect(screen.queryByTestId('branch-expand-toggle')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('does not render when topics array is empty', () => {
      const props = createDefaultProps({ topics: [] })
      const { container } = render(<TreeBranch {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('handles null topics gracefully', () => {
      const props = createDefaultProps({ topics: null })
      const { container } = render(<TreeBranch {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('handles undefined topics gracefully', () => {
      const props = createDefaultProps({ topics: undefined })
      const { container } = render(<TreeBranch {...props} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('positioning', () => {
    it('accepts position prop (left, right, center)', () => {
      const positions = ['left', 'right', 'center']

      positions.forEach((position) => {
        cleanup()
        const props = createDefaultProps({ position })
        render(<TreeBranch {...props} />)

        const branch = screen.getByTestId('branch-nature')
        expect(branch).toBeInTheDocument()
      })
    })

    it('applies different styling based on position', () => {
      const propsLeft = createDefaultProps({ position: 'left' })
      render(<TreeBranch {...propsLeft} />)
      const leftBranch = screen.getByTestId('branch-nature')
      const leftClass = leftBranch.className

      cleanup()

      const propsRight = createDefaultProps({ position: 'right' })
      render(<TreeBranch {...propsRight} />)
      const rightBranch = screen.getByTestId('branch-nature')
      const rightClass = rightBranch.className

      // Should have position-specific classes
      expect(leftClass).toMatch(/left/)
      expect(rightClass).toMatch(/right/)
    })
  })

  describe('animations', () => {
    it('supports staggered leaf animation', () => {
      const props = createDefaultProps({
        topics: [
          { id: '1', name: 'Topic 1', category: 'Animals' },
          { id: '2', name: 'Topic 2', category: 'Animals' },
          { id: '3', name: 'Topic 3', category: 'Animals' },
        ],
        animate: true,
      })
      render(<TreeBranch {...props} />)

      const leaves = screen.getAllByTestId(/tree-leaf-/)

      // Each leaf should have different animation delay
      const delays = leaves.map((leaf) =>
        leaf.style.animationDelay || leaf.style.transitionDelay || ''
      )

      // At least some leaves should have different delays
      expect(new Set(delays).size).toBeGreaterThan(1)
    })
  })

  describe('accessibility', () => {
    it('branch group has role="group"', () => {
      const props = createDefaultProps()
      render(<TreeBranch {...props} />)

      const branch = screen.getByTestId('branch-nature')
      expect(branch).toHaveAttribute('role', 'group')
    })

    it('branch has aria-label describing zone', () => {
      const props = createDefaultProps({ zone: 'nature' })
      render(<TreeBranch {...props} />)

      const branch = screen.getByTestId('branch-nature')
      expect(branch.getAttribute('aria-label')).toContain('nature')
    })

    it('expand toggle has accessible label', () => {
      const manyTopics = Array.from({ length: 8 }, (_, i) => ({
        id: String(i + 1),
        name: `Topic ${i + 1}`,
        category: 'Animals',
      }))

      const props = createDefaultProps({ topics: manyTopics })
      render(<TreeBranch {...props} />)

      const expandButton = screen.getByTestId('branch-expand-toggle')
      expect(expandButton).toHaveAttribute('aria-label')
      expect(expandButton).toHaveAttribute('aria-expanded')
    })
  })

  describe('edge cases', () => {
    it('handles invalid zone by defaulting to nature', () => {
      const props = createDefaultProps({ zone: 'invalid' })
      render(<TreeBranch {...props} />)

      const branch = screen.getByTestId('branch-invalid')
      expect(branch.className).toMatch(/green|emerald/)
    })

    it('handles topics with missing ids', () => {
      const props = createDefaultProps({
        topics: [
          { name: 'No ID Topic', category: 'Animals' },
        ],
      })

      expect(() => render(<TreeBranch {...props} />)).not.toThrow()
    })
  })
})
