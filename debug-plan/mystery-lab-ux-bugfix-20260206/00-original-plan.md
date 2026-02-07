# Plan: Mystery Lab UX + Flow Bug Fixes (2026-02-06)

## Goal
Fix all five reported Mystery Lab issues in dev server behavior:

1. No loading screen while waiting for mystery image.
2. Slide 1 image missing in clue reference (shows "No image").
3. TTS narration does not match clue text shown on screen.
4. No loading screen during concluding case narration.
5. Case can be solved by MCQ alone; must require additional tasks.

## Success Criteria
- Intro remains on loading state until mystery image fetch completes or safely times out.
- Clue slide references align with the same filtered slide set used to generate clues.
- Investigation narration uses the exact on-screen clue text as primary source.
- Reveal state shows a narration loading/playing overlay and disables continue until narration settles.
- Reveal unlocks only after completing all required solve methods (MCQ + Evidence Board + Fill in Blanks).
- Add regression tests for each behavior.

## Scope
### In Scope
- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx`
- `frontend/src/components/LearnModes/Mystery/TheorySolver.jsx`
- `frontend/src/components/LearnModes/Mystery/SolutionReveal.jsx`
- `frontend/src/components/LearnModes/Mystery/SolveEvidenceBoard.jsx`
- `frontend/src/components/LearnModes/Mystery/SolveFillBlank.jsx`
- `frontend/src/components/LearnModes/Mystery/__tests__/MysteryLab.test.jsx`

### Out of Scope
- Storage quota warning (`[STORAGE] Slides archive quota exceeded`)
- Backend API contract changes

## Assumptions
- Voice/Text method remains optional bonus, not part of required completion gate.
- Existing endpoint contracts remain unchanged.
