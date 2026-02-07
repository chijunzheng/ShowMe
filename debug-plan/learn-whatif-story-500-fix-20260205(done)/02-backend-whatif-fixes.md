# Feature: Backend — WhatIf scenario + evaluation fixes

**ID:** 02  
**Status:** ✅ Completed  
**Priority:** High  
**Estimated Complexity:** Medium  
**Dependencies:** -

## Description
Fix `generateWhatIfScenario()` and `evaluateWhatIfPrediction()` so they:
- define `ai` via `getAIClient()`
- request strict JSON (`responseMimeType: 'application/json'`)
- parse/validate JSON correctly (since `extractJSON()` returns a string).

## Acceptance Criteria
- [ ] `/api/learn/whatif` returns 200 with scenario payload when Gemini responds correctly.
- [ ] `generateWhatIfScenario()` returns structured error codes instead of throwing.
- [ ] `/api/learn/whatif/evaluate` works end-to-end after scenario generation.

## Implementation Details
### Files to Modify
- `backend/src/services/gemini.js`
  - Add `const ai = getAIClient()` inside both functions.
  - Replace `const extracted = extractJSON(text)` usage with:
    - `const jsonStr = repairJSON(extractJSON(text))`
    - `const parsed = JSON.parse(jsonStr)`
  - Validate required keys and normalize shapes.

## Testing Requirements
- [ ] Covered by Feature 05 route tests via mocks.

---
**Created:** 2026-02-05  
**Last Updated:** 2026-02-05  
**Implemented By:** Codex CLI
