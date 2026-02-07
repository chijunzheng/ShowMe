# Feature: StoryStudio Loading/Timeout Tests

**ID:** 03  
**Status:** ✅ Completed  
**Priority:** Medium  
**Estimated Complexity:** Medium  
**Dependencies:** 02

## Description

Add targeted unit tests to prevent regressions:

- Loading screen shows “Preparing…” and a **Go Back** button
- Timeout transitions to the error screen with actionable buttons

## Acceptance Criteria

- [ ] `vitest` passes for the new StoryStudio tests when run in isolation.

## Implementation Details

### Files to Create/Modify

- `frontend/src/components/LearnModes/Story/__tests__/StoryStudio.test.jsx`

### Notes

- Mock `global.fetch` to:
  - Remain pending until aborted (for timeout test), then reject with `AbortError`
  - Resolve with a valid JSON payload for non-timeout tests if needed
- Use fake timers (`vi.useFakeTimers()`) for the timeout test.

---

**Created:** 2026-02-05  
**Last Updated:** 2026-02-05
