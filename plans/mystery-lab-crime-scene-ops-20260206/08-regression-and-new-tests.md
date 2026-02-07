# Feature: Regression + New Tests

**ID:** 08
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 02,07

## Description
Update existing tests for new flow and add targeted tests for new components.

## Acceptance Criteria
- [ ] Mystery route tests include new evaluate methods
- [ ] MysteryLab integration test verifies BRIEFING -> CELEBRATION flow
- [ ] New component tests cover core validation behavior
- [ ] Existing tests are updated to remove assumptions about old tabbed solve UI

## Files to Modify/Create
- `backend/src/routes/__tests__/learn.mystery.test.js`
- `frontend/src/components/LearnModes/Mystery/__tests__/MysteryLab.test.jsx`
- `frontend/src/components/LearnModes/Mystery/__tests__/CrimeSceneScan.test.jsx`
- `frontend/src/components/LearnModes/Mystery/__tests__/WitnessRoom.test.jsx`
- `frontend/src/components/LearnModes/Mystery/__tests__/TimelineRebuild.test.jsx`
- `frontend/src/components/LearnModes/Mystery/__tests__/WarrantDecision.test.jsx`
