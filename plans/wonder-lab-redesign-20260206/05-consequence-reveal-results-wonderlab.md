# Feature: Create ConsequenceReveal, ResultsSummary, Rewrite WonderLab

**ID:** 05
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 02, 04

## Description

Create the ConsequenceReveal mini-slideshow component, ResultsSummary score screen, and rewrite the WonderLab.jsx orchestrator with a 6-state `useReducer` machine.

## Acceptance Criteria

- [ ] ConsequenceReveal shows one consequence at a time with image + TTS
- [ ] Correct predictions get celebration animation
- [ ] Missed consequences get gentle "here's what happens" reveal
- [ ] Auto-advances after TTS ends (with manual next button as fallback)
- [ ] ResultsSummary shows score (0/2, 1/2, 2/2), XP animation, bonus fact with TTS
- [ ] WonderLab state machine: LOADING → SCENE_INTRO → PREDICT → GENERATING_REVEALS → REVEAL → RESULTS
- [ ] Two-phase generation: scenario first (text-only), reveal assets after prediction
- [ ] XP: 2/2=50, 1/2=25, 0/2=10
- [ ] onComplete callback passes xpEarned
- [ ] Error handling with retry
- [ ] Back button with confirmation when in-progress

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/WhatIf/ConsequenceReveal.jsx` (~200 lines)
- `frontend/src/components/LearnModes/WhatIf/ResultsSummary.jsx` (~120 lines)

### Files to Rewrite

- `frontend/src/components/LearnModes/WhatIf/WonderLab.jsx` (~350 lines)

### ConsequenceReveal.jsx

**Props:**
- `revealAssets` - Array of `{ id, imageUrl, audioUrl, text, isCorrect, revealNarration }`
- `userSelections` - Set of card IDs the user selected
- `narrate` - Narration function from useWonderNarration
- `isPlaying` - TTS playing state
- `onComplete` - Callback when all reveals done

**Behavior:**
- Steps through consequences one at a time
- Each step: image fades in, TTS plays narration
- If user predicted correctly: green border + celebration (vibrateSuccess)
- If user missed: blue border + gentle reveal
- "Next" button or auto-advance after TTS

### ResultsSummary.jsx

**Props:**
- `correctCount` - Number of correct predictions (0, 1, or 2)
- `totalCorrect` - Always 2
- `xpEarned` - XP to display
- `bonusFact` - Bonus fact text
- `bonusFactAudioUrl` - TTS audio for bonus fact (nullable)
- `narrate` - Narration function
- `onComplete` - Done callback
- `onRetry` - Try another scenario callback

**Layout:**
- Score display with animation
- XP award banner
- BonusFactCard (reused existing component)
- "Done" and "Try Another" buttons

### WonderLab.jsx Rewrite

**State Machine (useReducer):**
```
STATE = { LOADING, SCENE_INTRO, PREDICT, GENERATING_REVEALS, REVEAL, RESULTS }

ACTIONS:
- SCENARIO_LOADED → SCENE_INTRO
- START_PREDICTIONS → PREDICT
- SUBMIT_PREDICTIONS → GENERATING_REVEALS
- REVEALS_READY → REVEAL
- REVEALS_COMPLETE → RESULTS
- ERROR
- RETRY → LOADING
```

**Two-Phase Generation:**
1. Mount: fetch `/api/learn/whatif` (text-only, fast) + generate hero image
2. After prediction: fetch `/api/learn/whatif/reveal-assets` (images + TTS, parallel)

**XP Calculation (deterministic):**
```javascript
const correctPredictions = selectedCards.filter(id =>
  scenario.predictionCards.find(c => c.id === id)?.isCorrect
)
const xp = correctPredictions.length === 2 ? 50 : correctPredictions.length === 1 ? 25 : 10
```

## Dependencies

### Depends On
- **Feature 02:** Needs reveal-assets endpoint
- **Feature 04:** Renders SceneIntro, PredictionCards, ExperimentLoader

### Blocks
- **Feature 06:** Cleanup depends on WonderLab being rewritten

## Testing Requirements

- [ ] ConsequenceReveal: steps through consequences, correct/missed styling
- [ ] ResultsSummary: correct XP values for 0/1/2 correct
- [ ] WonderLab: state transitions (LOADING → SCENE_INTRO → PREDICT → etc.)
- [ ] WonderLab: error handling and retry
- [ ] WonderLab: onComplete called with xpEarned

## Implementation Checklist

- [ ] Create ConsequenceReveal.jsx
- [ ] Create ResultsSummary.jsx
- [ ] Rewrite WonderLab.jsx with useReducer
- [ ] Wire up two-phase generation
- [ ] Write tests
- [ ] Code review

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
