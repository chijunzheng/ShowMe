# Feature: StoryPlayback Comic Display + TTS Panel Narration

**ID:** 04
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 03

## Description

Update StoryPlayback to use ComicPage for rendering, replace raw choice text with numbered panel captions as narrative, and add `narratePanels()` to useStoryNarration for sequential TTS of all 4 panel captions.

## Acceptance Criteria

- [ ] StoryPlayback renders ComicPage instead of plain image
- [ ] Narrative text shows numbered panel captions when available
- [ ] Falls back to old narrativeText when panelCaptions missing
- [ ] useStoryNarration has narratePanels(captions, chapterId) function
- [ ] narratePanels reads all 4 captions sequentially with pauses
- [ ] "Read Aloud" button on playback triggers narratePanels
- [ ] Old saved stories without panelCaptions still render correctly

## Implementation Details

### Files to Modify

- `frontend/src/components/LearnModes/Story/StoryPlayback.jsx`
- `frontend/src/components/LearnModes/Story/useStoryNarration.js`

### StoryPlayback Changes

1. **Import ComicPage** and replace the image section (~line 114-127):
```jsx
import ComicPage from './ComicPage'

// Replace the aspect-video image div with:
<ComicPage
  imageUrl={currentScene?.imageUrl}
  panelCaptions={currentScene?.panelCaptions}
  chapterTitle={currentScene?.chapterTitle}
  sceneDescription={currentScene?.sceneDescription}
/>
```

2. **Update narrative text** (~line 130-134):
- When panelCaptions exists and has items, display as numbered story beats:
  "1. Caption one  2. Caption two  3. Caption three  4. Caption four"
- Otherwise fall back to existing `narrativeText`

3. **Add Read Aloud button** near the navigation controls

### useStoryNarration Changes

Add `narratePanels(captions, chapterId)`:
- Takes array of caption strings and a chapterId for cache keys
- Calls `narrate()` sequentially for each caption
- 500ms pause between panels
- Cancellable via existing `stop()`
- Returns promise that resolves when all panels done or cancelled

Return `narratePanels` from the hook alongside existing exports.

## Testing Requirements

- [ ] Playback shows ComicPage with captions
- [ ] Playback shows plain image for old stories
- [ ] TTS reads all 4 panels in sequence
- [ ] Stopping mid-narration cancels remaining panels

## Implementation Checklist

- [ ] Update StoryPlayback to use ComicPage
- [ ] Update narrative text display
- [ ] Add Read Aloud button
- [ ] Add narratePanels to useStoryNarration
- [ ] Code review

---

**Created:** 2026-02-06
