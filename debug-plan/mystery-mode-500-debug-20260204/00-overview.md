# Mystery Mode 500 Debug (2026-02-04)

## Context
After completing a quiz and selecting **Mystery Lab** from the mode selector, the UI attempted to load:

- `POST http://localhost:3002/api/learn/mystery`

The request returned `500 Internal Server Error`, and the frontend logged:

- `[MYSTERY] Loading mystery`
- `[MYSTERY] Mystery load aborted` (dev-only, due to React 18 StrictMode double-invocation)
- `Failed to load resource: the server responded with a status of 500`
- `[MYSTERY] Failed to load mystery`

## Root Cause (Confirmed)
`backend/src/services/mysteryGenerator.js` was implemented against an older/legacy Google GenAI SDK surface:

- Used `genAI.getGenerativeModel(...)` (not present in `@google/genai` v1.x)
- Used `response.text()` as a function (the SDK returns `response.text` as a property)

This caused a runtime `TypeError` inside the service, which the route handler caught and surfaced as a `500`.

## Fix Summary
Align `mysteryGenerator.js` with the SDK usage already used in `backend/src/services/gemini.js`:

- Use `ai.models.generateContent({ model, contents })`
- Read `response.text` (property)
- Gate calls when `GEMINI_API_KEY` is missing/placeholder (`API_NOT_AVAILABLE`)
- Add tests for service + route mapping to prevent regressions

