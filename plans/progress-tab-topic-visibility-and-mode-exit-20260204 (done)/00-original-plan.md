# Plan: Progress Tab Topic Visibility + Contextual Mode Exit

## Summary
Fix two user-facing issues:

1. Progress tab currently shows no topics even after a topic slideshow has been watched.
2. After entering a learning mode (Mystery/Wonder/Story), there isn't a fast, intuitive way to go “back” to where you came from.

## Decision: Source Of Truth For Progress Topics
**Use a merged view: local `topics` (canonical list) + `/api/world` pieces as optional metadata enrichment.**

- Always show topics from local `topics` immediately (these represent watched/learned topics).
- If a topic has a matching world piece, use it to enrich fields like `zone`, `lastReviewedAt`, `relatedTopics`.

## Decision: Exit Target For Learning Modes
**Contextual back for all learning modes (Mystery/Wonder/Story).**

- If launched after a slideshow (from Mode Selector): exit returns to `UI_STATE.MODE_SELECTOR`.
- If launched from Progress: exit returns to the Progress tab.

## Implementation Outline

### A) Progress Tab Topic Visibility
1. In `frontend/src/App.jsx`, derive `progressPieces` from local `topics`:
   - Shape each entry like a “piece” so existing ProgressTab components work.
2. Merge in matching `worldPieces` metadata when available.
3. Pass `pieces={progressPieces}` into `ProgressTab` instead of `worldPieces`.

### B) Fix Progress Actions (Review + Quiz)
1. Fix `ProgressTab` handler wiring:
   - `onReviewSlideshow(topicName)` should reopen the slideshow for that topic.
   - `onQuickQuiz(topicName)` should start quiz flow for that topic (based on local `topics`).

### C) Contextual Exit For Learning Modes
1. Track launch origin in `App.jsx` (`after_slideshow` vs `from_progress`).
2. Update `handleLearningModeExit` and `handleLearningModeComplete`:
   - Route back contextually (Mode Selector vs Progress).
3. Do **not** regress the Mode Selector “Skip” behavior:
   - “Skip for now” should still return to Home (Learn).

## Verification
Manual:
- Learn a topic → watch slideshow → open Progress tab:
  - The topic appears in “Your Topics” immediately.
- From Progress → “Review Slideshow”:
  - Slideshow opens for that topic.
- After slideshow → Mode Selector → enter Mystery → Exit:
  - Returns to Mode Selector.
- From Progress → enter Mystery → Exit:
  - Returns to Progress.

Automated:
- `cd frontend && npm test -- --run`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

