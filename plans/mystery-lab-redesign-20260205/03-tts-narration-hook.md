# Feature: TTS Narration Hook

**ID:** 03
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** -

## Description

Create a custom React hook for TTS narration with caching, prefetch strategy, rate limiting (3s minimum between requests), and playback controls. Provides a simple API for components to narrate text with automatic audio management.

## Acceptance Criteria

- [ ] Hook exports `{ narrate, stop, prefetch, isPlaying, isLoading }`
- [ ] `narrate(text, cacheKey)` plays TTS audio, auto-caches by cacheKey
- [ ] `stop()` stops current playback immediately
- [ ] `prefetch(text, cacheKey)` pre-generates audio without playing
- [ ] `isPlaying` boolean indicates active playback
- [ ] `isLoading` boolean indicates audio generation in progress
- [ ] Caches audio in Map by cacheKey (avoids re-generation)
- [ ] Rate limits requests: minimum 3s between TTS API calls
- [ ] Handles errors gracefully (logs, continues without audio)
- [ ] Cleans up audio elements on unmount

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/Mystery/useMysteryNarration.js` (~100 lines)

### Key Components

1. **Hook Interface**:
   ```javascript
   import { useState, useRef, useCallback, useEffect } from 'react';

   export function useMysteryNarration() {
     const [isPlaying, setIsPlaying] = useState(false);
     const [isLoading, setIsLoading] = useState(false);
     const audioRef = useRef(null);
     const cacheRef = useRef(new Map()); // cacheKey -> audioUrl
     const lastRequestTimeRef = useRef(0);

     const narrate = useCallback(async (text, cacheKey) => { ... });
     const stop = useCallback(() => { ... });
     const prefetch = useCallback(async (text, cacheKey) => { ... });

     return { narrate, stop, prefetch, isPlaying, isLoading };
   }
   ```

2. **Narrate Function**:
   ```javascript
   const narrate = useCallback(async (text, cacheKey) => {
     try {
       // Stop current playback
       if (audioRef.current) {
         audioRef.current.pause();
         audioRef.current = null;
       }

       // Check cache first
       let audioUrl = cacheRef.current.get(cacheKey);

       if (!audioUrl) {
         // Rate limit: ensure 3s between requests
         const now = Date.now();
         const timeSinceLastRequest = now - lastRequestTimeRef.current;
         if (timeSinceLastRequest < 3000) {
           await new Promise(resolve =>
             setTimeout(resolve, 3000 - timeSinceLastRequest)
           );
         }

         // Generate TTS audio
         setIsLoading(true);
         const response = await fetch('/api/tts/generate', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ text })
         });

         if (!response.ok) throw new Error('TTS generation failed');

         const { audioUrl: generatedUrl } = await response.json();
         audioUrl = generatedUrl;
         cacheRef.current.set(cacheKey, audioUrl);
         lastRequestTimeRef.current = Date.now();
         setIsLoading(false);
       }

       // Play audio
       const audio = new Audio(audioUrl);
       audio.onplay = () => setIsPlaying(true);
       audio.onended = () => setIsPlaying(false);
       audio.onerror = () => {
         console.error('Audio playback failed');
         setIsPlaying(false);
       };

       audioRef.current = audio;
       await audio.play();
     } catch (error) {
       console.error('Narration failed:', error);
       setIsLoading(false);
       setIsPlaying(false);
     }
   }, []);
   ```

3. **Stop Function**:
   ```javascript
   const stop = useCallback(() => {
     if (audioRef.current) {
       audioRef.current.pause();
       audioRef.current = null;
       setIsPlaying(false);
     }
   }, []);
   ```

4. **Prefetch Function**:
   ```javascript
   const prefetch = useCallback(async (text, cacheKey) => {
     try {
       // Skip if already cached
       if (cacheRef.current.has(cacheKey)) return;

       // Rate limit
       const now = Date.now();
       const timeSinceLastRequest = now - lastRequestTimeRef.current;
       if (timeSinceLastRequest < 3000) {
         await new Promise(resolve =>
           setTimeout(resolve, 3000 - timeSinceLastRequest)
         );
       }

       // Generate and cache (don't play)
       const response = await fetch('/api/tts/generate', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ text })
       });

       if (!response.ok) throw new Error('TTS prefetch failed');

       const { audioUrl } = await response.json();
       cacheRef.current.set(cacheKey, audioUrl);
       lastRequestTimeRef.current = Date.now();
     } catch (error) {
       console.error('Prefetch failed:', error);
     }
   }, []);
   ```

5. **Cleanup on Unmount**:
   ```javascript
   useEffect(() => {
     return () => {
       // Stop audio on unmount
       if (audioRef.current) {
         audioRef.current.pause();
       }
       // Clear cache (optional, keeps cache in memory during session)
       // cacheRef.current.clear();
     };
   }, []);
   ```

### Technical Decisions

- **Decision:** Cache by cacheKey, not by text
- **Rationale:** Same text may appear in different contexts, cacheKey provides semantic identity
- **Trade-off:** Requires callers to provide keys, but more flexible

- **Decision:** 3-second rate limit
- **Rationale:** Prevents API spam, gives smooth user experience
- **Trade-off:** Adds slight delay to rapid narrations, but prevents abuse

- **Decision:** Prefetch for next step
- **Rationale:** Reduces perceived latency, smoother experience
- **Trade-off:** Slightly more API calls, but better UX

## Dependencies

### Depends On
None - Foundation utility

### Blocks
- **Feature 09:** MysteryIntro (uses narration)
- **Feature 10:** ClueInvestigation (uses narration)
- **Feature 11:** SolutionReveal (uses narration)

## Testing Requirements

### Unit Testing

- [ ] Test narrate with cached audio (should skip API call)
- [ ] Test narrate with uncached audio (should fetch from API)
- [ ] Test rate limiting (3s between requests)
- [ ] Test stop during playback
- [ ] Test prefetch caches audio
- [ ] Test prefetch skips if already cached
- [ ] Test cleanup on unmount

### Integration Testing

```javascript
// Test component using hook
function TestNarration() {
  const { narrate, stop, prefetch, isPlaying, isLoading } = useMysteryNarration();

  useEffect(() => {
    // Prefetch next step
    prefetch('Next clue text', 'clue-2');
  }, [prefetch]);

  return (
    <div>
      <button onClick={() => narrate('First clue', 'clue-1')}>
        Narrate Clue 1
      </button>
      <button onClick={stop} disabled={!isPlaying}>
        Stop
      </button>
      <div>Playing: {isPlaying ? 'Yes' : 'No'}</div>
      <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
    </div>
  );
}
```

## Security Considerations

- [ ] Validate text input (max length, no code injection)
- [ ] Rate limit at hook level (3s minimum)
- [ ] Server-side rate limiting on TTS endpoint
- [ ] Sanitize cacheKey (prevent Map prototype pollution)
- [ ] No sensitive data in cached keys

## Implementation Checklist

- [ ] Create `useMysteryNarration.js` in Mystery component directory
- [ ] Set up hook state (isPlaying, isLoading)
- [ ] Set up refs (audioRef, cacheRef, lastRequestTimeRef)
- [ ] Implement narrate function with cache check
- [ ] Implement rate limiting logic (3s minimum)
- [ ] Implement TTS API call
- [ ] Implement audio playback with state updates
- [ ] Implement stop function
- [ ] Implement prefetch function
- [ ] Add cleanup effect (stop audio on unmount)
- [ ] Add error handling for all async operations
- [ ] Test with real TTS endpoint
- [ ] Test rate limiting with rapid calls
- [ ] Test cache behavior
- [ ] Verify no memory leaks (cleanup works)

## Verification

**Functional Check:**
1. Create test component using hook
2. Click "Narrate" button
3. Verify `isLoading` becomes true briefly
4. Verify audio plays
5. Verify `isPlaying` becomes true
6. Click "Narrate" again immediately
7. Verify rate limit enforces 3s delay
8. Click "Narrate" with same cacheKey
9. Verify audio plays instantly (cached)
10. Click "Stop"
11. Verify audio stops, `isPlaying` becomes false

**Cache Check:**
```javascript
// In browser console after using hook
// Cache should contain entries
cacheRef.current.size > 0

// Same cacheKey should return same URL
cacheRef.current.get('clue-1') === cacheRef.current.get('clue-1')
```

**Rate Limit Check:**
1. Call narrate with uncached text
2. Immediately call narrate with different uncached text
3. Measure time between API requests
4. Verify >= 3 seconds

## Notes

**Cache Strategy:**
- Cache persists for session (not cleared between narrations)
- Clears on unmount (component-level cache)
- Could be upgraded to app-level cache (Context) if needed

**Prefetch Strategy:**
- Call prefetch for next step when current step loads
- Example: When showing clue 1, prefetch clue 2
- Reduces perceived latency dramatically

**Error Handling:**
- TTS failure should not break UI
- Log errors, continue silently
- User can still read text even if narration fails

**Cache Key Guidelines:**
- Use semantic identifiers: `intro`, `clue-1`, `clue-2`, `reveal`
- Not text content (too long, not semantic)
- Unique within mystery session
- Example: `${mysteryId}-intro`, `${mysteryId}-clue-${idx}`

**Audio Element Lifecycle:**
- Created fresh for each narration
- Destroyed when stopped or new narration starts
- Event listeners cleaned up automatically (garbage collected)

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Track:** B (Frontend Utilities)
