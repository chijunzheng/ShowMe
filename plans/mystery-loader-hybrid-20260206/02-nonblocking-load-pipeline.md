# Feature: Non-Blocking Load Pipeline

**ID:** 02
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01

## Description

Refactor Mystery load flow to transition into `BRIEFING` as soon as mystery payload validation completes, while image and narration prefetch continue in background.

## Acceptance Criteria

- [x] `MYSTERY_LOADED` dispatch happens before image/prefetch completion.
- [x] Image and prefetch complete asynchronously and safely update state if still mounted.
- [x] Retry/abort cleanup still works with background tasks.

## Implementation Details

### Files to Create/Modify

- `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Mystery/MysteryLab.jsx` - Load effect refactor.

### Testing Requirements

- [x] Test verifies transition to `BRIEFING` while image request is unresolved.

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Implemented By:** Codex
