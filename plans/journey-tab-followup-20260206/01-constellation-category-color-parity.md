# Feature: Constellation Category Color Parity

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Dependencies:** -

## Goal
Ensure node color always reflects `node.category`, independent of cluster membership.

## Acceptance Criteria
- [x] Shared cluster style utility exists and exports normalize/get style/format label.
- [x] Constellation node accent color uses category-derived style.
- [x] Legend is derived from node categories, not cluster list.
- [x] Gray color only appears for general/uncategorized topics.

## Files
- `frontend/src/utils/clusterStyle.js`
- `frontend/src/hooks/useKnowledgeGraph.js`
- `frontend/src/components/Constellation/Constellation.jsx`
