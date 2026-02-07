/**
 * ExplorerRankProgress Component Tests
 *
 * Tests for the rank progress indicator component.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import ExplorerRankProgress from '../ExplorerRankProgress'

describe('ExplorerRankProgress', () => {
  afterEach(() => {
    cleanup()
  })

  const mockCurrentRank = {
    level: 2,
    id: 'cadet',
    title: 'Space Cadet',
    icon: 'ROCKET',
    minTopics: 3,
    minXP: 150,
    description: 'Ready for launch!',
  }

  const mockNextRank = {
    level: 3,
    id: 'navigator',
    title: 'Navigator',
    icon: 'COMPASS',
    minTopics: 8,
    minXP: 350,
    description: 'Charting new courses',
  }

  const baseProps = {
    currentTopics: 5,
    topicsForNextRank: 3,
    currentXP: 200,
    xpForNextRank: 150,
    currentRank: mockCurrentRank,
    nextRank: mockNextRank,
  }

  describe('basic rendering', () => {
    it('renders the progress component', () => {
      render(<ExplorerRankProgress {...baseProps} />)

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress).toBeTruthy()
    })

    it('displays current rank icon', () => {
      render(<ExplorerRankProgress {...baseProps} />)

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toContain('ROCKET')
    })

    it('displays next rank icon', () => {
      render(<ExplorerRankProgress {...baseProps} />)

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toContain('COMPASS')
    })
  })

  describe('progress bar', () => {
    it('has progressbar role', () => {
      render(<ExplorerRankProgress {...baseProps} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeTruthy()
    })

    it('has correct aria values', () => {
      render(<ExplorerRankProgress {...baseProps} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar.getAttribute('aria-valuemin')).toBe('0')
      expect(progressBar.getAttribute('aria-valuemax')).toBe('100')
    })
  })

  describe('progress text', () => {
    it('shows topics remaining text', () => {
      render(<ExplorerRankProgress {...baseProps} />)

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toContain('3')
      expect(progress.textContent.toLowerCase()).toContain('topic')
      expect(progress.textContent).toContain('Navigator')
    })

    it('shows singular topic when 1 topic remaining', () => {
      render(
        <ExplorerRankProgress
          {...baseProps}
          currentTopics={7}
          topicsForNextRank={1}
        />
      )

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toMatch(/1 topic/i)
    })

    it('shows plural topics when multiple topics remaining', () => {
      render(<ExplorerRankProgress {...baseProps} />)

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toMatch(/3 topics/i)
    })
  })

  describe('max rank state', () => {
    it('shows max rank achieved message when no next rank', () => {
      render(
        <ExplorerRankProgress
          currentTopics={120}
          topicsForNextRank={0}
          currentXP={9000}
          xpForNextRank={0}
          currentRank={{
            level: 12,
            id: 'luminary',
            title: 'Legendary Luminary',
            icon: 'SUN',
            minTopics: 120,
            minXP: 9000,
            description: 'A beacon of knowledge',
          }}
          nextRank={null}
        />
      )

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent.toLowerCase()).toContain('maximum rank')
    })

    it('shows star icon for max rank', () => {
      render(
        <ExplorerRankProgress
          currentTopics={120}
          topicsForNextRank={0}
          currentXP={9000}
          xpForNextRank={0}
          currentRank={{
            level: 12,
            id: 'luminary',
            title: 'Legendary Luminary',
            icon: 'SUN',
            minTopics: 120,
            minXP: 9000,
            description: 'A beacon of knowledge',
          }}
          nextRank={null}
        />
      )

      const progress = screen.getByTestId('explorer-rank-progress')
      // Should contain a star somewhere (for the "next" position)
      expect(progress.innerHTML).toMatch(/⭐|star/i)
    })
  })

  describe('current topics display', () => {
    it('shows current topic count', () => {
      render(
        <ExplorerRankProgress
          {...baseProps}
        />
      )

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toContain('5')
    })

    it('shows next rank threshold', () => {
      render(
        <ExplorerRankProgress
          {...baseProps}
        />
      )

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toContain('8') // next rank threshold
    })
  })
})
