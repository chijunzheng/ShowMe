import { StrictMode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import StoryStudio from '../StoryStudio'

const createOkJsonFetch = (payload) =>
  vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(payload),
    })
  )

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

  it('shows loading UI with a Go Back button', () => {
    const fetchMock = createAbortablePendingFetch()
    vi.stubGlobal('fetch', fetchMock)

    const onBack = vi.fn()
    render(
      <StrictMode>
        <StoryStudio slides={[]} topicName="Astronaut Sleep" onBack={onBack} />
      </StrictMode>
    )

    expect(screen.getByText(/preparing your story prompt/i)).toBeInTheDocument()
    const goBackButton = screen.getByRole('button', { name: /go back/i })
    expect(goBackButton).toBeInTheDocument()

    fireEvent.click(goBackButton)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('transitions to the story prompt under React.StrictMode', async () => {
    const fetchMock = createOkJsonFetch({
      storyPrompt: 'Tell a story about whales singing.',
      conceptChecklist: ['Vibrating U-folds', 'Recycling air'],
      imageStyle: "children's book illustration",
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <StrictMode>
        <StoryStudio slides={[]} topicName="Whale Songs" onBack={vi.fn()} />
      </StrictMode>
    )

    expect(await screen.findByText(/story studio/i)).toBeInTheDocument()
    expect(screen.getByText(/your mission/i)).toBeInTheDocument()
  })

  it('times out and shows an error state instead of staying stuck', async () => {
    vi.useFakeTimers()
    const fetchMock = createAbortablePendingFetch()
    vi.stubGlobal('fetch', fetchMock)

    render(
      <StrictMode>
        <StoryStudio slides={[]} topicName="Deep Sea Gigantism" onBack={vi.fn()} />
      </StrictMode>
    )

    // Flush mount effects so the fetch starts and the timeout is scheduled.
    await act(async () => {})

    // Advance past the 30s timeout.
    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })

    expect(screen.getByText(/oops!/i)).toBeInTheDocument()
    expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })
})
