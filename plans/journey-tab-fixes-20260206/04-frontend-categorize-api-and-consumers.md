# Feature: Frontend Categorize API Call + Consumer Updates

**ID:** 04
**Status:** :white_large_square: Not Started
**Priority:** Medium
**Estimated Complexity:** Medium
**Dependencies:** 02, 03
**Track:** B

## Description

On graph load, call `/api/graph/categorize` for any nodes with "general" or empty category, then update them. Also update `graphMigration.js` `determineCategory()` to accept any category (not just those in CLUSTER_CONFIG) and use `getClusterStyle()` for color lookups.

## Acceptance Criteria

- [ ] On graph load, "general" and empty-category nodes trigger categorize API call
- [ ] API results update node categories in graph state
- [ ] `graphMigration.js` `determineCategory()` no longer rejects unknown categories
- [ ] `graphMigration.js` `createInitialClusters()` uses deterministic color for unknown categories
- [ ] Fire-and-forget pattern (`.catch(() => {})`) — categorize failure doesn't break app

## Implementation Details

### Files to Modify

1. `frontend/src/hooks/useKnowledgeGraph.js` — Add categorize API call in init useEffect
2. `frontend/src/utils/graphMigration.js` — Remove CLUSTER_CONFIG gate in determineCategory, add color fallback in createInitialClusters

### 4a. Categorize API call on load

In useKnowledgeGraph.js init `useEffect`, after `setGraph(...)` (~line 449):

```js
const generalNodes = migratedNodes.filter(n => !n.category || n.category === 'general')
if (generalNodes.length > 0) {
  const existingCategories = [...new Set(
    migratedNodes.map(n => n.category).filter(c => c && c !== 'general')
  )]
  fetch(`${API_BASE}/api/graph/categorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topics: generalNodes.map(n => ({ id: n.id, name: n.name })),
      existingCategories,
    }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.results) {
        setGraph(prev => ({
          ...prev,
          nodes: prev.nodes.map(node => {
            const match = data.results.find(r => r.id === node.id)
            return match ? { ...node, category: match.category } : node
          }),
        }))
      }
    })
    .catch(() => {})
}
```

### 4b. graphMigration.js updates

**determineCategory()** (~line 243):
- Lines 251/258: Remove `if (CLUSTER_CONFIG[normalized])` guard — return the normalized category directly since any AI-suggested category is now valid

**createInitialClusters()** (~line 489):
- Replace `CLUSTER_CONFIG[category] || CLUSTER_CONFIG.general` with a deterministic fallback matching the frontend `getClusterStyle()` pattern (hash-based color from pool)

## Depends On

- **Feature 02:** `getClusterStyle()` must exist, colors must be updated
- **Feature 03:** `/api/graph/categorize` endpoint must exist
