# Journey Tab Improvements Plan

## Overview
6 changes: hide recommended topics until Discover, improve trophies, add streak calendar, fix stats bar sizing, redesign Topics Learned, redesign mastery mechanism.

---

## 1. Constellation: Hide Recommended Topics Until "Discover" Clicked

**File:** `frontend/src/components/ProgressTab/ProgressTab.jsx`

- Add `const [hasDiscoveredThisSession, setHasDiscoveredThisSession] = useState(false)` (near line 60)
- Gate gaps: replace `const gaps = graphGapsProp ?? internalGraph.gaps` with:
  ```js
  const rawGaps = graphGapsProp ?? internalGraph.gaps
  const gaps = hasDiscoveredThisSession ? rawGaps : []
  ```
- In `handleDiscover`, set `setHasDiscoveredThisSession(true)` after `refreshGaps()` succeeds

No changes to `useKnowledgeGraph.js` or `Constellation.jsx` needed.

---

## 2. TrophyShowcase Improvements

### 2a. Always show "how to achieve" text (not just on click)

**File:** `frontend/src/components/Dashboard/TrophyShowcase.jsx` (line 192-199)

Remove the `isSelected &&` wrapper from the criteria text span in `TrophyItem`. Always visible.

### 2b. Replace SOCRATIC_5 + Add 5 new trophies (16 → 21 total)

**File:** `backend/src/services/userProgress.js`

**Replace** SOCRATIC_5 ("Critical Thinker") with:
| ID | Name | Icon | Criteria |
|----|------|------|----------|
| CATEGORY_COLLECTOR | Category Collector | compass | Learn topics in 5+ different categories |

**Add 5 new** (after line 263):
| ID | Name | Icon | Criteria |
|----|------|------|----------|
| PERFECT_PREDICTION | Perfect Prediction | star | Get all predictions correct in Wonder Lab |
| SPEED_LEARNER | Speed Learner | rocket | Learn 5 topics in one day |
| MULTI_MODE | Mode Master | medal | Complete all 3 learn modes for a topic |
| DETECTIVE_ACE | Detective Ace | fire | Solve a Mystery Lab case with all clues found |
| NIGHT_OWL | Night Owl | star | Learn after 10 PM |

Note: Removed quiz-specific trophies (PERFECT_QUIZ, QUIZ_STREAK_5) since quiz mode no longer exists. Replaced with game-mode-specific achievements.

Also add corresponding default progress fields and badge-check logic in `applyActivityUpdate`.

### 2c. Make trophy modal bigger

**File:** `frontend/src/components/Dashboard/StatDetailSheet.jsx` (line 319)

Change `max-h-[70vh]` → `max-h-[85vh]`

---

## 3. Streak Details: Monthly Calendar View

**File:** `frontend/src/components/Dashboard/StatDetailSheet.jsx` — rewrite `StreakContent` (lines 38-91)

Replace 7-day dots with:
- Month/year header with prev/next navigation arrows
- 7-column grid (Sun-Sat) showing all days of the month
- Active days highlighted in orange (`bg-orange-400 text-white`)
- "Next" disabled when viewing current month
- Keep current/longest streak stats row above calendar

**Data:** Uses `streak.activeDates` array of `YYYY-MM-DD` strings. Add `useState` for `viewMonth` and `useMemo` for calendar grid computation.

**Backend data support** (`backend/src/services/userProgress.js`):
- Add `activeDates: []` to default progress
- In `applyActivityUpdate`, append today's date key to `activeDates` on any activity
- In `normalizeProgress`, default `activeDates` to `[]` for backward compat

**App.jsx** — pass `activeDates` in the streak prop object.

---

## 4. Stats Bar: Fix Rank Sizing

**File:** `frontend/src/components/Dashboard/StatsBar.jsx` (lines 163-167)

Remove the standalone XP line. Move XP into the label position:
```jsx
<span className="text-xl">{rankDisplayIcon}</span>
<span className="font-bold text-slate-800 dark:text-white">{rankInfo.title}</span>
<span className={labelClass}>{formatNumber(safeXP)} XP</span>
```

All 4 stats now have consistent 3-line layout.

---

## 5. Topics Learned: Categorized List with Mastery %

**File:** `frontend/src/components/Dashboard/StatDetailSheet.jsx` — rewrite `TopicsContent` (lines 162-211)

### New design — Always-expanded categorized list with progress bars
Group topics by category from knowledge graph. Each section:

```
🔬 Science (4)
  Muscle Contractions          ██░░░░  25%
  High Altitude Adaptation     █████░  54%

💻 Technology (3)
  Artificial Neural Networks   ██░░░░  25%
```

**Implementation:**
1. Export `CLUSTER_CONFIG` from `useKnowledgeGraph.js` (line 70-84, currently module-private)
2. Group `topicList` by `graphNode.category`
3. Each section: category emoji header + count, topic rows with thin progress bar + %
4. Progress bar fill uses category color from `CLUSTER_CONFIG`
5. Uncategorized topics go under "General" (💡)

---

## 6. Mastery Mechanism Redesign — Bloom's Taxonomy + Spaced Repetition

### Current state (to replace)
- Single `mastery` number on each node
- Updated only via `updateMastery(nodeId, score)` with weighted average: `60% old + 40% quiz score`
- No game mode contribution, no decay

### New design — Bloom's Taxonomy

Each topic's mastery is composed of 4 independent scores (best score kept, never decreases):

| Component | Cognitive Level | Max Contribution | How scored |
|-----------|----------------|-----------------|------------|
| Slideshow viewed | Remember | 25% | 1.0 on view (automatic) |
| Mystery Lab | Analyze | 25% | Performance score 0-1 (clues found, theory accuracy) |
| Wonder Lab | Evaluate | 25% | Prediction accuracy (0/2→0.2, 1/2→0.6, 2/2→1.0) |
| Story Studio | Create | 25% | Completion score 0-1 (concept integration) |

**Base mastery** = `(slideshow + mystery + wonder + story) * 0.25` → range 0-1.0

### Spaced Repetition Decay

- Decay rate: **0.98/day** (gentle)
- Floor: **20%** (never fully forgotten)
- Formula: `displayedMastery = baseMastery * max(0.2, 0.98 ^ daysSinceLastReview)`
- Retention timeline: ~87% after 7 days, ~55% after 30 days, ~30% after 60 days
- Any mode revisit resets the decay timer

### Data Model Change

**File:** `frontend/src/hooks/useKnowledgeGraph.js`

Replace single `mastery` number with per-mode scores on each node:

```js
// OLD
{ mastery: 0.25, brightness: 'dim', lastReviewedAt: Date.now() }

// NEW
{
  masteryScores: {
    slideshow: 1.0,   // 0-1, set on view
    mystery: 0,       // 0-1, best Mystery Lab score
    wonder: 0,        // 0-1, best Wonder Lab score
    story: 0,         // 0-1, best Story Studio score
  },
  lastReviewedAt: Date.now(),
  // mastery + brightness are now computed (not stored)
}
```

**Computed properties** (add utility functions):
```js
function computeMastery(masteryScores) {
  const { slideshow = 0, mystery = 0, wonder = 0, story = 0 } = masteryScores || {}
  return (slideshow + mystery + wonder + story) * 0.25
}

function computeDisplayedMastery(masteryScores, lastReviewedAt) {
  const baseMastery = computeMastery(masteryScores)
  const daysSince = (Date.now() - (lastReviewedAt || Date.now())) / (1000 * 60 * 60 * 24)
  const decayFactor = Math.max(0.2, Math.pow(0.98, daysSince))
  return baseMastery * decayFactor
}
```

### Key changes in `useKnowledgeGraph.js`

1. **`addTopic()`** (line ~591): Set `masteryScores: { slideshow: 1.0, mystery: 0, wonder: 0, story: 0 }` instead of `mastery: 0.25`
2. **`updateMastery()`** (line ~699): Replace with `updateModeMastery(nodeId, mode, score)`:
   - `mode` is one of `'mystery' | 'wonder' | 'story'`
   - Only updates if new score > existing (best score kept)
   - Resets `lastReviewedAt` to now
   - Recomputes brightness from displayed mastery
3. **`getBrightness()`** (line ~260): Now takes displayed mastery (after decay) — no formula change, just input changes
4. **Backward compat**: On load from localStorage, migrate old `mastery` number → `masteryScores: { slideshow: oldMastery / 0.25, mystery: 0, wonder: 0, story: 0 }`

### Visual effect on constellation
Stars naturally dim over time as `displayedMastery` decays. This creates a living constellation where revisited topics glow brighter and neglected ones fade — naturally encouraging spaced repetition without explicit prompts.

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `frontend/src/components/ProgressTab/ProgressTab.jsx` | Gate gaps behind session flag |
| `frontend/src/components/Dashboard/TrophyShowcase.jsx` | Always show criteria text |
| `frontend/src/components/Dashboard/StatDetailSheet.jsx` | Rewrite StreakContent (calendar), rewrite TopicsContent (categorized), increase max-h |
| `frontend/src/components/Dashboard/StatsBar.jsx` | Remove XP line from rank stat |
| `backend/src/services/userProgress.js` | Replace SOCRATIC_5, add 5 badges, add activeDates tracking |
| `frontend/src/hooks/useKnowledgeGraph.js` | Export CLUSTER_CONFIG, redesign mastery model (per-mode scores + decay) |
| `frontend/src/components/Constellation/ConstellationStar.jsx` | Use computed displayed mastery for brightness |
| `frontend/src/App.jsx` | Pass activeDates in streak prop |

---

## Parallel Execution

| Track | Files | Can run in parallel |
|-------|-------|-------------------|
| A: Hide gaps | `ProgressTab.jsx` | Yes |
| B: Trophies | `TrophyShowcase.jsx`, `userProgress.js` | Yes |
| C: Stats bar fix | `StatsBar.jsx` | Yes |
| D: Mastery redesign | `useKnowledgeGraph.js`, `ConstellationStar.jsx` | Yes |
| E: StatDetailSheet (streak calendar + topics + max-h) | `StatDetailSheet.jsx`, `App.jsx` | After D (needs exported CLUSTER_CONFIG) |

---

## Verification
1. Journey tab → constellation shows NO recommended topics until "Discover" clicked
2. Trophies → 21 trophies, criteria always visible, no SOCRATIC_5, has Category Collector
3. Streak → month calendar with active days, navigate months
4. Stats bar → all 4 buttons same height, rank shows "Explorer" + "835 XP"
5. Topics → categorized with emojis, mastery % progress bars
6. Mastery → new topic starts at 25% (slideshow only), completing Mystery Lab bumps to ~50%, stars dim after days of inactivity
