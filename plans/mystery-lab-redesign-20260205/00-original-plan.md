# Mystery Lab Redesign: Immersive Detective Experience

## Summary

Transform Mystery Lab from a static "wall of text" into a step-by-step guided detective story with TTS narration, generated manga-style images, inline slide references, and multiple kid-friendly solve methods (MCQ, evidence board, fill-in-blank, voice/text).

## New State Machine

LOADING → INTRO → INVESTIGATE (per-clue) → SOLVE → EVALUATING → REVEAL → CELEBRATION

Current: Everything shown at once on one scrollable page.
New: Each step auto-narrated by TTS, user advances with "Next" button.

## Phase 1: Backend — Expand Mystery Generator

### File: backend/src/services/mysteryGenerator.js

Change: Expand the Gemini prompt (lines 78-130) to return additional fields alongside existing ones.

New fields in response:
- theoryOptions: { options: string[], correctIndex: number }
- fillBlanks: { sentence: string, blanks: string[], wordBank: string[] }
- evidenceConnections: [{ clueIndex: number, concept: string }]
- revealNarration: string
- Each clue gains narratorText field

Validation (~line 170): Add fallback defaults for all new fields.

### File: backend/src/routes/learn.js

New endpoint: POST /api/learn/mystery/image
Expand: POST /api/learn/mystery/evaluate with fast-paths for MCQ, fill-blank, evidence board

## Phase 2: Frontend Core — Step-by-Step Flow

New files: useMysteryNarration.js, MysteryIntro.jsx, ClueInvestigation.jsx, SlideReference.jsx, SolutionReveal.jsx
Rewrite: MysteryLab.jsx with 7-state machine

## Phase 3: Frontend — Multiple Solve Methods

New files: SolveMCQ.jsx, SolveEvidenceBoard.jsx, SolveFillBlank.jsx, SolveVoiceText.jsx
Refactor: TheorySolver.jsx → method orchestrator

## Implementation Order

Groups A, B, C can run in parallel. Sequential items depend on above groups.

### Track A: Backend (No dependencies)
- Feature 01: Expand Mystery Generator Prompt
- Feature 02: Mystery Image Endpoint + Expand Evaluate

### Track B: Frontend Utilities (No dependencies)
- Feature 03: TTS Narration Hook
- Feature 04: SlideReference Component

### Track C: Solve Methods (No dependencies)
- Feature 05: SolveMCQ Component
- Feature 06: SolveEvidenceBoard Component
- Feature 07: SolveFillBlank Component
- Feature 08: SolveVoiceText Extract

### Track D: Frontend Scenes (Depends on Track B)
- Feature 09: MysteryIntro Component
- Feature 10: ClueInvestigation Component
- Feature 11: SolutionReveal Component

### Track E: Orchestrators (Depends on Track C)
- Feature 12: TheorySolver Refactor

### Track F: Integration (Depends on all tracks)
- Feature 13: MysteryLab Rewrite

## Key Design Principles

1. **Narrator-Guided Flow**: Every step has TTS narration that auto-plays
2. **One Thing at a Time**: User focuses on current step only
3. **Multiple Solve Paths**: Kids can choose their preferred method (MCQ default, but others available)
4. **Visual Storytelling**: Manga-style scene images for intro and reveal
5. **Inline Context**: Slide references appear directly in clue text

## Expected Impact

**Before:**
- Static wall of text (mystery setup, all clues, solve form, solution)
- No narration
- Single solve method (voice/text only)
- No visual scenes
- Cognitive overload

**After:**
- Step-by-step guided story (one screen at a time)
- Auto-narrated by TTS
- 4 solve methods (MCQ, evidence board, fill-blank, voice/text)
- Manga-style scene images
- Focused attention

---

**Created:** 2026-02-05
**Status:** ⬜ Not Started
