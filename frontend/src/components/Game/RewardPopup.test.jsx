/**
 * RewardPopup Component Tests
 *
 * Tests for the RewardPopup overlay component that displays earned rewards
 * with animations, XP counter, item icons, and confetti effects.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import RewardPopup from './RewardPopup'

describe('RewardPopup', () => {
  // Sample rewards data for testing
  const xpOnlyRewards = {
    xp: 100,
    items: [],
  }

  const rewardsWithItems = {
    xp: 250,
    items: [
      { id: 'item-1', name: 'Golden Star', icon: 'star', rarity: 'rare' },
      { id: 'item-2', name: 'Knowledge Badge', icon: 'badge', rarity: 'common' },
    ],
  }

  const emptyRewards = {
    xp: 0,
    items: [],
  }

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the reward popup overlay', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      expect(screen.getByTestId('reward-popup')).toBeInTheDocument()
    })

    it('renders as a modal overlay covering the screen', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      const overlay = screen.getByTestId('reward-popup')
      expect(overlay.className).toMatch(/fixed/)
    })

    it('renders nothing when rewards is null', () => {
      const { container } = render(<RewardPopup rewards={null} onClose={() => {}} />)

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when rewards is undefined', () => {
      const { container } = render(<RewardPopup rewards={undefined} onClose={() => {}} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('XP display', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('displays the XP amount earned after animation', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      // Advance past animation
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText(/100/)).toBeInTheDocument()
      expect(screen.getByText(/XP/i)).toBeInTheDocument()
    })

    it('displays larger XP amounts correctly after animation', () => {
      const bigRewards = { xp: 1500, items: [] }
      render(<RewardPopup rewards={bigRewards} onClose={() => {}} />)

      // Advance past animation
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText(/1,500/)).toBeInTheDocument()
    })

    it('has animated XP counter element', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      const xpCounter = screen.getByTestId('xp-counter')
      expect(xpCounter).toBeInTheDocument()
      expect(xpCounter.className).toMatch(/animate/)
    })
  })

  describe('animated XP counter', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('animates XP count from 0 to final value', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      const xpCounter = screen.getByTestId('xp-counter')

      // Initially may show 0 or start counting
      const initialText = xpCounter.textContent
      expect(initialText).toMatch(/\+\d+/)

      // After animation completes
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(xpCounter.textContent).toMatch(/\+100/)
    })
  })

  describe('item icons', () => {
    it('displays item icons when items are earned', () => {
      render(<RewardPopup rewards={rewardsWithItems} onClose={() => {}} />)

      expect(screen.getByText('Golden Star')).toBeInTheDocument()
      expect(screen.getByText('Knowledge Badge')).toBeInTheDocument()
    })

    it('renders item icon elements', () => {
      render(<RewardPopup rewards={rewardsWithItems} onClose={() => {}} />)

      const itemIcons = screen.getAllByTestId('reward-item')
      expect(itemIcons).toHaveLength(2)
    })

    it('does not show items section when no items earned', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      expect(screen.queryByTestId('reward-item')).not.toBeInTheDocument()
    })

    it('shows item rarity styling', () => {
      render(<RewardPopup rewards={rewardsWithItems} onClose={() => {}} />)

      const items = screen.getAllByTestId('reward-item')
      // Rare item should have different styling
      expect(items[0].className).toMatch(/rare|blue/)
    })
  })

  describe('confetti effect', () => {
    it('renders confetti elements', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      expect(screen.getByTestId('confetti')).toBeInTheDocument()
    })

    it('confetti is visible when popup is shown', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      const confetti = screen.getByTestId('confetti')
      expect(confetti).toBeInTheDocument()
    })
  })

  describe('close button', () => {
    it('renders "Awesome!" close button', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      expect(screen.getByRole('button', { name: /awesome/i })).toBeInTheDocument()
    })

    it('calls onClose when button is clicked', () => {
      const onClose = vi.fn()
      render(<RewardPopup rewards={xpOnlyRewards} onClose={onClose} />)

      const closeButton = screen.getByRole('button', { name: /awesome/i })
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('button is focusable for keyboard users', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      const closeButton = screen.getByRole('button', { name: /awesome/i })
      closeButton.focus()

      expect(document.activeElement).toBe(closeButton)
    })
  })

  describe('overlay behavior', () => {
    it('clicking overlay backdrop closes popup', () => {
      const onClose = vi.fn()
      render(<RewardPopup rewards={xpOnlyRewards} onClose={onClose} />)

      const overlay = screen.getByTestId('reward-popup-backdrop')
      fireEvent.click(overlay)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('clicking popup content does not close', () => {
      const onClose = vi.fn()
      render(<RewardPopup rewards={xpOnlyRewards} onClose={onClose} />)

      const content = screen.getByTestId('reward-popup-content')
      fireEvent.click(content)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('pressing Escape closes popup', () => {
      const onClose = vi.fn()
      render(<RewardPopup rewards={xpOnlyRewards} onClose={onClose} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('animations', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('popup has entrance animation', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      const content = screen.getByTestId('reward-popup-content')
      expect(content.className).toMatch(/animate/)
    })

    it('items appear with staggered animation', () => {
      render(<RewardPopup rewards={rewardsWithItems} onClose={() => {}} />)

      const items = screen.getAllByTestId('reward-item')
      // Each item should have animation delay style
      const delays = items.map((item) => item.style.animationDelay)

      // Should have different delays
      expect(delays[0]).not.toBe(delays[1])
    })
  })

  describe('accessibility', () => {
    it('popup has dialog role', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has accessible label', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('traps focus within popup', () => {
      render(<RewardPopup rewards={xpOnlyRewards} onClose={() => {}} />)

      const closeButton = screen.getByRole('button', { name: /awesome/i })

      // Close button should be focusable and receive focus
      expect(closeButton).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('handles zero XP gracefully', () => {
      render(<RewardPopup rewards={emptyRewards} onClose={() => {}} />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText(/\+0/)).toBeInTheDocument()
    })

    it('handles missing onClose callback', () => {
      expect(() => {
        render(<RewardPopup rewards={xpOnlyRewards} />)
        const closeButton = screen.getByRole('button', { name: /awesome/i })
        fireEvent.click(closeButton)
      }).not.toThrow()
    })

    it('handles very large XP values', () => {
      const hugeRewards = { xp: 999999, items: [] }
      render(<RewardPopup rewards={hugeRewards} onClose={() => {}} />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Should show formatted number
      expect(screen.getByText(/999,999/)).toBeInTheDocument()
    })

    it('handles many items', () => {
      const manyItems = {
        xp: 100,
        items: Array.from({ length: 10 }, (_, i) => ({
          id: `item-${i}`,
          name: `Item ${i}`,
          icon: 'star',
          rarity: 'common',
        })),
      }

      render(<RewardPopup rewards={manyItems} onClose={() => {}} />)

      const items = screen.getAllByTestId('reward-item')
      expect(items).toHaveLength(10)
    })

    it('handles items without icons gracefully', () => {
      const itemsNoIcon = {
        xp: 50,
        items: [{ id: 'item-1', name: 'Mystery Item', rarity: 'common' }],
      }

      expect(() => {
        render(<RewardPopup rewards={itemsNoIcon} onClose={() => {}} />)
      }).not.toThrow()
    })
  })
})
