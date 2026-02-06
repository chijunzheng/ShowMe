# Wonder Lab Redesign: Visual What-If Simulator

## Problem
Current Wonder Lab asks kids to open-endedly speak predictions into a mic. This is high-friction and intimidating - kids don't want to talk to a void.

## Solution
Replace open-ended voice with **tappable prediction cards** + **rich multimedia reveals** (TTS narration + AI-generated images throughout). No voice input - voice is output-only (AI narrates to the kid).

## New UX Flow

```
LOADING → SCENE_INTRO → PREDICT → GENERATING_REVEALS → REVEAL → RESULTS
```

1. **SCENE_INTRO**: Hero image fades in + TTS dramatically narrates the "what if" question
2. **PREDICT**: 4 consequence cards (2 correct, 2 plausible-but-wrong) in a 2x2 grid. Kid taps which ones they think would happen
3. **GENERATING_REVEALS**: "Running the experiment..." animation while generating images + TTS for each correct consequence
4. **REVEAL**: Mini-slideshow - each correct consequence revealed one at a time with generated image + TTS. Correct predictions get celebration. Missed ones get gentle "here's what happens" reveal
5. **RESULTS**: Score, XP earned, bonus mind-blowing fact with TTS narration

## Backend Changes

### 1. Rewrite `generateWhatIfScenario()` in `backend/src/services/gemini.js` (lines 3060-3185)

New response schema:
```json
{
  "scenario": "What if the moon disappeared tonight?",
  "scenarioImagePrompt": "Earth's night sky without a moon...",
  "scenarioNarration": "Imagine you look up tonight... the moon is gone!",
  "predictionCards": [
    { "id": "card-1", "text": "Ocean tides would shrink", "isCorrect": true, "revealNarration": "Without the moon's gravity...", "revealImagePrompt": "Calm flat ocean..." },
    { "id": "card-2", "text": "Days would get shorter", "isCorrect": false },
    { "id": "card-3", "text": "Earth's axis would wobble", "isCorrect": true, "revealNarration": "The moon stabilizes...", "revealImagePrompt": "Earth wobbling..." },
    { "id": "card-4", "text": "All plants would die", "isCorrect": false }
  ],
  "bonusFact": "The moon drifts away at 3.8cm/year!",
  "bonusFactNarration": "Here's something mind-blowing..."
}
```
- Exactly 4 cards: 2 correct + 2 wrong (validate in parsing)
- Only correct cards get `revealNarration` + `revealImagePrompt`
- Increase `maxOutputTokens` from 900 to ~1200

### 2. Add `POST /api/learn/whatif/reveal-assets` in `backend/src/routes/learn.js`

Generates images + TTS for each correct consequence in parallel after user predicts:
- Request: `{ consequences: [{id, revealNarration, revealImagePrompt}], scenarioNarration, bonusFactNarration, topicName, explanationLevel }`
- Response: `{ scenarioAudioUrl, revealAssets: [{id, imageUrl, audioUrl}], bonusFactAudioUrl }`
- Uses existing `generateEducationalImage()` + `generateTTS()` via `Promise.all`

### 3. Remove `evaluateWhatIfPrediction()` from `gemini.js` (lines 3441-3554)

Evaluation is now deterministic (based on `isCorrect` field).

### 4. Remove `POST /api/learn/whatif/evaluate` from `learn.js` (lines 498-557)

### 5. Update `POST /api/learn/whatif` route handler (lines 414-482)

Pass through new response shape from rewritten service.

## Frontend Changes

### New Components (in `frontend/src/components/LearnModes/WhatIf/`)

| Component | Lines | Description |
|-----------|-------|-------------|
| `SceneIntro.jsx` | ~80 | Hero image + TTS narration of scenario (pattern: MysteryIntro.jsx) |
| `PredictionCards.jsx` | ~120 | 4 tappable cards in 2x2 grid, haptic feedback, "Run Experiment" button |
| `ExperimentLoader.jsx` | ~50 | "Running the experiment..." animated loading |
| `ConsequenceReveal.jsx` | ~200 | Mini-slideshow: image + TTS per consequence, celebration for correct predictions |
| `ResultsSummary.jsx` | ~120 | Score, XP animation, bonus fact with TTS |
| `useWonderNarration.js` | ~250 | TTS hook (adapted from `useMysteryNarration.js`) |

### Rewrite `WonderLab.jsx` (~350 lines)

- `useReducer` state machine (6 states) following MysteryLab.jsx pattern
- Two-phase generation: scenario+cards first (fast text-only), reveal assets after prediction (image+TTS)
- XP calculation: 2/2=50, 1/2=25, 0/2=10 (always positive)

### Delete Components
- `ThinkPrompts.jsx` - replaced by PredictionCards
- `PredictionRecorder.jsx` - replaced by PredictionCards (voice input removed entirely)
- `WhatIfScene.jsx` - replaced by SceneIntro

### Keep
- `BonusFactCard.jsx` - reused in ResultsSummary

## Key Reusable Patterns
- `useMysteryNarration.js` → copy as `useWonderNarration.js`
- `MysteryLab.jsx` reducer pattern → WonderLab reducer
- `MysteryIntro.jsx` layout → SceneIntro layout
- `generateEducationalImage()` + `generateTTS()` → reveal asset generation
- `/api/learn/mystery/image` endpoint → scenario hero image

## Implementation Sequence

**Phase 1 - Backend**: Rewrite `generateWhatIfScenario` prompt + parsing, add `/whatif/reveal-assets` route, remove evaluate endpoint + service, update tests
**Phase 2 - Frontend infra**: Create `useWonderNarration.js`, `ExperimentLoader.jsx`, `PredictionCards.jsx`, `SceneIntro.jsx`
**Phase 3 - Frontend core**: `ConsequenceReveal.jsx`, `ResultsSummary.jsx`, rewrite `WonderLab.jsx` orchestrator
**Phase 4 - Cleanup**: Delete `ThinkPrompts.jsx`, `PredictionRecorder.jsx`, `WhatIfScene.jsx`, update imports

## Verification

### Tests
- Backend: new response schema validation (4 cards, 2 correct), reveal-assets endpoint, error handling
- Frontend: state transitions, card selection, celebration triggers

### Manual Testing
- [ ] Full happy path with TTS + images at each stage
- [ ] 0/1/2 correct predictions → correct XP values (10/25/50)
- [ ] Image/TTS failure graceful degradation
- [ ] Mobile responsive 2x2 card grid
- [ ] Dark mode
- [ ] Chinese language support
