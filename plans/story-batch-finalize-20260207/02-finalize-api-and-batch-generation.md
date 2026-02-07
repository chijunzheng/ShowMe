# Feature: Finalize API + Batch Scene Generation

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 01

## Description

Add a new endpoint `POST /api/learn/story/finalize` that receives all chapter answers and returns 3 finalized manga scenes using one text-generation pass and parallel image generation.

## Acceptance Criteria

- [ ] New `generateFinalStoryFromAnswers(...)` service function exists
- [ ] Finalize API validates request payload and returns 400 on invalid inputs
- [ ] Response includes `scenes` (length 3) and `conceptsFound`
- [ ] Image generation uses `comicPanel: true` and `Promise.allSettled`
- [ ] Partial image failures return `imageUrl: null` without failing the whole response

## Files to Modify

- `backend/src/services/gemini.js`
- `backend/src/routes/learn.js`
- `backend/src/routes/__tests__/learn.story.test.js`

