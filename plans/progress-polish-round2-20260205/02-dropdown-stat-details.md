# Feature: Dropdown stat details

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** None

## Description

Convert the stat detail sheet from a bottom sheet (slides up from bottom) to a dropdown card that appears below the stats bar. Cleaner UX that doesn't cover the full screen.

## Acceptance Criteria

- [ ] Tapping a stat opens a dropdown card below the stats bar (not a bottom sheet)
- [ ] Dropdown has rounded corners on all sides (not just top)
- [ ] Backdrop click and Escape key still close the dropdown
- [ ] Dropdown doesn't exceed 70vh height
- [ ] Build passes

## Implementation Details

### Files to Modify

- `frontend/src/components/Dashboard/StatDetailSheet.jsx`

### StatDetailSheet.jsx Changes

**Outer container (backdrop):**
- Change `items-end` to `items-start` (anchor content to top of viewport instead of bottom)

**Inner sheet div:**
- Replace `rounded-t-3xl` with `rounded-2xl`
- Remove `border-t-4 border-x-4` (bottom-sheet top-only border) — replace with `border-2` all around
- Remove `shadow-[0_-4px_0_0_#000]` (upward shadow) — replace with `shadow-[3px_3px_0_0_#000]` (neobrutalism downward)
- Add `mt-16 mx-4` to offset below stats bar
- Change `max-h-[85vh]` to `max-h-[70vh]`
- Change `pb-8` to `pb-5` (no extra bottom padding needed)
- Replace `animate-[slide-up_0.3s_ease-out]` with `animate-[fade-in_0.2s_ease-out]`

**Keep unchanged:**
- Escape key handler
- Backdrop click handler
- Body scroll lock
- All content sub-components (StreakContent, XPContent, TopicsContent, TrophiesContent)

## Testing Requirements

- [ ] Build passes (`npm run build`)
- [ ] Dropdown appears at top, not bottom
- [ ] Backdrop and Escape still work

## Implementation Checklist

- [ ] Edit StatDetailSheet.jsx — change positioning and styling
- [ ] Verify build

---

**Created:** 2026-02-05
