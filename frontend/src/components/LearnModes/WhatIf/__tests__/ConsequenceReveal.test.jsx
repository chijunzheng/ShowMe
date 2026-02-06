import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import ConsequenceReveal from '../ConsequenceReveal'

vi.mock('../../../../utils/haptics', () => ({
  vibrateSuccess: vi.fn(),
  vibrateShort: vi.fn(),
}))

const revealAssets = [
  {
    id: 'card-1',
    text: 'First reveal text',
    revealNarration: 'First narration',
    imageUrl: null,
    audioUrl: null,
  },
  {
    id: 'card-2',
    text: 'Second reveal text',
    revealNarration: 'Second narration',
    imageUrl: null,
    audioUrl: null,
  },
]

describe('ConsequenceReveal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('does not auto-advance after narration ends', async () => {
    const narrate = vi.fn().mockResolvedValue(true)
    const play = vi.fn()
    const onComplete = vi.fn()

    await act(async () => {
      render(
        <ConsequenceReveal
          revealAssets={revealAssets}
          userSelections={new Set(['card-1'])}
          narrate={narrate}
          play={play}
          isPlaying={false}
          isLoading={false}
          onComplete={onComplete}
        />
      )
      await Promise.resolve()
    })

    expect(narrate).toHaveBeenCalledWith('First narration', 'reveal-card-1')
    expect(screen.getByText('First reveal text')).toBeInTheDocument()
    expect(screen.queryByText('Second reveal text')).not.toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('disables Next button while narration is playing or loading', async () => {
    const narrate = vi.fn()
    const play = vi.fn()
    const onComplete = vi.fn()

    const { rerender } = render(
      <ConsequenceReveal
        revealAssets={revealAssets}
        userSelections={new Set(['card-1'])}
        narrate={narrate}
        play={play}
        isPlaying={true}
        isLoading={false}
        onComplete={onComplete}
      />
    )

    expect(screen.getByRole('button', { name: /narrating/i })).toBeDisabled()

    rerender(
      <ConsequenceReveal
        revealAssets={revealAssets}
        userSelections={new Set(['card-1'])}
        narrate={narrate}
        play={play}
        isPlaying={false}
        isLoading={true}
        onComplete={onComplete}
      />
    )

    expect(screen.getByRole('button', { name: /narrating/i })).toBeDisabled()

    rerender(
      <ConsequenceReveal
        revealAssets={revealAssets}
        userSelections={new Set(['card-1'])}
        narrate={narrate}
        play={play}
        isPlaying={false}
        isLoading={false}
        onComplete={onComplete}
      />
    )

    expect(screen.getByRole('button', { name: /next consequence/i })).toBeEnabled()
  })

  it('advances exactly one reveal when Next is clicked', async () => {
    const narrate = vi.fn().mockResolvedValue(true)
    const play = vi.fn()
    const onComplete = vi.fn()

    await act(async () => {
      render(
        <ConsequenceReveal
          revealAssets={revealAssets}
          userSelections={new Set(['card-1'])}
          narrate={narrate}
          play={play}
          isPlaying={false}
          isLoading={false}
          onComplete={onComplete}
        />
      )
      await Promise.resolve()
    })

    fireEvent.click(screen.getByRole('button', { name: /next consequence/i }))

    expect(screen.getByText('Second reveal text')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /see results/i })).toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('calls onComplete once when See Results is clicked on last reveal', async () => {
    const narrate = vi.fn().mockResolvedValue(true)
    const play = vi.fn()
    const onComplete = vi.fn()

    await act(async () => {
      render(
        <ConsequenceReveal
          revealAssets={[revealAssets[0]]}
          userSelections={new Set(['card-1'])}
          narrate={narrate}
          play={play}
          isPlaying={false}
          isLoading={false}
          onComplete={onComplete}
        />
      )
      await Promise.resolve()
    })

    fireEvent.click(screen.getByRole('button', { name: /see results/i }))

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does not implicitly advance when narration fails to start', async () => {
    const narrate = vi.fn().mockResolvedValue(false)
    const play = vi.fn()
    const onComplete = vi.fn()

    await act(async () => {
      render(
        <ConsequenceReveal
          revealAssets={revealAssets}
          userSelections={new Set(['card-1'])}
          narrate={narrate}
          play={play}
          isPlaying={false}
          isLoading={false}
          onComplete={onComplete}
        />
      )
      await Promise.resolve()
    })

    expect(screen.getByText('First reveal text')).toBeInTheDocument()
    expect(screen.queryByText('Second reveal text')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /next consequence/i }))

    expect(screen.getByText('Second reveal text')).toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
  })
})
