# Plan: Constellation Discover + Marine Biology + Rank Bar + Wheel Fix

## Summary
- Fix Constellation wheel listener so `preventDefault` runs on a non-passive listener.
- Make the Discover button call the existing engagement endpoint with a `query` string and parse suggestions safely.
- Add a `marine biology` category (config + keyword mapping) and migrate existing nodes so “Whale Songs” shows under it.
- Make the TopicSidebar rank bar use topic count only (no XP gating).

## Changes by Area

### 1) Constellation wheel passive listener warning
- Remove `onWheel` from JSX and attach a native `wheel` listener with `{ passive: false }` on the container.
- Call `event.preventDefault()` only when `event.cancelable`.
- Cleanup on unmount.

### 2) Discover button backend mismatch (400)
- Change Discover request body to `{ query }` for `/api/generate/engagement`.
- Build `query` from topic names.
- Parse `suggestedQuestions[0]` and normalize into a topic name (trim, strip `?`, drop leading question words).

### 3) Add “Marine Biology” category + mapping
- Add `marine biology` to cluster config (icon + color) in:
  - `frontend/src/hooks/useKnowledgeGraph.js`
  - `frontend/src/utils/graphMigration.js`
- Update `determineCategory` keyword mapping to include marine/ocean keywords.
- On graph load, re-evaluate existing nodes and update categories/clusters accordingly.

### 4) TopicSidebar rank bar uses topics-only logic
- Add `getExplorerRankByTopics` and `getRankProgressByTopics` in `explorerRankUtils`.
- Update `TopicSidebar.jsx` to use the topics-only helpers.

## Tests and Scenarios
- Unit tests for marine category mapping and new rank helpers.
- Manual QA: no passive listener warning, Discover works, Marine Biology cluster appears, sidebar rank text correct.

## Assumptions
- Discover uses engagement endpoint and suggestedQuestions output.
- Marine biology is a dedicated category (single category per node).
- Sidebar rank bar is topics-only; other areas keep XP gating.
