# Progress Tab Constellation-First UI Redesign

## Vision

Transform the Progress tab from a **list-based interface** to a **constellation-first experience**. The interactive star map becomes the primary navigation and interaction point - users explore their knowledge by panning, zooming, and tapping stars.

## Current Problem

The current UI buries the constellation under multiple sections:
```
Stats Bar
Constellation Preview (120x68 tiny box)
Due for Review (list)
Quick Practice (mode cards)
Topics by Zone (expandable lists)
```

Users have to scroll past 4 sections to see their topics, and the constellation is just a decorative preview.

## Proposed Vision

**Constellation-First Layout:**
```
┌────────────────────────────────────────┐
│ Dashboard Stats (Compact Header)      │ ← Thin header
│ [🔥 0] [⭐ 0] [🌿 14] [🧭 Navigator]  │ ← Topics, not level
├────────────────────────────────────────┤
│                                        │
│      *      *                          │
│        *        *    *                 │
│              *                         │ ← Full-screen
│    *    *         *       *            │   constellation
│         *    *                         │   (pan, zoom,
│              *         *               │    tap stars)
│    *            *                      │
│                   *       *            │
│                                        │
│         [Zoom -] [Zoom +]              │ ← Bottom right
│                                        │   controls
└────────────────────────────────────────┘
```

**Key Changes:**
1. **Remove all list sections** - No "Due for Review", "Quick Practice", "Topics by Zone"
2. **Full-screen constellation** - Takes up entire tab (minus thin header)
3. **All interaction through stars** - Tap star → Action sheet with modes
4. **Minimal UI chrome** - Just stats header + zoom controls
5. **Exploration-focused** - Users discover topics by exploring the map
6. **Replace tree level with explorer rank** - Change leaf icon (🌱) to astronomer icons (🔭🚀🧭🌌🛸🧑‍🚀⭐)
7. **Stats bar shows 4 items** - Streak, XP, Topics, Explorer Rank (with proper space-themed icons)

## Comparison: Before vs After

### Before (Current)
```
┌─────────────────────────────────────┐
│ Stats Bar                           │
├─────────────────────────────────────┤
│ [Tiny 120x68 constellation preview] │ ← Buried
├─────────────────────────────────────┤
│ Due for Review:                     │
│ [Topic 1] [Topic 2]                 │
├─────────────────────────────────────┤
│ Quick Practice:                     │
│ [Mystery] [Wonder] [Story]          │
│ [Surprise Me!]                      │
│ [Topic pills...]                    │
├─────────────────────────────────────┤
│ Topics by Zone:                     │
│ Nature (14) ▲                       │
│ [Topic][Topic][Topic]...            │
└─────────────────────────────────────┘
```
**Issues:** Cluttered, constellation invisible, too many choices

### After (Proposed)
```
┌─────────────────────────────────────┐
│ [🔥 0] [⭐ 0] [🌿 14] [🧭 Navigator]│ ← Compact
├─────────────────────────────────────┤
│                                     │
│        *        *                   │
│     *      *        *               │
│            *                        │
│   *    *        *       *           │ ← Focus
│        *    *                       │
│            *         *              │
│                 *                   │
│                                     │
│            [- +]                    │ ← Minimal
└─────────────────────────────────────┘
```
**Benefits:** Clean, explorable, constellation hero, clear focus

## Implementation Plan

### Phase 1: Simplify Layout Structure

**File:** `frontend/src/components/ProgressTab/ProgressTab.jsx`

**Remove these sections entirely:**
```jsx
{/* REMOVE: Due for Review */}
<DueForReview ... />

{/* REMOVE: Quick Practice */}
<QuickPractice ... />

{/* REMOVE: Topics by Zone */}
<TopicsByZone ... />

{/* REMOVE: Recommended Next */}
{suggestions.length > 0 && <section>...</section>}
```

**New simplified structure:**
```jsx
export default function ProgressTab({ ... }) {
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
}
```

**Key changes:**
- Remove `ConstellationPreview` component - use full `Constellation` directly
- Remove `isConstellationExpanded` state - constellation is always "expanded"
- Remove `handleConstellationExpand/Collapse` - no longer needed
- Remove `pb-24` padding - full height layout
- Use `flex flex-col h-full` with `flex-1 min-h-0` for proper full-height flex layout

### Phase 2: Enhance Constellation Component

**File:** `frontend/src/components/Constellation/Constellation.jsx`

**Current state:** Already has pan, zoom, tap functionality ✅

**Enhancements needed:**

1. **Improve empty state** (when no topics learned):
   ```jsx
   {nodes.length === 0 && (
     <div className="absolute inset-0 flex items-center justify-center p-8">
       <div className="text-center text-slate-400 max-w-sm">
         <div className="text-6xl mb-4" aria-hidden="true">✨</div>
         <h3 className="text-xl font-bold mb-2 text-slate-300">
           Your Knowledge Constellation
         </h3>
         <p className="text-sm">
           Start learning topics to see stars appear.
           Each topic becomes a star in your personal knowledge galaxy.
         </p>
       </div>
     </div>
   )}
   ```

2. **Add mini-map (optional enhancement)** - Small overview in corner:
   ```jsx
   {nodes.length > 5 && (
     <div className="absolute top-4 left-4 w-32 h-32
                     bg-slate-900/80 border border-slate-700 rounded-lg
                     overflow-hidden">
       {/* Mini version of constellation showing full view */}
       <svg viewBox="0 0 800 600" className="w-full h-full opacity-50">
         {/* Simplified edges and nodes */}
       </svg>
       {/* Viewport indicator */}
       <div className="absolute border-2 border-indigo-400"
            style={{...viewportRectStyle}} />
     </div>
   )}
   ```

3. **Add interaction hints** (for first-time users):
   ```jsx
   {nodes.length > 0 && nodes.length <= 3 && (
     <div className="absolute top-4 right-4 bg-slate-800/90
                     px-4 py-3 rounded-lg border border-slate-600
                     text-sm text-slate-200 max-w-xs">
       <p className="font-semibold mb-1">💡 Tip</p>
       <p>Drag to pan • Scroll to zoom • Tap stars to interact</p>
     </div>
   )}
   ```

4. **Enhance zoom controls** (make more prominent):
   ```jsx
   <div className="absolute bottom-4 right-4 flex flex-col gap-2">
     <button
       onClick={handleZoomIn}
       className="
         w-12 h-12 rounded-xl
         bg-slate-800/90 border-2 border-black dark:border-slate-600
         shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]
         hover:bg-slate-700/90
         active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
         text-white text-xl font-bold
         transition-all duration-150
       "
       aria-label="Zoom in"
     >
       +
     </button>
     <button
       onClick={handleZoomOut}
       className="
         w-12 h-12 rounded-xl
         bg-slate-800/90 border-2 border-black dark:border-slate-600
         shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]
         hover:bg-slate-700/90
         active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
         text-white text-xl font-bold
         transition-all duration-150
       "
       aria-label="Zoom out"
     >
       −
     </button>
     <button
       onClick={handleResetView}
       className="
         w-12 h-12 rounded-xl
         bg-slate-800/90 border-2 border-black dark:border-slate-600
         shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]
         hover:bg-slate-700/90
         active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
         text-white text-sm font-bold
         transition-all duration-150
       "
       aria-label="Reset view"
     >
       ⊙
     </button>
   </div>
   ```

5. **Add "Reset View" button** to zoom controls:
   ```javascript
   const handleResetView = useCallback(() => {
     setViewport({ x: 0, y: 0, scale: 1 })
   }, [])
   ```

### Phase 3: Enhance TopicActionSheet

**File:** `frontend/src/components/ProgressTab/TopicActionSheet.jsx`

**Current structure is good, but remove Quick Quiz:**

1. **Update PRACTICE_MODES array:**
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

2. **Update grid to 3 columns:**
   ```jsx
   <div className="grid grid-cols-3 gap-3">
     {PRACTICE_MODES.map((mode) => ( ... ))}
   </div>
   ```

3. **Remove onQuickQuiz handling:**
   - Remove `onQuickQuiz` from props
   - Remove `handleQuizFromSheet` function
   - Update `handleModeClick` to only call `onLaunchMode`

### Phase 4: Replace Tree Level with Explorer Rank

**Files:**
- `frontend/src/components/Dashboard/StatsBar.jsx`
- `frontend/src/components/ProgressTab/ProgressTab.jsx`

**Changes:**

1. **Remove tree level display** from StatsBar:
   ```jsx
   // REMOVE: Tree Level stat (Seed, Sprout, etc.)
   <div data-testid="stat-level" className="...">
     <span className="text-xl">{TREE_LEVEL_ICONS[safeLevel]}</span>
     <span className="font-bold">Seed</span>
   </div>
   ```

2. **Replace tree level with explorer rank badge:**
   ```jsx
   // OLD: Tree Level with leaf icon
   <div data-testid="stat-level" className="...">
     <span className="text-xl">{TREE_LEVEL_ICONS[safeLevel]}</span>
     <span className="font-bold capitalize">{safeLevel}</span>
     <span className="text-xs">Level</span>
   </div>

   // NEW: Explorer Rank badge
   import { getExplorerRank } from '../ExplorerRank/explorerRankUtils'

   // In component:
   const explorerRank = getExplorerRank(topicsLearned)

   <div data-testid="stat-rank" className="...">
     <span className="text-xl">{explorerRank.icon}</span>
     <span className="font-bold">{compact ? '' : explorerRank.title}</span>
   </div>
   ```

3. **Simplified StatsBar structure (4 stats):**
   ```jsx
   export default function StatsBar({ streak, totalXP, topicsLearned, compact = false }) {
     const explorerRank = getExplorerRank(topicsLearned)

     return (
       <div className="flex items-center justify-around gap-3 ...">
         {/* Streak */}
         <div>🔥 {streak}</div>

         {/* XP */}
         <div>⭐ {totalXP}</div>

         {/* Topics */}
         <div>🌿 {topicsLearned}</div>

         {/* Explorer Rank */}
         <div>{explorerRank.icon} {compact ? '' : explorerRank.title}</div>
       </div>
     )
   }
   ```

4. **Add neobrutalism styling when compact:**
   ```jsx
   ${compact
     ? 'border-2 border-black dark:border-slate-600 shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#475569]'
     : ''
   }
   ```

**Rationale:**
- StatsBar shows 4 items: Streak, XP, Topics, Explorer Rank
- Replace tree level icon (🌱 leaf) with explorer rank icon (🔭🚀🧭🌌🛸🧑‍🚀⭐)
- In compact mode, show icon only to save space
- "Seed" terminology completely eliminated (replaced by space exploration theme)

### Phase 5: Clean Up Removed Components (Optional)

Since we're removing references to these components, consider:

**Option A: Keep files but unused** (safer, can restore later)
- Leave files in place: `DueForReview.jsx`, `QuickPractice.jsx`, `TopicsByZone.jsx`
- Just don't import/render them in ProgressTab

**Option B: Delete unused files** (cleaner, but harder to revert)
- Delete after verifying new UI works well
- Keep in git history for reference

**Recommendation:** Option A for now, Option B after user approval

## Proposed Enhancements

### Enhancement 1: "Find Topic" Search Bar

Add a floating search bar to quickly jump to a topic:

```jsx
{/* Top-right floating search */}
{nodes.length > 10 && (
  <div className="absolute top-4 left-4 right-20 max-w-sm">
    <input
      type="text"
      placeholder="Find topic..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="
        w-full px-4 py-2
        bg-slate-800/90 border-2 border-slate-600
        rounded-xl
        text-slate-200 placeholder-slate-400
        focus:outline-none focus:border-indigo-500
        backdrop-blur
      "
    />
    {filteredTopics.length > 0 && (
      <div className="mt-2 bg-slate-800/95 border-2 border-slate-600
                      rounded-xl p-2 max-h-48 overflow-y-auto">
        {filteredTopics.map(topic => (
          <button
            key={topic.id}
            onClick={() => focusOnNode(topic.id)}
            className="w-full px-3 py-2 text-left text-sm
                       hover:bg-slate-700 rounded-lg"
          >
            {topic.name}
          </button>
        ))}
      </div>
    )}
  </div>
)}
```

**When to show:** Only when user has 10+ topics (to avoid clutter on small constellations)

### Enhancement 2: Cluster Labels/Badges

Show category badges floating over cluster regions:

```jsx
{/* In Constellation.jsx */}
{clusters.map((cluster) => {
  const centerPos = getClusterCenter(cluster, positions)
  return (
    <div
      key={cluster.id}
      className="absolute pointer-events-none"
      style={{
        left: centerPos.x,
        top: centerPos.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="
        px-3 py-1 rounded-full
        bg-slate-800/60 border border-slate-600
        text-xs font-semibold text-slate-300
        backdrop-blur-sm
      ">
        {cluster.category} ({cluster.nodeCount})
      </div>
    </div>
  )
})}
```

### Enhancement 3: "Recent" or "Due" Indicators

Add visual indicators on stars that need attention:

```jsx
{/* In ConstellationStar.jsx */}
{node.reviewStatus === 'overdue' && (
  <div className="absolute -top-1 -right-1 w-3 h-3
                  bg-rose-500 rounded-full
                  animate-pulse" />
)}
```

### Enhancement 4: Legend/Key

Add a small legend explaining star brightness or indicators:

```jsx
{/* Bottom-left legend */}
<div className="absolute bottom-4 left-4
                bg-slate-800/90 border-2 border-slate-600
                rounded-xl p-3 text-xs text-slate-300">
  <div className="font-bold mb-2">Legend</div>
  <div className="flex items-center gap-2 mb-1">
    <div className="w-3 h-3 bg-indigo-200 rounded-full" />
    <span>Recently learned</span>
  </div>
  <div className="flex items-center gap-2 mb-1">
    <div className="w-3 h-3 bg-indigo-400 rounded-full" />
    <span>Well practiced</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse" />
    <span>Needs review</span>
  </div>
</div>
```

## Explorer Rank System (Already Implemented)

The app already uses a space exploration themed ranking system that replaces the old tree levels:

**Explorer Ranks (by topic count):**
1. 🔭 Stargazer (0+ topics)
2. 🚀 Space Cadet (3+ topics)
3. 🧭 Navigator (8+ topics)
4. 🌌 Explorer (15+ topics)
5. 🛸 Voyager (25+ topics)
6. 🧑‍🚀 Astronaut (40+ topics)
7. ⭐ Pioneer (60+ topics)

**Implementation Files:**
- `frontend/src/components/ExplorerRank/explorerRankUtils.js` - Rank calculation logic
- `frontend/src/components/ExplorerRank/ExplorerRankBadge.jsx` - Badge component
- Already integrated in constellation preview

**What needs to change:**
- Remove legacy "tree level" (Seed, Sprout, Sapling) from StatsBar
- Keep only numeric metrics in stats header
- Explorer rank already visible in constellation UI

## Files to Modify

### Core Changes (Required)
1. ✅ **`frontend/src/components/ProgressTab/ProgressTab.jsx`**
   - Remove: ConstellationPreview, DueForReview, QuickPractice, TopicsByZone, Recommended Next sections
   - Change: Full-screen constellation layout with flex
   - Change: Remove expansion state (always fullscreen)

2. ✅ **`frontend/src/components/Constellation/Constellation.jsx`**
   - Add: Reset view button
   - Add: Enhanced zoom controls with neobrutalism styling
   - Add: Better empty state messaging
   - Add: Interaction hints for new users

3. ✅ **`frontend/src/components/ProgressTab/TopicActionSheet.jsx`**
   - Remove: Quick Quiz from PRACTICE_MODES array
   - Remove: onQuickQuiz prop and handling
   - Change: grid-cols-2 → grid-cols-3

4. ✅ **`frontend/src/components/Dashboard/StatsBar.jsx`**
   - Remove: Tree level (Seed, Sprout) and TREE_LEVEL_ICONS
   - Remove: `treeLevel` prop
   - Add: Import `getExplorerRank` from explorerRankUtils
   - Add: Explorer rank stat using `getExplorerRank(topicsLearned)`
   - Change: Icon from 🌱🌿🌳 → 🔭🚀🧭🌌🛸🧑‍🚀⭐ (based on topic count)
   - Add: Neobrutalism border and shadow when compact={true}

### Optional Enhancements
5. ⭐ **`frontend/src/components/Constellation/ConstellationSearch.jsx`** (new file)
   - Floating search bar for quick topic lookup

6. ⭐ **`frontend/src/components/Constellation/ConstellationLegend.jsx`** (new file)
   - Legend explaining star brightness/states

7. ⭐ **`frontend/src/components/Constellation/ConstellationCluster.jsx`** (enhance existing)
   - Add floating category badges over cluster centers

## Verification Steps

### Visual Verification
- [ ] Constellation takes up full tab height (except thin header)
- [ ] No list sections visible (no Due for Review, Quick Practice, Topics by Zone)
- [ ] Stats bar shows 4 items: Streak, XP, Topics, Explorer Rank
- [ ] No tree level icons (🌱🌿🌳) - replaced with astronomer icons (🔭🚀🧭)
- [ ] Explorer rank icon changes based on topic count (Stargazer → Navigator → Astronaut)
- [ ] Stats bar is compact, styled with neobrutalism borders/shadows
- [ ] Zoom controls prominent in bottom-right with neobrutalism styling
- [ ] Empty state shows helpful message when no topics learned
- [ ] Topic action sheet has only 3 modes (Mystery, Wonder, Story)

### Interaction Verification
- [ ] Drag to pan works smoothly
- [ ] Scroll/pinch to zoom works
- [ ] Tap star opens action sheet with topic info
- [ ] Zoom in/out buttons work
- [ ] Reset view button returns to center/default zoom
- [ ] All 3 practice modes launch correctly from action sheet
- [ ] Review slideshow button works from action sheet

### Responsive Verification
- [ ] Full-screen constellation scales properly on mobile (375px)
- [ ] Stats header doesn't wrap awkwardly on small screens
- [ ] Zoom controls remain accessible (not covered by fingers)
- [ ] Action sheet remains usable on mobile

### Accessibility Verification
- [ ] Keyboard navigation works (tab through controls)
- [ ] Screen reader announces constellation properly
- [ ] Zoom controls have proper ARIA labels
- [ ] Focus states visible on all interactive elements

## Success Metrics

**Before (Current UI):**
- Time to see full knowledge graph: 3+ scrolls, tap "Explore" button
- Primary interaction: Scrolling lists
- Topics visible: Only via lists
- Cognitive load: High (6+ sections, many choices)

**After (Proposed UI):**
- Time to see full knowledge graph: Immediate (loads in view)
- Primary interaction: Exploring constellation
- Topics visible: All at once in spatial layout
- Cognitive load: Low (1 main interface, tap to dive deeper)

## Design Philosophy

**Constellation as Knowledge Map:**
- Spatial memory: Users remember "where" topics are in the map
- Exploration: Discovery through browsing, not searching lists
- Context: See relationships between topics visually
- Focus: One clear task → explore your knowledge

**Minimalist UI:**
- Remove everything that can be accessed through the constellation
- Stats header: Essential info only (progress metrics)
- Action sheet: Deep dive when needed
- Controls: Only zoom (pan via drag)

**Information Architecture:**
```
Progress Tab
  ↓
Constellation (primary)
  ↓ (tap star)
Topic Action Sheet (secondary)
  ↓ (select mode)
Practice Mode (tertiary)
```

Clean hierarchy: Explore → Select → Practice

## Alternative Considerations

### Alternative 1: Keep "Surprise Me!" Button
Add a floating "Surprise Me!" FAB (Floating Action Button):

```jsx
{/* Bottom-center floating button */}
<button
  onClick={handleSurpriseMe}
  className="
    fixed bottom-20 left-1/2 -translate-x-1/2
    px-6 py-3 rounded-full
    bg-gradient-to-r from-purple-500 to-pink-500
    border-2 border-black
    shadow-[4px_4px_0_0_#000]
    font-bold text-white
    hover:scale-105
    active:shadow-none active:translate-y-[4px]
    transition-all duration-150
    z-10
  "
>
  🎲 Surprise Me!
</button>
```

**Pros:** Quick access to random practice
**Cons:** Adds UI element, not discoverable through constellation
**Recommendation:** Skip for now, see if users miss it

### Alternative 2: Add Tab/Mode Toggle
Switch between "Explore" and "Practice" views:

```jsx
{/* Top-right mode toggle */}
<div className="absolute top-4 right-4 flex gap-2">
  <button
    onClick={() => setMode('explore')}
    className={mode === 'explore' ? activeClass : inactiveClass}
  >
    Explore
  </button>
  <button
    onClick={() => setMode('practice')}
    className={mode === 'practice' ? activeClass : inactiveClass}
  >
    Practice
  </button>
</div>
```

**Pros:** Keeps old lists accessible
**Cons:** Defeats purpose of simplification
**Recommendation:** Don't do this - commit to constellation-first

### Alternative 3: Collapsible Stats Header
Allow hiding stats for more screen space:

**Pros:** Maximizes constellation space
**Cons:** Adds complexity, stats are already compact
**Recommendation:** Not needed, stats header is thin enough

## Summary

**Core Changes:**
1. Remove 4 list sections from ProgressTab
2. Full-screen constellation (no preview mode)
3. Remove Quick Quiz mode from action sheet
4. Replace tree level (🌱 Seed, 🌿 Sprout) with explorer rank (🔭🚀🧭🌌🛸🧑‍🚀⭐)
5. Update StatsBar to use explorerRankUtils for rank icon/title
6. Enhance zoom controls with neobrutalism styling
7. Add reset view button

**Result:**
- **90% screen space** = Constellation (up from 15%)
- **10% screen space** = Stats header (down from 85%)
- **0% screen space** = Lists (removed)

**User Experience:**
- **Faster:** See all topics immediately
- **Cleaner:** No scrolling through lists
- **Explorable:** Pan, zoom, discover
- **Focused:** One clear interface

This is a **radical simplification** that makes the constellation the hero, not just a decorative preview.
