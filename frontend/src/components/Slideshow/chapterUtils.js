/**
 * Chapter Utilities for Slideshow Navigation
 *
 * Helper functions for building and navigating slide segments (chapters).
 * Each segment represents a topic or follow-up in the learning journey.
 */

/**
 * @typedef {Object} SlideSegment
 * @property {string} id - Unique identifier for the segment
 * @property {string} label - Display label ("Main" or follow-up question text)
 * @property {Array} slides - Slides in this segment
 * @property {string|undefined} parentSegmentId - ID of parent segment for nesting
 * @property {number} depth - Nesting depth (0 = main, 1 = follow-up, 2 = nested)
 */

/**
 * @typedef {Object} SegmentPosition
 * @property {number} segmentIndex - Index of the segment
 * @property {number} slideInSegment - Index of the slide within the segment
 */

/**
 * @typedef {Object} BreadcrumbItem
 * @property {string} label - Display label for the breadcrumb
 * @property {number} segmentIndex - Segment index this breadcrumb points to
 */

/**
 * Build segments from slides array.
 * Groups slides by topicId/followUpId into segments.
 *
 * @param {Array} slides - Array of slide objects
 * @param {string} topicName - Name of the main topic
 * @returns {SlideSegment[]} Array of slide segments
 */
export function buildSegmentsFromSlides(slides, topicName) {
  if (!slides || slides.length === 0) {
    return []
  }

  const segmentMap = new Map()

  // First pass: identify unique segments and their properties
  slides.forEach((slide) => {
    const segmentId = slide.followUpId || slide.topicId || 'main'
    const parentId = slide.parentSegmentId || null
    const depth = slide.depth || (slide.followUpId ? 1 : 0)

    if (!segmentMap.has(segmentId)) {
      segmentMap.set(segmentId, {
        id: segmentId,
        label: slide.followUpQuestion || (segmentId === 'main' ? 'Main' : topicName || 'Main'),
        slides: [],
        parentSegmentId: parentId,
        depth: depth,
      })
    }

    segmentMap.get(segmentId).slides.push(slide)
  })

  // Convert map to array and sort by depth, then by first slide order
  const segmentArray = Array.from(segmentMap.values())

  // Sort segments: main first, then by depth and appearance order
  segmentArray.sort((a, b) => {
    // Main topic always first
    if (a.id === 'main' || a.depth === 0) return -1
    if (b.id === 'main' || b.depth === 0) return 1

    // Sort by depth
    if (a.depth !== b.depth) {
      return a.depth - b.depth
    }

    // Same depth: sort by first slide index in original array
    const aFirstIndex = slides.findIndex((s) => (s.followUpId || s.topicId || 'main') === a.id)
    const bFirstIndex = slides.findIndex((s) => (s.followUpId || s.topicId || 'main') === b.id)
    return aFirstIndex - bFirstIndex
  })

  return segmentArray
}

/**
 * Find segment index for a given absolute slide index.
 *
 * @param {SlideSegment[]} segments - Array of segments
 * @param {number} slideIndex - Absolute slide index (0-based)
 * @returns {SegmentPosition} Object with segmentIndex and slideInSegment
 */
export function findSegmentForSlide(segments, slideIndex) {
  if (!segments || segments.length === 0) {
    return { segmentIndex: 0, slideInSegment: 0 }
  }

  let runningIndex = 0

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const segmentSize = segment.slides.length

    if (slideIndex < runningIndex + segmentSize) {
      return {
        segmentIndex: i,
        slideInSegment: slideIndex - runningIndex,
      }
    }

    runningIndex += segmentSize
  }

  // If slide index is out of bounds, return last position
  const lastSegmentIndex = segments.length - 1
  const lastSegment = segments[lastSegmentIndex]
  return {
    segmentIndex: lastSegmentIndex,
    slideInSegment: Math.max(0, lastSegment.slides.length - 1),
  }
}

/**
 * Get total slide count across all segments.
 *
 * @param {SlideSegment[]} segments - Array of segments
 * @returns {number} Total number of slides
 */
export function getTotalSlideCount(segments) {
  if (!segments || segments.length === 0) {
    return 0
  }

  return segments.reduce((sum, segment) => sum + segment.slides.length, 0)
}

/**
 * Get absolute slide index from segment + slide position.
 *
 * @param {SlideSegment[]} segments - Array of segments
 * @param {number} segmentIndex - Index of the segment
 * @param {number} slideInSegment - Index of slide within segment
 * @returns {number} Absolute slide index
 */
export function getAbsoluteSlideIndex(segments, segmentIndex, slideInSegment) {
  if (!segments || segments.length === 0) {
    return 0
  }

  // Clamp segment index
  const safeSegmentIndex = Math.max(0, Math.min(segmentIndex, segments.length - 1))

  let index = 0
  for (let i = 0; i < safeSegmentIndex; i++) {
    index += segments[i].slides.length
  }

  // Clamp slide in segment
  const segment = segments[safeSegmentIndex]
  const safeSlideInSegment = Math.max(0, Math.min(slideInSegment, segment.slides.length - 1))

  return index + safeSlideInSegment
}

/**
 * Build breadcrumb path from segments to current position.
 * Returns an array of breadcrumb items from root to current segment.
 *
 * @param {SlideSegment[]} segments - Array of segments
 * @param {number} currentSegmentIndex - Index of current segment
 * @returns {BreadcrumbItem[]} Array of breadcrumb items
 */
export function buildBreadcrumbPath(segments, currentSegmentIndex) {
  if (!segments || segments.length === 0) {
    return []
  }

  const safeIndex = Math.max(0, Math.min(currentSegmentIndex, segments.length - 1))
  const currentSegment = segments[safeIndex]
  const path = []

  // Build path by traversing parent chain
  const visited = new Set()
  let segment = currentSegment

  while (segment && !visited.has(segment.id)) {
    visited.add(segment.id)

    // Find segment index for this segment
    const segIndex = segments.findIndex((s) => s.id === segment.id)

    path.unshift({
      label: segment.label,
      segmentIndex: segIndex >= 0 ? segIndex : safeIndex,
    })

    // Find parent segment
    if (segment.parentSegmentId) {
      segment = segments.find((s) => s.id === segment.parentSegmentId)
    } else {
      segment = null
    }
  }

  // If path doesn't start with main (depth 0), add it
  if (path.length > 0 && segments[0] && path[0].segmentIndex !== 0) {
    path.unshift({
      label: segments[0].label,
      segmentIndex: 0,
    })
  }

  return path
}

/**
 * Get the first slide index of a segment.
 *
 * @param {SlideSegment[]} segments - Array of segments
 * @param {number} segmentIndex - Index of the segment
 * @returns {number} Absolute index of the first slide in the segment
 */
export function getSegmentFirstSlideIndex(segments, segmentIndex) {
  return getAbsoluteSlideIndex(segments, segmentIndex, 0)
}

/**
 * Check if a segment is complete (all slides viewed).
 *
 * @param {SlideSegment[]} segments - Array of segments
 * @param {number} segmentIndex - Index of the segment to check
 * @param {number} currentSegmentIndex - Currently active segment index
 * @param {number} currentSlideInSegment - Current slide within segment
 * @returns {boolean} True if segment is complete
 */
export function isSegmentComplete(segments, segmentIndex, currentSegmentIndex, currentSlideInSegment) {
  if (!segments || segmentIndex >= segments.length) {
    return false
  }

  // Segments before current are complete
  if (segmentIndex < currentSegmentIndex) {
    return true
  }

  // Current segment is complete if at the last slide
  if (segmentIndex === currentSegmentIndex) {
    const segment = segments[segmentIndex]
    return currentSlideInSegment >= segment.slides.length - 1
  }

  // Future segments are not complete
  return false
}

/**
 * Truncate a label to fit within a max length.
 *
 * @param {string} label - Label to truncate
 * @param {number} maxLength - Maximum length (default: 20)
 * @returns {string} Truncated label with ellipsis if needed
 */
export function truncateLabel(label, maxLength = 20) {
  if (!label || label.length <= maxLength) {
    return label || ''
  }

  return `${label.slice(0, maxLength - 1)}\u2026`
}
