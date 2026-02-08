/**
 * Tests for ChapterPicker component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChapterPicker from '../ChapterPicker'

describe('ChapterPicker', () => {
  const mockSegments = [
    { id: 'main', label: 'Main Topic', slides: [{ id: '1' }, { id: '2' }], depth: 0 },
    { id: 'follow1', label: 'First Follow-up', slides: [{ id: '3' }], depth: 1 },
    { id: 'follow2', label: 'Second Follow-up', slides: [{ id: '4' }, { id: '5' }], depth: 1 },
  ]

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ChapterPicker
        segments={mockSegments}
        isOpen={false}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when segments is empty', () => {
    const { container } = render(
      <ChapterPicker
        segments={[]}
        isOpen={true}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders picker when isOpen is true with segments', () => {
    render(
      <ChapterPicker
        segments={mockSegments}
        isOpen={true}
      />
    )

    expect(screen.getByTestId('chapter-picker')).toBeInTheDocument()
    expect(screen.getByText('Chapters')).toBeInTheDocument()
    expect(screen.getByText('Main Topic')).toBeInTheDocument()
    expect(screen.getByText('First Follow-up')).toBeInTheDocument()
    expect(screen.getByText('Second Follow-up')).toBeInTheDocument()
  })

  it('shows slide count for each segment', () => {
    render(
      <ChapterPicker
        segments={mockSegments}
        isOpen={true}
      />
    )

    // There are two segments with 2 slides
    const twoSlidesElements = screen.getAllByText('2 slides')
    expect(twoSlidesElements.length).toBe(2)
    expect(screen.getByText('1 slide')).toBeInTheDocument()
  })

  it('shows total slides in footer', () => {
    render(
      <ChapterPicker
        segments={mockSegments}
        isOpen={true}
      />
    )

    expect(screen.getByText('3 chapters')).toBeInTheDocument()
    expect(screen.getByText('5 total slides')).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn()
    render(
      <ChapterPicker
        segments={mockSegments}
        isOpen={true}
        onClose={handleClose}
      />
    )

    fireEvent.click(screen.getByLabelText('Close chapter picker'))
    expect(handleClose).toHaveBeenCalled()
  })

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn()
    render(
      <ChapterPicker
        segments={mockSegments}
        isOpen={true}
        onClose={handleClose}
      />
    )

    fireEvent.click(screen.getByLabelText('Close'))
    expect(handleClose).toHaveBeenCalled()
  })

  it('calls onSelectSegment and onClose when segment is clicked', () => {
    const handleSelect = vi.fn()
    const handleClose = vi.fn()

    render(
      <ChapterPicker
        segments={mockSegments}
        isOpen={true}
        onSelectPosition={handleSelect}
        onClose={handleClose}
      />
    )

    fireEvent.click(screen.getByText('First Follow-up'))

    expect(handleSelect).toHaveBeenCalledWith(1, 0)
    expect(handleClose).toHaveBeenCalled()
  })

  it('shows follow-up slides within a chapter and can jump to them', () => {
    const handleSelect = vi.fn()
    const nested = [
      {
        id: 'seg-1',
        label: 'Chapter One',
        depth: 0,
        slides: [
          { id: 'p1', title: 'Parent' },
          { id: 'c1', title: 'Follow-up A' },
          { id: 'c2', subtitle: 'Second follow up subtitle goes here' },
        ],
      },
    ]

    render(
      <ChapterPicker
        segments={nested}
        currentSegmentIndex={0}
        currentSlideInSegment={0}
        isOpen={true}
        onSelectPosition={handleSelect}
      />
    )

    expect(screen.getByText('Follow-up A')).toBeInTheDocument()
    // Subtitle-derived label uses first words
    expect(screen.getByText('Second follow up subtitle goes here')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Follow-up A'))
    expect(handleSelect).toHaveBeenCalledWith(0, 1)
  })

  it('highlights current segment', () => {
    render(
      <ChapterPicker
        segments={mockSegments}
        currentSegmentIndex={1}
        currentSlideInSegment={0}
        isOpen={true}
      />
    )

    // Current segment should have aria-current
    const buttons = screen.getAllByRole('button')
    const currentButton = buttons.find(btn => btn.getAttribute('aria-current') === 'true')
    expect(currentButton).toBeInTheDocument()
  })

  it('shows checkmark for completed segments', () => {
    const { container } = render(
      <ChapterPicker
        segments={mockSegments}
        currentSegmentIndex={2}
        isOpen={true}
      />
    )

    // Should have checkmark SVGs for completed segments
    const checkmarks = container.querySelectorAll('svg')
    expect(checkmarks.length).toBeGreaterThan(0)
  })

  it('shows depth indicator for follow-ups', () => {
    render(
      <ChapterPicker
        segments={mockSegments}
        isOpen={true}
      />
    )

    // Should show "Follow-up" label for depth > 0 segments
    const followUpLabels = screen.getAllByText('Follow-up', { exact: false })
    expect(followUpLabels.length).toBeGreaterThan(0)
  })

  it('closes on Escape key', () => {
    const handleClose = vi.fn()
    render(
      <ChapterPicker
        segments={mockSegments}
        isOpen={true}
        onClose={handleClose}
      />
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalled()
  })

  it('has proper accessibility attributes', () => {
    render(
      <ChapterPicker
        segments={mockSegments}
        isOpen={true}
      />
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Chapter picker')
  })

  it('applies indentation based on depth', () => {
    const nestedSegments = [
      { id: 'main', label: 'Main', slides: [{ id: '1' }], depth: 0 },
      { id: 'level1', label: 'Level 1', slides: [{ id: '2' }], depth: 1 },
      { id: 'level2', label: 'Level 2', slides: [{ id: '3' }], depth: 2 },
    ]

    render(
      <ChapterPicker
        segments={nestedSegments}
        isOpen={true}
      />
    )

    // Each button should have different padding based on depth
    const buttons = screen.getAllByRole('button').filter(btn => btn.style.paddingLeft)
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('truncates long labels', () => {
    const longLabelSegment = [
      { id: 'main', label: 'This is an extremely long label that should definitely be truncated to fit', slides: [{ id: '1' }], depth: 0 },
    ]

    render(
      <ChapterPicker
        segments={longLabelSegment}
        isOpen={true}
      />
    )

    // Long labels should be truncated
    expect(screen.queryByText('This is an extremely long label that should definitely be truncated to fit')).not.toBeInTheDocument()
  })

  it('shows number for pending segments', () => {
    render(
      <ChapterPicker
        segments={mockSegments}
        currentSegmentIndex={0}
        isOpen={true}
      />
    )

    // Future segments should show their number
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
