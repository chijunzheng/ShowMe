# Feature: Trophy Improvements

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Three sub-changes:
- 2a: Always show "how to achieve" criteria text on trophies (not just on click)
- 2b: Replace SOCRATIC_5 with CATEGORY_COLLECTOR + add 5 new trophies (16 → 21 total)
- 2c: Make trophy modal bigger (70vh → 85vh)

## Acceptance Criteria

- [ ] Trophy criteria text always visible (not gated behind selection)
- [ ] SOCRATIC_5 badge removed, replaced with CATEGORY_COLLECTOR
- [ ] 5 new badges added: PERFECT_PREDICTION, SPEED_LEARNER, MULTI_MODE, DETECTIVE_ACE, NIGHT_OWL
- [ ] Total badge count is 21
- [ ] New progress fields added to default progress: `categoriesLearned`, `perfectPredictions`, `topicsLearnedToday`, `multiModeTopics`, `detectiveAceCount`, `nightOwlActivity`
- [ ] Badge-check logic works for all new badges
- [ ] Trophy detail sheet max-height increased to 85vh
- [ ] Backward compatibility maintained (normalizeProgress defaults new fields)

## Implementation Details

### Files to Modify

- `frontend/src/components/Dashboard/TrophyShowcase.jsx` (2a)
- `backend/src/services/userProgress.js` (2b)
- `frontend/src/components/Dashboard/StatDetailSheet.jsx` (2c)

### 2a: TrophyShowcase.jsx (line 192-199)

Remove the `isSelected &&` condition wrapping the criteria text. Always render the description/criteriaText span:

```jsx
// BEFORE
{isSelected && (
  <span className="...">
    {isLocked ? trophy.criteriaText || 'Keep exploring to unlock!' : trophy.description || ''}
  </span>
)}

// AFTER
<span className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-tight">
  {isLocked
    ? trophy.criteriaText || 'Keep exploring to unlock!'
    : trophy.description || ''}
</span>
```

### 2b: userProgress.js — Badge Changes

**Replace** SOCRATIC_5 with:
```js
CATEGORY_COLLECTOR: {
  id: 'CATEGORY_COLLECTOR',
  name: 'Category Collector',
  description: 'Learned topics in 5+ different categories',
  icon: 'compass',
  criteriaText: 'Learn topics in 5+ categories',
  criteria: { categoriesLearned: 5 }
}
```

**Add 5 new badges** after MASTER_LEARNER:
```js
PERFECT_PREDICTION: { id: 'PERFECT_PREDICTION', name: 'Perfect Prediction', description: 'Got all predictions correct in Wonder Lab', icon: 'star', criteriaText: 'Get all predictions correct in Wonder Lab', criteria: { perfectPredictions: 1 } },
SPEED_LEARNER: { id: 'SPEED_LEARNER', name: 'Speed Learner', description: 'Learned 5 topics in one day', icon: 'rocket', criteriaText: 'Learn 5 topics in one day', criteria: { topicsLearnedToday: 5 } },
MULTI_MODE: { id: 'MULTI_MODE', name: 'Mode Master', description: 'Completed all 3 learn modes for a topic', icon: 'medal', criteriaText: 'Complete all 3 learn modes for one topic', criteria: { multiModeTopics: 1 } },
DETECTIVE_ACE: { id: 'DETECTIVE_ACE', name: 'Detective Ace', description: 'Solved a Mystery Lab case with all clues found', icon: 'fire', criteriaText: 'Solve a mystery with all clues found', criteria: { detectiveAceCount: 1 } },
NIGHT_OWL: { id: 'NIGHT_OWL', name: 'Night Owl', description: 'Learned after 10 PM', icon: 'star', criteriaText: 'Learn something after 10 PM', criteria: { nightOwlActivity: true } },
```

**Add default progress fields** in `createDefaultProgress`:
```js
categoriesLearned: 0,
perfectPredictions: 0,
topicsLearnedToday: 0,
topicsLearnedTodayDate: null,
multiModeTopics: 0,
detectiveAceCount: 0,
nightOwlActivity: false,
```

**Add badge-check support** in `applyActivityUpdate`:
- On `topic_learned`: increment `topicsLearnedToday` (reset if date changed), check night owl (hour >= 22)
- On `wonder_complete`: check if metadata has `perfectPrediction: true` → increment `perfectPredictions`
- On `mystery_complete`: check if metadata has `allCluesFound: true` → increment `detectiveAceCount`

**normalizeProgress**: default new fields for backward compat.

### 2c: StatDetailSheet.jsx (line 319)

Change `max-h-[70vh]` → `max-h-[85vh]`

---

**Created:** 2026-02-06
