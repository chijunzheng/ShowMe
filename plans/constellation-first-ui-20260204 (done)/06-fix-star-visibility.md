# Feature: Fix Star Visibility and Labels

**ID:** 06
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 02

## Description

Made constellation stars more visible by increasing their size, adding glow effects to all brightness levels, increasing base opacity, and adding persistent topic labels below each star. Also increased edge opacity for undiscovered connections to improve visibility of the knowledge graph structure.

## Acceptance Criteria

- [x] Stars are larger and more visible
- [x] All brightness levels have glow effects
- [x] Topic labels appear below each star
- [x] Labels are readable but not obtrusive
- [x] Labels truncate when too long
- [x] Undiscovered edges more visible
- [x] Dark mode works correctly

## Implementation Details

### Files to Modify

- `frontend/src/components/Constellation/ConstellationStar.jsx` - Update size and glow
- `frontend/src/components/Constellation/ConstellationEdge.jsx` - Update edge opacity

### Key Changes

1. **Increase Star Sizes**:
   ```javascript
   // OLD: Smaller sizes
   const SIZE_CLASSES = {
     dim: 'w-4 h-4',
     glow: 'w-5 h-5',
     bright: 'w-6 h-6',
     brilliant: 'w-8 h-8',
   }

   // NEW: Larger, more visible sizes
   const SIZE_CLASSES = {
     dim: 'w-5 h-5',        // +1 size unit
     glow: 'w-6 h-6',       // +1 size unit
     bright: 'w-7 h-7',     // +1 size unit
     brilliant: 'w-9 h-9',  // +1 size unit
   }
   ```

2. **Add Glow to All Brightness Levels**:
   ```javascript
   // OLD: Only bright/brilliant had glow
   const GLOW_CLASSES = {
     dim: '',
     glow: 'shadow-sm',
     bright: 'shadow-md shadow-blue-400/50',
     brilliant: 'shadow-lg shadow-indigo-400/60',
   }

   // NEW: All levels have glow, increased opacity
   const GLOW_CLASSES = {
     dim: 'shadow-sm shadow-slate-400/40 opacity-60',
     glow: 'shadow-md shadow-blue-400/50 opacity-80',
     bright: 'shadow-md shadow-blue-400/50 opacity-95',
     brilliant: 'shadow-lg shadow-indigo-400/60 opacity-100',
   }
   ```

3. **Add Persistent Topic Labels**:
   ```jsx
   <g className="constellation-star-group">
     {/* Star circle */}
     <foreignObject x={x - radius} y={y - radius} width={radius * 2} height={radius * 2}>
       <div className={`${SIZE_CLASSES[brightness]} ${GLOW_CLASSES[brightness]} ...`}>
         {/* Star content */}
       </div>
     </foreignObject>

     {/* NEW: Topic label below star */}
     <foreignObject
       x={x - 40}
       y={y + radius + 4}
       width={80}
       height={20}
       className="pointer-events-none"
     >
       <div className="flex justify-center">
         <div className="text-[10px] text-slate-300/80 max-w-[80px] truncate text-center">
           {topic.topicName}
         </div>
       </div>
     </foreignObject>
   </g>
   ```

4. **Increase Undiscovered Edge Opacity**:
   ```javascript
   // ConstellationEdge.jsx

   // OLD: Very faint undiscovered edges
   const opacity = isDiscovered ? 0.6 : 0.3

   // NEW: More visible undiscovered edges
   const opacity = isDiscovered ? 0.6 : 0.5
   ```

### Technical Decisions

- **Decision:** Add labels to all stars persistently
- **Rationale:** Improves navigation and topic identification without requiring hover
- **Trade-off:** Slight visual clutter, but significantly better UX

- **Decision:** Increase base opacity for dim stars
- **Rationale:** Even unvisited topics should be easily visible
- **Trade-off:** Less dramatic brightness progression, but better discoverability

- **Decision:** Truncate labels at 80px
- **Rationale:** Prevents labels from overlapping on close stars
- **Trade-off:** Long topic names abbreviated, but readable

## Dependencies

### Depends On
- **Feature 02:** Constellation controls and layout must be complete

### Blocks
None - Standalone visual enhancement

## Testing Requirements

- [x] Test all brightness levels render correctly
- [x] Test labels appear for all stars
- [x] Test label truncation on long topic names
- [x] Test labels readable in dark mode
- [x] Test labels don't overlap on close stars
- [x] Test edge visibility (discovered vs undiscovered)
- [x] Verify glow effects in dark mode

## Security Considerations

- [x] No security implications (visual-only changes)

## Implementation Checklist

- [x] Update SIZE_CLASSES with larger dimensions
- [x] Update GLOW_CLASSES with glow for all levels
- [x] Add opacity classes to GLOW_CLASSES
- [x] Add foreignObject for topic label
- [x] Style label with truncate and max-width
- [x] Position label below star (y + radius + 4)
- [x] Set pointer-events-none on label
- [x] Update edge opacity in ConstellationEdge
- [x] Test all brightness levels visually
- [x] Test long topic names truncate correctly

## Verification

**Visual Check:**
1. Open Progress tab with multiple topics
2. Check star sizes
   - All stars should be larger than before
   - Dim stars should still be noticeably smaller than brilliant
3. Check glow effects
   - Even dim stars should have subtle glow
   - Brilliant stars should have strong indigo glow
4. Check labels
   - Each star should have topic name below it
   - Long names should truncate with ellipsis
   - Labels should be readable but subtle (slate-300/80)
5. Check edges
   - Undiscovered edges should be visible but fainter
   - Discovered edges should be clearly visible

**Brightness Progression:**
```
dim (1-2 visits):     w-5 h-5, subtle glow, 60% opacity
glow (3-5 visits):    w-6 h-6, medium glow, 80% opacity
bright (6-9 visits):  w-7 h-7, medium glow, 95% opacity
brilliant (10+ visits): w-9 h-9, strong glow, 100% opacity
```

**Label Test:**
1. Create topic with short name ("Math")
   - Label should show full name
2. Create topic with long name ("Introduction to Quantum Mechanics")
   - Label should truncate: "Introduction to Quantu..."
3. Zoom out
   - Labels should scale with stars

## Notes

**Label Positioning:**
- Labels positioned 4px below star bottom edge
- Centered horizontally using flexbox
- pointer-events-none prevents interference with drag/click

**Glow Strategy:**
- All stars now glow (improves visibility)
- Glow intensity increases with brightness
- Opacity progression provides secondary visual cue

**Edge Visibility:**
- Undiscovered edges: 0.5 opacity (was 0.3)
- Discovered edges: 0.6 opacity (unchanged)
- Improved map readability without losing connection importance distinction

**Truncation:**
- max-w-[80px] limits label width
- truncate class adds ellipsis
- Text size: 10px (small but readable)

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
