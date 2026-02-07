# Story Studio Bug Fixes Plan

## Issues

1. **TTS not ready before screen transition** - `prefetch()` incorrectly sends pre-generated base64 audio URL as text to TTS endpoint; chapters have no TTS at all
2. **Fun facts not from Gemini** - Engagement API request uses wrong field name (`topicName` instead of `query`); no fun fact fetch during chapter loading screens
3. **Chapter 3 has no choices** - Backend returns `nextChapter: null` for chapter 3; frontend shows empty chapter with no choices

---

## Phase 1: Backend Fixes

### 1A. Fix chapter 3 choices (`backend/src/services/gemini.js` ~3481-3601)

- Change `isLastChapter = currentChapter >= 3` → `currentChapter >= 4`
- When `currentChapter === 3`, add prompt instruction: "nextChapter is for 'The Ending' - create 3 choices about how the story concludes"
- Update Chinese prompt section similarly
- Remove `!isLastChapter` guard at line 3588 when parsing nextChapter - parse whenever `parsed.nextChapter` exists

### 1B. Expand validation + add TTS to chapter endpoint (`backend/src/routes/learn.js` ~950-1057)

- Expand `currentChapter` validation from `2-3` to `2-4` (4 = final illustration only)
- Replace sequential illustration generation with parallel: `Promise.all([generateEducationalImage(...), generateTTS(nextChapter.prompt)])`
- Add `promptAudio` to response JSON

### 1C. Add ch1 prompt TTS to initial story endpoint (`backend/src/routes/learn.js` ~872-899)

- Add `generateTTS(storyData.chapters["1"].prompt)` to the existing `Promise.allSettled` (parallel with scene image + mission hook TTS)
- Return `chapter1PromptAudio` in response

---

## Phase 2: Frontend Hook

### 2A. Add `cacheAudio` method (`frontend/src/components/LearnModes/Story/useStoryNarration.js`)

- New method: `cacheAudio(audioUrl, cacheKey)` - directly stores audio URL in cache without TTS fetch
- Add to return object alongside narrate, play, stop, prefetch

---

## Phase 3: Frontend Integration (`frontend/src/components/LearnModes/Story/StoryStudio.jsx`)

### 3A. Fix engagement API body (line ~278)
- Change `{ topicName, explanationLevel }` → `{ query: topicName, explanationLevel }`

### 3B. Fix initial load TTS caching (lines ~326-333)
- Replace `prefetch(missionHookAudio, "mission-hook")` with `cacheAudio(missionHookAudio, "mission-hook")`
- Add `cacheAudio(storyData.chapter1PromptAudio, "chapter-1-prompt")` for ch1 prompt
- Update `useEffect` dependency to use `cacheAudio` instead of `prefetch`

### 3C. Add `UPDATE_FUN_FACT` reducer action
- New action type + reducer case to update `state.funFact`

### 3D. Add fun fact fetch in ILLUSTRATING useEffect (lines ~396-498)
- Fire-and-forget fetch to `/api/generate/engagement` with `{ query: topicName }`
- Dispatch `UPDATE_FUN_FACT` on success
- Track `source: "api"` on fun fact objects

### 3E. Cache chapter prompt audio in ILLUSTRATING useEffect
- After receiving response: `cacheAudio(data.promptAudio, "chapter-N-prompt")`

### 3F. Add auto-narrate useEffect for CHAPTER states
- When entering CHAPTER_1/2/3, call `narrate(chapterData.prompt, "chapter-N-prompt")`
- Cached audio plays immediately; uncached falls back to TTS API

### 3G. Update StoryLoader `factSource` prop
- Pass `factSource={state.funFact?.source === "api" ? "api" : "local"}` in all StoryLoader renders

---

## Verification

1. **TTS**: Initial load stays on loading screen until TTS is cached; chapter narration plays on entry
2. **Fun facts**: Loading screens show Gemini-generated fun facts (check "Topic fact" label)
3. **Chapter 3**: Three ending choices appear (not just "Write your own...")
4. **ILLUSTRATING_3**: Sends `currentChapter: 4`, gets illustration only, transitions to PLAYBACK
5. Run existing tests: `cd frontend && npx vitest run src/components/LearnModes/Story/`
