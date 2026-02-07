# Feature: Stats Bar Fix Rank Sizing

**ID:** 03
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Low
**Dependencies:** None

## Description

The Rank stat button in StatsBar has 4 lines (icon, title, XP, label) while the other 3 stats have 3 lines. This makes the buttons uneven height. Fix by removing the standalone "Rank" label line and moving XP into the label position.

## Acceptance Criteria

- [ ] Rank stat button has exactly 3 child elements: icon, title, XP label
- [ ] All 4 stat buttons are visually the same height
- [ ] XP shows in the label position with same styling as other labels

## Implementation Details

### Files to Modify

- `frontend/src/components/Dashboard/StatsBar.jsx` (lines 149-168)

### Changes

Replace the Rank button content (lines 164-167):
```jsx
// BEFORE (4 lines)
<span className="text-xl">{rankDisplayIcon}</span>
<span className="font-bold text-slate-800 dark:text-white">{rankInfo.title}</span>
<span className="text-[10px] text-slate-500 dark:text-slate-400">{formatNumber(safeXP)} XP</span>
<span className={labelClass}>Rank</span>

// AFTER (3 lines)
<span className="text-xl">{rankDisplayIcon}</span>
<span className="font-bold text-slate-800 dark:text-white">{rankInfo.title}</span>
<span className={labelClass}>{formatNumber(safeXP)} XP</span>
```

---

**Created:** 2026-02-06
