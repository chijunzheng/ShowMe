# ShowMe Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SHOWME ARCHITECTURE                              │
│                   Voice-First AI Learning Platform                       │
└─────────────────────────────────────────────────────────────────────────┘

┌─ FRONTEND (React 18 + Vite + Tailwind) ─────────────────────────────────┐
│                                                                          │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────────────────┐   │
│  │  Voice    │   │  Slideshow   │   │      Learn Modes               │   │
│  │  Input    │──▶│  Viewer      │──▶│  ┌──────────┐ ┌────────────┐  │   │
│  │ (WebAudio)│   │ (Image+TTS)  │   │  │Mystery   │ │Wonder Lab  │  │   │
│  └──────────┘   └──────────────┘   │  │Lab (8st) │ │(6-state)   │  │   │
│       │                             │  └──────────┘ └────────────┘  │   │
│       │                             │  ┌──────────┐                 │   │
│       │          ┌──────────────┐   │  │Story     │                 │   │
│       │          │ Constellation│   │  │Studio    │                 │   │
│       │          │ (Knowledge   │   │  │(11-state)│                 │   │
│       │          │  Graph Viz)  │   │  └──────────┘                 │   │
│       │          └──────────────┘   └────────────────────────────────┘   │
│       │                                                                  │
│       │                             ┌────────────────────────────────┐   │
│       │                             │ Gamification Engine            │   │
│       │                             │ XP, Streaks, Boss Battles,    │   │
│       │                             │ Rarity, Mystery Boxes, Badges  │   │
│       ▼                             └────────────────────────────────┘   │
│  WebSocket ◄─── Real-time generation progress updates                    │
└──────────┬───────────────────────────────────────────────────────────────┘
           │  REST API + WebSocket
           ▼
┌─ BACKEND (Node.js + Express) ───────────────────────────────────────────┐
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    API ROUTES (49 endpoints)                     │    │
│  │  /generate  /transcribe  /learn/*  /graph/*  /topic/*          │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
│                              │                                           │
│  ┌───────────────────────────▼──────────────────────────────────────┐   │
│  │                   SERVICE LAYER                                   │   │
│  │                                                                   │   │
│  │  gemini.js          │ geminiGraph.js     │ mysteryGenerator.js   │   │
│  │  (3700+ lines)      │ (400+ lines)       │ (1100+ lines)        │   │
│  │  Core generation    │ Knowledge graph    │ Mystery Lab          │   │
│  │  pipeline (28 fns)  │ AI operations      │ scenario gen +       │   │
│  │  + What-If & Story  │                    │ evidence normalizer  │   │
│  │                     │                    │                       │   │
│  │  userProgress.js    │ connectionScene.js  │                       │   │
│  │  Badges & XP        │ Topic connections   │                       │   │
│  └──────────────────────┴────────────────────┴──────────────────────┘   │
└──────────┬───────────────────────────────────────────────────────────────┘
           │
           ▼
┌─ GEMINI 3 API LAYER ────────────────────────────────────────────────────┐
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────┐  │
│  │  gemini-3-flash-    │  │ gemini-3-pro-image- │  │ Gemini TTS     │  │
│  │  preview            │  │ preview             │  │ (2.5-pro-      │  │
│  │                     │  │ (Nano Banana Pro)   │  │  preview-tts)  │  │
│  │  - Speech-to-Text   │  │                     │  │                │  │
│  │  - Script Gen       │  │  - Educational      │  │  - Slide       │  │
│  │  - Mystery Gen      │  │    diagrams         │  │    narration   │  │
│  │  - What-If Gen      │  │  - Learn mode scenes │  │  - Mystery     │  │
│  │  - Story Gen        │  │  - Consequence       │  │    briefings   │  │
│  │  - Socratic Q&A     │  │    reveals          │  │  - What-If     │  │
│  │  - Classification   │  │  - Story scenes     │  │    reveals     │  │
│  │  - Topic naming     │  │                     │  │  - Story       │  │
│  │                     │  │                     │  │    chapters    │  │
│  └─────────────────────┘  └─────────────────────┘  └────────────────┘  │
│                                                                          │
│  ┌─────────────────────┐                                                │
│  │ gemini-2.5-flash-   │   GENERATION PIPELINE (per question):         │
│  │ lite                │                                                │
│  │                     │   Voice ──▶ STT ──▶ Script ──┬──▶ Images     │
│  │  - Topic classify   │          (1-2s)    (2-4s)   │   (5-10s)     │
│  │  - Graph relations  │                              ├──▶ TTS        │
│  │  - Knowledge gaps   │                              │   (3-5s)      │
│  │  - Learning paths   │                              └──▶ Assembly   │
│  │  - Complexity det.  │                    Total target: < 30 seconds │
│  └─────────────────────┘                                                │
│                                                                          │
│  Fallback: gemini-3-pro-image → gemini-2.5-flash-image                 │
│  TTS: 2.5-pro-tts → 2.5-flash-preview-tts → 2.5-flash-tts (Cloud)    │
└──────────────────────────────────────────────────────────────────────────┘
```

## Gemini 3 Features Used (Summary Table)

| Gemini Feature | Model | What It Powers | Count |
|---|---|---|---|
| Speech-to-Text | gemini-3-flash-preview | Voice query transcription | 1 endpoint |
| Text Generation | gemini-3-flash-preview | Scripts, mysteries, what-ifs, stories, Socratic Q&A | 15+ functions |
| Image Generation | gemini-3-pro-image-preview | Diagrams, learn mode scenes, consequence reveals | 5+ functions |
| Text-to-Speech | gemini-2.5-pro-preview-tts | Slide narration, mode narration, feedback | All content |
| Fast Inference | gemini-2.5-flash-lite | Classification, graph ops, topic naming | 10+ functions |
| Bilingual | All models | English + Simplified Chinese support | All features |
