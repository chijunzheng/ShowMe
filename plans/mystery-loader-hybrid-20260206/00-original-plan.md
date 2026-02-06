# Mystery Lab Loader Upgrade Plan: Hybrid Speed + Engagement

## Summary
Reduce Mystery loader friction by combining real speed improvements with engaging content.
1. Improve actual speed by transitioning from `LOADING` to `BRIEFING` immediately after mystery JSON is ready.
2. Keep image generation and narration prefetch as background tasks that no longer block entry.
3. Improve perceived speed with rotating investigation stage copy plus topic-related fun facts.
4. Keep the solve flow unchanged and non-gated.

## Plan Artifacts (`/plans` + `create-features`)
1. Write plan docs to `/Users/jasonchi/ShowMe/plans/mystery-loader-hybrid-20260206/`.
2. Create `/Users/jasonchi/ShowMe/plans/mystery-loader-hybrid-20260206/00-original-plan.md` from this spec.
3. Run `create-features` to generate:
- `/Users/jasonchi/ShowMe/plans/mystery-loader-hybrid-20260206/00-overview.md`
- `/Users/jasonchi/ShowMe/plans/mystery-loader-hybrid-20260206/01-loader-ui-and-copy.md`
- `/Users/jasonchi/ShowMe/plans/mystery-loader-hybrid-20260206/02-nonblocking-load-pipeline.md`
- `/Users/jasonchi/ShowMe/plans/mystery-loader-hybrid-20260206/03-fun-fact-fetch-and-fallback.md`
- `/Users/jasonchi/ShowMe/plans/mystery-loader-hybrid-20260206/04-tests-and-observability.md`
4. Dependency chain in overview: `01 -> 02 -> 03 -> 04`.

## Implementation Scope

### 1) New Loader UI Module
1. Add `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Mystery/MysteryLoader.jsx`.
2. Render:
- Spinner/ring
- Rotating stage text (investigation-themed)
- Optional fun fact card (emoji + text)
- Small note that case prep continues automatically
3. Reuse visual style from existing Mystery/Wonder gradients; do not add gated interactions.
4. Use accessible status semantics (`role="status"`, `aria-live="polite"` for changing text).

### 2) Refactor Mystery Load Pipeline (Non-Blocking)
1. Update `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Mystery/MysteryLab.jsx`.
2. Change load sequence:
- Keep `fetchMystery()` blocking.
- Immediately `dispatch(MYSTERY_LOADED)` once payload validates.
- Start `fetchImageWithTimeout(...)` in background and dispatch `IMAGE_LOADED` when ready.
- Start `prefetchWithTimeout(...)` in background and do not block UI transition.
3. Keep legacy payload guard unchanged.
4. Keep existing retry/abort behavior; ensure cleanup cancels in-flight loader auxiliary calls.

### 3) Fun Fact Strategy (Topic-Aware, Non-Blocking)
1. In `MysteryLab` loading flow, add delayed fun-fact fetch to avoid unnecessary calls for short loads.
2. Trigger after `FACT_FETCH_DELAY_MS = 900` only if still in `LOADING`.
3. Call existing endpoint `POST /api/generate/engagement` with:
- `query`: `topicName` fallback to mystery title fallback to generic mystery topic string
- `explanationLevel`: current level (`simple|standard|deep`)
4. Timeout fun-fact request (`FACT_REQUEST_TIMEOUT_MS = 1800`); if timeout/error, continue with local fallback facts.
5. Add local fallback facts file `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Mystery/mysteryLoaderFacts.js` with level-tuned arrays.
6. Rotate fallback facts every `FACT_ROTATE_MS = 5000` while loading.
7. If API fun fact arrives before load completes, replace rotating fallback with fetched fact.
8. Never block `MYSTERY_LOADED` transition on fun-fact availability.

### 4) Loader Stage Copy
1. Add deterministic rotating stage messages in loader UI while waiting for mystery generation.
2. Example sequence:
- “Reading case notes…”
- “Assembling witness list…”
- “Tagging possible evidence…”
3. Rotate every 2.5s, no fake percentage display.
4. Keep copy concise and age-appropriate.

### 5) Level Behavior
1. `simple`: short plain-language fact, minimal stage copy.
2. `standard`: full stage rotation + normal-length fact.
3. `deep`: more technical fact wording and investigator-style stage copy.
4. No level introduces extra waiting requirements.

## Public APIs / Interfaces / Types

### Backend/Public API
1. No contract changes required.
2. Reuse existing endpoint: `POST /api/generate/engagement`.
3. No changes to `/api/learn/mystery` or `/api/learn/mystery/evaluate`.

### Frontend Interface Changes
1. Add internal loader state in `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Mystery/MysteryLab.jsx`:
- `loaderStageIndex`
- `loaderFunFact`
- `loaderFactSource` (`local` | `api`)
- `showFunFact`
2. Add `MysteryLoader` props:
- `stageText`
- `funFact`
- `factSource`
3. No prop changes required for `MysteryIntro`.

## Test Cases and Scenarios

### Unit/Component Tests
1. Update `/Users/jasonchi/ShowMe/frontend/src/components/LearnModes/Mystery/__tests__/MysteryLab.test.jsx`.
2. Add test: transitions to `BRIEFING` immediately after mystery payload, even if image request is unresolved.
3. Add test: when load exceeds 900ms, fallback fact appears and rotates.
4. Add test: API fun fact replaces fallback fact when engagement call succeeds.
5. Add test: engagement failure/timeout keeps fallback fact and does not crash.
6. Add test: unmount/exit aborts timers/fetches without state update warnings.

### Integration Behavior
1. `simple|standard|deep` all pass `explanationLevel` to engagement endpoint.
2. Loader copy and fun facts are visible only during `LOADING`.
3. Existing mystery run (`BRIEFING -> SCENE_SCAN -> ... -> CELEBRATION`) remains unaffected.
4. Legacy payload error state still renders correctly.

## Acceptance Criteria
1. Mystery no longer waits for image and narration prefetch before showing briefing.
2. Loader always shows meaningful content for waits longer than 900ms.
3. Fun facts are topic-related when API succeeds and graceful fallback when it does not.
4. No new gating or extra steps are added for users.
5. Existing Mystery tests continue passing with added loader coverage.

## Assumptions and Defaults
1. Existing `/api/generate/engagement` is available in the same runtime path used by current frontend.
2. Loader fun facts are text-only (no TTS in Mystery loader phase).
3. If topic context is weak, fallback query still produces safe generic science facts.
4. English fallback facts are acceptable for first iteration; localization can be added in a follow-up.
5. This plan focuses only on loading experience improvements, not gameplay stage redesign.
