# Plan: Mystery Lab Readiness + JIT Narration + Voice Crash Fix

## Goal
Implement three coordinated fixes:
1. Keep loading screen until image and intro narration are ready (with timeout fallback).
2. Prefetch clues JIT to reduce narration latency.
3. Fix `SolveVoiceText` render crash (`Cannot access 'stopRecording' before initialization`).

## Chosen Defaults
- Intro gate policy: image + intro TTS readiness.
- Readiness timeout fallback: 12 seconds.

## Scope
- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx`
- `frontend/src/components/LearnModes/Mystery/SolveVoiceText.jsx`
- `frontend/src/components/LearnModes/Mystery/__tests__/MysteryLab.test.jsx`
- `frontend/src/components/LearnModes/Mystery/__tests__/SolveVoiceText.test.jsx`

## Non-goals
- Backend endpoint changes.
- Storage quota warning remediation.
