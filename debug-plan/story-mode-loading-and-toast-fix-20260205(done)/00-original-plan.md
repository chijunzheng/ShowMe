# Original Plan: Story Mode Toast + Stuck Loading

## Problem

1. Selecting **Story mode** shows a toast: “story mode coming soon”, even though StoryStudio renders.
2. StoryStudio can get stuck on the loading screen (“Preparing your story prompt…”) with no back/cancel action.

## Root Causes (Expected)

- `frontend/src/App.jsx` still contains a placeholder toast for `mode === 'story'`.
- `frontend/src/components/LearnModes/Story/StoryStudio.jsx` renders a spinner-only UI for `LOADING_PROMPT` and does not enforce a request timeout.

## Root Cause (Confirmed After First Fix)

- React 18 StrictMode (dev) double-invokes effects (effect → cleanup → effect). `StoryStudio` used `isMountedRef` as a guard and set it to `false` in effect cleanup, but never reset it to `true` on the next effect run. This caused:
  - Successful `/api/learn/story` responses to be ignored (no transition to READY)
  - Timeout transitions to ERROR to be ignored
  - The UI to remain stuck on the loading spinner indefinitely

## Fix Strategy

1. Remove the placeholder “coming soon” toast for Story mode.
2. Add a **Go Back / Cancel** action in StoryStudio’s loading UI that aborts in-flight requests and returns to the mode selector.
3. Add a request timeout (30s) to prevent indefinite loading. On timeout, show the existing StoryStudio error screen with a clear message.
4. Add focused unit tests for the new loading UX.
5. Make StoryStudio StrictMode-safe by resetting the mounted guard at the start of the effect and adding StrictMode regression tests.

## Acceptance Criteria

- Selecting Story mode no longer shows “coming soon” messaging.
- While loading, user can always escape back to the mode selector.
- If prompt generation takes too long, the UI transitions to an error state with actionable buttons.
- Unit tests cover loading UI and timeout behavior.
