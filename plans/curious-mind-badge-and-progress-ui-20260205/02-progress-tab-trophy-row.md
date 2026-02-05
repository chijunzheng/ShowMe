# Feature: Show Earned Badges in Progress Tab (Compact Trophy Row)

**ID:** 02  
**Status:** ✅ Completed  
**Priority:** Medium  
**Estimated Complexity:** Low  
**Dependencies:** 01

## Description
Add a compact “Trophies” row to the Progress tab, so badges like "Curious Mind" are visible persistently, not only via toast notifications.

## Acceptance Criteria
- [ ] When the user has earned at least one badge, the Progress tab shows a compact trophy row with badge name + icon.
- [ ] When the user has earned no badges, the UI should show either nothing or the existing empty-state presentation (no errors).
- [ ] Trophy row does not dominate the Progress UI (keeps Constellation as the primary surface).

## Implementation Details

### Files to Modify
- `frontend/src/App.jsx`
  - Build `earnedTrophies` array from `progress.badges`, `badges` (definitions), and `progress.badgeUnlockDates`.
  - Pass `earnedTrophies` into ProgressTab.
- `frontend/src/components/ProgressTab/ProgressTab.jsx`
  - Render `TrophyShowcase` under `StatsBar` (maxVisible ~5-8).
  - Keep spacing compact.

### Data Shape
Use `TrophyShowcase` expected props:
```js
{ id, name, description, icon, earnedAt }
```

## Testing Requirements
- [ ] Minimal render test (or update existing Progress tab tests if present) ensuring trophies render with a known badge list.

## Implementation Checklist
- [ ] Map user progress badge IDs + definitions into trophies.
- [ ] Add trophy row component to Progress tab layout.
- [ ] Ensure graceful handling when progress/badges are loading or null.

---

**Created:** 2026-02-05  
**Last Updated:** 2026-02-05  
**Implemented By:** Codex
