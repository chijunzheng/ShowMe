# Feature: Add Stardust Color to Tailwind Config

**ID:** 01
**Status:** ⬚ Pending
**Priority:** High
**Dependencies:** None

## Description

Add the Stardust Gold color palette to Tailwind config so all Journey tab components can reference it.

## Files to Modify

- `frontend/tailwind.config.js`

## Changes

Add `stardust` to the `colors` object in `theme.extend`:

```js
stardust: {
  DEFAULT: '#FFD866',
  50: '#FFFDF0',
  100: '#FFF9D6',
  200: '#FFF3B0',
  300: '#FFEC88',
  400: '#FFD866',
  500: '#E6C24E',
  600: '#BFA030',
}
```

Place it after the `night` color block for logical grouping (night sky + stardust).
