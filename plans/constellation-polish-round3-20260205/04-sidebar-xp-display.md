# Feature: Sidebar XP Display

**ID:** 04
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** None

## Description

The left sidebar shows rank title, progress bar, and streak count — but the actual XP number is missing. Add it to the compact stats row.

## Acceptance Criteria

- [ ] XP number is visible in the sidebar's compact stats row
- [ ] Format: "⭐ 100" (star emoji + number with locale formatting)
- [ ] Positioned between the progress bar and streak count
- [ ] Build passes

## Implementation Details

### Files to Modify

- `frontend/src/components/TopicSidebar.jsx`

### TopicSidebar.jsx — Add XP number

**Lines 391-395:** In the flex row containing the progress bar and streak, add XP display.

Current layout: `[====progress bar====] 🔥 1`
New layout: `[====progress bar====] ⭐ 100  🔥 1`

Before the streak `<span>` (line ~393), add:
```jsx
<span className="text-xs flex items-center gap-0.5 text-indigo-500">
  ⭐ {totalXP.toLocaleString()}
</span>
```

Note: `totalXP` is already available as a prop (line 37) and used for rank calculation (line 40).

## Implementation Checklist

- [ ] Edit TopicSidebar.jsx — add XP number display
- [ ] Verify build

---

**Created:** 2026-02-05
