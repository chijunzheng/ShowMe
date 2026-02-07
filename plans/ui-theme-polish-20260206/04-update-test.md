# Feature: StatsBar — Dark Glass Compact Mode

**ID:** 04
**Status:** ⬚ Pending
**Priority:** High
**Dependencies:** 01

## Description

When StatsBar is in compact mode (used in Journey tab), switch from white bg + neobrutalism border to dark glass that blends with the constellation background.

## Files to Modify

- `frontend/src/components/Dashboard/StatsBar.jsx`

## Changes

### Container (compact mode only):
Replace:
```
border-2 border-black dark:border-slate-600 shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#475569]
bg-white dark:bg-slate-800
```
With:
```
bg-night-800/70 backdrop-blur-sm border border-white/10
```

### Stat pill backgrounds (compact mode):
- Streak: `bg-orange-500/10` (keep orange tint)
- Rank: `bg-stardust/10` (was accent-50, now gold tint)
- Topics: `bg-stardust/10` (was primary-50, now gold to match Journey)
- Trophies: `bg-yellow-500/10` (keep yellow tint)

### Text colors in compact mode:
- Values: `text-white` (already correct)
- Labels: `text-white/60` (was `text-slate-500`)

### Non-compact mode
Leave unchanged — it's used on the Learn tab where white bg is correct.
