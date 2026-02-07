# Feature: Mastery Mechanism Redesign (Bloom's Taxonomy + Spaced Repetition)

**ID:** 04
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** None

## Description

Replace the single `mastery` number per topic node with a Bloom's Taxonomy-based system of 4 independent per-mode scores, plus spaced repetition decay. Also export `CLUSTER_CONFIG` for use by Feature 05.

## Acceptance Criteria

- [ ] Each node stores `masteryScores: { slideshow, mystery, wonder, story }` instead of `mastery`
- [ ] `computeMastery()` and `computeDisplayedMastery()` utility functions added
- [ ] `addTopic()` sets `masteryScores: { slideshow: 1.0, mystery: 0, wonder: 0, story: 0 }`
- [ ] `updateMastery()` replaced with `updateModeMastery(nodeId, mode, score)` — best score kept
- [ ] `getBrightness()` uses displayed mastery (after decay) as input
- [ ] Backward compat migration: old `mastery` number → `masteryScores`
- [ ] `CLUSTER_CONFIG` exported from useKnowledgeGraph.js
- [ ] ConstellationStar uses computed displayed mastery for brightness and aria-label
- [ ] Stars dim over time based on decay formula
- [ ] Decay floor at 20%, rate 0.98/day

## Implementation Details

### Files to Modify

- `frontend/src/hooks/useKnowledgeGraph.js`
- `frontend/src/components/Constellation/ConstellationStar.jsx`

### useKnowledgeGraph.js Changes

1. **Export CLUSTER_CONFIG** (line 70): Change `const CLUSTER_CONFIG` → `export const CLUSTER_CONFIG`

2. **Add utility functions** (after getBrightness):
```js
function computeMastery(masteryScores) {
  const { slideshow = 0, mystery = 0, wonder = 0, story = 0 } = masteryScores || {}
  return (slideshow + mystery + wonder + story) * 0.25
}

function computeDisplayedMastery(masteryScores, lastReviewedAt) {
  const baseMastery = computeMastery(masteryScores)
  const daysSince = (Date.now() - (lastReviewedAt || Date.now())) / (1000 * 60 * 60 * 24)
  const decayFactor = Math.max(0.2, Math.pow(0.98, daysSince))
  return baseMastery * decayFactor
}
```

3. **Export computeMastery and computeDisplayedMastery** for use by StatDetailSheet.

4. **addTopic()** (line ~591): Replace `mastery: 0.25, brightness: 'dim'` with:
```js
masteryScores: { slideshow: 1.0, mystery: 0, wonder: 0, story: 0 },
brightness: getBrightness(0.25), // computeMastery gives 0.25 for slideshow-only
```

5. **Replace updateMastery** (line ~699) with `updateModeMastery(nodeId, mode, score)`:
```js
const updateModeMastery = useCallback((nodeId, mode, score) => {
  setGraph((prev) => ({
    ...prev,
    nodes: prev.nodes.map((node) => {
      if (node.id !== nodeId) return node
      const scores = node.masteryScores || { slideshow: 0, mystery: 0, wonder: 0, story: 0 }
      if (score <= (scores[mode] || 0)) return node // best score kept
      const updatedScores = { ...scores, [mode]: score }
      const displayed = computeDisplayedMastery(updatedScores, Date.now())
      return {
        ...node,
        masteryScores: updatedScores,
        brightness: getBrightness(displayed),
        lastReviewedAt: Date.now(),
      }
    }),
  }))
}, [])
```

6. **Backward compat migration** in initialization useEffect: If a loaded node has `mastery` but no `masteryScores`, migrate:
```js
const oldMastery = node.mastery || 0.25
const slideshowScore = Math.min(1.0, oldMastery / 0.25)
node.masteryScores = { slideshow: slideshowScore, mystery: 0, wonder: 0, story: 0 }
delete node.mastery
```

7. **Update return value**: Replace `updateMastery` with `updateModeMastery` in the returned object.

### ConstellationStar.jsx Changes

Replace direct `node.mastery` read with computed displayed mastery:
```js
// Import computeDisplayedMastery from useKnowledgeGraph
// (or compute inline since the function is simple)

const masteryPercent = useMemo(() => {
  if (node.masteryScores) {
    const { slideshow = 0, mystery = 0, wonder = 0, story = 0 } = node.masteryScores
    const base = (slideshow + mystery + wonder + story) * 0.25
    const daysSince = (Date.now() - (node.lastReviewedAt || Date.now())) / (1000 * 60 * 60 * 24)
    const decay = Math.max(0.2, Math.pow(0.98, daysSince))
    return Math.round(base * decay * 100)
  }
  return Math.round((node.mastery || 0) * 100)
}, [node.masteryScores, node.mastery, node.lastReviewedAt])
```

---

**Created:** 2026-02-06
