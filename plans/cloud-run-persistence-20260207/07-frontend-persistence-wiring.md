# Feature: Frontend Wiring for Graph + Mode Session Persistence

**ID:** 07
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 04,05,06

## Description
Wire frontend hooks/components to use new persistence endpoints and expand Mystery/Wonder completion payload with a `session` object.

## Acceptance Criteria
- [ ] `useKnowledgeGraph` loads from server on init and saves debounced.
- [ ] Mystery/Wonder `onComplete` include `session` payload.
- [ ] App completion handler saves mode sessions.
- [ ] `useStoryStorage` merges remote + local stories.
