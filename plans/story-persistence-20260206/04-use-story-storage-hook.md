# Feature: useStoryStorage Hook

**ID:** 04
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 03
**Track:** B

## Description

Create `frontend/src/hooks/useStoryStorage.js` — a React hook wrapping localStorage reads + fire-and-forget server sync.

## Acceptance Criteria

- [ ] Returns `{ stories, saveStory, deleteStory, loadStoryContent, isLoading }`
- [ ] Loads metadata from localStorage on mount
- [ ] `saveStory(storyDoc)` writes to localStorage immediately, then POSTs to server
- [ ] `deleteStory(id)` removes from localStorage immediately, then DELETEs on server
- [ ] `loadStoryContent(id)` returns full content from localStorage
- [ ] Server sync is fire-and-forget (errors logged, not thrown)
- [ ] Stable function references (useCallback)

## Implementation Details

### Files to Create

- `frontend/src/hooks/useStoryStorage.js` - NEW

### Hook API

```js
const { stories, saveStory, deleteStory, loadStoryContent, isLoading } = useStoryStorage()
```

- `stories`: Array of metadata objects (lightweight, for list rendering)
- `saveStory(fullStoryDoc)`: Saves to localStorage + fires server POST
- `deleteStory(id)`: Removes from localStorage + fires server DELETE
- `loadStoryContent(id)`: Returns full content from localStorage (sync)
- `isLoading`: True during initial localStorage load

### Server Sync

```js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'
const clientId = localStorage.getItem('showme_client_id')

// Fire-and-forget POST
fetch(`${API_BASE}/api/stories/save`, { method: 'POST', body: JSON.stringify({ clientId, story }) })
  .catch(err => logger.warn('STORY_STORAGE', 'Server sync failed', { error: err.message }))
```

## Dependencies

### Depends On
- **Feature 03:** storyStorage utils + appConfig constants

### Blocks
- **Feature 05:** StoryStudio imports this hook
- **Feature 07:** ProgressTab imports this hook

## Notes

- Server endpoints may not exist yet (Track A) — that's fine, fire-and-forget handles gracefully
- Keep hook lightweight; no polling or refetching from server

---

**Created:** 2026-02-06
