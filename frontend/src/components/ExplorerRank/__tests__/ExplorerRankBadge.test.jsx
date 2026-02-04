/**
 * ExplorerRankBadge Component Tests
 *
 * Tests for the rank badge display component.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ExplorerRankBadge from '../ExplorerRankBadge'

describe('ExplorerRankBadge', () => {
  afterEach(() => {
    cleanup()
  })

  describe('basic rendering', () => {
    it('renders badge with icon and title', () => {
      render(
        <ExplorerRankBadge
          level={1}
          title="Stargazer"
          icon="\uD83D\uDD2D"
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      expect(badge).toBeTruthy()
      expect(badge.textContent).toContain('Stargazer')
    })

    it('renders icon', () => {
      render(
        <ExplorerRankBadge
          level={2}
          title="Space Cadet"
          icon="ROCKET"
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      expect(badge.textContent).toContain('ROCKET')
    })

    it('has aria-label for accessibility', () => {
      render(
        <ExplorerRankBadge
          level={3}
          title="Navigator"
          icon="\uD83E\uDDED"
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      expect(badge.getAttribute('aria-label')).toContain('Navigator')
      expect(badge.getAttribute('aria-label')).toContain('Level 3')
    })
  })

  describe('size variants', () => {
    it('renders compact size with icon only', () => {
      render(
        <ExplorerRankBadge
          level={1}
          title="Stargazer"
          icon="TELESCOPE"
          size="compact"
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      // Compact should have icon but not visible title text
      expect(badge.textContent).toContain('TELESCOPE')
      // Title should be in title attribute, not text
      expect(badge.getAttribute('title')).toContain('Stargazer')
    })

    it('renders standard size with icon and title', () => {
      render(
        <ExplorerRankBadge
          level={2}
          title="Space Cadet"
          icon="\uD83D\uDE80"
          size="standard"
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      expect(badge.textContent).toContain('Space Cadet')
    })

    it('renders large size with icon, title, and level', () => {
      render(
        <ExplorerRankBadge
          level={4}
          title="Explorer"
          icon="\uD83C\uDF0C"
          size="large"
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      expect(badge.textContent).toContain('Explorer')
      expect(badge.textContent).toContain('Level 4')
    })

    it('defaults to standard size', () => {
      render(
        <ExplorerRankBadge
          level={1}
          title="Stargazer"
          icon="\uD83D\uDD2D"
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      // Standard shows title
      expect(badge.textContent).toContain('Stargazer')
      // But not level subtitle
      expect(badge.textContent).not.toContain('Level 1')
    })
  })

  describe('showTitle prop', () => {
    it('shows title when showTitle is true', () => {
      render(
        <ExplorerRankBadge
          level={1}
          title="Stargazer"
          icon="\uD83D\uDD2D"
          showTitle={true}
        />
      )

      expect(screen.getByTestId('explorer-rank-badge').textContent).toContain('Stargazer')
    })

    it('hides title when showTitle is false', () => {
      render(
        <ExplorerRankBadge
          level={1}
          title="Stargazer"
          icon="TELESCOPE"
          showTitle={false}
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      // Should still have icon
      expect(badge.textContent).toContain('TELESCOPE')
      // But not title text
      expect(badge.textContent).not.toContain('Stargazer')
    })
  })

  describe('onClick handler', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn()

      render(
        <ExplorerRankBadge
          level={1}
          title="Stargazer"
          icon="\uD83D\uDD2D"
          onClick={handleClick}
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      fireEvent.click(badge)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('has button role when clickable', () => {
      const handleClick = vi.fn()

      render(
        <ExplorerRankBadge
          level={1}
          title="Stargazer"
          icon="\uD83D\uDD2D"
          onClick={handleClick}
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      expect(badge.getAttribute('role')).toBe('button')
    })

    it('has status role when not clickable', () => {
      render(
        <ExplorerRankBadge
          level={1}
          title="Stargazer"
          icon="\uD83D\uDD2D"
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      expect(badge.getAttribute('role')).toBe('status')
    })

    it('is keyboard accessible when clickable', () => {
      const handleClick = vi.fn()

      render(
        <ExplorerRankBadge
          level={1}
          title="Stargazer"
          icon="\uD83D\uDD2D"
          onClick={handleClick}
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      fireEvent.keyDown(badge, { key: 'Enter' })

      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('level-based styling', () => {
    it('applies different styles for different levels', () => {
      const { rerender } = render(
        <ExplorerRankBadge
          level={1}
          title="Stargazer"
          icon="\uD83D\uDD2D"
        />
      )

      const badge1 = screen.getByTestId('explorer-rank-badge')
      const classes1 = badge1.className

      rerender(
        <ExplorerRankBadge
          level={7}
          title="Pioneer"
          icon="\u2B50"
        />
      )

      const badge7 = screen.getByTestId('explorer-rank-badge')
      const classes7 = badge7.className

      // Classes should be different for different levels
      expect(classes1).not.toBe(classes7)
    })

    it('has shimmer class for max rank (level 7)', () => {
      render(
        <ExplorerRankBadge
          level={7}
          title="Pioneer"
          icon="\u2B50"
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      expect(badge.className).toContain('shimmer')
    })
  })

  describe('edge cases', () => {
    it('handles invalid level gracefully', () => {
      render(
        <ExplorerRankBadge
          level={0}
          title="Unknown"
          icon="?"
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      expect(badge).toBeTruthy()
    })

    it('handles level above max gracefully', () => {
      render(
        <ExplorerRankBadge
          level={99}
          title="Unknown"
          icon="?"
        />
      )

      const badge = screen.getByTestId('explorer-rank-badge')
      expect(badge).toBeTruthy()
    })
  })
})
