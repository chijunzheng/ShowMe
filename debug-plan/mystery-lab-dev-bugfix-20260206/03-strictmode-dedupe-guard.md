# Feature: StrictMode dedupe + stale request guard

**ID:** 03
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01

## Description

Prevent duplicate/dev-stale load effects from causing noisy transitions under React StrictMode while retaining strict mode in development.

## Acceptance Criteria

- [x] Duplicate mount/effect does not create duplicate committed mystery state.
- [x] Aborted stale request does not dispatch error.
- [x] Current request cancellation still works on unmount.

## Implementation Details

### Files to Create/Modify

- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx` - request id / stale guard

### Technical Decisions

- **Decision:** Use monotonic request id ref and stale checks before dispatch.
- **Trade-off:** Slight internal complexity for cleaner dev UX and safer async state updates.

## Dependencies

### Depends On
- **Feature 01:** Guard applies to refactored load/eval effects.

### Blocks
- **Feature 05:** StrictMode test assertions depend on guard.

## Testing Requirements

- [x] StrictMode render test ensures stable state outcome.

## Implementation Checklist

- [x] Add request id ref
- [x] Ignore stale async completions
- [x] Keep abort cleanup

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Implemented By:** Codex
