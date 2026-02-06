# Feature: Create ChapterScreen

**ID:** 08
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 07
**Track:** B (Frontend Components)

## Description

Create the core ChapterScreen component that displays chapter prompt, story choice cards, and an optional "write your own" input. This is the main interaction point where kids build their story chapter by chapter.

## Acceptance Criteria

- [ ] Shows chapter header with number (1/3, 2/3, 3/3) and prompt text
- [ ] Shows chapter icon emoji
- [ ] Displays 2-3 StoryChoiceCards for the chapter's choices
- [ ] "or" divider separates choice cards from custom input
- [ ] Collapsed "write your own" text input, expands on tap
- [ ] Submit button for custom text input
- [ ] Compact ConceptCards showing found/total concepts
- [ ] Selected choice card visually highlighted
- [ ] Calls `onSelectChoice(choice)` when a card is tapped
- [ ] Calls `onCustomInput(text)` when custom text submitted
- [ ] All cards disabled after selection (prevent double-tap)
- [ ] Previous chapter illustration shown above (if available)

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/Story/ChapterScreen.jsx`

### Props

```javascript
{
  chapter: number,              // 1, 2, or 3
  chapterData: {                // Chapter content
    prompt: string,             // "Where does our story begin?"
    icon: string,               // emoji
    choices: Array<{            // 2-3 choices
      id: string,
      emoji: string,
      text: string,
      conceptHints: string[]
    }>
  },
  conceptsFound: Set,           // concepts found so far
  conceptCards: Array,           // all concept cards for compact display
  isTtsPlaying: boolean,        // TTS state
  previousIllustration: string, // previous chapter image URL (optional)
  onSelectChoice: Function,     // (choice) => void
  onCustomInput: Function,      // (text) => void
}
```

### Layout

```
┌─────────────────────────────────────┐
│  [Previous chapter illustration]     │  ← optional, shown for ch2, ch3
├─────────────────────────────────────┤
│  Chapter 1 of 3: The Beginning       │  ← header + progress
│  📖 "Where does our story begin?"    │  ← icon + prompt
├─────────────────────────────────────┤
│  [StoryChoiceCard 1]                 │
│  [StoryChoiceCard 2]                 │
│  [StoryChoiceCard 3]                 │
│                                      │
│  ┈┈┈┈┈┈┈ or ┈┈┈┈┈┈┈┈               │
│  ✏️ Write your own...                │  ← collapsed, expands on tap
│                                      │
│  [Compact ConceptCards]              │
└─────────────────────────────────────┘
```

### State Management (local)

```javascript
const [selectedChoiceId, setSelectedChoiceId] = useState(null)
const [showCustomInput, setShowCustomInput] = useState(false)
const [customText, setCustomText] = useState('')
```

### Chapter Labels
- Chapter 1: "The Beginning"
- Chapter 2: "The Adventure"
- Chapter 3: "The Ending"

### Technical Decisions

- Local state for selection/custom input (parent handles submission via callbacks)
- After selection, all cards become disabled to prevent double-tap
- Custom input has minimum length validation (10 chars)
- Custom text submission creates a synthetic choice object for the parent

## Testing Requirements

- [ ] Renders chapter header with correct number and prompt
- [ ] Renders all choice cards
- [ ] Tapping a choice card selects it and disables others
- [ ] Calls onSelectChoice with correct choice
- [ ] Custom input expands on tap
- [ ] Custom input validates minimum length
- [ ] Calls onCustomInput with text
- [ ] Shows compact concept cards
- [ ] Shows previous illustration when provided

## Implementation Checklist

- [ ] Create ChapterScreen.jsx
- [ ] Implement choice selection flow
- [ ] Implement "write your own" collapsible input
- [ ] Add chapter labels (Beginning, Adventure, Ending)
- [ ] Integrate StoryChoiceCard and ConceptCards
- [ ] Add progress indicator
- [ ] Verify dark mode
- [ ] Add haptic feedback on interactions

---
**Created:** 2026-02-06
