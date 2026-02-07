# Plan: Story Persistence (localStorage + Firestore)

## Goal
Save completed Story Studio stories so users can re-read them from the Progress tab. Full content (text + image URLs) persisted in both localStorage and Firestore.

## Architecture

### Data Shape (per saved story)
```js
{
  id: string,              // crypto.randomUUID()
  topicName: string,
  createdAt: number,       // Date.now()
  scenes: [                // 3 scenes
    { imageUrl, sceneDescription, narrativeText, chapterTitle }
  ],
  conceptsFound: string[],
  totalConcepts: number,
  xpEarned: number,
  storySetup: { storyPrompt, conceptChecklist, imageStyle },
  version: 1
}
```

### Storage Strategy
- **localStorage**: `showme_stories` (metadata list) + `showme_story_content_{id}` (full content per story). Max 10 cached.
- **Firestore**: `stories` subcollection under clientId. No limit.
- **Dev fallback**: `.data/stories.json` file (same pattern as `userProgress.js`)

## Implementation (3 parallel tracks)

### Track A: Backend (2 files)

**A1. `backend/src/services/storyStorage.js`** (NEW)
- Follow `userProgress.js` pattern exactly (Firestore + local JSON fallback)
- Functions: `getStories(clientId)`, `saveStory(clientId, storyData)`, `deleteStory(clientId, storyId)`

**A2. `backend/src/routes/stories.js`** (NEW)
- `GET /api/stories?clientId=` - List user stories
- `POST /api/stories/save` - Save completed story
- `DELETE /api/stories/:storyId?clientId=` - Delete story

**A3. `backend/src/index.js`** (MODIFY)
- Add `import storiesRoutes` + `app.use('/api/stories', storiesRoutes)` at lines ~155, ~171

### Track B: Frontend Storage (2 files)

**B1. `frontend/src/constants/appConfig.js`** (MODIFY)
- Add to `STORAGE_KEYS`: `STORIES: 'showme_stories'`, `STORY_CONTENT_PREFIX: 'showme_story_content_'`
- Add to `STORAGE_LIMITS`: `MAX_CACHED_STORIES: 10`
- Add to `STORAGE_VERSIONS`: `STORIES: 1`

**B2. `frontend/src/utils/storyStorage.js`** (NEW)
- Follow `topicStorage.js` pattern
- Functions: `saveStoryToStorage(story)`, `loadStoriesFromStorage()`, `loadStoryContent(id)`, `deleteStoryFromStorage(id)`
- localStorage eviction: keep 10 most recent

**B3. `frontend/src/hooks/useStoryStorage.js`** (NEW)
- Hook wrapping localStorage + server sync
- Returns `{ stories, saveStory, deleteStory, isLoading }`
- Loads from localStorage on mount, syncs to server fire-and-forget

### Track C: UI Integration (4 files)

**C1. `frontend/src/components/LearnModes/Story/StoryStudio.jsx`** (MODIFY)
- Import `useStoryStorage`
- In `handleShowShare`: build story document from `playbackScenes` + state, call `saveStory()` (non-blocking), then dispatch SHOW_SHARE
- Save happens transparently -- no UI changes needed

**C2. `frontend/src/components/ProgressTab/MyStoriesSheet.jsx`** (NEW)
- Bottom sheet showing grid of saved story cards
- Each card: first scene thumbnail, topic name, date, concept count
- Tap to open replay, swipe/button to delete
- Empty state: "Complete Story Studio to save your first story!"

**C3. `frontend/src/components/ProgressTab/StoryReplaySheet.jsx`** (NEW)
- Full-screen sheet reusing `StoryPlayback` component
- Read-only replay of saved story
- Delete button at bottom

**C4. Integration wiring** (MODIFY existing files)
- `StatDetailSheet.jsx`: Add `'stories'` case that renders `MyStoriesSheet`
- `ProgressTab.jsx`: Import `useStoryStorage`, pass `stories.length` to StatsBar, pass stories to StatDetailSheet
- StatsBar already supports dynamic stat cards -- add story count stat

## Dependency Order
```
Track A (backend):  A1 -> A2 -> A3
Track B (storage):  B1 -> B2 -> B3
Track C (UI):       C1 depends on B3
                    C2, C3 are independent
                    C4 depends on B3, C2, C3
```
Tracks A and B can run in parallel. Track C starts after B3.

## Files Summary

| File | Action | Track |
|------|--------|-------|
| `backend/src/services/storyStorage.js` | NEW | A |
| `backend/src/routes/stories.js` | NEW | A |
| `backend/src/index.js` | MODIFY (2 lines) | A |
| `frontend/src/constants/appConfig.js` | MODIFY (3 keys) | B |
| `frontend/src/utils/storyStorage.js` | NEW | B |
| `frontend/src/hooks/useStoryStorage.js` | NEW | B |
| `frontend/src/components/LearnModes/Story/StoryStudio.jsx` | MODIFY (save in handleShowShare) | C |
| `frontend/src/components/ProgressTab/MyStoriesSheet.jsx` | NEW | C |
| `frontend/src/components/ProgressTab/StoryReplaySheet.jsx` | NEW | C |
| `frontend/src/components/Dashboard/StatDetailSheet.jsx` | MODIFY (add stories case) | C |
| `frontend/src/components/ProgressTab/ProgressTab.jsx` | MODIFY (wire hook + pass props) | C |

## Key Patterns to Reuse
- `userProgress.js` (lines 16-58): Firestore + local JSON fallback pattern
- `topicStorage.js` (lines 1-56): localStorage CRUD with versioning
- `useKnowledgeGraph.js`: Hook with localStorage load + debounced save
- `playbackScenes` memo (StoryStudio.jsx:765-772): Exact data shape for scenes

## Verification
1. Complete a story in Story Studio -> story auto-saves at Share screen
2. Navigate to Progress tab -> tap Stories stat -> see saved story in grid
3. Tap story card -> replay opens with correct scenes/images
4. Delete story -> removed from grid and localStorage
5. Refresh page -> stories persist (loaded from localStorage)
6. Check Firestore/`.data/stories.json` -> stories backed up server-side
