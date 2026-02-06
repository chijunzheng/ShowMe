# Feature: Fix Canvas Dragging

**ID:** 05
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** 02

## Description

Fixed canvas drag detection by switching from an allowlist pattern (matching specific background elements) to a blocklist pattern (excluding interactive elements). Also added cursor feedback (cursor-grab/cursor-grabbing) to indicate draggability. This resolves issues where dragging only worked when clicking specific elements.

## Acceptance Criteria

- [x] Canvas dragging works from any non-interactive element
- [x] Dragging excluded when clicking buttons, links, inputs
- [x] Cursor changes to grab hand when hovering over draggable areas
- [x] Cursor changes to grabbing hand during drag
- [x] Interactive elements remain fully functional
- [x] No console errors during drag operations

## Implementation Details

### Files to Modify

- `frontend/src/components/Constellation/Constellation.jsx` - Update drag detection logic

### Key Changes

1. **Replace Allowlist with Blocklist Pattern**:
   ```javascript
   // OLD: Allowlist approach (brittle, only specific elements worked)
   const isBackgroundTarget =
     target === containerRef.current ||
     target.closest('svg.constellation-background') ||
     target.classList.contains('constellation-background')

   // NEW: Blocklist approach (robust, works everywhere except interactive elements)
   const isBackgroundTarget = !target.closest('button, [role="button"], a, input')
   ```

2. **Add Cursor Feedback**:
   ```jsx
   <div
     ref={containerRef}
     className={`
       relative w-full h-full overflow-hidden rounded-lg
       ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
     `}
     onMouseDown={handleMouseDown}
     onTouchStart={handleTouchStart}
   >
     {/* Constellation content */}
   </div>
   ```

### Technical Decisions

- **Decision:** Use blocklist pattern instead of allowlist
- **Rationale:** More maintainable - easier to define what NOT to drag (buttons) than what TO drag (all background elements)
- **Trade-off:** Slightly broader in scope, but better UX and easier to maintain

- **Decision:** Add cursor feedback classes
- **Rationale:** Provides clear visual affordance for drag interaction
- **Trade-off:** Minimal - standard UX pattern

## Dependencies

### Depends On
- **Feature 02:** Canvas controls must be implemented first

### Blocks
None - Standalone enhancement

## Testing Requirements

- [x] Test drag from empty canvas areas
- [x] Test drag from starfield dots
- [x] Test drag from edges/gradient background
- [x] Test buttons remain clickable (zoom +/-, reset)
- [x] Test star buttons remain clickable
- [x] Test cursor changes to grab/grabbing
- [x] Verify touch drag still works on mobile

## Security Considerations

- [x] No security implications (UI-only enhancement)

## Implementation Checklist

- [x] Update isBackgroundTarget logic to use blocklist
- [x] Remove allowlist element matching
- [x] Add cursor-grab class to container
- [x] Add cursor-grabbing class when isDragging
- [x] Test drag works from all canvas areas
- [x] Test interactive elements still work
- [x] Verify cursor feedback appears correctly
- [x] Test on mobile devices (touch events)

## Verification

**Visual Check:**
1. Navigate to Progress tab with constellation
2. Hover over canvas background
   - Cursor should show grab hand
3. Click and drag from empty area
   - Cursor should change to grabbing hand
   - Canvas should pan smoothly
4. Click zoom buttons
   - Should zoom without triggering drag
   - Buttons should remain interactive
5. Click star nodes
   - Should open action sheet
   - Should not trigger drag

**Functional Check:**
```bash
# Test drag detection logic
# In browser console:
document.querySelector('.constellation-container').classList
# Should contain: cursor-grab or cursor-grabbing
```

## Notes

**Why Blocklist is Better:**
- Allowlist: Required updating every time background elements changed
- Blocklist: Only need to list interactive elements (stable set)
- Result: More maintainable, fewer bugs

**Cursor Feedback:**
- Standard web pattern for draggable interfaces
- Improves discoverability (users see it's draggable)
- Works with both mouse and touch (touch ignores cursor classes)

**Interactive Elements Excluded:**
- `button` - All button elements
- `[role="button"]` - ARIA buttons
- `a` - Links
- `input` - Form inputs

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
