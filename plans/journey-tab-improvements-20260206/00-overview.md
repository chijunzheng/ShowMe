# Implementation Plan: Journey Tab Improvements

**Created:** 2026-02-06
**Status:** Not Started
**Total Features:** 6
**Completed:** 0/6

## Progress Summary

| ID | Feature | Status | Dependencies | Priority |
|----|---------|--------|--------------|----------|
| 01 | Hide Gaps Until Discover | ⬜ Not Started | - | High |
| 02 | Trophy Improvements | ⬜ Not Started | - | High |
| 03 | Stats Bar Fix | ⬜ Not Started | - | Medium |
| 04 | Mastery Redesign (Bloom's + Decay) | ⬜ Not Started | - | High |
| 05 | Streak Calendar + Topics Categorized | ⬜ Not Started | 04 | High |
| 06 | App.jsx activeDates Prop | ⬜ Not Started | 02, 05 | Medium |

## Dependency Graph

```
01 (Hide Gaps)          ─── independent
02 (Trophies)           ─── independent ──► 06
03 (Stats Bar)          ─── independent
04 (Mastery Redesign)   ──► 05
05 (StatDetailSheet)    ──► 06
06 (App.jsx wiring)     ─── final
```

## Parallel Tracks

### Track A (independent): Features 01, 02, 03, 04
All can run in parallel — no shared files.

### Track B (sequential): Feature 04 → 05 → 06
Feature 05 imports CLUSTER_CONFIG exported by Feature 04.
Feature 06 wires activeDates from Feature 02's backend changes.

## Notes

- Feature 04 (mastery redesign) is the most complex — changes data model, adds migration, replaces updateMastery
- Feature 05 depends on Feature 04 exporting CLUSTER_CONFIG from useKnowledgeGraph.js
- ConstellationStar.jsx changes are part of Feature 04 (reads computed mastery)
