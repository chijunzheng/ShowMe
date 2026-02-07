# Feature: Same-Origin API Base Helper

**ID:** 03
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01

## Description
Introduce a shared API base helper that defaults to same-origin in production and never falls back to localhost there.

## Acceptance Criteria
- [ ] Replace direct `VITE_API_URL || 'http://localhost:3002'` with helper.
- [ ] Production build uses same-origin when env var is absent.
- [ ] Development fallback remains usable.

## Files to Modify
- `frontend/src/utils/apiBase.js` (new)
- Multiple call-sites in hooks/components
