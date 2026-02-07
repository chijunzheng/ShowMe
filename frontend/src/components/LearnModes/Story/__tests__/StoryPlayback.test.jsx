import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StoryPlayback from '../StoryPlayback'

const mockNarrate = vi.fn().mockResolvedValue(true)
const mockNarratePanels = vi.fn().mockResolvedValue(true)
const mockStop = vi.fn()

vi.mock('../useStoryNarration', () => ({
  default: () => ({
    narrate: mockNarrate,
    narratePanels: mockNarratePanels,
    stop: mockStop,
    isPlaying: false,
    isLoading: false,
    error: null,
  }),
}))

vi.mock('../../../utils/haptics', () => ({
  vibrateShort: vi.fn(),
}))

vi.mock('../../../utils/soundEffects', () => ({
  playSelectSound: vi.fn(),
}))

describe('StoryPlayback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders numbered panel beats when panel captions are present', () => {
    render(
      <StoryPlayback
        topicName="Neural Networks"
        scenes={[
          {
            imageUrl: 'data:image/png;base64,test',
            sceneDescription: 'Panel scene',
            chapterTitle: 'Chapter 1: Sparks',
            panelCaptions: [
              'Sparky enters the maze',
              'A puzzle wall appears',
              'Sparky finds a clue',
              'The gate opens',
            ],
            narrativeText: 'Fallback text',
          },
        ]}
        conceptsUsed={2}
        totalConcepts={3}
      />
    )

    expect(screen.getAllByText('Sparky enters the maze').length).toBeGreaterThan(0)
    expect(screen.getAllByText('A puzzle wall appears').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sparky finds a clue').length).toBeGreaterThan(0)
    expect(screen.getAllByText('The gate opens').length).toBeGreaterThan(0)
  })

  it('falls back to narrativeText when panel captions are absent', () => {
    render(
      <StoryPlayback
        topicName="Neural Networks"
        scenes={[
          {
            imageUrl: null,
            sceneDescription: 'Fallback scene',
            chapterTitle: 'Chapter 2: Paths',
            panelCaptions: [],
            narrativeText: 'Sparky keeps moving through the maze.',
          },
        ]}
        conceptsUsed={1}
        totalConcepts={3}
      />
    )

    expect(screen.getByText('Sparky keeps moving through the maze.')).toBeInTheDocument()
  })

  it('triggers sequential panel narration from Read Aloud', async () => {
    render(
      <StoryPlayback
        topicName="Neural Networks"
        scenes={[
          {
            imageUrl: 'data:image/png;base64,test',
            sceneDescription: 'Panel scene',
            chapterTitle: 'Chapter 3: Finale',
            panelCaptions: [
              'Beat one',
              'Beat two',
              'Beat three',
              'Beat four',
            ],
            narrativeText: 'Fallback text',
          },
        ]}
        conceptsUsed={3}
        totalConcepts={3}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /read aloud/i }))

    expect(mockNarratePanels).toHaveBeenCalledWith(
      ['Beat one', 'Beat two', 'Beat three', 'Beat four'],
      'Chapter 3: Finale'
    )
    expect(mockNarrate).not.toHaveBeenCalled()
  })
})
