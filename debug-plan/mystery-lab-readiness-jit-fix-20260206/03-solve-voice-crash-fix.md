# Feature: SolveVoiceText Crash Fix

**ID:** 03
**Status:** ✅ Completed
**Priority:** High
**Dependencies:** -

## Description
Fix render-time TDZ crash from referencing `stopRecording` before initialization.

## Acceptance Criteria
- [x] No `ReferenceError` on entering voice/text solve mode.
- [x] Auto-stop effect still functions at max duration.
- [x] Component renders without blank screen.

## Files Modified
- `frontend/src/components/LearnModes/Mystery/SolveVoiceText.jsx`
- `frontend/src/components/LearnModes/Mystery/__tests__/SolveVoiceText.test.jsx`
