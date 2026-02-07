# Wonder Lab Loading UX Fix

## Problems
1. **SceneIntro shows text before image/TTS** - User sees star placeholder, then image pops in seconds later, then TTS starts even later. Root causes: (a) 12s timeout forcibly marks assets as ready before they've loaded, (b) base64 image isn't pre-decoded by browser before SceneIntro mounts.
2. **Identical fun facts on both loading screens** - Both Phase 1 and Phase 2 pass `state.bonusFact` to ExperimentLoader.
3. **Progress bar is generic** - No indication of which specific stage is loading.

## Files to Modify

### 1. `frontend/src/components/LearnModes/WhatIf/ExperimentLoader.jsx`
**Add `stages` prop with checklist UI**
- Accept optional `stages` array: `[{ label: string, done: boolean }]`
- When `stages` provided: auto-calculate progress %, render checklist (checkmark for done, mini-spinner for in-progress), show current stage label as subtitle
- When `stages` is null: keep existing behavior (cycling messages, indeterminate) for Phase 2

### 2. `frontend/src/components/LearnModes/WhatIf/WonderLab.jsx`
**Reducer changes:**
- Add `revealFunFact: null` to initialState
- Add `REVEAL_FUN_FACT_LOADED` action -> stores fun fact text in state
- Reset `revealFunFact` on RETRY

**Phase 1 loading fix (remove 12s timeout, add image preloading):**
- Replace `READINESS_TIMEOUT_MS = 12000` with `FAILSAFE_TIMEOUT_MS = 30000`
- Add `imageReadyRef` + `audioReadyRef` refs to track which assets completed
- Failsafe timeout only force-completes assets that haven't finished (checks refs)
- Refactor `fetchScenarioImage()` to return the image URL instead of dispatching
- After getting image URL: dispatch `IMAGE_LOADED`, then preload with `new Image()` and wait for `onload` before dispatching `ASSET_LOADED` for 'image'
- This ensures browser has decoded the image before SceneIntro mounts

**Phase 1 render update:**
- Pass `stages` array to ExperimentLoader:
  ```js
  stages={[
    { label: 'Creating scenario', done: loadingProgress.scenario },
    { label: 'Generating image', done: loadingProgress.image },
    { label: 'Preparing narration', done: loadingProgress.audio },
  ]}
  ```

**Phase 2 fun fact fix:**
- Add `fetchRevealFunFact()` helper - calls `POST /api/generate/engagement` with `{ query: topicName, explanationLevel }`
- Fire it in parallel with reveal-assets fetch (non-blocking, failures silently caught)
- Dispatch `REVEAL_FUN_FACT_LOADED` with `funFact.text` from response
- Pass `state.revealFunFact` (not `state.bonusFact`) to Phase 2 ExperimentLoader

### 3. `frontend/src/components/LearnModes/WhatIf/SceneIntro.jsx`
No changes needed. Image preloading in WonderLab ensures `onLoad` fires near-instantly when SceneIntro mounts.

## Existing Code to Reuse
- `POST /api/generate/engagement` endpoint (already used by MysteryLab)
- `useWonderNarration.prefetch()` already caches TTS
- `preloadImageInBrowser()` is a new ~7-line utility (defined in WonderLab)
- `logger` from `../../../utils/logger`

## Implementation Order
1. ExperimentLoader.jsx - stages prop (additive, backward-compatible)
2. WonderLab.jsx reducer - new action + state field
3. WonderLab.jsx Phase 1 useEffect - timeout removal, image preloading
4. WonderLab.jsx Phase 1 render - pass stages
5. WonderLab.jsx Phase 2 useEffect - parallel fun fact fetch
6. WonderLab.jsx Phase 2 render - pass revealFunFact

## Verification
- Phase 1: loading screen shows named stages with checkmarks appearing in sequence
- Phase 1: SceneIntro renders with image already visible (no star placeholder flash)
- Phase 1: TTS starts immediately when SceneIntro appears
- Phase 2: loading screen shows a DIFFERENT fun fact than Phase 1
- Edge: 30s failsafe fires if APIs are down -> app still proceeds
- Edge: Image/TTS failure -> graceful degradation (proceed without)
