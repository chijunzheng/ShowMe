# Feature: StoryStudio Batch UX Flow

**ID:** 03
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 01, 02

## Description

Refactor StoryStudio state machine to collect all answers first, then call finalize once and render playback from finalized scenes.

## Acceptance Criteria

- [ ] State flow is `LOADING -> INTRO -> CHAPTER_1 -> CHAPTER_2 -> CHAPTER_3 -> FINALIZING -> PLAYBACK -> SHARE`
- [ ] No per-question chapter API calls in new path
- [ ] One single loader is shown during final generation
- [ ] Playback consumes `scenes` returned by finalize API
- [ ] Existing manga playback (`ComicPage`, `panelCaptions`, `narratePanels`) remains functional

## Files to Modify

- `frontend/src/components/LearnModes/Story/StoryStudio.jsx`
- `frontend/src/components/LearnModes/Story/StoryPlayback.jsx` (only integration adjustments if needed)
- `frontend/src/components/LearnModes/Story/useStoryNarration.js` (no behavioral regression)

