# Feature: Add cacheAudio to useStoryNarration Hook

**ID:** 03
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** None

## Description

The `prefetch()` method sends a pre-generated base64 audio URL as text to the TTS endpoint, which is wrong. We need a new `cacheAudio` method that directly stores an already-generated audio URL in the cache without making a TTS API call.

## Acceptance Criteria

- [ ] New `cacheAudio(audioUrl, cacheKey)` method on useStoryNarration
- [ ] Directly stores URL in cache ref without TTS fetch
- [ ] Returns boolean (true if cached, false if invalid input)
- [ ] Returned in hook object alongside narrate, play, stop, prefetch

## Implementation Details

### Files to Modify

- `frontend/src/components/LearnModes/Story/useStoryNarration.js`

### Changes

Add new `cacheAudio` method (between `prefetch` and `play`):

```js
const cacheAudio = useCallback((audioUrl, cacheKey) => {
  if (!audioUrl || !cacheKey) return false
  cacheRef.current.set(cacheKey, audioUrl)
  logger.debug('STORY_TTS', 'Audio URL cached directly', { cacheKey })
  return true
}, [])
```

Update return object:
```js
return {
  narrate,
  play,
  stop,
  prefetch,
  cacheAudio,
  isPlaying,
  isLoading,
  error,
}
```

## Testing Requirements

- [ ] cacheAudio stores URL and narrate retrieves it from cache
- [ ] cacheAudio returns false for null/undefined inputs
- [ ] Existing narrate/prefetch/play/stop unchanged

---

**Created:** 2026-02-06
