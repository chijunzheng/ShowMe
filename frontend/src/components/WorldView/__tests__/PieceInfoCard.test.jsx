/**
 * PieceInfoCard Component Tests
 *
 * TDD tests for the PieceInfoCard component that displays piece details
 * in a modal overlay when user taps a world piece.
 *
 * Tests cover:
 * - Basic rendering and piece information display
 * - Evolution progress display
 * - Related Topics section (new feature)
 * - Suggested Next section (new feature)
 * - Find Related action button (new feature)
 * - Close functionality
 * - Accessibility
 * - Edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

import PieceInfoCard from '../PieceInfoCard'

// Mock piece data fixtures
const createMockPiece = (overrides = {}) => ({
  id: 'piece-1',
  name: 'Volcanoes',
  icon: '🌋',
  zone: 'nature',
  evolutionTier: 'growing',
  relatedTopics: 3,
  lastReviewedAt: new Date().toISOString(),
  unlockedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
})

// Mock related pieces fixture
const mockRelatedPieces = [
  { id: 'rp-1', name: 'Tectonic Plates', icon: '🌍', zone: 'nature' },
  { id: 'rp-2', name: 'Earthquakes', icon: '🌐', zone: 'nature' },
  { id: 'rp-3', name: 'Magma', icon: '🔥', zone: 'arcane' },
]

const mockManyRelatedPieces = [
  ...mockRelatedPieces,
  { id: 'rp-4', name: 'Geysers', icon: '💨', zone: 'nature' },
  { id: 'rp-5', name: 'Hot Springs', icon: '♨️', zone: 'nature' },
]

// Mock suggested next fixture
const mockSuggestedNext = {
  topic: 'Lava Flows',
  reason: 'Learn how volcanoes shape landscapes',
}

/**
 * Default props for PieceInfoCard component
 */
const createDefaultProps = (overrides = {}) => ({
  piece: createMockPiece(),
  onClose: vi.fn(),
  onReviewSlides: vi.fn(),
  onStartQuiz: vi.fn(),
  relatedPieces: [],
  suggestedNext: null,
  onRelatedPieceClick: vi.fn(),
  onSuggestedClick: vi.fn(),
  onFindRelated: vi.fn(),
  ...overrides,
})

describe('PieceInfoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  // ===================================================================
  // BASIC RENDERING TESTS
  // ===================================================================
  describe('basic rendering', () => {
    it('renders the piece name', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Volcanoes')).toBeInTheDocument()
      })
    })

    it('renders the piece icon', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('🌋')).toBeInTheDocument()
      })
    })

    it('returns null when piece is not provided', () => {
      const props = createDefaultProps({ piece: null })
      const { container } = render(<PieceInfoCard {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('displays dialog with proper role', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('displays evolution tier information', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Growing')).toBeInTheDocument()
      })
    })
  })

  // ===================================================================
  // RELATED TOPICS SECTION TESTS
  // ===================================================================
  describe('Related Topics section', () => {
    it('shows Related Topics section when relatedPieces has items', async () => {
      const props = createDefaultProps({
        relatedPieces: mockRelatedPieces,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Related Topics')).toBeInTheDocument()
      })
    })

    it('hides Related Topics section when relatedPieces is empty', async () => {
      const props = createDefaultProps({
        relatedPieces: [],
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      expect(screen.queryByText('Related Topics')).not.toBeInTheDocument()
    })

    it('hides Related Topics section when relatedPieces is undefined', async () => {
      const props = createDefaultProps({
        relatedPieces: undefined,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      expect(screen.queryByText('Related Topics')).not.toBeInTheDocument()
    })

    it('displays up to 3 related piece icons and names', async () => {
      const props = createDefaultProps({
        relatedPieces: mockRelatedPieces,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Tectonic Plates')).toBeInTheDocument()
        expect(screen.getByText('Earthquakes')).toBeInTheDocument()
        expect(screen.getByText('Magma')).toBeInTheDocument()
      })
    })

    it('displays related piece icons', async () => {
      const props = createDefaultProps({
        relatedPieces: mockRelatedPieces,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('🌍')).toBeInTheDocument()
        expect(screen.getByText('🌐')).toBeInTheDocument()
        expect(screen.getByText('🔥')).toBeInTheDocument()
      })
    })

    it('shows "+N more" when more than 3 related pieces exist', async () => {
      const props = createDefaultProps({
        relatedPieces: mockManyRelatedPieces, // 5 pieces
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('+2 more')).toBeInTheDocument()
      })
    })

    it('does not show "+N more" when exactly 3 related pieces', async () => {
      const props = createDefaultProps({
        relatedPieces: mockRelatedPieces, // exactly 3 pieces
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Related Topics')).toBeInTheDocument()
      })

      expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument()
    })

    it('calls onRelatedPieceClick when a related piece is clicked', async () => {
      const onRelatedPieceClick = vi.fn()
      const props = createDefaultProps({
        relatedPieces: mockRelatedPieces,
        onRelatedPieceClick,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const tectonicPlatesButton = screen.getByRole('button', { name: /tectonic plates/i })
        fireEvent.click(tectonicPlatesButton)
      })

      await waitFor(() => {
        expect(onRelatedPieceClick).toHaveBeenCalledWith(mockRelatedPieces[0])
      })
    })

    it('passes correct piece object to onRelatedPieceClick for each piece', async () => {
      const onRelatedPieceClick = vi.fn()
      const props = createDefaultProps({
        relatedPieces: mockRelatedPieces,
        onRelatedPieceClick,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const earthquakesButton = screen.getByRole('button', { name: /earthquakes/i })
        fireEvent.click(earthquakesButton)
      })

      await waitFor(() => {
        expect(onRelatedPieceClick).toHaveBeenCalledWith(mockRelatedPieces[1])
      })
    })

    it('related pieces are keyboard accessible', async () => {
      const onRelatedPieceClick = vi.fn()
      const props = createDefaultProps({
        relatedPieces: mockRelatedPieces,
        onRelatedPieceClick,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const magmaButton = screen.getByRole('button', { name: /magma/i })
        fireEvent.keyDown(magmaButton, { key: 'Enter' })
      })

      await waitFor(() => {
        expect(onRelatedPieceClick).toHaveBeenCalledWith(mockRelatedPieces[2])
      })
    })

    it('displays single related piece correctly', async () => {
      const props = createDefaultProps({
        relatedPieces: [mockRelatedPieces[0]],
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Tectonic Plates')).toBeInTheDocument()
      })

      expect(screen.queryByText('Earthquakes')).not.toBeInTheDocument()
      expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument()
    })
  })

  // ===================================================================
  // SUGGESTED NEXT SECTION TESTS
  // ===================================================================
  describe('Suggested Next section', () => {
    it('shows Suggested Next section when piece is near evolution and suggestedNext is provided', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: 'growing', relatedTopics: 4 }), // Near flourishing threshold of 5
        suggestedNext: mockSuggestedNext,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Suggested Next')).toBeInTheDocument()
      })
    })

    it('displays suggested topic name', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: 'growing', relatedTopics: 4 }),
        suggestedNext: mockSuggestedNext,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Lava Flows')).toBeInTheDocument()
      })
    })

    it('displays suggested topic reason', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: 'growing', relatedTopics: 4 }),
        suggestedNext: mockSuggestedNext,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Learn how volcanoes shape landscapes')).toBeInTheDocument()
      })
    })

    it('hides Suggested Next section when suggestedNext is null', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: 'growing', relatedTopics: 4 }),
        suggestedNext: null,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      expect(screen.queryByText('Suggested Next')).not.toBeInTheDocument()
    })

    it('hides Suggested Next section when not near evolution', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: 'seedling', relatedTopics: 1 }), // Not near threshold of 3
        suggestedNext: mockSuggestedNext,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      expect(screen.queryByText('Suggested Next')).not.toBeInTheDocument()
    })

    it('calls onSuggestedClick when suggested topic is clicked', async () => {
      const onSuggestedClick = vi.fn()
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: 'growing', relatedTopics: 4 }),
        suggestedNext: mockSuggestedNext,
        onSuggestedClick,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const suggestedButton = screen.getByRole('button', { name: /lava flows/i })
        fireEvent.click(suggestedButton)
      })

      await waitFor(() => {
        expect(onSuggestedClick).toHaveBeenCalledWith('Lava Flows')
      })
    })

    it('suggested topic is keyboard accessible', async () => {
      const onSuggestedClick = vi.fn()
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: 'growing', relatedTopics: 4 }),
        suggestedNext: mockSuggestedNext,
        onSuggestedClick,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const suggestedButton = screen.getByRole('button', { name: /lava flows/i })
        fireEvent.keyDown(suggestedButton, { key: 'Enter' })
      })

      await waitFor(() => {
        expect(onSuggestedClick).toHaveBeenCalledWith('Lava Flows')
      })
    })

    it('shows when using isNearEvolution prop override', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: 'seedling', relatedTopics: 1 }),
        isNearEvolution: true,
        suggestedNext: mockSuggestedNext,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Suggested Next')).toBeInTheDocument()
      })
    })

    it('shows for flourishing tier nearing legendary', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: 'flourishing', relatedTopics: 9 }), // Near legendary threshold of 10
        suggestedNext: mockSuggestedNext,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Suggested Next')).toBeInTheDocument()
      })
    })
  })

  // ===================================================================
  // FIND RELATED ACTION BUTTON TESTS
  // ===================================================================
  describe('Find Related action button', () => {
    it('renders Find Related button', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find related/i })).toBeInTheDocument()
      })
    })

    it('Find Related button appears after Review and Quiz buttons', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        const reviewIndex = buttons.findIndex((btn) => btn.textContent?.includes('Review'))
        const quizIndex = buttons.findIndex((btn) => btn.textContent?.includes('Quiz'))
        const findRelatedIndex = buttons.findIndex((btn) => btn.textContent?.includes('Find Related'))

        expect(reviewIndex).toBeLessThan(findRelatedIndex)
        expect(quizIndex).toBeLessThan(findRelatedIndex)
      })
    })

    it('calls onFindRelated when clicked', async () => {
      const onFindRelated = vi.fn()
      const mockPiece = createMockPiece()
      const props = createDefaultProps({
        piece: mockPiece,
        onFindRelated,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const findRelatedButton = screen.getByRole('button', { name: /find related/i })
        fireEvent.click(findRelatedButton)
      })

      // Wait for animation delay
      vi.advanceTimersByTime(250)

      await waitFor(() => {
        expect(onFindRelated).toHaveBeenCalledWith(mockPiece)
      })
    })

    it('passes correct piece object to onFindRelated', async () => {
      const onFindRelated = vi.fn()
      const customPiece = createMockPiece({ id: 'custom-id', name: 'Custom Name' })
      const props = createDefaultProps({
        piece: customPiece,
        onFindRelated,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const findRelatedButton = screen.getByRole('button', { name: /find related/i })
        fireEvent.click(findRelatedButton)
      })

      vi.advanceTimersByTime(250)

      await waitFor(() => {
        expect(onFindRelated).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'custom-id', name: 'Custom Name' })
        )
      })
    })

    it('Find Related button has link/connection icon', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const findRelatedButton = screen.getByRole('button', { name: /find related/i })
        // Check for SVG icon within the button
        expect(findRelatedButton.querySelector('svg')).toBeInTheDocument()
      })
    })

    it('Find Related button is keyboard accessible', async () => {
      const onFindRelated = vi.fn()
      const props = createDefaultProps({ onFindRelated })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const findRelatedButton = screen.getByRole('button', { name: /find related/i })
        fireEvent.keyDown(findRelatedButton, { key: 'Enter' })
      })

      vi.advanceTimersByTime(250)

      await waitFor(() => {
        expect(onFindRelated).toHaveBeenCalled()
      })
    })
  })

  // ===================================================================
  // CLOSE FUNCTIONALITY TESTS
  // ===================================================================
  describe('close functionality', () => {
    it('renders close button', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
      })
    })

    it('calls onClose when close button is clicked', async () => {
      const onClose = vi.fn()
      const props = createDefaultProps({ onClose })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i })
        fireEvent.click(closeButton)
      })

      vi.advanceTimersByTime(250)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })

    it('calls onClose when Escape key is pressed', async () => {
      const onClose = vi.fn()
      const props = createDefaultProps({ onClose })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      fireEvent.keyDown(document, { key: 'Escape' })
      vi.advanceTimersByTime(250)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })

    it('calls onClose when backdrop is clicked', async () => {
      const onClose = vi.fn()
      const props = createDefaultProps({ onClose })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        fireEvent.click(dialog)
      })

      vi.advanceTimersByTime(250)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })
  })

  // ===================================================================
  // ACCESSIBILITY TESTS
  // ===================================================================
  describe('accessibility', () => {
    it('has proper ARIA role for the modal', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAttribute('aria-modal', 'true')
      })
    })

    it('has aria-labelledby pointing to piece title', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAttribute('aria-labelledby', 'piece-info-title')
      })
    })

    it('close button has accessible name', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
      })
    })

    it('Review button has accessible name', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument()
      })
    })

    it('Quiz button has accessible name', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /quiz/i })).toBeInTheDocument()
      })
    })

    it('related pieces have accessible button names', async () => {
      const props = createDefaultProps({
        relatedPieces: mockRelatedPieces,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tectonic plates/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /earthquakes/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /magma/i })).toBeInTheDocument()
      })
    })

    it('all interactive elements have visible focus indicators', async () => {
      const props = createDefaultProps({
        relatedPieces: mockRelatedPieces,
        piece: createMockPiece({ evolutionTier: 'growing', relatedTopics: 4 }),
        suggestedNext: mockSuggestedNext,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        buttons.forEach((button) => {
          expect(button.className).toMatch(/focus:/)
        })
      })
    })
  })

  // ===================================================================
  // EDGE CASES TESTS
  // ===================================================================
  describe('edge cases', () => {
    it('handles piece without icon gracefully', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ icon: undefined }),
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        // Should show default icon
        expect(screen.getByText('🌍')).toBeInTheDocument()
      })
    })

    it('handles piece without evolutionTier gracefully', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: undefined }),
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        // Should default to seedling
        expect(screen.getByText('Seedling')).toBeInTheDocument()
      })
    })

    it('handles related pieces with missing fields gracefully', async () => {
      const props = createDefaultProps({
        relatedPieces: [
          { id: 'rp-partial', name: 'Partial Piece' }, // Missing icon and zone
        ],
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Partial Piece')).toBeInTheDocument()
      })
    })

    it('handles empty related pieces array', async () => {
      const props = createDefaultProps({
        relatedPieces: [],
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      expect(screen.queryByText('Related Topics')).not.toBeInTheDocument()
    })

    it('handles suggestedNext with empty topic gracefully', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: 'growing', relatedTopics: 4 }),
        suggestedNext: { topic: '', reason: 'Some reason' },
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('handles callback not provided gracefully for onFindRelated', async () => {
      const props = createDefaultProps({
        onFindRelated: undefined,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const findRelatedButton = screen.getByRole('button', { name: /find related/i })
        // Should not throw when clicked
        expect(() => fireEvent.click(findRelatedButton)).not.toThrow()
      })
    })

    it('handles callback not provided gracefully for onRelatedPieceClick', async () => {
      const props = createDefaultProps({
        relatedPieces: mockRelatedPieces,
        onRelatedPieceClick: undefined,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const tectonicButton = screen.getByRole('button', { name: /tectonic plates/i })
        // Should not throw when clicked
        expect(() => fireEvent.click(tectonicButton)).not.toThrow()
      })
    })

    it('handles callback not provided gracefully for onSuggestedClick', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: 'growing', relatedTopics: 4 }),
        suggestedNext: mockSuggestedNext,
        onSuggestedClick: undefined,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const suggestedButton = screen.getByRole('button', { name: /lava flows/i })
        // Should not throw when clicked
        expect(() => fireEvent.click(suggestedButton)).not.toThrow()
      })
    })

    it('handles legendary tier (max tier) correctly', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: 'legendary', relatedTopics: 15 }),
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Legendary')).toBeInTheDocument()
      })

      // Should not show progress toward next tier
      expect(screen.queryByText(/\(\d+\/\d+\)/)).not.toBeInTheDocument()
    })

    it('does not show Suggested Next for legendary tier', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ evolutionTier: 'legendary', relatedTopics: 15 }),
        suggestedNext: mockSuggestedNext,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Legendary is max tier, so no "near evolution" state
      expect(screen.queryByText('Suggested Next')).not.toBeInTheDocument()
    })
  })

  // ===================================================================
  // EXISTING ACTION BUTTONS TESTS
  // ===================================================================
  describe('existing action buttons', () => {
    it('calls onReviewSlides when Review button is clicked', async () => {
      const onReviewSlides = vi.fn()
      const mockPiece = createMockPiece()
      const props = createDefaultProps({
        piece: mockPiece,
        onReviewSlides,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const reviewButton = screen.getByRole('button', { name: /review/i })
        fireEvent.click(reviewButton)
      })

      vi.advanceTimersByTime(250)

      await waitFor(() => {
        expect(onReviewSlides).toHaveBeenCalledWith(mockPiece)
      })
    })

    it('calls onStartQuiz when Quiz button is clicked', async () => {
      const onStartQuiz = vi.fn()
      const mockPiece = createMockPiece()
      const props = createDefaultProps({
        piece: mockPiece,
        onStartQuiz,
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const quizButton = screen.getByRole('button', { name: /quiz/i })
        fireEvent.click(quizButton)
      })

      vi.advanceTimersByTime(250)

      await waitFor(() => {
        expect(onStartQuiz).toHaveBeenCalledWith(mockPiece)
      })
    })
  })

  // ===================================================================
  // STYLING AND TRANSITIONS TESTS
  // ===================================================================
  describe('styling and transitions', () => {
    it('applies zone-specific styling for nature zone', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ zone: 'nature' }),
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog.innerHTML).toMatch(/green/)
      })
    })

    it('applies zone-specific styling for civilization zone', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ zone: 'civilization' }),
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog.innerHTML).toMatch(/primary|indigo|violet/)
      })
    })

    it('applies zone-specific styling for arcane zone', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ zone: 'arcane' }),
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog.innerHTML).toMatch(/purple|fuchsia/)
      })
    })

    it('applies default styling for unknown zone', async () => {
      const props = createDefaultProps({
        piece: createMockPiece({ zone: 'unknown' }),
      })

      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog.innerHTML).toMatch(/slate|gray/)
      })
    })

    it('applies transition classes for animations', async () => {
      const props = createDefaultProps()
      render(<PieceInfoCard {...props} />)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog.className).toMatch(/transition/)
      })
    })
  })
})
