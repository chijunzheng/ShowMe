# Feature: Gap Link Reliability

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** -

## Description
Ensure all suggested topics are connected to existing nodes by enforcing valid `connectsTo` mapping and strict AI retry.

## Acceptance Criteria
- [x] Backend retries when any gap maps to zero node IDs
- [x] Backend filters out gaps without valid connects
- [x] Frontend filters out gaps with empty connects

## Implementation Details

### Files to Modify
- `backend/src/services/geminiGraph.js`
- `backend/src/services/__tests__/geminiGraph.test.js`
- `frontend/src/hooks/useKnowledgeGraph.js`
- `frontend/src/hooks/__tests__/useKnowledgeGraphUtils.test.js`

## Testing Requirements
- [x] Unit test verifies retry when any gap has empty connects
- [x] Unit test verifies gap filtering helper

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
