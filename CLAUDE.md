# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plans
After using the planning feature, use /create-features agent skills first before actual implementation.

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

ShowMe is a voice-first educational app that transforms spoken questions into visual explanations. Users ask questions by voice, and the app generates AI-created slideshows with custom diagrams, narration, and subtitles.

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
- `POST /api/generate` - Generate slideshow from text query
- `POST /api/generate/follow-up` - Generate appended slides with context
- `POST /api/generate/engagement` - Generate fun fact + suggested questions (fast, ~1-2s)
- `POST /api/classify` - Classify query as follow_up or new_topic
- `POST /api/topic/header` - Generate topic header card
- `WS /ws/generation` - Real-time generation progress

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
4. **Quiz** - Gamified quiz with engagement mechanics

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
├── LivingWorld/            # Interactive panorama map
│   ├── LivingWorldView.jsx # Main world container
│   ├── InteractiveCanvas.jsx # Hotspot interactions
│   ├── PanoramaViewer.jsx  # 360° image viewer
│   └── WorldQuizCelebration.jsx
├── MagicalTree/            # Knowledge tree visualization
│   ├── MagicalTree.jsx     # Tree container
│   ├── TreeQuizReaction.jsx # Quiz result animations
│   └── TreeBranch/Leaf/Seed.jsx
└── Dashboard/              # Stats and achievements
    ├── StatsBar.jsx
    └── TrophyShowcase.jsx
```

## Gamification System

ShowMe includes game-like mechanics to boost engagement and retention:

**Core Systems:**
- **XP & Levels** - Track learning progress with experience points
- **Question Rarity** - Common, Rare, Epic, Legendary questions with XP multipliers
- **Boss Battles** - Final quiz questions become dramatic encounters
- **Streaks & Combos** - Visual rewards for consecutive correct answers
- **Mystery Boxes** - Performance-based rewards (power-ups, items)
- **Comeback Challenges** - Second-chance lightning rounds for close failures

**World Integration:**
- **Living World** - Interactive panorama map with exploration
- **Magical Tree** - Knowledge tree that reacts to quiz performance
- **Dashboard** - Stats tracking and trophy showcase

**Config:** Game rules in `hooks/game/` directory, components in `components/Quiz/engagement/`

## Design Tokens

**Colors (Light/Dark):**
- Primary: #6366F1 / #818CF8
- Background: #FFFFFF / #0F172A
- Surface: #F8FAFC / #1E293B

**Typography:** Inter font, 600 weight headings, 400 weight body

**Key Dimensions:**
- Mic button: 64px circle
- Touch targets: min 44px
- Image container: 16:9 aspect ratio
- Desktop max-width: 800px
