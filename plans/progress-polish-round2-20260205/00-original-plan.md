# Progress/Journey Page - Polish Round 2

## Summary
5 UI polish fixes from screenshot review.

---

## Fix 1: Remove trophies and rank overlay from constellation map

**Problem:** The rank badge + progress bar (top-left) and trophy showcase (top-right) clutter the constellation.

**File:** `ProgressTab.jsx`

**Changes:**
- Remove the `data-testid="progress-overlay"` div (lines 279–333) — contains `ExplorerRankBadge` + `TrophyShowcase`
- Remove now-unused imports: `TrophyShowcase`, `ExplorerRankBadge`, `EXPLORER_RANKS`, `getRankProgress`
- Remove related state/logic: `rankProgress`, `nextRank`, `nextRankIndex`, `nextNextRank`, `showTrophies`, `BADGE_ICON_MAP`, `getBadgeIcon`, `newBadgeIds`, `seenBadgeIds`, `isRecentlyEarned`, badge sheet state/handlers, badge sheet modal JSX (lines 346-398)
- Keep `rankInfo` (still needed for Fix 2's `rankIcon`)
- Remove `onTrophyClick={handleBadgeSelect}` from `StatDetailSheet`

---

## Fix 2: Add labels to StatsBar + replace XP star with rank icon

**Problem:** Compact mode hides labels. XP shows generic star — should show rank icon instead.

**Files:** `StatsBar.jsx`, `ProgressTab.jsx`

**StatsBar.jsx changes:**
- Add `rankIcon` prop (string emoji)
- Always show labels (remove `{!compact && ...}` guard)
- Replace XP emoji star with `{rankIcon || star}`

**ProgressTab.jsx changes:**
- Pass `rankIcon={rankInfo?.icon}` to `<StatsBar>`

---

## Fix 3: Dropdown instead of bottom sheet

**Problem:** Bottom sheet covers too much. A dropdown below the stats bar is cleaner.

**File:** `StatDetailSheet.jsx`

**Changes:**
- Change `items-end` to `items-start` (anchor to top)
- Replace `rounded-t-3xl` with `rounded-2xl`
- Remove bottom-sheet border/shadow styling
- Add `mt-16 mx-4` to position below stats bar
- Reduce `max-h` from `85vh` to `70vh`
- Keep backdrop, escape, and click-to-close

---

## Fix 4: Constellation bottom cut off

**Problem:** Bottom nodes/labels get clipped by `overflow-hidden`.

**File:** `Constellation.jsx`

**Change:** Offset `centerY` upward when passing to layout:
```js
centerY: containerSize.height / 2 - 20,
```

---

## Fix 5: Constellation cluster cleanup

**Problem:** "General" label visible, cluster labels overlap stars, lightbulb icon misplaced.

**Files:** `Constellation.jsx`, `ConstellationCluster.jsx`

**Constellation.jsx:**
- Filter out `general` cluster from both cluster label rendering and nebula calculation

**ConstellationCluster.jsx:**
- Position label at **top** of cluster bounding box (min Y of node positions minus offset) instead of centroid
- Add subtle text shadow for readability

---

## Execution: 3 parallel agents
- **Agent A:** Fix 1 + 2 → `ProgressTab.jsx`, `StatsBar.jsx`
- **Agent B:** Fix 3 → `StatDetailSheet.jsx`
- **Agent C:** Fix 4 + 5 → `Constellation.jsx`, `ConstellationCluster.jsx`
