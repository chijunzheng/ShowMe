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
    description: 'Ready for launch!',
  }

  const mockNextRank = {
    level: 3,
    id: 'navigator',
    title: 'Navigator',
    icon: 'COMPASS',
    minTopics: 8,
    description: 'Charting new courses',
  }

  describe('basic rendering', () => {
    it('renders the progress component', () => {
      render(
        <ExplorerRankProgress
          currentTopics={5}
          topicsForNextRank={3}
          currentRank={mockCurrentRank}
          nextRank={mockNextRank}
        />
      )

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress).toBeTruthy()
    })

    it('displays current rank icon', () => {
      render(
        <ExplorerRankProgress
          currentTopics={5}
          topicsForNextRank={3}
          currentRank={mockCurrentRank}
          nextRank={mockNextRank}
        />
      )

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toContain('ROCKET')
    })

    it('displays next rank icon', () => {
      render(
        <ExplorerRankProgress
          currentTopics={5}
          topicsForNextRank={3}
          currentRank={mockCurrentRank}
          nextRank={mockNextRank}
        />
      )

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toContain('COMPASS')
    })
  })

  describe('progress bar', () => {
    it('has progressbar role', () => {
      render(
        <ExplorerRankProgress
          currentTopics={5}
          topicsForNextRank={3}
          currentRank={mockCurrentRank}
          nextRank={mockNextRank}
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeTruthy()
    })

    it('has correct aria values', () => {
      render(
        <ExplorerRankProgress
          currentTopics={5}
          topicsForNextRank={3}
          currentRank={mockCurrentRank}
          nextRank={mockNextRank}
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar.getAttribute('aria-valuemin')).toBe('0')
      expect(progressBar.getAttribute('aria-valuemax')).toBe('100')
    })
  })

  describe('progress text', () => {
    it('shows topics remaining text', () => {
      render(
        <ExplorerRankProgress
          currentTopics={5}
          topicsForNextRank={3}
          currentRank={mockCurrentRank}
          nextRank={mockNextRank}
        />
      )

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toContain('3')
      expect(progress.textContent.toLowerCase()).toContain('topic')
      expect(progress.textContent).toContain('Navigator')
    })

    it('shows singular topic when 1 topic remaining', () => {
      render(
        <ExplorerRankProgress
          currentTopics={7}
          topicsForNextRank={1}
          currentRank={mockCurrentRank}
          nextRank={mockNextRank}
        />
      )

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toMatch(/1 topic/i)
    })

    it('shows plural topics when multiple topics remaining', () => {
      render(
        <ExplorerRankProgress
          currentTopics={5}
          topicsForNextRank={3}
          currentRank={mockCurrentRank}
          nextRank={mockNextRank}
        />
      )

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toMatch(/3 topics/i)
    })
  })

  describe('max rank state', () => {
    it('shows max rank achieved message when no next rank', () => {
      render(
        <ExplorerRankProgress
          currentTopics={60}
          topicsForNextRank={0}
          currentRank={{
            level: 7,
            id: 'pioneer',
            title: 'Pioneer',
            icon: 'STAR',
            minTopics: 60,
            description: 'Legendary space pioneer',
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
          currentTopics={60}
          topicsForNextRank={0}
          currentRank={{
            level: 7,
            id: 'pioneer',
            title: 'Pioneer',
            icon: 'STAR',
            minTopics: 60,
            description: 'Legendary space pioneer',
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
          currentTopics={5}
          topicsForNextRank={3}
          currentRank={mockCurrentRank}
          nextRank={mockNextRank}
        />
      )

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toContain('5')
    })

    it('shows next rank threshold', () => {
      render(
        <ExplorerRankProgress
          currentTopics={5}
          topicsForNextRank={3}
          currentRank={mockCurrentRank}
          nextRank={mockNextRank}
        />
      )

      const progress = screen.getByTestId('explorer-rank-progress')
      expect(progress.textContent).toContain('8') // next rank threshold
    })
  })
})
