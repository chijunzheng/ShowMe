# Feature: Streak Calendar Backfill

**ID:** 01
**Status:** :white_large_square: Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** None
**Track:** A (independent)

## Description

Backfill `activeDates` in `normalizeProgress()` so the streak calendar shows orange dots for existing users who had streaks before the `activeDates` field was added.

## Root Cause

`activeDates` field was added but existing users have no historical data. `normalizeProgress()` defaults to `[]`, so calendar renders empty despite streak=2.

## Acceptance Criteria

- [ ] When `activeDates` is empty but `lastActiveDate` exists, dates are backfilled from streak count
- [ ] Backfill uses immutable pattern (new object, not mutation)
- [ ] Backfill caps at 30 days max
- [ ] Existing users with streak=2 see 2 orange dots on calendar

## Implementation Details

### Files to Modify

- `backend/src/services/userProgress.js` — `normalizeProgress()` (~line 405)

### Implementation

In `normalizeProgress()`, after building the return object, add backfill logic:

```js
// After the existing return object is built, store in a variable
let result = { ...merged, ... }

// Backfill activeDates from lastActiveDate + streakCount if empty
if (result.activeDates.length === 0 && result.lastActiveDate) {
  const lastDate = new Date(result.lastActiveDate)
  const dates = []
  for (let i = Math.min(result.streakCount, 30) - 1; i >= 0; i--) {
    const d = new Date(lastDate)
    d.setDate(d.getDate() - i)
    dates.push(getDateKey(d))
  }
  result = { ...result, activeDates: dates }
}

return result
```

### Technical Decisions

- **Immutability:** Build new object via spread, never mutate
- **Cap at 30:** Prevents unreasonable backfill for corrupted streak counts
- **Approximate:** Backfill assumes consecutive days, which is approximate but better than empty

## Notes

Single-file, low-risk change. The `getDateKey()` helper already exists in the file.
