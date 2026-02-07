import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import MysteryLab from '../MysteryLab'

const mockNarrate = vi.fn()
const mockStop = vi.fn()
const mockPrefetch = vi.fn()

vi.mock('../useMysteryNarration', () => ({
  default: () => ({
    narrate: mockNarrate,
    stop: mockStop,
    prefetch: mockPrefetch,
    isPlaying: false,
    isLoading: false,
  }),
}))

vi.mock('../../../../utils/haptics', () => ({
  vibrateSuccess: vi.fn(),
  vibrateShort: vi.fn(),
}))

vi.mock('../../../../utils/soundEffects', () => ({
  playCorrectSound: vi.fn(),
  playPartialSound: vi.fn(),
  playIncorrectSound: vi.fn(),
}))

vi.mock('../../../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

function mockJsonResponse(status, payload) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  })
}

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function createAbortError() {
  const error = new Error('Request aborted')
  error.name = 'AbortError'
  return error
}

function pendingWithAbort(signal) {
  return new Promise((_, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }
    signal?.addEventListener('abort', () => reject(createAbortError()), { once: true })
  })
}

const crimeSceneOpsPayload = {
  mysteryTitle: 'Case of the Missing Heat',
  mysterySetup: 'The room stayed cold even when the heater was running.',
  imagePrompt: 'A detective examining an open classroom window',
  clues: [{ text: 'The window was left open.', narratorText: 'The window clue stands out.', slideRef: 1 }],
  expectedConcepts: ['heat transfer', 'convection'],
  solutionExplanation: 'Heat escaped through the open window while cold air entered.',
  revealNarration: 'Case closed. Heat loss through convection solved the mystery.',
  crimeScene: {
    requiredHotspotCount: 1,
    hotspots: [{ id: 'h1', x: 32, y: 40, radius: 8, evidenceId: 'e1' }],
    evidenceCards: [{ id: 'e1', title: 'Open window', text: 'A window is open near the heater.', conceptTags: ['heat transfer'] }],
  },
  witnesses: [
    {
      id: 'w1',
      name: 'Hall Monitor',
      role: 'Observer',
      questionCards: ['What did you notice first?'],
      responses: [
        {
          question: 'What did you notice first?',
          statement: 'I felt a cold draft near the window.',
          reliability: 0.9,
          tags: ['convection'],
          contradictionKey: 'A',
        },
      ],
    },
  ],
  timeline: {
    events: [
      { id: 't1', text: 'Window opened', order: 1 },
      { id: 't2', text: 'Cold air entered', order: 2 },
    ],
    causalLinks: [{ from: 't1', to: 't2' }],
  },
  verdict: {
    options: ['The heater failed randomly', 'Open window caused heat loss'],
    correctIndex: 1,
    expectedConcepts: ['heat transfer', 'convection'],
  },
}

describe('MysteryLab - Crime Scene Ops', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockPrefetch.mockResolvedValue(true)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('completes flow from briefing to celebration', async () => {
    const onComplete = vi.fn()

    const fetchMock = vi.fn(async (url, options = {}) => {
      if (String(url).includes('/api/generate/engagement')) {
        return mockJsonResponse(200, {
          funFact: { emoji: '💡', text: 'Heat can move through air currents.' },
          suggestedQuestions: [],
        })
      }

      if (String(url).includes('/api/learn/mystery/image')) {
        return mockJsonResponse(200, { imageUrl: 'https://example.com/scene.png' })
      }

      if (String(url).includes('/api/learn/mystery/evaluate')) {
        const body = JSON.parse(options.body || '{}')

        if (body.solveMethod === 'scene-scan') {
          return mockJsonResponse(200, {
            isCorrect: true,
            feedback: 'Evidence sweep complete.',
            identifiedConcepts: ['heat transfer'],
            xpEarned: 35,
            bonusXp: 0,
          })
        }

        if (body.solveMethod === 'witness-room') {
          return mockJsonResponse(200, {
            isCorrect: true,
            feedback: 'Interrogation complete.',
            identifiedConcepts: ['convection'],
            xpEarned: 40,
            bonusXp: 0,
          })
        }

        if (body.solveMethod === 'timeline-rebuild') {
          return mockJsonResponse(200, {
            isCorrect: true,
            feedback: 'Timeline reconstructed.',
            identifiedConcepts: ['heat transfer'],
            xpEarned: 45,
            bonusXp: 0,
          })
        }

        if (body.solveMethod === 'warrant-decision') {
          return mockJsonResponse(200, {
            isCorrect: true,
            feedback: 'Warrant approved.',
            identifiedConcepts: ['heat transfer', 'convection'],
            xpEarned: 60,
            bonusXp: 10,
          })
        }
      }

      if (String(url).includes('/api/learn/mystery')) {
        return mockJsonResponse(200, crimeSceneOpsPayload)
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MysteryLab
        slides={[{ subtitle: 'Heat moves from warm to cold' }]}
        topicName="Heat Transfer"
        explanationLevel="simple"
        onComplete={onComplete}
      />
    )

    fireEvent.click(await screen.findByRole('button', { name: /investigate/i }))

    fireEvent.click(screen.getByLabelText('Core hotspot'))
    fireEvent.click(screen.getByRole('button', { name: /continue to witness room/i }))

    fireEvent.click(await screen.findByText('What did you notice first?'))
    fireEvent.click(screen.getByRole('button', { name: /continue to timeline/i }))

    fireEvent.click((await screen.findAllByText('↑'))[1])
    fireEvent.click(screen.getByRole('button', { name: /continue to warrant/i }))

    fireEvent.click(await screen.findByText('Open window caused heat loss'))
    fireEvent.click(screen.getByRole('button', { name: /file warrant/i }))

    expect(await screen.findByText(/case solved/i)).toBeInTheDocument()

    const revealContinue = screen.getByRole('button', { name: /^continue/i })
    await waitFor(() => expect(revealContinue).not.toBeDisabled())
    fireEvent.click(revealContinue)

    expect(await screen.findByText(/mystery solved/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ completed: true }))
  })

  it('waits for image and TTS before transitioning to briefing', async () => {
    const imageDeferred = createDeferred()

    const fetchMock = vi.fn((url) => {
      if (String(url).includes('/api/generate/engagement')) {
        return mockJsonResponse(200, {
          funFact: { emoji: '💡', text: 'A waiting fact.' },
          suggestedQuestions: [],
        })
      }

      if (String(url).includes('/api/learn/mystery/image')) {
        return imageDeferred.promise
      }

      if (String(url).includes('/api/learn/mystery')) {
        return mockJsonResponse(200, crimeSceneOpsPayload)
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MysteryLab
        slides={[{ subtitle: 'Heat moves from warm to cold' }]}
        topicName="Heat Transfer"
      />
    )

    // Should still be loading while image is pending
    await act(async () => { await Promise.resolve() })
    expect(screen.getByTestId('mystery-loader-stage')).toBeInTheDocument()

    // Resolve image — should then transition to briefing
    imageDeferred.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ imageUrl: 'https://example.com/scene.png' }),
    })

    expect(await screen.findByRole('button', { name: /investigate/i })).toBeInTheDocument()
    expect(screen.queryByTestId('mystery-loader-stage')).not.toBeInTheDocument()
  })

  it('renders scene image once loaded even if slow', async () => {
    vi.useFakeTimers()

    const fetchMock = vi.fn((url, options = {}) => {
      if (String(url).includes('/api/learn/mystery/image')) {
        return new Promise((resolve, reject) => {
          if (options.signal?.aborted) {
            reject(createAbortError())
            return
          }

          const timerId = setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ imageUrl: 'https://example.com/late-scene.png' }),
            })
          }, 13050)

          options.signal?.addEventListener('abort', () => {
            clearTimeout(timerId)
            reject(createAbortError())
          }, { once: true })
        })
      }

      if (String(url).includes('/api/learn/mystery')) {
        return mockJsonResponse(200, crimeSceneOpsPayload)
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MysteryLab
        slides={[{ subtitle: 'Heat moves from warm to cold' }]}
        topicName="Heat Transfer"
      />
    )

    // Should still be in loading state (image hasn't resolved)
    await act(async () => { await Promise.resolve() })
    expect(screen.getByTestId('mystery-loader-stage')).toBeInTheDocument()

    // Advance past image delay — image resolves, transitions to briefing
    await act(async () => {
      await vi.advanceTimersByTimeAsync(13100)
      await Promise.resolve()
    })

    expect(screen.getByRole('button', { name: /investigate/i })).toBeInTheDocument()
    const image = screen.getByAltText('Mystery scene')
    expect(image.getAttribute('src')).toContain('late-scene.png')
  })

  it('shows one API fun fact and keeps it stable while loading', async () => {
    vi.useFakeTimers()
    const apiFactText = 'Detective notebooks evolved into modern incident timelines.'

    const fetchMock = vi.fn((url, options = {}) => {
      if (String(url).includes('/api/learn/mystery')) {
        return pendingWithAbort(options.signal)
      }

      if (String(url).includes('/api/generate/engagement')) {
        return mockJsonResponse(200, {
          funFact: { emoji: '🕵️', text: apiFactText },
          suggestedQuestions: [],
        })
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MysteryLab
        slides={[{ subtitle: 'Heat moves from warm to cold' }]}
        topicName="Orbital Mechanics"
        explanationLevel="simple"
      />
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(901)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText(apiFactText)).toBeInTheDocument()
    expect(mockNarrate).toHaveBeenCalledWith(
      `Fun fact: ${apiFactText}`,
      `loader-fun-fact:${apiFactText}`
    )

    const engagementCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/api/generate/engagement'))
    expect(engagementCall).toBeTruthy()
    const requestBody = JSON.parse(engagementCall[1].body)
    expect(requestBody.explanationLevel).toBe('simple')
    expect(requestBody.query).toBe('Orbital Mechanics')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText(apiFactText)).toBeInTheDocument()
    expect(mockNarrate).toHaveBeenCalledTimes(1)
  })

  it('shows no fun fact when engagement request fails', async () => {
    vi.useFakeTimers()

    const fetchMock = vi.fn((url, options = {}) => {
      if (String(url).includes('/api/learn/mystery')) {
        return pendingWithAbort(options.signal)
      }

      if (String(url).includes('/api/generate/engagement')) {
        return Promise.reject(new Error('engagement unavailable'))
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MysteryLab
        slides={[{ subtitle: 'Heat moves from warm to cold' }]}
        topicName="Forensic Physics"
        explanationLevel="deep"
      />
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
      await Promise.resolve()
    })

    expect(screen.queryByTestId('mystery-loader-fun-fact')).not.toBeInTheDocument()
    expect(mockNarrate).not.toHaveBeenCalled()
  })

  it('shows API fact once it resolves even if delayed', async () => {
    vi.useFakeTimers()
    const lateApiFact = 'Late API fact appears once resolved.'

    const fetchMock = vi.fn((url, options = {}) => {
      if (String(url).includes('/api/learn/mystery')) {
        return pendingWithAbort(options.signal)
      }

      if (String(url).includes('/api/generate/engagement')) {
        return new Promise((resolve, reject) => {
          if (options.signal?.aborted) {
            reject(createAbortError())
            return
          }

          const timerId = setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({
                funFact: { emoji: '💡', text: lateApiFact },
                suggestedQuestions: [],
              }),
            })
          }, 3000)

          options.signal?.addEventListener('abort', () => {
            clearTimeout(timerId)
            reject(createAbortError())
          }, { once: true })
        })
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MysteryLab
        slides={[{ subtitle: 'Heat moves from warm to cold' }]}
        topicName="Heat Transfer"
        explanationLevel="standard"
      />
    )

    // No fact shown before API resolves
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
      await Promise.resolve()
    })
    expect(screen.queryByTestId('mystery-loader-fun-fact')).not.toBeInTheDocument()

    // Advance past API delay — fact appears
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
      await Promise.resolve()
    })

    expect(screen.getByText(lateApiFact)).toBeInTheDocument()
  })

  it('cleans loader timers and requests on unmount without state warnings', async () => {
    vi.useFakeTimers()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const fetchMock = vi.fn((url, options = {}) => {
      if (String(url).includes('/api/learn/mystery')) {
        return pendingWithAbort(options.signal)
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    vi.stubGlobal('fetch', fetchMock)

    const view = render(
      <MysteryLab
        slides={[{ subtitle: 'Heat moves from warm to cold' }]}
        topicName="Heat Transfer"
      />
    )

    view.unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000)
    })

    expect(consoleErrorSpy).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('shows legacy payload unavailable message when schema is missing', async () => {
    const fetchMock = vi.fn((url) => {
      if (String(url).includes('/api/learn/mystery')) {
        return mockJsonResponse(200, {
          mysteryTitle: 'Legacy payload',
          mysterySetup: 'Old format',
          imagePrompt: 'legacy',
          clues: [{ text: 'legacy clue' }],
          expectedConcepts: ['legacy'],
          solutionExplanation: 'legacy',
        })
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MysteryLab
        slides={[{ subtitle: 'Heat moves from warm to cold' }]}
        topicName="Heat Transfer"
      />
    )

    expect(await screen.findByText(/crime scene ops unavailable/i)).toBeInTheDocument()
    expect(screen.getByText(/legacy mystery payload detected/i)).toBeInTheDocument()
  })
})
