# Feature: Category Cluster + Inferred Connectivity Utility

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Dependencies:** -

## Goal
Build deterministic utility helpers that derive visual clusters from category and infer minimal category links for disconnected components.

## Acceptance Criteria
- [x] `buildVisualCategoryClusters(nodes)` returns deterministic category clusters with `{ id, key, name, color, icon, nodeIds }`.
- [x] `buildInferredCategoryEdges(nodes, edges)` returns minimal `k-1` inferred links per non-general category with disconnected components.
- [x] Inferred edge IDs and representative selection are deterministic.
- [x] No mutation of input arrays.

## Files
- `frontend/src/components/Constellation/constellationCategoryGraph.js`
