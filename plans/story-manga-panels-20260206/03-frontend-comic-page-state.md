# Feature: Frontend ComicPage Component + StoryStudio State

**ID:** 03
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 02

## Description

Create the `ComicPage` component for rendering 4-panel manga pages with CSS caption overlays, and update StoryStudio state to carry `panelCaptions` through illustrations and playback scenes.

## Acceptance Criteria

- [ ] New `ComicPage.jsx` component renders image with 4 caption overlays
- [ ] Captions positioned in each quadrant (bottom of each panel)
- [ ] Comic-style borders and chapter title badge
- [ ] Falls back to single-image display when panelCaptions is missing/empty
- [ ] StoryStudio passes panelCaptions to illustration object
- [ ] Playback scenes include panelCaptions

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/Story/ComicPage.jsx`

### Files to Modify

- `frontend/src/components/LearnModes/Story/StoryStudio.jsx`

### ComicPage Component Design

Props:
- `imageUrl` (string) — the 4-panel manga image
- `panelCaptions` (array of 4 strings) — captions for each quadrant
- `chapterTitle` (string) — chapter badge text
- `sceneDescription` (string) — alt text fallback

Layout:
- Relative container with aspect-video ratio
- Image fills container
- 4 absolute-positioned caption overlays (2x2 grid):
  - Top-left panel caption (top: 0, left: 0, width: 50%, bottom: 50%)
  - Top-right panel caption (top: 0, left: 50%, width: 50%, bottom: 50%)
  - Bottom-left panel caption (top: 50%, left: 0, width: 50%)
  - Bottom-right panel caption (top: 50%, left: 50%, width: 50%)
- Each caption: positioned at bottom of its quadrant, semi-transparent dark bg, white text
- Chapter title badge: absolute top-left corner

Backward compat: If panelCaptions is missing/empty, render as plain image (same as current)

### StoryStudio State Changes

1. **Illustration object** (~line 635):
```js
const illustration = {
  imageUrl: data.illustration?.imageUrl || null,
  sceneDescription: data.illustration?.sceneDescription || '',
  panelCaptions: data.illustration?.panelCaptions || [],  // NEW
  chapterTitle: `Chapter ${currentChapterNum}: ${getChapterLabel(currentChapterNum)}`,
}
```

2. **Playback scenes** (~line 713):
```js
const playbackScenes = useMemo(() => {
  return state.illustrations.map((illustration, index) => ({
    imageUrl: illustration.imageUrl,
    sceneDescription: illustration.sceneDescription,
    panelCaptions: illustration.panelCaptions || [],  // NEW
    narrativeText: state.selections[index]?.selectedText || '',
    chapterTitle: illustration.chapterTitle,
  }))
}, [state.illustrations, state.selections])
```

## Testing Requirements

- [ ] ComicPage renders 4 captions when panelCaptions has 4 items
- [ ] ComicPage renders single image when panelCaptions is empty/missing
- [ ] Mobile: captions readable on small screens

## Implementation Checklist

- [ ] Create ComicPage.jsx
- [ ] Update StoryStudio illustration object
- [ ] Update playback scenes builder
- [ ] Code review

---

**Created:** 2026-02-06
