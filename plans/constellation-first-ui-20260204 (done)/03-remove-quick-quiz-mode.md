# Feature: Remove Quick Quiz from Topic Action Sheet

**ID:** 03
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** None

## Description

Remove the Quick Quiz mode from the TopicActionSheet component, leaving only three learning modes: Mystery Lab, Wonder Lab, and Story Studio. Update the grid layout to accommodate three modes instead of four.

## Acceptance Criteria

- [ ] Quick Quiz removed from PRACTICE_MODES array
- [ ] Grid layout changed from 2 columns to 3 columns
- [ ] onQuickQuiz prop removed from component
- [ ] handleQuizFromSheet handler removed
- [ ] handleModeClick only calls onLaunchMode
- [ ] All three remaining modes render correctly
- [ ] No console errors or warnings

## Implementation Details

### Files to Modify

- `frontend/src/components/ProgressTab/TopicActionSheet.jsx` - Remove Quick Quiz
- `frontend/src/components/ProgressTab/ProgressTab.jsx` - Remove onQuickQuiz prop passing

### Key Changes

1. **Update PRACTICE_MODES array** (remove Quick Quiz):
   ```javascript
   const PRACTICE_MODES = [
     {
       id: 'mystery',
       icon: '🔍',
       name: 'Mystery Lab',
       description: 'Solve clues',
       color: 'indigo',
     },
     {
       id: 'whatif',
       icon: '🌟',
       name: 'Wonder Lab',
       description: 'What if...',
       color: 'amber',
     },
     {
       id: 'story',
       icon: '📖',
       name: 'Story Studio',
       description: 'Create a tale',
       color: 'rose',
     },
   ]
   ```

2. **Update grid layout** to 3 columns:
   ```jsx
   // OLD: grid grid-cols-2
   // NEW:
   <div className="grid grid-cols-3 gap-3">
     {PRACTICE_MODES.map((mode) => (
       <button key={mode.id} ...>
         {/* mode content */}
       </button>
     ))}
   </div>
   ```

3. **Remove onQuickQuiz prop**:
   ```javascript
   // Remove from component signature:
   export default function TopicActionSheet({
     topic,
     isOpen,
     onClose,
     onReviewSlideshow,
     onLaunchMode,
     // onQuickQuiz, // REMOVE THIS
     onSelectRelatedTopic,
   }) {
     // ...
   }
   ```

4. **Simplify handleModeClick**:
   ```javascript
   // OLD:
   const handleModeClick = useCallback((mode) => {
     if (mode.id === 'quiz') {
       onQuickQuiz?.(topic?.topicName)
     } else {
       onLaunchMode?.(topic?.topicName, mode.id, {
         slides: topic?.slides,
         level: topic?.level,
       })
     }
   }, [topic, onLaunchMode, onQuickQuiz])

   // NEW:
   const handleModeClick = useCallback((mode) => {
     onLaunchMode?.(topic?.topicName, mode.id, {
       slides: topic?.slides,
       level: topic?.level,
     })
   }, [topic, onLaunchMode])
   ```

5. **Remove onQuickQuiz from ProgressTab.jsx**:
   ```jsx
   // Remove this prop passing:
   <TopicActionSheet
     topic={selectedTopic}
     isOpen={isActionSheetOpen}
     onClose={handleCloseActionSheet}
     onReviewSlideshow={handleReviewFromSheet}
     onLaunchMode={handleLaunchFromSheet}
     // onQuickQuiz={handleQuizFromSheet} // REMOVE THIS LINE
     onSelectRelatedTopic={handleSelectRelatedTopic}
   />

   // Also remove handleQuizFromSheet function from ProgressTab
   ```

### Technical Decisions

- **Decision:** Change to 3-column grid
- **Rationale:** Three modes fit naturally in a row, balanced layout
- **Trade-off:** On small screens (<400px), might need to stack. Consider `grid-cols-1 sm:grid-cols-3` if needed.

## Dependencies

### Depends On
None - Can be implemented independently

### Blocks
None - Standalone change

## Testing Requirements

- [ ] Verify only 3 modes appear in action sheet
- [ ] Test each mode launches correctly
- [ ] Verify grid layout looks balanced
- [ ] Test on mobile (375px width)
- [ ] Verify no PropTypes warnings
- [ ] Check console for errors

## Security Considerations

- [ ] No security implications (UI-only change)

## Implementation Checklist

- [ ] Update PRACTICE_MODES array (remove Quick Quiz object)
- [ ] Change grid from grid-cols-2 to grid-cols-3
- [ ] Remove onQuickQuiz from TopicActionSheet props
- [ ] Remove handleQuizFromSheet from TopicActionSheet
- [ ] Simplify handleModeClick (remove conditional)
- [ ] Remove onQuickQuiz from ProgressTab prop passing
- [ ] Remove handleQuizFromSheet from ProgressTab
- [ ] Update PropTypes if defined
- [ ] Test all 3 modes launch correctly
- [ ] Verify layout on small screens

## Verification

**Visual Check:**
1. Open any topic in constellation
2. Action sheet should appear
3. Count modes in "Practice Modes" section
   - Should be exactly 3: Mystery Lab, Wonder Lab, Story Studio
4. Verify grid layout is balanced (3 columns)
5. Test on mobile (inspect mode, 375px width)

**Functional Check:**
1. Click Mystery Lab → should launch mystery mode
2. Click Wonder Lab → should launch whatif mode
3. Click Story Studio → should launch story mode
4. No console errors

**Code Check:**
```bash
# Search for references to Quick Quiz
grep -r "quiz\|Quick Quiz" frontend/src/components/ProgressTab/TopicActionSheet.jsx

# Should only find:
# - Old comments (if any)
# - No functional code

# Verify onQuickQuiz removed
grep "onQuickQuiz" frontend/src/components/ProgressTab/
```

## Notes

**Quick Quiz Legacy:** The Quick Quiz feature is being completely removed from the app (not just hidden). If needed in the future, it can be restored from git history.

**Grid Responsive:** Current grid-cols-3 works well on most screens. If testing reveals issues on small screens (<375px), consider:
- `grid-cols-1 sm:grid-cols-3` (stack on mobile)
- Or keep grid-cols-3 with smaller card text

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
