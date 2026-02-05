# Feature: Remove Story "coming soon" Toast

**ID:** 01  
**Status:** ✅ Completed  
**Priority:** High  
**Estimated Complexity:** Low  
**Dependencies:** -

## Description

Story mode is functional, but the app still displays a placeholder toast (“story mode coming soon”) when the user selects it. Remove this toast so the UI matches actual behavior.

## Acceptance Criteria

- [ ] Selecting Story mode does not display “coming soon” toast.
- [ ] Mystery Lab and Wonder Lab behavior unchanged.

## Implementation Details

### Files to Modify

- `frontend/src/App.jsx`

### Steps

1. In `handleModeSelect`, remove the `if (mode === 'story') showToast(...)` block.
2. Ensure story mode still transitions to `UI_STATE.LEARN_MODE` and renders `StoryStudio`.

## Testing Requirements

- [ ] Manual smoke check (UI): select Story mode → no “coming soon” toast.

---

**Created:** 2026-02-05  
**Last Updated:** 2026-02-05
