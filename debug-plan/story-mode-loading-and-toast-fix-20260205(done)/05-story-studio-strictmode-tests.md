# Feature: StoryStudio StrictMode Regression Tests

**ID:** 05  
**Status:** ✅ Completed  
**Priority:** Medium  
**Estimated Complexity:** Medium  
**Dependencies:** 03, 04

## Description

Add tests to reproduce React 18 StrictMode behavior and prevent regressions where the Story prompt never appears due to effect double-invocation.

## Acceptance Criteria

- [x] Tests render `StoryStudio` inside `<React.StrictMode>` and confirm it transitions to the prompt UI when the backend succeeds.
- [x] Tests confirm that under `<React.StrictMode>`, the 30s timeout results in the error UI.

## Implementation Details

### Files Modified

- `frontend/src/components/LearnModes/Story/__tests__/StoryStudio.test.jsx`

### Scenarios Covered

1. Loading screen shows “Preparing…” and includes a `Go Back` button.
2. Under StrictMode, successful fetch transitions to “Story Studio” prompt UI.
3. Under StrictMode, pending fetch hits timeout and transitions to error UI.

---

**Created:** 2026-02-05  
**Last Updated:** 2026-02-05

