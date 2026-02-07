# Original Plan: One-Year Progress System (12 Ranks + 16 Badges)

## Objectives
- Expand progression to a 12-rank ladder paced for ~1 year of steady use.
- Use **hybrid gating** (topics learned + XP) so learning modes count.
- Expand badges to 16 total, covering firsts, streaks, depth, modes, mastery, and consistency.
- Display locked badges and upcoming ranks in Progress for motivation.
- Keep UI compact; no large vertical pushdown of the constellation map.

## Design System (ui-ux-pro-max)
- **Style:** Claymorphism, playful, friendly, chunky
- **Palette:** Primary #4F46E5, Secondary #818CF8, CTA #22C55E, Background #EEF2FF, Text #312E81
- **UX Rules:** 44px touch targets, no layout shift, visible focus, reduced motion support

## Rank System (12 Levels, Hybrid)
**Hybrid gate:** `topicsLearned >= minTopics` AND `totalXP >= minXP`

Proposed thresholds (tuned for ~12 months):
1. Stargazer — 0 topics, 0 XP
2. Spark Scout — 4 topics, 200 XP
3. Orbit Cadet — 10 topics, 500 XP
4. Pathfinder — 18 topics, 900 XP
5. Navigator — 28 topics, 1,400 XP
6. Explorer — 40 topics, 2,100 XP
7. Voyager — 55 topics, 3,000 XP
8. Trailblazer — 72 topics, 4,100 XP
9. Star Captain — 90 topics, 5,400 XP
10. Celestial Sage — 110 topics, 7,000 XP
11. Cosmic Pioneer — 135 topics, 9,000 XP
12. Legendary Luminary — 165 topics, 11,500 XP

## Badge System (16 total)
**Firsts (3)**
- Curious Mind (first question) — existing
- First Steps (first topic) — new
- First Quiz (first quiz) — new

**Streaks (4)**
- Getting Started (3-day streak) — existing
- Dedicated Learner (7-day streak) — existing
- Habit Builder (14-day streak) — new
- Knowledge Seeker (30-day streak) — existing

**Depth & Modes (4)**
- Deep Thinker (deep mode used) — existing
- Story Weaver (complete story mode) — new
- Mystery Solver (complete mystery mode) — new
- Wonder Seeker (complete wonder mode) — new

**Mastery & Consistency (5)**
- Question Champion (10 questions) — existing
- Critical Thinker (5 socratic answers) — existing
- Quiz Cadence (5 quizzes) — new
- Topic Explorer (25 topics) — new
- Master Learner (50 topics) — new

## UI Updates
- Progress tab shows **locked badges** with silhouettes + criteria.
- Show **current rank** + **next 2 ranks** (locked) with progress.
- Trophy row should not push constellation down (overlay or compact drawer).

## Data & Plumbing
- Add user progress counters: `totalTopicsLearned`, `totalQuizzes`, `storyCompletions`, `mysteryCompletions`, `wonderCompletions`.
- Add new activity actions and points.
- Ensure XP used for rank is sourced from `userProgress.points` (not world XP).

## Testing
- Backend: badge unlock coverage for new categories.
- Frontend: rank calc (hybrid), locked badge rendering.
- Manual: verify no layout shift; locked badges/levels visible.

