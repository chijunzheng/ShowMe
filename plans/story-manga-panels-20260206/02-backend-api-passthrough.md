# Feature: Backend API Passthrough for panelCaptions

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** 01

## Description

Update the `/api/learn/story/chapter` route to pass `panelCaptions` from `generateStoryChapter()` through to the API response, and pass `comicPanel: true` to `generateEducationalImage()`.

## Acceptance Criteria

- [ ] API response includes `illustration.panelCaptions` array when present
- [ ] `generateEducationalImage()` is called with `comicPanel: true` for story illustrations
- [ ] Response still works when panelCaptions is absent (backward compat)

## Implementation Details

### Files to Modify

- `backend/src/routes/learn.js` — POST `/story/chapter` handler (~line 879-987)

### Key Changes

1. **Pass comicPanel to image generation** (~line 945):
```js
const imageResult = await generateEducationalImage(chapterResult.illustration.imagePrompt, {
  topic: topicName,
  explanationLevel: 'simple',
  language: detectedLanguage,
  comicPanel: true  // NEW
})
```

2. **Pass panelCaptions in response** (~line 966-973):
```js
return res.json({
  illustration: {
    imageUrl,
    sceneDescription: chapterResult.illustration?.sceneDescription || '',
    panelCaptions: chapterResult.illustration?.panelCaptions || []  // NEW
  },
  nextChapter: chapterResult.nextChapter,
  conceptsFound: chapterResult.conceptsFound,
})
```

## Testing Requirements

- [ ] API returns panelCaptions when generateStoryChapter provides them
- [ ] API returns empty array when panelCaptions absent

## Implementation Checklist

- [ ] Add comicPanel: true to generateEducationalImage call
- [ ] Add panelCaptions to response JSON
- [ ] Code review

---

**Created:** 2026-02-06
