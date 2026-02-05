# Feature: Replace Legacy Tier in Sidebar

**ID:** 10
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 04

## Description

Replaced the legacy Living World tier system (TIER_CONFIG with barren/sprouting/growing/thriving/legendary) in TopicSidebar with the unified Explorer Rank system. Also removed the unused tier and xpProgress props from App.jsx. The sidebar now shows rank icon, title, and progress bar to next rank with indigo theming, matching the space exploration aesthetic.

## Acceptance Criteria

- [x] TIER_CONFIG constant removed from TopicSidebar
- [x] tier and xpProgress props removed from TopicSidebar
- [x] getExplorerRank imported and used
- [x] Rank icon, title, and progress displayed
- [x] Progress bar shows advancement to next rank
- [x] Indigo theme applied (matches space aesthetic)
- [x] tier/xpProgress props removed from App.jsx
- [x] Dark mode works correctly

## Implementation Details

### Files to Modify

- `frontend/src/components/TopicSidebar.jsx` - Replace tier with explorer rank
- `frontend/src/App.jsx` - Remove unused tier/xpProgress props

### Key Changes

1. **Remove Legacy TIER_CONFIG**:
   ```javascript
   // TopicSidebar.jsx

   // DELETE THIS:
   const TIER_CONFIG = {
     barren: { emoji: '🏜️', label: 'Barren', color: 'slate', minXP: 0 },
     sprouting: { emoji: '🌱', label: 'Sprouting', color: 'emerald', minXP: 100 },
     growing: { emoji: '🌿', label: 'Growing', color: 'green', minXP: 500 },
     thriving: { emoji: '🌳', label: 'Thriving', color: 'blue', minXP: 1500 },
     legendary: { emoji: '✨', label: 'Legendary', color: 'purple', minXP: 5000 },
   }
   ```

2. **Update Component Props and Imports**:
   ```javascript
   // TopicSidebar.jsx

   // Add imports
   import { getExplorerRank, getRankProgress } from './ExplorerRank/explorerRankUtils'

   // OLD: Component signature with tier/xpProgress
   export default function TopicSidebar({
     isOpen,
     onClose,
     topics,
     tier = 'barren',
     xpProgress = 0,
     // ...
   }) {

   // NEW: Component signature without tier/xpProgress
   export default function TopicSidebar({
     isOpen,
     onClose,
     topics,
     // ...
   }) {
   ```

3. **Replace Tier Display with Explorer Rank**:
   ```jsx
   // TopicSidebar.jsx

   // Calculate rank from topics
   const topicsCount = topics?.length || 0
   const explorerRank = getExplorerRank(topicsCount)
   const rankProgress = getRankProgress(topicsCount)

   // OLD: Tier display
   <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
     <div className="text-3xl">{TIER_CONFIG[tier]?.emoji}</div>
     <div className="flex-1">
       <div className="text-sm text-slate-600 dark:text-slate-400">World Tier</div>
       <div className="font-bold text-lg text-slate-800 dark:text-white">
         {TIER_CONFIG[tier]?.label}
       </div>
       <div className="mt-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
         <div
           className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
           style={{ width: `${xpProgress}%` }}
         />
       </div>
     </div>
   </div>

   // NEW: Explorer rank display
   <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl">
     <div className="text-3xl">{explorerRank.icon}</div>
     <div className="flex-1">
       <div className="text-sm text-slate-600 dark:text-slate-400">Explorer Rank</div>
       <div className="font-bold text-lg text-slate-800 dark:text-white">
         {explorerRank.title}
       </div>
       <div className="mt-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
         <div
           className="h-full bg-gradient-to-r from-indigo-400 to-blue-500"
           style={{ width: `${rankProgress.percentage}%` }}
         />
       </div>
       <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
         {rankProgress.current} / {rankProgress.next} topics to {rankProgress.nextRank}
       </div>
     </div>
   </div>
   ```

4. **Remove Props from App.jsx**:
   ```jsx
   // App.jsx

   // OLD: Passing tier and xpProgress
   <TopicSidebar
     isOpen={isSidebarOpen}
     onClose={() => setIsSidebarOpen(false)}
     topics={topicList}
     tier={worldTier}
     xpProgress={xpProgress}
     onTopicSelect={handleTopicSelect}
     onDeleteTopic={handleDeleteTopic}
   />

   // NEW: Remove tier and xpProgress
   <TopicSidebar
     isOpen={isSidebarOpen}
     onClose={() => setIsSidebarOpen(false)}
     topics={topicList}
     onTopicSelect={handleTopicSelect}
     onDeleteTopic={handleDeleteTopic}
   />
   ```

### Technical Decisions

- **Decision:** Calculate rank inside sidebar from topics.length
- **Rationale:** Single source of truth (topic count), no prop passing needed
- **Trade-off:** Slight computation overhead, but cleaner API

- **Decision:** Use indigo theme instead of green
- **Rationale:** Matches space exploration aesthetic, consistent with constellation UI
- **Trade-off:** Less "nature" themed, but better overall cohesion

- **Decision:** Show progress text "X / Y topics to [next rank]"
- **Rationale:** Clear progress goal, motivates user to reach next rank
- **Trade-off:** Slightly more vertical space, but valuable feedback

## Dependencies

### Depends On
- **Feature 04:** Explorer Rank system must be implemented in StatsBar first

### Blocks
None - Completes the explorer rank integration

## Testing Requirements

- [x] Test rank icon displays correctly
- [x] Test rank title displays correctly
- [x] Test progress bar fills accurately
- [x] Test progress text shows correct numbers
- [x] Test all rank transitions (0→3→8→15 topics)
- [x] Test indigo theme in light and dark mode
- [x] Verify no PropTypes warnings in console
- [x] Verify sidebar opens/closes normally

## Security Considerations

- [x] No security implications (UI-only change)

## Implementation Checklist

- [x] Import getExplorerRank and getRankProgress
- [x] Remove TIER_CONFIG constant
- [x] Remove tier and xpProgress from component props
- [x] Calculate explorerRank from topics.length
- [x] Calculate rankProgress from topics.length
- [x] Replace tier display section with explorer rank
- [x] Update gradient colors to indigo/blue
- [x] Add progress text below bar
- [x] Update PropTypes (remove tier, xpProgress)
- [x] Remove tier={worldTier} from App.jsx
- [x] Remove xpProgress={xpProgress} from App.jsx
- [x] Test all rank levels visually

## Verification

**Visual Check:**
1. Open sidebar with 0 topics
   - Should show: 🔭 Stargazer
   - Progress: "0 / 3 topics to Space Cadet"
   - Progress bar: 0%

2. Add 3 topics
   - Should show: 🚀 Space Cadet
   - Progress: "3 / 8 topics to Navigator"
   - Progress bar: 0%

3. Add 5 more topics (8 total)
   - Should show: 🧭 Navigator
   - Progress: "8 / 15 topics to Explorer"
   - Progress bar: 0%

4. Check styling
   - Background: indigo/blue gradient
   - Progress bar: indigo/blue gradient
   - Text: readable in light and dark mode

**Code Check:**
```bash
# Verify tier system removed
grep -r "TIER_CONFIG\|barren\|sprouting\|thriving" frontend/src/components/TopicSidebar.jsx
# Should find NO matches

# Verify explorer rank imported
grep "getExplorerRank\|getRankProgress" frontend/src/components/TopicSidebar.jsx
# Should find imports

# Verify props removed from App.jsx
grep "tier=\|xpProgress=" frontend/src/App.jsx
# Should find NO matches in TopicSidebar component
```

**Rank Progression Check:**
```
0 topics:  🔭 Stargazer   → 0/3 to Space Cadet
3 topics:  🚀 Space Cadet → 3/8 to Navigator
8 topics:  🧭 Navigator   → 8/15 to Explorer
15 topics: 🌌 Explorer    → 15/25 to Voyager
25 topics: 🛸 Voyager     → 25/40 to Astronaut
40 topics: 🧑‍🚀 Astronaut  → 40/60 to Pioneer
60 topics: ⭐ Pioneer     → Max rank (no next)
```

## Notes

**Why Remove Tier System:**
- Living World feature removed in favor of Constellation-first UI
- Tier system tied to old world visualization (barren → legendary)
- Explorer Rank is universal progression system (works with constellation)

**Progress Bar Logic:**
- Uses `getRankProgress()` utility function
- Returns: { current, next, nextRank, percentage }
- Percentage calculated as progress within current rank range
- Max rank (Pioneer) shows 100% progress

**Indigo Theme Choice:**
- Matches constellation UI color scheme
- `from-indigo-50 to-blue-50` (light mode)
- `from-indigo-900/20 to-blue-900/20` (dark mode)
- Progress bar: `from-indigo-400 to-blue-500`

**Future Enhancement:**
- Could add rank badge/achievement system
- Could add rank milestone celebrations
- Could add rank comparison with friends

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
