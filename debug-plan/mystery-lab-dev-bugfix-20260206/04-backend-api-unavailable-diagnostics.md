# Feature: Backend API_NOT_AVAILABLE diagnostics

**ID:** 04
**Status:** ✅ Completed
**Priority:** Medium
**Estimated Complexity:** Low
**Dependencies:** -

## Description

Improve backend diagnostics for Gemini-unavailable path in mystery generator without changing external behavior.

## Acceptance Criteria

- [x] Logs explicitly identify missing/placeholder key state.
- [x] Logs include actionable runtime env hint (backend cwd/env loading).
- [x] API response behavior remains unchanged (`API_NOT_AVAILABLE` -> 503).

## Implementation Details

### Files to Create/Modify

- `backend/src/services/mysteryGenerator.js` - unavailable-path logging

### Technical Decisions

- **Decision:** Add structured warning logs with safe booleans only.
- **Trade-off:** Slight log verbosity in exchange for faster debugging.

## Dependencies

### Blocks
- **Feature 05:** Backend test coverage should include current behavior unchanged.

## Testing Requirements

- [x] Existing route mapping tests still pass.

## Implementation Checklist

- [x] Add safe diagnostic log in `getAIClient`
- [x] Verify no secret leakage in logs

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Implemented By:** Codex
