# Feature: Add POST /api/learn/story/chapter Route

**ID:** 04
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 02
**Track:** A (Backend)

## Description

Add a new `POST /api/learn/story/chapter` endpoint to `backend/src/routes/learn.js` that generates the next chapter's choices and an illustration for the current chapter selection.

## Acceptance Criteria

- [ ] New route `POST /api/learn/story/chapter` exists
- [ ] Validates: topicName (string), conceptChecklist (array), previousChapters (array), currentChapter (2 or 3), imageStyle (string)
- [ ] Calls `generateStoryChapter()` for text generation
- [ ] Calls `generateEducationalImage()` for illustration (parallel)
- [ ] Returns: `{ illustration: { imageUrl, sceneDescription }, nextChapter, conceptsFound }`
- [ ] Rate limited via existing `learnRateLimit` middleware
- [ ] Error handling matches existing route patterns
- [ ] Language detection from topicName

## Implementation Details

### Files to Modify

- `backend/src/routes/learn.js` - Add new route after existing `/story/scene` route
- Update import to include `generateStoryChapter` from gemini.js

### Route Implementation

```javascript
router.post('/story/chapter', learnRateLimit, async (req, res) => {
  const startTime = Date.now()
  try {
    const { topicName, conceptChecklist, previousChapters, currentChapter, imageStyle } = req.body

    // Validate inputs
    if (!topicName || typeof topicName !== 'string') { ... }
    if (!Array.isArray(previousChapters) || previousChapters.length === 0) { ... }
    if (![2, 3].includes(currentChapter)) { ... }

    const language = detectLanguage(topicName)

    // Generate chapter text + illustration in parallel
    const [chapterResult, imageResult] = await Promise.allSettled([
      generateStoryChapter({ topicName, conceptChecklist, previousChapters, currentChapter, imageStyle, language }),
      generateEducationalImage(/* illustration prompt from chapter result - need sequential for this */)
    ])

    // Actually need sequential: get chapter first (for imagePrompt), then image
    const chapterData = await generateStoryChapter({ ... })
    if (chapterData.error) { /* handle */ }

    const imageData = await generateEducationalImage(chapterData.illustration.imagePrompt, { style: imageStyle })

    return res.json({
      illustration: {
        imageUrl: imageData?.imageUrl || null,
        sceneDescription: chapterData.illustration.sceneDescription
      },
      nextChapter: chapterData.nextChapter,
      conceptsFound: chapterData.conceptsFound
    })
  } catch (error) { ... }
})
```

### Technical Decisions

- Sequential flow: need chapter text first to get imagePrompt, then generate image
- Could optimize by having generateStoryChapter return imagePrompt early, but simpler to keep sequential
- Use existing `learnRateLimit` middleware
- Image generation failure is non-fatal (return null imageUrl)

## Testing Requirements

- [ ] Integration test: route validates input correctly
- [ ] Integration test: returns chapter choices for chapter 2
- [ ] Integration test: returns no nextChapter for chapter 3
- [ ] Integration test: image generation failure returns null imageUrl
- [ ] Integration test: handles API errors gracefully

## Implementation Checklist

- [ ] Add import for `generateStoryChapter` from gemini.js
- [ ] Add new route handler
- [ ] Input validation
- [ ] Call generateStoryChapter
- [ ] Call generateEducationalImage with illustration prompt
- [ ] Return combined response
- [ ] Error handling and logging
- [ ] Update JSDoc comments

---
**Created:** 2026-02-06
