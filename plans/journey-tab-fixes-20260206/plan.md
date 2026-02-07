# Journey Tab Post-Implementation Fixes

3 issues: streak calendar empty, topics miscategorized, constellation colors hard to distinguish.

---

## 1. Streak Calendar: Backfill activeDates for Existing Users

**Root Cause:** `activeDates` field was added but existing users have no historical data. `normalizeProgress()` defaults to `[]`, so calendar renders empty despite streak=2.

**Fix:** In `normalizeProgress()`, if `activeDates` is empty but `lastActiveDate` exists, backfill based on streak count.

**File:** `backend/src/services/userProgress.js` — `normalizeProgress()` (~line 405)

After the existing normalization return object is built, add backfill:
```js
// Backfill activeDates from lastActiveDate + streakCount if empty
if (result.activeDates.length === 0 && result.lastActiveDate) {
  const lastDate = new Date(result.lastActiveDate)
  const dates = []
  for (let i = Math.min(result.streakCount, 30) - 1; i >= 0; i--) {
    const d = new Date(lastDate)
    d.setDate(d.getDate() - i)
    dates.push(getDateKey(d))
  }
  result = { ...result, activeDates: dates }
}
```

Build new object (immutability). Backfill is approximate but better than empty.

---

## 2. Topic Categorization: Hybrid AI-Powered (Flash-Lite)

**Root Cause:** `discoverRelationships()` prompt doesn't list categories — Gemini returns free-text that often defaults to "general". Regex fallback (`inferCluster()`) has insufficient keyword coverage.

**Approach:** Hybrid — AI sees existing categories from the learner's graph as context, can pick one OR suggest a new category. New categories get auto-assigned colors via deterministic hash. Constellation grows organically with the learner's interests.

### 2a. Fix `discoverRelationships()` prompt — pass existing categories as hints

**File:** `backend/src/services/geminiGraph.js` — `discoverRelationships()` (line 376)

Replace the cluster suggestion line with category-aware prompt including existing categories list and icon suggestion.

### 2b. Add `categorizeTopic()` function — hybrid approach

**File:** `backend/src/services/geminiGraph.js` — add after `inferCluster()` (~line 283)

New exported function that uses FAST_MODEL to classify a topic into a category, preferring existing categories from the learner's graph. Falls back to `inferCluster()` on error.

### 2c. Add `/api/graph/categorize` endpoint

**File:** `backend/src/routes/graph.js` — add new route after `/discover`

Accepts `{ topics: [{id, name}], existingCategories: string[] }`, returns batch categorization results. Max 20 topics per request.

### 2d. Frontend: Dynamic category color system

**File:** `frontend/src/hooks/useKnowledgeGraph.js`

Keep `CLUSTER_CONFIG` as the base set. Add exported `getClusterStyle()` utility with deterministic color fallback for AI-suggested categories using a hash function and color pool.

### 2e. Frontend: Call `/api/graph/categorize` for "general" nodes on load

**File:** `frontend/src/hooks/useKnowledgeGraph.js` — init `useEffect` (~line 449, after `setGraph(...)`)

After loading graph, find nodes with category "general" or empty, call the categorize API, and update them with proper categories.

### 2f. Update consumers to use `getClusterStyle()`

**Files:**
- `frontend/src/components/Dashboard/StatDetailSheet.jsx` (line 247) — replace direct CLUSTER_CONFIG lookup
- `frontend/src/utils/graphMigration.js` (lines 251, 258, 489) — remove fixed-category validation gates, use getClusterStyle for color lookups

**File:** `backend/src/services/geminiGraph.js` — `createDefaultClusters()` (line 317) — add deterministic color fallback for unknown categories.

---

## 3. Constellation Colors: Fix Duplicate Hues in Base Set

**Root Cause:** 3 duplicate/near-duplicate colors in CLUSTER_CONFIG.

**File:** `frontend/src/hooks/useKnowledgeGraph.js` — `CLUSTER_CONFIG` (line 70)

Remove "arcane" entirely (vague catch-all — AI will classify those topics properly). Fix 4 colors:

| Category | Old | New | Reason |
|----------|-----|-----|--------|
| language | #8B5CF6 | #A855F7 (violet) | was duplicate purple |
| astronomy | #7C3AED | #2DD4BF (teal) | was near-purple, now distinct |
| nature | #22C55E | #84CC16 (lime) | was near science emerald |
| civilization | #F59E0B | #F97316 (orange) | was same as history |
| arcane | — | **REMOVE** | vague, AI handles this now |

Also sync backend `createDefaultClusters()` config in `geminiGraph.js` (~line 301) and `graphMigration.js` CLUSTER_CONFIG.

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `backend/src/services/userProgress.js` | Backfill activeDates in normalizeProgress |
| `backend/src/services/geminiGraph.js` | Fix discover prompt (hybrid hints), add `categorizeTopic()`, update cluster colors |
| `backend/src/routes/graph.js` | Add `/api/graph/categorize` endpoint |
| `frontend/src/hooks/useKnowledgeGraph.js` | Add `getClusterStyle()` + color pool, fix CLUSTER_CONFIG colors, call categorize API |
| `frontend/src/components/Dashboard/StatDetailSheet.jsx` | Use `getClusterStyle()` instead of direct CLUSTER_CONFIG lookup |
| `frontend/src/utils/graphMigration.js` | Use `getClusterStyle()`, remove fixed-category validation gates, sync colors |

## Parallel Execution

| Track | Files | Independent? |
|-------|-------|-------------|
| A: Streak backfill | `userProgress.js` | Yes |
| B: Categorization + Colors | `geminiGraph.js`, `graph.js`, `useKnowledgeGraph.js`, `StatDetailSheet.jsx`, `graphMigration.js` | Yes (all related) |

Tracks A and B run in parallel.
