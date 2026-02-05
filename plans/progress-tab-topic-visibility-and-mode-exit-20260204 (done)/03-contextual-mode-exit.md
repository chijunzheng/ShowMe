# Feature: Contextual Exit For Learning Modes

**ID:** 03  
**Status:** ✅ Completed  
**Priority:** High  
**Estimated Complexity:** Medium  
**Dependencies:** 01

## Description
All learning modes (Mystery/Wonder/Story) should have a fast “back” path that returns the user to where they came from:

- After slideshow (Mode Selector): exit → Mode Selector
- From Progress tab: exit → Progress tab

This should apply to both:
- Early exit (Exit button / back button)
- Completion flow (`onComplete`)

## Acceptance Criteria
- [x] Exiting Mystery/Wonder/Story returns to:
  - [x] Mode Selector when launched from Mode Selector
  - [x] Progress tab when launched from Progress
- [x] Completing Mystery/Wonder/Story returns to the same contextual destination.
- [x] “Skip for now” on the Mode Selector still returns to Home (Learn), not back to itself.

## Implementation Details
### Files To Modify
- `frontend/src/App.jsx`

### State
- Add `learnModeOrigin`:
  - `'after_slideshow' | 'from_progress' | null`

### Set Origin
- `handleModeSelect(mode)` sets `learnModeOrigin = 'after_slideshow'`
- `handleLaunchLearningMode(...)` sets `learnModeOrigin = 'from_progress'`

### Exit + Complete Routing
Update:
- `handleLearningModeExit()`
- `handleLearningModeComplete(result)`

Routing rules:
- If `learnModeOrigin === 'after_slideshow'`:
  - `activeTab = 'learn'`
  - `uiState = UI_STATE.MODE_SELECTOR`
- If `learnModeOrigin === 'from_progress'`:
  - `activeTab = 'progress'`
  - `uiState = UI_STATE.HOME` (Progress renders by tab)
- Always clear `selectedLearningMode` and reset `learnModeOrigin` to null.

### Mode Selector Skip
Replace Mode Selector `onSkip` with a dedicated handler that returns to Home (Learn).

## Testing Requirements
- [x] Manual: verify exit behavior from both entry points.

---
**Created:** 2026-02-04  
**Last Updated:** 2026-02-04  
**Implemented By:** Codex
