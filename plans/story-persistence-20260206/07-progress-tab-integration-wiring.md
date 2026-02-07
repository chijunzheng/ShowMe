# Feature: ProgressTab Integration Wiring

**ID:** 07
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** 04, 06
**Track:** C

## Description

Wire `useStoryStorage` hook into ProgressTab and StatDetailSheet so users can browse and replay saved stories.

## Acceptance Criteria

- [ ] ProgressTab imports and calls `useStoryStorage`
- [ ] Story count stat displayed in StatsBar
- [ ] Tapping stories stat opens StatDetailSheet with `type='stories'`
- [ ] StatDetailSheet renders `MyStoriesSheet` for `'stories'` case
- [ ] Story selection loads full content and opens StoryReplaySheet
- [ ] Delete from either sheet updates state and localStorage

## Implementation Details

### Files to Modify

- `frontend/src/components/ProgressTab/ProgressTab.jsx` - MODIFY
- `frontend/src/components/Dashboard/StatDetailSheet.jsx` - MODIFY

### ProgressTab.jsx Changes

1. Import: `import useStoryStorage from '../../hooks/useStoryStorage'`
2. Call hook: `const { stories, deleteStory, loadStoryContent } = useStoryStorage()`
3. Pass `storyCount={stories.length}` to stats display
4. Pass `stories`, `deleteStory`, `loadStoryContent` to StatDetailSheet

### StatDetailSheet.jsx Changes

1. Import: `import MyStoriesSheet from '../ProgressTab/MyStoriesSheet'`
2. Import: `import StoryReplaySheet from '../ProgressTab/StoryReplaySheet'`
3. Add `'stories'` case in the switch/conditional rendering:

```jsx
case 'stories':
  return (
    <MyStoriesSheet
      stories={stories}
      onSelectStory={handleSelectStory}
      onDeleteStory={handleDeleteStory}
      onClose={onClose}
    />
  )
```

4. Add local state for selected story replay
5. When a story is selected, call `loadStoryContent(id)` and render `StoryReplaySheet`

## Dependencies

### Depends On
- **Feature 04:** useStoryStorage hook
- **Feature 06:** MyStoriesSheet + StoryReplaySheet components

### Blocks
- None (final integration feature)

## Notes

- Check how StatsBar currently renders stat cards — may need to add a stories stat entry
- StatDetailSheet pattern: it receives a `type` prop and renders the appropriate detail view

---

**Created:** 2026-02-06
