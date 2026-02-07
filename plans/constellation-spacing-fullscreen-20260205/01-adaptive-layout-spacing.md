# Feature: Adaptive Layout Spacing

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** -

## Description

Increase spacing between nodes and further separate clusters using adaptive force parameters that scale with node and cluster counts.

## Acceptance Criteria

- [x] Repulsion increases as node count grows
- [x] Cluster repulsion increases with cluster count
- [x] Center gravity relaxes when multiple clusters exist
- [x] Layout remains deterministic for the same inputs

## Implementation Details

### Files to Modify
- `frontend/src/components/Constellation/useConstellationLayout.js` - add adaptive config helper
- `frontend/src/components/Constellation/__tests__/useConstellationLayout.test.js` - tests for scaling

### Key Components
1. **Adaptive Config Helper**
   - Computes repulsion, cluster repulsion, and center gravity
   - Exported for tests

## Testing Requirements

- [x] Unit tests for adaptive config scaling

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
