# Feature: Mini World Preview Component

**ID:** 04
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Create a compact world preview component for the Progress Tab header. Shows the current world panorama as a thumbnail with tier indicator. Tapping expands to fullscreen LivingWorldView. This preserves the emotional reward of seeing your world grow without requiring a dedicated tab.

## Acceptance Criteria

- [ ] Displays current world image as thumbnail (16:9 aspect, ~200px wide)
- [ ] Shows world tier badge (Barren → Sprouting → Growing → Thriving → Legendary)
- [ ] Shows topic count in world
- [ ] Tap expands to fullscreen world view
- [ ] Fullscreen view includes all existing LivingWorldView features
- [ ] Smooth expand/collapse animation
- [ ] Shows placeholder when world not yet created

## Implementation Details

### Files to Create

- `frontend/src/components/ProgressTab/MiniWorldPreview.jsx`

### Component Props

```typescript
interface MiniWorldPreviewProps {
  worldImageUrl: string | null
  tier: 'barren' | 'sprouting' | 'growing' | 'thriving' | 'legendary'
  topicCount: number
  onExpand: () => void
}
```

### UI Layout - Collapsed (Mini Preview)

```
┌────────────────────────────────────────────┐
│  ┌────────────────────┐  Your World        │
│  │                    │  ──────────────    │
│  │   [World Image]    │  🌱 Sprouting      │
│  │                    │  12 discoveries    │
│  │                    │  [Tap to explore]  │
│  └────────────────────┘                    │
└────────────────────────────────────────────┘
```

### UI Layout - Expanded (Fullscreen)

```
┌─────────────────────────────────────────────────────────┐
│  [← Back]                              [Explore/Cinema] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│              [Full LivingWorldView]                     │
│              (pan, zoom, hotspots)                      │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Tier Styling

```javascript
const tierConfig = {
  barren: { icon: '🏜️', color: 'stone', label: 'Barren' },
  sprouting: { icon: '🌱', color: 'emerald', label: 'Sprouting' },
  growing: { icon: '🌿', color: 'green', label: 'Growing' },
  thriving: { icon: '🌳', color: 'teal', label: 'Thriving' },
  legendary: { icon: '✨', color: 'purple', label: 'Legendary' }
}
```

### Animation

Expand animation using Framer Motion:
```javascript
const variants = {
  mini: {
    width: 200,
    height: 112,
    borderRadius: 12
  },
  fullscreen: {
    width: '100vw',
    height: '100vh',
    borderRadius: 0
  }
}
```

### Empty State

```
┌────────────────────────────────────────────┐
│  ┌────────────────────┐  Your World        │
│  │                    │  ──────────────    │
│  │   🌍  Create       │  Learn topics to   │
│  │       World        │  grow your world!  │
│  │                    │                    │
│  └────────────────────┘                    │
└────────────────────────────────────────────┘
```

### Integration with Existing LivingWorldView

When expanded, reuse the existing `LivingWorldView` component:
```jsx
{isExpanded && (
  <FullscreenModal onClose={() => setIsExpanded(false)}>
    <LivingWorldView
      worldState={worldState}
      pieces={pieces}
      onReviewPiece={onReviewPiece}
      onQuizPiece={onQuizPiece}
      // ... other existing props
    />
  </FullscreenModal>
)}
```

## Dependencies

### Depends On
- None (can be built in parallel with Features 01-03)
- Uses existing `LivingWorldView` component for fullscreen

### Blocks
- **Feature 05:** Progress Tab includes this component in header

## Testing Requirements

- [ ] Renders with world image
- [ ] Shows correct tier badge
- [ ] Tap triggers expand
- [ ] Fullscreen shows LivingWorldView
- [ ] Close button returns to mini view
- [ ] Empty state renders when no world

## Implementation Checklist

- [ ] Create component file
- [ ] Add mini preview layout
- [ ] Add tier badge styling
- [ ] Add expand/collapse animation
- [ ] Integrate LivingWorldView for fullscreen
- [ ] Add empty state
- [ ] Add back button in fullscreen
- [ ] Test animations
- [ ] Code review

## Code Reference

Existing world state structure (from useLivingWorld):
```javascript
worldState: {
  imageUrl: string,
  tier: string,
  totalXP: number,
  topicsLearned: string[]
}
```

Existing tier calculation (from worldState.js):
```javascript
const getTier = (xp) => {
  if (xp >= 1000) return 'legendary'
  if (xp >= 500) return 'thriving'
  if (xp >= 200) return 'growing'
  if (xp >= 50) return 'sprouting'
  return 'barren'
}
```

## Notes

- Consider adding subtle parallax effect on hover (desktop)
- Mini preview could show "New!" badge after evolution
- Fullscreen inherits all World tab features (minimap, connections, etc.)

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** TBD
