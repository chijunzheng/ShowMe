# Feature: Hybrid 12-Rank System (Logic + UI)

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** -

## Description
Replace the 7-level topic-only rank system with a 12-level **hybrid** gate that requires both topics learned and XP. Update utilities and UI consumers to pass XP so rank display is consistent.

## Acceptance Criteria
- [x] Ranks use both `minTopics` and `minXP` for progression.
- [x] 12 ranks are defined and used across UI.
- [x] Rank calculations include `topicsToNextRank` and `xpToNextRank`.
- [x] Stats/Sidebar rank display uses user XP, not world XP.

## Implementation Details

### Files to Modify
- `frontend/src/components/ExplorerRank/explorerRankUtils.js`
  - Add 12 rank definitions with `minTopics` + `minXP`.
  - Update `getExplorerRank(topicCount, totalXP)` to apply hybrid gate.
  - Update `getRankProgress(topicCount, totalXP)` to use the limiting dimension.
- `frontend/src/components/Dashboard/StatsBar.jsx`
  - Call `getExplorerRank(topicsLearned, totalXP)`.
- `frontend/src/components/TopicSidebar.jsx`
  - Accept `totalXP` prop and use hybrid rank helpers.
- `frontend/src/App.jsx`
  - Pass `userProgress.points` into StatsBar and TopicSidebar.

### Technical Decisions
- **Decision:** Rank progress uses min(topics progress, XP progress).
- **Trade-off:** Progress bar reflects the stricter requirement; users see they need to improve the weaker side.

## Testing Requirements
- [x] Update `frontend/src/components/ExplorerRank/__tests__/explorerRankUtils.test.js` for new thresholds and XP gate.
- [x] Update ExplorerRankBadge/Progress tests for 12 levels.

## Implementation Checklist
- [x] Update rank definitions (12 levels)
- [x] Update hybrid rank logic
- [x] Update consumers (StatsBar, TopicSidebar, App)
- [x] Update tests

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
