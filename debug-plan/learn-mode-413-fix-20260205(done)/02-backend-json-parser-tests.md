# Feature: Backend — JSON parser middleware tests

**ID:** 02  
**Status:** ✅ Completed  
**Priority:** Medium  
**Estimated Complexity:** Medium  
**Dependencies:** 01

## Description

Add a regression test to ensure route-aware JSON body limits behave as intended:
- `/api/learn/*` accepts payloads >10kb
- non-learn routes still reject >10kb with 413

## Acceptance Criteria

- [ ] `npm test` in `backend/` passes with the new test.
- [ ] Test asserts `/api/learn/test` accepts a JSON body ~20kb (HTTP 200).
- [ ] Test asserts a non-learn route (e.g. `/api/other/test`) rejects a JSON body >10kb (HTTP 413).

## Implementation Details

### Files to Create/Modify

- `backend/src/middleware/__tests__/jsonBodyParser.test.js`

### Key Components

1. Minimal Express app for test:
   - `app.use(createJsonBodyParserMiddleware())`
   - `app.post('/api/learn/test', ...)`
   - `app.post('/api/other/test', ...)`
2. Use `supertest` to send a JSON body of controlled size.

## Testing Requirements

- [ ] Run `cd backend && npm test`

## Implementation Checklist

- [ ] Add test file
- [ ] Ensure deterministic payload sizing (string length)
- [ ] Verify 413 path returns JSON error (status check is sufficient)

---
**Created:** 2026-02-05  
**Last Updated:** 2026-02-05  
**Implemented By:** Codex CLI
