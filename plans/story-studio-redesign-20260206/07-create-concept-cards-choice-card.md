# Feature: Create ConceptCards + StoryChoiceCard

**ID:** 07
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None
**Track:** B (Frontend Components)

## Description

Create two reusable UI components: ConceptCards (visual concept badges) and StoryChoiceCard (individual story choice card with tap interaction).

## Acceptance Criteria

### ConceptCards
- [ ] Full mode: larger cards in a grid with icon + concept name + description
- [ ] Compact mode: small horizontal badges (concept name only + icon)
- [ ] Highlights found concepts with green accent
- [ ] Props: `conceptCards`, `conceptsFound` (Set), `compact` (boolean)

### StoryChoiceCard
- [ ] Large colorful card with gradient border
- [ ] Emoji displayed prominently on left
- [ ] Narrative text on right
- [ ] Subtle concept hint badges at bottom
- [ ] Tap animation: scale + glow effect
- [ ] Selected state: checkmark + highlighted border
- [ ] Disabled state: reduced opacity, no interaction
- [ ] Props: `choice`, `isSelected`, `isDisabled`, `onSelect`

## Implementation Details

### Files to Create

1. `frontend/src/components/LearnModes/Story/ConceptCards.jsx`

```
Full mode layout:
┌──────┐ ┌──────┐ ┌──────┐
│ 🌍   │ │ ⚡   │ │ 🔬   │
│gravity│ │energy│ │force │
│Things │ │Power │ │Push  │
│fall   │ │that  │ │or    │
│down   │ │moves │ │pull  │
└──────┘ └──────┘ └──────┘

Compact mode layout:
[🌍 gravity] [⚡ energy] [🔬 force]
```

2. `frontend/src/components/LearnModes/Story/StoryChoiceCard.jsx`

```
┌─────────────────────────────────────┐
│ 🚀  Sparky zoomed into the          │
│     thinking-maze, dodging           │
│     sparks of data...                │
│                                      │
│     ┌──────────┐ ┌──────────┐       │
│     │input     │ │layers    │       │
│     └──────────┘ └──────────┘       │
└─────────────────────────────────────┘
```

### ConceptCards Design

**Full mode:**
- Grid: `grid-cols-2 sm:grid-cols-3` gap-3
- Each card: white bg, rounded-xl, p-3, border
- Icon large (text-2xl), concept name bold, description text-sm
- Found concepts: green-100 bg, green border, green text

**Compact mode:**
- Flex wrap, gap-2
- Each badge: inline-flex, px-3 py-1, rounded-full, text-xs
- Found concepts: green-100 bg, green-600 text

### StoryChoiceCard Design

- Container: `p-4 rounded-2xl border-2 transition-all duration-200`
- Default border: `border-gray-200 dark:border-slate-700`
- Hover: `hover:border-pink-300 hover:shadow-lg hover:scale-[1.02]`
- Selected: `border-pink-500 bg-pink-50 dark:bg-pink-900/20 shadow-lg`
- Disabled: `opacity-50 pointer-events-none`
- Emoji: `text-3xl` on the left
- Text: `text-base text-gray-700 dark:text-gray-300`
- Concept hints: small rounded badges below text
- Click handler: `vibrateShort()` + `playSelectSound()` + `onSelect(choice)`

## Testing Requirements

- [ ] ConceptCards full mode: renders all cards with icons
- [ ] ConceptCards compact mode: renders badges
- [ ] ConceptCards: highlights found concepts
- [ ] StoryChoiceCard: renders emoji and text
- [ ] StoryChoiceCard: shows selected state
- [ ] StoryChoiceCard: disabled state prevents interaction
- [ ] StoryChoiceCard: calls onSelect on tap
- [ ] StoryChoiceCard: renders concept hints

## Implementation Checklist

- [ ] Create ConceptCards.jsx with full and compact modes
- [ ] Create StoryChoiceCard.jsx with all states
- [ ] Add haptic feedback and sound to StoryChoiceCard
- [ ] Verify dark mode for both components

---
**Created:** 2026-02-06
