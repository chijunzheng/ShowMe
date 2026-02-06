# Feature: Intro Readiness Barrier

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Dependencies:** -

## Description
Keep `LOADING` visible until both scene image fetch and intro narration prefetch settle, with a 12s timeout fallback.

## Acceptance Criteria
- [x] Intro is not shown while readiness assets are still pending.
- [x] Image timeout/failure falls back safely without crash.
- [x] Intro narration cache warmup is part of readiness barrier.

## Files Modified
- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx`
