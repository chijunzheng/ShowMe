# Feature: Regression Test Coverage For UX + Flow Fixes

**ID:** 06
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01, 02, 03, 04, 05

## Description
Lock key bug fixes with tests to prevent regressions.

## Acceptance Criteria
- [x] Test verifies image request payload includes `imagePrompt`.
- [x] Test verifies loading blocks until image fetch resolves.
- [x] Test verifies clue narration uses on-screen text.
- [x] Test verifies filtered slide refs show expected clue image.
- [x] Test verifies MCQ-only path does not solve case.
- [x] Test verifies friendly 503 message.

## Implementation Details
- Extended `MysteryLab.test.jsx` with dedicated regression scenarios.

## Files Modified
- `frontend/src/components/LearnModes/Mystery/__tests__/MysteryLab.test.jsx`

---
**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Implemented By:** Codex
