# Feature: Add TTS to Chapter + Initial Story Endpoints

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Chapter endpoints return no TTS audio. The initial story endpoint doesn't generate TTS for ch1 prompt. Fix both endpoints to generate and return prompt audio.

## Acceptance Criteria

- [ ] `POST /api/learn/story/chapter` returns `promptAudio` field (TTS of nextChapter.prompt)
- [ ] `POST /api/learn/story` returns `chapter1PromptAudio` field (TTS of ch1 prompt)
- [ ] Chapter validation expanded to accept currentChapter 2-4
- [ ] Image + TTS generated in parallel (not sequential)

## Implementation Details

### Files to Modify

- `backend/src/routes/learn.js` (~lines 872-1057)

### 1B. Chapter endpoint (~lines 950-1057)

1. **Line 971:** Expand validation: `currentChapter < 2 || currentChapter > 3` → `currentChapter > 4`

2. **Lines 1013-1025:** Replace sequential image generation with parallel image+TTS:
   ```js
   const [imageResult, promptAudioResult] = await Promise.allSettled([
     // Image generation (existing)
     chapterResult.illustration?.imagePrompt
       ? generateEducationalImage(chapterResult.illustration.imagePrompt, {...})
       : Promise.resolve(null),
     // TTS for next chapter prompt
     chapterResult.nextChapter?.prompt
       ? generateTTS(chapterResult.nextChapter.prompt)
       : Promise.resolve(null)
   ])
   ```

3. **Lines 1036-1043:** Add `promptAudio` to response JSON

### 1C. Initial story endpoint (~lines 872-899)

1. **Line 872:** Add third entry to `Promise.allSettled`:
   ```js
   generateTTS(storyData.chapters["1"].prompt)
   ```

2. **Line 902-903:** Extract `chapter1PromptAudio` from results

3. **Line 913:** Add `chapter1PromptAudio` to response

## Testing Requirements

- [ ] Initial story response includes `chapter1PromptAudio`
- [ ] Chapter response includes `promptAudio` when nextChapter exists
- [ ] Chapter 4 (final) has no `promptAudio` (no nextChapter)
- [ ] currentChapter: 4 accepted by validation

---

**Created:** 2026-02-06
