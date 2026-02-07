# Feature: Constellation Wheel Passive Listener Fix

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** -

## Description
Fix the Constellation wheel handler to avoid the browser warning about calling `preventDefault()` inside a passive listener by attaching a native `wheel` listener with `{ passive: false }`.

## Acceptance Criteria
- [ ] No console warning about passive wheel listeners
- [ ] Zoom behavior remains unchanged
- [ ] Listener is cleaned up on unmount

## Implementation Details

### Files to Modify
- `frontend/src/components/Constellation/Constellation.jsx` - remove React `onWheel`, add native listener

### Key Components
1. **Constellation**
   - Attach wheel listener to `containerRef.current` with `{ passive: false }`
   - Use `event.cancelable` guard for `preventDefault()`

### Technical Decisions
- **Decision:** Use native event listener instead of React `onWheel` to control passive behavior
- **Trade-off:** Slightly more code and cleanup management

## Testing Requirements
- [ ] Manual QA: scroll/zoom works, no warning

## Implementation Checklist
- [ ] Update Constellation wheel handling
- [ ] Verify no warning
- [ ] Verify zoom behavior

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
