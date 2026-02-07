# Feature: Rename "Progress" tab to "Journey"

**ID:** 03
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** None

## Description

Rename the bottom tab from "Progress" to "Journey" with a compass emoji. Keep `id: 'progress'` unchanged (used as logical key throughout App.jsx).

## Acceptance Criteria

- [ ] Tab label shows "Journey" instead of "Progress"
- [ ] Tab icon shows 🧭 instead of 📊
- [ ] aria-label updated to "Journey"
- [ ] JSDoc comments updated
- [ ] Tab id remains 'progress' (no logic change)

## Files to Modify

- `frontend/src/components/BottomTabBar.jsx` (line 46) — label 'Progress' → 'Journey', update JSDoc
- `frontend/src/components/icons/TabIcons.jsx` (lines 57-67) — emoji 📊 → 🧭, aria-label → "Journey"

## Implementation Checklist

- [ ] Change label in BottomTabBar tabs array
- [ ] Change emoji in ProgressIcon component
- [ ] Update aria-label in ProgressIcon
- [ ] Update JSDoc comments referencing "Progress" label
