# Feature: Backend Story Storage Service

**ID:** 01
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None
**Track:** A

## Description

Create `backend/src/services/storyStorage.js` following the `userProgress.js` Firestore + local JSON fallback pattern. Provides CRUD operations for saved stories.

## Acceptance Criteria

- [ ] `getStories(clientId)` returns array of stories for a client
- [ ] `saveStory(clientId, storyData)` persists a story document
- [ ] `deleteStory(clientId, storyId)` removes a story by ID
- [ ] Firestore used in production, `.data/stories.json` fallback in dev
- [ ] Debounced disk writes for local fallback (same pattern as userProgress.js)

## Implementation Details

### Files to Create

- `backend/src/services/storyStorage.js` - NEW

### Key Functions

1. **`getStories(clientId)`** - Returns `{ stories: [], error: null }`
2. **`saveStory(clientId, storyData)`** - Returns `{ story: {}, error: null }`
3. **`deleteStory(clientId, storyId)`** - Returns `{ success: boolean, error: null }`

### Pattern Reference

Copy from `userProgress.js` lines 16-95:
- Firestore initialization with `getFirestore()`
- `shouldUseLocalProgress()` → `shouldUseLocalStorage()`
- `loadLocalProgressFromDisk()` → `loadLocalStoriesFromDisk()`
- `writeLocalProgressToDisk()` → `writeLocalStoriesToDisk()`
- `scheduleLocalProgressSave()` → `scheduleLocalStoriesSave()`
- Local file: `.data/stories.json`
- Firestore collection: `stories` (subcollection keyed by clientId)

### Story Data Shape

```js
{
  id: string,              // crypto.randomUUID()
  topicName: string,
  createdAt: number,       // Date.now()
  scenes: [{ imageUrl, sceneDescription, narrativeText, chapterTitle }],
  conceptsFound: string[],
  totalConcepts: number,
  xpEarned: number,
  storySetup: { storyPrompt, conceptChecklist, imageStyle },
  version: 1
}
```

## Dependencies

### Depends On
- None

### Blocks
- **Feature 02:** Routes need this service

## Notes

- Keep it simple — no validation beyond basic clientId/storyId checks
- The service doesn't generate IDs; the frontend sends `id` already set

---

**Created:** 2026-02-06
