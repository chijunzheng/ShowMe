# Feature: Hide Gaps Until Discover

**ID:** 01
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** None

## Description

Hide recommended/suggested topics (gaps) in the constellation until the user clicks "Discover". Currently gaps load from localStorage and appear immediately. After this change, gaps are gated behind a session-level boolean.

## Acceptance Criteria

- [ ] On fresh page load, constellation shows NO gap nodes
- [ ] After clicking "Discover", gaps appear as normal
- [ ] If user navigates away and back to Journey tab (same session), gaps remain visible
- [ ] No changes needed to useKnowledgeGraph.js or Constellation.jsx

## Implementation Details

### Files to Modify

- `frontend/src/components/ProgressTab/ProgressTab.jsx`

### Changes

1. Add state: `const [hasDiscoveredThisSession, setHasDiscoveredThisSession] = useState(false)` (near line 60)
2. Gate gaps (replace line 70):
   ```js
   const rawGaps = graphGapsProp ?? internalGraph.gaps
   const gaps = hasDiscoveredThisSession ? rawGaps : []
   ```
3. In `handleDiscover` (line ~180), after `refreshGaps()` succeeds, call `setHasDiscoveredThisSession(true)`

---

**Created:** 2026-02-06
