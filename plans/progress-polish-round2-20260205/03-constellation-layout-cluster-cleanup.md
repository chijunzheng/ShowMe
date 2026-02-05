# Feature: Constellation layout fix + cluster label cleanup

**ID:** 03
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Fix the constellation bottom clipping issue and clean up cluster labels. The bottom portion of the constellation gets cut off. The "General" cluster label is visible and unhelpful. Cluster labels overlap with star nodes instead of appearing above them.

## Acceptance Criteria

- [ ] Bottom nodes and their labels are fully visible (not clipped)
- [ ] "General" cluster label and nebula are hidden
- [ ] Cluster labels appear above the topmost star in their cluster (not at centroid)
- [ ] Cluster labels have readable text with subtle shadow
- [ ] Build passes

## Implementation Details

### Files to Modify

- `frontend/src/components/Constellation/Constellation.jsx` — layout offset + general filter
- `frontend/src/components/Constellation/ConstellationCluster.jsx` — label positioning

### Constellation.jsx Changes

**Fix 4 — Bottom clipping:**
- Change `centerY` passed to `useConstellationLayout`:
  ```js
  centerY: containerSize.height / 2 - 20,
  ```
  This shifts the entire layout upward by 20px, giving bottom nodes breathing room.

**Fix 5 — Filter "general" cluster:**
- Create a filtered clusters list for rendering:
  ```js
  const displayClusters = clusters.filter(c => c.name?.toLowerCase() !== 'general')
  ```
- Use `displayClusters` instead of `clusters` in:
  - The cluster labels rendering loop (`{clusters.map((cluster) => ...}`)
  - The `nebulaData` calculation (replace `clusters` with `displayClusters`)

### ConstellationCluster.jsx Changes

**Position at top of cluster instead of centroid:**
- Change centroid calculation to find the **minimum Y** (topmost node position) instead of average Y
- Keep average X for horizontal centering
- Position the label above the top node: `top: minY - 30` (30px above topmost star)
- This prevents label-star overlap

**Readability improvements:**
- Add `textShadow: '0 1px 4px rgba(0,0,0,0.6)'` to the label div for contrast on dark backgrounds

## Testing Requirements

- [ ] Build passes (`npm run build`)
- [ ] Constellation renders without "General" label
- [ ] Cluster labels don't overlap with stars
- [ ] Bottom nodes visible

## Implementation Checklist

- [ ] Edit Constellation.jsx — centerY offset + general filter
- [ ] Edit ConstellationCluster.jsx — top-of-cluster positioning + text shadow
- [ ] Verify build

---

**Created:** 2026-02-05
