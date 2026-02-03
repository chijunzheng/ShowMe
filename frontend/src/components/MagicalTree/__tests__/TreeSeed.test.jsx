/**
 * TreeSeed Component Tests
 *
 * TDD: These tests define the behavior for the TreeSeed component
 * BEFORE implementation. TreeSeed is the empty state displayed when
 * the user has no learned topics yet.
 *
 * Features:
 * - Animated seed visual
 * - Encouraging CTA text
 * - Click to start learning
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import TreeSeed from '../TreeSeed'

/**
 * Default props for TreeSeed component
 */
const createDefaultProps = (overrides = {}) => ({
  onStartLearning: vi.fn(),
  ...overrides,
})

describe('TreeSeed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      expect(screen.getByTestId('tree-seed')).toBeInTheDocument()
    })

    it('displays seed visual element', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      expect(screen.getByTestId('seed-visual')).toBeInTheDocument()
    })

    it('displays soil/ground visual', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      expect(screen.getByTestId('seed-soil')).toBeInTheDocument()
    })
  })

  describe('CTA text', () => {
    it('displays encouraging message', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      expect(screen.getByText(/plant your first seed/i)).toBeInTheDocument()
    })

    it('displays secondary instruction text', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      // Should have some instruction about what to do
      expect(screen.getByText(/ask a question|start learning|explore/i)).toBeInTheDocument()
    })
  })

  describe('click action', () => {
    it('calls onStartLearning when seed is clicked', () => {
      const onStartLearning = vi.fn()
      const props = createDefaultProps({ onStartLearning })
      render(<TreeSeed {...props} />)

      const seed = screen.getByTestId('tree-seed')
      fireEvent.click(seed)

      expect(onStartLearning).toHaveBeenCalledTimes(1)
    })

    it('calls onStartLearning when CTA button is clicked', () => {
      const onStartLearning = vi.fn()
      const props = createDefaultProps({ onStartLearning })
      render(<TreeSeed {...props} />)

      const ctaButton = screen.getByRole('button')
      fireEvent.click(ctaButton)

      expect(onStartLearning).toHaveBeenCalledTimes(1)
    })

    it('handles undefined onStartLearning gracefully', () => {
      const props = createDefaultProps({ onStartLearning: undefined })
      render(<TreeSeed {...props} />)

      const seed = screen.getByTestId('tree-seed')
      expect(() => fireEvent.click(seed)).not.toThrow()
    })
  })

  describe('animations', () => {
    it('seed has subtle pulsing animation', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      const seedVisual = screen.getByTestId('seed-visual')
      expect(seedVisual.className).toMatch(/animate|pulse|glow/)
    })

    it('has hover effect on seed', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      const seed = screen.getByTestId('tree-seed')
      expect(seed.className).toMatch(/hover:|cursor-pointer/)
    })

    it('seed grows slightly on hover', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      const seedVisual = screen.getByTestId('seed-visual')
      expect(seedVisual.className).toMatch(/hover:scale|transition/)
    })
  })

  describe('visual appearance', () => {
    it('has warm earthy color palette', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      const container = screen.getByTestId('tree-seed')
      // Should have earthy colors (browns, greens)
      expect(container.className).toMatch(/amber|brown|green|emerald/)
    })

    it('seed has recognizable seed shape', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      const seedVisual = screen.getByTestId('seed-visual')
      // Should have rounded/oval shape
      expect(seedVisual.className).toMatch(/rounded|oval/)
    })
  })

  describe('accessibility', () => {
    it('has accessible role', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      const seed = screen.getByTestId('tree-seed')
      expect(seed).toHaveAttribute('role', 'button')
    })

    it('has aria-label describing action', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      const seed = screen.getByTestId('tree-seed')
      expect(seed.getAttribute('aria-label')).toMatch(/start|begin|plant/i)
    })

    it('is keyboard accessible', () => {
      const onStartLearning = vi.fn()
      const props = createDefaultProps({ onStartLearning })
      render(<TreeSeed {...props} />)

      const seed = screen.getByTestId('tree-seed')
      expect(seed).toHaveAttribute('tabIndex', '0')

      fireEvent.keyDown(seed, { key: 'Enter' })
      expect(onStartLearning).toHaveBeenCalled()
    })

    it('CTA button has accessible name', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      const ctaButton = screen.getByRole('button')
      expect(ctaButton).toHaveAccessibleName()
    })
  })

  describe('responsive design', () => {
    it('container fills available space', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      const seed = screen.getByTestId('tree-seed')
      expect(seed.className).toMatch(/w-full|h-full|flex/)
    })

    it('content is centered', () => {
      const props = createDefaultProps()
      render(<TreeSeed {...props} />)

      const seed = screen.getByTestId('tree-seed')
      expect(seed.className).toMatch(/items-center|justify-center/)
    })
  })
})
