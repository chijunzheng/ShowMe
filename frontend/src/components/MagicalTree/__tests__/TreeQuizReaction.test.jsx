/**
 * TreeQuizReaction Component Tests
 *
 * TDD: These tests define the behavior for the TreeQuizReaction component
 * BEFORE implementation. The component displays visual reactions on the
 * Magical Tree when quiz results occur.
 *
 * Reaction Types:
 * - pass: Shimmer effect with leaves
 * - perfect: Growth animation with sparkles
 * - boss_victory: Dance animation with fireworks
 * - streak: Quick glow with streaks
 * - fail: Gentle droop (encouraging)
 *
 * Test Coverage Target: 80%+
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor, act } from '@testing-library/react'

// Mock window.matchMedia for animations
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock sound effects
vi.mock('@/utils/soundEffects', () => ({
  playEvolutionSound: vi.fn(),
  playTierUpSound: vi.fn(),
  playBossVictorySound: vi.fn(),
  playStreakSound: vi.fn(),
}))

// Import component (will fail until implemented)
import TreeQuizReaction from '../TreeQuizReaction'

// Import mocked sound effects for verification
import {
  playEvolutionSound,
  playTierUpSound,
  playBossVictorySound,
  playStreakSound,
} from '@/utils/soundEffects'

/**
 * Default props for TreeQuizReaction component
 */
const createDefaultProps = (overrides = {}) => ({
  reaction: {
    type: 'pass',
    score: 80,
    topicName: 'Dinosaurs',
    timestamp: Date.now(),
  },
  onComplete: vi.fn(),
  ...overrides,
})

describe('TreeQuizReaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps()
      render(<TreeQuizReaction {...props} />)

      expect(screen.getByTestId('tree-quiz-reaction')).toBeInTheDocument()
    })

    it('renders nothing when reaction is null', () => {
      const props = createDefaultProps({ reaction: null })
      const { container } = render(<TreeQuizReaction {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when reaction is undefined', () => {
      const props = createDefaultProps({ reaction: undefined })
      const { container } = render(<TreeQuizReaction {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('has aria-hidden on overlay (decorative)', () => {
      const props = createDefaultProps()
      render(<TreeQuizReaction {...props} />)

      const overlay = screen.getByTestId('tree-quiz-reaction')
      expect(overlay).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('pass reaction', () => {
    it('renders pass reaction correctly', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass', score: 75 },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element).toHaveAttribute('data-reaction-type', 'pass')
    })

    it('applies emerald color styling', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass' },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element.className).toMatch(/emerald/)
    })

    it('shows shimmer animation', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass' },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element.className).toMatch(/shimmer/)
    })

    it('renders leaves particles', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(screen.getByTestId('particles-leaves')).toBeInTheDocument()
    })

    it('plays evolution sound', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(playEvolutionSound).toHaveBeenCalledTimes(1)
    })

    it('shows growing message', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(screen.getByText(/your tree is growing/i)).toBeInTheDocument()
    })

    it('auto-dismisses after 2000ms', () => {
      const onComplete = vi.fn()
      const props = createDefaultProps({
        reaction: { type: 'pass' },
        onComplete,
      })
      render(<TreeQuizReaction {...props} />)

      expect(onComplete).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('perfect reaction', () => {
    it('renders perfect reaction correctly', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect', score: 100 },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element).toHaveAttribute('data-reaction-type', 'perfect')
    })

    it('applies amber color styling', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element.className).toMatch(/amber/)
    })

    it('shows growth animation', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element.className).toMatch(/growth/)
    })

    it('renders sparkles particles', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(screen.getByTestId('particles-sparkles')).toBeInTheDocument()
    })

    it('plays tier up sound', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(playTierUpSound).toHaveBeenCalledTimes(1)
    })

    it('shows shining message', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(screen.getByText(/perfect.*tree shines/i)).toBeInTheDocument()
    })

    it('auto-dismisses after 3000ms', () => {
      const onComplete = vi.fn()
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
        onComplete,
      })
      render(<TreeQuizReaction {...props} />)

      act(() => {
        vi.advanceTimersByTime(2999)
      })
      expect(onComplete).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(1)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('boss_victory reaction', () => {
    it('renders boss_victory reaction correctly', () => {
      const props = createDefaultProps({
        reaction: { type: 'boss_victory', score: 100 },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element).toHaveAttribute('data-reaction-type', 'boss_victory')
    })

    it('applies purple color styling', () => {
      const props = createDefaultProps({
        reaction: { type: 'boss_victory' },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element.className).toMatch(/purple/)
    })

    it('shows dance animation', () => {
      const props = createDefaultProps({
        reaction: { type: 'boss_victory' },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element.className).toMatch(/dance/)
    })

    it('renders fireworks particles', () => {
      const props = createDefaultProps({
        reaction: { type: 'boss_victory' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(screen.getByTestId('particles-fireworks')).toBeInTheDocument()
    })

    it('plays boss victory sound', () => {
      const props = createDefaultProps({
        reaction: { type: 'boss_victory' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(playBossVictorySound).toHaveBeenCalledTimes(1)
    })

    it('shows boss defeated message', () => {
      const props = createDefaultProps({
        reaction: { type: 'boss_victory' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(screen.getByText(/boss defeated.*tree power/i)).toBeInTheDocument()
    })

    it('auto-dismisses after 3500ms (longest)', () => {
      const onComplete = vi.fn()
      const props = createDefaultProps({
        reaction: { type: 'boss_victory' },
        onComplete,
      })
      render(<TreeQuizReaction {...props} />)

      act(() => {
        vi.advanceTimersByTime(3499)
      })
      expect(onComplete).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(1)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('streak reaction', () => {
    it('renders streak reaction correctly', () => {
      const props = createDefaultProps({
        reaction: { type: 'streak', streakCount: 5 },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element).toHaveAttribute('data-reaction-type', 'streak')
    })

    it('applies cyan color styling', () => {
      const props = createDefaultProps({
        reaction: { type: 'streak' },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element.className).toMatch(/cyan/)
    })

    it('shows glow animation', () => {
      const props = createDefaultProps({
        reaction: { type: 'streak' },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element.className).toMatch(/glow/)
    })

    it('renders streaks particles', () => {
      const props = createDefaultProps({
        reaction: { type: 'streak' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(screen.getByTestId('particles-streaks')).toBeInTheDocument()
    })

    it('plays streak sound', () => {
      const props = createDefaultProps({
        reaction: { type: 'streak' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(playStreakSound).toHaveBeenCalledTimes(1)
    })

    it('does NOT show a message (non-intrusive)', () => {
      const props = createDefaultProps({
        reaction: { type: 'streak' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(screen.queryByTestId('reaction-message')).not.toBeInTheDocument()
    })

    it('auto-dismisses after 1500ms (shortest)', () => {
      const onComplete = vi.fn()
      const props = createDefaultProps({
        reaction: { type: 'streak' },
        onComplete,
      })
      render(<TreeQuizReaction {...props} />)

      act(() => {
        vi.advanceTimersByTime(1499)
      })
      expect(onComplete).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(1)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('shows streak count when provided', () => {
      const props = createDefaultProps({
        reaction: { type: 'streak', streakCount: 5 },
      })
      render(<TreeQuizReaction {...props} />)

      expect(screen.getByTestId('streak-count')).toHaveTextContent('5')
    })
  })

  describe('fail reaction', () => {
    it('renders fail reaction correctly', () => {
      const props = createDefaultProps({
        reaction: { type: 'fail', score: 40 },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element).toHaveAttribute('data-reaction-type', 'fail')
    })

    it('applies slate color styling', () => {
      const props = createDefaultProps({
        reaction: { type: 'fail' },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element.className).toMatch(/slate/)
    })

    it('shows gentle_droop animation', () => {
      const props = createDefaultProps({
        reaction: { type: 'fail' },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element.className).toMatch(/gentle.?droop|droop/)
    })

    it('does NOT render particles (sympathetic)', () => {
      const props = createDefaultProps({
        reaction: { type: 'fail' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(screen.queryByTestId(/^particles-/)).not.toBeInTheDocument()
    })

    it('does NOT play any sound (kind to kids)', () => {
      const props = createDefaultProps({
        reaction: { type: 'fail' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(playEvolutionSound).not.toHaveBeenCalled()
      expect(playTierUpSound).not.toHaveBeenCalled()
      expect(playBossVictorySound).not.toHaveBeenCalled()
      expect(playStreakSound).not.toHaveBeenCalled()
    })

    it('shows encouraging message', () => {
      const props = createDefaultProps({
        reaction: { type: 'fail' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(screen.getByText(/keep learning.*believes in you/i)).toBeInTheDocument()
    })

    it('auto-dismisses after 1200ms', () => {
      const onComplete = vi.fn()
      const props = createDefaultProps({
        reaction: { type: 'fail' },
        onComplete,
      })
      render(<TreeQuizReaction {...props} />)

      act(() => {
        vi.advanceTimersByTime(1200)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('animation phases', () => {
    it('starts in enter phase', () => {
      const props = createDefaultProps()
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element).toHaveAttribute('data-phase', 'enter')
    })

    it('transitions to active phase', () => {
      const props = createDefaultProps()
      render(<TreeQuizReaction {...props} />)

      act(() => {
        vi.advanceTimersByTime(300) // Enter animation duration
      })

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element).toHaveAttribute('data-phase', 'active')
    })

    it('transitions to exit phase before completion', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass' }, // 2000ms duration
      })
      render(<TreeQuizReaction {...props} />)

      act(() => {
        vi.advanceTimersByTime(1700) // Near end of duration
      })

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element).toHaveAttribute('data-phase', 'exit')
    })
  })

  describe('particle rendering', () => {
    it('renders correct number of particles for leaves', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass' },
      })
      render(<TreeQuizReaction {...props} />)

      const particles = screen.getByTestId('particles-leaves')
      const particleElements = particles.querySelectorAll('[data-particle]')
      expect(particleElements.length).toBeGreaterThan(0)
    })

    it('renders more particles for fireworks than leaves', () => {
      // First render to get leaves count
      render(
        <TreeQuizReaction
          reaction={{ type: 'pass' }}
          onComplete={vi.fn()}
        />
      )
      const leavesCount = screen
        .getByTestId('particles-leaves')
        .querySelectorAll('[data-particle]').length

      cleanup()

      // Second render to get fireworks count
      render(
        <TreeQuizReaction
          reaction={{ type: 'boss_victory' }}
          onComplete={vi.fn()}
        />
      )
      const fireworksCount = screen
        .getByTestId('particles-fireworks')
        .querySelectorAll('[data-particle]').length

      expect(fireworksCount).toBeGreaterThan(leavesCount)
    })
  })

  describe('edge cases', () => {
    it('handles unknown reaction type by defaulting to pass', () => {
      const props = createDefaultProps({
        reaction: { type: 'unknown' },
      })
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element).toHaveAttribute('data-reaction-type', 'pass')
    })

    it('handles missing onComplete gracefully', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass' },
        onComplete: undefined,
      })

      expect(() => render(<TreeQuizReaction {...props} />)).not.toThrow()

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Should not throw
    })

    it('cleans up timer on unmount', () => {
      const onComplete = vi.fn()
      const props = createDefaultProps({
        reaction: { type: 'pass' },
        onComplete,
      })

      const { unmount } = render(<TreeQuizReaction {...props} />)

      act(() => {
        vi.advanceTimersByTime(1000) // Halfway through
      })

      unmount()

      act(() => {
        vi.advanceTimersByTime(2000) // Past completion time
      })

      // onComplete should NOT be called after unmount
      expect(onComplete).not.toHaveBeenCalled()
    })

    it('handles reaction change during animation', () => {
      const onComplete = vi.fn()
      const props = createDefaultProps({
        reaction: { type: 'pass' },
        onComplete,
      })

      const { rerender } = render(<TreeQuizReaction {...props} />)

      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Change reaction mid-animation
      rerender(
        <TreeQuizReaction
          reaction={{ type: 'perfect' }}
          onComplete={onComplete}
        />
      )

      // Should reset animation and show new reaction
      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element).toHaveAttribute('data-reaction-type', 'perfect')
    })
  })

  describe('accessibility', () => {
    it('is aria-hidden (decorative visual effect)', () => {
      const props = createDefaultProps()
      render(<TreeQuizReaction {...props} />)

      const element = screen.getByTestId('tree-quiz-reaction')
      expect(element).toHaveAttribute('aria-hidden', 'true')
    })

    it('messages are readable by screen readers when present', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass' },
      })
      render(<TreeQuizReaction {...props} />)

      const message = screen.getByText(/your tree is growing/i)
      expect(message).toBeInTheDocument()
      // Message should NOT be aria-hidden
      expect(message).not.toHaveAttribute('aria-hidden', 'true')
    })

    it('particles are aria-hidden (purely decorative)', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass' },
      })
      render(<TreeQuizReaction {...props} />)

      const particles = screen.getByTestId('particles-leaves')
      expect(particles).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('sound effect error handling', () => {
    it('continues rendering if sound fails', () => {
      playEvolutionSound.mockImplementation(() => {
        throw new Error('Audio not available')
      })

      const props = createDefaultProps({
        reaction: { type: 'pass' },
      })

      expect(() => render(<TreeQuizReaction {...props} />)).not.toThrow()
      expect(screen.getByTestId('tree-quiz-reaction')).toBeInTheDocument()
    })
  })

  describe('topic name display', () => {
    it('shows topic name when provided', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass', topicName: 'Dinosaurs' },
      })
      render(<TreeQuizReaction {...props} />)

      expect(screen.getByText(/dinosaurs/i)).toBeInTheDocument()
    })

    it('works without topic name', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass' },
      })

      expect(() => render(<TreeQuizReaction {...props} />)).not.toThrow()
    })
  })
})
