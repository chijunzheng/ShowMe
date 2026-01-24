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

---

## Session 4: 2026-01-19

### Issue 1: Last Topic Auto-Selected on Refresh

**Symptoms:**
- When refreshing the app, the most bottom topic was always selected
- Expected behavior: Start on HOME screen with no topic selected
- This bypassed the new HOME screen with level selection

**Root Cause:** Two problems in `frontend/src/App.jsx`:
1. `activeTopicId` was initialized to the last topic's ID from localStorage
2. A `useEffect` hook auto-selected a fallback topic when `activeTopicId` was null

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// BEFORE (broken):
const [activeTopicId, setActiveTopicId] = useState(() => {
  const storedTopics = localStorage.getItem('showme_topics')
  if (storedTopics) {
    const parsed = JSON.parse(storedTopics)
    return parsed[parsed.length - 1]?.id || null  // Auto-selected last topic
  }
  return null
})

// AFTER (fixed):
const [activeTopicId, setActiveTopicId] = useState(() => {
  // Start with no active topic - user begins on HOME screen
  return null
})

// Also fixed the useEffect that auto-selected fallback:
useEffect(() => {
  if (topics.length === 0) {
    if (activeTopicId !== null) {
      setActiveTopicId(null)
      setCurrentIndex(0)
    }
    return
  }
  // Only check for stale topic ID if one was actually set
  if (activeTopicId !== null) {  // Added this guard
    const hasActive = topics.some((topic) => topic.id === activeTopicId)
    if (!hasActive) {
      const fallbackId = topics[topics.length - 1].id
      setActiveTopicId(fallbackId)
      setCurrentIndex(0)
    }
  }
}, [topics, activeTopicId])
```

---

### Issue 2: Level Selection Not Working (Stale Closure Bug)

**Symptoms:**
- User selected "Simple" level on HOME screen
- After asking a question, content was generated at "Standard" level instead
- Level indicator showed "Standard" during generation despite selecting "Simple"

**Root Cause:** Classic React stale closure problem
- `handleQuestion` was memoized with `useCallback` and captured `selectedLevel` at creation time
- `handleVoiceComplete` called `handleQuestion` but still had the initial `selectedLevel` value ('standard')
- Even though state updated, the closure never saw the new value

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// Added a ref to always have current value:
const selectedLevelRef = useRef(EXPLANATION_LEVEL.STANDARD)

useEffect(() => {
  selectedLevelRef.current = selectedLevel
}, [selectedLevel])

// In handleQuestion and API calls, use the ref:
explanationLevel: selectedLevelRef.current,  // Always current value

// Instead of:
explanationLevel: selectedLevel,  // Stale closure value
```

**Why refs work:** Refs are mutable objects that persist across renders. When you read `selectedLevelRef.current`, you always get the latest value, regardless of when the callback was created.

---

### Issue 3: Raise Hand Button Overlapping Level Selector

**Symptoms:**
- In SLIDESHOW state, the raise hand button overlapped with the level selector buttons
- Level selector appeared at bottom of slideshow area
- Raise hand button position conflicted with it

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// Added bottom margin to level indicator to create space:
<div className="flex items-center gap-2 mt-4 mb-16">
  {/* Level selector with icons */}
</div>
```

The `mb-16` (4rem / 64px) provides clearance for the fixed-position raise hand button.

---

### Issue 4: Deep Mode Subtitles Overflow

**Symptoms:**
- In "Deep" explanation level, subtitles were longer and more detailed
- Long subtitles overflowed the subtitle container area
- Text got cut off without visual indication

**Root Cause:**
- Deep mode intentionally generates more comprehensive content
- Original CSS used `max-h-20 overflow-hidden` which just cut off text
- No ellipsis or indication that content was truncated

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// BEFORE (hard cutoff):
<p className="text-base text-center max-h-20 overflow-hidden">
  {visibleSlides[currentIndex]?.subtitle}
</p>

// AFTER (graceful truncation with ellipsis):
<p className="text-base text-center line-clamp-5">
  {visibleSlides[currentIndex]?.subtitle}
</p>
```

Using `line-clamp-5` (Tailwind utility) limits to 5 lines with ellipsis indication when content is truncated. This preserves readability while handling Deep mode's longer explanations.

---

### Issue 5: RegenerateDropdown Overflows Page

**Symptoms:**
- Clicking the regenerate (↻) button opened a dropdown that went off the right edge of the page
- Dropdown also extended below the visible area
- Content was cut off and inaccessible

**Root Cause:**
- Dropdown positioned with `right-0 mt-2` (align right, open downward)
- At the bottom-center of the screen, this caused overflow in both directions
- No consideration for viewport boundaries

**Fix Applied:** `frontend/src/components/RegenerateDropdown.jsx`
```javascript
// BEFORE (overflows page):
className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg..."

// AFTER (centered and opens upward):
className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-white rounded-lg shadow-lg..."
```

**Key Changes:**
- `right-0` → `left-1/2 -translate-x-1/2`: Centers dropdown horizontally relative to button
- `mt-2` → `bottom-full mb-2`: Opens upward instead of downward

This positioning ensures the dropdown stays within viewport bounds when the button is near the bottom of the screen.

---

## Session 5: 2026-01-19

### Issue 1: Suggested Follow-ups Stuck on "Complete"

**Symptoms:**
- Clicking a suggested follow-up showed "Complete!" in generating state
- Slideshow never transitioned to slides
- Progress indicated completion, but UI stayed on the loader

**Root Cause:**
- Slide-ready transition relied on voice-agent `onComplete` to switch to slideshow
- Voice-agent only called `onComplete` on successful audio playback
- If TTS failed (Gemini unavailable/429) or autoplay blocked, the transition never fired

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// Add option to allow completion even when audio fails
completeOnError: options.completeOnError === true

// Allow slide-ready message to advance even if TTS fails
enqueueVoiceAgentMessage(readyMessage, {
  priority: 'high',
  completeOnError: true,
  onComplete: () => {
    setIsSlideRevealPending(false)
    setUiState(UI_STATE.SLIDESHOW)
  },
})
```

---

### Issue 2: Suggested Follow-ups Always Queued

**Symptoms:**
- Clicking suggested questions showed "Question queued"
- Queue count increased, but no new generation started
- Repeated clicks stacked the queue instead of triggering follow-ups

**Root Cause:**
- `handleQuestion` queued any request when `isSlideRevealPending` was true
- That flag could remain true even while in slideshow (e.g., after a stuck transition)

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// Only queue while actually generating or pending outside slideshow
if (uiState === UI_STATE.GENERATING || (isSlideRevealPending && uiState !== UI_STATE.SLIDESHOW)) {
  setQuestionQueue((prev) => [trimmedQuery, ...prev])
  showToast('Question queued')
  enqueueVoiceAgentMessage('Got it. I will answer that right after this.')
  return
}
```

---

### Issue 3: Slides Empty After Refresh (Persistent Storage)

**Symptoms:**
- Topics remained in the left sidebar after refresh
- Selecting historical topics showed only the header slide
- Slides did not reload from localStorage

**Root Cause:**
- Slide images are stored as base64 data URIs from Gemini
- localStorage quota (5-10MB) is exceeded as topics accumulate
- Slide archives fail to persist or load, leaving only topic metadata

**Fix Applied:** Firestore + GCS slide store + frontend hydration
- Added Firestore-backed slide metadata storage and GCS image storage
- New API endpoints to save/load slides by client + topic/version (signed URLs on load)
- Frontend persists slides to backend when generated, and hydrates when local cache misses
- Increased JSON body limit for slide payloads while keeping strict limits elsewhere
- Allowed GCS domains in CSP for image rendering

**Key Changes:** `backend/src/services/slideStore.js`, `backend/src/routes/slides.js`, `backend/src/index.js`, `frontend/src/App.jsx`

---

## Session 6: 2026-01-23

### Issue 1: Follow-up Questions Creating Separate Topics

**Symptoms:**
- Asking a follow-up question created a new topic in the sidebar
- Expected: Follow-up should nest under the current topic or append as child slides
- Content was relevant and answered the query, but appeared as separate topic

**Root Cause:**
- `shouldNest` condition was too restrictive: `classifyResult?.suggestNestedTopic && activeTopic?.id`
- The `suggestNestedTopic` flag wasn't being set correctly in classification

**Initial Fix Applied:** `frontend/src/App.jsx`
```javascript
// BEFORE (too restrictive):
const shouldNest = classifyResult?.suggestNestedTopic && activeTopic?.id

// AFTER (always nest when active topic exists):
const shouldNest = activeTopic?.id
```

**Later Decision:** Removed nested topics entirely in favor of 2D grid navigation (see Issue 2).

---

### Issue 2: Nested Topic Slides Not Loading

**Symptoms:**
- Nested topic appeared correctly in sidebar hierarchy
- Clicking on nested topic showed no slides (empty slideshow)
- Console showed topic existed with slides property populated

**Root Cause:** Multiple issues:
1. State race condition when switching to newly created nested topic
2. `visibleSlides` calculated from stale state before new topic was added
3. Version/storage key mismatch - `parentTopicId` wasn't part of storage key

**Investigation:**
- Deep-dive into navigation flow revealed `handleNavigateToTopic` calculated slides from outdated `visibleSlides` memo
- New topic added to state, but memo hadn't recalculated yet
- Storage persistence used inconsistent keys for nested vs root topics

**Fix Applied:** Pivoted away from nested topics entirely
- Removed `shouldCreateNestedTopic` branch from `frontend/src/App.jsx`
- Removed `parentTopicId` from topic creation
- Simplified `TopicSidebar.jsx` to flat list (removed hierarchical rendering)
- Follow-ups now append as child slides with `parentId` linking to parent slide
- 2D grid navigation (↑/↓ for children, ←/→ for siblings) handles the hierarchy

---

### Issue 3: TTS Warning About Missing Package

**Symptoms:**
```
[Gemini] TTS: @google/generative-ai not available, falling back to @google/genai
```
- Warning appeared on every TTS request
- TTS still worked via fallback

**Root Cause:**
- Code had two TTS paths: `@google/generative-ai` (preferred) and `@google/genai` (fallback)
- `@google/generative-ai` was never installed (dynamic import always failed)
- The fallback path worked fine, but warning was misleading

**Fix Applied:** `backend/src/services/gemini.js`
```javascript
// REMOVED: Unused code paths
- ttsClientPromise variable
- getTtsClient() function
- generateTtsWithGenerativeAI() function

// SIMPLIFIED: generateTTS() now only uses @google/genai
export async function generateTTS(text, options = {}) {
  const ai = getAIClient()
  // ... direct call to generateTtsWithGenAI()
}
```

---

### Issue 4: Audio Not Stopping When Typing

**Symptoms:**
- User clicked "can't talk? type here" and started typing
- Narration continued playing
- Slideshow auto-advanced while user was composing question

**Root Cause:**
- Text input had no `onFocus` handler to interrupt audio
- `isPlaying` state remained true

**Fix Applied:** `frontend/src/App.jsx`
```javascript
<input
  type="text"
  value={textInput}
  onChange={(e) => setTextInput(e.target.value)}
  onFocus={() => {
    // Stop narration and auto-advance when user starts typing
    interruptActiveAudio()
    setIsPlaying(false)
  }}
  placeholder="Type your question..."
  // ...
/>
```

---

## Debugging Tips (Updated)

### Model Configuration
Image generation models are now:
- Primary: `gemini-3-pro-image-preview`
- Fallback: `gemini-2.5-flash-image`

TTS models:
- Primary: `gemini-2.5-flash-lite-tts-preview`
- Fallback: `gemini-2.5-flash-preview-tts`

### 2D Navigation Testing
To test child slide navigation:
1. Generate a topic with slides
2. Ask a follow-up question while viewing a slide
3. New slides should have `parentId` set to current slide's ID
4. Progress dots should show ▼ indicator on slides with children
5. Press ↓ to navigate to child slides, ↑ to return to parent
