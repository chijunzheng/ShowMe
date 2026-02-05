# Feature: Tests + Verification

**ID:** 03  
**Status:** ✅ Completed  
**Priority:** High  
**Estimated Complexity:** Medium  
**Dependencies:** 01, 02

## Description
Add/extend automated tests and define a manual verification script so this regression doesn’t return.

## Acceptance Criteria
- [ ] Backend tests cover:
  - `CURIOUS_MIND` unlock only once per client
  - local-progress persistence across backend restarts (file-backed store)
- [ ] Frontend tests cover:
  - Progress trophy row renders badges when provided
- [ ] Manual verification checklist is documented and repeatable.

## Implementation Details

### Backend Tests
- Add/extend tests under:
  - `backend/src/services/__tests__/userProgress.test.js` (new if missing) OR reuse existing test structure.
- Use a temp file path for `SHOWME_LOCAL_PROGRESS_FILE` to avoid touching real dev files.

### Frontend Tests
- Add a small test near ProgressTab:
  - `frontend/src/components/ProgressTab/__tests__/ProgressTab.trophies.test.jsx` (or integrate into existing suite).

### Manual Verification Checklist
1. Start backend + frontend.
2. Ask a question:
   - Expect “Curious Mind” toast once.
3. Ask a second question:
   - Expect no new “Curious Mind” toast.
4. Open Progress tab:
   - Expect trophy row includes “Curious Mind”.
5. Restart backend; refresh app; ask another question:
   - Expect no new “Curious Mind” toast; trophy row still shows badge.

## Implementation Checklist
- [ ] Add backend tests.
- [ ] Add frontend test.
- [ ] Run:
  - `cd backend && npm test -- --run`
  - `cd frontend && npm test -- --run`
  - `cd frontend && npm run lint`
  - `cd frontend && npm run build`

---

**Created:** 2026-02-05  
**Last Updated:** 2026-02-05  
**Implemented By:** Codex
