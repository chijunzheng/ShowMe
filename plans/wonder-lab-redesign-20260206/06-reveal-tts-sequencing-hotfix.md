# Feature: Fix WonderLab Reveal TTS Overlap + Slide Skip

**ID:** 06
**Status:** 🔄 In Progress
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 02

## Description

Fix race conditions in Wonder Lab reveal playback where narration attempts can overlap and reveal cards auto-advance before narration actually starts, causing noisy overlapping audio and skipped slides.

## Acceptance Criteria

- [ ] Reveal slides do not auto-skip while narration is still pending to start
- [ ] Only the latest narration attempt can start playback (older stale attempts are ignored)
- [ ] If narration playback fails, reveal waits a readable fallback delay instead of skipping immediately
- [ ] Existing reveal flow still auto-advances after narration ends
- [ ] New tests cover no-skip-on-pending and fallback-delay behavior

## Implementation Plan

1. Update `useWonderNarration`:
   - Track active narration request IDs
   - Mark loading before rate-limit wait + fetch
   - Ignore stale async narration responses
   - Clear loading state on stop/cancel and guarded playback handlers
2. Update `ConsequenceReveal`:
   - Make narration trigger async-safe per reveal
   - Track whether playback was actually observed for current reveal
   - Use longer fallback auto-advance delay when no playback occurred
3. Add tests for `ConsequenceReveal` reveal timing behavior.

## Files To Modify

- `frontend/src/components/LearnModes/WhatIf/useWonderNarration.js`
- `frontend/src/components/LearnModes/WhatIf/ConsequenceReveal.jsx`
- `frontend/src/components/LearnModes/WhatIf/__tests__/ConsequenceReveal.test.jsx` (new)

## Verification

- [ ] `cd frontend && npm run test -- src/components/LearnModes/WhatIf/__tests__/ConsequenceReveal.test.jsx`
- [ ] `cd frontend && npm run lint -- src/components/LearnModes/WhatIf/useWonderNarration.js src/components/LearnModes/WhatIf/ConsequenceReveal.jsx src/components/LearnModes/WhatIf/__tests__/ConsequenceReveal.test.jsx`

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
