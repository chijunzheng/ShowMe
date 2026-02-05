# Feature: Topic Action Sheet Component

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01

## Description

Create a reusable bottom sheet component that appears when a user taps on any topic. This sheet displays topic metadata and provides quick access to all actions: Review Slideshow, Mystery Lab, Wonder Lab, Story Studio, Quick Quiz, and Related Topics.

## Acceptance Criteria

- [ ] Bottom sheet slides up when topic selected
- [ ] Displays topic name, zone, and last reviewed date
- [ ] Shows "Watch Again" section with Review Slideshow button
- [ ] Shows "Practice Modes" section with 4 mode buttons
- [ ] Shows "Connections" section with related topics
- [ ] Tapping outside or X closes the sheet
- [ ] Works on mobile (touch) and desktop (click)
- [ ] Animations are smooth (slide up/down)

## Implementation Details

### Files to Create

- `frontend/src/components/ProgressTab/TopicActionSheet.jsx`

### Component Props

```typescript
interface TopicActionSheetProps {
  topic: {
    topicName: string
    zone: 'nature' | 'civilization' | 'arcane'
    lastReviewedAt: Date | null
    relatedTopics: string[]
    slides: Slide[]
    level: string
  } | null
  isOpen: boolean
  onClose: () => void
  onReviewSlideshow: (topicName: string) => void
  onLaunchMode: (topicName: string, mode: string, topicData: object) => void
  onQuickQuiz: (topicName: string) => void
}
```

### UI Layout

```
┌──────────────────────────────────────────┐
│  [X]                                      │  ← Close button
│  🦋 Caterpillar to Butterfly             │  ← Topic name + emoji
│  Reviewed 3 days ago • Zone: Nature      │  ← Metadata
├──────────────────────────────────────────┤
│  WATCH AGAIN                             │
│  [▶ Review Slideshow]                    │  ← Full-width button
├──────────────────────────────────────────┤
│  PRACTICE MODES                          │
│  [🔍 Mystery] [🌟 Wonder]               │  ← 2x2 grid
│  [📖 Story]  [⚡ Quiz]                  │
├──────────────────────────────────────────┤
│  CONNECTIONS                             │
│  Related: Bird Migration, Ecosystems     │  ← Clickable chips
└──────────────────────────────────────────┘
```

### Styling

- Use existing Tailwind classes
- Match app's neobrutalism design system
- Backdrop blur behind sheet
- Border radius on top corners
- Shadow for elevation

### Animation

```javascript
// Slide up animation
const variants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1 }
}
```

### Key Components

1. **Header** - Topic name, emoji, close button
2. **Metadata Row** - Last reviewed, zone badge
3. **Review Section** - Single button for slideshow
4. **Practice Grid** - 2x2 grid of mode buttons
5. **Connections** - Horizontal scroll of related topic chips

## Dependencies

### Depends On
- **Feature 01:** Uses `handleLaunchLearningMode` handler

### Blocks
- **Feature 03:** Quick Practice uses this action sheet
- **Feature 05:** Progress Tab integrates this component

## Testing Requirements

- [ ] Component renders with all sections
- [ ] Close button dismisses sheet
- [ ] Backdrop tap dismisses sheet
- [ ] Mode buttons call correct handler
- [ ] Review button calls review handler
- [ ] Related topic chips are clickable

## Implementation Checklist

- [ ] Create component file
- [ ] Implement slide-up animation
- [ ] Add header with close button
- [ ] Add metadata row with zone styling
- [ ] Add review section
- [ ] Add practice modes grid
- [ ] Add connections section
- [ ] Add backdrop with blur
- [ ] Test on mobile viewport
- [ ] Code review

## Reusable Patterns

Reference existing bottom sheets in codebase:
- Check `LivingWorldView.jsx` for piece detail card pattern
- Check `TreeTab.jsx` for topic selection pattern

## Notes

This component will be used in multiple places:
- Progress Tab (main use)
- Could replace existing topic cards in Tree/World tabs during transition

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** TBD
