# Feature: Fullscreen Maximize Control

**ID:** 03
**Status:** ✅ Completed
**Priority:** Medium
**Estimated Complexity:** Low
**Dependencies:** -

## Description

Add a maximize button to toggle Fullscreen API for immersive constellation navigation.

## Acceptance Criteria

- [x] Fullscreen toggle button is visible near zoom controls
- [x] Clicking enters fullscreen via `requestFullscreen`
- [x] Clicking again exits fullscreen via `exitFullscreen`
- [x] Fullscreen state updates via `fullscreenchange`

## Implementation Details

### Files to Modify
- `frontend/src/components/Constellation/Constellation.jsx` - button + fullscreen handlers
- `frontend/src/components/Constellation/__tests__/Constellation.test.jsx` - toggle tests

## Testing Requirements

- [x] Unit test for fullscreen button behavior

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
