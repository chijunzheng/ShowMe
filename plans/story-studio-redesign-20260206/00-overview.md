# Implementation Plan: Story Studio Redesign

**Created:** 2026-02-06
**Status:** Not Started
**Total Features:** 12
**Completed:** 0/12

## Progress Summary

| ID | Feature | Status | Dependencies | Track | Priority |
|----|---------|--------|--------------|-------|----------|
| 01 | Update generateStoryPrompt() | ⬜ Not Started | - | A | High |
| 02 | Add generateStoryChapter() | ⬜ Not Started | 01 | A | High |
| 03 | Update /api/learn/story route | ⬜ Not Started | 01 | A | High |
| 04 | Add /api/learn/story/chapter route | ⬜ Not Started | 02 | A | High |
| 05 | Create useStoryNarration + storyLoaderFacts | ⬜ Not Started | - | B | High |
| 06 | Create StoryLoader + StoryIntro | ⬜ Not Started | 05 | B | High |
| 07 | Create ConceptCards + StoryChoiceCard | ⬜ Not Started | - | B | High |
| 08 | Create ChapterScreen | ⬜ Not Started | 07 | B | High |
| 09 | Rewrite StoryStudio state machine | ⬜ Not Started | 03, 04, 06, 08 | C | High |
| 10 | Update StoryPlayback for chapters | ⬜ Not Started | - | D | Medium |
| 11 | Backend tests (story/chapter) | ⬜ Not Started | 03, 04 | E | Medium |
| 12 | Frontend component tests | ⬜ Not Started | 06, 07, 08, 09 | E | Medium |

## Parallel Tracks

### Track A: Backend (Features 01-04)
⬜ 01 → ⬜ 02 → ⬜ 03 → ⬜ 04

### Track B: Frontend Components (Features 05-08)
⬜ 05 → ⬜ 06
⬜ 07 → ⬜ 08

### Track C: StoryStudio Rewrite (Feature 09)
⬜ 09 (depends on A3, A4, B6, B8)

### Track D: Playback Update (Feature 10)
⬜ 10 (independent)

### Track E: Tests (Features 11-12)
⬜ 11 | ⬜ 12 (after respective tracks)

## Dependency Graph

```
01 (generateStoryPrompt) ──→ 02 (generateStoryChapter)
         │                           │
         ↓                           ↓
03 (/api/learn/story) ────→ 04 (/api/learn/story/chapter)
         │                           │
         └───────────┬───────────────┘
                     ↓
              09 (StoryStudio)
                     ↑
         ┌───────────┴───────────────┐
         │                           │
06 (StoryLoader+Intro)      08 (ChapterScreen)
         ↑                           ↑
05 (narration+facts)        07 (ConceptCards+ChoiceCard)

10 (StoryPlayback) ── independent
11 (Backend tests) ── after 03, 04
12 (Frontend tests) ── after 06, 07, 08, 09
```

## Recommended Implementation Order

**Phase 1 (Parallel):**
- Track A: 01 → 02 → 03 → 04
- Track B1: 05 → 06
- Track B2: 07 → 08
- Track D: 10

**Phase 2:**
- Track C: 09

**Phase 3:**
- Track E: 11, 12

## Notes

- Track A and Track B can run fully in parallel
- Feature 09 is the integration point - depends on all backend and frontend component features
- StoryPrompt.jsx will be deleted as part of feature 09 (replaced by StoryIntro.jsx)
- VoiceStoryRecorder.jsx is kept for "write your own" option within ChapterScreen
