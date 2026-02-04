# Feature: Quick Practice Section

**ID:** 03
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01, 02

## Description

Create the "Quick Practice" section for the Progress Tab. This section displays three learning mode cards (Mystery Lab, Wonder Lab, Story Studio) and a topic picker. Users can select a mode first then pick a topic, or use "Surprise Me!" for full random selection.

## Acceptance Criteria

- [ ] Displays 3 mode cards horizontally (Mystery, Wonder, Story)
- [ ] Mode cards show icon, name, and brief description
- [ ] Selecting a mode highlights it
- [ ] Topic picker shows all completed topics as chips
- [ ] "Surprise Me!" button picks random mode AND topic
- [ ] After mode + topic selected, launches immediately
- [ ] Topics due for review have amber ring indicator
- [ ] Empty state when no topics completed yet

## Implementation Details

### Files to Create

- `frontend/src/components/ProgressTab/QuickPractice.jsx`

### Component Props

```typescript
interface QuickPracticeProps {
  topics: Array<{
    topicName: string
    slides: Slide[]
    level: string
    lastReviewedAt: Date
    zone: string
  }>
  onLaunchMode: (topicName: string, mode: string, topicData: object) => void
}
```

### UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Quick Practice                                     │
│  ─────────────────────────────────────────────────  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │     🔍      │ │     🌟      │ │     📖      │   │
│  │  Mystery    │ │   Wonder    │ │   Story     │   │
│  │    Lab      │ │    Lab      │ │   Studio    │   │
│  │ Solve clues │ │ What if...  │ │ Create tale │   │
│  └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  🎲 Surprise Me!                            │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Or pick a topic:                                   │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🦋 Caterpillar   🐦 Bird Nav   🧭 Compass    │  │
│  │ 🐠 Fish Resp     🌸 Pollinators  🔊 Echo     │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### State Management

```javascript
const [selectedMode, setSelectedMode] = useState(null)
// null = no mode selected, show all topics
// 'mystery' | 'whatif' | 'story' = mode selected, pick topic
```

### Interaction Flow

1. **Direct topic tap** (no mode selected):
   - Opens TopicActionSheet (Feature 02)
   - User picks mode from sheet

2. **Mode then topic**:
   - Tap mode card → highlights, shows "Pick a topic below"
   - Tap topic → immediately launches that mode

3. **Surprise Me!**:
   - Random mode + random topic
   - Immediate launch

### Mode Card Data

```javascript
const modes = [
  {
    id: 'mystery',
    icon: '🔍',
    name: 'Mystery Lab',
    description: 'Solve clues',
    color: 'indigo'
  },
  {
    id: 'whatif',
    icon: '🌟',
    name: 'Wonder Lab',
    description: 'What if...',
    color: 'amber'
  },
  {
    id: 'story',
    icon: '📖',
    name: 'Story Studio',
    description: 'Create a tale',
    color: 'rose'
  }
]
```

### Topic Chip Styling

- Default: Light background, dark text
- Due for review (>7 days): Amber ring/border
- Overdue (>14 days): Rose ring, subtle glow
- Selected (when mode picked): Primary color highlight

### Empty State

```
┌─────────────────────────────────────────────────────┐
│  Quick Practice                                     │
│                                                     │
│  🎓                                                 │
│  Learn your first topic to unlock practice modes!  │
│                                                     │
│  [Ask a Question →]                                │
└─────────────────────────────────────────────────────┘
```

## Dependencies

### Depends On
- **Feature 01:** Uses `handleLaunchLearningMode` handler
- **Feature 02:** Opens TopicActionSheet when topic tapped (no mode selected)

### Blocks
- **Feature 05:** Progress Tab includes this section

## Testing Requirements

- [ ] Mode cards render correctly
- [ ] Mode selection highlights card
- [ ] Topic chips render with correct status styling
- [ ] Surprise Me picks random mode and topic
- [ ] Direct topic tap opens action sheet
- [ ] Mode + topic launches correctly
- [ ] Empty state shows when no topics

## Implementation Checklist

- [ ] Create component file
- [ ] Add mode cards with selection state
- [ ] Add "Surprise Me!" button
- [ ] Add topic chips section
- [ ] Add due-for-review styling
- [ ] Implement random selection logic
- [ ] Add empty state
- [ ] Integration with TopicActionSheet
- [ ] Code review

## Code Reference

Review status calculation (from treeUtils.js):
```javascript
const getDaysAgo = (date) => Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24))
const status = daysAgo > 14 ? 'due' : daysAgo > 7 ? 'fading' : 'fresh'
```

## Notes

- Keep topic chips horizontally scrollable if many topics
- Consider adding filter by zone (Nature/Civilization/Arcane)
- "Surprise Me!" should have fun animation (confetti?)

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** TBD
