# Feature: Backend Manga Prompts + Comic Image Mode

**ID:** 01
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Update `generateStoryChapter()` to request 4 sequential story beats per chapter with panel captions, and update `generateEducationalImage()` to support a `comicPanel` flag for manga-style 2x2 grid output.

## Acceptance Criteria

- [ ] `generateStoryChapter()` prompt requests 4 panel captions per chapter
- [ ] JSON schema includes `panelCaptions` array of 4 strings in `illustration`
- [ ] `imagePrompt` describes a 2x2 manga grid layout
- [ ] `sceneDescription` preserved for backward compat
- [ ] Chinese language prompt also updated with panelCaptions
- [ ] `generateEducationalImage()` accepts `options.comicPanel` flag
- [ ] When comicPanel=true, appends manga-specific style instructions (2x2 grid, clear borders, no text, landscape)
- [ ] When comicPanel=false/absent, behavior is unchanged

## Implementation Details

### Files to Modify

- `backend/src/services/gemini.js` — `generateStoryChapter()` (~line 3469-3626)
- `backend/src/services/gemini.js` — `generateEducationalImage()` (~line 508-578)

### Key Changes

**generateStoryChapter() prompt:**
- Add `panelCaptions` to the JSON schema in the prompt (array of 4 strings)
- Update imagePrompt instruction to say "4-panel manga page: [Panel 1] ... [Panel 2] ... [Panel 3] ... [Panel 4] ..."
- Add requirement: "panelCaptions should be 4 short sentences (one per panel) describing sequential story beats"
- Parse `panelCaptions` from response, default to empty array if missing

**generateEducationalImage() comic mode:**
- Destructure `comicPanel` from options
- When `comicPanel` is true, replace `enhancedPrompt` style section with:
  - "4-panel manga/comic page layout in a 2x2 grid"
  - "Clear panel borders separating each panel"
  - "Sequential storytelling left-to-right, top-to-bottom"
  - "NO text, speech bubbles, or captions in the image"
  - "Landscape/wide aspect ratio"

## Testing Requirements

- [ ] Verify generateStoryChapter returns panelCaptions array
- [ ] Verify generateEducationalImage with comicPanel=true produces different prompt
- [ ] Verify generateEducationalImage without comicPanel is unchanged

## Implementation Checklist

- [ ] Update generateStoryChapter prompt (EN)
- [ ] Update generateStoryChapter prompt (ZH)
- [ ] Parse panelCaptions from response
- [ ] Add comicPanel flag to generateEducationalImage
- [ ] Code review

---

**Created:** 2026-02-06
