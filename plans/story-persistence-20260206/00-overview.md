# Implementation Plan: Story Persistence (localStorage + Firestore)

**Created:** 2026-02-06
**Status:** Not Started
**Total Features:** 7
**Completed:** 0/7

## Progress Summary

| ID | Feature | Status | Dependencies | Priority | Track |
|----|---------|--------|--------------|----------|-------|
| 01 | Backend Story Storage Service | ⬜ Not Started | - | High | A |
| 02 | Backend Stories API Routes | ⬜ Not Started | 01 | High | A |
| 03 | Frontend Storage Constants + Utils | ⬜ Not Started | - | High | B |
| 04 | useStoryStorage Hook | ⬜ Not Started | 03 | High | B |
| 05 | StoryStudio Save Integration | ⬜ Not Started | 04 | High | C |
| 06 | MyStoriesSheet + StoryReplaySheet UI | ⬜ Not Started | - | Medium | C |
| 07 | ProgressTab Integration Wiring | ⬜ Not Started | 04, 06 | High | C |

## Parallel Tracks

### Track A: Backend (Features 01-02)
⬜ 01 (Storage Service) → ⬜ 02 (API Routes + index.js)

### Track B: Frontend Storage (Features 03-04)
⬜ 03 (Constants + Utils) → ⬜ 04 (useStoryStorage Hook)

### Track C: UI Integration (Features 05-07)
⬜ 05 (StoryStudio save) — depends on 04
⬜ 06 (MyStoriesSheet + StoryReplaySheet) — independent
⬜ 07 (ProgressTab wiring) — depends on 04, 06

**Note:** Tracks A and B can run in parallel. Track C starts after B completes (04).

## Dependency Graph

```
01 ──→ 02
03 ──→ 04 ──→ 05
            ──→ 07
06 ─────────→ 07
```

## Notes

- Follow `userProgress.js` pattern for backend Firestore + local JSON fallback
- Follow `topicStorage.js` pattern for frontend localStorage CRUD
- `playbackScenes` memo in StoryStudio.jsx:765-772 defines the scene data shape
- Max 10 stories cached in localStorage; server has no limit
