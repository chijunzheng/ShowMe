# Feature: MysteryLab State Machine Rewire

**ID:** 07
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 02,03,04,05,06

## Description
Replace old solve-method tab flow with the Crime Scene Ops state machine.

## Acceptance Criteria
- [ ] New states: LOADING, BRIEFING, SCENE_SCAN, WITNESS_ROOM, TIMELINE_REBUILD, WARRANT_DECISION, REVEAL, CELEBRATION
- [ ] Removes MCQ/fill/evidence tab flow from render path
- [ ] Stage transitions run in sequence with retry/error handling
- [ ] Legacy payload fallback message shown when new schema is missing

## Files to Modify
- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx`
