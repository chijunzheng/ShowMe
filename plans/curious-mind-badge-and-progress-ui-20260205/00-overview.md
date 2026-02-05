# Implementation Plan: Curious Mind Badge + Progress Trophy Row

**Created:** 2026-02-05  
**Status:** ⬜ Not Started  
**Total Features:** 3  
**Completed:** 0/3

## Progress Summary

| ID | Feature | Status | Dependencies | Priority |
|----|---------|--------|--------------|----------|
| 01 | Persist local user progress to disk (avoid repeated badge unlocks) | ⬜ Not Started | - | High |
| 02 | Show earned badges/trophies in Progress tab (compact row) | ⬜ Not Started | 01 | Medium |
| 03 | Tests + verification (backend + frontend) | ⬜ Not Started | 01, 02 | High |

## Dependency Graph

```mermaid
graph TD
    F01[01: Local progress persistence] --> F02[02: Progress trophy row]
    F01 --> F03[03: Tests + verification]
    F02 --> F03
```

## Notes
- User report: "Curious Mind" achievement toast appears every time a new question is asked.
- Hypothesis: local progress fallback is in-memory and resets on backend restart/hot reload, causing "first question" badge to re-unlock.
- UX: achievements should be discoverable later, not only via toast -> add a compact trophy row in Progress.

## Status Legend
- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed
- ⏸️ Blocked
- ⚠️ Issues

