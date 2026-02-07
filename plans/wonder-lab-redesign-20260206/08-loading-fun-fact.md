# Wonder Lab: Add Fun Fact to Loading Screen

## Goal
Show a topic-specific "Did you know?" fun fact on the loading screen to keep users engaged during the 5-12s generation wait.

## Current State
- Loading screen shows: spinner, progress bar, cycling status messages, scenario teaser
- Backend already generates `bonusFact` in the `/api/learn/whatif` scenario response
- `bonusFact` arrives ~2-3s into loading (with the scenario data)
- Currently `bonusFact` is only shown on the ResultsSummary page

## Changes

### 1. WonderLab.jsx — Pass bonusFact to ExperimentLoader

- Store `bonusFact` in reducer state when `SCENARIO_LOADED` fires (it's in the scenario response)
- Pass `bonusFact` as prop to `<ExperimentLoader>` in the LOADING render
- Remove `bonusFact` from `ResultsSummary` props (avoid repeating)

**Key state addition:**
```js
// In SCENARIO_LOADED reducer case, also store:
bonusFact: action.payload.bonusFact || null
```

### 2. ExperimentLoader.jsx — Fun Fact Card

**New prop:** `bonusFact` (string|null)

**UI addition (below progress bar, above scenario teaser):**
- Renders when `bonusFact` is truthy
- Card with "Did you know?" header, science emoji, and fact text
- Styled to match the blue/cyan loading theme (not the amber Quiz style)
- `animate-fade-in` entrance animation
- Pattern: similar to existing `FunFactCard.jsx` but inline-styled to match Wonder Lab theme

### 3. ResultsSummary.jsx — Remove bonusFact display

- Remove the bonusFact section from the results page since it's now shown during loading
- This avoids the user seeing the same fact twice

## Files Modified
| File | Change |
|------|--------|
| `frontend/src/components/LearnModes/WhatIf/WonderLab.jsx` | Store bonusFact in state, pass to loader, remove from results |
| `frontend/src/components/LearnModes/WhatIf/ExperimentLoader.jsx` | Add fun fact card UI |
| `frontend/src/components/LearnModes/WhatIf/ResultsSummary.jsx` | Remove bonusFact section |

## Verification
1. Start frontend + backend dev servers
2. Enter a Wonder Lab scenario
3. Confirm: "Did you know?" card appears ~2-3s into loading (once scenario loads)
4. Confirm: fun fact is topic-specific (not generic)
5. Confirm: results page no longer shows the same fun fact
6. Confirm: loading screen shows spinner → progress → fun fact → scenario teaser in sequence
