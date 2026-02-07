# Feature: WonderLab Phase 1 Image Preloading + Failsafe

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01

## Description

Fix the core loading UX issue: replace the aggressive 12s timeout with a 30s failsafe that only force-completes assets that haven't actually loaded. Add browser image preloading so the base64 image is decoded before SceneIntro mounts (eliminating the star placeholder flash). Also add reducer changes for Phase 2 fun fact support and pass stages to Phase 1 ExperimentLoader.

## Acceptance Criteria

- [ ] `READINESS_TIMEOUT_MS = 12000` replaced with `FAILSAFE_TIMEOUT_MS = 30000`
- [ ] `imageReadyRef` and `audioReadyRef` refs track asset completion
- [ ] Failsafe timeout only force-completes assets that haven't finished (checks refs)
- [ ] `fetchScenarioImage()` returns image URL instead of dispatching directly
- [ ] After IMAGE_LOADED dispatch, `new Image().onload` waits for browser decode before ASSET_LOADED
- [ ] SceneIntro image appears instantly (no star placeholder flash)
- [ ] TTS starts immediately when SceneIntro appears
- [ ] `revealFunFact: null` added to initialState
- [ ] `REVEAL_FUN_FACT_LOADED` action added to reducer
- [ ] `revealFunFact` reset on RETRY
- [ ] Phase 1 render passes `stages` array to ExperimentLoader

## Files to Modify

- `frontend/src/components/LearnModes/WhatIf/WonderLab.jsx`

## Implementation Details

### Reducer Changes
- Add `revealFunFact: null` to `initialState`
- Add `REVEAL_FUN_FACT_LOADED` to ACTION enum
- Add case in reducer: sets `revealFunFact` from payload
- RETRY case: spread `initialState` (already resets all fields)

### Phase 1 useEffect Changes
1. Replace constant: `FAILSAFE_TIMEOUT_MS = 30000`
2. Add refs: `imageReadyRef = useRef(false)`, `audioReadyRef = useRef(false)`
3. Refactor `fetchScenarioImage()` to return `data.imageUrl` (or null)
4. In image parallel branch:
   - Get URL from `fetchScenarioImage()`
   - Dispatch `IMAGE_LOADED` with URL
   - Create `new Image()`, set `src`, await `onload` promise
   - Set `imageReadyRef.current = true`
   - Dispatch `ASSET_LOADED` for 'image'
5. In audio parallel branch: set `audioReadyRef.current = true` after prefetch
6. Failsafe timeout: check refs before dispatching ASSET_LOADED

### Phase 1 Render
```js
stages={[
  { label: 'Creating scenario', done: state.loadingProgress.scenario },
  { label: 'Generating image', done: state.loadingProgress.image },
  { label: 'Preparing narration', done: state.loadingProgress.audio },
]}
```

### Utility Function
```js
function preloadImageInBrowser(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}
```

## Depends On
- **Feature 01:** ExperimentLoader must accept `stages` prop

## Blocks
- **Feature 03:** Reducer changes needed for revealFunFact
