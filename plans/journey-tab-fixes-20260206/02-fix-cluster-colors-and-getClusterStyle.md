# Feature: Fix CLUSTER_CONFIG Colors + Add getClusterStyle()

**ID:** 02
**Status:** :white_large_square: Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None
**Track:** B (foundation for 03, 04)

## Description

Fix duplicate/near-duplicate colors in the base CLUSTER_CONFIG, remove the vague "arcane" category, and add a `getClusterStyle()` utility with deterministic color fallback for dynamic AI-suggested categories.

## Acceptance Criteria

- [ ] Remove "arcane" from CLUSTER_CONFIG in all 3 locations (useKnowledgeGraph.js, graphMigration.js, geminiGraph.js)
- [ ] Fix 4 duplicate colors: language→violet, astronomy→teal, nature→lime, civilization→orange
- [ ] Add exported `getClusterStyle(category)` to useKnowledgeGraph.js
- [ ] `getClusterStyle()` returns icon+color for known categories, deterministic hash color for unknown
- [ ] Backend `createDefaultClusters()` has matching color fallback for unknown categories
- [ ] All colors in constellation map are visually distinct

## Implementation Details

### Files to Modify

1. `frontend/src/hooks/useKnowledgeGraph.js` — CLUSTER_CONFIG colors + add getClusterStyle()
2. `frontend/src/utils/graphMigration.js` — Sync CLUSTER_CONFIG colors, use getClusterStyle for lookups
3. `backend/src/services/geminiGraph.js` — Sync createDefaultClusters() colors + add fallback
4. `frontend/src/components/Dashboard/StatDetailSheet.jsx` — Use getClusterStyle() instead of direct lookup

### Color Changes

| Category | Old | New | Reason |
|----------|-----|-----|--------|
| language | #8B5CF6 | #A855F7 | was duplicate purple |
| astronomy | #7C3AED | #2DD4BF | was near-purple, now teal |
| nature | #22C55E | #84CC16 | was near science emerald, now lime |
| civilization | #F59E0B | #F97316 | was same as history, now orange |
| arcane | #8B5CF6 | **REMOVE** | vague catch-all |

### getClusterStyle() Implementation

```js
const DYNAMIC_COLOR_POOL = [
  '#F97316', '#D946EF', '#2DD4BF', '#84CC16', '#A855F7',
  '#FB923C', '#14B8A6', '#E879F9', '#FACC15', '#38BDF8',
]

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getClusterStyle(category) {
  const key = (category || 'general').toLowerCase()
  if (CLUSTER_CONFIG[key]) return CLUSTER_CONFIG[key]
  return {
    icon: '\u{1F4CC}',
    color: DYNAMIC_COLOR_POOL[hashString(key) % DYNAMIC_COLOR_POOL.length],
  }
}
```

### Consumer Updates

**StatDetailSheet.jsx** line 247:
Replace `CLUSTER_CONFIG[category] || CLUSTER_CONFIG.general || { ... }` with `getClusterStyle(category)`

**graphMigration.js**:
- Lines 251/258: Remove `if (CLUSTER_CONFIG[normalized])` guard — any category is valid
- Line 489: Replace `CLUSTER_CONFIG[category] || CLUSTER_CONFIG.general` with deterministic fallback

**geminiGraph.js** `createDefaultClusters()` line 316:
Replace `config[category] || config.general` with deterministic color fallback matching the frontend pattern.

## Blocks

- **Feature 03:** Backend categorization depends on updated colors
- **Feature 04:** Frontend categorize API depends on getClusterStyle()
