# Feature: Rewrite StoryStudio with useReducer State Machine

**ID:** 09
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 03, 04, 06, 08
**Track:** C (StoryStudio Rewrite)

## Description

Complete rewrite of `StoryStudio.jsx` from useState-based flow to useReducer state machine. Replaces the old LOADING→READY→RECORDING→PLAYBACK flow with LOADING→INTRO→CHAPTER_1→...→CHAPTER_3→PLAYBACK→SHARE. Integrates all new components (StoryLoader, StoryIntro, ChapterScreen) and the chapter API endpoint.

## Acceptance Criteria

- [ ] Uses `useReducer` state machine (like WonderLab pattern)
- [ ] State flow: `LOADING → INTRO → CHAPTER_1 → ILLUSTRATING_1 → CHAPTER_2 → ILLUSTRATING_2 → CHAPTER_3 → ILLUSTRATING_3 → PLAYBACK → SHARE`
- [ ] Loading phase: fetches /api/learn/story, shows StoryLoader with fun fact + TTS
- [ ] Intro phase: shows StoryIntro with scene image, TTS hook, concept cards
- [ ] Chapter phases: shows ChapterScreen with contextual choices
- [ ] Illustrating phases: shows brief loading animation, calls /api/learn/story/chapter
- [ ] Playback: passes 3 chapter illustrations + text to StoryPlayback
- [ ] Share: passes to existing ShareStory component
- [ ] TTS narration via useStoryNarration hook
- [ ] XP calculation based on concepts found across chapters
- [ ] Error state with retry
- [ ] StoryPrompt.jsx is no longer imported (replaced by StoryIntro)
- [ ] VoiceStoryRecorder.jsx is no longer imported at top level (used within ChapterScreen if needed)

## Implementation Details

### Files to Modify

- `frontend/src/components/LearnModes/Story/StoryStudio.jsx` - Full rewrite

### State Machine

```javascript
const STATE = {
  LOADING: 'LOADING',
  INTRO: 'INTRO',
  CHAPTER_1: 'CHAPTER_1',
  ILLUSTRATING_1: 'ILLUSTRATING_1',
  CHAPTER_2: 'CHAPTER_2',
  ILLUSTRATING_2: 'ILLUSTRATING_2',
  CHAPTER_3: 'CHAPTER_3',
  ILLUSTRATING_3: 'ILLUSTRATING_3',
  PLAYBACK: 'PLAYBACK',
  SHARE: 'SHARE',
  ERROR: 'ERROR',
}

const ACTION = {
  STORY_LOADED: 'STORY_LOADED',
  START_STORY: 'START_STORY',
  SELECT_CHOICE: 'SELECT_CHOICE',
  CHAPTER_READY: 'CHAPTER_READY',
  ALL_CHAPTERS_DONE: 'ALL_CHAPTERS_DONE',
  SHOW_SHARE: 'SHOW_SHARE',
  ERROR: 'ERROR',
  RETRY: 'RETRY',
}
```

### State Shape

```javascript
{
  currentState: STATE.LOADING,
  storySetup: null,
  sceneImage: null,
  missionHookAudio: null,
  chapters: {},
  selections: [],
  illustrations: [],
  conceptsFound: new Set(),
  funFact: null,
  error: null,
}
```

### Key Flow

1. **LOADING**: Fetch `/api/learn/story` + engagement endpoint. Show StoryLoader.
2. **INTRO**: Show StoryIntro with scene image + TTS hook. User clicks "Begin".
3. **CHAPTER_1**: Show ChapterScreen with ch1 choices. User taps choice.
4. **ILLUSTRATING_1**: Brief animation. Call `/api/learn/story/chapter` with ch1 selection.
5. **CHAPTER_2**: Show ChapterScreen with ch2 choices (from API). User taps choice.
6. **ILLUSTRATING_2**: Call `/api/learn/story/chapter` with ch1+ch2 selections.
7. **CHAPTER_3**: Show ChapterScreen with ch3 choices (from API). User taps choice.
8. **ILLUSTRATING_3**: Call `/api/learn/story/chapter` with ch3 selection. No nextChapter.
9. **PLAYBACK**: Build scenes from illustrations + selections, show StoryPlayback.
10. **SHARE**: Show ShareStory.

### Imports

```javascript
import { useReducer, useEffect, useRef, useCallback } from 'react'
import useStoryNarration from './useStoryNarration'
import StoryLoader from './StoryLoader'
import StoryIntro from './StoryIntro'
import ChapterScreen from './ChapterScreen'
import StoryPlayback from './StoryPlayback'
import ShareStory from './ShareStory'
// Remove: StoryPrompt, VoiceStoryRecorder
```

### XP Calculation

```javascript
const baseXP = 20
const perConceptXP = 10
const allConceptsBonus = 15
let totalXP = baseXP + (conceptsFound.size * perConceptXP)
if (conceptsFound.size === conceptChecklist.length) totalXP += allConceptsBonus
```

## Testing Requirements

- [ ] State machine transitions correctly through all states
- [ ] Loading phase fetches API and shows loader
- [ ] Intro phase shows scene image and TTS
- [ ] Chapter phases show correct choices
- [ ] Illustrating phases call chapter API
- [ ] Playback receives correct scene data
- [ ] XP calculation works
- [ ] Error state shows retry

## Implementation Checklist

- [ ] Define state machine (STATE, ACTION, reducer)
- [ ] Implement loading phase with API fetch
- [ ] Implement intro phase with TTS
- [ ] Implement chapter flow with API calls
- [ ] Implement illustrating sub-states
- [ ] Build scene data for playback
- [ ] Wire up XP calculation and completion
- [ ] Wire up error handling and retry
- [ ] Remove StoryPrompt import
- [ ] Remove VoiceStoryRecorder top-level import
- [ ] Verify all state transitions

---
**Created:** 2026-02-06
