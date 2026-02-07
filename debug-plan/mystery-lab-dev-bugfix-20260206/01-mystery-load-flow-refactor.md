# Feature: Mystery load flow refactor (imagePrompt contract)

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** -

## Description

Refactor MysteryLab loading to fetch mystery first, then trigger image generation using `imagePrompt` from mystery payload to satisfy backend `/api/learn/mystery/image` contract.

## Acceptance Criteria

- [x] Mystery request remains primary blocking fetch.
- [x] Image request sends `{ imagePrompt, topicName, explanationLevel }`.
- [x] `/api/learn/mystery/image` `400` from missing `imagePrompt` no longer occurs.
- [x] Image failure remains non-blocking with placeholder fallback.

## Implementation Details

### Files to Create/Modify

- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx` - loading orchestration update

### Key Components

1. **MysteryLab loading effect**
- Fetch mystery and transition to intro on success.
- Fire non-blocking image fetch after mystery resolves.

### Technical Decisions

- **Decision:** Sequence fetches instead of `Promise.allSettled` for initial load.
- **Trade-off:** Slightly later image start, but guaranteed valid prompt contract.

## Dependencies

### Blocks
- **Feature 02:** Error mapping relies on updated request flow
- **Feature 03:** StrictMode guard wraps the same loading path
- **Feature 05:** Tests depend on stable flow

## Testing Requirements

- [x] Unit tests for request payload contract
- [x] Integration behavior via component test for image fallback

## Implementation Checklist

- [x] Update loading effect
- [x] Ensure image fetch receives `imagePrompt`
- [x] Validate no regression in state transitions

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Implemented By:** Codex
