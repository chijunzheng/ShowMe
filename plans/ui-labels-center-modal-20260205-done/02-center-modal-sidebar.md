# Feature: Center random topic modal on content area

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** 01

## Description

Modal uses `fixed inset-0` so it centers on the full viewport. With sidebar visible (256px), the modal appears shifted left. Fix by adding `hasSidebar` prop and conditionally applying `md:left-64`.

## Acceptance Criteria

- [ ] Modal centered relative to content area when sidebar is visible
- [ ] Modal still centered on full viewport when sidebar is hidden
- [ ] Uses same `hasSidebar` pattern as BottomTabBar.jsx

## Files to Modify

- `frontend/src/components/Home/RandomTopicModal.jsx` — add `hasSidebar` prop, conditionally add `md:left-64`
- `frontend/src/components/screens/HomeScreen.jsx` — accept and pass `hasSidebar` prop
- `frontend/src/App.jsx` — pass `hasSidebar={topics.length > 0}` to HomeScreen

## Implementation Checklist

- [ ] Add `hasSidebar = false` prop to RandomTopicModal
- [ ] Conditionally apply `md:left-64` on backdrop div
- [ ] Thread `hasSidebar` through HomeScreen
- [ ] Pass `hasSidebar={topics.length > 0}` from App.jsx
