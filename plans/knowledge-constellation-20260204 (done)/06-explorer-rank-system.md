# Feature 06: Explorer Rank Progression System

**ID:** 06
**Status:** ✅ Completed
**Priority:** Medium
**Estimated Complexity:** Low
**Dependencies:** 01

## Description

Replace the tree-level progression system with Explorer Ranks. Users progress from Stargazer to Pioneer based on the number of topics explored. Includes rank badge display, progress indicator, and celebration animation on rank up.

## Acceptance Criteria

- [ ] 7 explorer ranks defined with titles and icons
- [ ] Current rank displayed in stats bar
- [ ] Progress bar shows progress to next rank
- [ ] Rank up triggers celebration animation
- [ ] Rank persisted with user progress
- [ ] Works with existing XP/streak system
- [ ] Celebration can be dismissed or auto-closes

## Implementation Details

### Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/components/ExplorerRank/ExplorerRankBadge.jsx` | Current rank display |
| `frontend/src/components/ExplorerRank/ExplorerRankProgress.jsx` | Progress to next rank |
| `frontend/src/components/ExplorerRank/RankUpCelebration.jsx` | Animation on rank up |
| `frontend/src/components/ExplorerRank/explorerRankUtils.js` | Rank calculation utilities |

### Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/components/ProgressTab/StatsBar.jsx` | Show explorer rank instead of tree level |
| `frontend/src/hooks/useUserProgress.js` | Add rank calculation |

### Rank Definitions

```javascript
const EXPLORER_RANKS = [
  { level: 1, title: 'Stargazer', icon: '🔭', minTopics: 0, color: '#94A3B8' },
  { level: 2, title: 'Observer', icon: '👁️', minTopics: 3, color: '#60A5FA' },
  { level: 3, title: 'Navigator', icon: '🧭', minTopics: 8, color: '#34D399' },
  { level: 4, title: 'Cartographer', icon: '🗺️', minTopics: 15, color: '#FBBF24' },
  { level: 5, title: 'Astronomer', icon: '⭐', minTopics: 25, color: '#F472B6' },
  { level: 6, title: 'Cosmologist', icon: '🌌', minTopics: 40, color: '#A78BFA' },
  { level: 7, title: 'Pioneer', icon: '🚀', minTopics: 60, color: '#F97316' },
]
```

### Utility Functions

```javascript
// explorerRankUtils.js

// Get current rank from topic count
function getExplorerRank(topicCount) {
  return EXPLORER_RANKS
    .slice()
    .reverse()
    .find(r => topicCount >= r.minTopics)
}

// Get progress to next rank (0-1)
function getRankProgress(topicCount) {
  const current = getExplorerRank(topicCount)
  const currentIndex = EXPLORER_RANKS.findIndex(r => r.level === current.level)
  const next = EXPLORER_RANKS[currentIndex + 1]

  if (!next) return { current, next: null, progress: 1 }

  const rangeSize = next.minTopics - current.minTopics
  const progressInRange = topicCount - current.minTopics

  return {
    current,
    next,
    progress: progressInRange / rangeSize,
    topicsToNext: next.minTopics - topicCount
  }
}

// Check if rank changed
function checkRankUp(oldCount, newCount) {
  const oldRank = getExplorerRank(oldCount)
  const newRank = getExplorerRank(newCount)
  return newRank.level > oldRank.level ? newRank : null
}
```

### Component Specifications

#### ExplorerRankBadge

```jsx
<ExplorerRankBadge
  rank={currentRank}
  size="small" | "medium" | "large"
  showTitle={true}
/>
```

Visual:
```
🔭 Stargazer
```

- Icon + title
- Color based on rank
- Subtle glow animation for high ranks

#### ExplorerRankProgress

```jsx
<ExplorerRankProgress
  current={currentRank}
  next={nextRank}
  progress={0.65}
  topicsToNext={5}
/>
```

Visual:
```
🔭 Stargazer ────────▓▓▓▓▓░░░░░─────── 👁️ Observer
                     65% (5 more topics)
```

- Horizontal progress bar
- Current and next rank icons at ends
- Optional text showing topics needed

#### RankUpCelebration

```jsx
<RankUpCelebration
  newRank={rank}
  isVisible={showCelebration}
  onClose={() => setShowCelebration(false)}
/>
```

Visual:
- Full-screen overlay
- Star/particle effects
- New rank icon prominently displayed
- "You are now a Navigator!" text
- Auto-dismiss after 3 seconds or tap

## Dependencies

### Depends On
- **Feature 01:** Knowledge Graph Data Model (rank definitions)

### Blocks
- **Feature 08:** Legacy removal replaces tree level with this

## Testing Requirements

- [ ] Unit tests for `getExplorerRank()` at all boundaries
- [ ] Unit tests for `getRankProgress()` calculations
- [ ] Unit tests for `checkRankUp()` detection
- [ ] Component tests for badge at each rank
- [ ] Component tests for progress bar
- [ ] Component tests for celebration animation
- [ ] E2E test for rank up flow

## Implementation Checklist

- [x] Create `explorerRankUtils.js` with all utilities
- [x] Create `ExplorerRankBadge.jsx`
- [x] Create `ExplorerRankProgress.jsx`
- [x] Create `RankUpCelebration.jsx`
- [x] Modify `StatsBar.jsx` to use ExplorerRankBadge
- [x] Add rank-up detection to `useUserProgress.js`
- [x] Trigger celebration on rank up
- [x] Write unit tests for utilities
- [x] Write component tests

## Notes

- Rank colors should work in both light and dark modes
- Consider haptic feedback on mobile for rank up
- Celebration should be skippable (accessibility)
- Store previous rank to detect changes on app load

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
