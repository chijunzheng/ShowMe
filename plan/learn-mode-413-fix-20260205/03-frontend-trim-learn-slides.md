# Feature: Frontend — Trim learn slides payload

**ID:** 03  
**Status:** ✅ Completed  
**Priority:** High  
**Estimated Complexity:** Low  
**Dependencies:** -

## Description

Ensure Learn mode requests send only compact, relevant slide text to the backend to prevent oversized requests and reduce prompt bloat.

## Acceptance Criteria

- [ ] Wonder Lab, Story Studio, and Mystery Lab send `slides` as an array of `{ subtitle, script }` only.
- [ ] Payload caps applied:
  - [ ] max 12 slides
  - [ ] max 2000 chars per field (subtitle/script)
- [ ] Non-content slides (`type: 'header'` / `'suggestions'`) are excluded when present.

## Implementation Details

### Files to Create/Modify

- `frontend/src/utils/learnSlidesPayload.js` — shared builder.
- `frontend/src/components/LearnModes/WhatIf/WonderLab.jsx` — use builder for `slides`.
- `frontend/src/components/LearnModes/Story/StoryStudio.jsx` — use builder for `slides`.
- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx` — use builder for `slides`.

### Key Components

1. `buildLearnSlidesPayload(slides)`
   - best-effort normalization, trimming, and size caps.

## Testing Requirements

- [ ] Unit tests added in Feature 04.

---
**Created:** 2026-02-05  
**Last Updated:** 2026-02-05  
**Implemented By:** Codex CLI
