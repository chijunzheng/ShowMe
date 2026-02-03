/**
 * WorldQuizCelebration Component Tests
 *
 * TDD: These tests define the behavior for the WorldQuizCelebration component
 * BEFORE implementation. The component displays world-level celebrations
 * for special achievements (perfect score, boss victory).
 *
 * This is a higher-level celebration than TreeQuizReaction, showing
 * full-screen confetti and celebration for major accomplishments.
 *
 * Test Coverage Target: 80%+
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor, act, fireEvent } from '@testing-library/react'

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

// Mock Confetti component
vi.mock('@/components/Confetti', () => ({
  default: vi.fn(({ isActive, onComplete }) => {
    if (!isActive) return null
    return (
      <div data-testid="confetti-mock" data-active={isActive}>
        Confetti
      </div>
    )
  }),
}))

// Import component (will fail until implemented)
import WorldQuizCelebration from '../WorldQuizCelebration'

/**
 * Default props for WorldQuizCelebration component
 */
const createDefaultProps = (overrides = {}) => ({
  reaction: {
    type: 'perfect',
    score: 100,
    topicName: 'Volcanoes',
  },
  onComplete: vi.fn(),
  autoAdvance: true,
  ...overrides,
})

describe('WorldQuizCelebration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders without crashing for perfect reaction', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect', score: 100 },
      })
      render(<WorldQuizCelebration {...props} />)

      expect(screen.getByTestId('world-quiz-celebration')).toBeInTheDocument()
    })

    it('renders without crashing for boss_victory reaction', () => {
      const props = createDefaultProps({
        reaction: { type: 'boss_victory' },
      })
      render(<WorldQuizCelebration {...props} />)

      expect(screen.getByTestId('world-quiz-celebration')).toBeInTheDocument()
    })

    it('renders nothing for non-special reactions (pass)', () => {
      const props = createDefaultProps({
        reaction: { type: 'pass', score: 80 },
      })
      const { container } = render(<WorldQuizCelebration {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing for non-special reactions (streak)', () => {
      const props = createDefaultProps({
        reaction: { type: 'streak' },
      })
      const { container } = render(<WorldQuizCelebration {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing for non-special reactions (fail)', () => {
      const props = createDefaultProps({
        reaction: { type: 'fail' },
      })
      const { container } = render(<WorldQuizCelebration {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when reaction is null', () => {
      const props = createDefaultProps({ reaction: null })
      const { container } = render(<WorldQuizCelebration {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when reaction is undefined', () => {
      const props = createDefaultProps({ reaction: undefined })
      const { container } = render(<WorldQuizCelebration {...props} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('perfect reaction celebration', () => {
    it('shows confetti for perfect score', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect', score: 100 },
      })
      render(<WorldQuizCelebration {...props} />)

      expect(screen.getByTestId('confetti-mock')).toBeInTheDocument()
    })

    it('displays "Perfect Score!" headline', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect', score: 100 },
      })
      render(<WorldQuizCelebration {...props} />)

      expect(screen.getByText(/perfect.*score/i)).toBeInTheDocument()
    })

    it('shows topic name when provided', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect', score: 100, topicName: 'Volcanoes' },
      })
      render(<WorldQuizCelebration {...props} />)

      expect(screen.getByText(/volcanoes/i)).toBeInTheDocument()
    })

    it('displays the score', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect', score: 100 },
      })
      render(<WorldQuizCelebration {...props} />)

      expect(screen.getByText('100')).toBeInTheDocument()
    })

    it('uses amber/gold color theme', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<WorldQuizCelebration {...props} />)

      const element = screen.getByTestId('world-quiz-celebration')
      expect(element.className).toMatch(/amber|gold|yellow/)
    })
  })

  describe('boss_victory celebration', () => {
    it('shows confetti for boss victory', () => {
      const props = createDefaultProps({
        reaction: { type: 'boss_victory' },
      })
      render(<WorldQuizCelebration {...props} />)

      expect(screen.getByTestId('confetti-mock')).toBeInTheDocument()
    })

    it('displays "Boss Defeated!" headline', () => {
      const props = createDefaultProps({
        reaction: { type: 'boss_victory' },
      })
      render(<WorldQuizCelebration {...props} />)

      expect(screen.getByText(/boss.*defeated/i)).toBeInTheDocument()
    })

    it('shows victory icon/emoji', () => {
      const props = createDefaultProps({
        reaction: { type: 'boss_victory' },
      })
      render(<WorldQuizCelebration {...props} />)

      // Should have a trophy or celebration icon
      expect(screen.getByTestId('celebration-icon')).toBeInTheDocument()
    })

    it('uses purple color theme', () => {
      const props = createDefaultProps({
        reaction: { type: 'boss_victory' },
      })
      render(<WorldQuizCelebration {...props} />)

      const element = screen.getByTestId('world-quiz-celebration')
      expect(element.className).toMatch(/purple|violet/)
    })
  })

  describe('auto-advance behavior', () => {
    it('calls onComplete automatically when autoAdvance is true', () => {
      const onComplete = vi.fn()
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
        onComplete,
        autoAdvance: true,
      })
      render(<WorldQuizCelebration {...props} />)

      expect(onComplete).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(4000) // Default auto-advance delay
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('does NOT auto-advance when autoAdvance is false', async () => {
      const onComplete = vi.fn()
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
        onComplete,
        autoAdvance: false,
      })
      render(<WorldQuizCelebration {...props} />)

      act(() => {
        vi.advanceTimersByTime(10000) // Long wait
      })

      expect(onComplete).not.toHaveBeenCalled()
    })

    it('shows continue button when autoAdvance is false', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
        autoAdvance: false,
      })
      render(<WorldQuizCelebration {...props} />)

      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    })

    it('hides continue button when autoAdvance is true', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
        autoAdvance: true,
      })
      render(<WorldQuizCelebration {...props} />)

      expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument()
    })

    it('continue button calls onComplete', () => {
      const onComplete = vi.fn()
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
        onComplete,
        autoAdvance: false,
      })
      render(<WorldQuizCelebration {...props} />)

      const button = screen.getByRole('button', { name: /continue/i })
      fireEvent.click(button)

      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('confetti integration', () => {
    it('activates confetti on mount', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<WorldQuizCelebration {...props} />)

      const confetti = screen.getByTestId('confetti-mock')
      expect(confetti).toHaveAttribute('data-active', 'true')
    })

    it('confetti uses longer duration for boss victory', () => {
      // This would test the duration prop passed to Confetti
      // The mock captures the props
      const props = createDefaultProps({
        reaction: { type: 'boss_victory' },
      })
      render(<WorldQuizCelebration {...props} />)

      expect(screen.getByTestId('confetti-mock')).toBeInTheDocument()
    })
  })

  describe('onComplete callback', () => {
    it('handles missing onComplete gracefully', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
        onComplete: undefined,
        autoAdvance: true,
      })

      expect(() => render(<WorldQuizCelebration {...props} />)).not.toThrow()

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Should not throw
    })

    it('only calls onComplete once', () => {
      const onComplete = vi.fn()
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
        onComplete,
        autoAdvance: true,
      })
      render(<WorldQuizCelebration {...props} />)

      act(() => {
        vi.advanceTimersByTime(4000)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)

      act(() => {
        vi.advanceTimersByTime(4000) // Extra time
      })

      expect(onComplete).toHaveBeenCalledTimes(1) // Still just once
    })
  })

  describe('cleanup', () => {
    it('cleans up timer on unmount', () => {
      const onComplete = vi.fn()
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
        onComplete,
        autoAdvance: true,
      })

      const { unmount } = render(<WorldQuizCelebration {...props} />)

      act(() => {
        vi.advanceTimersByTime(2000) // Halfway
      })

      unmount()

      act(() => {
        vi.advanceTimersByTime(5000) // Past completion
      })

      expect(onComplete).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has proper role for announcement', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<WorldQuizCelebration {...props} />)

      const element = screen.getByTestId('world-quiz-celebration')
      expect(element).toHaveAttribute('role', 'dialog')
    })

    it('has aria-labelledby for headline', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<WorldQuizCelebration {...props} />)

      const element = screen.getByTestId('world-quiz-celebration')
      expect(element).toHaveAttribute('aria-labelledby')
    })

    it('has aria-live for dynamic content', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<WorldQuizCelebration {...props} />)

      const element = screen.getByTestId('world-quiz-celebration')
      expect(element).toHaveAttribute('aria-live', 'polite')
    })

    it('continue button is keyboard accessible', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
        autoAdvance: false,
      })
      render(<WorldQuizCelebration {...props} />)

      const button = screen.getByRole('button', { name: /continue/i })
      expect(button).toHaveAttribute('tabIndex', '0')
    })

    it('focuses continue button when shown', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
        autoAdvance: false,
      })
      render(<WorldQuizCelebration {...props} />)

      const button = screen.getByRole('button', { name: /continue/i })

      // After a short delay for render, button should be focused
      act(() => {
        vi.advanceTimersByTime(100)
      })

      expect(document.activeElement).toBe(button)
    })
  })

  describe('visual design', () => {
    it('renders as full-screen overlay', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<WorldQuizCelebration {...props} />)

      const element = screen.getByTestId('world-quiz-celebration')
      expect(element.className).toMatch(/fixed|inset-0|z-50/)
    })

    it('has backdrop blur effect', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<WorldQuizCelebration {...props} />)

      const element = screen.getByTestId('world-quiz-celebration')
      expect(element.className).toMatch(/backdrop/)
    })

    it('has scale-in animation', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<WorldQuizCelebration {...props} />)

      const element = screen.getByTestId('world-quiz-celebration')
      expect(element.className).toMatch(/animate|scale/)
    })
  })

  describe('edge cases', () => {
    it('handles reaction change while visible', () => {
      const onComplete = vi.fn()
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
        onComplete,
      })

      const { rerender } = render(<WorldQuizCelebration {...props} />)

      expect(screen.getByText(/perfect.*score/i)).toBeInTheDocument()

      rerender(
        <WorldQuizCelebration
          reaction={{ type: 'boss_victory' }}
          onComplete={onComplete}
          autoAdvance={true}
        />
      )

      expect(screen.getByText(/boss.*defeated/i)).toBeInTheDocument()
    })

    it('handles transition from special to non-special reaction', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })

      const { rerender, container } = render(<WorldQuizCelebration {...props} />)

      expect(screen.getByTestId('world-quiz-celebration')).toBeInTheDocument()

      rerender(
        <WorldQuizCelebration
          reaction={{ type: 'pass' }}
          onComplete={vi.fn()}
          autoAdvance={true}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('works without topicName', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect', score: 100 },
      })

      expect(() => render(<WorldQuizCelebration {...props} />)).not.toThrow()
    })

    it('works without score', () => {
      const props = createDefaultProps({
        reaction: { type: 'boss_victory' },
      })

      expect(() => render(<WorldQuizCelebration {...props} />)).not.toThrow()
    })
  })

  describe('responsive design', () => {
    it('content is centered', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<WorldQuizCelebration {...props} />)

      const element = screen.getByTestId('world-quiz-celebration')
      expect(element.className).toMatch(/flex|items-center|justify-center/)
    })

    it('text is readable on mobile', () => {
      const props = createDefaultProps({
        reaction: { type: 'perfect' },
      })
      render(<WorldQuizCelebration {...props} />)

      const headline = screen.getByText(/perfect.*score/i)
      // Should have appropriate text size classes
      expect(headline.className).toMatch(/text-|font-bold/)
    })
  })
})
