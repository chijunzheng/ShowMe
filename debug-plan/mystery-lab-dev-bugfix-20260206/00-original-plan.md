# Plan: Mystery Lab Dev Bug Fix (Image 400 + Mystery 503)

## Summary
Root cause analysis is complete:

1. `400` on `POST /api/learn/mystery/image` is caused by a frontend/backend contract mismatch.
`frontend/src/components/LearnModes/Mystery/MysteryLab.jsx` currently calls image generation with `{ topicName }`, but `backend/src/routes/learn.js` requires `imagePrompt` and `topicName`.

2. `503` on `POST /api/learn/mystery` is `API_NOT_AVAILABLE` from backend service mapping in `backend/src/routes/learn.js`.
This comes from `backend/src/services/mysteryGenerator.js` when Gemini client is unavailable at runtime (missing/invalid runtime env, not necessarily missing `.env` file).

3. `Mystery load aborted` log is a dev React StrictMode double-effect artifact, and we will reduce noisy duplicate loading with a dedupe guard.

Chosen defaults:
- `503` handling: friendly error UI (no mock fallback).
- StrictMode: add dedupe guard (keep StrictMode enabled).

## Public API / Interface Changes
No external endpoint contract changes.
Endpoints remain:
- `POST /api/learn/mystery`
- `POST /api/learn/mystery/image`
- `POST /api/learn/mystery/evaluate`

Internal frontend behavior changes in `MysteryLab`:
- Image generation request will include `imagePrompt`.
- Mystery error mapping will surface user-friendly messages for `503`, `429`, `413`, parse/invalid cases.
- Dev duplicate-load prevention in StrictMode.

## Implementation Plan
1. Refactor Mystery loading sequence in `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx`.
- Keep mystery fetch as the primary blocking request.
- After mystery success, start image request as non-blocking using:
  - `imagePrompt: mystery.imagePrompt`
  - `topicName`
  - `explanationLevel`
- Remove the current image request path that sends only `topicName`.
- Preserve placeholder fallback on image failure.

2. Add robust error-code mapping for mystery fetch in `MysteryLab`.
- Map backend status/error codes to friendly messages (aligned with Wonder/Story):
  - `503` / `API_NOT_AVAILABLE` => "AI service is unavailable right now. Please try again in a bit."
  - `429` / `RATE_LIMITED` => throttling message
  - `413` => payload-too-large message
  - parse/invalid => retryable generation message
- Keep retry/exit controls in existing error screen state.

3. Add StrictMode dedupe guard in `MysteryLab`.
- Use a ref token (`loadRequestId`) or in-flight guard so only latest effect updates state.
- Keep `AbortController` cleanup.
- Ensure no state transition to error from intentionally aborted stale request.
- Goal: avoid duplicate user-visible loading churn and reduce “load aborted” noise.

4. Improve backend diagnostics for `API_NOT_AVAILABLE` path (no behavior change).
- In `backend/src/services/mysteryGenerator.js`, log explicit context when client is unavailable:
  - key missing/placeholder state (without exposing secrets)
  - actionable hint to validate runtime env loading from backend process cwd.
- Keep current `503` response behavior unchanged.

5. Add/adjust tests.
- Frontend tests for `MysteryLab`:
  - Sends `imagePrompt` to `/api/learn/mystery/image` after mystery payload arrives.
  - Continues to intro when image request fails.
  - Shows friendly message on mystery `503`.
  - Under `React.StrictMode`, duplicate mount/effect does not cause duplicate committed load state.
- Backend route test extension in `backend/src/routes/__tests__/learn.mystery.test.js`:
  - Add `/mystery/image` validation case(s) to lock contract (`imagePrompt` required).

## Test Cases and Scenarios
1. Happy path:
- Mystery request `200`.
- Image request `200`.
- UI transitions `LOADING -> INTRO` with scene image shown.

2. Image failure non-blocking:
- Mystery request `200`.
- Image request `400`/`500`.
- UI still transitions to `INTRO` with placeholder image and no crash.

3. Mystery API unavailable:
- Mystery request `503` with `API_NOT_AVAILABLE`.
- UI shows friendly error with `Try Again` and `Exit`.

4. StrictMode behavior:
- Dev StrictMode double-invokes effect.
- No duplicate committed mystery state, no false error state, no stuck loading.

5. Retry behavior:
- Initial mystery failure -> click `Try Again` -> successful load transitions correctly.

## Assumptions and Defaults
- No mock-mystery fallback will be introduced.
- Existing backend endpoint contracts stay as-is.
- `STORAGE` quota warning (`frontend/src/utils/topicStorage.js`) is non-blocking and out of scope for this bug.
- Runtime startup expectation remains `cd backend && npm run dev` so `backend/.env` is loaded consistently.
