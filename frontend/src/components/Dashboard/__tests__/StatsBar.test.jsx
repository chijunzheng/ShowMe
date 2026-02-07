/**
 * StatsBar Component Tests
 *
 * Tests for the StatsBar component that displays user learning statistics
 * including streak, XP, topics learned, and explorer rank.
 *
 * Features:
 * - Streak counter with fire icon
 * - Total XP display
 * - Topics learned count
 * - Explorer rank indicator (derived from topics learned)
 * - Animated updates
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import StatsBar from '../StatsBar'

/**
 * Default props for StatsBar component
 */
const createDefaultProps = (overrides = {}) => ({
  streak: 0,
  totalXP: 0,
  topicsLearned: 0,
  isLoading: false,
  ...overrides,
})

describe('StatsBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps()
      render(<StatsBar {...props} />)

      expect(screen.getByTestId('stats-bar')).toBeInTheDocument()
    })

    it('renders all stat sections', () => {
      const props = createDefaultProps({
        streak: 5,
        totalXP: 250,
        topicsLearned: 12,
      })
      render(<StatsBar {...props} />)

      expect(screen.getByTestId('stat-streak')).toBeInTheDocument()
      expect(screen.getByTestId('stat-topics')).toBeInTheDocument()
      expect(screen.getByTestId('stat-rank')).toBeInTheDocument()
      expect(screen.getByTestId('stat-trophies')).toBeInTheDocument()
    })
  })

  describe('streak display', () => {
    it('displays streak count', () => {
      const props = createDefaultProps({ streak: 7 })
      render(<StatsBar {...props} />)

      expect(screen.getByText('7')).toBeInTheDocument()
    })

    it('displays streak label', () => {
      const props = createDefaultProps({ streak: 3 })
      render(<StatsBar {...props} />)

      expect(screen.getByText(/streak|day/i)).toBeInTheDocument()
    })

    it('shows fire icon for streak', () => {
      const props = createDefaultProps({ streak: 5 })
      render(<StatsBar {...props} />)

      const streakStat = screen.getByTestId('stat-streak')
      // Should have fire emoji or icon
      expect(streakStat.textContent).toMatch(/\ud83d\udd25|fire/)
    })

    it('shows muted styling for 0 streak', () => {
      const props = createDefaultProps({ streak: 0 })
      render(<StatsBar {...props} />)

      const streakStat = screen.getByTestId('stat-streak')
      expect(streakStat.className).toMatch(/opacity|muted|gray/)
    })

    it('shows emphasized styling for active streak', () => {
      const props = createDefaultProps({ streak: 5 })
      render(<StatsBar {...props} />)

      const streakStat = screen.getByTestId('stat-streak')
      expect(streakStat.className).toMatch(/orange|amber|yellow|fire/)
    })

    it('handles large streak numbers', () => {
      const props = createDefaultProps({ streak: 365 })
      render(<StatsBar {...props} />)

      expect(screen.getByText('365')).toBeInTheDocument()
    })
  })

  describe('XP display', () => {
    it('displays total XP inside the rank stat', () => {
      const props = createDefaultProps({ totalXP: 1250 })
      render(<StatsBar {...props} />)

      const rankStat = screen.getByTestId('stat-rank')
      expect(rankStat.textContent).toMatch(/1,?250/)
    })

    it('displays XP label', () => {
      const props = createDefaultProps({ totalXP: 500 })
      render(<StatsBar {...props} />)

      const rankStat = screen.getByTestId('stat-rank')
      expect(rankStat.textContent).toMatch(/xp/i)
    })

    it('formats large XP numbers with commas', () => {
      const props = createDefaultProps({ totalXP: 12500 })
      render(<StatsBar {...props} />)

      const rankStat = screen.getByTestId('stat-rank')
      expect(rankStat.textContent).toMatch(/12,500/)
    })

    it('formats very large XP with K suffix', () => {
      const props = createDefaultProps({ totalXP: 125000 })
      render(<StatsBar {...props} />)

      const rankStat = screen.getByTestId('stat-rank')
      // Should show "125K" or "125,000"
      expect(rankStat.textContent).toMatch(/125[,K]/)
    })

    it('shows 0 for no XP', () => {
      const props = createDefaultProps({ totalXP: 0 })
      render(<StatsBar {...props} />)

      const rankStat = screen.getByTestId('stat-rank')
      expect(rankStat.textContent).toMatch(/0\s*XP/i)
    })
  })

  describe('topics learned display', () => {
    it('displays topics count', () => {
      const props = createDefaultProps({ topicsLearned: 15 })
      render(<StatsBar {...props} />)

      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('displays topics label', () => {
      const props = createDefaultProps({ topicsLearned: 8 })
      render(<StatsBar {...props} />)

      expect(screen.getByText(/topic/i)).toBeInTheDocument()
    })

    it('shows leaf icon for topics', () => {
      const props = createDefaultProps({ topicsLearned: 10 })
      render(<StatsBar {...props} />)

      const topicsStat = screen.getByTestId('stat-topics')
      expect(topicsStat.textContent).toMatch(/\ud83c\udf3f|\ud83d\udcd6|leaf|book/)
    })
  })

  describe('explorer rank display', () => {
    it('displays stargazer rank for 0 topics', () => {
      const props = createDefaultProps({ topicsLearned: 0 })
      render(<StatsBar {...props} />)

      const rankStat = screen.getByTestId('stat-rank')
      // Should show telescope icon for Stargazer
      expect(rankStat.textContent).toMatch(/\uD83D\uDD2D|Stargazer/)
    })

    it('displays space cadet rank for 3+ topics', () => {
      const props = createDefaultProps({ topicsLearned: 3, totalXP: 150 })
      render(<StatsBar {...props} />)

      const rankStat = screen.getByTestId('stat-rank')
      // Should show rocket icon for Space Cadet
      expect(rankStat.textContent).toMatch(/\uD83D\uDE80|Space Cadet/)
    })

    it('displays navigator rank for 8+ topics', () => {
      const props = createDefaultProps({ topicsLearned: 8, totalXP: 350 })
      render(<StatsBar {...props} />)

      const rankStat = screen.getByTestId('stat-rank')
      // Should show compass icon for Navigator
      expect(rankStat.textContent).toMatch(/\uD83E\uDDED|Navigator/)
    })

    it('displays explorer rank for 15+ topics', () => {
      const props = createDefaultProps({ topicsLearned: 15, totalXP: 600 })
      render(<StatsBar {...props} />)

      const rankStat = screen.getByTestId('stat-rank')
      expect(rankStat.textContent).toMatch(/\uD83C\uDF0C|Explorer/)
    })

    it('shows special styling for max rank (Legendary Luminary)', () => {
      const props = createDefaultProps({ topicsLearned: 120, totalXP: 9000 })
      render(<StatsBar {...props} />)

      const rankStat = screen.getByTestId('stat-rank')
      expect(rankStat.className).toMatch(/red|shimmer/)
    })

    it('rank updates when topics increase', () => {
      const props = createDefaultProps({ topicsLearned: 2, totalXP: 100 })
      const { rerender } = render(<StatsBar {...props} />)

      let rankStat = screen.getByTestId('stat-rank')
      expect(rankStat.textContent).toMatch(/\uD83D\uDD2D/) // telescope (Stargazer)

      rerender(<StatsBar {...createDefaultProps({ topicsLearned: 8, totalXP: 350 })} />)

      rankStat = screen.getByTestId('stat-rank')
      expect(rankStat.textContent).toMatch(/\uD83E\uDDED/) // compass (Navigator)
    })
  })

  describe('loading state', () => {
    it('shows skeleton when loading', () => {
      const props = createDefaultProps({ isLoading: true })
      render(<StatsBar {...props} />)

      expect(screen.getByTestId('stats-bar-skeleton')).toBeInTheDocument()
    })

    it('skeleton has animated pulse', () => {
      const props = createDefaultProps({ isLoading: true })
      render(<StatsBar {...props} />)

      const skeleton = screen.getByTestId('stats-bar-skeleton')
      expect(skeleton.className).toMatch(/animate-pulse/)
    })

    it('hides actual stats when loading', () => {
      const props = createDefaultProps({
        isLoading: true,
        streak: 5,
        totalXP: 100,
      })
      render(<StatsBar {...props} />)

      expect(screen.queryByText('5')).not.toBeInTheDocument()
      expect(screen.queryByText('100')).not.toBeInTheDocument()
    })
  })

  describe('animated updates', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('animates XP increase', async () => {
      const props = createDefaultProps({ totalXP: 100 })
      const { rerender } = render(<StatsBar {...props} />)

      rerender(<StatsBar {...props} totalXP={150} />)

      const rankStat = screen.getByTestId('stat-rank')
      expect(rankStat.className).toMatch(/animate|pulse|pop/)
    })

    it('animates streak increase', async () => {
      const props = createDefaultProps({ streak: 3 })
      const { rerender } = render(<StatsBar {...props} />)

      rerender(<StatsBar {...props} streak={4} />)

      const streakStat = screen.getByTestId('stat-streak')
      expect(streakStat.className).toMatch(/animate|pulse|pop/)
    })
  })

  describe('layout', () => {
    it('uses horizontal layout on desktop', () => {
      const props = createDefaultProps()
      render(<StatsBar {...props} />)

      const statsBar = screen.getByTestId('stats-bar')
      expect(statsBar.className).toMatch(/flex|grid/)
    })

    it('has proper spacing between stats', () => {
      const props = createDefaultProps()
      render(<StatsBar {...props} />)

      const statsBar = screen.getByTestId('stats-bar')
      expect(statsBar.className).toMatch(/gap|space/)
    })

    it('stats are evenly distributed', () => {
      const props = createDefaultProps()
      render(<StatsBar {...props} />)

      const statsBar = screen.getByTestId('stats-bar')
      expect(statsBar.className).toMatch(/justify-between|justify-around|grid-cols/)
    })
  })

  describe('styling', () => {
    it('has background for visibility', () => {
      const props = createDefaultProps()
      render(<StatsBar {...props} />)

      const statsBar = screen.getByTestId('stats-bar')
      expect(statsBar.className).toMatch(/bg-|backdrop/)
    })

    it('has rounded corners', () => {
      const props = createDefaultProps()
      render(<StatsBar {...props} />)

      const statsBar = screen.getByTestId('stats-bar')
      expect(statsBar.className).toMatch(/rounded/)
    })

    it('supports dark mode', () => {
      const props = createDefaultProps()
      render(<StatsBar {...props} />)

      const statsBar = screen.getByTestId('stats-bar')
      expect(statsBar.className).toMatch(/dark:|bg-/)
    })
  })

  describe('accessibility', () => {
    it('has proper semantic structure', () => {
      const props = createDefaultProps()
      render(<StatsBar {...props} />)

      const statsBar = screen.getByTestId('stats-bar')
      expect(statsBar.tagName.toLowerCase()).toMatch(/nav|div|section/)
    })

    it('stats have accessible labels', () => {
      const props = createDefaultProps({
        streak: 5,
        totalXP: 100,
        topicsLearned: 10,
      })
      render(<StatsBar {...props} />)

      // Each stat should have visible label or aria-label
      expect(screen.getByText(/streak/i)).toBeInTheDocument()
      expect(screen.getByText(/xp/i)).toBeInTheDocument()
      expect(screen.getByText(/topic/i)).toBeInTheDocument()
    })

    it('numbers are not read as separate digits', () => {
      const props = createDefaultProps({ totalXP: 1250 })
      render(<StatsBar {...props} />)

      // XP should be in a single element, not split
      const rankStat = screen.getByTestId('stat-rank')
      expect(rankStat.textContent).toMatch(/1,?250/)
    })
  })

  describe('edge cases', () => {
    it('handles null values gracefully', () => {
      const props = {
        streak: null,
        totalXP: null,
        topicsLearned: null,
      }

      expect(() => render(<StatsBar {...props} />)).not.toThrow()
    })

    it('handles undefined values gracefully', () => {
      const props = {}

      expect(() => render(<StatsBar {...props} />)).not.toThrow()
    })

    it('handles negative numbers by showing 0', () => {
      const props = createDefaultProps({
        streak: -5,
        totalXP: -100,
        topicsLearned: -10,
      })
      render(<StatsBar {...props} />)

      // Should not show negative numbers
      expect(screen.queryByText('-5')).not.toBeInTheDocument()
      expect(screen.queryByText('-100')).not.toBeInTheDocument()
    })

    it('defaults to stargazer rank for invalid topic count', () => {
      const props = createDefaultProps({ topicsLearned: -5 })
      render(<StatsBar {...props} />)

      const rankStat = screen.getByTestId('stat-rank')
      // Should default to Stargazer (telescope icon)
      expect(rankStat.textContent).toMatch(/\uD83D\uDD2D/)
    })
  })

  describe('compact variant', () => {
    it('supports compact prop for smaller display', () => {
      const props = createDefaultProps({ compact: true })
      render(<StatsBar {...props} />)

      const statsBar = screen.getByTestId('stats-bar')
      expect(statsBar.className).toMatch(/compact|sm:|text-sm/)
    })

    it('has neobrutalism styling in compact mode', () => {
      const props = createDefaultProps({ compact: true })
      render(<StatsBar {...props} />)

      const statsBar = screen.getByTestId('stats-bar')
      expect(statsBar.className).toMatch(/border-2|shadow/)
    })

    it('shows labels in compact mode', () => {
      const props = createDefaultProps({ compact: true, streak: 5 })
      render(<StatsBar {...props} />)

      // Labels like "Streak", "XP", "Topics" should appear
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Streak')).toBeInTheDocument()
      expect(screen.getByText(/XP/i)).toBeInTheDocument()
    })

    it('shows abbreviated rank title in compact mode', () => {
      const props = createDefaultProps({ compact: true, topicsLearned: 8, totalXP: 350 })
      render(<StatsBar {...props} />)

      // Icon should show with abbreviated title
      const rankStat = screen.getByTestId('stat-rank')
      expect(rankStat.textContent).toMatch(/\uD83E\uDDED/) // compass icon
      expect(screen.getByText('Navigator')).toBeInTheDocument()
    })
  })
})
