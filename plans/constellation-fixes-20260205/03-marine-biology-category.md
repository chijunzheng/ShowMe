# Feature: Marine Biology Category + Migration

**ID:** 03
**Status:** ✅ Completed
**Priority:** Medium
**Estimated Complexity:** Medium
**Dependencies:** -

## Description
Add a dedicated `marine biology` category/cluster and update category detection so topics like “Whale Songs” are grouped under it. Re-evaluate existing nodes to migrate categories/clusters.

## Acceptance Criteria
- [ ] `marine biology` cluster exists with icon/color
- [ ] Keyword mapping assigns marine topics to the category
- [ ] Existing nodes are migrated so the cluster is visible

## Implementation Details

### Files to Modify
- `frontend/src/hooks/useKnowledgeGraph.js` - cluster config + migration step
- `frontend/src/utils/graphMigration.js` - cluster config + keyword detection

### Key Components
1. **CLUSTER_CONFIG**
   - Add `marine biology` entry
2. **determineCategory**
   - Add keyword rule (marine/ocean/whale/etc)
3. **Graph load migration**
   - Re-evaluate existing nodes and rebuild clusters

### Technical Decisions
- **Decision:** Single-category nodes; no multi-category support

## Testing Requirements
- [ ] Unit test for `determineCategory` (marine keywords)
- [ ] Manual QA: Marine Biology cluster shows

## Implementation Checklist
- [ ] Add cluster config entry
- [ ] Add keyword rule in determineCategory
- [ ] Add migration/recluster step on load
- [ ] Verify in UI

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
