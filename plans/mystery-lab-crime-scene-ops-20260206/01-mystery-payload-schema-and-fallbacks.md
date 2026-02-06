# Feature: Mystery Payload Schema + Generator Fallbacks

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** -

## Description
Extend mystery generation to include crimeScene, witnesses, timeline, and verdict sections with level-aware defaults.

## Acceptance Criteria
- [ ] `/api/learn/mystery` returns `crimeScene`, `witnesses`, `timeline`, and `verdict`
- [ ] Level-aware counts map to simple/standard/deep
- [ ] Missing AI fields are repaired with deterministic fallback data
- [ ] Existing fields (`mysteryTitle`, `mysterySetup`, `imagePrompt`, `solutionExplanation`, `revealNarration`) remain present

## Files to Modify
- `backend/src/services/mysteryGenerator.js`

## Testing Requirements
- [ ] Service tests for fallback payload normalization
- [ ] Route response shape stays valid
