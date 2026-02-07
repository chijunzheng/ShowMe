# ShowMe

A child speaks a question. Gemini 3 turns it into narrated slides, detective cases, what-if predictions, and branching stories — a complete learning journey in seconds. Voice-first, for every child.

## What is ShowMe?

ShowMe is a **fully AI-native** voice-first educational platform. There is zero static content — every slide, diagram, narration, mystery, story, and game mode is generated on-demand by Gemini.

A child speaks a question like *"What is Gemini 3?"* and within 30 seconds, Gemini generates a narrated visual slideshow with AI-illustrated diagrams. Then three interactive game modes turn passive content into active exploration:

- **Mystery Lab** — Gemini generates a detective case from the lesson. Kids scan crime scenes for clues, interview AI witnesses, rebuild timelines, and draft arrest warrants.
- **Wonder Lab** — Kids predict "what if" outcomes. Gemini generates illustrated consequence reveals with narration.
- **Story Studio** — Kids choose branching story paths while Gemini illustrates each chapter as a manga-style comic.

Each mode is architecturally independent and pluggable — new AI-native modes can be added without touching existing ones.

## Gemini Models Used

| Model | Purpose |
|---|---|
| `gemini-3-flash-preview` | Speech-to-text, script generation, mystery/what-if/story content, Socratic Q&A |
| `gemini-3-pro-image-preview` | Educational diagrams, crime scenes, consequence reveals, manga story illustrations |
| `gemini-2.5-pro-preview-tts` | Slide narration, game mode narration, story read-aloud |
| `gemini-2.5-flash-lite` | Topic classification, knowledge graph operations, category clustering, gap discovery |

**Fallback chains:**
- Image: `gemini-3-pro-image-preview` → `gemini-2.5-flash-image`
- TTS: `gemini-2.5-pro-preview-tts` → `gemini-2.5-flash-preview-tts` → `gemini-2.5-flash-tts` (Cloud)

## Architecture

```
Voice ──▶ STT ──▶ Script ──┬──▶ Images (Gemini 3 Pro Image)
        (1-2s)    (2-4s)   ├──▶ TTS (Gemini 2.5 Pro TTS)      ──▶ Slideshow
                            └──▶ Assembly
                  Total target: < 30 seconds

                            ┌──▶ Mystery Lab (8-state machine)
        Slideshow ──▶ Mode ─┼──▶ Wonder Lab (6-state machine)
                    Selector└──▶ Story Studio (12-state machine)

        All topics ──▶ Knowledge Constellation (AI-powered graph)
```

## Features

- **Voice-first** — No reading required. Pre-literate children can learn independently.
- **Three difficulty levels** — Simple (ages 6-9), Standard (9-14), Deep (14+). Same topic can be re-generated at different complexity levels.
- **Bilingual** — English + Simplified Chinese. Ask in Chinese, everything generates in Chinese.
- **Knowledge Constellation** — AI-powered knowledge graph. Gemini discovers topic relationships, identifies gaps via the Discover button, and suggests learning paths. Categories are color-coded; suggested topics appear as transparent dots with dashed outlines.
- **Gamification** — XP, streaks, trophies, explorer ranks, and concept mastery tracking across game modes.
- **30-second pipeline** — Parallel generation (images + TTS) with resilient fallback chains.
- **Bloom's Taxonomy progression** — Slideshow (Remember/Understand) → Mystery Lab (Analyze/Evaluate) → Wonder Lab (Apply/Evaluate) → Story Studio (Create).
- **Cloud persistence** — Constellation, game history, and stories persist via Firestore + GCS on Google Cloud Run.

## Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, Web Audio API, WebSocket

**Backend:** Node.js, Express, deployed on Google Cloud Run with Firestore + GCS

**AI:** Gemini 3 Flash, Gemini 3 Pro Image, Gemini 2.5 Pro TTS, Gemini 2.5 Flash-lite

## Getting Started

### Prerequisites

- Node.js 18+
- A [Gemini API key](https://ai.google.dev/)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd ShowMe

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Configure environment
# Backend: create backend/.env
GEMINI_API_KEY=your_api_key_here

# Frontend: create frontend/.env
VITE_API_URL=http://localhost:3000
```

### Run

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3000`.

### Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## Project Structure

```
frontend/src/
├── components/
│   ├── LearnModes/
│   │   ├── Mystery/          # Mystery Lab (8-state machine)
│   │   ├── WhatIf/           # Wonder Lab (6-state machine)
│   │   └── Story/            # Story Studio (12-state machine)
│   ├── Constellation/        # Knowledge graph visualization
│   ├── Dashboard/            # Stats, trophies, progress
│   └── ProgressTab/          # Journey tab with constellation
├── hooks/
│   ├── game/                 # Gamification config and hooks
│   └── useKnowledgeGraph.js  # Knowledge graph data hook
└── styles/

backend/src/
├── routes/
│   ├── generate.js           # Slideshow generation
│   ├── learn.js              # Mystery, What-If, Story endpoints
│   ├── graph.js              # Knowledge graph operations + persistence
│   ├── modes.js              # Game mode session persistence
│   └── ...
└── services/
    ├── gemini.js             # Core AI pipeline (28 functions)
    ├── geminiGraph.js        # Knowledge graph AI operations
    ├── mysteryGenerator.js   # Mystery Lab scenario + evidence normalization
    └── ...
```

## License

MIT
