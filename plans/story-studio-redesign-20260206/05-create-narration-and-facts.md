# Feature: Create useStoryNarration + storyLoaderFacts

**ID:** 05
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** None
**Track:** B (Frontend Components)

## Description

Create the TTS narration hook and loader fallback facts for Story Studio. These are foundational utilities needed by StoryLoader and StoryIntro.

## Acceptance Criteria

- [ ] `useStoryNarration.js` hook works identically to `useWonderNarration.js` with STORY_TTS prefix
- [ ] `storyLoaderFacts.js` exports `getStoryLoaderFacts(level)` and `getStoryLoaderStages(level)`
- [ ] Facts are story/creativity themed (3 per level: simple, standard, deep)
- [ ] Stage copy is story-themed ("Crafting story ideas...", etc.)

## Implementation Details

### Files to Create

1. `frontend/src/components/LearnModes/Story/useStoryNarration.js`
   - Copy `useWonderNarration.js` exactly
   - Replace all `WONDER_TTS` with `STORY_TTS` in logger calls
   - Keep all functionality: narrate, play, stop, prefetch, isPlaying, isLoading, error

2. `frontend/src/components/LearnModes/Story/storyLoaderFacts.js`
   - Follow `mysteryLoaderFacts.js` pattern exactly
   - Story-themed facts and stage copy

### storyLoaderFacts.js Content

```javascript
const FALLBACK_FACTS = {
  simple: [
    { emoji: '📖', text: 'Stories help your brain make connections between ideas you already know.' },
    { emoji: '🎭', text: 'When you create characters, your brain practices understanding other people.' },
    { emoji: '✨', text: 'Making up stories uses the same brain power as solving puzzles.' },
  ],
  standard: [
    { emoji: '🧠', text: 'Creative storytelling strengthens neural pathways for both imagination and memory.' },
    { emoji: '🎬', text: 'The best stories combine things you know with things you imagine.' },
    { emoji: '📝', text: 'Putting knowledge into a story makes it 22x more memorable than facts alone.' },
  ],
  deep: [
    { emoji: '🔬', text: 'Narrative cognition activates multiple brain regions simultaneously, deepening understanding.' },
    { emoji: '🌐', text: 'Story structures mirror how the brain naturally organizes cause-and-effect knowledge.' },
    { emoji: '💡', text: 'Creating explanatory narratives is how scientists communicate complex discoveries.' },
  ],
}

const STAGE_COPY = {
  simple: [
    'Crafting story ideas...',
    'Creating your story world...',
  ],
  standard: [
    'Crafting story ideas...',
    'Creating your story world...',
    'Preparing story ingredients...',
    'Setting the scene...',
  ],
  deep: [
    'Weaving narrative threads...',
    'Building story architecture...',
    'Preparing creative elements...',
    'Designing story choices...',
  ],
}
```

## Testing Requirements

- [ ] useStoryNarration: returns expected API (narrate, play, stop, prefetch, isPlaying, isLoading, error)
- [ ] storyLoaderFacts: getStoryLoaderFacts returns array for each level
- [ ] storyLoaderFacts: getStoryLoaderStages returns array for each level
- [ ] storyLoaderFacts: normalizes invalid level to 'standard'

## Implementation Checklist

- [ ] Copy useWonderNarration.js → useStoryNarration.js with STORY_TTS prefix
- [ ] Create storyLoaderFacts.js with facts and stage copy
- [ ] Export getStoryLoaderFacts and getStoryLoaderStages functions

---
**Created:** 2026-02-06
