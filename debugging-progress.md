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

## Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/utils/logger.js` | Frontend logging utility |
| `backend/src/utils/logger.js` | Backend logging utility |
| `frontend/src/hooks/useWebSocket.js` | WebSocket connection management |
| `backend/src/index.js` | Server entry point |
| `backend/src/routes/generate.js` | Generation API endpoints |
| `backend/src/services/gemini.js` | Gemini AI integration |
