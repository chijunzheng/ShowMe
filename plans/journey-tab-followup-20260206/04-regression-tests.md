# Feature: Regression Tests (Frontend + Backend)

**ID:** 04
**Status:** ✅ Completed
**Priority:** High
**Dependencies:** 01, 02, 03

## Goal
Add tests that lock color parity and discover freshness behavior.

## Acceptance Criteria
- [x] Constellation test asserts category color path independent of cluster membership.
- [x] Hook utility tests cover fresh-set filtering + seen-reset behavior.
- [x] ProgressTab test verifies discover options and replace behavior.
- [x] Backend service tests cover excludeTopics/targetCount/aggregation.

## Files
- `frontend/src/components/Constellation/__tests__/Constellation.test.jsx`
- `frontend/src/hooks/__tests__/useKnowledgeGraphUtils.test.js`
- `frontend/src/components/ProgressTab/__tests__/ProgressTab.discover.test.jsx`
- `backend/src/services/__tests__/geminiGraph.test.js`
