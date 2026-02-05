# Feature: Fix StoryStudio StrictMode Mounted-Guard Bug

**ID:** 04  
**Status:** ✅ Completed  
**Priority:** High  
**Estimated Complexity:** Low  
**Dependencies:** 02

## Description

Fix a dev-only but user-visible issue where StoryStudio stays stuck on `LOADING_PROMPT` even when `/api/learn/story` returns successfully. This occurs under React 18 StrictMode, which runs effects twice on mount (effect → cleanup → effect).

StoryStudio’s `isMountedRef` guard was set to `false` in cleanup and never reset to `true`, causing all state updates (READY / ERROR) to be skipped after the second effect run.

## Acceptance Criteria

- [x] In React.StrictMode (dev), StoryStudio transitions from loading to the Story prompt screen after a successful response.
- [x] In React.StrictMode (dev), the 30s timeout transitions to the error screen instead of staying stuck.

## Implementation Details

### Files Modified

- `frontend/src/components/LearnModes/Story/StoryStudio.jsx`

### Changes

1. Reset `isMountedRef.current = true` at the start of the mount effect before calling `loadStoryPrompt()`.
2. Keep cleanup setting `isMountedRef.current = false` and aborting the in-flight request.

---

**Created:** 2026-02-05  
**Last Updated:** 2026-02-05

