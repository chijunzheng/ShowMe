# Feature: Clean constellation overlay + StatsBar labels

**ID:** 01
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Remove the cluttered rank badge + trophy showcase overlay from the constellation map. Add always-visible labels to StatsBar stats, and replace the generic XP star icon with the user's current rank icon.

## Acceptance Criteria

- [ ] Constellation map has no overlays (no rank badge, no trophy showcase)
- [ ] All 4 stats in StatsBar show text labels (Streak, XP, Topics, Trophies) even in compact mode
- [ ] XP stat shows the user's current rank icon instead of generic star
- [ ] No unused imports, state, or dead code remaining
- [ ] Build passes

## Implementation Details

### Files to Modify

- `frontend/src/components/ProgressTab/ProgressTab.jsx` — Remove overlay, remove dead code, pass rankIcon
- `frontend/src/components/Dashboard/StatsBar.jsx` — Add rankIcon prop, always show labels

### ProgressTab.jsx Changes

**Remove imports:**
- `TrophyShowcase` from `'../Dashboard'`
- `ExplorerRankBadge` from `'../ExplorerRank'`
- `EXPLORER_RANKS`, `getRankProgress` from `'../ExplorerRank/explorerRankUtils'`

**Remove state/logic:**
- `BADGE_ICON_MAP` constant and `getBadgeIcon` function
- `selectedBadge`, `isBadgeSheetOpen` state
- `seenBadgeIds` state (localStorage-backed)
- `rankProgress`, `nextRank`, `nextRankIndex`, `nextNextRank` computed values
- `showTrophies` computed value
- `isRecentlyEarned` callback
- `newBadgeIds` memo
- `seenBadgeIds` sync useEffect
- `handleBadgeSelect`, `handleCloseBadgeSheet` callbacks

**Remove JSX:**
- `data-testid="progress-overlay"` div (lines ~279–333) containing ExplorerRankBadge and TrophyShowcase
- Badge sheet modal (lines ~346–398)
- `onTrophyClick={handleBadgeSelect}` prop from StatDetailSheet

**Keep:**
- `rankInfo` computed value — needed for `rankIcon`

**Add:**
- `rankIcon={rankInfo?.icon}` prop on `<StatsBar>`

### StatsBar.jsx Changes

- Add `rankIcon` prop (string, optional)
- Remove the `{!compact && ...}` conditional around all 4 label `<span>` elements — labels always visible
- Replace XP icon `{'\u2b50'}` with `{rankIcon || '\u2b50'}`
- Add `rankIcon` to PropTypes

## Testing Requirements

- [ ] Build passes (`npm run build`)
- [ ] Constellation renders without overlays
- [ ] StatsBar shows labels in compact mode

## Implementation Checklist

- [ ] Edit ProgressTab.jsx — remove overlay and dead code
- [ ] Edit StatsBar.jsx — add labels + rankIcon
- [ ] Verify build

---

**Created:** 2026-02-05
