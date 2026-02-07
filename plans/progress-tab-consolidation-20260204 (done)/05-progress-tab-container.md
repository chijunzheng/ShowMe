# Feature: Progress Tab Container

**ID:** 05
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 02, 03, 04

## Description

Create the main Progress Tab container that combines all components: Stats header, Mini World Preview, Due for Review section, Quick Practice section, Topics by Zone section, and Recommended Next section. This is the integration point that brings together Features 02-04.

## Acceptance Criteria

- [ ] Stats bar shows XP, streak, topics count
- [ ] Mini World Preview in header (from Feature 04)
- [ ] "Due for Review" section shows urgent topics
- [ ] "Quick Practice" section with modes (from Feature 03)
- [ ] "Your Topics" section with zone organization
- [ ] "Recommended Next" section with AI suggestions
- [ ] Topic tap opens TopicActionSheet (from Feature 02)
- [ ] Scrollable layout with sticky header
- [ ] Works on mobile and desktop viewports

## Implementation Details

### Files to Create

- `frontend/src/components/ProgressTab/ProgressTab.jsx`
- `frontend/src/components/ProgressTab/index.js`
- `frontend/src/components/ProgressTab/DueForReview.jsx`
- `frontend/src/components/ProgressTab/TopicsByZone.jsx`

### Component Props

```typescript
interface ProgressTabProps {
  // World data
  worldState: WorldState
  pieces: Piece[]

  // Topic actions
  onReviewSlideshow: (topicName: string) => void
  onLaunchMode: (topicName: string, mode: string, data: object) => void
  onQuickQuiz: (topicName: string) => void
  onLearnTopic: (topicName: string) => void

  // Stats
  totalXP: number
  streak: number

  // Suggestions
  suggestions: Suggestion[]
  onRefreshSuggestions: () => void
}
```

### UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  HEADER (sticky)                                        │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [XP: 450] [Streak: 5🔥] [Topics: 12]               ││
│  │  ┌─────────────────────┐                            ││
│  │  │   🌍 Mini World     │  ← MiniWorldPreview        ││
│  │  │   Tier: Sprouting   │                            ││
│  │  └─────────────────────┘                            ││
│  └─────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│  SCROLLABLE CONTENT                                     │
│                                                         │
│  ┌─ Due for Review ────────────────────────────────────┐│
│  │  ⚠️ 3 topics need review                            ││
│  │  [🦋 Caterpillar] [🐦 Birds] [🧭 Compass]          ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─ Quick Practice ────────────────────────────────────┐│
│  │  (QuickPractice component from Feature 03)          ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─ Your Topics ───────────────────────────────────────┐│
│  │  ┌─ Nature (5) ────────────────────────────────┐   ││
│  │  │  🦋 Caterpillar  🐦 Birds  🌸 Pollinators   │   ││
│  │  └─────────────────────────────────────────────┘   ││
│  │  ┌─ Civilization (4) ──────────────────────────┐   ││
│  │  │  🏛️ History  🎨 Art  🍕 Food               │   ││
│  │  └─────────────────────────────────────────────┘   ││
│  │  ┌─ Arcane (3) ────────────────────────────────┐   ││
│  │  │  🔬 Science  🌌 Space  🧮 Math              │   ││
│  │  └─────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─ Recommended Next ──────────────────────────────────┐│
│  │  Build on your knowledge:                           ││
│  │  [🦋 Butterfly Migration] [🌿 Ecosystems]          ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Section Components

**DueForReview.jsx:**
```typescript
interface DueForReviewProps {
  topics: Piece[]  // Filtered to fading/due status
  onTopicSelect: (topic: Piece) => void
}
```

**TopicsByZone.jsx:**
```typescript
interface TopicsByZoneProps {
  topics: Piece[]
  onTopicSelect: (topic: Piece) => void
}
// Uses zone categorization from treeUtils.js
```

### State Management

```javascript
const [selectedTopic, setSelectedTopic] = useState(null)
const [isActionSheetOpen, setIsActionSheetOpen] = useState(false)

const handleTopicSelect = (topic) => {
  setSelectedTopic(topic)
  setIsActionSheetOpen(true)
}
```

### Reusable Components from Existing Code

- **StatsBar**: Already exists in `Dashboard/StatsBar.jsx`
- **Zone grouping**: Use `groupTopicsByZone()` from `treeUtils.js`
- **Review status**: Use `getReviewStatus()` from `treeUtils.js`
- **Suggestions**: Use `useSuggestions` hook

## Dependencies

### Depends On
- **Feature 02:** TopicActionSheet for topic interactions
- **Feature 03:** QuickPractice section
- **Feature 04:** MiniWorldPreview in header

### Blocks
- **Feature 06:** Tab navigation update needs this component

## Testing Requirements

- [ ] All sections render correctly
- [ ] Due for review shows correct topics
- [ ] Zone grouping works
- [ ] Topic tap opens action sheet
- [ ] Sticky header on scroll
- [ ] Mobile responsive
- [ ] Empty states for each section

## Implementation Checklist

- [ ] Create ProgressTab.jsx container
- [ ] Create DueForReview.jsx section
- [ ] Create TopicsByZone.jsx section
- [ ] Integrate MiniWorldPreview
- [ ] Integrate QuickPractice
- [ ] Add TopicActionSheet integration
- [ ] Add Recommendations section
- [ ] Style with sticky header
- [ ] Test scrolling behavior
- [ ] Test mobile viewport
- [ ] Code review

## Code Reference

Zone categorization (from treeUtils.js):
```javascript
const zoneKeywords = {
  nature: ['animal', 'plant', 'weather', ...],
  civilization: ['history', 'technology', 'art', ...],
  arcane: ['science', 'space', 'math', ...]
}
```

Stats calculation (from useWorldStats):
```javascript
const { totalXP, streak, topicsLearned, tier } = useWorldStats(worldState)
```

## Notes

- Consider lazy loading sections for performance
- Add pull-to-refresh for suggestions
- Sections could be collapsible for long topic lists
- Empty state should encourage learning first topic

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** TBD
