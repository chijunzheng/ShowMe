# Feature: Tab Navigation Update

**ID:** 06
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 05

## Description

Update the bottom tab navigation from 3 tabs (Learn, World, Tree) to 2 tabs (Learn, Progress). Remove World and Tree tabs, add Progress tab that renders the new ProgressTab component. Update all tab-related state and navigation logic.

## Acceptance Criteria

- [ ] Bottom nav shows only 2 tabs: Learn, Progress
- [ ] Learn tab works as before (voice input, slideshow)
- [ ] Progress tab renders new ProgressTab component
- [ ] World tab removed (functionality moved to Progress)
- [ ] Tree tab removed (functionality moved to Progress)
- [ ] Tab switching works correctly
- [ ] Deep links (if any) updated
- [ ] No console errors about removed components

## Implementation Details

### Files to Modify

- `frontend/src/App.jsx` - Tab state and rendering
- `frontend/src/components/Navigation/` - Tab bar component (if separate)
- `frontend/src/hooks/useTabNavigation.js` - Tab state management

### Tab Configuration Change

**Before:**
```javascript
const TABS = {
  LEARN: 'learn',
  WORLD: 'world',
  TREE: 'tree'
}
```

**After:**
```javascript
const TABS = {
  LEARN: 'learn',
  PROGRESS: 'progress'
}
```

### Tab Bar UI Change

**Before:**
```
┌─────────────────────────────────────┐
│   [Learn]    [World]    [Tree]      │
│     🎓         🌍         🌳        │
└─────────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────────┐
│       [Learn]        [Progress]     │
│         🎓              📊          │
└─────────────────────────────────────┘
```

### App.jsx Rendering Logic

**Before:**
```jsx
{activeTab === 'learn' && <LearnScreen ... />}
{activeTab === 'world' && <LivingWorldView ... />}
{activeTab === 'tree' && <TreeTab ... />}
```

**After:**
```jsx
{activeTab === 'learn' && <LearnScreen ... />}
{activeTab === 'progress' && <ProgressTab ... />}
```

### Props to Pass to ProgressTab

```jsx
<ProgressTab
  // World data
  worldState={worldState}
  pieces={pieces}

  // Topic actions (reuse existing handlers)
  onReviewSlideshow={handleReviewPiece}
  onLaunchMode={handleLaunchLearningMode}
  onQuickQuiz={handleQuizPiece}
  onLearnTopic={handleLearnTopic}

  // Stats
  totalXP={worldStats.totalXP}
  streak={worldStats.streak}

  // Suggestions
  suggestions={suggestions}
  onRefreshSuggestions={refreshSuggestions}
/>
```

### Cleanup Tasks

1. **Remove World tab imports** (if LivingWorldView fully embedded in Progress)
2. **Remove Tree tab imports** (if TreeTab fully embedded in Progress)
3. **Update tab navigation hook** to handle 2 tabs
4. **Remove old tab-specific state** (if any)
5. **Update any tab-related analytics** (if present)

### Migration Considerations

- **Existing users**: Default tab should be Learn (same as before)
- **No breaking changes**: Actions still work, just different location
- **World features preserved**: Fullscreen world accessible from Progress

## Dependencies

### Depends On
- **Feature 05:** ProgressTab component must be complete

### Blocks
- None (final feature)

## Testing Requirements

- [ ] Tab bar shows 2 tabs
- [ ] Learn tab renders correctly
- [ ] Progress tab renders ProgressTab component
- [ ] Tab switching animation smooth
- [ ] No references to old tabs cause errors
- [ ] All topic actions work from Progress tab
- [ ] World expansion works from mini preview

## Implementation Checklist

- [ ] Update TABS constant
- [ ] Update tab bar component
- [ ] Update App.jsx rendering logic
- [ ] Add ProgressTab import
- [ ] Pass correct props to ProgressTab
- [ ] Remove unused World/Tree imports
- [ ] Update useTabNavigation hook
- [ ] Test all navigation paths
- [ ] Test topic actions from Progress
- [ ] Verify no console errors
- [ ] Code review

## Code Reference

Current tab navigation (from useTabNavigation.js):
```javascript
const [activeTab, setActiveTab] = useState('learn')

const handleTabChange = (tab) => {
  setActiveTab(tab)
}
```

Current tab bar (likely in App.jsx or Navigation/):
```jsx
<nav className="fixed bottom-0 ...">
  <button onClick={() => setActiveTab('learn')}>Learn</button>
  <button onClick={() => setActiveTab('world')}>World</button>
  <button onClick={() => setActiveTab('tree')}>Tree</button>
</nav>
```

## Rollback Plan

If issues discovered:
1. Keep World/Tree components in codebase (just hidden)
2. Add feature flag: `USE_PROGRESS_TAB`
3. Can toggle back to 3-tab layout if needed

## Notes

- Consider adding transition animation when switching tabs
- Progress tab icon options: 📊, 📈, 🎯, ✅
- May want to show "New!" badge on Progress if user hasn't visited
- Analytics: Track which sections in Progress are most used

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** TBD
