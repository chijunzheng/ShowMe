# Feature: Frontend Component Tests

**ID:** 12
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Medium
**Dependencies:** 06, 07, 08, 09
**Track:** E (Tests)

## Description

Write frontend component tests for all new Story Studio components: StoryLoader, StoryIntro, ChapterScreen, StoryChoiceCard, ConceptCards, and the updated StoryStudio state machine.

## Acceptance Criteria

- [ ] StoryLoader tests: renders stage text, fun fact, cancel button
- [ ] StoryIntro tests: renders image, hook, concept cards, button disabled during TTS
- [ ] ChapterScreen tests: renders choices, handles selection, custom input
- [ ] StoryChoiceCard tests: renders emoji + text, handles tap, selected/disabled states
- [ ] ConceptCards tests: full mode, compact mode, highlights found concepts
- [ ] StoryStudio tests: state machine transitions with mocked fetch
- [ ] All tests pass

## Implementation Details

### Files to Create/Modify

- `frontend/src/components/LearnModes/Story/__tests__/StoryLoader.test.jsx`
- `frontend/src/components/LearnModes/Story/__tests__/StoryIntro.test.jsx`
- `frontend/src/components/LearnModes/Story/__tests__/ChapterScreen.test.jsx`
- `frontend/src/components/LearnModes/Story/__tests__/StoryChoiceCard.test.jsx`
- `frontend/src/components/LearnModes/Story/__tests__/ConceptCards.test.jsx`
- `frontend/src/components/LearnModes/Story/__tests__/StoryStudio.test.jsx` (update existing)

### Key Test Patterns

Use existing test patterns from Mystery Lab tests. Mock:
- `fetch` for API calls
- `useStoryNarration` hook for TTS
- `vibrateShort` and `playSelectSound` for haptics/sound

### StoryStudio State Machine Tests

1. Renders StoryLoader during LOADING state
2. Transitions to INTRO after API success
3. Renders StoryIntro during INTRO state
4. Transitions to CHAPTER_1 after clicking Begin
5. Renders ChapterScreen during chapter states
6. Transitions through ILLUSTRATING states on choice selection
7. Transitions to PLAYBACK after all chapters complete
8. Shows error state on API failure
9. Retry reloads from LOADING

## Testing Requirements

- [ ] All new component tests pass
- [ ] Updated StoryStudio tests pass
- [ ] Mocks are properly cleaned up

## Implementation Checklist

- [ ] Create StoryLoader tests
- [ ] Create StoryIntro tests
- [ ] Create ChapterScreen tests
- [ ] Create StoryChoiceCard tests
- [ ] Create ConceptCards tests
- [ ] Update StoryStudio tests for new state machine
- [ ] Verify all tests pass

---
**Created:** 2026-02-06
