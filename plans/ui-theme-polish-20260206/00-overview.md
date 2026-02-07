# Implementation Plan: Journey Tab — Cosmic Space Theme Polish (Stardust Gold)

**Created:** 2026-02-06
**Updated:** 2026-02-06
**Status:** Complete
**Total Features:** 7
**Completed:** 7/7

## Design Direction

The Journey tab is a **cosmic/constellation/space** experience. Coral (the Learn tab's friendly accent) feels wrong here — like painting a spaceship orange. Instead, use **Stardust Gold (#FFD866)** as the Journey-specific accent: it evokes distant stars, feels premium, and pairs naturally with the warm night-purple background.

Key principles:
- **Dark glass UI** — controls blend into the night sky, not fight it
- **Stardust Gold accent** — warm but space-native, distinct from Learn tab's coral
- **Subtle, not loud** — everything should feel like it belongs in space

## Progress Summary

| ID | Feature | Status | Dependencies | Priority |
|----|---------|--------|--------------|----------|
| 01 | Add Stardust color to Tailwind config | ✅ Done | - | High |
| 02 | ConstellationStar: Gold glows | ✅ Done | 01 | High |
| 03 | DiscoverButton: Glass style | ✅ Done | 01 | High |
| 04 | StatsBar: Dark glass compact mode | ✅ Done | 01 | High |
| 05 | Explorer Rank: Gold progress bar | ✅ Done | 01 | Medium |
| 06 | Constellation: Gold focus rings | ✅ Done | 01 | Medium |
| 07 | Update ConstellationStar tests | ✅ Done | 02 | Low |

## What NOT Changed (as planned)
- Constellation background gradient (already warm night)
- Tab transition fade (already added)
- Learn tab / Home page (coral stays)
- Quiz themes, Learn mode colors
- Bottom tab bar, sidebar background
