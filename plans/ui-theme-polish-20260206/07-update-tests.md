# Feature: Update ConstellationStar Tests

**ID:** 07
**Status:** ⬚ Pending
**Priority:** Low
**Dependencies:** 02

## Description

Update the test assertion that checks for `primary` background class to check for `stardust` instead.

## Files to Modify

- `frontend/src/components/Constellation/__tests__/ConstellationStar.test.jsx`

## Changes

### "has primary background color" test (~line 237-243):
- Rename test to "has stardust background color"
- Change assertion from `expect(star.className).toMatch(/primary/)` to `expect(star.className).toMatch(/stardust/)`
