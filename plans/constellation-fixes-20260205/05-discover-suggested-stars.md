# Feature: Discover Suggested Stars + Gap Edges

**ID:** 05
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** -

## Description
Update Discover so it surfaces suggested topics directly on the constellation as gap stars connected by dashed edges. Only start generation when the user clicks a suggested star.

## Acceptance Criteria
- [x] Discover shows suggested stars (gaps) on the constellation
- [x] Suggested stars are connected to related nodes with dashed edges
- [x] Clicking a suggested star triggers topic generation
- [x] Discover replaces existing suggestions

## Implementation Details

### Files to Modify
- `frontend/src/components/ProgressTab/ProgressTab.jsx` - Discover now calls gaps refresh
- `frontend/src/App.jsx` - Pass `refreshGaps` into ProgressTab
- `frontend/src/components/Constellation/Constellation.jsx` - Render dashed edges for gaps
- `frontend/src/components/Constellation/constellationUtils.js` - Support legacy gap ids
- `frontend/src/hooks/useKnowledgeGraph.js` - Keep gaps on reconcile/delete when using `connectsTo`

### Key Components
1. **Discover flow**
   - Calls `/api/graph/gaps` via `refreshGaps`
   - Updates `gaps` in the knowledge graph
2. **Gap edges**
   - Dashed SVG lines from `connectsTo` nodes to gap positions
3. **Gap selection**
   - Click gap to call `onSelectSuggestedTopic`

## Testing Requirements
- [x] Manual QA: Discover shows suggested stars and dashed edges
- [x] Manual QA: Clicking star starts generation

## Implementation Checklist
- [x] Update ProgressTab discover handler
- [x] Render dashed gap edges
- [x] Wire refreshGaps from App
- [x] Update gap handling in graph hook

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
