/**
 * MissionCard Component Tests
 *
 * Tests for the MissionCard component that displays individual missions
 * with progress tracking, rewards, and claim functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import MissionCard from './MissionCard'

describe('MissionCard', () => {
  // Sample mission data for testing
  const incompleteMission = {
    id: 'mission-1',
    title: 'First Steps',
    description: 'Complete 3 lessons',
    progress: 1,
    target: 3,
    xpReward: 50,
    type: 'daily',
    isComplete: false,
  }

  const completeMission = {
    id: 'mission-2',
    title: 'Knowledge Seeker',
    description: 'Learn 5 new topics',
    progress: 5,
    target: 5,
    xpReward: 100,
    type: 'weekly',
    isComplete: true,
    isClaimed: false,
  }

  const claimedMission = {
    id: 'mission-3',
    title: 'Quiz Master',
    description: 'Answer 10 quiz questions',
    progress: 10,
    target: 10,
    xpReward: 75,
    type: 'daily',
    isComplete: true,
    isClaimed: true,
  }

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders mission title and description', () => {
      render(<MissionCard mission={incompleteMission} onClaim={() => {}} />)

      expect(screen.getByText('First Steps')).toBeInTheDocument()
      expect(screen.getByText('Complete 3 lessons')).toBeInTheDocument()
    })

    it('renders nothing when mission is null', () => {
      const { container } = render(<MissionCard mission={null} onClaim={() => {}} />)

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when mission is undefined', () => {
      const { container } = render(<MissionCard mission={undefined} onClaim={() => {}} />)

      expect(container.firstChild).toBeNull()
    })

    it('has appropriate test id for targeting', () => {
      render(<MissionCard mission={incompleteMission} onClaim={() => {}} />)

      expect(screen.getByTestId('mission-card')).toBeInTheDocument()
    })
  })

  describe('progress display', () => {
    it('displays progress as fraction (e.g., "1/3")', () => {
      render(<MissionCard mission={incompleteMission} onClaim={() => {}} />)

      expect(screen.getByText('1/3')).toBeInTheDocument()
    })

    it('displays full progress for complete missions', () => {
      render(<MissionCard mission={completeMission} onClaim={() => {}} />)

      expect(screen.getByText('5/5')).toBeInTheDocument()
    })

    it('renders a progress bar element', () => {
      render(<MissionCard mission={incompleteMission} onClaim={() => {}} />)

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
    })

    it('progress bar shows correct fill percentage', () => {
      render(<MissionCard mission={incompleteMission} onClaim={() => {}} />)

      const progressBar = screen.getByTestId('progress-bar-fill')
      // 1/3 = ~33.33%
      expect(progressBar.style.width).toBe('33.33333333333333%')
    })

    it('progress bar shows 100% for complete missions', () => {
      render(<MissionCard mission={completeMission} onClaim={() => {}} />)

      const progressBar = screen.getByTestId('progress-bar-fill')
      expect(progressBar.style.width).toBe('100%')
    })
  })

  describe('reward preview', () => {
    it('displays XP reward amount', () => {
      render(<MissionCard mission={incompleteMission} onClaim={() => {}} />)

      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText('XP')).toBeInTheDocument()
    })

    it('displays different XP amounts correctly', () => {
      render(<MissionCard mission={completeMission} onClaim={() => {}} />)

      expect(screen.getByText('100')).toBeInTheDocument()
    })
  })

  describe('claim button', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('claim button is disabled when mission is incomplete', () => {
      render(<MissionCard mission={incompleteMission} onClaim={() => {}} />)

      const claimButton = screen.getByRole('button', { name: /claim/i })
      expect(claimButton).toBeDisabled()
    })

    it('claim button is enabled when mission is complete but not claimed', () => {
      render(<MissionCard mission={completeMission} onClaim={() => {}} />)

      const claimButton = screen.getByRole('button', { name: /claim/i })
      expect(claimButton).not.toBeDisabled()
    })

    it('claim button calls onClaim with mission when clicked', () => {
      const onClaim = vi.fn()
      render(<MissionCard mission={completeMission} onClaim={onClaim} />)

      const claimButton = screen.getByRole('button', { name: /claim/i })
      fireEvent.click(claimButton)

      // onClaim is called after a 300ms timeout
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(onClaim).toHaveBeenCalledTimes(1)
      expect(onClaim).toHaveBeenCalledWith(completeMission)
    })

    it('claim button does not call onClaim when mission is incomplete', () => {
      const onClaim = vi.fn()
      render(<MissionCard mission={incompleteMission} onClaim={onClaim} />)

      const claimButton = screen.getByRole('button', { name: /claim/i })
      fireEvent.click(claimButton)

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(onClaim).not.toHaveBeenCalled()
    })

    it('shows "Claimed" text instead of button when already claimed', () => {
      render(<MissionCard mission={claimedMission} onClaim={() => {}} />)

      expect(screen.getByText(/claimed/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /claim/i })).not.toBeInTheDocument()
    })
  })

  describe('celebratory animation', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows animation when claiming', () => {
      const onClaim = vi.fn()
      render(<MissionCard mission={completeMission} onClaim={onClaim} />)

      const claimButton = screen.getByRole('button', { name: /claim/i })

      act(() => {
        fireEvent.click(claimButton)
      })

      // Should show celebration animation class
      const card = screen.getByTestId('mission-card')
      expect(card.className).toContain('animate-claim')
    })
  })

  describe('visual states', () => {
    it('has distinct styling for complete missions', () => {
      // Render incomplete mission
      const { unmount } = render(
        <MissionCard mission={incompleteMission} onClaim={() => {}} />
      )
      const incompleteCard = screen.getByTestId('mission-card')
      const incompleteClasses = incompleteCard.className

      // Unmount and render complete mission
      unmount()

      render(<MissionCard mission={completeMission} onClaim={() => {}} />)
      const completeCard = screen.getByTestId('mission-card')
      const completeClasses = completeCard.className

      // Classes should differ for complete vs incomplete
      expect(incompleteClasses).not.toBe(completeClasses)
    })

    it('shows claimed missions with muted styling', () => {
      render(<MissionCard mission={claimedMission} onClaim={() => {}} />)

      const card = screen.getByTestId('mission-card')
      expect(card.className).toMatch(/opacity|claimed|muted/i)
    })
  })

  describe('accessibility', () => {
    it('claim button has accessible name', () => {
      render(<MissionCard mission={completeMission} onClaim={() => {}} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAccessibleName()
    })

    it('progress has aria attributes', () => {
      render(<MissionCard mission={incompleteMission} onClaim={() => {}} />)

      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('role', 'progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '1')
      expect(progressBar).toHaveAttribute('aria-valuemax', '3')
    })
  })

  describe('edge cases', () => {
    it('handles mission with zero progress', () => {
      const zeroProgressMission = { ...incompleteMission, progress: 0 }
      render(<MissionCard mission={zeroProgressMission} onClaim={() => {}} />)

      expect(screen.getByText('0/3')).toBeInTheDocument()
      const progressBar = screen.getByTestId('progress-bar-fill')
      expect(progressBar.style.width).toBe('0%')
    })

    it('handles mission with zero target gracefully', () => {
      const zeroTargetMission = { ...incompleteMission, target: 0, progress: 0 }
      const { container } = render(
        <MissionCard mission={zeroTargetMission} onClaim={() => {}} />
      )

      // Should not crash
      expect(container).toBeTruthy()
    })

    it('handles very large XP rewards', () => {
      const bigRewardMission = { ...completeMission, xpReward: 10000 }
      render(<MissionCard mission={bigRewardMission} onClaim={() => {}} />)

      expect(screen.getByText('10,000')).toBeInTheDocument()
    })

    it('handles missing onClaim callback gracefully', () => {
      vi.useFakeTimers()

      // Should not crash when onClaim is undefined
      expect(() => {
        render(<MissionCard mission={completeMission} />)
        const claimButton = screen.getByRole('button', { name: /claim/i })
        fireEvent.click(claimButton)
        act(() => {
          vi.advanceTimersByTime(300)
        })
      }).not.toThrow()

      vi.useRealTimers()
    })
  })
})
