# Feature: Mystery Evaluate API Crime Scene Ops Methods

**ID:** 02
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 01

## Description
Add evaluate branches for `scene-scan`, `witness-room`, `timeline-rebuild`, and `warrant-decision`.

## Acceptance Criteria
- [ ] Deterministic scoring for scene scan hotspot completion
- [ ] Deterministic scoring for witness question coverage and contradiction resolution
- [ ] Deterministic scoring for timeline order + causal link checks
- [ ] Warrant decision checks verdict index and optional deep rationale quality via LLM

## Files to Modify
- `backend/src/routes/learn.js`

## Testing Requirements
- [ ] Route tests covering new methods and status codes
