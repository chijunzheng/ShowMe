# Feature: Mode Selector Foundation

## Dependencies

```
Depends on: Nothing (START HERE)
Blocks: 02-mystery-lab, 03-wonder-lab, 04-story-studio
```

---

## Goal

Replace traditional quiz prompt with a mode selection UI showing 3 learning options.

---

## User Flow

```
┌─────────────────────────────────────────────────────────┐
│  Nice learning!                                         │
│                                                         │
│  How would you like to explore what you learned?        │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ 🔍          │ │ 🌟          │ │ 📖          │       │
│  │ MYSTERY LAB │ │ WONDER LAB  │ │ STORY       │       │
│  │             │ │             │ │ STUDIO      │       │
│  │ Solve a     │ │ "What if?"  │ │ Create your │       │
│  │ puzzle      │ │ scenarios   │ │ own story   │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                         │
│              [Skip for now]                             │
└─────────────────────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/components/LearnModes/ModeSelector.jsx` | 3-card selection UI |
| `frontend/src/components/LearnModes/index.js` | Exports |
| `frontend/src/hooks/useLearnMode.js` | Mode state management |

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/hooks/useQuizHandlers.js` | Replace quiz trigger with mode selector |
| `frontend/src/components/Quiz/index.jsx` | Route to mode components |

---

## ModeSelector Props

```typescript
interface ModeSelectorProps {
  slides: Slide[]
  topicName: string
  explanationLevel: 'simple' | 'standard' | 'deep'
  onModeSelect: (mode: 'mystery' | 'whatif' | 'story') => void
  onSkip: () => void
}
```

---

## useLearnMode Hook

```typescript
interface LearnModeState {
  selectedMode: 'mystery' | 'whatif' | 'story' | null
  modeContent: MysteryContent | WhatIfContent | StoryContent | null
  isLoading: boolean
  error: string | null
}

// Functions
selectMode(mode: string): Promise<void>
resetMode(): void
```

---

## Verification

- [ ] Mode selector appears after slides complete
- [ ] Each card shows icon, title, description
- [ ] Tapping card triggers loading state
- [ ] Skip button dismisses and returns to main view
- [ ] Traditional quiz flow removed/disabled
