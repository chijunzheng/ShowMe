# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
