# Feature: Fun Fact Fetch + Fallback

**ID:** 03
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 02

## Description

Add delayed, non-blocking topic fun fact retrieval using `/api/generate/engagement`, with timeout and level-tuned local fallback fact rotation.

## Acceptance Criteria

- [x] Fact fetch starts after 900ms only while still in `LOADING`.
- [x] Fallback facts rotate every 5 seconds.
- [x] API fact replaces fallback when available.
- [x] Fact request timeout/error never blocks progression.

## Implementation Details

### Files to Create/Modify

- `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Mystery/mysteryLoaderFacts.js` - Level-tuned local facts + stage copy.
- `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Mystery/MysteryLab.jsx` - Loader state, timers, fetch logic.

### Testing Requirements

- [x] Loader fallback fact appears after delay.
- [x] API fact override path covered.
- [x] Failure/timeout fallback path covered.

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Implemented By:** Codex
