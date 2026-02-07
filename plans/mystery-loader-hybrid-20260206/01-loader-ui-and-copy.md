# Feature: Loader UI and Copy

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** -

## Description

Create a dedicated Mystery loader component that communicates progress context with rotating investigation stage copy and optional fun fact rendering.

## Acceptance Criteria

- [x] New `MysteryLoader.jsx` exists and is used by `MysteryLab` in `LOADING` state.
- [x] Loader includes spinner, rotating stage text, optional fun fact card, and non-gating note.
- [x] Loader uses accessible `role="status"` and `aria-live` semantics.

## Implementation Details

### Files to Create/Modify

- `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Mystery/MysteryLoader.jsx` - New loader presentation component.
- `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Mystery/MysteryLab.jsx` - Wire loader stage text/fun-fact props.

### Testing Requirements

- [x] Component rendering covered via `MysteryLab` tests.

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Implemented By:** Codex
