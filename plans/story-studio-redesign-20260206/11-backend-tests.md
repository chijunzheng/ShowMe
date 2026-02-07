# Feature: Backend Tests for Story Chapter Endpoint

**ID:** 11
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Medium
**Dependencies:** 03, 04
**Track:** E (Tests)

## Description

Write backend integration tests for the updated `/api/learn/story` route and the new `/api/learn/story/chapter` endpoint. Mock Gemini service calls.

## Acceptance Criteria

- [ ] Tests for updated `/api/learn/story` with new response fields
- [ ] Tests for new `/api/learn/story/chapter` endpoint
- [ ] Input validation tests for chapter endpoint
- [ ] Error handling tests
- [ ] Tests verify parallel image/TTS generation
- [ ] All tests pass with mocked Gemini service

## Implementation Details

### Files to Create/Modify

- `backend/src/routes/__tests__/learn.story.test.js` - Update existing + add new tests

### Test Cases for /api/learn/story (updated)

1. Returns new fields: missionHook, conceptCards, chapters, sceneImage, missionHookAudio
2. Handles missing new fields gracefully (backward compat)
3. Image/TTS generation failures don't fail request
4. Existing tests still pass

### Test Cases for /api/learn/story/chapter (new)

1. Validates topicName is required
2. Validates previousChapters is required and non-empty
3. Validates currentChapter must be 2 or 3
4. Returns chapter 2 choices with illustration
5. Returns chapter 3 with no nextChapter
6. Returns conceptsFound array
7. Image generation failure returns null imageUrl
8. API error returns appropriate status code
9. Rate limiting works

## Testing Requirements

- [ ] All existing story tests still pass
- [ ] New tests cover happy path and error cases
- [ ] Tests use mocked Gemini service

## Implementation Checklist

- [ ] Update existing /api/learn/story tests for new fields
- [ ] Add /api/learn/story/chapter test suite
- [ ] Mock generateStoryChapter and generateEducationalImage
- [ ] Verify all tests pass

---
**Created:** 2026-02-06
