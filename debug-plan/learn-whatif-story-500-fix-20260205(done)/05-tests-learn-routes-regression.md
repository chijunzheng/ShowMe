# Feature: Tests — Learn routes status mapping regression

**ID:** 05  
**Status:** ✅ Completed  
**Priority:** Medium  
**Estimated Complexity:** Medium  
**Dependencies:** 01, 02, 03

## Description
Add router-level tests for:
- `/api/learn/whatif`
- `/api/learn/story`

Use the same pattern as existing `learn.mystery.test.js`: call `learnRouter.handle(req,res,next)` with mocks (no network sockets).

## Acceptance Criteria
- [ ] Tests assert correct HTTP status mapping for key error codes.
- [ ] Tests assert 200 on success shapes.

## Implementation Details
### Files to Create
- `backend/src/routes/__tests__/learn.whatif.test.js`
- `backend/src/routes/__tests__/learn.story.test.js`

---
**Created:** 2026-02-05  
**Last Updated:** 2026-02-05  
**Implemented By:** Codex CLI
