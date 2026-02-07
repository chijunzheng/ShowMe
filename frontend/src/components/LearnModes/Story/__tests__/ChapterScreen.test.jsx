import { StrictMode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import ChapterScreen from '../ChapterScreen'

// Mock haptics
vi.mock('../../../../utils/haptics', () => ({
  vibrateShort: vi.fn(),
}))

describe('ChapterScreen', () => {
  const mockChapterData = {
    prompt: 'How does your hero start their journey?',
    icon: '🚀',
    choices: [
      {
        id: 'choice-1',
        emoji: '🌟',
        text: 'They discover a mysterious map in their attic.',
        conceptHints: ['Discovery', 'Mystery'],
      },
      {
        id: 'choice-2',
        emoji: '🎒',
        text: 'They pack their backpack and leave home.',
        conceptHints: ['Courage'],
      },
      {
        id: 'choice-3',
        emoji: '📞',
        text: 'They receive a strange phone call from a stranger.',
        conceptHints: ['Call to Adventure'],
      },
    ],
  }

  const mockConceptCards = [
    { concept: 'Discovery', icon: '🔍', description: 'Finding something new' },
    { concept: 'Courage', icon: '💪', description: 'Being brave' },
    { concept: 'Mystery', icon: '❓', description: 'Something unknown' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('renders chapter header with correct info', () => {
    render(
      <StrictMode>
        <ChapterScreen
          chapter={1}
          chapterData={mockChapterData}
          conceptCards={mockConceptCards}
          conceptsFound={new Set()}
        />
      </StrictMode>
    )

    expect(screen.getByText('Chapter 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('🚀 The Beginning')).toBeInTheDocument()
    expect(screen.getByText('How does your hero start their journey?')).toBeInTheDocument()
  })

  it('renders all choice cards', () => {
    render(
      <StrictMode>
        <ChapterScreen
          chapter={1}
          chapterData={mockChapterData}
          conceptCards={mockConceptCards}
          conceptsFound={new Set()}
        />
      </StrictMode>
    )

    expect(screen.getByText('They discover a mysterious map in their attic.')).toBeInTheDocument()
    expect(screen.getByText('They pack their backpack and leave home.')).toBeInTheDocument()
    expect(screen.getByText('They receive a strange phone call from a stranger.')).toBeInTheDocument()
  })

  it('calls onSelectChoice after delay when choice is clicked', async () => {
    const onSelectChoice = vi.fn()
    render(
      <StrictMode>
        <ChapterScreen
          chapter={1}
          chapterData={mockChapterData}
          conceptCards={mockConceptCards}
          conceptsFound={new Set()}
          onSelectChoice={onSelectChoice}
        />
      </StrictMode>
    )

    const choiceButton = screen.getByText('They discover a mysterious map in their attic.').closest('button')
    fireEvent.click(choiceButton)

    // Should not call immediately
    expect(onSelectChoice).not.toHaveBeenCalled()

    // Should call after 400ms delay
    await vi.advanceTimersByTimeAsync(400)
    expect(onSelectChoice).toHaveBeenCalledTimes(1)
    expect(onSelectChoice).toHaveBeenCalledWith(mockChapterData.choices[0])
  })

  it('disables other choices after selection', () => {
    render(
      <StrictMode>
        <ChapterScreen
          chapter={1}
          chapterData={mockChapterData}
          conceptCards={mockConceptCards}
          conceptsFound={new Set()}
          onSelectChoice={vi.fn()}
        />
      </StrictMode>
    )

    const firstChoice = screen.getByText('They discover a mysterious map in their attic.').closest('button')
    const secondChoice = screen.getByText('They pack their backpack and leave home.').closest('button')

    fireEvent.click(firstChoice)

    // First choice should be selected, second should be disabled
    expect(firstChoice).not.toBeDisabled()
    expect(secondChoice).toBeDisabled()
  })

  it('shows custom input when "Write your own..." is clicked', () => {
    render(
      <StrictMode>
        <ChapterScreen
          chapter={1}
          chapterData={mockChapterData}
          conceptCards={mockConceptCards}
          conceptsFound={new Set()}
        />
      </StrictMode>
    )

    const writeYourOwnButton = screen.getByText('Write your own...')
    fireEvent.click(writeYourOwnButton)

    expect(screen.getByPlaceholderText('Write what happens next...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use This' })).toBeInTheDocument()
  })

  it('requires minimum text length for custom input', () => {
    render(
      <StrictMode>
        <ChapterScreen
          chapter={1}
          chapterData={mockChapterData}
          conceptCards={mockConceptCards}
          conceptsFound={new Set()}
        />
      </StrictMode>
    )

    const writeYourOwnButton = screen.getByText('Write your own...')
    fireEvent.click(writeYourOwnButton)

    const textarea = screen.getByPlaceholderText('Write what happens next...')
    const submitButton = screen.getByRole('button', { name: 'Use This' })

    // Should be disabled with short text
    fireEvent.change(textarea, { target: { value: 'Short' } })
    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/more characters needed/i)).toBeInTheDocument()

    // Should be enabled with sufficient text
    fireEvent.change(textarea, { target: { value: 'This is a long enough custom story choice text.' } })
    expect(submitButton).not.toBeDisabled()
    expect(screen.getByText('Ready to submit!')).toBeInTheDocument()
  })

  it('calls onCustomInput with synthetic choice when custom text is submitted', async () => {
    const onCustomInput = vi.fn()
    render(
      <StrictMode>
        <ChapterScreen
          chapter={2}
          chapterData={mockChapterData}
          conceptCards={mockConceptCards}
          conceptsFound={new Set()}
          onCustomInput={onCustomInput}
        />
      </StrictMode>
    )

    const writeYourOwnButton = screen.getByText('Write your own...')
    fireEvent.click(writeYourOwnButton)

    const textarea = screen.getByPlaceholderText('Write what happens next...')
    const customText = 'My custom story choice here!'
    fireEvent.change(textarea, { target: { value: customText } })

    const submitButton = screen.getByRole('button', { name: 'Use This' })
    fireEvent.click(submitButton)

    // Should not call immediately
    expect(onCustomInput).not.toHaveBeenCalled()

    // Should call after 400ms delay with synthetic choice
    await vi.advanceTimersByTimeAsync(400)
    expect(onCustomInput).toHaveBeenCalledTimes(1)
    expect(onCustomInput).toHaveBeenCalledWith({
      id: 'custom-2',
      emoji: '✏️',
      text: customText,
      conceptHints: [],
    })
  })

  it('displays previous illustration when provided', () => {
    render(
      <StrictMode>
        <ChapterScreen
          chapter={2}
          chapterData={mockChapterData}
          conceptCards={mockConceptCards}
          conceptsFound={new Set()}
          previousIllustration="https://example.com/chapter1.jpg"
        />
      </StrictMode>
    )

    const illustration = screen.getByAltText('Previous chapter scene')
    expect(illustration).toBeInTheDocument()
    expect(illustration).toHaveAttribute('src', 'https://example.com/chapter1.jpg')
  })

  it('does not show previous illustration on first chapter', () => {
    render(
      <StrictMode>
        <ChapterScreen
          chapter={1}
          chapterData={mockChapterData}
          conceptCards={mockConceptCards}
          conceptsFound={new Set()}
          previousIllustration={null}
        />
      </StrictMode>
    )

    expect(screen.queryByAltText('Previous chapter scene')).not.toBeInTheDocument()
  })

  it('shows concept cards with found status', () => {
    const conceptsFound = new Set(['Discovery', 'Mystery'])
    render(
      <StrictMode>
        <ChapterScreen
          chapter={1}
          chapterData={mockChapterData}
          conceptCards={mockConceptCards}
          conceptsFound={conceptsFound}
        />
      </StrictMode>
    )

    expect(screen.getByText('Story Ingredients')).toBeInTheDocument()
    expect(screen.getByText('2 / 3 found')).toBeInTheDocument()

    // Concept names appear in both choice hints and concept cards, so check for multiple
    const discoveryElements = screen.getAllByText('Discovery')
    expect(discoveryElements.length).toBeGreaterThan(0)

    const courageElements = screen.getAllByText('Courage')
    expect(courageElements.length).toBeGreaterThan(0)

    const mysteryElements = screen.getAllByText('Mystery')
    expect(mysteryElements.length).toBeGreaterThan(0)
  })

  it('hides custom input and divider after selection', () => {
    render(
      <StrictMode>
        <ChapterScreen
          chapter={1}
          chapterData={mockChapterData}
          conceptCards={mockConceptCards}
          conceptsFound={new Set()}
        />
      </StrictMode>
    )

    // Initially shows divider and "Write your own" button
    expect(screen.getByText('or')).toBeInTheDocument()
    expect(screen.getByText('Write your own...')).toBeInTheDocument()

    // Click a choice
    const choiceButton = screen.getByText('They discover a mysterious map in their attic.').closest('button')
    fireEvent.click(choiceButton)

    // Should hide both
    expect(screen.queryByText('or')).not.toBeInTheDocument()
    expect(screen.queryByText('Write your own...')).not.toBeInTheDocument()
  })

  it('uses default label for chapters beyond 3', () => {
    render(
      <StrictMode>
        <ChapterScreen
          chapter={5}
          chapterData={mockChapterData}
          conceptCards={mockConceptCards}
          conceptsFound={new Set()}
        />
      </StrictMode>
    )

    // Text is split across elements, so use a matcher
    expect(screen.getByText((content, element) => {
      return element.tagName.toLowerCase() === 'h1' && element.textContent.includes('Chapter 5')
    })).toBeInTheDocument()
  })
})
