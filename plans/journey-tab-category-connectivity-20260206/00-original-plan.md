# Journey Tab Fix Plan: Make Same-Color Topics Behave as One Connected Cluster (Visual-Only)

## Summary
The current map uses category for color, but uses stored `clusters` and real `edges` for grouping/connectivity. That creates mismatches (same color but not same cluster, and not connected).  
This fix will make constellation grouping and connectivity category-driven in the UI layer, without mutating stored graph data.

## Goal and Success Criteria
1. Every topic with the same category color is treated as the same visual cluster in the constellation.
2. Same-color topics are visually connected even when no direct knowledge edge exists.
3. Existing real knowledge edges remain intact and interactive.
4. Inferred same-category links are visual-only and non-interactive.
5. No backend/API/storage schema changes.

## Required Workflow (per `/Users/jasonchi/ShowMe/AGENTS.md`)
1. Save this plan to `/Users/jasonchi/ShowMe/plans/journey-tab-category-connectivity-20260206/00-original-plan.md`.
2. Run `create-features` workflow to split this plan into feature files in `/Users/jasonchi/ShowMe/plans/journey-tab-category-connectivity-20260206/`.
3. Implement with parallel coder tracks:
4. Track A: Category cluster derivation + inferred connectivity utility.
5. Track B: Constellation integration (layout, rendering, edge grouping).
6. Track C: Regression tests.
7. Run 1-3 code-review agents after implementation.

## Implementation Design

### 1) Add category-cluster + inferred-connection utility
1. Create `/Users/jasonchi/ShowMe/frontend/src/components/Constellation/constellationCategoryGraph.js`.
2. Export `buildVisualCategoryClusters(nodes)`:
3. Group nodes by normalized category (`normalizeCategoryKey` from `/Users/jasonchi/ShowMe/frontend/src/utils/clusterStyle.js`).
4. Build cluster objects with deterministic shape: `{ id, key, name, color, icon, nodeIds }`.
5. Exclude categories with zero nodes.
6. Export `buildInferredCategoryEdges(nodes, edges)`:
7. Only consider non-`general` categories with at least 2 nodes.
8. Build category-local connectivity graph from real edges where both endpoints are same category.
9. Find connected components per category.
10. If a category has `k` components, add `k-1` inferred links to connect components in deterministic order (minimal connector strategy, not full mesh).
11. Use stable representative selection per component (lexicographically smallest normalized topic name; fallback node id).
12. Return inferred edges as UI-only records: `{ id, from, to, categoryKey, inferred: true }`.

### 2) Make constellation clustering category-driven
1. Update `/Users/jasonchi/ShowMe/frontend/src/components/Constellation/Constellation.jsx`.
2. Compute `visualClusters = buildVisualCategoryClusters(nodes)` via `useMemo`.
3. Pass `visualClusters` (not `props.clusters`) into `useConstellationLayout(...)` so force layout pulls same-color topics together.
4. Build `nodeClusterMap` from `visualClusters` so edge grouping (intra vs cross) aligns with color/category.
5. Keep `props.clusters` only for backward compatibility where needed, but not for visual grouping decisions.

### 3) Render inferred same-category links
1. In `/Users/jasonchi/ShowMe/frontend/src/components/Constellation/Constellation.jsx`, compute `inferredCategoryEdges = buildInferredCategoryEdges(nodes, edges)`.
2. Render inferred edges in a dedicated SVG group before interactive real edges.
3. Style inferred edges as subtle visual scaffolding:
4. `stroke`: category color from `getClusterStyle(categoryKey).color`.
5. `strokeDasharray`: `5 5`.
6. `strokeWidth`: `1`.
7. `opacity`: around `0.22-0.30`.
8. `pointer-events`: none.
9. No click/keyboard handlers and no `onEdgeTap` trigger.
10. Keep current real edges rendering unchanged and interactive.

### 4) Keep legend behavior consistent
1. Continue deriving legend from `nodes` category distribution (already category-based).
2. Ensure legend categories and visual clusters are sourced from the same normalized category keys.
3. Keep `general` handling unchanged for star colors; do not create inferred category links for `general`.

## Public API / Interface Changes
1. No backend route or service changes.
2. No persistence schema changes for graph data.
3. New internal frontend utility module:
4. `/Users/jasonchi/ShowMe/frontend/src/components/Constellation/constellationCategoryGraph.js`.
5. `Constellation` behavior changes:
6. Visual clustering and visual category connectivity become category-derived and independent from stored `clusters`.

## Tests and Scenarios

### Unit tests (new)
1. Add `/Users/jasonchi/ShowMe/frontend/src/components/Constellation/__tests__/constellationCategoryGraph.test.js`.
2. `buildVisualCategoryClusters` groups same normalized category keys.
3. `buildInferredCategoryEdges` returns no links for already-connected same-category components.
4. `buildInferredCategoryEdges` returns minimal `k-1` links for `k` disconnected components.
5. `general` category yields no inferred links.
6. Output is deterministic (stable order and IDs).

### Constellation integration tests (update)
1. Update `/Users/jasonchi/ShowMe/frontend/src/components/Constellation/__tests__/Constellation.test.jsx`.
2. Same-category nodes render inferred category link when disconnected by real edges.
3. Inferred category links are non-interactive (no `onEdgeTap` calls).
4. Edge grouping uses category-derived visual clusters even if `props.clusters` is inconsistent.
5. Real edges still render with existing behavior (`constellation-edge-*` / `constellation-cross-edge-*`).

### Verification commands
1. `cd /Users/jasonchi/ShowMe/frontend && npm test -- --run src/components/Constellation/__tests__/constellationCategoryGraph.test.js src/components/Constellation/__tests__/Constellation.test.jsx`
2. `cd /Users/jasonchi/ShowMe/frontend && npx eslint src/components/Constellation/Constellation.jsx src/components/Constellation/constellationCategoryGraph.js src/components/Constellation/__tests__/constellationCategoryGraph.test.js src/components/Constellation/__tests__/Constellation.test.jsx`

### Manual validation
1. Open Progress constellation with mixed categories.
2. Confirm same-color nodes are spatially grouped.
3. Confirm each same-color group is visually connected (at least one path within category).
4. Confirm inferred category links are subtle and non-clickable.
5. Confirm tapping real edges still opens relationship behavior as before.

## Risks and Mitigations
1. Risk: visual clutter from extra links.
2. Mitigation: minimal connector strategy (`k-1` only), low opacity, dashed style, non-general only.
3. Risk: confusion between inferred vs real relationships.
4. Mitigation: keep inferred lines subtle and non-interactive; preserve real edges as the only interactive links.

## Assumptions and Defaults
1. Chosen mode: **visual inferred connections** (not persisted) for same-color categories.
2. Connectivity strategy: **minimal connectors between disconnected components**, not full mesh.
3. `general` category stays excluded from inferred connectivity.
4. Backend remains unchanged.
