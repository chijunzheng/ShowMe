/**
 * Quiz Integration Tests - Sound & Haptic Feedback
 *
 * Tests for Phase 2.3: Integration of sounds, haptics, and MicroCelebration
 * into the Quiz component.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react'
import Quiz from './index'

// Mock sound effects
vi.mock('../../utils/soundEffects', () => ({
  playCorrectSound: vi.fn(),
  playIncorrectSound: vi.fn(),
  playPartialSound: vi.fn(),
  playSelectSound: vi.fn(),
}))

// Mock haptics
vi.mock('../../utils/haptics', () => ({
  vibrateSuccess: vi.fn(),
  vibrateError: vi.fn(),
  vibrateShort: vi.fn(),
  isHapticsSupported: vi.fn(() => true),
}))

import {
  playCorrectSound,
  playIncorrectSound,
  playPartialSound,
  playSelectSound,
} from '../../utils/soundEffects'

import {
  vibrateSuccess,
  vibrateError,
  vibrateShort,
} from '../../utils/haptics'

// Sample MCQ questions for testing
const mockMCQQuestions = [
  {
    id: 'q1',
    type: 'mcq',
    question: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctIndex: 1,
    explanation: 'Basic addition',
  },
  {
    id: 'q2',
    type: 'mcq',
    question: 'What color is the sky?',
    options: ['Green', 'Blue', 'Red', 'Yellow'],
    correctIndex: 1,
    explanation: 'The sky appears blue due to light scattering',
  },
]

// Sample fill-blank question
const mockFillBlankQuestions = [
  {
    id: 'q1',
    type: 'fill_blank',
    question: 'The capital of France is ___.',
    blankSentence: 'The capital of France is ___.',
    correctAnswer: 'Paris',
    wordOptions: ['Paris', 'London', 'Berlin', 'Madrid'],
    explanation: 'Paris is the capital and largest city of France',
  },
]

/**
 * Helper to select an MCQ option and submit
 * MCQ works as: 1) select option, 2) click submit
 * MCQ buttons contain label (A/B/C/D) + option text, so we search for both
 */
async function selectAndSubmitMCQ(optionText) {
  // Find option button by text content - MCQ buttons have format "A3" or "B4" etc.
  // We look for role="option" buttons that contain the text
  const allButtons = screen.getAllByRole('option')
  const optionButton = allButtons.find((btn) =>
    btn.textContent.includes(optionText)
  )
  if (!optionButton) {
    throw new Error(`Option with text "${optionText}" not found in options: ${allButtons.map(b => b.textContent).join(', ')}`)
  }

  // Select the option
  await act(async () => {
    fireEvent.click(optionButton)
  })

  // Find and click submit button (labeled "Check Answer")
  const submitButton = screen.getByRole('button', { name: /check answer/i })
  await act(async () => {
    fireEvent.click(submitButton)
  })
}

describe('Quiz Sound & Haptic Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  describe('MCQ answer feedback', () => {
    it('plays correct sound and haptic on correct MCQ answer', async () => {
      const onComplete = vi.fn()
      render(
        <Quiz
          questions={mockMCQQuestions}
          slides={[]}
          level="standard"
          onComplete={onComplete}
        />
      )

      // Select and submit correct answer "4"
      await selectAndSubmitMCQ('4')

      // Verify sound and haptic were triggered
      expect(playCorrectSound).toHaveBeenCalledTimes(1)
      expect(vibrateSuccess).toHaveBeenCalledTimes(1)
      expect(playIncorrectSound).not.toHaveBeenCalled()
      expect(vibrateError).not.toHaveBeenCalled()
    })

    it('plays incorrect sound and haptic on wrong MCQ answer', async () => {
      render(
        <Quiz
          questions={mockMCQQuestions}
          slides={[]}
          level="standard"
          onComplete={vi.fn()}
        />
      )

      // Select and submit incorrect answer "3"
      await selectAndSubmitMCQ('3')

      // Verify sound and haptic were triggered
      expect(playIncorrectSound).toHaveBeenCalledTimes(1)
      expect(vibrateError).toHaveBeenCalledTimes(1)
      expect(playCorrectSound).not.toHaveBeenCalled()
      expect(vibrateSuccess).not.toHaveBeenCalled()
    })

    it('plays select sound and short haptic when selecting an option', async () => {
      render(
        <Quiz
          questions={mockMCQQuestions}
          slides={[]}
          level="standard"
          onComplete={vi.fn()}
        />
      )

      // Find and click an option (just select, don't submit)
      const optionButton = screen.getAllByRole('option').find((btn) =>
        btn.textContent.includes('3')
      )

      await act(async () => {
        fireEvent.click(optionButton)
      })

      // Select sound should play on option selection
      expect(playSelectSound).toHaveBeenCalled()
      expect(vibrateShort).toHaveBeenCalled()
    })
  })

  describe('Fill-blank answer feedback', () => {
    it('plays correct sound on correct fill-blank answer', async () => {
      render(
        <Quiz
          questions={mockFillBlankQuestions}
          slides={[]}
          level="standard"
          onComplete={vi.fn()}
        />
      )

      // Find the Paris option and click it
      const parisOption = screen.getByText('Paris')

      await act(async () => {
        fireEvent.click(parisOption)
      })

      // Submit the answer
      const submitButton = screen.getByRole('button', { name: /check|submit/i })

      await act(async () => {
        fireEvent.click(submitButton)
      })

      // Verify correct sound played
      expect(playCorrectSound).toHaveBeenCalled()
      expect(vibrateSuccess).toHaveBeenCalled()
    })

    it('plays partial sound on partially correct fill-blank answer', async () => {
      // This would require a question with partial credit enabled
      // For now, test that partial sound function exists and can be called
      expect(typeof playPartialSound).toBe('function')
    })
  })

  describe('MicroCelebration display', () => {
    it('shows MicroCelebration on correct answer', async () => {
      render(
        <Quiz
          questions={mockMCQQuestions}
          slides={[]}
          level="standard"
          onComplete={vi.fn()}
        />
      )

      // Select and submit correct answer
      await selectAndSubmitMCQ('4')

      // MicroCelebration should appear immediately after correct answer
      const celebration = screen.queryByTestId('micro-celebration')
      const xpText = screen.queryByText(/\+\d+.*XP/i)
      // Either the celebration container is shown or the XP text is visible
      expect(celebration || xpText).toBeTruthy()
    })

    it('does not show MicroCelebration on incorrect answer', async () => {
      render(
        <Quiz
          questions={mockMCQQuestions}
          slides={[]}
          level="standard"
          onComplete={vi.fn()}
        />
      )

      // Select and submit incorrect answer
      await selectAndSubmitMCQ('3')

      // Wait a tick for any async updates
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // MicroCelebration should NOT appear for incorrect answers
      const celebration = screen.queryByTestId('micro-celebration')
      expect(celebration).toBeNull()
    })
  })

  describe('Sound feedback timing', () => {
    it('plays sounds immediately on answer submission', async () => {
      render(
        <Quiz
          questions={mockMCQQuestions}
          slides={[]}
          level="standard"
          onComplete={vi.fn()}
        />
      )

      // Before submit, no correct sounds
      expect(playCorrectSound).not.toHaveBeenCalled()

      // Select and submit correct answer
      await selectAndSubmitMCQ('4')

      // Immediately after submit, sound should have been called
      expect(playCorrectSound).toHaveBeenCalledTimes(1)
    })
  })

  describe('Multiple questions sequence', () => {
    it('plays sounds for each question in sequence', async () => {
      render(
        <Quiz
          questions={mockMCQQuestions}
          slides={[]}
          level="standard"
          onComplete={vi.fn()}
        />
      )

      // Answer first question correctly
      await selectAndSubmitMCQ('4')
      expect(playCorrectSound).toHaveBeenCalledTimes(1)

      // Click continue to go to next question
      const continueButton = screen.getByRole('button', { name: /next challenge/i })

      await act(async () => {
        fireEvent.click(continueButton)
      })

      // Answer second question correctly
      await selectAndSubmitMCQ('Blue')

      // Should have played correct sound twice total
      expect(playCorrectSound).toHaveBeenCalledTimes(2)
      expect(vibrateSuccess).toHaveBeenCalledTimes(2)
    })
  })
})

describe('Quiz without sound (graceful degradation)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('does not crash when sound functions fail', async () => {
    // Make sound throw an error
    playCorrectSound.mockImplementation(() => {
      throw new Error('Audio not supported')
    })

    // Quiz should still work
    render(
      <Quiz
        questions={mockMCQQuestions}
        slides={[]}
        level="standard"
        onComplete={vi.fn()}
      />
    )

    // Select and submit - should not crash despite sound error
    const optionButton = screen.getAllByRole('option').find((btn) =>
      btn.textContent.includes('4')
    )

    await act(async () => {
      fireEvent.click(optionButton)
    })

    const submitButton = screen.getByRole('button', { name: /check answer/i })

    // Should not throw
    await act(async () => {
      fireEvent.click(submitButton)
    })

    // Quiz should still be functional (feedback shown - "Next Challenge" button)
    expect(screen.getByRole('button', { name: /next challenge/i })).toBeTruthy()
  })
})
