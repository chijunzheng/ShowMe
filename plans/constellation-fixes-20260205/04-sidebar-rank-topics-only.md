# Feature: Sidebar Rank Topics-Only

**ID:** 04
**Status:** ✅ Completed
**Priority:** Medium
**Estimated Complexity:** Low
**Dependencies:** -

## Description
Make the TopicSidebar rank bar compute rank and progress based only on topic count, not XP gating.

## Acceptance Criteria
- [ ] Sidebar rank bar does not show "0 to Space Cadet" when topics threshold reached
- [ ] Rank and progress are based on topics only

## Implementation Details

### Files to Modify
- `frontend/src/components/ExplorerRank/explorerRankUtils.js` - add topics-only helpers
- `frontend/src/components/TopicSidebar.jsx` - use new helpers

### Key Components
1. **getExplorerRankByTopics**
2. **getRankProgressByTopics**

## Testing Requirements
- [ ] Unit tests for new helpers
- [ ] Manual QA in sidebar

## Implementation Checklist
- [ ] Add helper functions
- [ ] Update TopicSidebar usage
- [ ] Verify UI

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
