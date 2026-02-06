# Feature: Align Clue TTS With On-screen Text

**ID:** 03
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** 01

## Description
Make investigation narration read the same clue text users see on screen to avoid mismatch confusion.

## Acceptance Criteria
- [x] Narration uses `clue.text` as primary source.
- [x] Fallback to `clue.narratorText` only when needed.
- [x] Prefetch follows the same priority for next clue.

## Implementation Details
- Updated INVESTIGATE narration effect in `MysteryLab`.

## Files Modified
- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx`
- `frontend/src/components/LearnModes/Mystery/__tests__/MysteryLab.test.jsx`

---
**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Implemented By:** Codex
