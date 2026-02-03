/**
 * MagicalTree Component Tests
 *
 * TDD: These tests define the behavior for the MagicalTree component
 * BEFORE implementation. The tree visualizes learning progress with
 * 6 visual states based on topic count.
 *
 * Visual States:
 * - seed: A small seed in soil (0 topics)
 * - sprout: Small green shoot (1-2 topics)
 * - sapling: Small tree with few leaves (3-5 topics)
 * - young: Medium tree with branches (6-10 topics)
 * - mature: Full tree with many branches (11-20 topics)
 * - magical: Glowing tree with special effects (21+ topics)
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

// Mock window.matchMedia for animations
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

import MagicalTree from '../MagicalTree'

/**
 * Default props for MagicalTree component
 */
const createDefaultProps = (overrides = {}) => ({
  treeLevel: 'seed',
  branches: {
    nature: [],
    civilization: [],
    arcane: [],
  },
  totalTopics: 0,
  onLeafClick: vi.fn(),
  isAnimating: false,
  ...overrides,
})

describe('MagicalTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps()
      render(<MagicalTree {...props} />)

      expect(screen.getByTestId('magical-tree')).toBeInTheDocument()
    })

    it('has accessible role and label', () => {
      const props = createDefaultProps()
      render(<MagicalTree {...props} />)

      const tree = screen.getByTestId('magical-tree')
      expect(tree).toHaveAttribute('role', 'img')
      expect(tree).toHaveAttribute('aria-label')
    })
  })

  describe('seed state (0 topics)', () => {
    it('shows seed visual when treeLevel is "seed"', () => {
      const props = createDefaultProps({ treeLevel: 'seed', totalTopics: 0 })
      render(<MagicalTree {...props} />)

      expect(screen.getByTestId('tree-seed')).toBeInTheDocument()
    })

    it('displays CTA text encouraging first lesson', () => {
      const props = createDefaultProps({ treeLevel: 'seed', totalTopics: 0 })
      render(<MagicalTree {...props} />)

      expect(screen.getByText(/plant your first seed/i)).toBeInTheDocument()
    })

    it('does not show any branches in seed state', () => {
      const props = createDefaultProps({ treeLevel: 'seed', totalTopics: 0 })
      render(<MagicalTree {...props} />)

      expect(screen.queryByTestId('tree-branch')).not.toBeInTheDocument()
    })

    it('seed has subtle animation', () => {
      const props = createDefaultProps({ treeLevel: 'seed', totalTopics: 0 })
      render(<MagicalTree {...props} />)

      const seed = screen.getByTestId('tree-seed')
      expect(seed.className).toMatch(/animate|pulse|glow/)
    })
  })

  describe('sprout state (1-2 topics)', () => {
    it('shows sprout visual when treeLevel is "sprout"', () => {
      const props = createDefaultProps({
        treeLevel: 'sprout',
        totalTopics: 1,
        branches: {
          nature: [{ id: '1', name: 'Lions', category: 'Animals' }],
          civilization: [],
          arcane: [],
        },
      })
      render(<MagicalTree {...props} />)

      expect(screen.getByTestId('tree-sprout')).toBeInTheDocument()
    })

    it('shows small stem with 1-2 leaves', () => {
      const props = createDefaultProps({
        treeLevel: 'sprout',
        totalTopics: 2,
        branches: {
          nature: [
            { id: '1', name: 'Lions', category: 'Animals' },
            { id: '2', name: 'Trees', category: 'Plants' },
          ],
          civilization: [],
          arcane: [],
        },
      })
      render(<MagicalTree {...props} />)

      const leaves = screen.getAllByTestId('tree-leaf')
      expect(leaves.length).toBeGreaterThanOrEqual(1)
      expect(leaves.length).toBeLessThanOrEqual(2)
    })
  })

  describe('sapling state (3-5 topics)', () => {
    it('shows sapling visual when treeLevel is "sapling"', () => {
      const props = createDefaultProps({
        treeLevel: 'sapling',
        totalTopics: 3,
        branches: {
          nature: [{ id: '1', name: 'Lions', category: 'Animals' }],
          civilization: [{ id: '2', name: 'Pyramids', category: 'History' }],
          arcane: [{ id: '3', name: 'Stars', category: 'Space' }],
        },
      })
      render(<MagicalTree {...props} />)

      expect(screen.getByTestId('tree-sapling')).toBeInTheDocument()
    })

    it('shows basic branch structure with leaves', () => {
      const props = createDefaultProps({
        treeLevel: 'sapling',
        totalTopics: 5,
        branches: {
          nature: [
            { id: '1', name: 'Lions', category: 'Animals' },
            { id: '2', name: 'Trees', category: 'Plants' },
          ],
          civilization: [
            { id: '3', name: 'Pyramids', category: 'History' },
          ],
          arcane: [
            { id: '4', name: 'Stars', category: 'Space' },
            { id: '5', name: 'Atoms', category: 'Science' },
          ],
        },
      })
      render(<MagicalTree {...props} />)

      const leaves = screen.getAllByTestId('tree-leaf')
      expect(leaves.length).toBe(5)
    })
  })

  describe('young state (6-10 topics)', () => {
    it('shows young tree visual when treeLevel is "young"', () => {
      const props = createDefaultProps({
        treeLevel: 'young',
        totalTopics: 6,
      })
      render(<MagicalTree {...props} />)

      expect(screen.getByTestId('tree-young')).toBeInTheDocument()
    })

    it('shows distinct branch zones', () => {
      const props = createDefaultProps({
        treeLevel: 'young',
        totalTopics: 8,
        branches: {
          nature: [
            { id: '1', name: 'Lions', category: 'Animals' },
            { id: '2', name: 'Trees', category: 'Plants' },
            { id: '3', name: 'Weather', category: 'Weather' },
          ],
          civilization: [
            { id: '4', name: 'Pyramids', category: 'History' },
            { id: '5', name: 'Robots', category: 'Technology' },
          ],
          arcane: [
            { id: '6', name: 'Stars', category: 'Space' },
            { id: '7', name: 'Atoms', category: 'Science' },
            { id: '8', name: 'Numbers', category: 'Math' },
          ],
        },
      })
      render(<MagicalTree {...props} />)

      // Should have zone branches visible
      expect(screen.getByTestId('branch-nature')).toBeInTheDocument()
      expect(screen.getByTestId('branch-civilization')).toBeInTheDocument()
      expect(screen.getByTestId('branch-arcane')).toBeInTheDocument()
    })
  })

  describe('mature state (11-20 topics)', () => {
    it('shows mature tree visual when treeLevel is "mature"', () => {
      const props = createDefaultProps({
        treeLevel: 'mature',
        totalTopics: 15,
      })
      render(<MagicalTree {...props} />)

      expect(screen.getByTestId('tree-mature')).toBeInTheDocument()
    })

    it('has fuller canopy with more detail', () => {
      const props = createDefaultProps({
        treeLevel: 'mature',
        totalTopics: 15,
      })
      render(<MagicalTree {...props} />)

      const tree = screen.getByTestId('tree-mature')
      // Should have canopy styling
      expect(tree.className).toMatch(/canopy|full/)
    })
  })

  describe('magical state (21+ topics)', () => {
    it('shows magical tree visual when treeLevel is "magical"', () => {
      const props = createDefaultProps({
        treeLevel: 'magical',
        totalTopics: 25,
      })
      render(<MagicalTree {...props} />)

      expect(screen.getByTestId('tree-magical')).toBeInTheDocument()
    })

    it('has glowing/particle effects', () => {
      const props = createDefaultProps({
        treeLevel: 'magical',
        totalTopics: 25,
      })
      render(<MagicalTree {...props} />)

      expect(screen.getByTestId('magical-particles')).toBeInTheDocument()
    })

    it('shows special "magical" label or indicator', () => {
      const props = createDefaultProps({
        treeLevel: 'magical',
        totalTopics: 50,
      })
      render(<MagicalTree {...props} />)

      // Should indicate magical status somewhere
      expect(screen.getByText(/magical|legendary/i)).toBeInTheDocument()
    })
  })

  describe('branch rendering', () => {
    it('renders TreeBranch for each zone with topics', () => {
      const props = createDefaultProps({
        treeLevel: 'young',
        totalTopics: 6,
        branches: {
          nature: [{ id: '1', name: 'Lions', category: 'Animals' }],
          civilization: [{ id: '2', name: 'Pyramids', category: 'History' }],
          arcane: [{ id: '3', name: 'Stars', category: 'Space' }],
        },
      })
      render(<MagicalTree {...props} />)

      expect(screen.getByTestId('branch-nature')).toBeInTheDocument()
      expect(screen.getByTestId('branch-civilization')).toBeInTheDocument()
      expect(screen.getByTestId('branch-arcane')).toBeInTheDocument()
    })

    it('does not render branch for empty zones', () => {
      const props = createDefaultProps({
        treeLevel: 'sprout',
        totalTopics: 2,
        branches: {
          nature: [
            { id: '1', name: 'Lions', category: 'Animals' },
            { id: '2', name: 'Trees', category: 'Plants' },
          ],
          civilization: [],
          arcane: [],
        },
      })
      render(<MagicalTree {...props} />)

      expect(screen.queryByTestId('branch-civilization')).not.toBeInTheDocument()
      expect(screen.queryByTestId('branch-arcane')).not.toBeInTheDocument()
    })

    it('applies correct color to each zone branch', () => {
      const props = createDefaultProps({
        treeLevel: 'young',
        totalTopics: 6,
        branches: {
          nature: [{ id: '1', name: 'Lions', category: 'Animals' }],
          civilization: [{ id: '2', name: 'Pyramids', category: 'History' }],
          arcane: [{ id: '3', name: 'Stars', category: 'Space' }],
        },
      })
      render(<MagicalTree {...props} />)

      const natureBranch = screen.getByTestId('branch-nature')
      const civBranch = screen.getByTestId('branch-civilization')
      const arcaneBranch = screen.getByTestId('branch-arcane')

      // Nature = green, Civilization = amber, Arcane = purple
      expect(natureBranch.className).toMatch(/green|emerald/)
      expect(civBranch.className).toMatch(/amber|yellow|orange/)
      expect(arcaneBranch.className).toMatch(/purple|violet|indigo/)
    })
  })

  describe('leaf interaction', () => {
    it('calls onLeafClick when a leaf is clicked', () => {
      const onLeafClick = vi.fn()
      const topic = { id: '1', name: 'Lions', category: 'Animals' }
      const props = createDefaultProps({
        treeLevel: 'sprout',
        totalTopics: 1,
        branches: {
          nature: [topic],
          civilization: [],
          arcane: [],
        },
        onLeafClick,
      })
      render(<MagicalTree {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      fireEvent.click(leaf)

      expect(onLeafClick).toHaveBeenCalledTimes(1)
      expect(onLeafClick).toHaveBeenCalledWith(topic)
    })

    it('leaves are keyboard accessible', () => {
      const onLeafClick = vi.fn()
      const topic = { id: '1', name: 'Lions', category: 'Animals' }
      const props = createDefaultProps({
        treeLevel: 'sprout',
        totalTopics: 1,
        branches: {
          nature: [topic],
          civilization: [],
          arcane: [],
        },
        onLeafClick,
      })
      render(<MagicalTree {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf).toHaveAttribute('tabIndex', '0')

      fireEvent.keyDown(leaf, { key: 'Enter' })
      expect(onLeafClick).toHaveBeenCalledWith(topic)
    })
  })

  describe('animation states', () => {
    it('applies growth animation class when isAnimating is true', () => {
      const props = createDefaultProps({
        treeLevel: 'sapling',
        totalTopics: 3,
        isAnimating: true,
      })
      render(<MagicalTree {...props} />)

      const tree = screen.getByTestId('magical-tree')
      expect(tree.className).toMatch(/animate|growing|transition/)
    })

    it('shows new leaf animation when leaf count increases', async () => {
      const props = createDefaultProps({
        treeLevel: 'sprout',
        totalTopics: 1,
        branches: {
          nature: [{ id: '1', name: 'Lions', category: 'Animals' }],
          civilization: [],
          arcane: [],
        },
      })

      const { rerender } = render(<MagicalTree {...props} />)

      // Add new topic
      rerender(
        <MagicalTree
          {...props}
          totalTopics={2}
          branches={{
            nature: [
              { id: '1', name: 'Lions', category: 'Animals' },
              { id: '2', name: 'Trees', category: 'Plants', isNew: true },
            ],
            civilization: [],
            arcane: [],
          }}
        />
      )

      const newLeaf = screen.getByTestId('tree-leaf-2')
      expect(newLeaf.className).toMatch(/new|grow|appear/)
    })
  })

  describe('responsive design', () => {
    it('scales appropriately for container', () => {
      const props = createDefaultProps({
        treeLevel: 'mature',
        totalTopics: 15,
      })
      render(<MagicalTree {...props} />)

      const tree = screen.getByTestId('magical-tree')
      // Should use relative sizing
      expect(tree.className).toMatch(/w-full|h-full|aspect/)
    })
  })

  describe('edge cases', () => {
    it('handles undefined treeLevel by defaulting to seed', () => {
      const props = createDefaultProps({ treeLevel: undefined })
      render(<MagicalTree {...props} />)

      expect(screen.getByTestId('tree-seed')).toBeInTheDocument()
    })

    it('handles invalid treeLevel by defaulting to seed', () => {
      const props = createDefaultProps({ treeLevel: 'invalid' })
      render(<MagicalTree {...props} />)

      expect(screen.getByTestId('tree-seed')).toBeInTheDocument()
    })

    it('handles null branches gracefully', () => {
      const props = createDefaultProps({
        treeLevel: 'sprout',
        totalTopics: 1,
        branches: null,
      })

      expect(() => render(<MagicalTree {...props} />)).not.toThrow()
    })

    it('handles undefined onLeafClick gracefully', () => {
      const props = createDefaultProps({
        treeLevel: 'sprout',
        totalTopics: 1,
        branches: {
          nature: [{ id: '1', name: 'Lions', category: 'Animals' }],
          civilization: [],
          arcane: [],
        },
        onLeafClick: undefined,
      })
      render(<MagicalTree {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(() => fireEvent.click(leaf)).not.toThrow()
    })
  })

  describe('accessibility', () => {
    it('tree has descriptive aria-label based on level', () => {
      const props = createDefaultProps({
        treeLevel: 'mature',
        totalTopics: 15,
      })
      render(<MagicalTree {...props} />)

      const tree = screen.getByTestId('magical-tree')
      expect(tree.getAttribute('aria-label')).toContain('mature')
    })

    it('leaves have accessible names showing topic', () => {
      const props = createDefaultProps({
        treeLevel: 'sprout',
        totalTopics: 1,
        branches: {
          nature: [{ id: '1', name: 'Lions', category: 'Animals' }],
          civilization: [],
          arcane: [],
        },
      })
      render(<MagicalTree {...props} />)

      const leaf = screen.getByTestId('tree-leaf')
      expect(leaf).toHaveAttribute('aria-label', expect.stringContaining('Lions'))
    })
  })
})
