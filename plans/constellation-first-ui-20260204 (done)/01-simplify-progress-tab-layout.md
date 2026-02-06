# Feature: Simplify ProgressTab Layout Structure

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Remove all list-based sections from ProgressTab.jsx and restructure the component to show only a compact stats header and full-screen constellation view. This is the foundation change that enables the constellation-first UI.

## Acceptance Criteria

- [ ] ConstellationPreview component removed
- [ ] DueForReview section removed
- [ ] QuickPractice section removed
- [ ] TopicsByZone section removed
- [ ] Recommended Next section removed
- [ ] Constellation component renders full-screen
- [ ] Stats header remains visible at top
- [ ] Full-height flex layout working correctly
- [ ] No scroll needed to see constellation

## Implementation Details

### Files to Modify

- `frontend/src/components/ProgressTab/ProgressTab.jsx` - Main refactoring
- `frontend/src/components/ProgressTab/index.js` - Clean up exports if needed

### Key Changes

1. **Remove import statements** for unused components:
   ```javascript
   // REMOVE these imports:
   import DueForReview from './DueForReview'
   import QuickPractice from './QuickPractice'
   import TopicsByZone from './TopicsByZone'
   ```

2. **Remove state for ConstellationPreview expansion:**
   ```javascript
   // REMOVE:
   const [isConstellationExpanded, setIsConstellationExpanded] = useState(false)
   const handleConstellationExpand = ...
   const handleConstellationCollapse = ...
   ```

3. **Replace entire JSX structure** with simplified layout:
   ```jsx
   return (
     <div className="flex flex-col h-full">
       {/* Compact stats header */}
       <div className="flex-shrink-0 px-4 pt-4">
         <StatsBar
           streak={streakValue}
           totalXP={totalXP}
           topicsLearned={topicList.length}
           compact={true}
         />
       </div>

       {/* Full-screen constellation */}
       <div className="flex-1 min-h-0">
         <Constellation
           nodes={nodes}
           edges={edges}
           clusters={clusters}
           gaps={gaps}
           onNodeTap={handleNodeTap}
           onEdgeTap={handleEdgeTap}
           onGapTap={handleGapTap}
           className="w-full h-full"
         />
       </div>

       {/* Topic Action Sheet (modal overlay) */}
       <TopicActionSheet
         topic={selectedTopic}
         isOpen={isActionSheetOpen}
         onClose={handleCloseActionSheet}
         onReviewSlideshow={handleReviewFromSheet}
         onLaunchMode={handleLaunchFromSheet}
         onSelectRelatedTopic={handleSelectRelatedTopic}
       />
     </div>
   )
   ```

4. **Remove fullscreen expansion logic** - constellation is always fullscreen now

### Technical Decisions

- **Decision:** Use `flex flex-col h-full` layout with `flex-1 min-h-0`
- **Rationale:** Ensures proper full-height behavior in flex containers, prevents overflow issues
- **Trade-off:** Requires parent container to have defined height (already true for tab content)

## Dependencies

### Depends On
None - This is the foundational change

### Blocks
- **Feature 02:** Constellation enhancements depend on this layout
- **Feature 04:** StatsBar changes depend on knowing final layout structure

## Testing Requirements

- [ ] Unit tests for simplified component structure
- [ ] Visual regression test (compare before/after)
- [ ] Test on multiple screen sizes (375px, 768px, 1024px)
- [ ] Verify no console errors or warnings

## Security Considerations

- [ ] No security implications (UI-only refactoring)

## Implementation Checklist

- [ ] Remove unused imports
- [ ] Remove ConstellationPreview component
- [ ] Remove DueForReview section
- [ ] Remove QuickPractice section
- [ ] Remove TopicsByZone section
- [ ] Remove Recommended Next section
- [ ] Remove expansion state and handlers
- [ ] Implement flex layout
- [ ] Verify Constellation renders full-screen
- [ ] Test responsive behavior
- [ ] Update prop types if needed
- [ ] Remove unused props from component signature

## Verification

**Visual Check:**
```bash
# Start dev server
cd frontend && npm run dev
```

1. Navigate to Progress tab
2. Verify constellation takes up full screen (except header)
3. Verify no list sections visible
4. Verify stats bar at top
5. Check on mobile (375px), tablet (768px), desktop (1024px)

**Code Check:**
```bash
# Search for removed components (should return no results)
grep -r "DueForReview\|QuickPractice\|TopicsByZone" frontend/src/components/ProgressTab/ProgressTab.jsx
```

## Notes

**Important:** Keep the removed component files (DueForReview.jsx, QuickPractice.jsx, TopicsByZone.jsx) for now. Don't delete them until user confirms the new UI works well. They remain in git history and can be restored if needed.

**ConstellationPreview removal:** The inline ConstellationPreview component (lines 41-235) can be deleted entirely - we use the full Constellation component directly now.

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code

## Hotfix: Height Chain Fix

The original `h-full` layout broke because `<main>` in App.jsx has no height constraint, causing `h-full` to resolve to 0px.

**Root cause:** `<main max-w-4xl>` has no height defined → `h-full` on ProgressTab wrapper = 0px → Constellation invisible.

**Fix applied:**
- `ProgressTab.jsx`: Replaced `h-full` with `h-[calc(100dvh-7rem)] md:h-[calc(100dvh-2rem)]` for explicit viewport-based height
- `App.jsx`: Changed Progress wrapper from `h-full` to `w-full` (removed misleading height that doesn't resolve)

**Why these values:**
- Mobile: `100dvh - 7rem` = viewport minus `py-4` (1rem top) + `pb-24` (6rem bottom)
- Desktop: `100dvh - 2rem` = viewport minus `py-4` (1rem top) + `md:pb-4` (1rem bottom)
