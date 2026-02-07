# Journey Tab Follow-up Fixes: Constellation Colors + Multi-Discover Fresh Sets

## Summary
Fix two remaining regressions in Journey/Progress:
1. Constellation stars must always use topic category colors (no unintended gray stars for categorized topics).
2. Discover must return multiple suggestions per click (5), replace the current set, and avoid repeats within the current app session until the unseen pool is exhausted.

## Required Workflow (per AGENTS.md)
1. Save this plan first to `/Users/jasonchi/ShowMe/plans/journey-tab-followup-20260206/00-original-plan.md`.
2. Run `create-features` workflow to split into feature files in `/Users/jasonchi/ShowMe/plans/journey-tab-followup-20260206/`.
3. Implement via parallel coder agents:
   1. Coder A: Constellation color/category parity.
   2. Coder B: Discover freshness + backend gap API/options.
   3. Coder C: Tests/regression updates.
4. After implementation, run 1-3 code-review agents before finalizing.

## Implementation Plan

### 1) Make Constellation color source category-driven (not cluster-membership-dependent)
1. Create shared category-style utilities in `/Users/jasonchi/ShowMe/frontend/src/utils/clusterStyle.js`:
   1. `normalizeCategoryKey(category)` with trim + lowercase + whitespace collapse.
   2. `getClusterStyle(category)` with known map + deterministic fallback color.
   3. `formatCategoryLabel(category)` for legend display.
2. Update `/Users/jasonchi/ShowMe/frontend/src/hooks/useKnowledgeGraph.js` to consume shared utils (keep exported `getClusterStyle` for compatibility via re-export or wrapper).
3. Update `/Users/jasonchi/ShowMe/frontend/src/components/Constellation/Constellation.jsx`:
   1. Compute each star `accentColor` from `node.category` via `getClusterStyle`, independent of `cluster.nodeIds`.
   2. Build legend entries from `nodes` category distribution (not from `clusters`), so legend always matches topic categories.
   3. Keep clusters only for layout/edge grouping.
4. Keep gray only for true uncategorized/general topics.

### 2) Discover returns 5 fresh suggestions each click, replacing current set
1. In `/Users/jasonchi/ShowMe/frontend/src/hooks/useKnowledgeGraph.js`:
   1. Add in-memory `seenSuggestedTopicsRef` (normalized topic names).
   2. Extend `refreshGaps` signature to accept options: `{ targetCount?: number, requireFreshSet?: boolean }`.
   3. Default `targetCount` remains backward-compatible; ProgressTab will pass `5`.
   4. Call `/api/graph/gaps` with `targetCount` and `excludeTopics` (seen set when `requireFreshSet`).
   5. Replace `graph.gaps` with returned set (no append).
   6. If backend returns insufficient fresh items and seen pool is exhausted, clear seen set once and retry once.
2. In `/Users/jasonchi/ShowMe/frontend/src/components/ProgressTab/ProgressTab.jsx`:
   1. Update Discover click path to call `refreshGaps({ targetCount: 5, requireFreshSet: true })`.
   2. Preserve current replace behavior (show only latest returned set).
3. Session freshness scope: current app runtime only (resets on reload).

### 3) Backend gap API supports fresh-set constraints
1. Update `/Users/jasonchi/ShowMe/backend/src/routes/graph.js` `/gaps` route to accept optional:
   1. `targetCount` (clamped integer, e.g. 1-10).
   2. `excludeTopics` (string array).
2. Update `/Users/jasonchi/ShowMe/backend/src/services/geminiGraph.js`:
   1. Change `identifyKnowledgeGaps(graph, options)` to use `targetCount` and `excludeTopics`.
   2. Add excluded-topic list to prompt.
   3. Retry in a bounded loop (up to 3 attempts), aggregating unique suggestions until target count or attempts exhausted.
   4. Filter out existing learned topics and excluded topics before final mapping.
   5. Return at most requested `targetCount`.
3. Keep existing behavior for callers not passing new fields.

## Public API / Interface Changes
1. Frontend hook:
   1. `/Users/jasonchi/ShowMe/frontend/src/hooks/useKnowledgeGraph.js`
   2. `refreshGaps(options?)` where `options` supports `targetCount` and `requireFreshSet`.
2. Backend route:
   1. `POST /api/graph/gaps` request body adds optional `targetCount` and `excludeTopics`.
3. Backend service:
   1. `identifyKnowledgeGaps(graph, options = {})` now accepts freshness/count constraints.

## Tests and Scenarios

### Frontend tests
1. `/Users/jasonchi/ShowMe/frontend/src/components/Constellation/__tests__/Constellation.test.jsx`
   1. Star uses category color even when cluster membership is missing.
   2. Legend categories come from node categories.
2. `/Users/jasonchi/ShowMe/frontend/src/hooks/__tests__/useKnowledgeGraphUtils.test.js` (or new focused test file)
   1. Fresh-gap selection excludes seen topics.
   2. Seen-pool reset-on-exhaustion behavior.
3. `/Users/jasonchi/ShowMe/frontend/src/components/ProgressTab/__tests__/ProgressTab.discover.test.jsx` (new)
   1. Discover requests `targetCount: 5`.
   2. Discover replaces visible suggestions set each click.

### Backend tests
1. `/Users/jasonchi/ShowMe/backend/src/services/__tests__/geminiGraph.test.js`
   1. Honors `excludeTopics`.
   2. Honors `targetCount`.
   3. Aggregates unique suggestions across retries.
2. Add route-level validation test if route test harness exists; otherwise service-level coverage is mandatory.

### Manual validation
1. Open Progress constellation with mixed categories; verify categorized stars are not gray.
2. Click Discover 3+ times:
   1. Each click shows 5 suggestions.
   2. Current set is replaced (not appended).
   3. No repeated suggestion topics until unseen pool is exhausted.

## Assumptions and Defaults
1. Confirmed defaults:
   1. 5 suggestions per Discover click.
   2. Replace-all behavior each click.
   3. No repeat within session until unseen options are exhausted.
2. If backend cannot produce 5 unique suggestions after retries, UI shows available unique results; if zero, existing “No suggestions yet” message remains.
3. No dev server will be started by the agent; manual runtime verification requires user-started server.
