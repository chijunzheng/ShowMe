# ShowMe Debugging Progress

This file tracks debugging sessions and fixes applied to the ShowMe application.

---

## Session 1: 2026-01-15

### Issue 1: WebSocket Connection Error on Initial Load

**Symptoms:**
```
WebSocket connection to 'ws://localhost:3001/ws/generation' failed: WebSocket is closed before the connection is established.
[11:11:05.162] ERROR [WS] Connection error
[11:11:05.162] INFO [WS] Connection closed { code: 1006, reason: "No reason provided" }
[11:11:05.162] WARN [WS] Attempting reconnect { attempt: 1 }
[11:11:05.471] INFO [WS] Connection established  // Works on retry
```

**Root Cause:** React 18 StrictMode double-mounting behavior
- StrictMode intentionally mounts → unmounts → re-mounts components in development
- First WebSocket connection was created but immediately torn down during unmount
- Close code 1006 = "Abnormal Closure" (connection closed before handshake complete)

**Fix Applied:** `frontend/src/hooks/useWebSocket.js`
```javascript
// Defer connection to next tick to handle React StrictMode's double-mount
connectTimeoutId = setTimeout(() => {
  if (mountedRef.current) {
    connect()
  }
}, 0)
```

**Commit:** `6c0a442 fix(ws): defer WebSocket connection to handle React StrictMode double-mount`

---

### Issue 2: No Images Generated (Mock Data Instead of Real AI)

**Symptoms:**
```
[11:18:49.745] INFO [GENERATION] Stage: Generating educational script...
[11:18:50.015] INFO [GENERATION] Stage: Complete!  // Only 270ms - too fast for real AI
// Missing: images_generating and audio_generating stages
```
- Generation completed in ~300ms (should be 10-20 seconds with real AI)
- Slides contained placeholder images from placehold.co
- No `images_generating` or `audio_generating` progress stages

**Root Cause:** ES Module import order bug
- `generate.js` line 14 calls `isGeminiAvailable()` at module load time
- ES modules hoist imports - all imports evaluate before any code runs
- `dotenv.config()` was at line 22 in `index.js`, but `generate.js` was already loaded
- Result: `GEMINI_API_KEY` not in `process.env` when checked → falls back to mock data

**Diagnosis Steps:**
1. Verified `.env` file exists with valid API key
2. Tested API key loading in isolation - worked
3. Traced import order: `index.js` → `generate.js` → `gemini.js` → `isGeminiAvailable()`
4. Found `isGeminiAvailable()` called at import time (line 14) before `dotenv.config()`

**Fix Applied:** `backend/src/index.js`
```javascript
// BEFORE (broken):
import express from 'express'
import dotenv from 'dotenv'
// ... other imports ...
dotenv.config()  // Too late! generate.js already loaded

// AFTER (fixed):
import 'dotenv/config'  // Side-effect import - loads env vars immediately
import express from 'express'
// ... other imports work correctly now
```

**Commit:** `1b854e1 fix(backend): load dotenv before other imports to fix Gemini API key loading`

---

## Session 2: 2026-01-17

### Issue 1: Topic Sidebar Limited + Slides Mixed Across Topics

**Symptoms:**
- Topic sidebar only showed 3 topics.
- Main slideshow contained header slides from previous topics instead of the current topic only.

**Root Cause:**
- Frontend enforced a hard `MAX_TOPICS` eviction and flattened slides across topics.
- Slides were persisted with topic metadata, making unlimited topics risky for memory.

**Fix Applied:** `frontend/src/App.jsx`
- Introduced `activeTopicId` and `visibleSlides` to render only the current topic in the slideshow.
- Added a per-topic slide archive in localStorage and migrated legacy stored slides.
- Implemented a 12-topic in-memory slide cache with `lastAccessedAt` LRU pruning.
- Removed hard topic eviction from the client; sidebar now supports unlimited topics.
- Updated topic navigation and resume logic to lazy-load archived slides.

**Notes:**
- `npm run lint` (frontend) fails due to ESLint pattern only matching `.ts/.tsx`.
- `npm run test` (frontend) reports no tests found.

---

## Debugging Tips

### Accessing Logs

**Backend logs (automatic file logging):**
The backend automatically writes logs to `/tmp/showme-server.log`. Claude can read this file directly after you run tests.

```bash
# Logs are written automatically - just restart the server:
cd backend && npm run dev

# Claude can then read:
cat /tmp/showme-server.log
```

**Custom log file location:**
```bash
LOG_FILE=/path/to/custom.log npm run dev
```

**Frontend logs:**
- Copy/paste from Chrome DevTools Console
- Or: Right-click in Console → "Save as..." → share the .log file

### Key Log Categories
- `API` - HTTP requests/responses
- `WS` - WebSocket connection lifecycle
- `GENERATION` - AI generation pipeline stages
- `STATE` - Topic/slide state changes
- `AUDIO` - Recording and playback events

### Enabling Verbose Logging
```javascript
// In browser console:
window.enableLogging()  // Enable all debug logs
window.LOG_LEVEL = 'debug'
window.LOG_CATEGORIES = ['API', 'WS']  // Filter to specific categories
```

---

## Session 3: 2026-01-18

### Issue 1: Slides Disappearing on Refresh

**Symptoms:**
- Topics remained in sidebar after refresh
- Slides within topics were gone (empty slideshows)
- Console showed `[STORAGE] Slides persisted successfully` but slides didn't load

**Root Cause:** Overly strict validation in `sanitizeSlidesForStorage`
- Filter required both `slide.id` AND `slide.imageUrl` to be valid strings
- If image generation failed (rate limit, etc.), `imageUrl` could be null
- All slides got filtered out → nothing persisted to localStorage
- Topic metadata persisted but slides didn't

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// BEFORE (too strict):
.filter((slide) =>
  slide.id && typeof slide.id === 'string' &&
  slide.imageUrl && typeof slide.imageUrl === 'string'
)

// AFTER (with fallbacks):
.map((slide, index) => ({
  id: slide.id || `slide_${topicId}_${index}_${Date.now()}`,
  imageUrl: slide.imageUrl || 'data:image/svg+xml,...placeholder...',
  // ... other fields with defaults
}))
.filter((slide) => slide.id && (slide.subtitle || slide.imageUrl))
```

Also updated `loadTopicSlidesFromStorage` to match lenient validation.

---

### Issue 2: Raise Hand Button Misaligned After Dev Tools Toggle

**Symptoms:**
- Button centered correctly on initial load
- After opening/closing F12 dev tools, button shifted to the right
- Not re-centering on viewport resize

**Root Cause:** Flexbox centering with responsive classes
- Used `left-1/2 -translate-x-1/2` with `md:left-[calc(50%+128px)]`
- Flexbox `justify-center` didn't reliably recalculate on viewport changes
- Browser rendering quirk with fixed positioning + translate

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// BEFORE (unreliable):
className="fixed left-0 right-0 md:left-64 flex justify-center"

// AFTER (explicit calc):
style={{
  left: topics.length > 0 ? 'calc(50% + 128px)' : '50%',
  transform: 'translateX(-50%)',
}}
```

Uses explicit `calc()` positioning instead of relying on flexbox container width.

---

### Issue 3: TTS Repeating on Suggestions Slide

**Symptoms:**
- Voice agent kept repeating "Want to learn more?" message
- Happened in an infinite loop on the suggestions slide

**Root Cause:** useEffect re-triggering
- Effect had `isVoiceAgentSpeaking` in dependency array
- When TTS started, `isVoiceAgentSpeaking` changed → effect re-ran → triggered TTS again

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// Added ref to track which suggestions slide was already spoken
const spokenSuggestionsSlideRef = useRef(null)

// In the effect:
if (isPlaying && spokenSuggestionsSlideRef.current !== currentSlide.id) {
  spokenSuggestionsSlideRef.current = currentSlide.id
  enqueueVoiceAgentMessage(...)
}
```

---

### Issue 4: Markdown Formatting Showing as Raw Text

**Symptoms:**
- Subtitles displayed `**Primordial Black Holes**` instead of bold text
- Markdown asterisks visible in UI

**Root Cause:** Gemini outputting markdown in plain text field
- Script generation prompt didn't explicitly forbid markdown
- Subtitles are spoken by TTS, shouldn't have formatting

**Fix Applied:** `backend/src/services/gemini.js`
```javascript
// Added to prompt:
"CRITICAL: Subtitles are spoken aloud by TTS. Do NOT use markdown formatting (no **bold**, *italics*, or other markup). Write plain text only."

// Added fallback regex stripping:
subtitle: (slide.subtitle || '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/utils/logger.js` | Frontend logging utility |
| `backend/src/utils/logger.js` | Backend logging utility |
| `frontend/src/hooks/useWebSocket.js` | WebSocket connection management |
| `backend/src/index.js` | Server entry point |
| `backend/src/routes/generate.js` | Generation API endpoints |
| `backend/src/services/gemini.js` | Gemini AI integration |
