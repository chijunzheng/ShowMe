# Fix 413 “Payload Too Large” for Learn Modes (Wonder Lab / Story Studio)

## Summary
The 413s happen because the backend applies a **10kb JSON body limit** to most `/api/*` routes, including `/api/learn/*`. Learn-mode requests include `slides` text (and sometimes other large fields), so Express rejects the request during JSON parsing **before the route handler runs**.

We’ll fix it in two layers:
1) **Backend:** Raise the JSON body limit specifically for `/api/learn/*` to **2 MB**.
2) **Frontend:** Ensure Learn-mode requests send a **trimmed slides payload** (subtitle/script only, capped) so requests stay small and prompts stay sane.

## Root cause (what’s happening)
- Frontend sends `POST http://localhost:3002/api/learn/whatif` and `POST http://localhost:3002/api/learn/story`.
- Backend `backend/src/index.js` uses `express.json({ limit: '10kb' })` for most routes and only allows large bodies for `/api/slides` and `/api/world/piece`.
- Since `/api/learn/*` isn’t whitelisted, payloads exceeding 10kb trigger Express’s `entity.too.large` → backend returns **413** → UI shows “Failed to generate scenario”.

## Decisions locked in
- Fix scope: **Backend + frontend**.
- Backend JSON limit for `/api/learn/*`: **2 MB**.

## Implementation details

### 1) Backend: route-aware JSON parsing for `/api/learn/*` (2 MB)
**File:** `backend/src/index.js`

**Change:**
- Add a dedicated parser:
  - `const learnJson = express.json({ limit: '2mb' })`
- Update the existing parser-selection middleware to:
  1. Use `largeJson` for `/api/slides*` and `/api/world/piece*` (unchanged).
  2. Use `learnJson` for `/api/learn*` (new).
  3. Use `smallJson` for everything else (unchanged).

### 2) Frontend: send a compact `slides` payload for all Learn modes

#### 2.1 Add a shared helper
**File:** `frontend/src/utils/learnSlidesPayload.js` (new)

**Function:** `buildLearnSlidesPayload(slides, options?)`

**Behavior:**
- Filters out non-content slides if `slide.type` exists and is `'header'` or `'suggestions'`.
- Extracts only:
  - `subtitle` (string)
  - `script` (string)
- Trims whitespace.
- Caps size:
  - `MAX_SLIDES = 12`
  - `MAX_CHARS_PER_FIELD = 2000` (applies independently to subtitle/script)
- Drops slides where both fields are empty after trimming.
- Returns `Array<{ subtitle: string, script: string }>` (best-effort).

#### 2.2 Use the helper in Learn components
Update these to use `buildLearnSlidesPayload(slides)` in their request bodies:
- `frontend/src/components/LearnModes/WhatIf/WonderLab.jsx`
- `frontend/src/components/LearnModes/Story/StoryStudio.jsx`
- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx`

### 3) Frontend: show a clearer message when 413 happens
- WonderLab: handle `response.status === 413` with a friendly “lesson content is too large” message.
- StoryStudio: same override.

## Public API / interface changes
No API shape changes. Only operational change:
- `/api/learn/*` now accepts JSON bodies up to **2 MB** instead of 10kb.

## Test plan (automated + manual)

### Backend automated test (regression guard)
Goal: ensure `/api/learn/*` accepts payloads >10kb without returning 413, while other routes remain small-by-default.

**Approach:**
1. Extract the JSON parser selection middleware into:
   - `backend/src/middleware/jsonBodyParser.js`
2. In `backend/src/index.js`, import and `app.use(createJsonBodyParserMiddleware())`.
3. Add a Vitest test using Express + Supertest:
   - `backend/src/middleware/__tests__/jsonBodyParser.test.js`
   - Assert:
     - `/api/learn/test` accepts ~20kb JSON (200)
     - `/api/other/test` rejects >10kb JSON (413)

### Manual verification
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Reproduce:
   - Topic: “Astronaut Sleep”
   - Click **Wonder Lab** → should load scenario (no 413)
   - Click **Story Studio** → should load story prompt (no 413)

## Acceptance criteria
- Clicking **Wonder Lab** and **Story Studio** no longer produces 413 for typical lessons.
- Frontend payload excludes large/non-essential fields (no base64/image fields sent).
- Backend still enforces strict limits for non-learn routes.
- If a user does hit the learn limit, UI shows a clear “content too large” message.

