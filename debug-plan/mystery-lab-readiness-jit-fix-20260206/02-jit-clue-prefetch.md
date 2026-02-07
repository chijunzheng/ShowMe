# Feature: JIT Clue Prefetch

**ID:** 02
**Status:** ✅ Completed
**Priority:** High
**Dependencies:** 01

## Description
Reduce first-clue and subsequent-clue narration latency by prefetching in sequence.

## Acceptance Criteria
- [x] Clue 1 prefetch starts during intro narration.
- [x] During investigation, clue N narration triggers clue N+1 prefetch.
- [x] On-screen clue text remains narration source of truth.

## Files Modified
- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx`
- `frontend/src/components/LearnModes/Mystery/__tests__/MysteryLab.test.jsx`
