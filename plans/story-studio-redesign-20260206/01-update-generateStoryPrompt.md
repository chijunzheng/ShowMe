# Feature: Update generateStoryPrompt() in gemini.js

**ID:** 01
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None
**Track:** A (Backend)

## Description

Extend the existing `generateStoryPrompt()` function in `backend/src/services/gemini.js` to return additional fields needed for the redesigned Story Studio: a mission hook for TTS, a scene image prompt, visual concept cards, and Chapter 1 choices.

## Acceptance Criteria

- [ ] `generateStoryPrompt()` returns `missionHook` (string, 2-3 sentences, TTS-friendly)
- [ ] Returns `sceneImagePrompt` (string, prompt for generating intro scene image)
- [ ] Returns `conceptCards` array of `{ concept, icon, description }`
- [ ] Returns `chapters` object with `chapters[1].prompt`, `chapters[1].icon`, `chapters[1].choices`
- [ ] Each choice has `{ id, emoji, text, conceptHints }` (3 choices per chapter)
- [ ] Backward compatible - still returns `storyPrompt`, `conceptChecklist`, `starterSuggestion`, `imageStyle`
- [ ] Works for both English and Chinese languages
- [ ] JSON parsing handles new fields with sensible defaults

## Implementation Details

### Files to Modify

- `backend/src/services/gemini.js` - Update `generateStoryPrompt()` function (line ~3273)

### Key Changes

1. **Update the Gemini prompt** to request additional JSON fields:
   ```json
   {
     "storyPrompt": "...",
     "conceptChecklist": ["..."],
     "starterSuggestion": "...",
     "imageStyle": "...",
     "missionHook": "Short 2-3 sentence exciting hook for TTS narration",
     "sceneImagePrompt": "Detailed prompt for generating a scene image",
     "conceptCards": [
       { "concept": "gravity", "icon": "🌍", "description": "Things fall down" }
     ],
     "chapters": {
       "1": {
         "prompt": "Where does our story begin?",
         "icon": "🌅",
         "choices": [
           { "id": "1a", "emoji": "🚀", "text": "Sparky zoomed...", "conceptHints": ["input layers"] },
           { "id": "1b", "emoji": "🌑", "text": "The maze was dark...", "conceptHints": ["weights"] },
           { "id": "1c", "emoji": "⚡", "text": "BZZZT!...", "conceptHints": ["activation function"] }
         ]
       }
     }
   }
   ```

2. **Update JSON parsing** to extract and validate new fields with defaults
3. **Update return type** to include new fields
4. **Increase maxOutputTokens** from 900 to ~1500 to accommodate larger response
5. **Both EN and ZH prompts** must be updated

### Technical Decisions

- Keep existing fields for backward compatibility
- Default `missionHook` to `storyPrompt` if missing from response
- Default `conceptCards` to map from `conceptChecklist` if missing
- Default chapter choices to empty array if parsing fails

## Testing Requirements

- [ ] Unit test: returns new fields when Gemini responds correctly
- [ ] Unit test: backward compatible (old fields still present)
- [ ] Unit test: graceful degradation when new fields missing from response
- [ ] Unit test: Chinese language variant returns correct fields

## Implementation Checklist

- [ ] Update English prompt in `generateStoryPrompt()`
- [ ] Update Chinese prompt in `generateStoryPrompt()`
- [ ] Update JSON parsing for new fields
- [ ] Update return type with new fields
- [ ] Increase maxOutputTokens
- [ ] Add default/fallback values for new fields
- [ ] Verify existing error handling still works

---
**Created:** 2026-02-06
