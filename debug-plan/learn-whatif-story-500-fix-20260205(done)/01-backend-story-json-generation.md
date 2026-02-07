# Feature: Backend — Story prompt + scene JSON generation

**ID:** 01  
**Status:** ✅ Completed  
**Priority:** High  
**Estimated Complexity:** Medium  
**Dependencies:** -

## Description
Fix `/api/learn/story` and `/api/learn/story/scene` by replacing the incorrect `generateScript()` usage with dedicated Gemini helpers that return parsed JSON objects.

## Acceptance Criteria
- [ ] `POST /api/learn/story` returns 200 with `{ storyPrompt, conceptChecklist, starterSuggestion, imageStyle }`.
- [ ] No `.trim()`/regex parsing is performed on `{ slides, error }` objects.
- [ ] `POST /api/learn/story/scene` no longer crashes due to string parsing; it returns `{ sceneDescription, imagePrompt, conceptsFound, narrativeText, imageUrl? }` (with fallback when parse fails).

## Implementation Details
### Files to Create/Modify
- `backend/src/services/gemini.js` — add:
  - `generateStoryPrompt({ slides, topicName, language })`
  - `extractStoryScene({ transcript, topicName, conceptChecklist, previousScenes, language })`
- `backend/src/routes/learn.js` — use the new helpers in `/story` and `/story/scene`.

### Key Behaviors
- Use `getAIClient()` and `ai.models.generateContent` with:
  - `config.responseMimeType = 'application/json'`
  - reasonable `maxOutputTokens`
- Parse with `repairJSON(extractJSON(text))` + `JSON.parse`
- Validate required fields; return error codes (`PARSE_ERROR`, `INVALID_RESPONSE`, `RATE_LIMITED`, etc.)

## Testing Requirements
- [ ] Covered by Feature 05 route tests (mocked services).

---
**Created:** 2026-02-05  
**Last Updated:** 2026-02-05  
**Implemented By:** Codex CLI
