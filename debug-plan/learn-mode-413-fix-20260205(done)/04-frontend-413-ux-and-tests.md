# Feature: Frontend — 413 UX messaging + unit tests

**ID:** 04  
**Status:** ✅ Completed  
**Priority:** Medium  
**Estimated Complexity:** Medium  
**Dependencies:** 03

## Description

Improve user-facing error messaging when Learn mode requests fail due to payload size, and add unit tests for the slide payload builder.

## Acceptance Criteria

- [ ] Wonder Lab shows a clear “lesson content is too large” message when backend returns HTTP 413.
- [ ] Story Studio shows the same message for HTTP 413.
- [ ] Unit tests cover `buildLearnSlidesPayload`:
  - [ ] drops non-content slides
  - [ ] trims fields and drops empty slides
  - [ ] enforces max slides and max chars per field

## Implementation Details

### Files to Create/Modify

- `frontend/src/components/LearnModes/WhatIf/WonderLab.jsx`
- `frontend/src/components/LearnModes/Story/StoryStudio.jsx`
- `frontend/src/utils/__tests__/learnSlidesPayload.test.js`

## Testing Requirements

- [ ] Run `cd frontend && npm test`

---
**Created:** 2026-02-05  
**Last Updated:** 2026-02-05  
**Implemented By:** Codex CLI
