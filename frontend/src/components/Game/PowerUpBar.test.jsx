/**
 * PowerUpBar Component Tests
 *
 * TDD: Tests for horizontal power-up bar showing available power-ups.
 * PHASE-5: Power-Ups System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PowerUpBar from './PowerUpBar'

describe('PowerUpBar', () => {
  const mockInventory = {
    hint_boost: 3,
    xp_multiplier: 1,
    skip_token: 0,
  }

  const mockActiveEffects = []
  const mockOnActivatePowerUp = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders all available power-up types', () => {
      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={mockActiveEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      // Should show power-up buttons for each type
      expect(screen.getByText('Hint')).toBeInTheDocument()
      expect(screen.getByText('2x XP')).toBeInTheDocument()
      expect(screen.getByText('Skip')).toBeInTheDocument()
    })

    it('displays correct counts for each power-up', () => {
      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={mockActiveEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      const counts = screen.getAllByTestId('power-up-count')
      const countValues = counts.map(c => c.textContent)

      expect(countValues).toContain('3')
      expect(countValues).toContain('1')
      expect(countValues).toContain('0')
    })

    it('renders in horizontal layout', () => {
      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={mockActiveEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      const container = screen.getByTestId('power-up-bar')
      expect(container).toHaveClass('flex')
    })

    it('renders with empty inventory', () => {
      render(
        <PowerUpBar
          inventory={{}}
          activeEffects={mockActiveEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      // Should still show all power-up types with 0 count
      expect(screen.getByText('Hint')).toBeInTheDocument()
      expect(screen.getByText('2x XP')).toBeInTheDocument()
      expect(screen.getByText('Skip')).toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('calls onActivatePowerUp when power-up is clicked', () => {
      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={mockActiveEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      // Click the hint button
      fireEvent.click(screen.getByText('Hint').closest('button'))

      expect(mockOnActivatePowerUp).toHaveBeenCalledWith('hint_boost')
    })

    it('does not call onActivatePowerUp for empty power-ups', () => {
      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={mockActiveEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      // Click the skip button (count is 0)
      fireEvent.click(screen.getByText('Skip').closest('button'))

      expect(mockOnActivatePowerUp).not.toHaveBeenCalled()
    })
  })

  describe('active effects', () => {
    it('shows active indicator for active power-ups', () => {
      const activeEffects = [
        { id: 'xp_multiplier', expiresAt: Date.now() + 60000, multiplier: 2 },
      ]

      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={activeEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      expect(screen.getByTestId('active-indicator')).toBeInTheDocument()
    })

    it('disables button for active timed effects', () => {
      const activeEffects = [
        { id: 'xp_multiplier', expiresAt: Date.now() + 60000, multiplier: 2 },
      ]

      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={activeEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      const xpButton = screen.getByText('2x XP').closest('button')
      expect(xpButton).toBeDisabled()
    })

    it('shows remaining time for active effects', () => {
      const activeEffects = [
        { id: 'xp_multiplier', expiresAt: Date.now() + 45000, multiplier: 2, remainingMs: 45000 },
      ]

      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={activeEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      // Should show time remaining in some form
      expect(screen.getByTestId('effect-timer')).toBeInTheDocument()
    })
  })

  describe('responsive layout', () => {
    it('has compact mobile-friendly spacing', () => {
      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={mockActiveEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      const container = screen.getByTestId('power-up-bar')
      expect(container).toHaveClass('gap-2')
    })

    it('renders with appropriate sizing for touch targets', () => {
      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={mockActiveEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        // Buttons should have min-height for touch (via Tailwind classes)
        expect(button).toHaveClass('min-h-[44px]')
      })
    })
  })

  describe('edge cases', () => {
    it('handles null inventory gracefully', () => {
      render(
        <PowerUpBar
          inventory={null}
          activeEffects={mockActiveEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      // Should render without crashing
      expect(screen.getByTestId('power-up-bar')).toBeInTheDocument()
    })

    it('handles null activeEffects gracefully', () => {
      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={null}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      // Should render without crashing
      expect(screen.getByTestId('power-up-bar')).toBeInTheDocument()
    })

    it('handles undefined onActivatePowerUp gracefully', () => {
      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={mockActiveEffects}
        />
      )

      // Click should not throw
      expect(() => {
        fireEvent.click(screen.getByText('Hint').closest('button'))
      }).not.toThrow()
    })
  })

  describe('power-up definitions', () => {
    it('includes hint_boost power-up with correct icon', () => {
      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={mockActiveEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      // Check that hint has lightbulb-like icon
      expect(screen.getByTestId('powerup-icon-hint_boost')).toBeInTheDocument()
    })

    it('includes xp_multiplier power-up with correct icon', () => {
      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={mockActiveEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      expect(screen.getByTestId('powerup-icon-xp_multiplier')).toBeInTheDocument()
    })

    it('includes skip_token power-up with correct icon', () => {
      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={mockActiveEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      expect(screen.getByTestId('powerup-icon-skip_token')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has appropriate role and label for the container', () => {
      render(
        <PowerUpBar
          inventory={mockInventory}
          activeEffects={mockActiveEffects}
          onActivatePowerUp={mockOnActivatePowerUp}
        />
      )

      const container = screen.getByTestId('power-up-bar')
      expect(container).toHaveAttribute('role', 'toolbar')
      expect(container).toHaveAttribute('aria-label', 'Power-ups')
    })
  })
})
