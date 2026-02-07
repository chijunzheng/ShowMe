# Feature: Story Prompt QuestionFlow Contract

**ID:** 01
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Update `POST /api/learn/story` response to always include `questionFlow` for chapter 1..3 so frontend can collect all answers before final generation.

## Acceptance Criteria

- [ ] `/api/learn/story` returns `questionFlow` with exactly 3 chapter entries
- [ ] Each questionFlow item has `chapterNumber`, `prompt`, `icon`, `choices[]`
- [ ] Existing fields remain backward compatible (`chapters`, `conceptChecklist`, etc.)
- [ ] Fallback story response still includes `questionFlow`

## Files to Modify

- `backend/src/routes/learn.js`
- `backend/src/routes/__tests__/learn.story.test.js`

