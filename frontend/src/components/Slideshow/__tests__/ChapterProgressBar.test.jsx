/**
 * Tests for ChapterProgressBar component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChapterProgressBar from '../ChapterProgressBar'

describe('ChapterProgressBar', () => {
  const mockSegments = [
    { id: 'main', label: 'Main Topic', slides: [{ id: '1' }, { id: '2' }], depth: 0 },
    { id: 'follow1', label: 'Follow-up Question 1', slides: [{ id: '3' }], depth: 1 },
    { id: 'follow2', label: 'Another Follow-up', slides: [{ id: '4' }, { id: '5' }], depth: 1 },
  ]

  it('renders nothing when segments is empty', () => {
    const { container } = render(<ChapterProgressBar segments={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders progress bar with segments', () => {
    render(<ChapterProgressBar segments={mockSegments} />)

    expect(screen.getByTestId('chapter-progress-bar')).toBeInTheDocument()
    expect(screen.getByText('Main Topic')).toBeInTheDocument()
    // Labels are truncated - check for aria-label instead
    expect(screen.getByLabelText(/Follow-up Question 1/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Another Follow-up/)).toBeInTheDocument()
  })

  it('shows current slide progress in active segment', () => {
    render(
      <ChapterProgressBar
        segments={mockSegments}
        currentSegmentIndex={0}
        currentSlideInSegment={0}
      />
    )

    // Should show "1/2" for first slide of 2-slide segment
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('shows slide count for inactive segments', () => {
    render(
      <ChapterProgressBar
        segments={mockSegments}
        currentSegmentIndex={0}
        currentSlideInSegment={0}
      />
    )

    // Follow-up segments should show total count
    expect(screen.getByText('1')).toBeInTheDocument() // follow1 has 1 slide
    expect(screen.getByText('2')).toBeInTheDocument() // follow2 has 2 slides
  })

  it('calls onSegmentClick when segment is clicked', () => {
    const handleClick = vi.fn()
    render(
      <ChapterProgressBar
        segments={mockSegments}
        onSegmentClick={handleClick}
      />
    )

    // Use aria-label to find button since text may be truncated
    fireEvent.click(screen.getByLabelText(/Follow-up Question 1/))
    expect(handleClick).toHaveBeenCalledWith(1)
  })

  it('shows expand button when more than 2 segments and onExpand provided', () => {
    const handleExpand = vi.fn()
    render(
      <ChapterProgressBar
        segments={mockSegments}
        onExpand={handleExpand}
      />
    )

    const expandButton = screen.getByText('View all chapters')
    expect(expandButton).toBeInTheDocument()

    fireEvent.click(expandButton)
    expect(handleExpand).toHaveBeenCalled()
  })

  it('does not show expand button when 2 or fewer segments', () => {
    const twoSegments = mockSegments.slice(0, 2)
    const handleExpand = vi.fn()

    render(
      <ChapterProgressBar
        segments={twoSegments}
        onExpand={handleExpand}
      />
    )

    expect(screen.queryByText('View all chapters')).not.toBeInTheDocument()
  })

  it('applies active styling to current segment', () => {
    render(
      <ChapterProgressBar
        segments={mockSegments}
        currentSegmentIndex={1}
        currentSlideInSegment={0}
      />
    )

    // The second segment should have the active indicator bar
    const buttons = screen.getAllByRole('button')
    const activeButton = buttons.find(btn => btn.getAttribute('aria-current') === 'step')
    expect(activeButton).toBeInTheDocument()
  })

  it('shows checkmark for completed segments', () => {
    const { container } = render(
      <ChapterProgressBar
        segments={mockSegments}
        currentSegmentIndex={2}
        currentSlideInSegment={0}
      />
    )

    // Completed segments (index < current) should have checkmark SVGs
    const checkmarks = container.querySelectorAll('svg')
    expect(checkmarks.length).toBeGreaterThan(0)
  })

  it('truncates long labels', () => {
    const longLabelSegment = [
      { id: 'main', label: 'This is a very long label that should be truncated', slides: [{ id: '1' }], depth: 0 },
    ]

    render(<ChapterProgressBar segments={longLabelSegment} />)

    // Label should be truncated (not showing full text)
    expect(screen.queryByText('This is a very long label that should be truncated')).not.toBeInTheDocument()
  })

  it('shows depth indicator for nested segments', () => {
    const nestedSegments = [
      { id: 'main', label: 'Main', slides: [{ id: '1' }], depth: 0 },
      { id: 'nested', label: 'Nested', slides: [{ id: '2' }], depth: 1 },
    ]

    render(<ChapterProgressBar segments={nestedSegments} />)

    expect(screen.getByText('Follow-up', { exact: false })).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<ChapterProgressBar segments={mockSegments} />)

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('aria-label', 'Slideshow chapter navigation')

    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label')
    })
  })

  it('handles keyboard focus', () => {
    render(<ChapterProgressBar segments={mockSegments} />)

    const buttons = screen.getAllByRole('button')
    buttons[0].focus()
    expect(document.activeElement).toBe(buttons[0])
  })
})
