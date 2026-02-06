# Feature: Layout Fixes (Bottom Cutoff + Spatial Spread)

**ID:** 01
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** None

## Description

Fix the constellation being cut off by the bottom navigation bar, and increase spatial separation between topic stars so the constellation feels like an actual star map.

## Acceptance Criteria

- [ ] Constellation is not cut off by bottom navigation bar on desktop
- [ ] Topic stars are spread further apart, not clumped in center
- [ ] Layout scales well with 3-20+ topics
- [ ] Build passes

## Implementation Details

### Files to Modify

- `frontend/src/components/ProgressTab/ProgressTab.jsx`
- `frontend/src/components/Constellation/useConstellationLayout.js`

### ProgressTab.jsx — Fix bottom cutoff

**Line ~154:** Change desktop height calculation
- Current: `md:h-[calc(100dvh-2rem)]`
- New: `md:h-[calc(100dvh-5rem)]`
- Reason: Bottom bar is `h-16` (64px). 5rem = 80px gives breathing room.

### useConstellationLayout.js — Increase spatial separation

**Lines 20-28:** Change DEFAULT_CONFIG values:
- `repulsion: 5000` → `repulsion: 15000` (3x stronger node push-apart)
- `clusterRepulsion: 2000` → `clusterRepulsion: 8000` (4x stronger cluster separation)
- `clusterGravity: 0.05` → `clusterGravity: 0.02` (looser intra-cluster grouping)

**Line 42:** Increase initial circle radius:
- Current: `Math.min(200, 50 * Math.sqrt(nodes.length))`
- New: `Math.min(350, 80 * Math.sqrt(nodes.length))`

## Implementation Checklist

- [ ] Edit ProgressTab.jsx — fix desktop height
- [ ] Edit useConstellationLayout.js — tune layout constants
- [ ] Verify build

---

**Created:** 2026-02-05
