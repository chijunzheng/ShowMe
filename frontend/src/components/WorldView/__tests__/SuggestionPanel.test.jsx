/**
 * SuggestionPanel Component Tests
 *
 * TDD tests for the SuggestionPanel component that displays personalized
 * topic suggestions based on the user's world and learning journey.
 *
 * Tests cover:
 * - Rendering with suggestions array
 * - Empty state when no suggestions
 * - Loading state
 * - Suggestion selection callback
 * - Type badges (world_gap, knowledge_bridge, trending, suggested)
 * - Close functionality
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

import SuggestionPanel from '../SuggestionPanel'

// Test fixtures with valid zone values
const mockSuggestions = [
  {
    type: 'world_gap',
    topic: 'Volcanoes',
    reason: 'Your world is missing natural disasters',
    zone: 'nature',
  },
  {
    type: 'knowledge_bridge',
    topic: 'Tectonic Plates',
    reason: 'Connects to your knowledge of earthquakes',
    zone: 'civilization',
  },
  {
    type: 'trending',
    topic: 'Solar Eclipse',
    reason: 'Popular topic this season',
    zone: 'arcane',
  },
]

/**
 * Default props for SuggestionPanel component
 */
const createDefaultProps = (overrides = {}) => ({
  isOpen: true,
  onClose: vi.fn(),
  suggestions: [],
  isLoading: false,
  onSelectTopic: vi.fn(),
  ...overrides,
})

describe('SuggestionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering with suggestions', () => {
    it('renders panel when isOpen is true', () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      // Panel should be visible (look for dialog role)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('does not render panel when isOpen is false', () => {
      const props = createDefaultProps({
        isOpen: false,
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders all provided suggestions', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      // Wait for animation to complete
      await waitFor(() => {
        expect(screen.getByText('Volcanoes')).toBeInTheDocument()
      })

      expect(screen.getByText('Tectonic Plates')).toBeInTheDocument()
      expect(screen.getByText('Solar Eclipse')).toBeInTheDocument()
    })

    it('displays suggestion reasons', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByText(/missing natural disasters/i)).toBeInTheDocument()
      })

      expect(screen.getByText(/connects to your knowledge/i)).toBeInTheDocument()
      expect(screen.getByText(/popular topic this season/i)).toBeInTheDocument()
    })

    it('renders suggestion cards as interactive buttons', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /learn about/i })
        expect(buttons.length).toBe(3)
      })
    })

    it('displays panel title', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByText(/what to learn next/i)).toBeInTheDocument()
      })
    })
  })

  describe('empty state', () => {
    it('shows empty state when suggestions array is empty', async () => {
      const props = createDefaultProps({
        suggestions: [],
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByText(/no suggestions yet/i)).toBeInTheDocument()
      })
    })

    it('displays empty state message with guidance', async () => {
      const props = createDefaultProps({
        suggestions: [],
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByText(/keep learning/i)).toBeInTheDocument()
      })
    })

    it('does not show suggestion cards in empty state', async () => {
      const props = createDefaultProps({
        suggestions: [],
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.queryByText('Volcanoes')).not.toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /learn about/i })).not.toBeInTheDocument()
    })

    it('shows compass emoji in empty state', async () => {
      const props = createDefaultProps({
        suggestions: [],
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('img', { name: /compass/i })).toBeInTheDocument()
      })
    })
  })

  describe('loading state', () => {
    it('shows loading skeleton when isLoading is true', async () => {
      const props = createDefaultProps({
        isLoading: true,
        suggestions: [],
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        // Look for animated skeleton elements
        const panel = screen.getByRole('dialog')
        expect(panel.querySelector('.animate-pulse')).toBeInTheDocument()
      })
    })

    it('does not show suggestions while loading', async () => {
      const props = createDefaultProps({
        isLoading: true,
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.queryByText('Volcanoes')).not.toBeInTheDocument()
      })
    })

    it('does not show empty state while loading', async () => {
      const props = createDefaultProps({
        isLoading: true,
        suggestions: [],
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.queryByText(/no suggestions yet/i)).not.toBeInTheDocument()
      })
    })

    it('displays multiple skeleton cards', async () => {
      const props = createDefaultProps({
        isLoading: true,
        suggestions: [],
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const panel = screen.getByRole('dialog')
        const skeletons = panel.querySelectorAll('.animate-pulse > div')
        expect(skeletons.length).toBeGreaterThan(0)
      })
    })
  })

  describe('suggestion selection', () => {
    it('calls onSelectTopic when a suggestion is clicked', async () => {
      const onSelectTopic = vi.fn()
      const props = createDefaultProps({
        suggestions: mockSuggestions,
        onSelectTopic,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const volcanoButton = screen.getByRole('button', { name: /learn about volcanoes/i })
        fireEvent.click(volcanoButton)
      })

      // onSelectTopic is called after a delay (200ms for animation)
      await waitFor(() => {
        expect(onSelectTopic).toHaveBeenCalled()
      }, { timeout: 500 })
    })

    it('passes the selected topic name to onSelectTopic', async () => {
      const onSelectTopic = vi.fn()
      const props = createDefaultProps({
        suggestions: mockSuggestions,
        onSelectTopic,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const volcanoButton = screen.getByRole('button', { name: /learn about volcanoes/i })
        fireEvent.click(volcanoButton)
      })

      await waitFor(() => {
        expect(onSelectTopic).toHaveBeenCalledWith('Volcanoes')
      }, { timeout: 500 })
    })

    it('passes correct topic for each suggestion click', async () => {
      const onSelectTopic = vi.fn()
      const props = createDefaultProps({
        suggestions: mockSuggestions,
        onSelectTopic,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const tectonicButton = screen.getByRole('button', { name: /learn about tectonic plates/i })
        fireEvent.click(tectonicButton)
      })

      await waitFor(() => {
        expect(onSelectTopic).toHaveBeenCalledWith('Tectonic Plates')
      }, { timeout: 500 })
    })

    it('suggestions respond to Enter key', async () => {
      const onSelectTopic = vi.fn()
      const props = createDefaultProps({
        suggestions: mockSuggestions,
        onSelectTopic,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const volcanoButton = screen.getByRole('button', { name: /learn about volcanoes/i })
        fireEvent.keyDown(volcanoButton, { key: 'Enter' })
      })

      await waitFor(() => {
        expect(onSelectTopic).toHaveBeenCalled()
      }, { timeout: 500 })
    })

    it('suggestions respond to Space key', async () => {
      const onSelectTopic = vi.fn()
      const props = createDefaultProps({
        suggestions: mockSuggestions,
        onSelectTopic,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const volcanoButton = screen.getByRole('button', { name: /learn about volcanoes/i })
        fireEvent.keyDown(volcanoButton, { key: ' ' })
      })

      await waitFor(() => {
        expect(onSelectTopic).toHaveBeenCalled()
      }, { timeout: 500 })
    })
  })

  describe('suggestion type badges', () => {
    it('displays Fill Gap badge for world_gap suggestions', async () => {
      const props = createDefaultProps({
        suggestions: [mockSuggestions[0]], // world_gap type
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Fill Gap')).toBeInTheDocument()
      })
    })

    it('displays Bridge badge for knowledge_bridge suggestions', async () => {
      const props = createDefaultProps({
        suggestions: [mockSuggestions[1]], // knowledge_bridge type
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Bridge')).toBeInTheDocument()
      })
    })

    it('displays Trending badge for trending suggestions', async () => {
      const props = createDefaultProps({
        suggestions: [mockSuggestions[2]], // trending type
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Trending')).toBeInTheDocument()
      })
    })

    it('displays Suggested badge for suggested type', async () => {
      const props = createDefaultProps({
        suggestions: [
          { type: 'suggested', topic: 'Generic', reason: 'A suggestion', zone: 'nature' },
        ],
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Suggested')).toBeInTheDocument()
      })
    })

    it('defaults to Suggested for unknown type', async () => {
      const props = createDefaultProps({
        suggestions: [
          { type: 'unknown_type', topic: 'Topic', reason: 'Reason', zone: 'nature' },
        ],
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Suggested')).toBeInTheDocument()
      })
    })
  })

  describe('zone display', () => {
    it('displays zone name for each suggestion', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByText('nature')).toBeInTheDocument()
        expect(screen.getByText('civilization')).toBeInTheDocument()
        expect(screen.getByText('arcane')).toBeInTheDocument()
      })
    })

    it('displays zone with appropriate styling', async () => {
      const props = createDefaultProps({
        suggestions: [mockSuggestions[0]], // nature zone
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const zoneText = screen.getByText('nature')
        expect(zoneText.className).toMatch(/text-green/)
      })
    })
  })

  describe('close functionality', () => {
    it('renders close button', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
      })
    })

    it('calls onClose when close button is clicked', async () => {
      const onClose = vi.fn()
      const props = createDefaultProps({
        suggestions: mockSuggestions,
        onClose,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i })
        fireEvent.click(closeButton)
      })

      // onClose is called after animation delay
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      }, { timeout: 500 })
    })

    it('dismisses on Escape key press', async () => {
      const onClose = vi.fn()
      const props = createDefaultProps({
        suggestions: mockSuggestions,
        onClose,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      fireEvent.keyDown(document, { key: 'Escape' })

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      }, { timeout: 500 })
    })

    it('dismisses when clicking backdrop', async () => {
      const onClose = vi.fn()
      const props = createDefaultProps({
        suggestions: mockSuggestions,
        onClose,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        // Click on the dialog container (backdrop)
        const dialog = screen.getByRole('dialog')
        fireEvent.click(dialog)
      })

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      }, { timeout: 500 })
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA role for the panel', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAttribute('aria-modal', 'true')
      })
    })

    it('has aria-labelledby pointing to title', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAttribute('aria-labelledby', 'suggestion-panel-title')
      })
    })

    it('suggestions have accessible names', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        mockSuggestions.forEach((suggestion) => {
          expect(
            screen.getByRole('button', { name: new RegExp(`learn about ${suggestion.topic}`, 'i') })
          ).toBeInTheDocument()
        })
      })
    })

    it('close button has accessible name', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close suggestions/i })).toBeInTheDocument()
      })
    })

    it('has visible focus indicators', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /learn about volcanoes/i })
        expect(button.className).toMatch(/focus:/)
      })
    })
  })

  describe('styling', () => {
    it('applies rounded corners to panel', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        const panel = dialog.querySelector('[class*="rounded-t"]')
        expect(panel).toBeInTheDocument()
      })
    })

    it('suggestion cards have hover states', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /learn about volcanoes/i })
        expect(button.className).toMatch(/hover:/)
      })
    })

    it('has backdrop blur effect', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        const backdrop = dialog.querySelector('[class*="backdrop-blur"]')
        expect(backdrop).toBeInTheDocument()
      })
    })
  })

  describe('single suggestion', () => {
    it('renders correctly with only one suggestion', async () => {
      const props = createDefaultProps({
        suggestions: [mockSuggestions[0]],
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Volcanoes')).toBeInTheDocument()
      })

      expect(screen.queryByText('Tectonic Plates')).not.toBeInTheDocument()
    })
  })

  describe('panel transitions', () => {
    it('applies opacity transition classes', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog.className).toMatch(/transition-opacity/)
      })
    })

    it('applies transform transition to panel', async () => {
      const props = createDefaultProps({
        suggestions: mockSuggestions,
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        const panel = dialog.querySelector('[class*="transition-transform"]')
        expect(panel).toBeInTheDocument()
      })
    })
  })

  describe('SuggestionCard', () => {
    it('applies zone-specific background color', async () => {
      const props = createDefaultProps({
        suggestions: [
          { type: 'trending', topic: 'Nature Topic', reason: 'Reason', zone: 'nature' },
        ],
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /learn about nature topic/i })
        expect(button.className).toMatch(/bg-green/)
      })
    })

    it('applies type-specific badge styling for world_gap', async () => {
      const props = createDefaultProps({
        suggestions: [mockSuggestions[0]], // world_gap
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const badge = screen.getByText('Fill Gap')
        expect(badge.className).toMatch(/bg-red|text-red/)
      })
    })

    it('applies type-specific badge styling for knowledge_bridge', async () => {
      const props = createDefaultProps({
        suggestions: [mockSuggestions[1]], // knowledge_bridge
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const badge = screen.getByText('Bridge')
        expect(badge.className).toMatch(/bg-blue|text-blue/)
      })
    })

    it('applies type-specific badge styling for trending', async () => {
      const props = createDefaultProps({
        suggestions: [mockSuggestions[2]], // trending
      })

      render(<SuggestionPanel {...props} />)

      await waitFor(() => {
        const badge = screen.getByText('Trending')
        expect(badge.className).toMatch(/bg-orange|text-orange/)
      })
    })
  })
})
