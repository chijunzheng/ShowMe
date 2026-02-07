# Feature: Label Declutter + Stats Bar Simplification + Suggested Dedup

**ID:** 08
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 05, 07

## Description
Reduce label overlap in the constellation, simplify the StatsBar to avoid Rank/XP duplication while adding clear labels, and prevent duplicate suggested topics by merging suggestions with generated topics and wiring edges.

## Acceptance Criteria
- [ ] Labels avoid overlap via smart hide + hover reveal
- [ ] StatsBar shows only Rank (no XP tile) and labels for all stats
- [ ] Suggested topic generation does not create duplicate nodes
- [ ] Generated suggested topic connects to nodes from the gap

## Implementation Details

### Files to Modify
- `frontend/src/components/Constellation/Constellation.jsx` - label visibility calculation
- `frontend/src/components/Constellation/ConstellationStar.jsx` - conditional labels
- `frontend/src/components/Constellation/ConstellationGap.jsx` - conditional labels
- `frontend/src/components/Dashboard/StatsBar.jsx` - remove XP tile, add labels
- `frontend/src/App.jsx` - pass suggested meta to generation
- `frontend/src/hooks/useQuestionHandler.js` - forward suggested meta
- `frontend/src/hooks/useKnowledgeGraph.js` - dedup + connect suggested topic

## Testing Requirements
- [ ] Manual: dense labels declutter with hover reveal
- [ ] Manual: StatsBar shows rank only, labels present
- [ ] Manual: suggested topic generates single node connected to sources

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
