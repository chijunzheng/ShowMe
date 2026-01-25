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

---

### Issue 5: Follow-up TTS Plays Parent Slide Audio

**Symptoms:**
- Follow-up slides render correctly
- TTS narration always reads the original parent slide
- Auto-advance continues based on parent slide audio

**Root Cause:**
- Narration and auto-advance used the main `currentIndex` slide instead of the active child slide
- Audio prefetch logic also ignored `currentChildIndex`

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// Use displayedSlide (parent or child) for narration and auto-advance
const displayedSlide = currentChildIndex === null
  ? visibleSlides[currentIndex]
  : activeChildSlides[currentChildIndex]

// Auto-advance uses child-first navigation
const advanceToNextSlide = () => {
  if (currentChildIndex === null && activeChildSlides.length > 0) {
    setCurrentChildIndex(0)
    return
  }
  // ...
}

// Prefetch uses next slide in the same sequence
const nextSlide = getNextSlideForPrefetch()
prefetchSlideAudio(nextSlide)
```

---

### Issue 6: Vite JSX Parse Error

**Symptoms:**
- Vite overlay: "Unexpected token, expected ','" near follow-up drawer
- Babel parser: "Expected corresponding JSX closing tag for <>"

**Root Cause:**
- A stray `}` after the slideshow block broke JSX nesting

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// Removed the extra brace after the slideshow conditional
{uiState === UI_STATE.SLIDESHOW && visibleSlides.length > 0 && ( ... )}
```

---

### Issue 7: Follow-up Rail Misalignment + Overflow

**Symptoms:**
- Right follow-up rail did not align with the slide image
- Panel height included subtitles, causing vertical mismatch
- Thumbnail cards overflowed or clipped the rail width

**Root Cause:**
- Rail was anchored to the overall slide container instead of the 16:9 image box
- Cards lacked width constraints when rail width changed

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// Anchor rail to the aspect-video image wrapper
<div className="relative w-full aspect-video overflow-visible"> ... </div>

// Ensure cards fill the rail width and keep compact sizing
className="group flex h-full w-full items-center ..."

// Slightly wider rail for label wrapping
<div className="h-full w-52 ...">
```

---

### Issue 8: Silent Raise-hand Triggered Generation

**Symptoms:**
- Raising hand without speaking still sent audio to STT
- STT returned long hallucinated transcripts, triggering generation

**Root Cause:**
- Any non-empty audio blob passed size checks, even with no detected speech
- Silence detection only controlled stop timing, not transcription eligibility

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// Track speech start + frame count during listening
const speechStartedAtRef = useRef(null)
const speechFrameCountRef = useRef(0)

// Before STT: require minimum speech duration/frames
if (!hasSpeech) {
  setLiveTranscription('No question detected. Tap to try again.')
  return
}
```

---

### Issue 9: Slide Narration Start Delay

**Symptoms:**
- Slide narration sometimes starts late when entering a new slide
- Audio fetch + TTS generation occurs just-in-time, causing gaps

**Root Cause:**
- Narration audio was fetched on-demand per slide
- Only next-slide prefetching was used, leaving initial slides cold

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// Batch prefetch TTS for all slides with subtitles (concurrency-limited)
prefetchSlideNarrationBatch(allTopicSlides)

// Configurable concurrency + delay to avoid rate limits
const TTS_PREFETCH_CONFIG = { MAX_CONCURRENCY: 2, DELAY_MS: 150 }
```

---

## Session 7: 2026-01-24

### Issue 1: TTS 429 Rate Limit Errors

**Symptoms:**
- Multiple concurrent TTS requests causing 429 "Too Many Requests" errors
- Logs showed requests within milliseconds of each other (18.809, 18.866)
- Same slides being retried repeatedly

**Root Cause:**
- TTS prefetch was too aggressive (2 concurrent, 150ms delay)
- Multiple code paths (`requestSlideAudio`, `fetchTtsForItem`) making requests
- `skipRateLimitCheck` option was defeating backoff logic

**Fix Applied:** `frontend/src/App.jsx`
```javascript
const TTS_PREFETCH_CONFIG = {
  MAX_CONCURRENCY: 1,
  DELAY_MS: 2000,
  MAX_PREFETCH_AHEAD: 1,
  RATE_LIMIT_BACKOFF_MS: 10000,
  MIN_REQUEST_INTERVAL_MS: 3000,  // New: minimum time between any TTS requests
}

// Added tracking refs
const lastTtsRequestTimeRef = useRef(0)
const ttsRateLimitUntilRef = useRef(0)

// Both TTS functions now check rate limits before requesting
```

---

### Issue 2: StreamingSubtitle Shows No Words When TTS Fails

**Symptoms:**
- Slides generated successfully but no subtitles visible
- `revealedCount` stayed at 0
- Words only revealed when `isSlideNarrationPlaying` is true

**Root Cause:**
- StreamingSubtitle component depended entirely on TTS playing to reveal words
- When TTS failed (429, etc.), narration never played, so words stayed hidden

**Fix Applied:** `frontend/src/components/StreamingSubtitle.jsx`
```javascript
// Added 500ms fallback timeout to show all words if audio doesn't start
useEffect(() => {
  const fallbackTimeout = setTimeout(() => {
    if (revealedCount === 0 && words.length > 0) {
      setRevealedCount(words.length)
    }
  }, 500)
  return () => clearTimeout(fallbackTimeout)
}, [words, revealedCount])
```

---

### Issue 3: 403 Permission Denied from Cloud TTS API

**Symptoms:**
```
[TTS] API error: { status: 403, message: 'Caller does not have required permission to use project' }
```

**Root Cause:**
- gcloud was logged in as wrong account
- Application Default Credentials (ADC) were stale

**Fix Applied:** Terminal commands
```bash
gcloud config set account jasonchi55@gmail.com
gcloud config set project project-a23ec95e-0a5a-443a-a7a
gcloud auth application-default login --project project-a23ec95e-0a5a-443a-a7a
```

Also added to `backend/.env`:
```
GOOGLE_CLOUD_PROJECT=project-a23ec95e-0a5a-443a-a7a
```

---

### Issue 4: Chirp 3 Model Not Available

**Symptoms:**
```
[Chirp3] Transcription error after 690ms: 3 INVALID_ARGUMENT: The model "chirp_3" does not exist in the location named "us-central1"
```

**Root Cause:**
- Chirp 3 model was not available in the us-central1 region

**Fix Applied:** `backend/src/routes/transcribe.js`
```javascript
// BEFORE: Tried Chirp 3 first, then Gemini
import { isChirp3Available, transcribeWithChirp3 } from '../services/speechToText.js'

// AFTER: Use Gemini directly
import { isGeminiAvailable, transcribeAudio } from '../services/gemini.js'

// Skip Chirp 3, use Gemini 3 Flash only
if (isGeminiAvailable()) {
  result = await transcribeAudio(buffer, normalizedMimeType)
  modelUsed = 'gemini'
}
```

---

### Issue 5: "LLM" Transcription Rejected as Trivial

**Symptoms:**
```
[AUDIO] Trivial transcription ignored { transcription: 'LLM' }
```
- Valid 3-letter acronym was being filtered out

**Root Cause:**
- `isTrivialTranscription()` filtered single tokens with `<= 3` characters
- Intended to catch noise like "um", "uh" but was too aggressive

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// BEFORE (too aggressive):
if (tokens.length === 1 && tokens[0].length <= 3 && !SHORT_QUESTION_WORDS.has(tokens[0])) {
  return true
}

// AFTER (only filter single chars):
// Only filter single-character transcriptions (likely noise)
// Allow 2-3 char words as they can be valid acronyms (LLM, API, GPU) or short words
if (tokens.length === 1 && tokens[0].length <= 1) {
  return true
}
```

---

### Issue 6: TTS Not Playing During Initial Autoplay

**Symptoms:**
- Slides generated successfully with subtitles visible
- No TTS audio during initial autoplay run
- After autoplay finished, manually clicking play worked fine
- Server logs showed TTS requests succeeding (200 status, audio content returned)

**Root Cause:**
In `requestSlideAudio`, the minimum interval check happened BEFORE the cache/in-flight checks:

```javascript
// BEFORE (broken order):
const requestSlideAudio = async (slide) => {
  // ... validation checks ...

  // Rate limit backoff check
  if (now < ttsRateLimitUntilRef.current) return null

  // Minimum interval check - THIS BLOCKED VALID REQUESTS!
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) return null

  // Cache check - NEVER REACHED for duplicate requests
  const cached = getCachedSlideAudio(slide.id)
  if (cached) return cached

  // In-flight check - NEVER REACHED!
  const inFlight = slideAudioRequestRef.current.get(slide.id)
  if (inFlight) return inFlight
  // ...
}
```

Flow:
1. Prefetch started TTS request for slide at time T
2. `lastTtsRequestTimeRef.current` set to T
3. Milliseconds later, `playSlideAudio` called `requestSlideAudio` for same slide
4. Interval check: `timeSinceLastRequest < 3000ms` → returned `null`
5. The in-flight promise (which would resolve with audio) was never awaited!

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// AFTER (correct order):
const requestSlideAudio = async (slide) => {
  // ... validation checks ...

  // Check cache first - if already fetched, return immediately
  const cached = getCachedSlideAudio(slide.id)
  if (cached) return cached

  // Check if request is already in flight - return that promise to await it
  const inFlight = slideAudioRequestRef.current.get(slide.id)
  if (inFlight) return inFlight

  // Rate limit checks only for genuinely NEW requests
  if (now < ttsRateLimitUntilRef.current) return null
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) return null
  // ...
}
```

Now duplicate requests for the same slide properly await the existing in-flight request instead of returning null.

---

## Session: 2026-01-25

### Issue: Subtitle Animation Resets on Pause/Resume

**Symptoms:**
- When slides are narrating and user pauses, then resumes
- The subtitle streaming animation restarts from the beginning
- Expected: subtitles should continue from where they left off

**Root Cause:** `frontend/src/components/StreamingSubtitle.jsx`

The sync fix added earlier reset the timer on EVERY false→true transition of `isPlaying`:

```javascript
// BEFORE (buggy):
useEffect(() => {
  if (isPlaying && !prevIsPlayingRef.current) {
    // This runs on EVERY resume, not just first play!
    elapsedTimeRef.current = 0
    lastTickRef.current = null
    setRevealedCount(0)
    completedRef.current = false
  }
  prevIsPlayingRef.current = isPlaying
}, [isPlaying])
```

This didn't distinguish between:
1. First play of a new slide (should reset)
2. Resume after pause (should NOT reset)

**Fix Applied:** `frontend/src/components/StreamingSubtitle.jsx`

Added `hasStartedPlayingRef` to track whether we've already started playing this text:

```javascript
// Track if we've started playing this text (to distinguish first play from resume)
const hasStartedPlayingRef = useRef(false)

// Reset when text changes (new slide)
useEffect(() => {
  // ... other resets ...
  hasStartedPlayingRef.current = false // Reset for new text
}, [text, duration])

// Only reset on FIRST play, not on resume
useEffect(() => {
  if (isPlaying && !prevIsPlayingRef.current) {
    if (!hasStartedPlayingRef.current) {
      // First time playing this text - reset timer
      elapsedTimeRef.current = 0
      setRevealedCount(0)
      hasStartedPlayingRef.current = true
    }
    // On resume: don't reset, just continue from where we left off
    lastTickRef.current = null // Clean delta calculation restart
  }
  prevIsPlayingRef.current = isPlaying
}, [isPlaying])
```

**Result:** Subtitles now pause and resume correctly, preserving position.

---

## Session 8: 2026-01-25

### Issue 1: ClipPath Subtitle Reveal Broken on Multi-line Text

**Symptoms:**
- Subtitles revealed based on horizontal % of screen width
- On multi-line text, the wrong parts were revealed (mid-word cuts like "buildi|ng")
- Reveal didn't follow natural reading order

**Root Cause:**
```javascript
// ClipPath clips based on HORIZONTAL % of container width
clipPath: `inset(0 ${100 - progress}% 0 0)`
```
This works for single-line text, but multi-line text flows left-to-right THEN down. A 30% horizontal clip doesn't equal 30% of the text content.

**Fix Applied:** `frontend/src/components/StreamingSubtitle.jsx`
```javascript
// Character-based reveal instead of clipPath
const revealedText = text.slice(0, charsToShow)
const unrevealedText = text.slice(charsToShow)
```

---

### Issue 2: Subtitle Text Growing from Middle Instead of Left

**Symptoms:**
- After removing dimmed preview text, partial subtitles centered based on their width
- Text appeared to grow "from the middle" instead of left-to-right

**Root Cause:**
- Parent container has `text-center` class
- Without full text width, partial text re-centers on each reveal

**Fix Applied:** `frontend/src/components/StreamingSubtitle.jsx`
```javascript
// Invisible placeholder maintains full text width for proper centering
return (
  <span>
    {revealedText}
    <span className="invisible">{unrevealedText}</span>
  </span>
)
```

---

### Issue 3: Word-by-Word Reveal Feels Choppy

**Symptoms:**
- Entire words "pop" in at discrete moments
- Felt jarring, not smooth like karaoke apps

**Root Cause:**
- Word-based reveal = discrete jumps when word weight threshold crossed
- No visual transition between states

**Fix Applied:** `frontend/src/components/StreamingSubtitle.jsx`

Changed from word-level to character-level with weighted timing:
```javascript
// Spread word weight across its characters
const weightPerChar = wordWeight / word.length
for (let i = 0; i < word.length; i++) {
  cumWeight += weightPerChar
  weights.push(cumWeight)
}
```

Added gradient fade at reveal edge (last 4 chars fade from 85% → 15% opacity):
```javascript
const FADE_CHARS = 4
const fadeOpacities = [0.85, 0.6, 0.35, 0.15]

{fadeChars.map((char, i) => (
  <span key={i} style={{ opacity: fadeOpacities[i] || 0.15 }}>{char}</span>
))}
```

---

### Issue 4: Subtitles Appearing Before Audio Speaks

**Symptoms:**
- Text revealed ahead of when words were actually spoken
- Subtitles finished before narration ended

**Root Cause:**
```javascript
// 0.95 multiplier made text finish at 95% of audio duration
const effectiveDuration = duration * 0.95
```

**Fix Applied:** `frontend/src/components/StreamingSubtitle.jsx`
```javascript
// Exact 1:1 sync - removed the multiplier
const newProgress = Math.min(100, (currentMs / duration) * 100)
```

---

### Summary of StreamingSubtitle Rewrite

| Before | After |
|--------|-------|
| ClipPath horizontal % | Character-based slice |
| Word-by-word reveal | Character-weighted with gradient fade |
| Dimmed preview text | No preview, invisible placeholder |
| 0.95x timing (early) | 1:1 exact sync |

**Result:** Smooth, karaoke-style subtitle reveal that:
- Follows natural reading order on multi-line text
- Respects speech rhythm (longer words = slower reveal)
- Has soft gradient fade at reveal edge
- Syncs exactly with audio narration

---

### Issue 5: Gradient Fade Causing Visual Flashing

**Symptoms:**
- Visible flashing/flickering during subtitle streaming
- Occurred at the fade edge where characters transition from solid to fading

**Root Cause:**
- Characters were moving between `solidText` (string) and `fadeChars` (array of spans)
- React was creating/destroying DOM elements on every frame
- Even with stable keys, the DOM churn caused visual artifacts

**Fix Applied:** `frontend/src/components/StreamingSubtitle.jsx`
```javascript
// Render ALL characters as spans from the start
{characters.map((char, i) => {
  const isRevealed = i < charsToShow
  const distanceFromEdge = charsToShow - 1 - i

  let opacity = isRevealed
    ? (distanceFromEdge < FADE_CHARS ? fadeOpacities[distanceFromEdge] : 1)
    : 0

  return (
    <span key={i} style={{ opacity, transition: 'opacity 80ms linear' }}>{char}</span>
  )
})}
```

No DOM elements created/destroyed - only opacity changes via CSS transitions.

---

### Issue 6: Fade Gradient Direction Inverted

**Symptoms:**
- Fade appeared in the middle of revealed text, not at the edge
- Characters before the last revealed char were fading instead of after

**Root Cause:**
- `fadeOpacities` array had wrong order: `[1, 0.7, 0.4, 0.15]`
- Index 0 (last char) was getting opacity 1 (brightest) instead of 0.15 (faintest)

**Fix Applied:** `frontend/src/components/StreamingSubtitle.jsx`
```javascript
// BEFORE (wrong):
const fadeOpacities = [1, 0.7, 0.4, 0.15]

// AFTER (correct):
// Index 0 = last revealed char (faintest), index 3 = 4th from edge (almost solid)
const fadeOpacities = [0.15, 0.4, 0.7, 0.9]
```

---

### Issue 7: Subtitles Lagging Behind TTS Audio

**Symptoms:**
- Subtitles consistently behind spoken words
- Audio says word before subtitle reveals it
- Tried 1:1 sync but still lagged

**Root Cause:**
- Weighted timing calculation assumed longer words take proportionally longer
- TTS doesn't follow these exact timings
- Weight drift accumulated over the subtitle duration

**Fix Applied:** `frontend/src/components/StreamingSubtitle.jsx`
```javascript
// BEFORE (weighted - caused drift):
const { charWeights, totalWeight } = useMemo(() => {
  // Complex word weight calculation with punctuation pauses
  // ...
}, [text])
const targetWeight = (displayProgress / 100) * totalWeight
// Loop to find charsToShow based on cumulative weights

// AFTER (linear - perfect sync):
const totalChars = text ? text.length : 0
const charsToShow = Math.round((displayProgress / 100) * totalChars)
```

Simple linear mapping: 50% audio = 50% characters revealed. Perfect sync.

---

### Summary of Final StreamingSubtitle Implementation

| Aspect | Implementation |
|--------|----------------|
| Character reveal | Linear (audio% = chars%) |
| DOM strategy | All chars rendered upfront, stable keys |
| Fade effect | CSS opacity transitions (80ms linear) |
| Fade gradient | Last 4 chars: 0.15 → 0.4 → 0.7 → 0.9 |
| Sync method | Direct audio.currentTime / duration |

**Tradeoffs:**
- Sacrificed weighted timing (speech rhythm matching)
- Gained perfect audio sync and no visual artifacts

---

## Session 9: 2026-01-26

### Issue 1: Subtitle Streaming Doesn't Start After Manual Slide Jumps

**Symptoms:**
- After navigating historical topics, clicking random slides plays TTS audio
- Subtitle streaming stays static until user pauses/resumes
- Pausing and resuming immediately starts streaming

**Root Cause:**
- `isSlideNarrationPlaying` remained `true` across slide changes
- Manual navigation sets `wasManualNavRef.current = true`, so subtitles defaulted to `showAll`
- Without a `false → true` transition, `StreamingSubtitle` never re-synced

**Fix Applied:** `frontend/src/App.jsx`
```javascript
// Reset playing state when slide changes so streaming restarts on audio play
if (slideChanged) {
  lastSlideIdRef.current = slideId
  setIsSlideNarrationPlaying(false)
  setIsSlideNarrationReady(false)
  setIsSlideNarrationLoading(false)
}
```

**Result:** Manual slide clicks now reliably trigger streaming subtitles without pause/resume.
