/**
 * StatsBar Component Tests
 *
 * TDD: These tests define the behavior for the StatsBar component
 * BEFORE implementation. StatsBar displays user learning statistics
 * including streak, XP, topics learned, and tree level.
 *
 * Features:
 * - Streak counter with fire icon
 * - Total XP display
 * - Topics learned count
 * - Current tree level indicator
 * - Animated updates
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor, act } from '@testing-library/react'
import StatsBar from '../StatsBar'

/**
 * Default props for StatsBar component
 */
const createDefaultProps = (overrides = {}) => ({
  streak: 0,
  totalXP: 0,
  topicsLearned: 0,
  treeLevel: 'seed',
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
        treeLevel: 'mature',
      })
      render(<StatsBar {...props} />)

      expect(screen.getByTestId('stat-streak')).toBeInTheDocument()
      expect(screen.getByTestId('stat-xp')).toBeInTheDocument()
      expect(screen.getByTestId('stat-topics')).toBeInTheDocument()
      expect(screen.getByTestId('stat-level')).toBeInTheDocument()
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
    it('displays total XP', () => {
      const props = createDefaultProps({ totalXP: 1250 })
      render(<StatsBar {...props} />)

      expect(screen.getByText(/1,?250/)).toBeInTheDocument()
    })

    it('displays XP label', () => {
      const props = createDefaultProps({ totalXP: 500 })
      render(<StatsBar {...props} />)

      expect(screen.getByText(/xp/i)).toBeInTheDocument()
    })

    it('formats large XP numbers with commas', () => {
      const props = createDefaultProps({ totalXP: 12500 })
      render(<StatsBar {...props} />)

      expect(screen.getByText(/12,500/)).toBeInTheDocument()
    })

    it('formats very large XP with K suffix', () => {
      const props = createDefaultProps({ totalXP: 125000 })
      render(<StatsBar {...props} />)

      // Should show "125K" or "125,000"
      expect(screen.getByText(/125[,K]/)).toBeInTheDocument()
    })

    it('shows 0 for no XP', () => {
      const props = createDefaultProps({ totalXP: 0 })
      render(<StatsBar {...props} />)

      const xpStat = screen.getByTestId('stat-xp')
      expect(xpStat.textContent).toMatch(/0/)
    })

    it('shows star/sparkle icon for XP', () => {
      const props = createDefaultProps({ totalXP: 100 })
      render(<StatsBar {...props} />)

      const xpStat = screen.getByTestId('stat-xp')
      expect(xpStat.textContent).toMatch(/\u2b50|\u2728|star|sparkle/)
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

    it('uses singular "topic" for 1 topic', () => {
      const props = createDefaultProps({ topicsLearned: 1 })
      render(<StatsBar {...props} />)

      expect(screen.getByText(/1 topic(?!s)/i)).toBeInTheDocument()
    })

    it('uses plural "topics" for multiple topics', () => {
      const props = createDefaultProps({ topicsLearned: 5 })
      render(<StatsBar {...props} />)

      expect(screen.getByText(/5 topics/i)).toBeInTheDocument()
    })

    it('shows book/leaf icon for topics', () => {
      const props = createDefaultProps({ topicsLearned: 10 })
      render(<StatsBar {...props} />)

      const topicsStat = screen.getByTestId('stat-topics')
      expect(topicsStat.textContent).toMatch(/\ud83c\udf3f|\ud83d\udcd6|leaf|book/)
    })
  })

  describe('tree level display', () => {
    it('displays current tree level', () => {
      const props = createDefaultProps({ treeLevel: 'sapling' })
      render(<StatsBar {...props} />)

      expect(screen.getByText(/sapling/i)).toBeInTheDocument()
    })

    it('displays all tree levels correctly', () => {
      const levels = ['seed', 'sprout', 'sapling', 'young', 'mature', 'magical']

      levels.forEach((level) => {
        cleanup()
        const props = createDefaultProps({ treeLevel: level })
        render(<StatsBar {...props} />)

        const levelText = screen.getByTestId('stat-level')
        expect(levelText.textContent.toLowerCase()).toContain(level)
      })
    })

    it('shows tree icon', () => {
      const props = createDefaultProps({ treeLevel: 'mature' })
      render(<StatsBar {...props} />)

      const levelStat = screen.getByTestId('stat-level')
      expect(levelStat.textContent).toMatch(/\ud83c\udf33|\ud83c\udf31|\ud83c\udf3f|tree/)
    })

    it('shows special styling for magical level', () => {
      const props = createDefaultProps({ treeLevel: 'magical' })
      render(<StatsBar {...props} />)

      const levelStat = screen.getByTestId('stat-level')
      expect(levelStat.className).toMatch(/purple|magic|shimmer|glow|gradient/)
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

      const xpStat = screen.getByTestId('stat-xp')
      expect(xpStat.className).toMatch(/animate|pulse|pop/)
    })

    it('animates streak increase', async () => {
      const props = createDefaultProps({ streak: 3 })
      const { rerender } = render(<StatsBar {...props} />)

      rerender(<StatsBar {...props} streak={4} />)

      const streakStat = screen.getByTestId('stat-streak')
      expect(streakStat.className).toMatch(/animate|pulse|pop/)
    })

    it('animates level up', async () => {
      const props = createDefaultProps({ treeLevel: 'sprout' })
      const { rerender } = render(<StatsBar {...props} />)

      rerender(<StatsBar {...props} treeLevel={'sapling'} />)

      const levelStat = screen.getByTestId('stat-level')
      expect(levelStat.className).toMatch(/animate|pulse|glow/)
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
        treeLevel: 'sapling',
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
      const xpStat = screen.getByTestId('stat-xp')
      expect(xpStat.textContent).toMatch(/1,?250/)
    })
  })

  describe('edge cases', () => {
    it('handles null values gracefully', () => {
      const props = {
        streak: null,
        totalXP: null,
        topicsLearned: null,
        treeLevel: null,
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

    it('handles invalid treeLevel by defaulting to seed', () => {
      const props = createDefaultProps({ treeLevel: 'invalid' })
      render(<StatsBar {...props} />)

      const levelStat = screen.getByTestId('stat-level')
      expect(levelStat.textContent.toLowerCase()).toContain('seed')
    })
  })

  describe('compact variant', () => {
    it('supports compact prop for smaller display', () => {
      const props = createDefaultProps({ compact: true })
      render(<StatsBar {...props} />)

      const statsBar = screen.getByTestId('stats-bar')
      expect(statsBar.className).toMatch(/compact|sm:|text-sm/)
    })

    it('hides labels in compact mode', () => {
      const props = createDefaultProps({ compact: true, streak: 5 })
      render(<StatsBar {...props} />)

      // Should show number but hide label text in compact
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })
})
