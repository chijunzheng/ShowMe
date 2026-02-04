# Feature: Build `progressPieces` (Local Topics + World Metadata)

**ID:** 01  
**Status:** ✅ Completed  
**Priority:** High  
**Estimated Complexity:** Medium  
**Dependencies:** -

## Description
Progress tab currently uses `/api/world` pieces (`worldPieces`) as the topic list. If no pieces exist, Progress shows no topics even though the user watched a slideshow.

Implement a merged `progressPieces` array sourced from local `topics` (canonical) and optionally enriched by `worldPieces` metadata (zone, review timestamps, related topics).

## Acceptance Criteria
- [x] Progress tab shows a topic after the slideshow has been watched (even if `worldPieces.length === 0`).
- [x] Each Progress topic has:
  - [x] `topicName`
  - [x] `topicId`
  - [x] `zone` (defaults to derived zone)
  - [x] `unlockedAt` (from topic timestamps)
  - [x] `lastReviewedAt` (from world piece if present, else fallback)
- [x] Existing Progress components (DueForReview, QuickPractice, TopicsByZone, TopicActionSheet) work with the new data.

## Implementation Details
### Files To Modify
- `frontend/src/App.jsx`
- `frontend/src/components/ProgressTab/ProgressTab.jsx`

### Data Merging Rules
1. Base list: local `topics` array.
2. Match a world piece by:
   - `topicId` match first
   - else case-insensitive `topicName` match
3. Overlay world piece fields on top of topic-derived defaults:
   - `zone`
   - `unlockedAt`
   - `lastReviewedAt`
   - `relatedTopics`

### Defaults
- `zone`: derived via `getZoneForCategory(topic.category)` (fallback `nature`)
- `unlockedAt`: `createdAt` else `lastAccessedAt` else `Date.now()`
- `lastReviewedAt`: world piece value when present; else `null` (review utils will fall back to `unlockedAt`)

## Testing Requirements
- [x] Manual smoke test: Progress tab shows topics from local storage with no `/api/world` pieces.

## Notes
- Do not include world-only pieces (no matching local topic) in the list (actions would break due to missing slides).

---
**Created:** 2026-02-04  
**Last Updated:** 2026-02-04  
**Implemented By:** Codex
