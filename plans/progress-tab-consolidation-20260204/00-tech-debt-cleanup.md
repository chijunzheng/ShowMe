# Feature: Technical Debt Cleanup

**ID:** 00 (Pre-requisite)
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None (should be done FIRST)

## Description

Clean up technical debt in World and Tree implementations before building new Progress Tab. This ensures the new consolidated tab is built on clean, maintainable code.

## Issues to Address

### 1. Duplicated Review Status Logic (HIGH)

**Problem:** `getDaysSinceReview()` and `getReviewStatus()` are duplicated in:
- `LivingWorldView.jsx` (lines 26-40, 479-493)
- `TreeTab.jsx` (lines 26-40)

**Solution:** Extract to shared utility module.

**Create:** `frontend/src/utils/reviewUtils.js`
```javascript
export const REVIEW_THRESHOLD_DAYS = 7
export const REVIEW_SLEEPY_DAYS = 14

export const getDaysSinceReview = (date) => {
  if (!date) return Infinity
  return Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24))
}

export const getReviewStatus = (lastReviewedAt, unlockedAt) => {
  const days = getDaysSinceReview(lastReviewedAt || unlockedAt)
  if (days > REVIEW_SLEEPY_DAYS) return 'due'
  if (days > REVIEW_THRESHOLD_DAYS) return 'fading'
  return 'fresh'
}
```

### 2. Duplicated Constants (MEDIUM)

**Problem:** Zone icons, tier labels duplicated across files.

**Solution:** Create shared constants module.

**Create:** `frontend/src/constants/world.js`
```javascript
export const ZONE_ICONS = {
  nature: '🌿',
  civilization: '🏛️',
  arcane: '🔮'
}

export const TIER_CONFIG = {
  barren: { icon: '🏜️', label: 'Barren', color: 'stone' },
  sprouting: { icon: '🌱', label: 'Sprouting', color: 'emerald' },
  growing: { icon: '🌿', label: 'Growing', color: 'green' },
  thriving: { icon: '🌳', label: 'Thriving', color: 'teal' },
  legendary: { icon: '✨', label: 'Legendary', color: 'purple' }
}

export const REVIEW_STATUS = {
  DUE: 'due',
  FADING: 'fading',
  FRESH: 'fresh'
}
```

### 3. Oversized Component - LivingWorldView (HIGH)

**Problem:** `LivingWorldView.jsx` is 1048 lines (limit: 800).

**Solution:** Extract inline components to separate files.

**Extract to new files:**
- `frontend/src/components/LivingWorld/LoadingSkeleton.jsx`
- `frontend/src/components/LivingWorld/RegeneratingOverlay.jsx`
- `frontend/src/components/LivingWorld/DiscoveryToast.jsx`
- `frontend/src/components/LivingWorld/EmptyState.jsx`
- `frontend/src/components/LivingWorld/ErrorState.jsx`
- `frontend/src/components/LivingWorld/PieceDetailPanel.jsx`

**Target:** Reduce LivingWorldView.jsx to <600 lines.

### 4. Console.log in Production (MEDIUM)

**Problem:** Debug statements left in hooks.

**Files to clean:**
- `frontend/src/hooks/usePocketScene.js` (line 80) - Remove console.log
- `frontend/src/hooks/useReviewSession.js` (line 85) - Remove console.log

### 5. Hardcoded Magic Numbers (LOW)

**Problem:** Magic numbers scattered in code.

**Solution:** Add to constants:
```javascript
// In constants/world.js
export const TOAST_DURATION_MS = 5200
export const DEFAULT_HIGHLIGHT = { x: 0.5, y: 0.55, radius: 150 }
export const GOLDEN_RATIO = 0.618033988749895
```

### 6. Unused Code (LOW)

**Problem:** `handleStartLearning` in MagicalTree.jsx is never called.

**Solution:** Remove dead code from `MagicalTree.jsx` (lines 246-249).

## Acceptance Criteria

- [ ] `reviewUtils.js` created with shared review status logic
- [ ] `constants/world.js` created with shared constants
- [ ] LivingWorldView.jsx reduced to <600 lines
- [ ] No console.log statements in production hooks
- [ ] No dead code
- [ ] All existing tests still pass
- [ ] No console errors

## Implementation Checklist

- [ ] Create `frontend/src/utils/reviewUtils.js`
- [ ] Create `frontend/src/constants/world.js`
- [ ] Update LivingWorldView.jsx to import shared utilities
- [ ] Update TreeTab.jsx to import shared utilities
- [ ] Extract LoadingSkeleton to separate file
- [ ] Extract DiscoveryToast to separate file
- [ ] Extract EmptyState to separate file
- [ ] Extract ErrorState to separate file
- [ ] Extract PieceDetailPanel to separate file
- [ ] Remove console.log from usePocketScene.js
- [ ] Remove console.log from useReviewSession.js
- [ ] Remove dead handleStartLearning from MagicalTree.jsx
- [ ] Run build to verify no errors
- [ ] Run tests to verify no regressions
- [ ] Code review

## Testing Requirements

- [ ] LivingWorldView still renders correctly
- [ ] TreeTab still renders correctly
- [ ] Review status displays correctly (due/fading/fresh)
- [ ] Zone icons display correctly
- [ ] All existing component tests pass

## Notes

- This feature should be completed FIRST before building new Progress Tab
- Clean code makes future features easier to build
- Shared utilities will be used by new ProgressTab components

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** TBD
