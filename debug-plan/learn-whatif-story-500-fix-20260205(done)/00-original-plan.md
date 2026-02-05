# Debug & Fix 500s for Learn Modes: `/api/learn/whatif` + `/api/learn/story`

## Summary
Both **What If** and **Story** requests reach the backend but return **500 Internal Server Error**. With `GEMINI_API_KEY` set, the likely causes are runtime bugs and parsing/config issues.

## Root causes (from code inspection)
1) **Story route bug**: `backend/src/routes/learn.js` treats `generateScript()` like it returns a string (calls `.trim()`), but `generateScript()` returns `{ slides, error }` → throws → 500.
2) **What If bug(s)**:
   - `generateWhatIfScenario()` and `evaluateWhatIfPrediction()` reference `ai` without defining it.
   - They treat `extractJSON()` (returns a string) as if it returns an object.

## Plan
1. Fix Story prompt + Story scene generation to use dedicated JSON-generating helpers.
2. Fix WhatIf scenario + evaluation to define `ai`, request strict JSON, parse/validate consistently.
3. Improve learn route error/status mapping and logging.
4. Update frontend to show friendly messages for 429/503/502/413.
5. Add regression tests for the learn routes using router-level mocks (no network sockets).

