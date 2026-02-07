# Feature: Wonder Lab Reveal Manual-Only Progression

**ID:** 07
**Status:** 🔄 In Progress
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** 06

## Summary

Change Wonder Lab consequence reveals so they never auto-advance.
Each reveal remains on screen until the user explicitly clicks Next (or See Results on the last reveal).

## Scope

### In scope
- Remove all reveal auto-advance behavior
- Keep narration auto-play per reveal
- Gate reveal progression to explicit user click only
- Keep last-step transition manual via `See Results`

### Out of scope
- Backend TTS generation and `/api/learn/whatif/reveal-assets`
- Prompt/content generation and reveal ordering

## Implementation Checklist

- [ ] Remove auto-advance effect and related timing constants/state in `ConsequenceReveal.jsx`
- [ ] Keep `handleNext` as only transition path
- [ ] Disable Next button while narration is playing or loading
- [ ] Keep `Narrating...` button copy when narration is active
- [ ] Update tests to validate manual-only progression
- [ ] Run targeted tests and lint
- [ ] Code review pass

## Files

- `frontend/src/components/LearnModes/WhatIf/ConsequenceReveal.jsx`
- `frontend/src/components/LearnModes/WhatIf/__tests__/ConsequenceReveal.test.jsx`

## Verification

- `cd /Users/jasonchi/ShowMe/frontend && npm run test -- --run src/components/LearnModes/WhatIf/__tests__/ConsequenceReveal.test.jsx`
- `cd /Users/jasonchi/ShowMe/frontend && npx eslint src/components/LearnModes/WhatIf/ConsequenceReveal.jsx src/components/LearnModes/WhatIf/__tests__/ConsequenceReveal.test.jsx`
