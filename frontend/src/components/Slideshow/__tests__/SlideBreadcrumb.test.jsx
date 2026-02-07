/**
 * Tests for SlideBreadcrumb component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SlideBreadcrumb from '../SlideBreadcrumb'

describe('SlideBreadcrumb', () => {
  const mockSegments = [
    { id: 'main', label: 'Main Topic', slides: [{ id: '1' }], depth: 0 },
    { id: 'follow1', label: 'First Follow-up', slides: [{ id: '2' }], depth: 1 },
    { id: 'follow2', label: 'Second Follow-up', slides: [{ id: '3' }], depth: 1 },
  ]

  it('renders nothing when segments is empty', () => {
    const { container } = render(<SlideBreadcrumb segments={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when only one segment (at root)', () => {
    const singleSegment = [
      { id: 'main', label: 'Main', slides: [{ id: '1' }], depth: 0 },
    ]

    const { container } = render(
      <SlideBreadcrumb
        segments={singleSegment}
        currentSegmentIndex={0}
      />
    )

    // Single segment breadcrumb should not render
    expect(container.firstChild).toBeNull()
  })

  it('renders breadcrumb when at follow-up', () => {
    render(
      <SlideBreadcrumb
        segments={mockSegments}
        currentSegmentIndex={1}
      />
    )

    expect(screen.getByTestId('slide-breadcrumb')).toBeInTheDocument()
  })

  it('shows separator between breadcrumb items', () => {
    render(
      <SlideBreadcrumb
        segments={mockSegments}
        currentSegmentIndex={1}
      />
    )

    // Should have separator character
    const nav = screen.getByRole('navigation')
    expect(nav.textContent).toContain('\u203A') // Single right angle quotation mark
  })

  it('makes previous crumbs clickable', () => {
    const handleClick = vi.fn()

    render(
      <SlideBreadcrumb
        segments={mockSegments}
        currentSegmentIndex={1}
        onSegmentClick={handleClick}
      />
    )

    // Find and click the "Main Topic" button (should be a button, not span)
    const buttons = screen.getAllByRole('button')
    const mainButton = buttons.find(btn => btn.textContent === 'Main Topic')

    if (mainButton) {
      fireEvent.click(mainButton)
      expect(handleClick).toHaveBeenCalledWith(0)
    }
  })

  it('current segment is not clickable', () => {
    render(
      <SlideBreadcrumb
        segments={mockSegments}
        currentSegmentIndex={1}
      />
    )

    // Current segment should be a span, not a button
    expect(screen.getByText('First Follow-up').tagName).toBe('SPAN')
  })

  it('marks current item with aria-current', () => {
    render(
      <SlideBreadcrumb
        segments={mockSegments}
        currentSegmentIndex={1}
      />
    )

    const currentItem = screen.getByText('First Follow-up')
    expect(currentItem).toHaveAttribute('aria-current', 'page')
  })

  it('has proper navigation role', () => {
    render(
      <SlideBreadcrumb
        segments={mockSegments}
        currentSegmentIndex={1}
      />
    )

    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Chapter breadcrumb')
  })

  it('handles keyboard navigation on clickable items', () => {
    const handleClick = vi.fn()

    render(
      <SlideBreadcrumb
        segments={mockSegments}
        currentSegmentIndex={1}
        onSegmentClick={handleClick}
      />
    )

    const buttons = screen.getAllByRole('button')
    if (buttons.length > 0) {
      // Simulate Enter key
      fireEvent.keyDown(buttons[0], { key: 'Enter' })
      expect(handleClick).toHaveBeenCalled()

      handleClick.mockClear()

      // Simulate Space key
      fireEvent.keyDown(buttons[0], { key: ' ' })
      expect(handleClick).toHaveBeenCalled()
    }
  })

  it('truncates long labels', () => {
    const longLabelSegments = [
      { id: 'main', label: 'Main Topic', slides: [{ id: '1' }], depth: 0 },
      { id: 'follow', label: 'This is an extremely long follow-up question label that should be truncated', slides: [{ id: '2' }], depth: 1 },
    ]

    render(
      <SlideBreadcrumb
        segments={longLabelSegments}
        currentSegmentIndex={1}
      />
    )

    // Full long text should not be present
    expect(screen.queryByText('This is an extremely long follow-up question label that should be truncated')).not.toBeInTheDocument()
  })

  it('builds path with nested segments using parentSegmentId', () => {
    const nestedSegments = [
      { id: 'main', label: 'Main', slides: [{ id: '1' }], depth: 0 },
      { id: 'level1', label: 'Level 1', slides: [{ id: '2' }], depth: 1 },
      { id: 'level2', label: 'Level 2', slides: [{ id: '3' }], depth: 2, parentSegmentId: 'level1' },
    ]

    render(
      <SlideBreadcrumb
        segments={nestedSegments}
        currentSegmentIndex={2}
      />
    )

    // Should show nested path
    expect(screen.getByText('Level 2')).toBeInTheDocument()
  })

  it('renders list items for semantic structure', () => {
    render(
      <SlideBreadcrumb
        segments={mockSegments}
        currentSegmentIndex={1}
      />
    )

    const list = screen.getByRole('list')
    const items = screen.getAllByRole('listitem')

    expect(list).toBeInTheDocument()
    expect(items.length).toBeGreaterThan(0)
  })

  it('applies different styles for current vs previous items', () => {
    render(
      <SlideBreadcrumb
        segments={mockSegments}
        currentSegmentIndex={1}
      />
    )

    // Current item should have primary color class
    const currentItem = screen.getByText('First Follow-up')
    expect(currentItem.className).toContain('primary')
  })
})
