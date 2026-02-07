# Feature: DiscoverButton — Subtle Glass Style

**ID:** 03
**Status:** ⬚ Pending
**Priority:** High
**Dependencies:** 01

## Description

Replace the solid coral neobrutalism button with a translucent dark glass style that belongs in the space theme. Subtle stardust gold border for visibility.

## Files to Modify

- `frontend/src/components/Constellation/DiscoverButton.jsx`

## Changes

Replace the entire button className with:
```
bg-night-600/80 backdrop-blur-sm
border border-stardust/30
shadow-[0_0_12px_rgba(255,216,102,0.15)]
hover:bg-night-600/90 hover:border-stardust/50
text-stardust-100 text-sm font-bold
focus:ring-stardust/50 focus:ring-offset-night-900
```

Remove:
- `bg-primary border-2 border-black` (solid coral)
- `shadow-[3px_3px_0_0_#000]` (neobrutalism shadow — doesn't fit space)
- `active:shadow-none active:translate-x-[3px] active:translate-y-[3px]` (neobrutalism press effect)

Keep:
- `px-4 h-12 rounded-xl`
- `flex items-center justify-center gap-2`
- `transition-all duration-150`
- `disabled:opacity-70 disabled:cursor-not-allowed`
- Loading pulse behavior
