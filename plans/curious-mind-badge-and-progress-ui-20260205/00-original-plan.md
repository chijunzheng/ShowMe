# Original Plan: Curious Mind Badge + Progress Trophy Row

## Problem Statement
The achievement toast for **"Curious Mind"** (badge: `CURIOUS_MIND`) appears repeatedly when the user asks new questions. This is confusing because that badge is intended to be a **one-time unlock** for the first question.

Separately, earned badges are currently ephemeral (toast-only) and are not visible from the **Progress** tab, which is the user's "home" for what they've achieved.

## Root Cause (Most Likely)
Badge unlocking happens in backend user progress tracking:
- Backend defines `CURIOUS_MIND` with criteria `totalQuestions >= 1`.
- The backend uses Firestore in production, but falls back to a **local in-memory** store in dev/local mode.
- If the backend restarts (or reloads), that in-memory store resets, so the next question looks like the user's first again -> "Curious Mind" re-unlocks and the toast appears.

## Goals / Success Criteria
1. Within one backend run, multiple questions only unlock `CURIOUS_MIND` once.
2. In local dev with local-progress fallback, restarting the backend should NOT cause `CURIOUS_MIND` to unlock again for the same `clientId`.
3. Progress tab should display earned trophies/badges in a compact UI (not toast-only).

## Approach
### A) Backend: Persist local progress to disk
When local progress is used (`SHOWME_LOCAL_PROGRESS=1` or Firestore not available in dev):
- Load progress from a JSON file on startup
- Save progress back to the same file when it changes
- Default file path: `backend/.data/userProgress.json` (configurable via `SHOWME_LOCAL_PROGRESS_FILE`)

### B) Frontend: Add a compact trophy row to Progress tab
Use existing `TrophyShowcase` component, fed by:
- `progress.badges` (earned badge IDs)
- badge definitions (name/description/icon)
- `progress.badgeUnlockDates` (earnedAt)

Place it under the Progress `StatsBar` so it is visible but not overwhelming.

### C) Verification
- Backend unit tests for local persistence + badge unlock behavior.
- Frontend sanity test that trophy row renders when trophies exist.
- Manual flow verification end-to-end.

## Non-Goals
- Redesign of the engagement fun-fact card (`/api/generate/engagement`) and generation UI.
- Adding new badge types or changing existing badge criteria.

## Risks
- File I/O write frequency: ensure writes are debounced to avoid excessive disk churn during frequent activity events.
- Date serialization: store timestamps as ISO strings and parse via `new Date(...)` where needed.

