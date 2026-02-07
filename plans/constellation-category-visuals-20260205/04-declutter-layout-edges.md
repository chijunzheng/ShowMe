# Feature: Declutter Layout + Edge Styling

**ID:** 04
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01, 02, 03

## Description
Increase cluster spacing and simplify edge visuals to reduce visual clutter in dense constellations.

## Acceptance Criteria
- [x] Cluster spacing increases (more separation between cluster groups)
- [x] Edge styling is simplified to a single muted style
- [x] Suggested gaps remain dashed for discoverability
- [x] Category legend becomes collapsible to reduce UI bulk

## Implementation Details
- `frontend/src/components/Constellation/useConstellationLayout.js`
- `frontend/src/components/Constellation/Constellation.jsx`
- `frontend/src/components/Constellation/ConstellationEdge.jsx`
- `frontend/src/components/Constellation/__tests__/ConstellationEdge.test.jsx`
- `frontend/src/components/Constellation/__tests__/Constellation.test.jsx`

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
