# Feature: WonderLab Phase 2 Separate Fun Fact

**ID:** 03
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Low
**Dependencies:** 02

## Description

Fix the identical fun facts issue: Phase 2 loading screen currently shows `state.bonusFact` (same as Phase 1). Add a parallel fetch for a new fun fact during reveal generation and pass it to the Phase 2 ExperimentLoader instead.

## Acceptance Criteria

- [ ] `fetchRevealFunFact()` helper calls `POST /api/generate/engagement` with `{ query: topicName, explanationLevel }`
- [ ] Fetch fires in parallel with reveal-assets (non-blocking)
- [ ] Failures silently caught (Phase 2 loader just shows no fun fact)
- [ ] Dispatches `REVEAL_FUN_FACT_LOADED` with `funFact.text` from response
- [ ] Phase 2 ExperimentLoader receives `state.revealFunFact` instead of `state.bonusFact`
- [ ] Phase 1 and Phase 2 show different fun facts

## Files to Modify

- `frontend/src/components/LearnModes/WhatIf/WonderLab.jsx`

## Implementation Details

### Phase 2 useEffect Changes
Add parallel fun fact fetch alongside `generateRevealAssets()`:

```js
const fetchRevealFunFact = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/generate/engagement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: topicName, explanationLevel }),
      signal: controller.signal,
    })
    if (!response.ok) return
    const data = await response.json()
    if (data.funFact?.text) {
      dispatch({ type: ACTION.REVEAL_FUN_FACT_LOADED, payload: data.funFact.text })
    }
  } catch {
    // Non-blocking - silently ignore
  }
}

// Fire both in parallel
fetchRevealFunFact()
generateRevealAssets()
```

### Phase 2 Render Change
```diff
- <ExperimentLoader message="Running the experiment..." bonusFact={state.bonusFact} />
+ <ExperimentLoader message="Running the experiment..." bonusFact={state.revealFunFact} />
```

## Depends On
- **Feature 02:** Reducer must have `REVEAL_FUN_FACT_LOADED` action and `revealFunFact` state field

## Existing Code to Reuse
- `POST /api/generate/engagement` endpoint (already used by MysteryLab)
