# Feature: Constellation Zoom Controls — Gold Focus Rings

**ID:** 06
**Status:** ⬚ Pending
**Priority:** Medium
**Dependencies:** 01

## Description

Update focus rings on all zoom control buttons and the legend category buttons to use stardust gold instead of primary coral.

## Files to Modify

- `frontend/src/components/Constellation/Constellation.jsx`

## Changes

### Zoom buttons (4 buttons: zoom in, zoom out, fullscreen, reset):
- Change `focus:ring-primary` → `focus:ring-stardust/50` on all 4 buttons

### Legend category buttons:
- Change `focus-visible:ring-primary/60` → `focus-visible:ring-stardust/50`
