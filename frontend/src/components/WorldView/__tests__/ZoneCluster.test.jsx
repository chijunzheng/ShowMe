/**
 * ZoneCluster Component Tests
 *
 * TDD tests for the ZoneCluster component that displays a cluster
 * representing multiple grouped pieces within a zone.
 *
 * Tests cover:
 * - Rendering with correct piece count
 * - Shows correct icons for pieces
 * - Applies zone-specific styling (nature=green, civilization=indigo, arcane=purple)
 * - onClick is called with cluster data
 * - Keyboard accessible (Enter/Space triggers onClick)
 * - Hover state visual changes
 * - Handles edge case of 0 pieces gracefully
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

import ZoneCluster from '../ZoneCluster'

// Test fixtures for pieces
const createMockPiece = (overrides = {}) => ({
  id: `piece-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Piece',
  zone: 'nature',
  icon: '🌿',
  imageUrl: null,
  tier: 'seedling',
  ...overrides,
})

const createMockPieces = (count, zone = 'nature') => {
  const icons = {
    nature: ['🌿', '🌳', '🦋', '🌺', '🍄'],
    civilization: ['🏛️', '🏰', '🌉', '🚂', '🗼'],
    arcane: ['✨', '🔮', '🌙', '⭐', '🪐'],
  }

  return Array.from({ length: count }, (_, index) => createMockPiece({
    id: `piece-${index}`,
    name: `Piece ${index + 1}`,
    zone,
    icon: icons[zone]?.[index % 5] || '?',
  }))
}

/**
 * Default props for ZoneCluster component
 */
const createDefaultProps = (overrides = {}) => ({
  pieces: createMockPieces(5, 'nature'),
  label: 'Ocean Life',
  zone: 'nature',
  onClick: vi.fn(),
  ...overrides,
})

describe('ZoneCluster', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering with pieces', () => {
    it('renders cluster container', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('displays count badge with correct number of pieces', () => {
      const props = createDefaultProps({
        pieces: createMockPieces(7, 'nature'),
      })

      render(<ZoneCluster {...props} />)

      expect(screen.getByTestId('cluster-count')).toHaveTextContent('+7')
    })

    it('displays count badge for 3 pieces', () => {
      const props = createDefaultProps({
        pieces: createMockPieces(3, 'nature'),
      })

      render(<ZoneCluster {...props} />)

      expect(screen.getByTestId('cluster-count')).toHaveTextContent('+3')
    })

    it('displays count badge for large numbers', () => {
      const props = createDefaultProps({
        pieces: createMockPieces(25, 'nature'),
      })

      render(<ZoneCluster {...props} />)

      expect(screen.getByTestId('cluster-count')).toHaveTextContent('+25')
    })

    it('displays cluster label', () => {
      const props = createDefaultProps({
        label: 'Space Exploration',
      })

      render(<ZoneCluster {...props} />)

      // Label should be accessible via aria-label or visible text
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Space Exploration'))
    })
  })

  describe('piece icons display', () => {
    it('shows up to 3 piece icons stacked', () => {
      const pieces = createMockPieces(5, 'nature')
      const props = createDefaultProps({ pieces })

      render(<ZoneCluster {...props} />)

      // Should render icon container
      const iconStack = screen.getByTestId('cluster-icon-stack')
      expect(iconStack).toBeInTheDocument()

      // Should show exactly 3 icons even though we have 5 pieces
      const icons = iconStack.querySelectorAll('[data-testid="cluster-icon"]')
      expect(icons.length).toBe(3)
    })

    it('shows correct icons from pieces', () => {
      const pieces = [
        createMockPiece({ id: '1', icon: '🐠', zone: 'nature' }),
        createMockPiece({ id: '2', icon: '🐙', zone: 'nature' }),
        createMockPiece({ id: '3', icon: '🦈', zone: 'nature' }),
        createMockPiece({ id: '4', icon: '🐳', zone: 'nature' }),
      ]
      const props = createDefaultProps({ pieces })

      render(<ZoneCluster {...props} />)

      // First 3 icons should be displayed
      expect(screen.getByText('🐠')).toBeInTheDocument()
      expect(screen.getByText('🐙')).toBeInTheDocument()
      expect(screen.getByText('🦈')).toBeInTheDocument()
      // 4th icon should NOT be displayed
      expect(screen.queryByText('🐳')).not.toBeInTheDocument()
    })

    it('shows 2 icons when only 2 pieces exist', () => {
      const pieces = createMockPieces(2, 'nature')
      const props = createDefaultProps({ pieces })

      render(<ZoneCluster {...props} />)

      const iconStack = screen.getByTestId('cluster-icon-stack')
      const icons = iconStack.querySelectorAll('[data-testid="cluster-icon"]')
      expect(icons.length).toBe(2)
    })

    it('shows 1 icon when only 1 piece exists', () => {
      const pieces = createMockPieces(1, 'nature')
      const props = createDefaultProps({ pieces })

      render(<ZoneCluster {...props} />)

      const iconStack = screen.getByTestId('cluster-icon-stack')
      const icons = iconStack.querySelectorAll('[data-testid="cluster-icon"]')
      expect(icons.length).toBe(1)
    })

    it('applies stacked/overlapping styling to icons', () => {
      const pieces = createMockPieces(4, 'nature')
      const props = createDefaultProps({ pieces })

      render(<ZoneCluster {...props} />)

      const iconStack = screen.getByTestId('cluster-icon-stack')
      // Should have relative positioning and z-index layering
      expect(iconStack.className).toMatch(/relative|flex/)
    })
  })

  describe('zone-specific styling', () => {
    it('applies green styling for nature zone', () => {
      const props = createDefaultProps({
        zone: 'nature',
        pieces: createMockPieces(5, 'nature'),
      })

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/green|emerald/)
    })

    it('applies indigo styling for civilization zone', () => {
      const props = createDefaultProps({
        zone: 'civilization',
        pieces: createMockPieces(5, 'civilization'),
      })

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/indigo|primary/)
    })

    it('applies purple styling for arcane zone', () => {
      const props = createDefaultProps({
        zone: 'arcane',
        pieces: createMockPieces(5, 'arcane'),
      })

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/purple|violet/)
    })

    it('applies default styling for unknown zone', () => {
      const props = createDefaultProps({
        zone: 'unknown',
        pieces: createMockPieces(5, 'nature'),
      })

      render(<ZoneCluster {...props} />)

      // Should not crash and should render
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('has zone-specific border color', () => {
      const props = createDefaultProps({
        zone: 'nature',
        pieces: createMockPieces(3, 'nature'),
      })

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/border/)
    })
  })

  describe('onClick handling', () => {
    it('calls onClick when cluster is clicked', () => {
      const onClick = vi.fn()
      const pieces = createMockPieces(5, 'nature')
      const props = createDefaultProps({
        pieces,
        label: 'Ocean Life',
        zone: 'nature',
        onClick,
      })

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('passes cluster data to onClick callback', () => {
      const onClick = vi.fn()
      const pieces = createMockPieces(4, 'civilization')
      const props = createDefaultProps({
        pieces,
        label: 'Ancient Wonders',
        zone: 'civilization',
        onClick,
      })

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onClick).toHaveBeenCalledWith({
        pieces,
        label: 'Ancient Wonders',
        zone: 'civilization',
      })
    })

    it('does not crash when onClick is not provided', () => {
      const pieces = createMockPieces(3, 'nature')
      const props = {
        pieces,
        label: 'Test Cluster',
        zone: 'nature',
        // onClick intentionally omitted
      }

      expect(() => {
        render(<ZoneCluster {...props} />)
        const button = screen.getByRole('button')
        fireEvent.click(button)
      }).not.toThrow()
    })
  })

  describe('keyboard accessibility', () => {
    it('triggers onClick when Enter key is pressed', () => {
      const onClick = vi.fn()
      const props = createDefaultProps({ onClick })

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter' })

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('triggers onClick when Space key is pressed', () => {
      const onClick = vi.fn()
      const props = createDefaultProps({ onClick })

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: ' ' })

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not trigger onClick for other keys', () => {
      const onClick = vi.fn()
      const props = createDefaultProps({ onClick })

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Escape' })
      fireEvent.keyDown(button, { key: 'Tab' })
      fireEvent.keyDown(button, { key: 'a' })

      expect(onClick).not.toHaveBeenCalled()
    })

    it('has tabIndex for keyboard focus', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('tabIndex', '0')
    })

    it('has visible focus indicator styles', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/focus:/)
    })

    it('has accessible aria-label describing the cluster', () => {
      const pieces = createMockPieces(8, 'arcane')
      const props = createDefaultProps({
        pieces,
        label: 'Cosmic Mysteries',
        zone: 'arcane',
      })

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Cosmic Mysteries'))
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('8'))
    })
  })

  describe('hover state', () => {
    it('applies scale animation on hover', async () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')

      // Initial state - should have hover transition classes
      expect(button.className).toMatch(/hover:scale/)
    })

    it('has transition classes for smooth hover effects', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/transition/)
    })

    it('shows enhanced shadow on hover', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/hover:shadow/)
    })

    it('changes state when mouse enters', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      fireEvent.mouseEnter(button)

      // Component should handle hover state internally
      // The hover class changes are CSS-based via Tailwind
      expect(button).toBeInTheDocument()
    })

    it('reverts state when mouse leaves', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      fireEvent.mouseEnter(button)
      fireEvent.mouseLeave(button)

      // Component should handle hover state internally
      expect(button).toBeInTheDocument()
    })
  })

  describe('edge case: 0 pieces', () => {
    it('handles empty pieces array gracefully', () => {
      const props = createDefaultProps({
        pieces: [],
      })

      expect(() => {
        render(<ZoneCluster {...props} />)
      }).not.toThrow()
    })

    it('displays count badge with +0 for empty array', () => {
      const props = createDefaultProps({
        pieces: [],
      })

      render(<ZoneCluster {...props} />)

      expect(screen.getByTestId('cluster-count')).toHaveTextContent('+0')
    })

    it('shows no icons when pieces array is empty', () => {
      const props = createDefaultProps({
        pieces: [],
      })

      render(<ZoneCluster {...props} />)

      const iconStack = screen.getByTestId('cluster-icon-stack')
      const icons = iconStack.querySelectorAll('[data-testid="cluster-icon"]')
      expect(icons.length).toBe(0)
    })

    it('onClick still works with empty pieces', () => {
      const onClick = vi.fn()
      const props = createDefaultProps({
        pieces: [],
        onClick,
      })

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onClick).toHaveBeenCalledWith({
        pieces: [],
        label: 'Ocean Life',
        zone: 'nature',
      })
    })

    it('handles undefined pieces gracefully', () => {
      const props = {
        label: 'Test Cluster',
        zone: 'nature',
        onClick: vi.fn(),
        // pieces intentionally omitted
      }

      expect(() => {
        render(<ZoneCluster {...props} />)
      }).not.toThrow()
    })
  })

  describe('styling and visual design', () => {
    it('has rounded corners', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/rounded/)
    })

    it('has shadow for depth effect', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/shadow/)
    })

    it('has background color', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/bg-/)
    })

    it('count badge is positioned correctly', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const countBadge = screen.getByTestId('cluster-count')
      expect(countBadge.className).toMatch(/absolute/)
    })

    it('count badge has contrasting colors for visibility', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const countBadge = screen.getByTestId('cluster-count')
      // Should have background and text color for contrast
      expect(countBadge.className).toMatch(/bg-/)
    })
  })

  describe('component structure', () => {
    it('renders as a button element for semantics', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('contains icon stack container', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      expect(screen.getByTestId('cluster-icon-stack')).toBeInTheDocument()
    })

    it('contains count badge', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      expect(screen.getByTestId('cluster-count')).toBeInTheDocument()
    })
  })

  describe('different piece configurations', () => {
    it('handles pieces with imageUrl instead of icon', () => {
      const pieces = [
        createMockPiece({
          id: '1',
          icon: null,
          imageUrl: 'https://example.com/fish.png',
          zone: 'nature',
        }),
        createMockPiece({
          id: '2',
          icon: '🐙',
          zone: 'nature',
        }),
      ]
      const props = createDefaultProps({ pieces })

      render(<ZoneCluster {...props} />)

      // Should render without crashing
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('handles pieces with missing icon property', () => {
      const pieces = [
        { id: '1', name: 'Piece 1', zone: 'nature' },
        { id: '2', name: 'Piece 2', zone: 'nature' },
      ]
      const props = createDefaultProps({ pieces })

      render(<ZoneCluster {...props} />)

      // Should render fallback icon
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('handles mixed zone pieces within cluster', () => {
      const pieces = [
        createMockPiece({ id: '1', zone: 'nature', icon: '🌿' }),
        createMockPiece({ id: '2', zone: 'civilization', icon: '🏛️' }),
        createMockPiece({ id: '3', zone: 'arcane', icon: '✨' }),
      ]
      const props = createDefaultProps({
        pieces,
        zone: 'nature', // Cluster zone determines styling
      })

      render(<ZoneCluster {...props} />)

      // Should use cluster zone for styling, not piece zones
      const button = screen.getByRole('button')
      expect(button.className).toMatch(/green|emerald/)
    })
  })

  describe('responsive design', () => {
    it('has responsive sizing classes', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      // Should have responsive sizing (sm:, md:, etc.)
      expect(button.className).toMatch(/w-|h-/)
    })

    it('icons have appropriate sizing', () => {
      const pieces = createMockPieces(3, 'nature')
      const props = createDefaultProps({ pieces })

      render(<ZoneCluster {...props} />)

      const icons = screen.getAllByTestId('cluster-icon')
      icons.forEach(icon => {
        expect(icon.className).toMatch(/w-|h-|text-/)
      })
    })
  })

  describe('animation classes', () => {
    it('has entrance animation class', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      // Should have animation or transition classes
      expect(button.className).toMatch(/transition|animate/)
    })

    it('has duration class for animations', () => {
      const props = createDefaultProps()

      render(<ZoneCluster {...props} />)

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/duration/)
    })
  })
})
