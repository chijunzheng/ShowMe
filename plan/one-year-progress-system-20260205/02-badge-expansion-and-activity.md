# Feature: Badge Expansion + Activity Tracking

**ID:** 02
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 01

## Description
Expand badges to 16 total and add backend + frontend activity tracking to unlock them (topic learned, quiz complete, mode completion, streak milestones).

## Acceptance Criteria
- [x] 16 badges defined with criteria + display metadata.
- [x] New activity types are accepted by `/api/user/activity`.
- [x] User progress tracks new counters (`totalTopicsLearned`, `totalQuizzes`, mode completions).
- [x] Badge unlocks occur when criteria met.

## Implementation Details

### Backend
- `backend/src/services/userProgress.js`
  - Add progress fields: `totalTopicsLearned`, `totalQuizzes`, `storyCompletions`, `mysteryCompletions`, `wonderCompletions`.
  - Add new `POINTS` entries for new actions.
  - Expand `BADGES` to 16 with `criteria` and `criteriaText`.
  - Extend `applyActivityUpdate` to handle new actions.
- `backend/src/routes/user.js`
  - Extend `validActions` to include new actions.

### Frontend
- `frontend/src/hooks/useUserProgress.js`
  - Add helper methods: `recordTopicLearned`, `recordQuizCompleted`, `recordMysteryCompleted`, `recordStoryCompleted`, `recordWonderCompleted`.
- `frontend/src/hooks/useQuestionHandler.js`
  - Call `recordTopicLearned` when a **new** topic is created (not follow-up).
- `frontend/src/App.jsx`
  - Call mode completion recorders in `handleLearningModeComplete`.

## Testing Requirements
- [x] Update `backend/src/services/__tests__/userProgress.test.js` to cover new badge unlocks.

## Implementation Checklist
- [x] Extend backend progress schema
- [x] Add actions + points
- [x] Expand badges
- [x] Wire frontend activity recording
- [x] Update tests

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
