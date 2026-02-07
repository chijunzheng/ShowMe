# Story Mode Batch Generation (Single Loading Screen)

## Summary
Convert Story mode from iterative per-question generation to a two-phase flow:
1. Ask all story questions first (no illustration wait between questions).
2. Generate the full 3-page manga story in one final batch behind a single loader.

This keeps interaction fast, reduces perceived latency, and preserves the manga panel format.

## Locked Decisions
1. Question format: Guided choices (3 options per question).
2. Generation mode: Final parallel batch generation (single loader).
3. Backward compatibility: Keep existing `/story/chapter` route as legacy fallback but stop using it from new UI flow.
4. Story length: Keep 3 chapters/pages, each page remains 4-panel manga style.

## Scope
1. In scope: StoryStudio state flow, new finalization API, batch image generation, playback wiring, tests.
2. Out of scope: Dev server changes, unrelated Learn modes, storage model redesign beyond additive fields.

## Public API / Interface Changes
### 1) Existing route update
`POST /api/learn/story` in `/Users/jasonchi/ShowMe/backend/src/routes/learn.js`

Return question sequence upfront in `questionFlow` with 3 chapter prompts and choices.

### 2) New route
`POST /api/learn/story/finalize` in `/Users/jasonchi/ShowMe/backend/src/routes/learn.js`

Request includes `topicName`, `conceptChecklist`, `imageStyle`, `answers[]`, optional `language`.

Response includes:
- `scenes[]` (3 chapters with `chapterTitle`, `narrativeText`, `sceneDescription`, `panelCaptions`, `imageUrl`)
- `conceptsFound[]`

### 3) New backend service function
Add `generateFinalStoryFromAnswers(...)` to `/Users/jasonchi/ShowMe/backend/src/services/gemini.js`.

Contract:
- Input: topic, checklist, answers, imageStyle, language.
- Output: structured `scenes[]` with manga `imagePrompt`, `panelCaptions`, `narrativeText`, `sceneDescription`, `chapterTitle`, plus `conceptsFound`.

## Frontend Plan
### 1) StoryStudio flow refactor
File: `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Story/StoryStudio.jsx`

Change state flow to:
`LOADING -> INTRO -> CHAPTER_1 -> CHAPTER_2 -> CHAPTER_3 -> FINALIZING -> PLAYBACK -> SHARE`

Remove iterative illustrating states from active flow:
- `ILLUSTRATING_1`
- `ILLUSTRATING_2`
- `ILLUSTRATING_3`

### 2) Question handling
- Use `questionFlow[1..3]` from `/story` response.
- Record answers locally without backend calls.
- Keep current chapter UI and choice cards.

### 3) Single final generation
- On final question submit, call `/api/learn/story/finalize`.
- Show one loader screen with rotating stage text.
- On success, set `state.illustrations/playbackScenes` from returned `scenes`.

### 4) Playback and narration
Files:
- `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Story/StoryPlayback.jsx`
- `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Story/useStoryNarration.js`

Keep current manga playback and `narratePanels` behavior.
No flow changes needed except consuming finalized scenes directly.

### 5) Storage compatibility
Files:
- `/Users/jasonchi/ShowMe/frontend/src/utils/storyStorage.js`
- `/Users/jasonchi/ShowMe/frontend/src/constants/appConfig.js`

Keep additive schema (`panelCaptions` optional). Old stories continue rendering.

## Backend Generation Strategy
1. Use one LLM text pass (`generateFinalStoryFromAnswers`) to produce all 3 scene specs.
2. Generate 3 images in parallel with `comicPanel: true`.
3. Use `Promise.allSettled` so one failed image does not fail full story.
4. Fill failed images with `imageUrl: null` and still return scene text/captions.

## Failure Modes and Fallbacks
1. If `/story/finalize` fails with rate limit, show retry CTA in final loader/error state.
2. If a subset of image generations fail, playback still works with placeholders.
3. Keep legacy `/story/chapter` route untouched for rollback safety.

## Test Cases and Scenarios
### Backend
1. `POST /story` returns `questionFlow` with exactly 3 chapters.
2. `POST /story/finalize` validates required fields and returns 400 for bad payload.
3. `POST /story/finalize` returns 200 with `scenes.length === 3`.
4. `panelCaptions` returned per scene with max 4 captions.
5. Partial image failures still return complete scene data.

Target file:
`/Users/jasonchi/ShowMe/backend/src/routes/__tests__/learn.story.test.js`

### Frontend
1. StoryStudio transitions across new states without intermediate illustration states.
2. Selecting answers across 3 chapters triggers exactly one finalize API call.
3. One loader is shown only during final generation.
4. Playback renders all 3 finalized scenes with manga captions.
5. Old saved story replay still works.

Target files:
- `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Story/__tests__/StoryStudio.test.jsx`
- `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Story/__tests__/StoryPlayback.test.jsx`

## Rollout and Verification
1. Create original plan file first.
2. Generate feature breakdown using create-features skill.
3. Implement behind optional frontend flag `VITE_STORY_BATCH_MODE` default `true` for safe rollback.
4. Verify with targeted backend/frontend vitest runs.
5. Run 1-3 code review agents after implementation.

## Assumptions and Defaults
1. Keep 3 questions and 3 final pages.
2. Questions are pre-generated and not adapted after each answer.
3. Best perceived latency comes from one final batch, even if total compute remains similar.
4. Existing manga panel rendering remains the visual format.
