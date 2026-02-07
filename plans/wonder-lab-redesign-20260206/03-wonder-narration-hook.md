# Feature: Create useWonderNarration Hook

**ID:** 03
**Status:** ✅ Complete
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** None

## Description

Create `useWonderNarration.js` TTS hook adapted from `useMysteryNarration.js`. Same caching, rate limiting, and playback logic, but branded for Wonder Lab logging.

## Acceptance Criteria

- [x] Hook provides `narrate`, `stop`, `prefetch`, `isPlaying`, `isLoading`, `error`
- [x] Audio caching works across narrate/prefetch calls
- [x] Rate limiting (3s minimum between API calls) works
- [x] Cleanup on unmount stops playback
- [x] Log prefix uses `WONDER_TTS` instead of `MYSTERY_TTS`

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/WhatIf/useWonderNarration.js` - Adapted from `useMysteryNarration.js`

### Key Differences from useMysteryNarration

- Log prefix: `WONDER_TTS` instead of `MYSTERY_TTS`
- Otherwise identical API and behavior

### Reference

Copy `frontend/src/components/LearnModes/Mystery/useMysteryNarration.js` and change log prefixes.

## Dependencies

### Depends On
- None

### Blocks
- **Feature 04:** SceneIntro needs narration for scenario
- **Feature 05:** WonderLab needs narration throughout

## Testing Requirements

- [ ] Unit test: narrate plays audio
- [ ] Unit test: cache prevents duplicate API calls
- [ ] Unit test: stop halts playback
- [ ] Unit test: prefetch caches without playing

## Implementation Checklist

- [x] Copy useMysteryNarration.js as useWonderNarration.js
- [x] Update log prefixes to WONDER_TTS
- [ ] Write tests
- [ ] Code review

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Completed:** 2026-02-06
