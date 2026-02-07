# Feature: Graph Cloud Persistence Service + Routes

**ID:** 04
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 02,03

## Description
Add backend graph persistence service with Firestore (prod) and local fallback (dev), then expose load/save endpoints.

## Acceptance Criteria
- [ ] Service supports `loadGraph(clientId)` and `saveGraph(clientId, graph)`.
- [ ] Route endpoints:
  - [ ] `POST /api/graph/state/load`
  - [ ] `POST /api/graph/state/save`
- [ ] Schema validation and normalization applied.
