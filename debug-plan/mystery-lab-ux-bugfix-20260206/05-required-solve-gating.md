# Feature: Require Multiple Solve Tasks Before Reveal

**ID:** 05
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01

## Description
Prevent case completion by MCQ alone. Reveal unlocks only when required tasks are all correct.

## Acceptance Criteria
- [x] Required methods are `mcq`, `evidence-board`, `fill-blank`.
- [x] Case remains in solve flow until all required methods pass.
- [x] Per-method status and progress are visible.
- [x] Completed methods become non-submittable.

## Implementation Details
- Added per-method result/attempt tracking in reducer state.
- Added required method completion gate.
- Updated method orchestrator and method components for disable/retry behavior.

## Files Modified
- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx`
- `frontend/src/components/LearnModes/Mystery/TheorySolver.jsx`
- `frontend/src/components/LearnModes/Mystery/SolveEvidenceBoard.jsx`
- `frontend/src/components/LearnModes/Mystery/SolveFillBlank.jsx`

---
**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Implemented By:** Codex
