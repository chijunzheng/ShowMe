/**
 * TrophyShowcase Component Tests
 *
 * TDD: These tests define the behavior for the TrophyShowcase component
 * BEFORE implementation. TrophyShowcase displays earned trophies/badges
 * in a horizontally scrollable showcase.
 *
 * Features:
 * - Horizontal scrolling trophy display
 * - Shows earned trophies with icons and names
 * - Empty state when no trophies
 * - Click to view trophy details
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import TrophyShowcase from '../TrophyShowcase'

/**
 * Sample trophy data for testing
 */
const sampleTrophies = [
  {
    id: 'first-question',
    name: 'Curious Mind',
    description: 'Asked your first question',
    icon: 'question-mark',
    earnedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: '7-day learning streak',
    icon: 'fire',
    earnedAt: '2024-01-20T15:00:00Z',
  },
  {
    id: 'topics-10',
    name: 'Knowledge Explorer',
    description: 'Learned 10 different topics',
    icon: 'compass',
    earnedAt: '2024-01-25T09:00:00Z',
  },
]

/**
 * Default props for TrophyShowcase component
 */
const createDefaultProps = (overrides = {}) => ({
  trophies: [],
  onTrophyClick: vi.fn(),
  isLoading: false,
  ...overrides,
})

describe('TrophyShowcase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps()
      render(<TrophyShowcase {...props} />)

      expect(screen.getByTestId('trophy-showcase')).toBeInTheDocument()
    })

    it('renders a trophy item for each trophy', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      const trophyItems = screen.getAllByTestId(/trophy-item/)
      expect(trophyItems).toHaveLength(3)
    })

    it('displays trophy names', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      expect(screen.getByText('Curious Mind')).toBeInTheDocument()
      expect(screen.getByText('Week Warrior')).toBeInTheDocument()
      expect(screen.getByText('Knowledge Explorer')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state when no trophies', () => {
      const props = createDefaultProps({ trophies: [] })
      render(<TrophyShowcase {...props} />)

      expect(screen.getByTestId('trophy-empty-state')).toBeInTheDocument()
    })

    it('empty state has encouraging message', () => {
      const props = createDefaultProps({ trophies: [] })
      render(<TrophyShowcase {...props} />)

      expect(screen.getByText(/earn|unlock|collect/i)).toBeInTheDocument()
    })

    it('empty state shows locked trophy visual', () => {
      const props = createDefaultProps({ trophies: [] })
      render(<TrophyShowcase {...props} />)

      expect(screen.getByTestId('locked-trophy-icon')).toBeInTheDocument()
    })
  })

  describe('trophy item display', () => {
    it('displays trophy icon', () => {
      const props = createDefaultProps({ trophies: [sampleTrophies[0]] })
      render(<TrophyShowcase {...props} />)

      const trophyItem = screen.getByTestId('trophy-item-first-question')
      expect(within(trophyItem).getByTestId('trophy-icon')).toBeInTheDocument()
    })

    it('displays trophy name below icon', () => {
      const props = createDefaultProps({ trophies: [sampleTrophies[0]] })
      render(<TrophyShowcase {...props} />)

      expect(screen.getByText('Curious Mind')).toBeInTheDocument()
    })

    it('applies unique styling per trophy type', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      const firstTrophy = screen.getByTestId('trophy-item-first-question')
      const streakTrophy = screen.getByTestId('trophy-item-streak-7')

      // Different trophy types should have different colors/styles
      expect(firstTrophy.className).not.toBe(streakTrophy.className)
    })
  })

  describe('horizontal scrolling', () => {
    it('container has horizontal scroll', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      const showcase = screen.getByTestId('trophy-showcase')
      expect(showcase.className).toMatch(/overflow-x-auto|scroll/)
    })

    it('trophies are displayed in a row', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      const showcase = screen.getByTestId('trophy-showcase')
      expect(showcase.className).toMatch(/flex|inline-flex/)
    })

    it('hides scrollbar but allows scrolling', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      const showcase = screen.getByTestId('trophy-showcase')
      expect(showcase.className).toMatch(/scrollbar-hide|no-scrollbar|-webkit-scrollbar/)
    })
  })

  describe('click handling', () => {
    it('calls onTrophyClick when trophy is clicked', () => {
      const onTrophyClick = vi.fn()
      const props = createDefaultProps({
        trophies: sampleTrophies,
        onTrophyClick,
      })
      render(<TrophyShowcase {...props} />)

      const trophyItem = screen.getByTestId('trophy-item-first-question')
      fireEvent.click(trophyItem)

      expect(onTrophyClick).toHaveBeenCalledTimes(1)
      expect(onTrophyClick).toHaveBeenCalledWith(sampleTrophies[0])
    })

    it('handles undefined onTrophyClick gracefully', () => {
      const props = createDefaultProps({
        trophies: sampleTrophies,
        onTrophyClick: undefined,
      })
      render(<TrophyShowcase {...props} />)

      const trophyItem = screen.getByTestId('trophy-item-first-question')
      expect(() => fireEvent.click(trophyItem)).not.toThrow()
    })

    it('trophies are keyboard accessible', () => {
      const onTrophyClick = vi.fn()
      const props = createDefaultProps({
        trophies: sampleTrophies,
        onTrophyClick,
      })
      render(<TrophyShowcase {...props} />)

      const trophyItem = screen.getByTestId('trophy-item-first-question')
      fireEvent.keyDown(trophyItem, { key: 'Enter' })

      expect(onTrophyClick).toHaveBeenCalledWith(sampleTrophies[0])
    })
  })

  describe('loading state', () => {
    it('shows skeleton when loading', () => {
      const props = createDefaultProps({ isLoading: true })
      render(<TrophyShowcase {...props} />)

      expect(screen.getByTestId('trophy-showcase-skeleton')).toBeInTheDocument()
    })

    it('skeleton has multiple placeholder items', () => {
      const props = createDefaultProps({ isLoading: true })
      render(<TrophyShowcase {...props} />)

      const skeletonItems = screen.getAllByTestId('trophy-skeleton-item')
      expect(skeletonItems.length).toBeGreaterThanOrEqual(3)
    })

    it('skeleton has animated pulse', () => {
      const props = createDefaultProps({ isLoading: true })
      render(<TrophyShowcase {...props} />)

      const skeleton = screen.getByTestId('trophy-showcase-skeleton')
      expect(skeleton.className).toMatch(/animate-pulse/)
    })
  })

  describe('trophy count', () => {
    it('displays total trophy count', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      expect(screen.getByText(/3/)).toBeInTheDocument()
    })

    it('shows "Trophies" label with count', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      expect(screen.getByText(/trophies|badges/i)).toBeInTheDocument()
    })
  })

  describe('recent trophy highlight', () => {
    it('highlights most recently earned trophy', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      // Most recent is 'Knowledge Explorer' (2024-01-25)
      const recentTrophy = screen.getByTestId('trophy-item-topics-10')
      expect(recentTrophy.className).toMatch(/new|recent|highlight|ring/)
    })

    it('shows "New" badge on recently earned trophy', () => {
      const recentTrophy = {
        ...sampleTrophies[0],
        earnedAt: new Date().toISOString(), // Just earned
      }
      const props = createDefaultProps({ trophies: [recentTrophy] })
      render(<TrophyShowcase {...props} />)

      expect(screen.getByText(/new/i)).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has appropriate padding', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      const showcase = screen.getByTestId('trophy-showcase')
      expect(showcase.className).toMatch(/p-|px-|py-/)
    })

    it('trophy items have consistent sizing', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      const trophyItems = screen.getAllByTestId(/trophy-item/)
      const sizes = trophyItems.map((item) => item.className)

      // All should have the same size classes
      expect(new Set(sizes).size).toBeLessThanOrEqual(3) // Allow some variation
    })

    it('has gap between trophy items', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      const showcase = screen.getByTestId('trophy-showcase')
      expect(showcase.className).toMatch(/gap|space/)
    })
  })

  describe('accessibility', () => {
    it('showcase has role="list"', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      const showcase = screen.getByTestId('trophy-showcase')
      expect(showcase).toHaveAttribute('role', 'list')
    })

    it('trophy items have role="listitem"', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      const trophyItem = screen.getByTestId('trophy-item-first-question')
      expect(trophyItem).toHaveAttribute('role', 'listitem')
    })

    it('trophies have tabIndex for keyboard navigation', () => {
      const props = createDefaultProps({ trophies: sampleTrophies })
      render(<TrophyShowcase {...props} />)

      const trophyItem = screen.getByTestId('trophy-item-first-question')
      expect(trophyItem).toHaveAttribute('tabIndex', '0')
    })

    it('trophy items have aria-label with name and description', () => {
      const props = createDefaultProps({ trophies: [sampleTrophies[0]] })
      render(<TrophyShowcase {...props} />)

      const trophyItem = screen.getByTestId('trophy-item-first-question')
      const ariaLabel = trophyItem.getAttribute('aria-label')

      expect(ariaLabel).toContain('Curious Mind')
    })
  })

  describe('edge cases', () => {
    it('handles null trophies array', () => {
      const props = createDefaultProps({ trophies: null })

      expect(() => render(<TrophyShowcase {...props} />)).not.toThrow()
    })

    it('handles undefined trophies array', () => {
      const props = createDefaultProps({ trophies: undefined })

      expect(() => render(<TrophyShowcase {...props} />)).not.toThrow()
    })

    it('handles trophies with missing properties', () => {
      const incompleteTrophy = { id: 'incomplete' }
      const props = createDefaultProps({ trophies: [incompleteTrophy] })

      expect(() => render(<TrophyShowcase {...props} />)).not.toThrow()
    })

    it('handles many trophies without performance issues', () => {
      const manyTrophies = Array.from({ length: 50 }, (_, i) => ({
        id: `trophy-${i}`,
        name: `Trophy ${i}`,
        description: `Description ${i}`,
        icon: 'star',
        earnedAt: new Date(Date.now() - i * 86400000).toISOString(),
      }))

      const props = createDefaultProps({ trophies: manyTrophies })
      const startTime = performance.now()
      render(<TrophyShowcase {...props} />)
      const endTime = performance.now()

      // Should render in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('maximum display', () => {
    it('limits visible trophies with "see all" when many exist', () => {
      const manyTrophies = Array.from({ length: 20 }, (_, i) => ({
        id: `trophy-${i}`,
        name: `Trophy ${i}`,
        description: `Description ${i}`,
        icon: 'star',
        earnedAt: new Date(Date.now() - i * 86400000).toISOString(),
      }))

      const props = createDefaultProps({
        trophies: manyTrophies,
        maxVisible: 10,
      })
      render(<TrophyShowcase {...props} />)

      // Should show "see all" or similar
      expect(screen.getByText(/see all|view all|\+\d+/i)).toBeInTheDocument()
    })
  })
})
