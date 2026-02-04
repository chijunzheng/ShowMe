/**
 * Tests for chapter utility functions
 */
import { describe, it, expect } from 'vitest'
import {
  buildSegmentsFromSlides,
  findSegmentForSlide,
  getTotalSlideCount,
  getAbsoluteSlideIndex,
  buildBreadcrumbPath,
  getSegmentFirstSlideIndex,
  isSegmentComplete,
  truncateLabel,
} from '../chapterUtils'

describe('chapterUtils', () => {
  describe('buildSegmentsFromSlides', () => {
    it('returns empty array for empty slides', () => {
      expect(buildSegmentsFromSlides([], 'Topic')).toEqual([])
      expect(buildSegmentsFromSlides(null, 'Topic')).toEqual([])
      expect(buildSegmentsFromSlides(undefined, 'Topic')).toEqual([])
    })

    it('creates a single segment for main topic slides', () => {
      const slides = [
        { id: '1', topicId: 'main' },
        { id: '2', topicId: 'main' },
        { id: '3', topicId: 'main' },
      ]

      const segments = buildSegmentsFromSlides(slides, 'Test Topic')

      expect(segments).toHaveLength(1)
      expect(segments[0].id).toBe('main')
      expect(segments[0].label).toBe('Main')
      expect(segments[0].slides).toHaveLength(3)
      expect(segments[0].depth).toBe(0)
    })

    it('creates separate segments for follow-ups', () => {
      const slides = [
        { id: '1', topicId: 'main' },
        { id: '2', topicId: 'main' },
        { id: '3', followUpId: 'follow1', followUpQuestion: 'What is X?' },
        { id: '4', followUpId: 'follow1', followUpQuestion: 'What is X?' },
      ]

      const segments = buildSegmentsFromSlides(slides, 'Test Topic')

      expect(segments).toHaveLength(2)
      expect(segments[0].id).toBe('main')
      expect(segments[0].slides).toHaveLength(2)
      expect(segments[1].id).toBe('follow1')
      expect(segments[1].label).toBe('What is X?')
      expect(segments[1].slides).toHaveLength(2)
      expect(segments[1].depth).toBe(1)
    })

    it('handles nested follow-ups with depth', () => {
      const slides = [
        { id: '1', topicId: 'main', depth: 0 },
        { id: '2', followUpId: 'follow1', depth: 1 },
        { id: '3', followUpId: 'follow2', depth: 2, parentSegmentId: 'follow1' },
      ]

      const segments = buildSegmentsFromSlides(slides, 'Topic')

      expect(segments).toHaveLength(3)
      expect(segments[0].depth).toBe(0)
      expect(segments[1].depth).toBe(1)
      expect(segments[2].depth).toBe(2)
      expect(segments[2].parentSegmentId).toBe('follow1')
    })
  })

  describe('findSegmentForSlide', () => {
    const segments = [
      { id: 'main', slides: [{ id: '1' }, { id: '2' }] },
      { id: 'follow1', slides: [{ id: '3' }, { id: '4' }, { id: '5' }] },
      { id: 'follow2', slides: [{ id: '6' }] },
    ]

    it('returns correct position for first segment', () => {
      expect(findSegmentForSlide(segments, 0)).toEqual({
        segmentIndex: 0,
        slideInSegment: 0,
      })
      expect(findSegmentForSlide(segments, 1)).toEqual({
        segmentIndex: 0,
        slideInSegment: 1,
      })
    })

    it('returns correct position for middle segment', () => {
      expect(findSegmentForSlide(segments, 2)).toEqual({
        segmentIndex: 1,
        slideInSegment: 0,
      })
      expect(findSegmentForSlide(segments, 4)).toEqual({
        segmentIndex: 1,
        slideInSegment: 2,
      })
    })

    it('returns correct position for last segment', () => {
      expect(findSegmentForSlide(segments, 5)).toEqual({
        segmentIndex: 2,
        slideInSegment: 0,
      })
    })

    it('handles out of bounds by returning last position', () => {
      const result = findSegmentForSlide(segments, 100)
      expect(result.segmentIndex).toBe(2)
      expect(result.slideInSegment).toBe(0)
    })

    it('handles empty segments array', () => {
      expect(findSegmentForSlide([], 0)).toEqual({
        segmentIndex: 0,
        slideInSegment: 0,
      })
    })
  })

  describe('getTotalSlideCount', () => {
    it('returns 0 for empty segments', () => {
      expect(getTotalSlideCount([])).toBe(0)
      expect(getTotalSlideCount(null)).toBe(0)
    })

    it('sums slides across all segments', () => {
      const segments = [
        { slides: [{ id: '1' }, { id: '2' }] },
        { slides: [{ id: '3' }] },
        { slides: [{ id: '4' }, { id: '5' }, { id: '6' }] },
      ]

      expect(getTotalSlideCount(segments)).toBe(6)
    })
  })

  describe('getAbsoluteSlideIndex', () => {
    const segments = [
      { id: 'main', slides: [{ id: '1' }, { id: '2' }] },
      { id: 'follow1', slides: [{ id: '3' }, { id: '4' }] },
      { id: 'follow2', slides: [{ id: '5' }] },
    ]

    it('returns correct index for first segment', () => {
      expect(getAbsoluteSlideIndex(segments, 0, 0)).toBe(0)
      expect(getAbsoluteSlideIndex(segments, 0, 1)).toBe(1)
    })

    it('returns correct index for middle segment', () => {
      expect(getAbsoluteSlideIndex(segments, 1, 0)).toBe(2)
      expect(getAbsoluteSlideIndex(segments, 1, 1)).toBe(3)
    })

    it('returns correct index for last segment', () => {
      expect(getAbsoluteSlideIndex(segments, 2, 0)).toBe(4)
    })

    it('handles out of bounds segment index', () => {
      expect(getAbsoluteSlideIndex(segments, 100, 0)).toBe(4)
    })

    it('handles out of bounds slide index', () => {
      expect(getAbsoluteSlideIndex(segments, 0, 100)).toBe(1)
    })

    it('handles empty segments', () => {
      expect(getAbsoluteSlideIndex([], 0, 0)).toBe(0)
    })
  })

  describe('buildBreadcrumbPath', () => {
    it('returns empty array for empty segments', () => {
      expect(buildBreadcrumbPath([], 0)).toEqual([])
    })

    it('returns path for main segment', () => {
      const segments = [
        { id: 'main', label: 'Main', depth: 0, slides: [] },
      ]

      const path = buildBreadcrumbPath(segments, 0)

      // Single item breadcrumb is filtered out in the component
      expect(path.length).toBeGreaterThanOrEqual(1)
      expect(path[0].label).toBe('Main')
    })

    it('builds path through parent chain', () => {
      const segments = [
        { id: 'main', label: 'Main', depth: 0, slides: [] },
        { id: 'follow1', label: 'Follow-up 1', depth: 1, parentSegmentId: null, slides: [] },
      ]

      const path = buildBreadcrumbPath(segments, 1)

      expect(path.length).toBeGreaterThanOrEqual(1)
      expect(path[path.length - 1].label).toBe('Follow-up 1')
    })

    it('handles nested segments with parentSegmentId', () => {
      const segments = [
        { id: 'main', label: 'Main', depth: 0, slides: [] },
        { id: 'follow1', label: 'Follow 1', depth: 1, slides: [] },
        { id: 'nested', label: 'Nested', depth: 2, parentSegmentId: 'follow1', slides: [] },
      ]

      const path = buildBreadcrumbPath(segments, 2)

      expect(path.length).toBeGreaterThanOrEqual(2)
      expect(path[path.length - 1].label).toBe('Nested')
    })
  })

  describe('getSegmentFirstSlideIndex', () => {
    const segments = [
      { slides: [{ id: '1' }, { id: '2' }] },
      { slides: [{ id: '3' }] },
    ]

    it('returns 0 for first segment', () => {
      expect(getSegmentFirstSlideIndex(segments, 0)).toBe(0)
    })

    it('returns correct index for subsequent segments', () => {
      expect(getSegmentFirstSlideIndex(segments, 1)).toBe(2)
    })
  })

  describe('isSegmentComplete', () => {
    const segments = [
      { slides: [{ id: '1' }, { id: '2' }] },
      { slides: [{ id: '3' }, { id: '4' }] },
      { slides: [{ id: '5' }] },
    ]

    it('returns true for past segments', () => {
      expect(isSegmentComplete(segments, 0, 1, 0)).toBe(true)
      expect(isSegmentComplete(segments, 0, 2, 0)).toBe(true)
    })

    it('returns true for current segment at last slide', () => {
      expect(isSegmentComplete(segments, 0, 0, 1)).toBe(true)
      expect(isSegmentComplete(segments, 1, 1, 1)).toBe(true)
    })

    it('returns false for current segment not at last slide', () => {
      expect(isSegmentComplete(segments, 0, 0, 0)).toBe(false)
      expect(isSegmentComplete(segments, 1, 1, 0)).toBe(false)
    })

    it('returns false for future segments', () => {
      expect(isSegmentComplete(segments, 2, 0, 0)).toBe(false)
      expect(isSegmentComplete(segments, 1, 0, 0)).toBe(false)
    })
  })

  describe('truncateLabel', () => {
    it('returns original label if shorter than max', () => {
      expect(truncateLabel('Short', 20)).toBe('Short')
    })

    it('returns original label if equal to max', () => {
      expect(truncateLabel('12345678901234567890', 20)).toBe('12345678901234567890')
    })

    it('truncates with ellipsis if longer than max', () => {
      const result = truncateLabel('This is a very long label that needs truncation', 20)
      expect(result.length).toBe(20)
      expect(result.endsWith('\u2026')).toBe(true)
    })

    it('handles empty string', () => {
      expect(truncateLabel('', 20)).toBe('')
    })

    it('handles null/undefined', () => {
      expect(truncateLabel(null, 20)).toBe('')
      expect(truncateLabel(undefined, 20)).toBe('')
    })

    it('uses default max length of 20', () => {
      const result = truncateLabel('This is a very long label that exceeds default')
      expect(result.length).toBe(20)
    })
  })
})
