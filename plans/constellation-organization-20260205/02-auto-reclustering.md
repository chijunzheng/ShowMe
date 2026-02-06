# Feature: Auto Reclustering on New Topic

**ID:** 02
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01

## Description
Recluster the constellation after each new topic (while the graph is small) to keep categories current, with debounce to prevent thrash.

## Acceptance Criteria
- [x] Recluster runs on every new topic when node count <= limit
- [x] Debounce prevents rapid consecutive reclusters
- [x] Auto recluster skipped when above limit

## Implementation Details

### Files to Modify
- `frontend/src/hooks/useKnowledgeGraph.js`
- `frontend/src/hooks/__tests__/useKnowledgeGraphUtils.test.js`

## Testing Requirements
- [x] Unit test for recluster decision helper

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
