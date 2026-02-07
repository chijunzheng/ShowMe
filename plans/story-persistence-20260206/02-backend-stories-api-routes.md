# Feature: Backend Stories API Routes

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** 01
**Track:** A

## Description

Create `backend/src/routes/stories.js` with REST endpoints for story CRUD. Register routes in `backend/src/index.js`.

## Acceptance Criteria

- [ ] `GET /api/stories?clientId=` returns list of user stories
- [ ] `POST /api/stories/save` saves a completed story
- [ ] `DELETE /api/stories/:storyId?clientId=` deletes a story
- [ ] Routes registered in `backend/src/index.js`
- [ ] Input validation: clientId required, storyData validated
- [ ] Proper error responses (400, 500)

## Implementation Details

### Files to Create/Modify

- `backend/src/routes/stories.js` - NEW
- `backend/src/index.js` - MODIFY (add import + app.use)

### Endpoints

1. **GET /api/stories**
   - Query: `clientId` (required)
   - Response: `{ stories: [...] }`

2. **POST /api/stories/save**
   - Body: `{ clientId, story: { id, topicName, scenes, ... } }`
   - Response: `{ story: {...}, error: null }`

3. **DELETE /api/stories/:storyId**
   - Query: `clientId` (required)
   - Response: `{ success: true }`

### index.js Changes (2 lines)

Line ~155: `import storiesRoutes from './routes/stories.js'`
Line ~171: `app.use('/api/stories', storiesRoutes)`

## Dependencies

### Depends On
- **Feature 01:** storyStorage service functions

### Blocks
- None (frontend uses these endpoints via useStoryStorage hook)

## Notes

- Follow same pattern as other route files (e.g., `learn.js`, `quiz.js`)
- CORS methods already include DELETE via `['GET', 'POST', 'OPTIONS']` — need to add DELETE to CORS config or use POST for delete

---

**Created:** 2026-02-06
