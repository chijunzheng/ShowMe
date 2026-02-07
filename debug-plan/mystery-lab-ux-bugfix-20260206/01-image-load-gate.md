# Feature: Block Intro Until Image Fetch Settles

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** -

## Description
Ensure LOADING screen stays visible while mystery image is being fetched (or until timeout/failure fallback), preventing an abrupt transition without visual readiness.

## Acceptance Criteria
- [x] Intro does not render until image request completes/fails/times out.
- [x] Timeout fallback uses placeholder behavior instead of hard failure.
- [x] Existing mystery fetch contract remains unchanged.

## Implementation Details
- Added image fetch timeout and integrated mystery+image loading sequence in `MysteryLab`.
- Dispatch `MYSTERY_LOADED` only after image stage settles.

## Files Modified
- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx`

---
**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Implemented By:** Codex
