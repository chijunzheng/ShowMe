import { StrictMode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react'
import StoryStudio from '../StoryStudio'

const mockNarrate = vi.fn()
const mockStop = vi.fn()
const mockPrefetch = vi.fn().mockResolvedValue(undefined)

vi.mock('../useStoryNarration', () => ({
  default: () => ({
    narrate: mockNarrate,
    stop: mockStop,
    prefetch: mockPrefetch,
    isPlaying: false,
    isLoading: false,
    error: null,
  }),
}))

vi.mock('../../../utils/haptics', () => ({
  vibrateShort: vi.fn(),
  vibrateSuccess: vi.fn(),
}))

vi.mock('../../../utils/soundEffects', () => ({
  playSelectSound: vi.fn(),
  playCorrectSound: vi.fn(),
}))

vi.mock('../../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../utils/learnSlidesPayload', () => ({
  buildLearnSlidesPayload: vi.fn((slides) => slides),
}))

// Mock response data
const mockStorySetup = {
  storyPrompt: 'Tell a story about neural networks.',
  conceptChecklist: ['input layers', 'weights', 'activation function'],
  imageStyle: "children's book illustration",
  missionHook: 'Sparky the robot needs to learn!',
  sceneImagePrompt: 'a colorful robot in a maze',
  conceptCards: [
    { concept: 'input layers', icon: '📥', description: 'Data enters here' },
    { concept: 'weights', icon: '⚖️', description: 'Connection strength' },
    { concept: 'activation function', icon: '⚡', description: 'Signal gate' },
  ],
  chapters: {
    '1': {
      prompt: 'Where does our story begin?',
      icon: '🚀',
      choices: [
        { id: '1a', emoji: '🌟', text: 'Sparky zoomed into the maze...', conceptHints: ['input layers'] },
        { id: '1b', emoji: '🌑', text: 'The maze was dark and quiet...', conceptHints: ['weights'] },
      ],
    },
  },
  sceneImage: 'data:image/png;base64,mock',
  missionHookAudio: 'data:audio/mp3;base64,mock',
}

const mockChapter2Response = {
  illustration: {
    imageUrl: 'data:image/png;base64,ch1illustration',
    sceneDescription: 'Sparky entering the maze',
  },
  nextChapter: {
    chapterNumber: 2,
    prompt: 'What happens next?',
    icon: '🔥',
    choices: [
      { id: '2a', emoji: '💪', text: 'Sparky hit a wall of numbers...', conceptHints: ['weights'] },
      { id: '2b', emoji: '🚪', text: 'A gatekeeper blocked the path...', conceptHints: ['activation function'] },
    ],
  },
  conceptsFound: ['input layers'],
}

const mockEngagementResponse = {
  funFact: {
    emoji: '💡',
    fact: 'Neural networks were inspired by how our brains work!',
  },
}

/**
 * Create a fetch mock that handles multiple endpoints
 * @param {Object} storyResponse - Response for /api/learn/story
 * @param {Object|null} engagementResponse - Response for /api/generate/engagement (null = 404)
 * @param {Object|null} chapterResponse - Response for /api/learn/story/chapter (null = not set)
 */
const createFetchMock = (storyResponse, engagementResponse = mockEngagementResponse, chapterResponse = null) => {
  return vi.fn((url, options) => {
    if (url.includes('/api/learn/story/chapter')) {
      if (chapterResponse === null) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not configured' }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(chapterResponse),
      })
    }

    if (url.includes('/api/learn/story')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(storyResponse),
      })
    }

    if (url.includes('/api/generate/engagement')) {
      if (engagementResponse === null) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not found' }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(engagementResponse),
      })
    }

    // Default for unknown URLs
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  })
}

/**
 * Create an abortable pending fetch that never resolves
 */
const createAbortablePendingFetch = () =>
  vi.fn((_url, options = {}) => {
    const signal = options?.signal
    return new Promise((_resolve, reject) => {
      if (signal?.aborted) {
        const error = new Error('Aborted')
        error.name = 'AbortError'
        reject(error)
        return
      }

      signal?.addEventListener('abort', () => {
        const error = new Error('Aborted')
        error.name = 'AbortError'
        reject(error)
      })
    })
  })

describe('StoryStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows StoryLoader during LOADING state', () => {
    const fetchMock = createAbortablePendingFetch()
    vi.stubGlobal('fetch', fetchMock)

    const onBack = vi.fn()
    render(
      <StrictMode>
        <StoryStudio slides={[]} topicName="Neural Networks" onBack={onBack} />
      </StrictMode>
    )

    expect(screen.getByText(/creating your story.../i)).toBeInTheDocument()
    const goBackButton = screen.getByRole('button', { name: /go back/i })
    expect(goBackButton).toBeInTheDocument()
  })

  it('Go Back button calls onBack during loading', () => {
    const fetchMock = createAbortablePendingFetch()
    vi.stubGlobal('fetch', fetchMock)

    const onBack = vi.fn()
    render(
      <StrictMode>
        <StoryStudio slides={[]} topicName="Neural Networks" onBack={onBack} />
      </StrictMode>
    )

    const goBackButton = screen.getByRole('button', { name: /go back/i })
    fireEvent.click(goBackButton)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('transitions to INTRO after successful API load', async () => {
    const fetchMock = createFetchMock(mockStorySetup, mockEngagementResponse)
    vi.stubGlobal('fetch', fetchMock)

    const onBack = vi.fn()
    render(
      <StrictMode>
        <StoryStudio slides={[]} topicName="Neural Networks" onBack={onBack} />
      </StrictMode>
    )

    // Wait for INTRO state to appear
    await waitFor(() => {
      expect(screen.getByText('Sparky the robot needs to learn!')).toBeInTheDocument()
    })

    // Check for "Begin Your Story" button
    expect(screen.getByRole('button', { name: /begin your story/i })).toBeInTheDocument()

    // Check for concept cards
    expect(screen.getByText('Story Ingredients')).toBeInTheDocument()
  })

  it('shows error state on API failure', async () => {
    const fetchMock = vi.fn((url) => {
      if (url.includes('/api/learn/story') && !url.includes('/chapter')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <StrictMode>
        <StoryStudio slides={[]} topicName="Neural Networks" onBack={vi.fn()} />
      </StrictMode>
    )

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exit/i })).toBeInTheDocument()
  })

  it('retry button reloads from LOADING', async () => {
    const fetchMock = vi.fn((url) => {
      if (url.includes('/api/learn/story') && !url.includes('/chapter')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <StrictMode>
        <StoryStudio slides={[]} topicName="Neural Networks" onBack={vi.fn()} />
      </StrictMode>
    )

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    // Click retry
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    // Should return to loading state
    await waitFor(() => {
      expect(screen.getByText(/creating your story.../i)).toBeInTheDocument()
    })
  })

  it('timeout shows error state', async () => {
    vi.useFakeTimers()
    const fetchMock = createAbortablePendingFetch()
    vi.stubGlobal('fetch', fetchMock)

    render(
      <StrictMode>
        <StoryStudio slides={[]} topicName="Neural Networks" onBack={vi.fn()} />
      </StrictMode>
    )

    // Flush mount effects so the fetch starts and the timeout is scheduled
    await act(async () => {})

    // Advance past the 30s timeout
    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })

    // Should show error state
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exit/i })).toBeInTheDocument()
  })

  it('transitions from INTRO to CHAPTER_1 on Begin click', async () => {
    const fetchMock = createFetchMock(mockStorySetup, mockEngagementResponse)
    vi.stubGlobal('fetch', fetchMock)

    render(
      <StrictMode>
        <StoryStudio slides={[]} topicName="Neural Networks" onBack={vi.fn()} />
      </StrictMode>
    )

    // Wait for INTRO state
    await waitFor(() => {
      expect(screen.getByText('Sparky the robot needs to learn!')).toBeInTheDocument()
    })

    // Click "Begin Your Story"
    fireEvent.click(screen.getByRole('button', { name: /begin your story/i }))

    // Should transition to CHAPTER_1 - check for chapter prompt
    await waitFor(() => {
      expect(screen.getByText('Where does our story begin?')).toBeInTheDocument()
    })

    // Check for choice cards
    expect(screen.getByText('Sparky zoomed into the maze...')).toBeInTheDocument()
    expect(screen.getByText('The maze was dark and quiet...')).toBeInTheDocument()
  })

  it('shows illustrating state after chapter choice selection', async () => {
    const fetchMock = createFetchMock(mockStorySetup, mockEngagementResponse, mockChapter2Response)
    vi.stubGlobal('fetch', fetchMock)

    render(
      <StrictMode>
        <StoryStudio slides={[]} topicName="Neural Networks" onBack={vi.fn()} />
      </StrictMode>
    )

    // Wait for INTRO state
    await waitFor(() => {
      expect(screen.getByText('Sparky the robot needs to learn!')).toBeInTheDocument()
    })

    // Click "Begin Your Story"
    fireEvent.click(screen.getByRole('button', { name: /begin your story/i }))

    // Wait for CHAPTER_1 state
    await waitFor(() => {
      expect(screen.getByText('Where does our story begin?')).toBeInTheDocument()
    })

    // Click on choice 1a
    fireEvent.click(screen.getByText('Sparky zoomed into the maze...'))

    // Should show illustrating state
    await waitFor(() => {
      expect(screen.getByText(/illustrating your choice.../i)).toBeInTheDocument()
    })

    // Should eventually transition to CHAPTER_2
    await waitFor(() => {
      expect(screen.getByText('What happens next?')).toBeInTheDocument()
    })

    // Check for chapter 2 choices
    expect(screen.getByText('Sparky hit a wall of numbers...')).toBeInTheDocument()
    expect(screen.getByText('A gatekeeper blocked the path...')).toBeInTheDocument()
  })
})
