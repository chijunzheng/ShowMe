# Feature: Fix TTS Caching + Auto-Narrate Chapters

**ID:** 05
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 02, 03

## Description

TTS isn't ready before screen transitions because `prefetch()` sends base64 URLs as text to TTS. Use `cacheAudio` instead for pre-generated URLs. Add auto-narration when entering chapter states.

## Acceptance Criteria

- [ ] Initial load uses `cacheAudio` (not `prefetch`) for missionHookAudio
- [ ] Ch1 prompt audio cached on initial load via `cacheAudio`
- [ ] Chapter prompt audio cached in ILLUSTRATING useEffect after API response
- [ ] Auto-narrate triggers when entering CHAPTER_1/2/3 states
- [ ] Cached audio plays immediately; uncached falls back to TTS API

## Implementation Details

### Files to Modify

- `frontend/src/components/LearnModes/Story/StoryStudio.jsx`

### 3B. Fix initial load TTS caching (lines ~326-333)
- Replace `prefetch(missionHookAudio, "mission-hook")` → `cacheAudio(missionHookAudio, "mission-hook")`
- Add `cacheAudio(storyData.chapter1PromptAudio, "chapter-1-prompt")`
- Update useEffect dependency array to use `cacheAudio` instead of `prefetch`

### 3E. Cache chapter prompt audio in ILLUSTRATING useEffect
- After receiving chapter response: `cacheAudio(data.promptAudio, \`chapter-${N}-prompt\`)`

### 3F. Add auto-narrate useEffect for CHAPTER states
- New useEffect watching state phase
- When phase is CHAPTER_1/2/3: `narrate(chapterData.prompt, \`chapter-${N}-prompt\`)`
- Cached audio plays immediately from cache; uncached triggers TTS API fallback

## Testing Requirements

- [ ] Mission hook audio cached without TTS fetch
- [ ] Chapter 1 prompt audio cached on initial load
- [ ] Chapter prompt audio cached after ILLUSTRATING response
- [ ] Narration auto-plays on chapter entry

---

**Created:** 2026-02-06
