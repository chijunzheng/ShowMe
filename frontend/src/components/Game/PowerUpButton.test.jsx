/**
 * PowerUpButton Component Tests
 *
 * TDD: Tests for individual power-up button with activation behavior.
 * PHASE-5: Power-Ups System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PowerUpButton from './PowerUpButton'

describe('PowerUpButton', () => {
  const defaultPowerUp = {
    id: 'hint_boost',
    name: 'Hint',
    icon: '?',
    description: 'Get a helpful hint on your next question',
  }

  const mockOnActivate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders power-up icon', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={3}
          onActivate={mockOnActivate}
        />
      )

      expect(screen.getByText('?')).toBeInTheDocument()
    })

    it('renders power-up name', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={3}
          onActivate={mockOnActivate}
        />
      )

      expect(screen.getByText('Hint')).toBeInTheDocument()
    })

    it('renders quantity badge when count > 0', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={5}
          onActivate={mockOnActivate}
        />
      )

      expect(screen.getByTestId('power-up-count')).toHaveTextContent('5')
    })

    it('renders 0 count badge when count is 0', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={0}
          onActivate={mockOnActivate}
        />
      )

      expect(screen.getByTestId('power-up-count')).toHaveTextContent('0')
    })

    it('renders with xp_multiplier power-up', () => {
      const xpPowerUp = {
        id: 'xp_multiplier',
        name: '2x XP',
        icon: '*',
        description: 'Double XP for 60 seconds',
      }

      render(
        <PowerUpButton
          powerUp={xpPowerUp}
          count={1}
          onActivate={mockOnActivate}
        />
      )

      expect(screen.getByText('2x XP')).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('calls onActivate with power-up id when clicked', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={3}
          onActivate={mockOnActivate}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      expect(mockOnActivate).toHaveBeenCalledTimes(1)
      expect(mockOnActivate).toHaveBeenCalledWith('hint_boost')
    })

    it('does not call onActivate when disabled', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={3}
          onActivate={mockOnActivate}
          disabled={true}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      expect(mockOnActivate).not.toHaveBeenCalled()
    })

    it('does not call onActivate when count is 0', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={0}
          onActivate={mockOnActivate}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      expect(mockOnActivate).not.toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('applies disabled styling when disabled prop is true', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={3}
          onActivate={mockOnActivate}
          disabled={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('opacity-50')
      expect(button).toBeDisabled()
    })

    it('applies disabled styling when count is 0', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={0}
          onActivate={mockOnActivate}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('opacity-50')
      expect(button).toBeDisabled()
    })

    it('is enabled when count > 0 and not disabled', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={1}
          onActivate={mockOnActivate}
          disabled={false}
        />
      )

      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
      expect(button).not.toHaveClass('opacity-50')
    })
  })

  describe('active state', () => {
    it('shows active indicator when isActive is true', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={3}
          onActivate={mockOnActivate}
          isActive={true}
        />
      )

      expect(screen.getByTestId('active-indicator')).toBeInTheDocument()
    })

    it('does not show active indicator when isActive is false', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={3}
          onActivate={mockOnActivate}
          isActive={false}
        />
      )

      expect(screen.queryByTestId('active-indicator')).not.toBeInTheDocument()
    })

    it('is disabled when effect is already active', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={3}
          onActivate={mockOnActivate}
          isActive={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  describe('tooltip', () => {
    it('has accessible title with description', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={3}
          onActivate={mockOnActivate}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', defaultPowerUp.description)
    })
  })

  describe('accessibility', () => {
    it('has appropriate aria-label', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={3}
          onActivate={mockOnActivate}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Activate Hint power-up (3 remaining)')
    })

    it('updates aria-label when disabled', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={0}
          onActivate={mockOnActivate}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Hint power-up (none available)')
    })

    it('updates aria-label when active', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={3}
          onActivate={mockOnActivate}
          isActive={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Hint power-up (active)')
    })
  })

  describe('animation', () => {
    it('applies pulse animation class when available and not active', () => {
      render(
        <PowerUpButton
          powerUp={defaultPowerUp}
          count={3}
          onActivate={mockOnActivate}
          isActive={false}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:scale-105')
    })
  })
})
