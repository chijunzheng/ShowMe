# Mystery Lab Redesign: Crime Scene Ops (No MCQ/Fill/Evidence Board)

## Summary
Replace the current answer-task solve phase with one cohesive detective mission:
1. Scan the scene (find hidden evidence).
2. Interrogate witnesses (pick questions, expose contradictions).
3. Reconstruct the timeline (order events + causal links).
4. File the warrant (final accusation + confidence + short rationale).

## Solve State Machine
1. LOADING
2. BRIEFING
3. SCENE_SCAN
4. WITNESS_ROOM
5. TIMELINE_REBUILD
6. WARRANT_DECISION
7. REVEAL
8. CELEBRATION

## New Modules
- CrimeSceneScan.jsx
- WitnessRoom.jsx
- TimelineRebuild.jsx
- WarrantDecision.jsx

## Bonus Layer
- Hidden bonus clues in scene scan
- Optional extra witness questions
- Optional alternate timeline challenge
- Bonus rewards without hard completion gating

## Level Design
- simple: 3 hotspots, 1 witness/3 questions, 3 events/no red herring, 2 verdict options
- standard: 5 hotspots, 2 witnesses/5 questions, 5 events + 1 red herring, 3 verdict options + confidence required
- deep: 7 hotspots, 3 witnesses + contradiction detection, 7 events + causal links, 4 verdict options + confidence + rationale scoring

## API Changes
- POST /api/learn/mystery: add crimeScene, witnesses, timeline, verdict payload sections
- POST /api/learn/mystery/evaluate: add solveMethod values
  - scene-scan
  - witness-room
  - timeline-rebuild
  - warrant-decision
- Deterministic fast-path scoring for scene/timeline/verdict and LLM rationale scoring for deep warrant

## Frontend State Changes
- Remove required method tab orchestration from MysteryLab solve phase
- Add sceneProgress, witnessProgress, timelineProgress, warrantDraft
- Add bonusFinds and bonusXp

## Implementation Order
1. Extend mystery payload generator and fallbacks
2. Add evaluate branches in learn route
3. Build CrimeSceneScan
4. Build WitnessRoom
5. Build TimelineRebuild
6. Build WarrantDecision
7. Rewire MysteryLab to new state machine
8. Add legacy payload migration fallback
9. Update tests
