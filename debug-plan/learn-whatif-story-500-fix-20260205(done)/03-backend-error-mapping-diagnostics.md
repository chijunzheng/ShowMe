# Feature: Backend — Learn error mapping + diagnostics

**ID:** 03  
**Status:** ✅ Completed  
**Priority:** Medium  
**Estimated Complexity:** Low  
**Dependencies:** 01, 02

## Description
Update `/api/learn/whatif` and `/api/learn/story` routes to map known AI error codes to appropriate HTTP status codes and add minimal diagnostics for debugging.

## Acceptance Criteria
- [ ] `API_NOT_AVAILABLE` → 503
- [ ] `RATE_LIMITED` → 429
- [ ] `PARSE_ERROR` / `INVALID_RESPONSE` → 502
- [ ] Validation errors → 400
- [ ] Unexpected exceptions → 500

## Implementation Details
### Files to Modify
- `backend/src/routes/learn.js`
- (Optional) `backend/src/services/gemini.js` — include truncated response preview logs on parse failures.

---
**Created:** 2026-02-05  
**Last Updated:** 2026-02-05  
**Implemented By:** Codex CLI
