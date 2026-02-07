# Feature: Discover Fresh Set Flow (Frontend)

**ID:** 02
**Status:** ✅ Completed
**Priority:** High
**Dependencies:** -

## Goal
Discover returns 5 suggestions per click, replaces current set, and avoids repeated suggestions in-session.

## Acceptance Criteria
- [x] `refreshGaps(options)` supports `{ targetCount, requireFreshSet }`.
- [x] Seen suggestions tracked in-memory for session only.
- [x] Refresh request sends `targetCount` + `excludeTopics` when needed.
- [x] One fallback retry clears seen set when exhausted.
- [x] ProgressTab discover calls `refreshGaps({ targetCount: 5, requireFreshSet: true })`.

## Files
- `frontend/src/hooks/useKnowledgeGraph.js`
- `frontend/src/components/ProgressTab/ProgressTab.jsx`
