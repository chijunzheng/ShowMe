# 07 - Wonder Lab: Loading Screen Polish

## Dependencies
- 04-scene-prediction-loader-components.md (ExperimentLoader must exist)
- 05-consequence-reveal-results-wonderlab.md (WonderLab reducer must exist)

## Goal
Keep the loading screen visible until **both** hero image and TTS audio are ready (or gracefully timed out), add a progress bar, and show the scenario text as a teaser once available.

## Current Problem
`SCENARIO_LOADED` action immediately transitions to `SCENE_INTRO`, but image + audio are still loading in parallel. User sees SceneIntro with a placeholder star emoji.

## Changes

### 1. WonderLab.jsx — Reducer + Loading Logic

**New state fields:**
```js
loadingProgress: { scenario: false, image: false, audio: false }
scenarioTeaser: null  // scenario text shown during loading
```

**Reducer changes:**
- `SCENARIO_LOADED` → stays in `LOADING`, sets `scenarioTeaser` + `loadingProgress.scenario = true`
- New `ASSET_LOADED` action → updates `loadingProgress.image` or `loadingProgress.audio`
- Auto-check: when all 3 flags are true → transition to `SCENE_INTRO`

**Effect changes (loadScenario):**
- After scenario fetch: dispatch `SCENARIO_LOADED` (stays in LOADING)
- After image fetch: dispatch `{ type: ASSET_LOADED, payload: 'image' }`
- After TTS prefetch: dispatch `{ type: ASSET_LOADED, payload: 'audio' }`
- Add 12s timeout (like MysteryLab's `READINESS_TIMEOUT_MS`) — if image/audio not done, mark them ready and proceed

### 2. ExperimentLoader.jsx — Progress Bar + Teaser

**New props:** `progress` (0-100), `scenarioTeaser` (string|null)

**UI additions:**
- Progress bar (simple rounded bar): `h-2 bg-blue-200 rounded-full` with gradient fill
- When `scenarioTeaser` is available, show it in a card below the spinner as a preview
- Progress messages cycle: "Creating scenario..." → "Generating the scene..." → "Preparing narration..."

### 3. Fun Fact — Show scenario teaser, not a separate fun fact

Show the **scenario question text** as a teaser once the scenario loads (~2-3s in). The `bonusFact` is reserved for the Results screen.

## Files Modified
| File | Change |
|------|--------|
| `frontend/src/components/LearnModes/WhatIf/WonderLab.jsx` | Reducer + loading logic |
| `frontend/src/components/LearnModes/WhatIf/ExperimentLoader.jsx` | Progress bar + teaser |

## Verification
1. Loading screen stays until image + audio ready (or 12s timeout)
2. Progress bar animates from 0→100%
3. Scenario text appears as teaser during loading
4. SceneIntro renders with image already loaded (no placeholder flash)
