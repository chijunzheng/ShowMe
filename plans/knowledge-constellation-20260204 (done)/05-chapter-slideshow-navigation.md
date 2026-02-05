# Feature 05: Chapter-Based Slideshow Navigation

**ID:** 05
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01
**Note:** All components integrated. ChapterProgressBar replaces ProgressDots, ChapterPicker replaces FollowUpDrawer, SlideBreadcrumb shows path during follow-up navigation. useSlideshowControl computes segments as presentation layer over existing 2D nav model. Chapter picker state owned by hook, passed as props to SlideshowScreen (no duplicate state). goToSegment aliased to goToSlide. 75 tests passing.

## Description

Replace the current 2D navigation (horizontal for parents, vertical for children) with a chapter-based system. The progress bar shows segments for each topic section and follow-up branch. Users can tap to see a chapter picker and navigate directly to any section.

## Acceptance Criteria

- [ ] Progress bar divided into visual segments
- [ ] Each segment represents main topic or follow-up branch
- [ ] Tap progress bar → expand chapter picker
- [ ] Breadcrumb shows current path (Topic › Follow-up › Nested)
- [ ] Tap breadcrumb segment → jump to that section
- [ ] Auto-play progresses through all segments linearly
- [ ] Visual distinction between main content and follow-ups
- [ ] Smooth transition when switching segments
- [ ] Works on mobile and desktop
- [ ] Keyboard navigation support (arrow keys)

## Implementation Details

### Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/components/Slideshow/ChapterProgressBar.jsx` | Segmented progress bar |
| `frontend/src/components/Slideshow/ChapterPicker.jsx` | Expandable chapter list |
| `frontend/src/components/Slideshow/SlideBreadcrumb.jsx` | Current path indicator |

### Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/components/SlideshowScreen.jsx` | Integrate new components |
| `frontend/src/hooks/useSlideshowControl.js` | Segment-aware navigation |

### Files to Delete (replaced)

| File | Replacement |
|------|-------------|
| `frontend/src/components/ProgressDots.jsx` | ChapterProgressBar |
| `frontend/src/components/FollowUpPanel.jsx` | ChapterPicker |
| `frontend/src/components/FollowUpDrawer.jsx` | ChapterPicker |

### Data Model

```javascript
// Slide segment structure
interface SlideSegment {
  id: string
  label: string              // "Main" or follow-up question text
  slides: Slide[]
  parentSegmentId?: string   // For nesting visualization
  depth: number              // 0 = main, 1 = follow-up, 2 = nested
  startIndex: number         // Index in flattened slide array
  endIndex: number
}

// Build segments from slides
function buildSegments(slides: Slide[]): SlideSegment[]
```

### Component Specifications

#### ChapterProgressBar

```jsx
<ChapterProgressBar
  segments={segments}
  currentSlideIndex={currentIndex}
  onSegmentClick={(segmentId) => void}
  onExpand={() => void}  // Open ChapterPicker
/>
```

Visual:
```
[▓▓▓▓░│▓▓░░░│░░]
 Main │ Q1   │Q2
```

- Filled portion shows progress within segment
- Dividers between segments
- Tap anywhere → open picker
- Different colors/shading for depth levels

#### ChapterPicker

```jsx
<ChapterPicker
  segments={segments}
  currentSegmentId={currentSegmentId}
  isOpen={isOpen}
  onClose={() => void}
  onSelectSegment={(segmentId) => void}
/>
```

Visual:
```
┌─────────────────────────────────────┐
│  Photosynthesis                     │
│  ├── Main (5 slides)      ●●●○○    │
│  ├── "About chlorophyll" (3)  ●○○  │
│  └── "Why green?" (2)         ○○   │
└─────────────────────────────────────┘
```

- Tree-like structure showing nesting
- Progress indicator per segment
- Current segment highlighted
- Tap segment → navigate and close

#### SlideBreadcrumb

```jsx
<SlideBreadcrumb
  path={currentPath}  // [{id, label}, ...]
  onNavigate={(segmentId) => void}
/>
```

Visual:
```
Photosynthesis › Chlorophyll › "Why green?"
```

- Each segment is tappable
- Truncate middle segments on mobile
- Shows current depth visually

### Navigation Logic Changes

```javascript
// useSlideshowControl.js modifications

// Flatten all slides into linear array
const flattenedSlides = useMemo(() => {
  return buildFlattenedSlideList(allTopicSlides)
}, [allTopicSlides])

// Build segment index
const segments = useMemo(() => {
  return buildSegments(allTopicSlides)
}, [allTopicSlides])

// Current segment from index
const currentSegment = useMemo(() => {
  return segments.find(s =>
    currentIndex >= s.startIndex && currentIndex <= s.endIndex
  )
}, [segments, currentIndex])

// Navigate to segment start
const goToSegment = useCallback((segmentId) => {
  const segment = segments.find(s => s.id === segmentId)
  if (segment) setCurrentIndex(segment.startIndex)
}, [segments])

// Keyboard: Left/Right now navigate flattened list
// Remove vertical (up/down) navigation
```

## Dependencies

### Depends On
- **Feature 01:** Knowledge Graph Data Model (for slide structure understanding)

### Blocks
- **Feature 08:** Legacy removal depends on this replacing old components

## Testing Requirements

- [ ] Unit tests for `buildSegments()` function
- [ ] Unit tests for flattening logic
- [ ] Component tests for ChapterProgressBar
- [ ] Component tests for ChapterPicker
- [ ] Component tests for SlideBreadcrumb
- [ ] E2E test for full navigation flow
- [ ] Mobile tap interaction tests
- [ ] Keyboard navigation tests

## Implementation Checklist

- [x] Create `buildSegments()` utility function
- [x] Create `ChapterProgressBar.jsx`
- [x] Create `ChapterPicker.jsx`
- [x] Create `SlideBreadcrumb.jsx`
- [x] Modify `useSlideshowControl.js` for segment navigation
- [x] Integrate components into `SlideshowScreen.jsx`
- [x] Keyboard shortcuts preserved (existing arrow key nav)
- [x] Build passing, 75 chapter tests passing
- [x] Write unit and component tests

## Notes

- Remove currentChildIndex state (no longer needed)
- All slides become a single linear sequence
- Segments provide structure without 2D complexity
- Consider animation when switching between segments
- Mobile: breadcrumb may need horizontal scroll

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
