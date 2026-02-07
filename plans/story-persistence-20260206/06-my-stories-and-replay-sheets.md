# Feature: MyStoriesSheet + StoryReplaySheet UI

**ID:** 06
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Medium
**Dependencies:** None (can be built independently, wired in Feature 07)
**Track:** C

## Description

Create two new UI components:
1. `MyStoriesSheet` — bottom sheet with grid of saved story cards
2. `StoryReplaySheet` — full-screen replay view reusing `StoryPlayback`

## Acceptance Criteria

- [ ] MyStoriesSheet renders grid of story cards from `stories` prop
- [ ] Each card shows: first scene thumbnail, topic name, date, concept count
- [ ] Tap card opens StoryReplaySheet
- [ ] Delete button on each card (with confirmation)
- [ ] Empty state: "Complete Story Studio to save your first story!"
- [ ] StoryReplaySheet renders StoryPlayback in read-only mode
- [ ] StoryReplaySheet has close + delete buttons
- [ ] Both components follow existing bottom sheet patterns in codebase

## Implementation Details

### Files to Create

- `frontend/src/components/ProgressTab/MyStoriesSheet.jsx` - NEW
- `frontend/src/components/ProgressTab/StoryReplaySheet.jsx` - NEW

### MyStoriesSheet Props

```js
{
  stories: [],           // metadata array from useStoryStorage
  onSelectStory: (id) => {},  // opens replay
  onDeleteStory: (id) => {},  // delete with confirmation
  onClose: () => {},
}
```

### StoryReplaySheet Props

```js
{
  story: {},             // full story content (loaded via loadStoryContent)
  onClose: () => {},
  onDelete: (id) => {},
}
```

### UI Pattern Reference

- Follow `StatDetailSheet.jsx` and `SuggestedTopicSheet.jsx` for bottom sheet styling
- Reuse `StoryPlayback` component for replay rendering
- Grid: 2 columns on mobile, cards with rounded corners and shadow

### Card Design

```
┌──────────────────┐
│  [Scene Image]   │
│                  │
│  Topic Name      │
│  Feb 6 · 3/4 ✨  │
│          [🗑️]    │
└──────────────────┘
```

## Dependencies

### Depends On
- None (receives data via props)

### Blocks
- **Feature 07:** ProgressTab wires these sheets

## Notes

- StoryReplaySheet needs to call `loadStoryContent(id)` to get full scenes — this will be wired in Feature 07
- Keep components prop-driven; no direct hook usage (that happens in the parent)

---

**Created:** 2026-02-06
