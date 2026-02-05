# Feature: Frontend — Friendly error surfacing for learn modes

**ID:** 04  
**Status:** ✅ Completed  
**Priority:** Medium  
**Estimated Complexity:** Low  
**Dependencies:** 03

## Description
Improve WonderLab and StoryStudio to show clear error messages based on backend status codes and `{ error, message }` response payloads.

## Acceptance Criteria
- [ ] 503 shows “AI service unavailable…”
- [ ] 429 shows “Too many requests…”
- [ ] 502 shows “AI response format issue…”
- [ ] 413 retains “Lesson content too large…”

## Implementation Details
### Files to Modify
- `frontend/src/components/LearnModes/WhatIf/WonderLab.jsx`
- `frontend/src/components/LearnModes/Story/StoryStudio.jsx`

---
**Created:** 2026-02-05  
**Last Updated:** 2026-02-05  
**Implemented By:** Codex CLI
