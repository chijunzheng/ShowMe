# Feature: Regression tests (frontend + backend)

**ID:** 05
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 01, 02, 03, 04

## Description

Add targeted regression tests to lock request contract, error handling, non-blocking image fallback, and StrictMode behavior.

## Acceptance Criteria

- [x] Frontend test verifies image endpoint receives `imagePrompt` from mystery payload.
- [x] Frontend test verifies intro still renders when image request fails.
- [x] Frontend test verifies friendly 503 messaging.
- [x] Backend route test verifies `/mystery/image` returns `400` when `imagePrompt` missing.

## Implementation Details

### Files to Create/Modify

- `frontend/src/components/LearnModes/Mystery/__tests__/MysteryLab.test.jsx` - component regressions
- `backend/src/routes/__tests__/learn.mystery.test.js` - image endpoint validation tests

### Technical Decisions

- **Decision:** Focus on minimal high-signal scenarios rather than broad snapshot tests.
- **Trade-off:** Faster, less brittle test suite with direct contract assertions.

## Dependencies

### Depends On
- **Feature 01, 02, 03, 04:** Tests encode final behavior from completed implementation.

## Testing Requirements

- [x] `cd frontend && npm test -- --run src/components/LearnModes/Mystery/__tests__/MysteryLab.test.jsx`
- [x] `cd backend && npm test -- --run src/routes/__tests__/learn.mystery.test.js`

## Implementation Checklist

- [x] Add frontend tests with mocked `fetch`
- [x] Add backend route test for `/mystery/image`
- [x] Run relevant test targets

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Implemented By:** Codex
