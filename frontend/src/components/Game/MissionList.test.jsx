/**
 * MissionList Component Tests
 *
 * Tests for the MissionList component that displays a filtered list of missions
 * with tabs for Daily/Weekly/All filters and reset timers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import MissionList from './MissionList'

describe('MissionList', () => {
  // Sample missions data for testing
  const mockMissions = [
    {
      id: 'daily-1',
      title: 'Daily Learner',
      description: 'Complete 2 lessons today',
      progress: 1,
      target: 2,
      xpReward: 25,
      type: 'daily',
      isComplete: false,
    },
    {
      id: 'daily-2',
      title: 'Quiz Champion',
      description: 'Answer 5 quiz questions',
      progress: 5,
      target: 5,
      xpReward: 50,
      type: 'daily',
      isComplete: true,
      isClaimed: false,
    },
    {
      id: 'weekly-1',
      title: 'Week Explorer',
      description: 'Explore 10 topics this week',
      progress: 4,
      target: 10,
      xpReward: 200,
      type: 'weekly',
      isComplete: false,
    },
    {
      id: 'weekly-2',
      title: 'Streak Master',
      description: 'Maintain a 7-day streak',
      progress: 7,
      target: 7,
      xpReward: 300,
      type: 'weekly',
      isComplete: true,
      isClaimed: true,
    },
  ]

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the mission list container', () => {
      render(<MissionList missions={mockMissions} onClaimMission={() => {}} />)

      expect(screen.getByTestId('mission-list')).toBeInTheDocument()
    })

    it('renders all missions when filter is "All"', () => {
      render(
        <MissionList
          missions={mockMissions}
          filter="all"
          onClaimMission={() => {}}
        />
      )

      expect(screen.getByText('Daily Learner')).toBeInTheDocument()
      expect(screen.getByText('Quiz Champion')).toBeInTheDocument()
      expect(screen.getByText('Week Explorer')).toBeInTheDocument()
      expect(screen.getByText('Streak Master')).toBeInTheDocument()
    })

    it('renders nothing but empty state when missions is empty', () => {
      render(<MissionList missions={[]} onClaimMission={() => {}} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('renders nothing but empty state when missions is null', () => {
      render(<MissionList missions={null} onClaimMission={() => {}} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })

  describe('filter tabs', () => {
    it('renders three filter tabs: Daily, Weekly, All', () => {
      render(<MissionList missions={mockMissions} onClaimMission={() => {}} />)

      expect(screen.getByRole('tab', { name: /daily/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /weekly/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument()
    })

    it('Daily tab is selected by default', () => {
      render(<MissionList missions={mockMissions} onClaimMission={() => {}} />)

      const dailyTab = screen.getByRole('tab', { name: /daily/i })
      expect(dailyTab).toHaveAttribute('aria-selected', 'true')
    })

    it('filter prop sets initial active tab', () => {
      render(
        <MissionList
          missions={mockMissions}
          filter="weekly"
          onClaimMission={() => {}}
        />
      )

      const weeklyTab = screen.getByRole('tab', { name: /weekly/i })
      expect(weeklyTab).toHaveAttribute('aria-selected', 'true')
    })

    it('clicking Daily tab filters to daily missions only', () => {
      render(
        <MissionList
          missions={mockMissions}
          filter="all"
          onClaimMission={() => {}}
        />
      )

      const dailyTab = screen.getByRole('tab', { name: /daily/i })
      fireEvent.click(dailyTab)

      expect(screen.getByText('Daily Learner')).toBeInTheDocument()
      expect(screen.getByText('Quiz Champion')).toBeInTheDocument()
      expect(screen.queryByText('Week Explorer')).not.toBeInTheDocument()
      expect(screen.queryByText('Streak Master')).not.toBeInTheDocument()
    })

    it('clicking Weekly tab filters to weekly missions only', () => {
      render(
        <MissionList
          missions={mockMissions}
          filter="daily"
          onClaimMission={() => {}}
        />
      )

      const weeklyTab = screen.getByRole('tab', { name: /weekly/i })
      fireEvent.click(weeklyTab)

      expect(screen.queryByText('Daily Learner')).not.toBeInTheDocument()
      expect(screen.queryByText('Quiz Champion')).not.toBeInTheDocument()
      expect(screen.getByText('Week Explorer')).toBeInTheDocument()
      expect(screen.getByText('Streak Master')).toBeInTheDocument()
    })

    it('clicking All tab shows all missions', () => {
      render(
        <MissionList
          missions={mockMissions}
          filter="daily"
          onClaimMission={() => {}}
        />
      )

      const allTab = screen.getByRole('tab', { name: /all/i })
      fireEvent.click(allTab)

      expect(screen.getByText('Daily Learner')).toBeInTheDocument()
      expect(screen.getByText('Week Explorer')).toBeInTheDocument()
    })

    it('tabs have proper tablist role', () => {
      render(<MissionList missions={mockMissions} onClaimMission={() => {}} />)

      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })
  })

  describe('mission card integration', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('renders MissionCard for each filtered mission', () => {
      render(
        <MissionList
          missions={mockMissions}
          filter="daily"
          onClaimMission={() => {}}
        />
      )

      const missionCards = screen.getAllByTestId('mission-card')
      expect(missionCards).toHaveLength(2) // 2 daily missions
    })

    it('passes onClaimMission to MissionCard components', () => {
      const onClaimMission = vi.fn()
      render(
        <MissionList
          missions={mockMissions}
          filter="daily"
          onClaimMission={onClaimMission}
        />
      )

      // Find all claim buttons - there are 2 daily missions but only 1 has an enabled claim button
      const claimButtons = screen.getAllByRole('button', { name: /claim/i })
      // The enabled one (complete but not claimed) should be clickable
      const enabledButton = claimButtons.find((btn) => !btn.disabled)
      fireEvent.click(enabledButton)

      // Wait for the timeout in MissionCard
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(onClaimMission).toHaveBeenCalledTimes(1)
      expect(onClaimMission).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'daily-2' })
      )
    })
  })

  describe('empty state', () => {
    it('shows empty state when no missions match filter', () => {
      const onlyDailyMissions = mockMissions.filter((m) => m.type === 'daily')
      render(
        <MissionList
          missions={onlyDailyMissions}
          filter="weekly"
          onClaimMission={() => {}}
        />
      )

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('empty state has encouraging message', () => {
      render(<MissionList missions={[]} onClaimMission={() => {}} />)

      const emptyState = screen.getByTestId('empty-state')
      expect(emptyState.textContent).toMatch(/no missions|check back|complete/i)
    })
  })

  describe('reset timer display', () => {
    it('shows daily reset timer when viewing daily missions', () => {
      render(
        <MissionList
          missions={mockMissions}
          filter="daily"
          onClaimMission={() => {}}
        />
      )

      expect(screen.getByTestId('reset-timer')).toBeInTheDocument()
      expect(screen.getByText(/resets in/i)).toBeInTheDocument()
    })

    it('shows weekly reset timer when viewing weekly missions', () => {
      render(
        <MissionList
          missions={mockMissions}
          filter="weekly"
          onClaimMission={() => {}}
        />
      )

      expect(screen.getByTestId('reset-timer')).toBeInTheDocument()
    })

    it('does not show reset timer when viewing all missions', () => {
      render(
        <MissionList
          missions={mockMissions}
          filter="all"
          onClaimMission={() => {}}
        />
      )

      expect(screen.queryByTestId('reset-timer')).not.toBeInTheDocument()
    })

    it('timer shows time until midnight for daily', () => {
      render(
        <MissionList
          missions={mockMissions}
          filter="daily"
          onClaimMission={() => {}}
        />
      )

      const timer = screen.getByTestId('reset-timer')
      // Should show hours/minutes format
      expect(timer.textContent).toMatch(/\d+h|\d+m/)
    })
  })

  describe('accessibility', () => {
    it('filter tabs are keyboard navigable', () => {
      render(<MissionList missions={mockMissions} onClaimMission={() => {}} />)

      const tabs = screen.getAllByRole('tab')
      tabs[0].focus()

      expect(document.activeElement).toBe(tabs[0])
    })

    it('tabpanel has proper association with tab', () => {
      render(<MissionList missions={mockMissions} onClaimMission={() => {}} />)

      const tabpanel = screen.getByRole('tabpanel')
      expect(tabpanel).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles missions without type gracefully', () => {
      const missionsWithoutType = [
        { ...mockMissions[0], type: undefined },
      ]

      expect(() => {
        render(
          <MissionList missions={missionsWithoutType} onClaimMission={() => {}} />
        )
      }).not.toThrow()
    })

    it('handles rapid filter switching', () => {
      render(<MissionList missions={mockMissions} onClaimMission={() => {}} />)

      const dailyTab = screen.getByRole('tab', { name: /daily/i })
      const weeklyTab = screen.getByRole('tab', { name: /weekly/i })
      const allTab = screen.getByRole('tab', { name: /all/i })

      // Rapid clicks
      fireEvent.click(weeklyTab)
      fireEvent.click(dailyTab)
      fireEvent.click(allTab)
      fireEvent.click(weeklyTab)

      // Should settle on weekly
      expect(weeklyTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Week Explorer')).toBeInTheDocument()
    })

    it('handles very long mission lists', () => {
      const manyMissions = Array.from({ length: 50 }, (_, i) => ({
        ...mockMissions[0],
        id: `mission-${i}`,
        title: `Mission ${i}`,
      }))

      render(<MissionList missions={manyMissions} onClaimMission={() => {}} />)

      const cards = screen.getAllByTestId('mission-card')
      expect(cards.length).toBe(50)
    })
  })
})
