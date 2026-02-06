# Story Studio Redesign Plan

## Problem
Story Studio has too much friction. Kids see a wall-of-text mission + concept checklist, then face a blank microphone with no scaffolding. Loading screen is a bare spinner. Most kids won't just start speaking.

## Solution: Guided Chapters with Tap-to-Choose

Replace the open-ended voice recording flow with a structured 3-chapter story where kids **tap big choice cards** to build their narrative. Voice/typing is secondary ("write your own" option).

### New State Machine (useReducer, like WonderLab)
```
LOADING → INTRO → CHAPTER_1 → CHAPTER_2 → CHAPTER_3 → PROCESSING → PLAYBACK → SHARE
```

---

## Implementation

### Track A: Backend (gemini.js + learn.js)

#### A1. Update `generateStoryPrompt()` in gemini.js
Extend the prompt to also return:
- `missionHook`: Short 2-3 sentence TTS-friendly intro hook
- `sceneImagePrompt`: Prompt for generating an intro scene image
- `conceptCards`: Array of `{ concept, icon, description }` for visual display
- `chapters.1.prompt`: Chapter 1 question text
- `chapters.1.icon`: Chapter 1 emoji
- `chapters.1.choices`: Array of `{ id, emoji, text, conceptHints }` (3 choices)

Update return type and JSON parsing to handle these new fields.

#### A2. Add `generateStoryChapter()` to gemini.js
New function that takes:
- `topicName`, `conceptChecklist`, `previousChapters` (array of `{ chapter, selectedText }`), `currentChapter` (2 or 3), `imageStyle`, `language`

Returns:
- `illustration`: `{ imagePrompt, sceneDescription }` for current chapter selection
- `nextChapter`: `{ prompt, icon, choices: [{ id, emoji, text, conceptHints }] }` (null for ch3)
- `conceptsFound`: concepts detected in previous selection

Internally calls Gemini to generate contextual choices based on previous picks.

#### A3. Update `POST /api/learn/story` route in learn.js
- Return extended response with new fields from A1
- Also generate scene image in parallel (call `generateEducationalImage(sceneImagePrompt)`)
- Also generate TTS for missionHook in parallel (call `generateTTS(missionHook)`)
- Return `sceneImage`, `missionHookAudio`, plus all new fields

#### A4. Add `POST /api/learn/story/chapter` route in learn.js
New endpoint that:
1. Validates request body (topicName, conceptChecklist, previousChapters, currentChapter, imageStyle)
2. Calls `generateStoryChapter()` for text (choices + concepts)
3. Calls `generateEducationalImage()` for illustration (parallel)
4. Returns combined result: `{ illustration: { imageUrl, sceneDescription }, nextChapter, conceptsFound }`

---

### Track B: Frontend - New Components

#### B1. Create `useStoryNarration.js`
Copy `useWonderNarration.js`, change log prefix from `WONDER_TTS` to `STORY_TTS`.

#### B2. Create `storyLoaderFacts.js`
Story-themed fallback facts and stage copy. Pattern from `mysteryLoaderFacts.js`.
- Stage copy: "Crafting story ideas...", "Creating story world...", "Preparing story ingredients..."
- Facts: 3 per level (simple/standard/deep) about storytelling and creativity

#### B3. Create `StoryLoader.jsx`
Copy `MysteryLoader.jsx` pattern. Pink/rose color scheme. Shows:
- Spinner with rotating stage text
- Fun fact card (from engagement API or local fallback)
- TTS narrates the fun fact

#### B4. Create `StoryIntro.jsx`
Copy `MysteryIntro.jsx` pattern. Shows:
- Scene image (16:9, with fade-in loading)
- Story title overlay on gradient
- TTS narrates missionHook (auto-plays)
- ConceptCards component showing story ingredients
- "Begin Your Story" button (disabled during TTS)

#### B5. Create `ConceptCards.jsx`
Visual concept badges (not checkboxes). Shows concept cards with icon + name + description.
Two modes:
- Full mode (for intro): larger cards in a grid
- Compact mode (for chapter screens): small horizontal badges

#### B6. Create `StoryChoiceCard.jsx`
Single story choice card component:
- Large, colorful with gradient border
- Emoji on left, narrative text on right
- Subtle concept hint badges
- Tap animation (scale + glow)
- Selected state: checkmark + highlighted border
- Disabled state for when processing

#### B7. Create `ChapterScreen.jsx`
Core chapter view component showing:
- Chapter header with number + prompt text
- Progress indicator (1/3, 2/3, 3/3)
- 2-3 StoryChoiceCards
- "or" divider
- Collapsed "write your own" text input
- Small mic button option
- Compact ConceptCards showing found concepts
- TTS reads chapter prompt on mount

Props: `chapter`, `chapterData`, `conceptsFound`, `isTtsPlaying`, `onSelectChoice`, `onCustomInput`

---

### Track C: Frontend - Rewire StoryStudio.jsx

#### C1. Rewrite StoryStudio.jsx with useReducer state machine
Replace useState-based flow with useReducer. New state machine:
```
LOADING → INTRO → CHAPTER_1 → ILLUSTRATING_1 → CHAPTER_2 → ILLUSTRATING_2 → CHAPTER_3 → ILLUSTRATING_3 → PLAYBACK → SHARE
```

Actions: `STORY_LOADED`, `IMAGE_LOADED`, `AUDIO_LOADED`, `START_STORY`, `SELECT_CHOICE`, `CHAPTER_READY`, `ILLUSTRATION_READY`, `ALL_CHAPTERS_DONE`, `SHOW_SHARE`, `ERROR`, `RETRY`

State shape:
```js
{
  currentState: STATE.LOADING,
  storySetup: null,        // from API: storyPrompt, missionHook, conceptCards, etc.
  sceneImage: null,        // intro scene image
  missionHookAudio: null,  // TTS audio URL for hook
  chapters: {},            // chapter data: { 1: { prompt, choices }, 2: {...}, 3: {...} }
  selections: [],          // user's chapter selections: [{ chapter, selectedText, choiceId }]
  illustrations: [],       // generated illustrations per chapter
  conceptsFound: new Set(),
  error: null,
}
```

#### C2. Wire up loading phase
On mount:
1. Fetch `/api/learn/story` (extended response)
2. Store storySetup, sceneImage, missionHookAudio in state
3. Fetch engagement endpoint for fun fact (for loader)
4. Show StoryLoader during loading
5. Transition to INTRO when ready

#### C3. Wire up chapter flow
- INTRO → user clicks "Begin" → CHAPTER_1
- User taps choice card → dispatch SELECT_CHOICE → ILLUSTRATING_N
- During ILLUSTRATING_N: call `POST /api/learn/story/chapter` with selections so far
- Response comes back → dispatch CHAPTER_READY (stores illustration + next chapter choices)
- Advance to next CHAPTER or PLAYBACK if done

#### C4. Update StoryPlayback integration
Pass chapter-based scenes (3 illustrations with chapter titles) to StoryPlayback.
Each scene: `{ imageUrl, narrativeText, sceneDescription, chapterTitle }`.

#### C5. Update XP calculation
- Base XP: 20 (completed story)
- Per concept found: 10 XP each
- All concepts bonus: 15 XP
- Same formula as current, but concepts are tracked per-chapter

---

### Track D: Update StoryPlayback.jsx for Chapters

#### D1. Add chapter dividers to StoryPlayback
Update to show chapter title above each scene ("Chapter 1: The Beginning").
Accept optional `chapterTitle` field on scene objects.

---

### Track E: Tests

#### E1. Backend tests for story/chapter endpoint
Test the new `/api/learn/story/chapter` route with mocked gemini.
Test the updated `/api/learn/story` route returns new fields.

#### E2. Frontend component tests
- StoryLoader: renders stage text, fun fact
- StoryIntro: renders image, hook text, concept cards, button
- ChapterScreen: renders choices, handles selection, shows custom input
- StoryChoiceCard: renders emoji + text, handles tap
- ConceptCards: renders in full and compact modes
- StoryStudio: state machine transitions (mock fetch)

---

## File Summary

### New Files (Frontend)
1. `Story/useStoryNarration.js` - TTS hook (copy useWonderNarration)
2. `Story/storyLoaderFacts.js` - Fallback facts + stage copy
3. `Story/StoryLoader.jsx` - Engaging loader component
4. `Story/StoryIntro.jsx` - Visual/audio intro screen
5. `Story/ConceptCards.jsx` - Visual concept badges
6. `Story/ChapterScreen.jsx` - Chapter view with choices
7. `Story/StoryChoiceCard.jsx` - Individual choice card

### Modified Files
8. `Story/StoryStudio.jsx` - Full rewrite with useReducer + chapter flow
9. `Story/StoryPlayback.jsx` - Add chapter dividers
10. `backend/services/gemini.js` - Update generateStoryPrompt, add generateStoryChapter
11. `backend/routes/learn.js` - Update /story response, add /story/chapter endpoint

### Deleted Files
12. `Story/StoryPrompt.jsx` - Replaced by StoryIntro.jsx

### Kept As-Is
- `Story/VoiceStoryRecorder.jsx` - Still used for "speak your own" in ChapterScreen
- `Story/LiveCanvas.jsx` - Can reuse for chapter illustrations
- `Story/ShareStory.jsx` - No changes needed
- `Story/ConceptTracker.jsx` - Keep, but ChapterScreen uses ConceptCards instead

---

## Dependency Graph

```
Track A (Backend):  A1 → A2 → A3 → A4
Track B (Components): B1 | B2 → B3 | B4 | B5 | B6 → B7
Track C (StoryStudio): C1 → C2 → C3 → C4 → C5
Track D (Playback): D1
Track E (Tests): E1 | E2 (after respective tracks)
```

Track A and Track B can run in parallel.
Track C depends on A3, A4, B3, B4, B7.
Track D is independent.
Track E runs after A and C.
