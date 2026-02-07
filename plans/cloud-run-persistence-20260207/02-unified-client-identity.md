# Feature: Unified Client Identity

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01

## Description
Unify all client identity reads/writes to one source (`frontend/src/utils/clientId.js`) so slides, graph, stories, modes, and WebSocket share the same stable anonymous identifier.

## Acceptance Criteria
- [ ] `useWebSocket` uses shared `getClientId()`.
- [ ] `topicStorage` uses shared `getClientId()`.
- [ ] No duplicate client-id storage keys remain.

## Files to Modify
- `frontend/src/utils/clientId.js`
- `frontend/src/hooks/useWebSocket.js`
- `frontend/src/utils/topicStorage.js`
