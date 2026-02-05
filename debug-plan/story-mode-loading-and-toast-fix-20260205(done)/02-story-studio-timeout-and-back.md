# Feature: StoryStudio Loading Escape + Timeout

**ID:** 02  
**Status:** ✅ Completed  
**Priority:** High  
**Estimated Complexity:** Medium  
**Dependencies:** 01

## Description

Prevent StoryStudio from trapping the user on the loading spinner. Add:

- A visible **Go Back / Cancel** action during `LOADING_PROMPT`
- A **30s timeout** for the `/api/learn/story` fetch

## Acceptance Criteria

- [ ] `LOADING_PROMPT` UI includes a **Go Back** button.
- [ ] Clicking **Go Back** aborts the in-flight fetch and returns to the mode selector (`onBack`).
- [ ] If the request takes longer than 30s, the UI transitions to `ERROR` with a clear timeout message.
- [ ] Retry from `ERROR` works and starts a fresh request.

## Implementation Details

### Files to Modify

- `frontend/src/components/LearnModes/Story/StoryStudio.jsx`

### Technical Decisions

- Timeout implemented via `setTimeout` + `AbortController.abort()`.
- Abort errors:
  - If caused by timeout: transition to `ERROR`.
  - If caused by unmount/user navigation: ignore (no state update).

## Testing Requirements

- [ ] Unit tests for loading UI button presence and click behavior
- [ ] Unit test for timeout → `ERROR`

---

**Created:** 2026-02-05  
**Last Updated:** 2026-02-05
