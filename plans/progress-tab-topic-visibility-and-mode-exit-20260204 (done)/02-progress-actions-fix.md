# Feature: Fix Progress Actions (Review Slideshow + Quick Quiz)

**ID:** 02  
**Status:** ✅ Completed  
**Priority:** High  
**Estimated Complexity:** Medium  
**Dependencies:** 01

## Description
`ProgressTab` expects callbacks with `topicName` strings:
- `onReviewSlideshow(topicName)` should reopen the slideshow
- `onQuickQuiz(topicName)` should start a quiz flow

Currently `App.jsx` passes handlers with mismatched signatures and behavior (e.g. “Review Slideshow” starts a quiz).

## Acceptance Criteria
- [x] “Review Slideshow” from Progress opens the slideshow for that topic.
- [x] “Quick Quiz” from Progress starts quiz flow for that topic.
- [x] No runtime errors from passing a string where an object is expected.

## Implementation Details
### Files To Modify
- `frontend/src/App.jsx`

### Handler Specs
1. `handleReviewSlideshowFromProgress(topicName: string)`
   - Find matching local topic by name (case-insensitive).
   - Call existing `handleNavigateToTopic(topic.id)`.
2. `handleQuickQuizFromProgress(topicName: string)`
   - Find matching local topic by name.
   - Call existing `requestTopicQuiz({ topicId, topicName })`.

## Testing Requirements
- [x] Manual: review and quiz actions work from Progress tab for a newly learned topic.

---
**Created:** 2026-02-04  
**Last Updated:** 2026-02-04  
**Implemented By:** Codex
