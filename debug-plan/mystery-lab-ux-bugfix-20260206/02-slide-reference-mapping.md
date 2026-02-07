# Feature: Fix Slide Reference Mapping For Clue Images

**ID:** 02
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01

## Description
Align clue `slideRef` rendering with the same filtered slide context used during mystery generation, so clue references point at the intended slide image.

## Acceptance Criteria
- [x] Clue 1 references first eligible content slide.
- [x] Header/suggestions slides no longer shift clue image references.
- [x] Reference image renders when source slide has `imageUrl`.

## Implementation Details
- Added `buildMysterySlideContext()` returning both payload and reference slide list.
- Pass `referenceSlides` into `ClueInvestigation`.

## Files Modified
- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx`
- `frontend/src/components/LearnModes/Mystery/__tests__/MysteryLab.test.jsx`

---
**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Implemented By:** Codex
