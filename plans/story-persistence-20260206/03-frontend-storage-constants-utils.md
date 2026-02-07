# Feature: Frontend Storage Constants + Utils

**ID:** 03
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** None
**Track:** B

## Description

Add story storage constants to `appConfig.js` and create `frontend/src/utils/storyStorage.js` with localStorage CRUD functions.

## Acceptance Criteria

- [ ] `STORAGE_KEYS.STORIES` and `STORAGE_KEYS.STORY_CONTENT_PREFIX` added
- [ ] `STORAGE_LIMITS.MAX_CACHED_STORIES` = 10 added
- [ ] `STORAGE_VERSIONS.STORIES` = 1 added
- [ ] `saveStoryToStorage(story)` saves metadata + content to localStorage
- [ ] `loadStoriesFromStorage()` returns metadata list from localStorage
- [ ] `loadStoryContent(id)` returns full story content
- [ ] `deleteStoryFromStorage(id)` removes both metadata entry and content key
- [ ] Eviction: oldest stories removed when exceeding MAX_CACHED_STORIES

## Implementation Details

### Files to Modify/Create

- `frontend/src/constants/appConfig.js` - MODIFY (add 3 keys)
- `frontend/src/utils/storyStorage.js` - NEW

### appConfig.js Changes

```js
// STORAGE_KEYS
STORIES: 'showme_stories',
STORY_CONTENT_PREFIX: 'showme_story_content_',

// STORAGE_LIMITS
MAX_CACHED_STORIES: 10,

// STORAGE_VERSIONS
STORIES: 1,
```

### storyStorage.js Pattern

Follow `topicStorage.js`:
- Metadata list stored at `STORAGE_KEYS.STORIES` (array of `{ id, topicName, createdAt, conceptCount, totalConcepts, xpEarned, firstSceneImageUrl }`)
- Full content at `STORAGE_KEYS.STORY_CONTENT_PREFIX + id`
- On save: add to metadata list, store content separately, evict oldest if >10
- On delete: remove from metadata list, remove content key

## Dependencies

### Depends On
- None

### Blocks
- **Feature 04:** useStoryStorage hook imports these utils

## Notes

- Metadata is lightweight for fast list rendering; full content loaded on demand
- `firstSceneImageUrl` in metadata enables thumbnail display without loading full content

---

**Created:** 2026-02-06
