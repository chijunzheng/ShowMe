# Feature: Cross-Cluster Edge Styling

**ID:** 02
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** -

## Description

Detect edges that connect topics in different clusters and render them as curved, dashed, dimmed paths to reduce clutter while preserving relationship visibility.

## Acceptance Criteria

- [x] Cross-cluster edges are detected via cluster membership
- [x] Cross-cluster edges render as curved, dashed paths
- [x] Within-cluster edges remain unchanged
- [x] Cross-cluster edges remain clickable

## Implementation Details

### Files to Modify
- `frontend/src/components/Constellation/Constellation.jsx` - separate cross-cluster edges
- `frontend/src/components/Constellation/__tests__/Constellation.test.jsx` - render and styling tests

## Testing Requirements

- [x] Constellation renders a cross-cluster edge path with dashed styling

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
