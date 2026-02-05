# Feature: Locked Badges + Locked Ranks UI in Progress

**ID:** 03
**Status:** ✅ Completed
**Priority:** Medium
**Estimated Complexity:** Medium
**Dependencies:** 01, 02

## Description
Display locked badges and upcoming ranks to motivate learning without overwhelming the Progress screen or pushing the constellation down.

## Acceptance Criteria
- [x] Locked badges display with silhouette/lock styling and criteria text in details.
- [x] Progress shows current rank + next ranks with requirements (topics + XP).
- [x] Constellation height remains unchanged (no layout pushdown).

## Implementation Details

### UI Behavior
- **Badges:** compact overlay row in the constellation container (top-right).
- **Ranks:** compact overlay card in constellation container (top-left).
- **Details:** click on badge opens a small detail sheet with criteria + progress.

### Files to Modify
- `frontend/src/components/Dashboard/TrophyShowcase.jsx`
  - Support `locked`, `progressCurrent`, `progressTarget`, `criteriaText`.
  - Add lock overlay + muted style for locked.
- `frontend/src/components/ProgressTab/ProgressTab.jsx`
  - Render overlay badges + rank card inside constellation container.
  - Add state for badge detail sheet and seen-badge tracking.
- `frontend/src/App.jsx`
  - Build full badge list (locked + unlocked) with progress fields.

## Testing Requirements
- [x] Update TrophyShowcase tests for locked state.
- [x] Update ProgressTab tests to ensure overlay renders without layout shift.

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
