# Feature: Replace Tree Level with Explorer Rank in StatsBar

**ID:** 04
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01

## Description

Replace the legacy tree level system (Seed, Sprout, Sapling) with the Explorer Rank system (Stargazer, Navigator, Astronaut) in the StatsBar component. Changes the leaf icons (🌱🌿🌳) to space-themed icons (🔭🚀🧭🌌🛸🧑‍🚀⭐) and removes the `treeLevel` prop in favor of calculating rank from `topicsLearned`.

## Acceptance Criteria

- [x] TREE_LEVEL_ICONS constant removed
- [x] treeLevel prop removed from StatsBar
- [x] getExplorerRank imported from explorerRankUtils
- [x] Explorer rank calculated from topicsLearned
- [x] Icon changes dynamically based on topic count
- [x] Compact mode shows icon + abbreviated title (first word)
- [x] Full mode shows icon + rank title
- [x] Neobrutalism styling added when compact={true}
- [x] Dark mode works correctly

## Implementation Details

### Files to Modify

- `frontend/src/components/Dashboard/StatsBar.jsx` - Main changes
- `frontend/src/components/ProgressTab/ProgressTab.jsx` - Remove treeLevel prop

### Key Changes

1. **Add import for explorerRankUtils**:
   ```javascript
   import { getExplorerRank } from '../ExplorerRank/explorerRankUtils'
   ```

2. **Remove TREE_LEVEL_ICONS constant**:
   ```javascript
   // DELETE THIS:
   const TREE_LEVEL_ICONS = {
     seed: '🌱',
     sprout: '🌿',
     sapling: '🌿',
     young: '🌳',
     mature: '🌳',
     magical: '✨',
   }
   ```

3. **Update component signature** (remove treeLevel):
   ```javascript
   // OLD:
   export default function StatsBar({
     streak = 0,
     totalXP = 0,
     topicsLearned = 0,
     treeLevel = 'seed',
     isLoading = false,
     compact = false,
   }) {
     // ...
   }

   // NEW:
   export default function StatsBar({
     streak = 0,
     totalXP = 0,
     topicsLearned = 0,
     isLoading = false,
     compact = false,
   }) {
     const explorerRank = getExplorerRank(topicsLearned)
     // ...
   }
   ```

4. **Replace tree level stat with explorer rank**:
   ```jsx
   {/* OLD: Tree Level */}
   <div
     data-testid="stat-level"
     className={`
       flex flex-col items-center px-3 py-2 rounded-lg
       ${safeLevel === 'magical' ? 'bg-purple-100 dark:bg-purple-900/30 shimmer' : 'bg-sky-50 dark:bg-sky-900/30'}
       ${levelAnimating ? 'animate-pulse' : ''}
     `}
   >
     <span className="text-xl">{TREE_LEVEL_ICONS[safeLevel] || '🌱'}</span>
     <span className="font-bold text-slate-800 dark:text-white capitalize">{safeLevel}</span>
     {!compact && <span className="text-xs text-slate-500 dark:text-slate-400">Level</span>}
   </div>

   {/* NEW: Explorer Rank */}
   <div
     data-testid="stat-rank"
     className={`
       flex flex-col items-center px-3 py-2 rounded-lg
       ${explorerRank.level === 7 ? 'bg-red-100 dark:bg-red-900/30 shimmer' : 'bg-sky-50 dark:bg-sky-900/30'}
     `}
   >
     <span className="text-xl">{explorerRank.icon}</span>
     <span className="font-bold text-slate-800 dark:text-white text-xs">
       {compact ? explorerRank.title.split(' ')[0] : explorerRank.title}
     </span>
   </div>
   ```

5. **Add neobrutalism styling for compact mode**:
   ```jsx
   <div
     data-testid="stats-bar"
     className={`
       flex items-center justify-around gap-3
       ${compact ? 'p-2' : 'p-3'}
       bg-white dark:bg-slate-800
       ${compact
         ? 'border-2 border-black dark:border-slate-600 shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#475569]'
         : 'bg-slate-100 dark:bg-slate-800'
       }
       rounded-xl
     `}
   >
     {/* Stats content */}
   </div>
   ```

6. **Update ProgressTab.jsx** to remove treeLevel prop:
   ```jsx
   // OLD:
   <StatsBar
     streak={streakValue}
     totalXP={totalXP}
     topicsLearned={topicList.length}
     treeLevel={treeLevel}
     compact={true}
   />

   // NEW:
   <StatsBar
     streak={streakValue}
     totalXP={totalXP}
     topicsLearned={topicList.length}
     compact={true}
   />
   ```

### Technical Decisions

- **Decision:** Calculate rank inside StatsBar rather than pass as prop
- **Rationale:** Simplifies API, ensures consistency, rank is derived from topicsLearned
- **Trade-off:** Slight computation overhead (negligible), but cleaner interface

- **Decision:** Show abbreviated rank title in compact mode (first word only)
- **Rationale:** Provides context while saving space in compact header
- **Trade-off:** Abbreviated titles lose some detail, but maintain recognition (updated in Feature 09)

## Dependencies

### Depends On
- **Feature 01:** Layout must be finalized to know StatsBar usage context

### Blocks
None - Standalone change

## Testing Requirements

- [x] Test rank icon changes as topics increase (0 → 3 → 8 → 15 topics)
- [x] Test compact mode shows icon + abbreviated title
- [x] Test full mode shows icon + complete title
- [x] Test neobrutalism styling in compact mode
- [x] Test dark mode for all ranks
- [x] Test special styling for max rank (Pioneer, level 7)
- [x] Verify PropTypes updated

## Security Considerations

- [ ] No security implications (UI-only change)

## Implementation Checklist

- [x] Import getExplorerRank from explorerRankUtils
- [x] Remove TREE_LEVEL_ICONS constant
- [x] Remove VALID_TREE_LEVELS constant
- [x] Remove treeLevel from component props
- [x] Remove treeLevel validation logic
- [x] Add explorerRank calculation
- [x] Replace tree level stat div with explorer rank div
- [x] Add abbreviated title rendering in compact mode
- [x] Update neobrutalism styling for compact mode
- [x] Remove treeLevel prop from ProgressTab
- [x] Update PropTypes
- [x] Remove tier prop if unused
- [x] Test rank progression visually

## Verification

**Visual Check:**
1. Start with 0 topics
   - Should show 🔭 Stargazer icon
2. Add 3 topics
   - Should change to 🚀 Space Cadet
3. Add 8 topics
   - Should change to 🧭 Navigator
4. Check compact mode (Progress tab)
   - Should show icon + abbreviated title (e.g., "🚀 Space" for Space Cadet)
5. Check full mode (other tabs if applicable)
   - Should show icon + complete title (e.g., "🚀 Space Cadet")

**Rank Progression Test:**
```javascript
// Test in browser console
import { getExplorerRank } from './explorerRankUtils'

console.log(getExplorerRank(0))   // Stargazer 🔭
console.log(getExplorerRank(3))   // Space Cadet 🚀
console.log(getExplorerRank(8))   // Navigator 🧭
console.log(getExplorerRank(15))  // Explorer 🌌
console.log(getExplorerRank(25))  // Voyager 🛸
console.log(getExplorerRank(40))  // Astronaut 🧑‍🚀
console.log(getExplorerRank(60))  // Pioneer ⭐
```

**Code Check:**
```bash
# Verify no tree level references remain
grep -r "treeLevel\|TREE_LEVEL_ICONS\|seed\|sprout" frontend/src/components/Dashboard/StatsBar.jsx

# Should find NO matches

# Verify explorer rank imported
grep "getExplorerRank" frontend/src/components/Dashboard/StatsBar.jsx
```

## Notes

**Explorer Rank System:** Already implemented in `frontend/src/components/ExplorerRank/explorerRankUtils.js`. This feature just integrates it into StatsBar.

**Rank Icons:**
- 🔭 Stargazer (0+ topics)
- 🚀 Space Cadet (3+ topics)
- 🧭 Navigator (8+ topics)
- 🌌 Explorer (15+ topics)
- 🛸 Voyager (25+ topics)
- 🧑‍🚀 Astronaut (40+ topics)
- ⭐ Pioneer (60+ topics)

**Neobrutalism:** The compact mode adds bold borders and hard shadows matching the rest of the constellation-first UI design.

**Compact Mode Update:** Initial implementation showed icon only in compact mode. Feature 09 refined this to show abbreviated rank title (first word) for better context while maintaining space efficiency. Single-word ranks (Stargazer, Navigator, Explorer, Voyager, Astronaut, Pioneer) display fully; two-word ranks (Space Cadet) show first word only.

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
