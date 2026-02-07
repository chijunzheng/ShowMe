# Feature: ConstellationStar — Gold Glows Instead of Coral

**ID:** 02
**Status:** ⬚ Pending
**Priority:** High
**Dependencies:** 01

## Description

Replace coral/primary colors in ConstellationStar with stardust gold to match the cosmic theme. Stars should glow gold, not coral.

## Files to Modify

- `frontend/src/components/Constellation/ConstellationStar.jsx`

## Changes

### COLOR_CLASSES — change from coral to stardust/neutral:
```js
const COLOR_CLASSES = {
  dim: 'bg-night-600',           // keep (neutral dim)
  glow: 'bg-stardust-200',      // was bg-primary-200 (coral)
  bright: 'bg-stardust-100',    // was bg-primary-100 (coral)
  brilliant: 'bg-white',        // keep (brightest stars are white)
}
```

### GLOW_CLASSES — gold rgba instead of coral:
```js
const GLOW_CLASSES = {
  dim: 'opacity-60 shadow-[0_0_4px_rgba(61,53,85,0.4)]',           // keep
  glow: 'opacity-80 shadow-[0_0_8px_rgba(255,216,102,0.5)]',       // gold glow
  bright: 'opacity-95 shadow-[0_0_14px_rgba(255,236,136,0.6)]',    // brighter gold
  brilliant: 'opacity-100 shadow-[0_0_24px_rgba(255,255,255,0.9)] animate-pulse-slow', // keep white
}
```

### Focus ring — change `focus:ring-primary` → `focus:ring-stardust`
