# Feature: Update POST /api/learn/story Route

**ID:** 03
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01
**Track:** A (Backend)

## Description

Update the existing `POST /api/learn/story` route in `backend/src/routes/learn.js` to return the extended response from the updated `generateStoryPrompt()`, and also generate a scene image and TTS audio for the mission hook in parallel.

## Acceptance Criteria

- [ ] Route returns all new fields: `missionHook`, `sceneImagePrompt`, `conceptCards`, `chapters`
- [ ] Route generates scene image via `generateEducationalImage(sceneImagePrompt)` in parallel
- [ ] Route generates TTS for missionHook via `generateTTS(missionHook)` in parallel
- [ ] Response includes `sceneImage` (base64 data URL or null)
- [ ] Response includes `missionHookAudio` (base64 audio URL or null)
- [ ] Parallel generation doesn't block - failures in image/TTS don't fail the whole request
- [ ] Fallback response includes sensible defaults for new fields
- [ ] Backward compatible - existing fields still returned

## Implementation Details

### Files to Modify

- `backend/src/routes/learn.js` - Update the `router.post('/story', ...)` handler (~line 793)

### Key Changes

1. **After getting result from `generateStoryPrompt()`**, fire parallel requests:
   ```javascript
   const [imageResult, ttsResult] = await Promise.allSettled([
     generateEducationalImage(result.sceneImagePrompt, { style: result.imageStyle }),
     generateTTS(result.missionHook)
   ])
   ```

2. **Extract results safely:**
   ```javascript
   const sceneImage = imageResult.status === 'fulfilled' ? imageResult.value?.imageUrl : null
   const missionHookAudio = ttsResult.status === 'fulfilled' ? ttsResult.value?.audioUrl : null
   ```

3. **Return extended response:**
   ```javascript
   return res.json({
     storyPrompt: result.storyPrompt,
     conceptChecklist: result.conceptChecklist,
     starterSuggestion: result.starterSuggestion,
     imageStyle: result.imageStyle,
     missionHook: result.missionHook,
     conceptCards: result.conceptCards,
     chapters: result.chapters,
     sceneImage,
     missionHookAudio,
   })
   ```

4. **Update fallback response** to include defaults for new fields

### Technical Decisions

- Use `Promise.allSettled` not `Promise.all` so image/TTS failures are non-fatal
- Scene image and TTS are "nice to have" - the flow works without them
- Keep the existing timeout and error handling

## Testing Requirements

- [ ] Integration test: route returns new fields
- [ ] Integration test: parallel image/TTS generation works
- [ ] Integration test: graceful degradation when image/TTS fails
- [ ] Integration test: fallback response has correct defaults

## Implementation Checklist

- [ ] Update successful response path to include new fields
- [ ] Add parallel image + TTS generation
- [ ] Update fallback response with new field defaults
- [ ] Verify error handling still works
- [ ] Update JSDoc comment for route

---
**Created:** 2026-02-06
