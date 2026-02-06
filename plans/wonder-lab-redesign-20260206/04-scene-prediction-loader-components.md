# Feature: Create SceneIntro, PredictionCards, ExperimentLoader

**ID:** 04
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 03

## Description

Create three new frontend components: SceneIntro (hero image + TTS), PredictionCards (tappable 2x2 grid), and ExperimentLoader (animated loading screen).

## Acceptance Criteria

- [ ] SceneIntro shows hero image with fade-in, scenario text, TTS playing indicator
- [ ] PredictionCards displays 4 cards in 2x2 grid, toggleable selection, haptic feedback
- [ ] PredictionCards has "Run the Experiment" button, disabled until at least 1 card selected
- [ ] ExperimentLoader shows animated "Running the experiment..." state
- [ ] All components support dark mode
- [ ] Mobile responsive (cards stack on very small screens)
- [ ] Chinese text renders correctly

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/WhatIf/SceneIntro.jsx` (~80 lines)
- `frontend/src/components/LearnModes/WhatIf/PredictionCards.jsx` (~120 lines)
- `frontend/src/components/LearnModes/WhatIf/ExperimentLoader.jsx` (~50 lines)

### SceneIntro.jsx

**Pattern:** Adapted from `MysteryIntro.jsx`

**Props:**
- `scenario` - The "What if..." question text
- `scenarioImage` - Hero image URL (nullable)
- `isTtsPlaying` - Whether TTS is currently narrating
- `onNext` - Callback to proceed to predictions

**Layout:**
- 16:9 hero image container with fade-in (same as MysteryIntro)
- Scenario text card below image
- "Make Your Predictions" button (disabled while TTS playing)
- Blue/cyan gradient theme (vs Mystery's purple/indigo)

### PredictionCards.jsx

**Props:**
- `cards` - Array of 4 `{ id, text }` (stripped of isCorrect for UI)
- `onSubmit` - Callback with array of selected card IDs
- `disabled` - Disable interactions

**Behavior:**
- 2x2 grid layout (CSS grid)
- Tap to toggle selection (with haptic + visual feedback)
- Selected cards get border highlight + checkmark
- "Run the Experiment" button at bottom
- Button disabled until >= 1 card selected

### ExperimentLoader.jsx

**Props:**
- `message` - Optional custom message (default: "Running the experiment...")

**Layout:**
- Centered spinner with pulsing text
- Science-themed (beaker/flask emoji)
- Same gradient background as rest of WonderLab

## Dependencies

### Depends On
- **Feature 03:** SceneIntro may use narration state

### Blocks
- **Feature 05:** WonderLab orchestrator renders these components

## Testing Requirements

- [ ] SceneIntro: renders scenario text, shows placeholder when no image
- [ ] PredictionCards: selection toggle, submit callback with selected IDs
- [ ] PredictionCards: button disabled when nothing selected
- [ ] ExperimentLoader: renders loading message

## Implementation Checklist

- [ ] Create SceneIntro.jsx
- [ ] Create PredictionCards.jsx
- [ ] Create ExperimentLoader.jsx
- [ ] Write tests
- [ ] Code review

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
