# Feature: Create StoryLoader + StoryIntro

**ID:** 06
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 05
**Track:** B (Frontend Components)

## Description

Create the engaging loader screen (replacing bare spinner) and the visual/audio intro screen (replacing text-heavy StoryPrompt) for Story Studio.

## Acceptance Criteria

### StoryLoader
- [ ] Shows spinner with rotating stage text from storyLoaderFacts
- [ ] Shows fun fact card with emoji
- [ ] Pink/rose color scheme matching Story Studio theme
- [ ] `stageText` prop displayed with aria-live
- [ ] `funFact` prop displayed with emoji
- [ ] `factSource` prop shows "Topic fact" or "Story fact" label
- [ ] Cancel button calls onCancel

### StoryIntro
- [ ] Shows scene image in 16:9 container with fade-in loading
- [ ] Placeholder emoji while image loads
- [ ] Story title overlaid on gradient
- [ ] TTS narration text area for mission hook
- [ ] ConceptCards displayed as story ingredients
- [ ] "Begin Your Story" button disabled during TTS
- [ ] Button text changes to "Narrating..." when TTS playing
- [ ] Calls onNext when button clicked

## Implementation Details

### Files to Create

1. `frontend/src/components/LearnModes/Story/StoryLoader.jsx`
   - Pattern from `MysteryLoader.jsx`
   - Pink/rose gradient: `from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-950`
   - Props: `stageText`, `funFact`, `factSource`, `onCancel`

2. `frontend/src/components/LearnModes/Story/StoryIntro.jsx`
   - Pattern from `MysteryIntro.jsx`
   - Props: `storyTitle`, `missionHook`, `sceneImage`, `conceptCards`, `isTtsPlaying`, `onNext`
   - Scene image: 16:9 aspect-video container with placeholder
   - Mission hook text in a card
   - ConceptCards below the hook text
   - Pink/rose themed button

### StoryLoader Design
- Spinner: `border-pink-200 dark:border-pink-700 border-t-pink-600 dark:border-t-pink-300`
- Header: "Creating your story..."
- Stage text rotates from storyLoaderFacts
- Fun fact card: pink/rose border scheme

### StoryIntro Design
- Image placeholder: 📖 emoji (pulsing)
- Gradient overlay on image for title readability
- Mission hook in a card with 📋 icon (like MysteryIntro)
- ConceptCards section with "Story Ingredients" header
- Button: `from-pink-500 to-rose-600` gradient

## Testing Requirements

- [ ] StoryLoader: renders stage text
- [ ] StoryLoader: renders fun fact when provided
- [ ] StoryLoader: renders cancel button
- [ ] StoryIntro: renders scene image with fade-in
- [ ] StoryIntro: renders story title
- [ ] StoryIntro: renders mission hook text
- [ ] StoryIntro: renders concept cards
- [ ] StoryIntro: button disabled during TTS
- [ ] StoryIntro: calls onNext when button clicked

## Implementation Checklist

- [ ] Create StoryLoader.jsx
- [ ] Create StoryIntro.jsx
- [ ] Add PropTypes for both components
- [ ] Verify dark mode works

---
**Created:** 2026-02-06
