# Feature: Add generateStoryChapter() to gemini.js

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01
**Track:** A (Backend)

## Description

Add a new `generateStoryChapter()` function to `backend/src/services/gemini.js` that generates contextual story choices for chapters 2 and 3 based on previous chapter selections, plus an image prompt for illustrating the current selection.

## Acceptance Criteria

- [ ] New exported function `generateStoryChapter()` exists
- [ ] Takes: `topicName`, `conceptChecklist`, `previousChapters`, `currentChapter`, `imageStyle`, `language`
- [ ] Returns: `{ illustration, nextChapter, conceptsFound, error }`
- [ ] `illustration` contains `{ imagePrompt, sceneDescription }` for current chapter
- [ ] `nextChapter` contains `{ prompt, icon, choices }` for next chapter (null for ch3)
- [ ] `conceptsFound` is an array of concepts detected in the selected text
- [ ] Choices are contextual to previous selections (coherent story)
- [ ] Works for both English and Chinese languages
- [ ] Error handling matches existing patterns (RATE_LIMITED, PARSE_ERROR, etc.)

## Implementation Details

### Files to Modify

- `backend/src/services/gemini.js` - Add new function after `generateStoryPrompt()`
- Update the default export object to include `generateStoryChapter`

### Function Signature

```javascript
export async function generateStoryChapter({
  topicName,
  conceptChecklist = [],
  previousChapters = [],  // [{ chapter: 1, selectedText: "..." }]
  currentChapter,         // 2 or 3
  imageStyle,
  language = 'en'
})
```

### Key Implementation

1. **Build context** from `previousChapters` selections
2. **Prompt Gemini** to generate:
   - An image prompt for illustrating the previous chapter's selection
   - A scene description for the illustration
   - Next chapter choices (if currentChapter < 3)
   - Detected concepts from the selection
3. **Chapter naming:**
   - Chapter 2: "The Adventure" (conflict/action)
   - Chapter 3: "The Ending" (resolution)
4. **Use TEXT_MODEL** (same as generateStoryPrompt)
5. **Temperature 0.9** for creative choices
6. **maxOutputTokens ~1200** for response with choices

### Return Shape

```javascript
{
  illustration: {
    imagePrompt: "Detailed prompt for image generation",
    sceneDescription: "Brief scene description"
  },
  nextChapter: {          // null when currentChapter is 3
    prompt: "What happens next?",
    icon: "⚡",
    choices: [
      { id: "2a", emoji: "🏔", text: "...", conceptHints: ["concept"] },
      { id: "2b", emoji: "🌊", text: "...", conceptHints: ["concept"] },
      { id: "2c", emoji: "🔥", text: "...", conceptHints: ["concept"] }
    ]
  },
  conceptsFound: ["input layers"],
  error: null
}
```

## Testing Requirements

- [ ] Unit test: generates chapter 2 choices based on chapter 1 selection
- [ ] Unit test: generates chapter 3 with no nextChapter
- [ ] Unit test: detects concepts from selections
- [ ] Unit test: handles API errors gracefully
- [ ] Unit test: Chinese language support

## Implementation Checklist

- [ ] Create `generateStoryChapter()` function
- [ ] Build English prompt with previous chapter context
- [ ] Build Chinese prompt variant
- [ ] Parse and validate JSON response
- [ ] Add to default export object
- [ ] Add to import in learn.js (will be done in feature 04)

---
**Created:** 2026-02-06
