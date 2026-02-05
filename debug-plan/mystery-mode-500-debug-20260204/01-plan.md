# Plan: Fix Mystery Mode 500

## Goals / Success Criteria
- Clicking **Mystery Lab** results in a successful load (no `500` from `POST /api/learn/mystery`).
- Backend behaves consistently with other AI-backed endpoints:
  - `503` for missing/unavailable API
  - `429` for rate limiting/quota
  - `400` for invalid inputs
- Add automated tests to prevent regression.

## Approach

### Phase 1: Confirm Root Cause (Pre-fix)
1. Reproduce via the frontend and/or `curl` request to `POST /api/learn/mystery`.
2. Inspect backend logs to confirm a runtime exception, likely a `TypeError` involving GenAI SDK calls.
3. Identify mismatch between `mysteryGenerator.js` and the installed `@google/genai` version.

### Phase 2: Implement Root Fix (Backend)
1. Update `backend/src/services/mysteryGenerator.js` to use the current `@google/genai` API:
   - Initialize `GoogleGenAI` lazily.
   - Use `ai.models.generateContent({ model, contents })`.
   - Read `response.text` (property).
2. Add API-key gating:
   - If `GEMINI_API_KEY` missing or set to placeholder, return `{ error: 'API_NOT_AVAILABLE' }`.
3. Ensure JSON failures map to stable error codes:
   - Extraction/parsing issues return `{ error: 'PARSE_ERROR' }`.
4. Keep error mapping consistent with `backend/src/routes/learn.js`:
   - `API_NOT_AVAILABLE` → `503`
   - `RATE_LIMITED` → `429`

### Phase 3: Add Tests
1. Service-level tests (`vitest`) for `mysteryGenerator.js`:
   - Mocks `@google/genai` to avoid network calls.
   - Validates happy path parsing and error mapping.
   - Validates API key gating.
2. Route-level tests for `backend/src/routes/learn.js`:
   - Validate `400` on missing `topicName` / invalid `slides`.
   - Validate `503` and `429` mapping based on service return.

### Optional: Reduce Dev-Only Noise
If desired, add a `useRef` guard in `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx` to avoid calling `loadMystery()` twice under React 18 StrictMode in development. (Not required for correctness.)

## Public API / Interface Changes
None. Endpoint contract remains:
- `POST /api/learn/mystery`
- `POST /api/learn/mystery/evaluate`

## Acceptance Tests
1. Manual: run backend + frontend, complete a quiz, click **Mystery Lab**:
   - Mystery scene loads and displays title/setup/clues.
2. Automated:
   - `cd backend && npm test -- --run` passes.

