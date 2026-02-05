# Feature: Dynamic Layout Center

**ID:** 07
**Status:** ✅ Completed
**Priority:** Medium
**Estimated Complexity:** Medium
**Dependencies:** 02

## Description

Added ResizeObserver to measure constellation container dimensions and pass dynamic center coordinates to the force-directed layout algorithm. This ensures the constellation layout is properly centered regardless of container size, viewport changes, or device orientation.

## Acceptance Criteria

- [x] Container size measured using ResizeObserver
- [x] Center coordinates calculated dynamically
- [x] Layout hook accepts config.centerX and config.centerY
- [x] Layout cache invalidates when center changes
- [x] Constellation remains centered on resize
- [x] Works correctly on orientation change (mobile)

## Implementation Details

### Files to Modify

- `frontend/src/components/Constellation/Constellation.jsx` - Add container size tracking
- `frontend/src/components/Constellation/useConstellationLayout.js` - Accept center config

### Key Changes

1. **Add Container Size State and ResizeObserver**:
   ```javascript
   // Constellation.jsx

   const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

   // Measure container size
   useEffect(() => {
     if (!containerRef.current) return

     const resizeObserver = new ResizeObserver((entries) => {
       for (const entry of entries) {
         const { width, height } = entry.contentRect
         setContainerSize({ width, height })
       }
     })

     resizeObserver.observe(containerRef.current)

     return () => resizeObserver.disconnect()
   }, [])
   ```

2. **Calculate Dynamic Center Coordinates**:
   ```javascript
   // Constellation.jsx

   const layoutConfig = useMemo(
     () => ({
       centerX: Math.round(containerSize.width / 2),
       centerY: Math.round(containerSize.height / 2),
       nodeRepulsion: 150,
       linkDistance: 100,
       // ... other config
     }),
     [containerSize]
   )

   const { positions } = useConstellationLayout(nodes, edges, layoutConfig)
   ```

3. **Update Layout Hook to Accept Center Config**:
   ```javascript
   // useConstellationLayout.js

   export function useConstellationLayout(nodes, edges, config = {}) {
     const {
       centerX = 400,  // Default fallback
       centerY = 300,  // Default fallback
       nodeRepulsion = 150,
       linkDistance = 100,
       // ... other config
     } = config

     // Use centerX, centerY in force-directed algorithm
     const positions = useMemo(() => {
       // ... layout calculation using centerX, centerY
     }, [nodes, edges, centerX, centerY, /* other deps */])

     return { positions }
   }
   ```

4. **Update Cache Key for Invalidation**:
   ```javascript
   // useConstellationLayout.js

   // Include rounded center coordinates in cache key
   const cacheKey = useMemo(
     () =>
       `${nodes.length}-${edges.length}-${Math.round(centerX)}-${Math.round(centerY)}`,
     [nodes.length, edges.length, centerX, centerY]
   )
   ```

### Technical Decisions

- **Decision:** Use ResizeObserver instead of window resize listener
- **Rationale:** More accurate, fires on container size changes (not just window), better performance
- **Trade-off:** Slightly newer API (requires polyfill for old browsers), but better UX

- **Decision:** Round center coordinates before passing to layout
- **Rationale:** Prevents unnecessary layout recalculations on sub-pixel size changes
- **Trade-off:** Very minor precision loss, but significant performance gain

- **Decision:** Include center in cache key
- **Rationale:** Forces layout recalculation when center changes significantly
- **Trade-off:** More cache invalidations, but ensures correct layout

## Dependencies

### Depends On
- **Feature 02:** Constellation component structure must be finalized

### Blocks
None - Standalone enhancement

## Testing Requirements

- [x] Test layout centers correctly on initial load
- [x] Test layout recenters on window resize
- [x] Test layout recenters on browser zoom
- [x] Test layout recenters on mobile orientation change
- [x] Test layout recenters when sidebar opens/closes
- [x] Verify no excessive recalculations (check performance)
- [x] Test with small container (mobile)
- [x] Test with large container (desktop)

## Security Considerations

- [x] No security implications (layout calculation only)

## Implementation Checklist

- [x] Add containerSize state with default values
- [x] Add ResizeObserver useEffect
- [x] Calculate centerX and centerY from containerSize
- [x] Create layoutConfig object with center coordinates
- [x] Update useConstellationLayout to accept centerX/centerY
- [x] Update default center values in layout hook
- [x] Use center coordinates in force-directed algorithm
- [x] Update cache key to include rounded center
- [x] Add ResizeObserver cleanup (disconnect)
- [x] Test resize behavior on multiple screen sizes

## Verification

**Functional Check:**
1. Open Progress tab on desktop
   - Constellation should be centered
2. Resize browser window smaller
   - Constellation should remain centered
3. Resize browser window larger
   - Constellation should remain centered
4. Open browser DevTools (changes container size)
   - Constellation should reflow and stay centered
5. Test on mobile device
   - Rotate from portrait to landscape
   - Constellation should recenter

**Performance Check:**
```javascript
// In browser console, monitor layout recalculations
let layoutCount = 0
const originalUseLayoutEffect = React.useLayoutEffect
React.useLayoutEffect = (...args) => {
  layoutCount++
  console.log('Layout recalculation:', layoutCount)
  return originalUseLayoutEffect(...args)
}

// Resize window slowly - should see recalculations
// but not excessively (max 1-2 per second during resize)
```

**Visual Check:**
1. Add 5-10 topics
2. Resize window from 1920px to 375px width
   - Stars should maintain relative positions
   - Center cluster should stay centered
   - No stars should disappear off-canvas
3. Zoom browser to 200%
   - Layout should adjust correctly
   - Stars should remain visible

## Notes

**ResizeObserver Browser Support:**
- Chrome 64+ (Jan 2018)
- Firefox 69+ (Sep 2019)
- Safari 13.1+ (Mar 2020)
- Edge 79+ (Jan 2020)
- Coverage: >95% of users

**Why Round Center Coordinates:**
- Sub-pixel changes (e.g., 400.1px → 400.2px) shouldn't trigger layout
- Rounding prevents layout thrashing during smooth resize
- Math.round() chosen over Math.floor() for better centering

**Cache Invalidation Strategy:**
- Cache key: `${nodeCount}-${edgeCount}-${roundedCenterX}-${roundedCenterY}`
- Invalidates on: new topics, new connections, significant resize
- Doesn't invalidate on: sub-pixel size changes, viewport scroll

**Default Center Values:**
- Fallback: 400x300 (reasonable default for most screens)
- Used if ResizeObserver hasn't fired yet
- Overridden immediately on first observation

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
