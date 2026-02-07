# Feature: Gaps API Fresh Constraints (Backend)

**ID:** 03
**Status:** ✅ Completed
**Priority:** High
**Dependencies:** -

## Goal
`/api/graph/gaps` supports requested count and excluded topics and returns unique suggestions with bounded retries.

## Acceptance Criteria
- [x] Route accepts optional `targetCount` and `excludeTopics` with validation.
- [x] Service accepts `identifyKnowledgeGaps(graph, options)`.
- [x] Prompt includes excluded-topic guidance.
- [x] Service aggregates unique suggestions across up to 3 attempts.
- [x] Service filters learned + excluded topics and returns at most requested count.

## Files
- `backend/src/routes/graph.js`
- `backend/src/services/geminiGraph.js`
