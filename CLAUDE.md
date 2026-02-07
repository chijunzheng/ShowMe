# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plans
After using the native planning feature to clear context and bypass permissions, always write original plan into the @plans directory first, if it's a debugging task, write into @debugging-plan directory. Finally, use /create-features agent skills first before actual implementation.

## Responses
- Only respond with short and concise answers

## Dev Server
Never start a dev server yourself, the user should start a dev server. If you're trying to test something and server is down, ask the user. 

## Test your changes
After completing a change or a feature, always kick off one to three code review agents to ensure that the code is of high quality.

## Development
Whenever possible, try not to implement the changes yourself. Depending on the complexity of the change, kick off several coder agents to run in the background and, if possible, in parallel. 

## Compact instructions
When using compact, focus on test output and code changes

## Project Overview

ShowMe is a voice-first educational app that transforms spoken questions into visual explanations with interactive learning modes. Users ask questions by voice to generate AI-created slideshows, then engage with **Mystery Lab** (detective scenarios), **Wonder Lab** (what-if predictions), or **Story Studio** (narrative creation) to deepen learning through gamified experiences.

## Technology Stack

**Frontend:** React 18 + Vite, Tailwind CSS, React hooks + Context API
- Dev server runs on port 5173
- Uses Web Audio API, MediaRecorder API for voice features

**Backend:** Node.js + Express (stateless, no database)
- WebSocket for streaming generation status

**AI Services:**
- Gemini 3 Pro: Speech-to-text, script generation, topic classification
- Nano Banana Pro (Gemini 3 Pro Image): Educational diagram generation
- Gemini TTS: Voice narration

## Commands

```bash
# Frontend
cd frontend && npm install
npm run dev          # Start dev server on :5173

# Backend
cd backend && npm install
npm run dev          # Start Express server

# Full stack
npm run dev          # From root if configured
```

## Environment Variables

- `GEMINI_API_KEY` - API key for Gemini services
- `VITE_API_URL` - Backend API URL for frontend

## Architecture

### API Endpoints

**Slideshow Generation:**
- `POST /api/generate` - Generate slideshow from text query
- `POST /api/generate/follow-up` - Generate appended slides with context
- `POST /api/generate/engagement` - Generate fun fact + suggested questions (fast, ~1-2s)
- `POST /api/classify` - Classify query as follow_up or new_topic
- `POST /api/topic/header` - Generate topic header card
- `WS /ws/generation` - Real-time generation progress

**Learn Modes:**
- `POST /api/learn/mystery` - Generate detective mystery from slides
- `POST /api/learn/mystery/evaluate` - Evaluate detective theory/solution
- `POST /api/learn/whatif` - Generate what-if scenario with prediction cards
- `POST /api/learn/whatif/reveal-assets` - Generate consequence reveals (images + TTS)
- `POST /api/learn/story` - Generate story creation scenario

### Generation Pipeline
1. Speech-to-Text (Gemini 3 Pro) → ~1-2s
2. Script Generation (Gemini 3 Pro) → ~2-4s
3. Parallel: Diagram (Nano Banana Pro) + TTS (Gemini TTS) → ~5-10s
4. Assembly → ~1s
Total target: <30 seconds

### State Model
- Session-based (no persistent database)
- Topics: Max 3 retained, oldest evicted on 4th
- Slides grouped by topic with header cards as dividers
- Question queue for suggested follow-ups

### UI States
1. **Listening** - Waveform, live transcription, example questions (cold start only)
2. **Generating** - Loader, progress, fun fact card, suggestion cards
3. **Slideshow** - Image, subtitles, progress dots, controls
4. **Quiz** - Gamified quiz with engagement mechanics (MCQ, FillBlank, Voice, YesNo)
5. **Learn Modes:**
   - **Mystery Lab** - Briefing → Scene scan → Witness interviews → Timeline → Warrant → Solution reveal
   - **Wonder Lab** - Scenario intro → Prediction cards → Consequence reveals → Results summary
   - **Story Studio** - Story prompts → Voice recording → Live canvas → Playback → Share

## Component Structure

```
src/components/
├── Quiz/                    # Quiz orchestrator and question types
│   ├── index.jsx           # Main quiz state machine (1500+ lines)
│   ├── engagement/         # Gamification overlays
│   │   ├── QuestionRarityBadge.jsx
│   │   ├── BossBattle.jsx / BossBattleIntro.jsx
│   │   ├── MysteryBox.jsx / MysteryBoxReveal.jsx
│   │   ├── ComebackOffer.jsx / ComebackChallenge.jsx
│   │   └── DramaticPause.jsx
│   ├── celebrations/       # Victory/milestone animations
│   │   ├── StreakFlames.jsx
│   │   ├── BossDefeated.jsx / BossEscaped.jsx
│   │   └── ComebackComplete.jsx / ComebackFailed.jsx
│   └── [Question types]    # MCQ, FillBlank, Voice, YesNo, etc.
├── LearnModes/             # Interactive learning modes (post-slideshow)
│   ├── Mystery/            # Detective mystery investigations
│   │   ├── MysteryLab.jsx  # Crime Scene Ops state machine (8-state)
│   │   ├── MysteryIntro.jsx / MysteryLoader.jsx
│   │   ├── CrimeSceneScan.jsx / WitnessRoom.jsx
│   │   ├── TimelineRebuild.jsx / WarrantDecision.jsx
│   │   ├── SolutionReveal.jsx / DetectiveReward.jsx
│   │   ├── useMysteryNarration.js # TTS narration hook
│   │   └── __tests__/      # Test suite for all components
│   ├── WhatIf/             # Scenario prediction (Wonder Lab)
│   │   ├── WonderLab.jsx   # What-if state machine (6-state)
│   │   ├── SceneIntro.jsx / PredictionCards.jsx
│   │   ├── ExperimentLoader.jsx / ConsequenceReveal.jsx
│   │   ├── ResultsSummary.jsx / BonusFactCard.jsx
│   │   ├── useWonderNarration.js # TTS narration hook
│   │   └── __tests__/      # Test suite for all components
│   ├── Story/              # Story creation from narratives
│   │   ├── StoryStudio.jsx # Story composition state machine
│   │   ├── StoryPrompt.jsx / VoiceStoryRecorder.jsx
│   │   ├── LiveCanvas.jsx / ConceptTracker.jsx
│   │   ├── StoryPlayback.jsx / ShareStory.jsx
│   │   └── __tests__/      # Test suite
│   └── ModeSelector.jsx    # UI for choosing learn mode
└── Constellation/          # Knowledge graph visualization (Journey tab)
    ├── ConstellationMap.jsx # Interactive topic network
    ├── CategoryLegend.jsx  # Category color key
    ├── ConstellationNode.jsx # Individual topic nodes
    └── useKnowledgeGraph.js # Graph data hook
```

## Learn Modes

After completing a slideshow, users unlock interactive learning modes to deepen understanding:

### Mystery Lab (Crime Scene Ops)
- **State Machine:** LOADING → BRIEFING → SCENE_SCAN → WITNESS_ROOM → TIMELINE_REBUILD → WARRANT_DECISION → REVEAL → CELEBRATION
- **Flow:** Receive briefing → scan crime scene for clues → interview witnesses → rebuild timeline → draft warrant → submit theory → receive solution
- **Mechanics:** Multi-step investigation with clue gathering, theory evaluation, narrated feedback
- **Pattern Reference:** Uses `useReducer` state machine pattern (see MysteryLab.jsx)

### Wonder Lab (What If?)
- **State Machine:** LOADING → SCENE_INTRO → PREDICT → GENERATING_REVEALS → REVEAL → RESULTS
- **Flow:** View scenario intro → predict outcomes (2 cards) → wait for generation → view consequences → see results & XP
- **Mechanics:** Dual-outcome predictions with generation delays, XP calculation (0/2=10XP, 1/2=25XP, 2/2=50XP)
- **Two-phase Generation:** (1) Load scenario + cards, (2) After prediction, load reveal assets (images + TTS)

### Story Studio
- **Purpose:** Create narratives from lesson concepts
- **Flow:** Story prompts → voice recording → live visualization → playback → sharing
- **Integration:** Builds on learned content to create new story narratives

**Config:** Backend in `backend/src/services/mysteryGenerator.js`, routes in `backend/src/routes/learn.js`

## Gamification System

ShowMe includes game-like mechanics to boost engagement and retention:

**Core Systems:**
- **XP & Levels** - Track learning progress with experience points
- **Question Rarity** - Common, Rare, Epic, Legendary questions with XP multipliers
- **Boss Battles** - Final quiz questions become dramatic encounters
- **Streaks & Combos** - Visual rewards for consecutive correct answers
- **Mystery Boxes** - Performance-based rewards (power-ups, items)
- **Comeback Challenges** - Second-chance lightning rounds for close failures
- **Learn Mode Rewards** - XP earned from Mystery/Wonder Lab completion

**Journey Tab:**
- **Knowledge Constellation** - Interactive graph showing learned topics, relationships, and exploration paths
- **Gemini-powered placement** - AI determines where new questions attach in the knowledge graph

**Config:** Game rules in `hooks/game/` directory, components in `components/Quiz/engagement/`

## Design System

**Colors:** Tailwind default palette with primary indigo (#6366F1)

**Typography:** Inter font family (system default)

**Layout:** Mobile-first responsive design, max-width 800px desktop
