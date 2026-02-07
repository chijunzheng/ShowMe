# Feature: App.jsx activeDates Prop Wiring

**ID:** 06
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Low
**Dependencies:** 02 (backend activeDates), 05 (StreakContent reads activeDates)

## Description

Pass `activeDates` from userProgress into the streak prop object in App.jsx so StreakContent can display the monthly calendar.

## Acceptance Criteria

- [ ] streak prop includes `activeDates` array from userProgress
- [ ] StreakContent receives and renders active dates correctly

## Implementation Details

### Files to Modify

- `frontend/src/App.jsx` (line ~3558)

### Changes

Update the streak prop passed to ProgressTab:

```jsx
// BEFORE
streak={{ current: userProgress?.streakCount || 0, todayCompleted: false }}

// AFTER
streak={{
  current: userProgress?.streakCount || 0,
  longest: userProgress?.longestStreak || 0,
  todayCompleted: false,
  activeDates: userProgress?.activeDates || [],
}}
```

---

**Created:** 2026-02-06
