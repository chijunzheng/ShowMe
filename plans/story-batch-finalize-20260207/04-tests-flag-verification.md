# Feature: Tests + Flag + Verification

**ID:** 04
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01, 02, 03

## Description

Add a frontend flag for safe rollback, update backend/frontend tests for new flow, and run targeted verification.

## Acceptance Criteria

- [ ] `VITE_STORY_BATCH_MODE` gate exists, default-enabled behavior
- [ ] StoryStudio tests validate one finalize call and single-loader behavior
- [ ] Backend tests validate `questionFlow` and `/story/finalize`
- [ ] Targeted test runs pass for touched suites

## Files to Modify

- `frontend/src/components/LearnModes/Story/__tests__/StoryStudio.test.jsx`
- `frontend/src/components/LearnModes/Story/__tests__/StoryPlayback.test.jsx`
- `backend/src/routes/__tests__/learn.story.test.js`
- `frontend/src/constants/appConfig.js` (if flag exposure pattern needed)

