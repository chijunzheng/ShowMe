/**
 * StoryChoiceCard Component Tests
 *
 * Tests for individual story choice card with tap interaction.
 * Displays emoji, narrative text, concept hints, and handles selected/disabled states.
 *
 * Test coverage includes:
 * - Choice text and emoji rendering
 * - Concept hint badges
 * - onSelect callback behavior
 * - Haptics and sound effects on tap
 * - Disabled and selected states
 * - Checkmark indicator
 *
 * @vitest-environment jsdom
 */

import { StrictMode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import StoryChoiceCard from '../StoryChoiceCard'

// Mock haptics and sound effects
vi.mock('../../../../utils/haptics', () => ({
  vibrateShort: vi.fn(),
}))

vi.mock('../../../../utils/soundEffects', () => ({
  playSelectSound: vi.fn(),
}))

describe('StoryChoiceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('basic rendering', () => {
    it('renders choice text', () => {
      const choice = {
        id: 'c1',
        text: 'Follow the mysterious sound into the forest.',
      }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} onSelect={() => {}} />
        </StrictMode>
      )

      expect(screen.getByText('Follow the mysterious sound into the forest.')).toBeInTheDocument()
    })

    it('renders choice emoji when provided', () => {
      const choice = {
        id: 'c1',
        emoji: '🌲',
        text: 'Explore the forest.',
      }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} onSelect={() => {}} />
        </StrictMode>
      )

      expect(screen.getByText('🌲')).toBeInTheDocument()
    })

    it('renders default 📖 emoji when not provided', () => {
      const choice = {
        id: 'c1',
        text: 'Make a choice.',
      }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} onSelect={() => {}} />
        </StrictMode>
      )

      expect(screen.getByText('📖')).toBeInTheDocument()
    })
  })

  describe('concept hint badges', () => {
    it('renders concept hint badges when conceptHints present', () => {
      const choice = {
        id: 'c1',
        text: 'Use energy to move forward.',
        conceptHints: ['Energy', 'Motion'],
      }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} onSelect={() => {}} />
        </StrictMode>
      )

      expect(screen.getByText('Energy')).toBeInTheDocument()
      expect(screen.getByText('Motion')).toBeInTheDocument()
    })

    it('does not render concept hints when empty', () => {
      const choice = {
        id: 'c1',
        text: 'Make a choice.',
        conceptHints: [],
      }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} onSelect={() => {}} />
        </StrictMode>
      )

      // Should only have the choice text, no concept badges
      const container = screen.getByRole('button')
      expect(container.textContent).toBe('📖Make a choice.')
    })

    it('does not render concept hints when missing', () => {
      const choice = {
        id: 'c1',
        text: 'Make a choice.',
      }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} onSelect={() => {}} />
        </StrictMode>
      )

      const container = screen.getByRole('button')
      expect(container.textContent).toBe('📖Make a choice.')
    })
  })

  describe('onSelect callback', () => {
    it('calls onSelect with the choice object when clicked', () => {
      const onSelect = vi.fn()
      const choice = {
        id: 'c1',
        text: 'Test choice',
      }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} onSelect={onSelect} />
        </StrictMode>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect).toHaveBeenCalledWith(choice)
    })

    it('calls vibrateShort on click', async () => {
      const { vibrateShort } = await import('../../../../utils/haptics')
      const choice = { id: 'c1', text: 'Test' }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} onSelect={() => {}} />
        </StrictMode>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(vibrateShort).toHaveBeenCalledTimes(1)
    })

    it('calls playSelectSound on click', async () => {
      const { playSelectSound } = await import('../../../../utils/soundEffects')
      const choice = { id: 'c1', text: 'Test' }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} onSelect={() => {}} />
        </StrictMode>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(playSelectSound).toHaveBeenCalledTimes(1)
    })
  })

  describe('disabled state', () => {
    it('does NOT call onSelect when isDisabled is true', () => {
      const onSelect = vi.fn()
      const choice = { id: 'c1', text: 'Test' }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} isDisabled={true} onSelect={onSelect} />
        </StrictMode>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onSelect).not.toHaveBeenCalled()
    })

    it('button has disabled attribute when isDisabled', () => {
      const choice = { id: 'c1', text: 'Test' }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} isDisabled={true} onSelect={() => {}} />
        </StrictMode>
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('button is NOT disabled by default', () => {
      const choice = { id: 'c1', text: 'Test' }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} onSelect={() => {}} />
        </StrictMode>
      )

      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })
  })

  describe('selected state', () => {
    it('does NOT call onSelect when isSelected is true', () => {
      const onSelect = vi.fn()
      const choice = { id: 'c1', text: 'Test' }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} isSelected={true} onSelect={onSelect} />
        </StrictMode>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onSelect).not.toHaveBeenCalled()
    })

    it('shows checkmark indicator when isSelected', () => {
      const choice = { id: 'c1', text: 'Test' }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} isSelected={true} onSelect={() => {}} />
        </StrictMode>
      )

      const button = screen.getByRole('button')
      // Checkmark is rendered as SVG, check for presence
      const svg = button.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('does not show checkmark when not selected', () => {
      const choice = { id: 'c1', text: 'Test' }

      render(
        <StrictMode>
          <StoryChoiceCard choice={choice} isSelected={false} onSelect={() => {}} />
        </StrictMode>
      )

      const button = screen.getByRole('button')
      const svg = button.querySelector('svg')
      expect(svg).not.toBeInTheDocument()
    })
  })

  describe('complete rendering', () => {
    it('renders all elements when fully configured', () => {
      const choice = {
        id: 'c1',
        emoji: '⚡',
        text: 'Channel energy into motion.',
        conceptHints: ['Energy', 'Motion'],
      }

      render(
        <StrictMode>
          <StoryChoiceCard
            choice={choice}
            isSelected={true}
            isDisabled={false}
            onSelect={() => {}}
          />
        </StrictMode>
      )

      expect(screen.getByText('⚡')).toBeInTheDocument()
      expect(screen.getByText('Channel energy into motion.')).toBeInTheDocument()
      expect(screen.getByText('Energy')).toBeInTheDocument()
      expect(screen.getByText('Motion')).toBeInTheDocument()

      const button = screen.getByRole('button')
      const svg = button.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles missing onSelect gracefully', () => {
      const choice = { id: 'c1', text: 'Test' }

      expect(() => {
        render(
          <StrictMode>
            <StoryChoiceCard choice={choice} />
          </StrictMode>
        )
      }).not.toThrow()

      const button = screen.getByRole('button')
      expect(() => {
        fireEvent.click(button)
      }).not.toThrow()
    })

    it('handles both isDisabled and isSelected together', () => {
      const onSelect = vi.fn()
      const choice = { id: 'c1', text: 'Test' }

      render(
        <StrictMode>
          <StoryChoiceCard
            choice={choice}
            isDisabled={true}
            isSelected={true}
            onSelect={onSelect}
          />
        </StrictMode>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onSelect).not.toHaveBeenCalled()
      expect(button).toBeDisabled()
    })
  })
})
