/**
 * StoryLoader Component Tests
 *
 * Tests for the loader component shown during story preparation.
 * Displays stage text and optional fun fact.
 *
 * @vitest-environment jsdom
 */

import { StrictMode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
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

  describe('complete rendering', () => {
    it('renders all elements together when fully configured', () => {
      render(
        <StrictMode>
          <StoryLoader
            stageText="Crafting your adventure..."
            funFact={{ emoji: '🎭', text: 'Every story has a beginning, middle, and end.' }}
          />
        </StrictMode>
      )

      expect(screen.getByTestId('story-loader-stage')).toHaveTextContent('Crafting your adventure...')
      expect(screen.getByTestId('story-loader-fun-fact')).toBeInTheDocument()
      expect(screen.getByText('🎭')).toBeInTheDocument()
    })
  })
})
