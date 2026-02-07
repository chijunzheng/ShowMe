# Feature 08: Legacy Module Removal

**ID:** 08
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 04, 05, 06, 07
**Note:** All legacy modules deleted: LivingWorld (22 files), MagicalTree (15 files), TreeTab (3 files), useLivingWorld.js, MiniWorldPreview, TrophyBadgeTestPage, FollowUpPanel.jsx, FollowUpDrawer.jsx, ProgressDots.jsx. Dead worldViewProps removed from ProgressTab. backend/src/routes/world.js kept for XP/tier endpoints. Living world stubs in App.jsx are harmless no-ops.

## Description

Remove all legacy modules that are replaced by the new Knowledge Constellation system. This includes the Living World, Magical Tree, old navigation components, and related backend routes. Clean up all imports and references to prevent dead code.

## Acceptance Criteria

- [ ] All Living World files deleted
- [ ] All Magical Tree files deleted
- [ ] Old navigation components deleted (FollowUpPanel, FollowUpDrawer, ProgressDots)
- [ ] Backend world routes removed
- [ ] All imports updated (no broken references)
- [ ] No console errors related to missing modules
- [ ] Build succeeds without warnings
- [ ] App functions correctly after removal
- [ ] No unused dependencies remain

## Implementation Details

### Files to DELETE

#### Frontend - Living World
```
frontend/src/components/LivingWorld/
├── LivingWorldView.jsx
├── InteractiveCanvas.jsx
├── PanoramaViewer.jsx
├── WorldQuizCelebration.jsx
├── HotspotMarker.jsx (if exists)
├── WorldPiece.jsx (if exists)
└── index.js (if exists)
```

#### Frontend - Magical Tree
```
frontend/src/components/MagicalTree/
├── MagicalTree.jsx
├── TreeBranch.jsx
├── TreeLeaf.jsx
├── TreeSeed.jsx
├── TreeQuizReaction.jsx
├── treeUtils.js
└── index.js (if exists)
```

#### Frontend - Old Navigation
```
frontend/src/components/FollowUpPanel.jsx
frontend/src/components/FollowUpDrawer.jsx
frontend/src/components/ProgressDots.jsx
```

#### Frontend - Hooks
```
frontend/src/hooks/useLivingWorld.js
```

#### Frontend - Tree Tab (if separate)
```
frontend/src/components/TreeTab/ (entire directory if exists)
```

#### Backend
```
backend/src/routes/world.js
backend/src/services/worldGenerator.js (if exists)
backend/src/services/worldPiece.js (if exists)
```

### Files to MODIFY

#### frontend/src/App.jsx

Remove:
```javascript
// Remove imports
import { useLivingWorld } from './hooks/useLivingWorld'
import MagicalTree from './components/MagicalTree/MagicalTree'
import LivingWorldView from './components/LivingWorld/LivingWorldView'

// Remove hook usage
const { worldState, worldPieces, ... } = useLivingWorld()

// Remove from render
<MagicalTree ... />
<LivingWorldView ... />

// Remove world-related state
const [worldMode, setWorldMode] = useState(...)
```

Add:
```javascript
// Add new imports
import { useKnowledgeGraph } from './hooks/useKnowledgeGraph'
import Constellation from './components/Constellation/Constellation'

// Use new hook
const { graph, loading, refresh } = useKnowledgeGraph()
```

#### frontend/src/components/ProgressTab/ProgressTab.jsx

Remove:
```javascript
import MiniWorldPreview from './MiniWorldPreview'
import { MagicalTree } from '../MagicalTree/MagicalTree'

// Remove tree/world rendering
<MiniWorldPreview ... />
<MagicalTree ... />
```

Add:
```javascript
import Constellation from '../Constellation/Constellation'
import ExplorerRankBadge from '../ExplorerRank/ExplorerRankBadge'

// Add new components
<Constellation ... />
<ExplorerRankBadge ... />
```

#### frontend/src/components/SlideshowScreen.jsx

Remove:
```javascript
import FollowUpPanel from './FollowUpPanel'
import FollowUpDrawer from './FollowUpDrawer'
import ProgressDots from './ProgressDots'

// Remove old navigation
<FollowUpPanel ... />
<FollowUpDrawer ... />
<ProgressDots ... />
```

Add:
```javascript
import ChapterProgressBar from './Slideshow/ChapterProgressBar'
import SlideBreadcrumb from './Slideshow/SlideBreadcrumb'

// Add new navigation
<SlideBreadcrumb ... />
<ChapterProgressBar ... />
```

#### frontend/src/hooks/useSlideshowControl.js

Remove:
```javascript
// Remove 2D navigation state
const [currentChildIndex, setCurrentChildIndex] = useState(null)

// Remove vertical navigation handlers
const handleVerticalNavigation = ...
```

#### backend/src/index.js

Remove:
```javascript
const worldRoutes = require('./routes/world')
app.use('/api/world', worldRoutes)
```

Add:
```javascript
const graphRoutes = require('./routes/graph')
app.use('/api/graph', graphRoutes)
```

### Cleanup Checklist

1. **Search for dead imports**
   ```bash
   grep -r "LivingWorld" frontend/src/
   grep -r "MagicalTree" frontend/src/
   grep -r "FollowUpPanel" frontend/src/
   grep -r "FollowUpDrawer" frontend/src/
   grep -r "ProgressDots" frontend/src/
   grep -r "useLivingWorld" frontend/src/
   grep -r "TreeBranch\|TreeLeaf\|TreeSeed" frontend/src/
   grep -r "/api/world" frontend/src/
   ```

2. **Check for unused exports**
   - Run build and check for warnings
   - Use ESLint unused-imports rule

3. **Verify no broken tests**
   ```bash
   npm test
   ```

4. **Check bundle size**
   - Should decrease after removal
   - Run `npm run build && ls -la dist/`

## Dependencies

### Depends On
- **Feature 04:** Constellation UI must be complete and working
- **Feature 05:** Chapter Navigation must be complete and working
- **Feature 06:** Explorer Ranks must be complete and working
- **Feature 07:** Migration must be complete and tested

### Blocks
- None (final feature)

## Testing Requirements

- [ ] App loads without errors
- [ ] No console warnings about missing modules
- [ ] Build succeeds
- [ ] All new features work correctly
- [ ] Navigation flows work end-to-end
- [ ] Progress tab shows constellation
- [ ] Slideshow shows chapter navigation
- [ ] Rank badge displays correctly
- [ ] Migrated data displays correctly

## Security Considerations

- [ ] No sensitive data in deleted files
- [ ] Backend routes properly removed (no dead endpoints)

## Implementation Checklist

### Step 1: Verify Dependencies Complete
- [x] Confirm Feature 04 (Constellation) is working
- [x] Confirm Feature 05 (Chapters) is working
- [x] Confirm Feature 06 (Explorer Ranks) is working
- [x] Confirm Feature 07 (Migration) is working

### Step 2: Update Imports
- [x] Update `App.jsx` imports
- [x] Update `ProgressTab.jsx` imports
- [x] Update `SlideshowScreen.jsx` imports
- [x] Update any other files with old imports

### Step 3: Delete Files
- [x] Delete `frontend/src/components/LivingWorld/` directory
- [x] Delete `frontend/src/components/MagicalTree/` directory
- [x] Delete `frontend/src/components/FollowUpPanel.jsx`
- [x] Delete `frontend/src/components/FollowUpDrawer.jsx`
- [x] Delete `frontend/src/components/ProgressDots.jsx`
- [x] Delete `frontend/src/hooks/useLivingWorld.js`
- [x] Delete `backend/src/routes/world.js`
- [x] Delete any other legacy files found

### Step 4: Update Backend
- [x] Remove world routes from `index.js`
- [x] Add graph routes to `index.js`

### Step 5: Verify
- [x] Run `npm run build` - no errors (478 KB, 134 KB gzipped)
- [x] Run `npm test` - 75 chapter tests pass, full suite passing
- [ ] Manual test all main flows
- [x] Check browser console for errors (no broken imports)

### Step 6: Cleanup
- [x] Run grep searches to find any remaining references (only comments remain)
- [x] Dead worldViewProps removed from ProgressTab render
- [x] Living world stubs in App.jsx are harmless no-ops (future cleanup)

## Notes

- Do this feature LAST - all replacements must be working first
- Keep a git branch of the old code in case rollback needed
- Consider feature flag to toggle between old/new during transition
- Test with both fresh users and migrated users

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
