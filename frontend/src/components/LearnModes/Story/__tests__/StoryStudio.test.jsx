import { StrictMode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react'
import StoryStudio from '../StoryStudio'

const mockNarrate = vi.fn()
const mockStop = vi.fn()
const mockPrefetch = vi.fn().mockResolvedValue(undefined)
const mockCacheAudio = vi.fn().mockReturnValue(true)

vi.mock('../useStoryNarration', () => ({
  default: () => ({
    narrate: mockNarrate,
    stop: mockStop,
    prefetch: mockPrefetch,
    cacheAudio: mockCacheAudio,
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
  questionFlow: [
    {
      chapterNumber: 1,
      prompt: 'Where does our story begin?',
      icon: '🚀',
      choices: [
        { id: '1a', emoji: '🌟', text: 'Sparky zoomed into the maze...', conceptHints: ['input layers'] },
        { id: '1b', emoji: '🌑', text: 'The maze was dark and quiet...', conceptHints: ['weights'] },
      ],
    },
    {
      chapterNumber: 2,
      prompt: 'What happens next?',
      icon: '🔥',
      choices: [
        { id: '2a', emoji: '💪', text: 'Sparky hit a wall of numbers...', conceptHints: ['weights'] },
        { id: '2b', emoji: '🚪', text: 'A gatekeeper blocked the path...', conceptHints: ['activation function'] },
      ],
    },
    {
      chapterNumber: 3,
      prompt: 'How should the story end?',
      icon: '🏁',
      choices: [
        { id: '3a', emoji: '🔓', text: 'Sparky connects every clue and opens the final gate.', conceptHints: ['activation function'] },
        { id: '3b', emoji: '🧠', text: 'Sparky retraces patterns and learns from each mistake.', conceptHints: ['weights'] },
      ],
    },
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

const mockFinalizeResponse = {
  scenes: [
    {
      chapterNumber: 1,
      chapterTitle: 'Chapter 1: The Beginning',
      narrativeText: 'Sparky enters the maze and studies the inputs.',
      sceneDescription: 'Sparky enters the maze',
      panelCaptions: ['Beat 1', 'Beat 2', 'Beat 3', 'Beat 4'],
      imageUrl: 'data:image/png;base64,ch1',
    },
    {
      chapterNumber: 2,
      chapterTitle: 'Chapter 2: The Adventure',
      narrativeText: 'Sparky faces a gate of weighted paths.',
      sceneDescription: 'Sparky faces a weighted puzzle',
      panelCaptions: ['Beat 1', 'Beat 2', 'Beat 3', 'Beat 4'],
      imageUrl: 'data:image/png;base64,ch2',
    },
    {
      chapterNumber: 3,
      chapterTitle: 'Chapter 3: The Ending',
      narrativeText: 'Sparky unlocks the final activation gate.',
      sceneDescription: 'Sparky reaches the ending',
      panelCaptions: ['Beat 1', 'Beat 2', 'Beat 3', 'Beat 4'],
      imageUrl: 'data:image/png;base64,ch3',
    },
  ],
  conceptsFound: ['input layers', 'weights', 'activation function'],
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
 * @param {Object|null} finalizeResponse - Response for /api/learn/story/finalize (null = not set)
 */
const createFetchMock = (
  storyResponse,
  engagementResponse = mockEngagementResponse,
  chapterResponse = null,
  finalizeResponse = null,
) => {
  return vi.fn((url, _options) => {
    if (url.includes('/api/learn/story/finalize')) {
      if (finalizeResponse === null) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not configured' }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(finalizeResponse),
      })
    }

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

    if (url.includes('/api/learn/story') && !url.includes('/chapter') && !url.includes('/finalize')) {
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

    render(
      <StrictMode>
        <StoryStudio slides={[]} topicName="Neural Networks" onBack={vi.fn()} />
      </StrictMode>
    )

    expect(screen.getByTestId('story-loader-stage')).toBeInTheDocument()
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
      expect(screen.getByTestId('story-loader-stage')).toBeInTheDocument()
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

  it('moves directly to chapter 2 in batch mode without intermediate illustrating loader', async () => {
    const fetchMock = createFetchMock(
      mockStorySetup,
      mockEngagementResponse,
      null,
      mockFinalizeResponse,
    )
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

    // Click on chapter 1 choice
    fireEvent.click(screen.getByText('Sparky zoomed into the maze...'))

    // Should jump to chapter 2 prompt (no per-choice loader in batch mode)
    await waitFor(() => {
      expect(screen.getByText('What happens next?')).toBeInTheDocument()
    })

    expect(screen.queryByText(/illustrating your choice.../i)).not.toBeInTheDocument()

    // Check for chapter 2 choices
    expect(screen.getByText('Sparky hit a wall of numbers...')).toBeInTheDocument()
    expect(screen.getByText('A gatekeeper blocked the path...')).toBeInTheDocument()
  })

  it('calls finalize exactly once after 3 answers and shows one final loader', async () => {
    const settleChoiceTransition = async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 450))
      })
    }

    let resolveFinalize;
    const fetchMock = vi.fn((url) => {
      if (url.includes('/api/learn/story/finalize')) {
        return new Promise((resolve) => {
          resolveFinalize = resolve;
        })
      }

      if (url.includes('/api/learn/story/chapter')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Legacy endpoint should not be called in batch mode' }),
        })
      }

      if (url.includes('/api/learn/story') && !url.includes('/chapter') && !url.includes('/finalize')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStorySetup),
        })
      }

      if (url.includes('/api/generate/engagement')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEngagementResponse),
        })
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <StoryStudio slides={[]} topicName="Neural Networks" onBack={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('Sparky the robot needs to learn!')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /begin your story/i }))
    await waitFor(() => {
      expect(screen.getByText('Where does our story begin?')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Sparky zoomed into the maze...'))
    await settleChoiceTransition()
    await waitFor(() => {
      expect(screen.getByText('What happens next?')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Sparky hit a wall of numbers...'))
    await settleChoiceTransition()
    await waitFor(() => {
      expect(screen.getByText('How should the story end?')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Sparky connects every clue and opens the final gate.'))
    await settleChoiceTransition()
    await waitFor(() => {
      expect(screen.getByText('Creating your full 3-page manga story...')).toBeInTheDocument()
    })

    const finalizeCalls = fetchMock.mock.calls.filter(([url]) =>
      url.includes('/api/learn/story/finalize'),
    ).length
    const legacyChapterCalls = fetchMock.mock.calls.filter(([url]) =>
      url.includes('/api/learn/story/chapter'),
    ).length

    expect(finalizeCalls).toBe(1)
    expect(legacyChapterCalls).toBe(0)

    resolveFinalize({
      ok: true,
      json: () => Promise.resolve(mockFinalizeResponse),
    })

    await waitFor(() => {
      expect(screen.getByText('📖 Your Story is Ready!')).toBeInTheDocument()
    })
  })
})
