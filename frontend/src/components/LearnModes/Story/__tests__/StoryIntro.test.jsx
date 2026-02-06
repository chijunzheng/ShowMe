/**
 * StoryIntro Component Tests
 *
 * Tests for the story introduction screen that displays mission hook,
 * scene image, concept cards, and "Begin Your Story" button.
 *
 * Test coverage includes:
 * - Story title and mission hook rendering
 * - Scene image display with placeholder
 * - ConceptCards integration
 * - Begin button behavior and disabled state during TTS
 *
 * @vitest-environment jsdom
 */

import { StrictMode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import StoryIntro from '../StoryIntro'

// Mock haptics utility
vi.mock('../../../../utils/haptics', () => ({
  vibrateShort: vi.fn(),
}))

// Mock ConceptCards component
vi.mock('../ConceptCards', () => ({
  default: (props) => <div data-testid="concept-cards">ConceptCards Mock</div>
}))

describe('StoryIntro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('basic rendering', () => {
    it('renders story title as h1', () => {
      render(
        <StrictMode>
          <StoryIntro
            storyTitle="The Great Energy Adventure"
            missionHook="Find out what happened to the missing energy."
            onNext={() => {}}
          />
        </StrictMode>
      )

      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toBeInTheDocument()
      expect(title.textContent).toBe('The Great Energy Adventure')
    })

    it('renders mission hook text', () => {
      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Discover the secrets of the universe."
            onNext={() => {}}
          />
        </StrictMode>
      )

      expect(screen.getByText('Discover the secrets of the universe.')).toBeInTheDocument()
    })

    it('renders "Your Story Mission" heading', () => {
      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            onNext={() => {}}
          />
        </StrictMode>
      )

      expect(screen.getByText('Your Story Mission')).toBeInTheDocument()
    })
  })

  describe('scene image', () => {
    it('shows scene image when sceneImage prop is provided', () => {
      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            sceneImage="https://example.com/scene.png"
            onNext={() => {}}
          />
        </StrictMode>
      )

      const image = screen.getByAltText('Story scene')
      expect(image).toBeInTheDocument()
      expect(image.getAttribute('src')).toBe('https://example.com/scene.png')
    })

    it('shows placeholder 📖 when no sceneImage', () => {
      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            onNext={() => {}}
          />
        </StrictMode>
      )

      expect(screen.getByText('📖')).toBeInTheDocument()
    })

    it('shows placeholder when sceneImage is null', () => {
      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            sceneImage={null}
            onNext={() => {}}
          />
        </StrictMode>
      )

      expect(screen.getByText('📖')).toBeInTheDocument()
    })
  })

  describe('begin button', () => {
    it('shows "Begin Your Story" button with emoji', () => {
      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            onNext={() => {}}
          />
        </StrictMode>
      )

      const button = screen.getByRole('button', { name: /📖 begin your story/i })
      expect(button).toBeInTheDocument()
    })

    it('calls onNext when clicked', () => {
      const onNext = vi.fn()

      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            onNext={onNext}
          />
        </StrictMode>
      )

      const button = screen.getByRole('button', { name: /📖 begin your story/i })
      fireEvent.click(button)

      expect(onNext).toHaveBeenCalledTimes(1)
    })

    it('calls vibrateShort when clicked', async () => {
      const { vibrateShort } = await import('../../../../utils/haptics')
      const onNext = vi.fn()

      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            onNext={onNext}
          />
        </StrictMode>
      )

      const button = screen.getByRole('button', { name: /📖 begin your story/i })
      fireEvent.click(button)

      expect(vibrateShort).toHaveBeenCalledTimes(1)
    })

    it('is disabled and shows "Narrating..." when isTtsPlaying is true', () => {
      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            isTtsPlaying={true}
            onNext={() => {}}
          />
        </StrictMode>
      )

      const button = screen.getByRole('button', { name: /narrating/i })
      expect(button).toBeDisabled()
      expect(button.textContent).toBe('Narrating...')
    })

    it('is NOT disabled when isTtsPlaying is false', () => {
      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            isTtsPlaying={false}
            onNext={() => {}}
          />
        </StrictMode>
      )

      const button = screen.getByRole('button', { name: /📖 begin your story/i })
      expect(button).not.toBeDisabled()
    })

    it('is NOT disabled by default when isTtsPlaying not specified', () => {
      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            onNext={() => {}}
          />
        </StrictMode>
      )

      const button = screen.getByRole('button', { name: /📖 begin your story/i })
      expect(button).not.toBeDisabled()
    })
  })

  describe('concept cards', () => {
    it('renders ConceptCards when conceptCards has items', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡', description: 'Power to do work' },
        { concept: 'Motion', icon: '🏃', description: 'Change in position' },
      ]

      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            conceptCards={conceptCards}
            onNext={() => {}}
          />
        </StrictMode>
      )

      expect(screen.getByTestId('concept-cards')).toBeInTheDocument()
    })

    it('shows "Story Ingredients" heading when conceptCards present', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡', description: 'Power to do work' },
      ]

      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            conceptCards={conceptCards}
            onNext={() => {}}
          />
        </StrictMode>
      )

      expect(screen.getByText('Story Ingredients')).toBeInTheDocument()
    })

    it('does not render ConceptCards when conceptCards is empty', () => {
      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            conceptCards={[]}
            onNext={() => {}}
          />
        </StrictMode>
      )

      expect(screen.queryByTestId('concept-cards')).not.toBeInTheDocument()
    })

    it('does not render ConceptCards when conceptCards is undefined', () => {
      render(
        <StrictMode>
          <StoryIntro
            storyTitle="Test Story"
            missionHook="Test mission"
            onNext={() => {}}
          />
        </StrictMode>
      )

      expect(screen.queryByTestId('concept-cards')).not.toBeInTheDocument()
    })
  })

  describe('complete rendering', () => {
    it('renders all elements when fully configured', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡', description: 'Power to do work' },
      ]

      render(
        <StrictMode>
          <StoryIntro
            storyTitle="The Great Energy Adventure"
            missionHook="Find out what happened to the missing energy."
            sceneImage="https://example.com/scene.png"
            conceptCards={conceptCards}
            isTtsPlaying={false}
            onNext={() => {}}
          />
        </StrictMode>
      )

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('The Great Energy Adventure')
      expect(screen.getByText('Find out what happened to the missing energy.')).toBeInTheDocument()
      expect(screen.getByAltText('Story scene')).toBeInTheDocument()
      expect(screen.getByText('Story Ingredients')).toBeInTheDocument()
      expect(screen.getByTestId('concept-cards')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /📖 begin your story/i })).not.toBeDisabled()
    })
  })
})
