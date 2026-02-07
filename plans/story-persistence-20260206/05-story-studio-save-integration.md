# Feature: StoryStudio Save Integration

**ID:** 05
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** 04
**Track:** C

## Description

Modify `StoryStudio.jsx` to auto-save the completed story when user reaches the Share screen.

## Acceptance Criteria

- [ ] `useStoryStorage` hook imported and called
- [ ] Story document built from `playbackScenes`, `state.conceptsFound`, `state.storySetup`
- [ ] `saveStory()` called in `handleShowShare` before dispatching SHOW_SHARE
- [ ] Save is non-blocking (no await, no loading indicator)
- [ ] No UI changes — save is transparent to user

## Implementation Details

### Files to Modify

- `frontend/src/components/LearnModes/Story/StoryStudio.jsx` - MODIFY

### Changes

1. Add import: `import useStoryStorage from '../../../hooks/useStoryStorage'`
2. In component body: `const { saveStory } = useStoryStorage()`
3. Modify `handleShowShare`:

```js
const handleShowShare = useCallback(() => {
  // Build and save story document (non-blocking)
  const xpEarned = calculateXP(
    state.conceptsFound.length,
    state.storySetup?.conceptChecklist?.length || 0,
  )
  const storyDoc = {
    id: crypto.randomUUID(),
    topicName,
    createdAt: Date.now(),
    scenes: playbackScenes,
    conceptsFound: state.conceptsFound,
    totalConcepts: state.storySetup?.conceptChecklist?.length || 0,
    xpEarned,
    storySetup: {
      storyPrompt: state.storySetup?.storyPrompt || '',
      conceptChecklist: state.storySetup?.conceptChecklist || [],
      imageStyle: state.storySetup?.imageStyle || '',
    },
    version: 1,
  }
  saveStory(storyDoc)

  dispatch({ type: ACTION.SHOW_SHARE })
}, [state, topicName, playbackScenes, saveStory])
```

## Dependencies

### Depends On
- **Feature 04:** useStoryStorage hook

### Blocks
- None

## Notes

- `playbackScenes` memo already computes the exact scene shape we need
- XP calculation reuses existing `calculateXP` helper
- `crypto.randomUUID()` is available in all modern browsers

---

**Created:** 2026-02-06
