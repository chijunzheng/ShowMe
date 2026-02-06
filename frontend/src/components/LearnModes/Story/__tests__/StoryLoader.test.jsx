/**
 * StoryLoader Component Tests
 *
 * Tests for the loader component shown during story preparation.
 * Displays stage text, optional fun fact, and cancel button.
 *
 * Test coverage includes:
 * - Stage text rendering
 * - Fun fact card display
 * - Fun fact emoji and source label
 * - Cancel button behavior
 *
 * @vitest-environment jsdom
 */

import { StrictMode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import StoryLoader from '../StoryLoader'

describe('StoryLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('stage text rendering', () => {
    it('renders stage text via data-testid', () => {
      render(
        <StrictMode>
          <StoryLoader stageText="Building your narrative..." />
        </StrictMode>
      )

      const stageElement = screen.getByTestId('story-loader-stage')
      expect(stageElement).toBeInTheDocument()
      expect(stageElement.textContent).toBe('Building your narrative...')
    })

    it('renders "Creating your story..." heading', () => {
      render(
        <StrictMode>
          <StoryLoader stageText="Loading..." />
        </StrictMode>
      )

      expect(screen.getByText('Creating your story...')).toBeInTheDocument()
    })
  })

  describe('fun fact card', () => {
    it('renders fun fact card when funFact.text is provided', () => {
      render(
        <StrictMode>
          <StoryLoader
            stageText="Loading..."
            funFact={{ text: 'Stories help us remember things better.' }}
          />
        </StrictMode>
      )

      const funFactCard = screen.getByTestId('story-loader-fun-fact')
      expect(funFactCard).toBeInTheDocument()
      expect(funFactCard.textContent).toContain('Stories help us remember things better.')
    })

    it('does NOT render fun fact card when funFact is null', () => {
      render(
        <StrictMode>
          <StoryLoader stageText="Loading..." funFact={null} />
        </StrictMode>
      )

      expect(screen.queryByTestId('story-loader-fun-fact')).not.toBeInTheDocument()
    })

    it('does NOT render fun fact card when funFact is undefined', () => {
      render(
        <StrictMode>
          <StoryLoader stageText="Loading..." />
        </StrictMode>
      )

      expect(screen.queryByTestId('story-loader-fun-fact')).not.toBeInTheDocument()
    })

    it('shows "Did you know?" label on fun fact', () => {
      render(
        <StrictMode>
          <StoryLoader
            stageText="Loading..."
            funFact={{ text: 'Test fact' }}
          />
        </StrictMode>
      )

      expect(screen.getByText('Did you know?')).toBeInTheDocument()
    })

    it('shows "Topic fact" when factSource is "api"', () => {
      render(
        <StrictMode>
          <StoryLoader
            stageText="Loading..."
            funFact={{ text: 'Test fact' }}
            factSource="api"
          />
        </StrictMode>
      )

      expect(screen.getByText('Topic fact')).toBeInTheDocument()
    })

    it('shows "Story fact" when factSource is "local"', () => {
      render(
        <StrictMode>
          <StoryLoader
            stageText="Loading..."
            funFact={{ text: 'Test fact' }}
            factSource="local"
          />
        </StrictMode>
      )

      expect(screen.getByText('Story fact')).toBeInTheDocument()
    })

    it('shows fun fact emoji when provided', () => {
      render(
        <StrictMode>
          <StoryLoader
            stageText="Loading..."
            funFact={{ emoji: '📚', text: 'Test fact' }}
          />
        </StrictMode>
      )

      expect(screen.getByText('📚')).toBeInTheDocument()
    })

    it('shows default 💡 emoji when not provided', () => {
      render(
        <StrictMode>
          <StoryLoader
            stageText="Loading..."
            funFact={{ text: 'Test fact' }}
          />
        </StrictMode>
      )

      expect(screen.getByText('💡')).toBeInTheDocument()
    })
  })

  describe('cancel button', () => {
    it('renders cancel button when onCancel is provided', () => {
      const onCancel = vi.fn()

      render(
        <StrictMode>
          <StoryLoader stageText="Loading..." onCancel={onCancel} />
        </StrictMode>
      )

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
    })

    it('does NOT render cancel button when onCancel is null', () => {
      render(
        <StrictMode>
          <StoryLoader stageText="Loading..." onCancel={null} />
        </StrictMode>
      )

      expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument()
    })

    it('does NOT render cancel button when onCancel is undefined', () => {
      render(
        <StrictMode>
          <StoryLoader stageText="Loading..." />
        </StrictMode>
      )

      expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument()
    })

    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn()

      render(
        <StrictMode>
          <StoryLoader stageText="Loading..." onCancel={onCancel} />
        </StrictMode>
      )

      const cancelButton = screen.getByRole('button', { name: /go back/i })
      fireEvent.click(cancelButton)

      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('complete rendering', () => {
    it('renders all elements together when fully configured', () => {
      const onCancel = vi.fn()

      render(
        <StrictMode>
          <StoryLoader
            stageText="Crafting your adventure..."
            funFact={{ emoji: '🎭', text: 'Every story has a beginning, middle, and end.' }}
            factSource="api"
            onCancel={onCancel}
          />
        </StrictMode>
      )

      expect(screen.getByTestId('story-loader-stage')).toHaveTextContent('Crafting your adventure...')
      expect(screen.getByText('Creating your story...')).toBeInTheDocument()
      expect(screen.getByTestId('story-loader-fun-fact')).toBeInTheDocument()
      expect(screen.getByText('🎭')).toBeInTheDocument()
      expect(screen.getByText('Topic fact')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
    })
  })
})
