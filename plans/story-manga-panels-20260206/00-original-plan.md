# Story Studio: Manga/Comic Panel Format

## Problem
Story mode generates 3 slides with single images + narrative text. Stories feel underwhelming — not enough visual beats to tell a compelling kids' story.

## Solution
Convert each slide into a **4-panel manga/comic page** via prompt engineering. This gives 12 sequential story beats across 3 pages — enough for a proper beginning-middle-end arc.

**Approach: Single 4-panel AI image** (not 4 separate images)
- Same number of API calls (3 images total)
- No generation time increase (~5-10s per image, same as now)
- Gemini 3 Pro Image handles multi-panel layouts well with proper prompting
- Panel captions overlaid via CSS (not baked into the AI image)

---

## Changes

### 1. Backend: Update `generateStoryChapter()` prompt
**File:** `backend/src/services/gemini.js` (~line 3469-3626)

- Update the Gemini prompt to request **4 sequential story beats** per chapter instead of 1 scene
- Add `panelCaptions` (array of 4 strings) to the JSON response schema
- The `imagePrompt` now describes a 2x2 manga grid layout
- Keep `sceneDescription` for backward compatibility

New JSON schema returned by Gemini:
```json
{
  "illustration": {
    "imagePrompt": "4-panel manga page: [Panel 1] ... [Panel 2] ... [Panel 3] ... [Panel 4] ...",
    "sceneDescription": "Overall page summary",
    "panelCaptions": [
      "Panel 1 caption (1 sentence)",
      "Panel 2 caption (1 sentence)",
      "Panel 3 caption (1 sentence)",
      "Panel 4 caption (1 sentence)"
    ]
  }
}
```

### 2. Backend: Update `generateEducationalImage()` prompt
**File:** `backend/src/services/gemini.js` (~line 508-578)

- Detect manga/comic mode via an `options.comicPanel` flag
- When enabled, append manga-specific style instructions to the prompt:
  - 2x2 grid, clear panel borders, sequential storytelling
  - No text in panels (captions added via CSS)
  - Landscape aspect ratio

### 3. Backend: Pass `panelCaptions` through API
**File:** `backend/src/routes/learn.js` (~line 879)

- Pass `panelCaptions` array from `generateStoryChapter()` result through to the API response
- Pass `comicPanel: true` option to `generateEducationalImage()` for story illustrations

### 4. Frontend: Update state to carry `panelCaptions`
**File:** `frontend/src/components/LearnModes/Story/StoryStudio.jsx`

- Add `panelCaptions` to the illustration object (~line 635)
- Add `panelCaptions` to playback scenes builder (~line 713)

### 5. Frontend: Create `ComicPage` component
**New file:** `frontend/src/components/LearnModes/Story/ComicPage.jsx`

- Renders the 4-panel manga image with caption overlays
- Caption overlays positioned in each quadrant (bottom of each panel)
- Styled with comic-book borders, chapter title badge
- Falls back to single-image display when `panelCaptions` is missing (backward compat)

### 6. Frontend: Update `StoryPlayback.jsx`
**File:** `frontend/src/components/LearnModes/Story/StoryPlayback.jsx`

- Replace the single image render with `ComicPage` component
- Keep existing navigation (prev/next, progress dots)
- Replace the raw choice text with the 4 panel captions joined as narrative text
- Display as numbered story beats

### 7. TTS: Narrate panel captions sequentially
**File:** `frontend/src/components/LearnModes/Story/useStoryNarration.js`

- Add `narratePanels(captions, chapterId)` function
- Reads all 4 captions sequentially with brief pauses between panels
- Optional "Read Aloud" button on playback

---

## Backward Compatibility
- `panelCaptions` is optional — old stored stories without it render as single images
- `sceneDescription` field is preserved
- Storage schema bumps to v2 but v1 stories still display correctly

## Files to Modify
1. `backend/src/services/gemini.js` — `generateStoryChapter()` prompt + `generateEducationalImage()` comic mode
2. `backend/src/routes/learn.js` — pass `panelCaptions` + `comicPanel` flag
3. `frontend/src/components/LearnModes/Story/StoryStudio.jsx` — state model
4. `frontend/src/components/LearnModes/Story/StoryPlayback.jsx` — use `ComicPage`
5. `frontend/src/components/LearnModes/Story/ComicPage.jsx` — **new** component
6. `frontend/src/components/LearnModes/Story/useStoryNarration.js` — `narratePanels()`

## Verification
1. Generate a story, verify each slide shows a 4-panel manga layout
2. Verify panel captions display correctly over each quadrant
3. Verify TTS reads all 4 panels in order
4. Load an old saved story — verify it still renders as single image
5. Test on mobile — verify captions are readable on small screens
