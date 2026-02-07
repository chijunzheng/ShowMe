# ShowMe — Technical Architecture Report

## Overview

ShowMe is a fully AI-native, voice-first educational platform where every piece of content — slides, diagrams, narration, detective mysteries, what-if scenarios, branching stories, and knowledge graphs — is generated on-demand by Gemini. There is zero static content. The system is built on four Gemini models orchestrated across a React frontend and a stateless Node.js backend, connected via REST API and WebSocket.

## System Architecture

The platform is structured in three layers: a React frontend handling voice capture and interactive UI, a stateless Express backend orchestrating AI calls, and the Gemini API layer providing multimodal generation.

### Frontend (React 18 + Vite + Tailwind)

The frontend is a single-page application with five major subsystems:

- **Voice Input** — Uses the Web Audio API and MediaRecorder to capture speech. Audio is streamed to the backend for transcription via `gemini-3-flash-preview`. A text input fallback ("can't talk? type here") is also available.
- **Slideshow Viewer** — Renders AI-generated slides with synchronized image display and TTS audio playback. As shown in the screenshot below, each slideshow is organized into navigable chapters with progress dots, accompanied by narration text and playback controls. The sidebar lists all explored topics (with AI-generated emoji icons) and displays the child's XP progress toward the next explorer rank.
- **Game Modes** — Three independent, pluggable game modes, each implemented as a self-contained state machine:
  - **Mystery Lab** (8 states): LOADING → BRIEFING → SCENE_SCAN → WITNESS_ROOM → TIMELINE_REBUILD → WARRANT_DECISION → REVEAL → CELEBRATION
  - **Wonder Lab** (6 states): LOADING → SCENE_INTRO → PREDICT → GENERATING_REVEALS → REVEAL → RESULTS
  - **Story Studio** (12 states): LOADING → INTRO → CHAPTER_1 → ILLUSTRATING_1 → CHAPTER_2 → ILLUSTRATING_2 → CHAPTER_3 → ILLUSTRATING_3 → FINALIZING → PLAYBACK → SHARE → ERROR. Supports a batch generation mode where all three chapter illustrations are generated in a single FINALIZING phase, reducing API calls and improving reliability.
- **Knowledge Constellation** — An interactive graph visualization that renders learned topics as stars, AI-discovered relationships as edges, and category clusters as colored regions. Supports pan, zoom, and node selection.
- **Gamification Engine** — XP tracking, streak counters, trophies, and explorer rank badges earned through game mode completion.

Real-time generation progress is delivered via WebSocket, giving users immediate feedback during the 20-30 second generation pipeline.

### Backend (Node.js + Express, deployed on Cloud Run)

The backend runs on Google Cloud Run and persists data to **Firestore** and **Google Cloud Storage**. Generated slides, knowledge graph state, completed game mode sessions, and story data are stored per anonymous user via a stable client ID — ensuring a child's constellation, XP, and game history persist across devices and sessions without requiring account creation.

It exposes REST API endpoints across the following route groups:

- `/generate` — Slideshow generation, follow-ups, engagement content
- `/transcribe` — Speech-to-text via Gemini 3 Flash
- `/learn/*` — Mystery, What-If, and Story generation and evaluation
- `/graph/*` — Knowledge graph operations (discover, categorize, cluster, gap analysis, placement, pathfinding) and cloud state persistence
- `/modes/*` — Game mode session persistence (save completed runs, retrieve history)
- `/topic/*` — Topic naming, classification, and suggestions

The service layer contains the core AI orchestration logic:

- **gemini.js** (3,700+ lines, 28 exported functions) — The primary generation pipeline. Handles script generation, image generation, TTS, What-If scenario generation, Story chapter generation, Socratic Q&A, topic classification, and engagement content. This is the backbone of the platform.
- **geminiGraph.js** (400+ lines) — Knowledge graph AI operations. Uses `gemini-2.5-flash-lite` to discover topic relationships, determine category clustering, identify knowledge gaps, and compute optimal learning paths.
- **mysteryGenerator.js** (1,100+ lines) — Mystery Lab scenario generation and a robust evidence normalization pipeline. Generates crime scenes, witnesses, timelines, and verdicts from lesson content, then validates that evidence chains are logically consistent, cross-references witness statements, and guarantees solvability.
- **userProgress.js** — Badge and XP tracking, explorer rank calculation.
- **connectionScene.js** — Generates visual scenes depicting relationships between learned topics.

### Gemini API Layer

ShowMe uses four Gemini models, each chosen for its strengths:

| Model | Role | Why This Model |
|---|---|---|
| `gemini-3-flash-preview` | Text generation, speech-to-text | Fast inference for real-time STT; strong structured output for scripts, mysteries, stories, and what-if scenarios |
| `gemini-3-pro-image-preview` | Image generation | High-quality educational diagrams, crime scene illustrations, consequence reveals, and story chapter art |
| `gemini-2.5-pro-preview-tts` | Text-to-speech | Natural-sounding narration for slides, mystery briefings, consequence reveals, and story chapters |
| `gemini-2.5-flash-lite` | Classification, graph operations | Ultra-fast inference for high-frequency operations: topic classification, graph relationship discovery, gap analysis, complexity detection |

**Fallback chains** ensure resilience:
- Image: `gemini-3-pro-image-preview` → `gemini-2.5-flash-image`
- TTS: `gemini-2.5-pro-preview-tts` → `gemini-2.5-flash-preview-tts` → `gemini-2.5-flash-tts` (Cloud TTS API)

## Generation Pipeline

![Slideshow Viewer](screenshots/slideshow.png)

The screenshot shows the result of asking "Google Gemini API" — a 6-chapter narrated slideshow with AI-generated diagrams and conversational narration. The first slide introduces the Gemini API as "a brain in a box" connecting laptops, smartphones, and servers, with narration that explains the concept in an engaging, age-appropriate tone. The child can navigate chapters, pause/play narration, and switch between difficulty versions — note the "Standard" and "Deep" version tabs, allowing the same topic to be re-generated at a different complexity level. The sidebar shows 17 explored topics with AI-generated emoji icons, and an XP progress bar tracking toward the next explorer rank. Every element — the diagram, narration, chapter structure, topic emoji, and difficulty adaptation — was generated by Gemini with zero static content.

The core generation pipeline converts a spoken question into a complete narrated slideshow:

```
Voice ──▶ STT (1-2s) ──▶ Script (2-4s) ──┬──▶ Images (5-10s)
                                           ├──▶ TTS (3-5s)       ──▶ Slideshow
                                           └──▶ Assembly (1s)
                                Total target: < 30 seconds
```

**Sequential phase:** Voice → STT → Script generation. These must run in order because each depends on the previous output.

**Parallel phase:** Once the script is generated, image generation and TTS run simultaneously. Each slide's diagram and narration audio are generated in parallel, cutting total time nearly in half compared to sequential execution.

**Assembly:** Slides are packaged with their corresponding images and audio, then delivered to the frontend for playback.

Running this pipeline sequentially would take 60+ seconds. Parallelizing the image and TTS phases brings it under 30 seconds consistently.

## Game Mode Architecture

The slideshow delivers foundational knowledge — **Remember** and **Understand** in Bloom's Taxonomy. The three game modes then push children up into higher-order thinking, each targeting a different cognitive level:

### Mystery Lab — Analyze & Evaluate

![Mystery Lab — Briefing](screenshots/mystery-briefing.png)
![Mystery Lab — Crime Scene Scan](screenshots/mystery-scene-scan.png)

Mystery Lab transforms lesson content into a detective investigation. Gemini generates a crime scenario where the "evidence" is grounded in concepts from the slideshow. In the screenshots above, the topic "Google Gemini API" becomes *"The Case of the Muddled Masterpiece"* — a digital artist's multimodal AI project has been sabotaged, and the child must investigate using their knowledge of API concepts. The AI-generated crime scene illustration shows the actual system architecture (Multimodal Data Input, API Gateway, Connection Bridge) as the "scene" to investigate. The child must:

1. **Scan a crime scene** for clues — tapping suspicious hotspots to uncover evidence. Each clue encodes a lesson concept: "Telemetry logs show Multimodality drifted out of its safe range" and "Console records capture a sharp API Request/Response Flow spike" require the child to recognize API concepts they just learned.
2. **Interview AI witnesses** — each witness offers a different perspective, and their statements may contradict each other, forcing the child to cross-reference what they learned
3. **Rebuild a timeline** — sequence events in logical order, requiring causal reasoning about the topic
4. **Draft an arrest warrant** — write a theory explaining what happened, synthesizing all evidence

This targets **Analyze** (breaking information into parts, finding patterns in evidence) and **Evaluate** (judging which evidence matters, deciding if a theory holds up). The child can't just recall facts — they must weigh conflicting information and defend a conclusion.

### Wonder Lab — Apply & Evaluate

![Wonder Lab](screenshots/wonder-lab.png)

Wonder Lab presents counterfactual scenarios derived from the lesson. In the screenshot above, the topic "Google Gemini API" becomes: *"What if the Gemini API lost its multimodality, becoming strictly text-based, but its context window became truly infinite?"* The child must:

1. **Read the scenario** — understand the hypothetical premise Gemini has constructed, accompanied by an AI-generated illustration depicting the concept (here, a manga-style diagram of unlimited context processing)
2. **Predict outcomes** — choose what they think would happen across two prediction cards, applying their knowledge to a novel situation
3. **View consequence reveals** — Gemini generates illustrated consequence cards with AI-generated diagrams and narrated explanations. In the screenshot, one reveal shows a medical API data flow diagram illustrating how "AI-driven medical diagnostic tools would stop working for imaging, as the API could no longer 'see' X-rays or MRIs." A green "You predicted this!" badge appears when the child's prediction was correct.

This targets **Apply** (using knowledge in a new, unfamiliar context) and **Evaluate** (judging plausibility, comparing their prediction against the actual consequence). The prediction-then-reveal loop creates a powerful learning moment — children remember concepts better when they've committed to a prediction first.

### Story Studio — Create

![Story Studio — Mission & Ingredients](screenshots/story-mission.png)
![Story Studio — Playback](screenshots/story-playback.png)

Story Studio is the highest level of Bloom's Taxonomy. The child builds an original narrative using concepts from the lesson:

1. **Receive a story mission** — Gemini sets a narrative premise and presents **Story Ingredients** — the lesson concepts the child should weave into their story. In the screenshot, the topic "Google Gemini API" becomes: *"You've just unlocked a secret door to the world's smartest AI brain. Use your new multimodal powers and giant memory to turn your everyday gadgets into super-tools and save the day!"* The ingredients — API Door, Multimodal, Context Window, Request & Response — are displayed as cards with kid-friendly descriptions (e.g., Context Window: "A giant memory that lets the AI read thousands of pages without forgetting a single detail").
2. **Make chapter choices** — at each of three chapters, the child picks from AI-generated story paths, each incorporating different lesson concepts into the narrative
3. **Watch Gemini illustrate** — each chapter choice triggers Gemini 3 Pro Image to generate a 4-panel manga-style illustration. The playback screenshots show three completed chapters: *"The Secret Key to Sparky's Brain"* (Leo discovers an API door to upgrade his robot), *"The Secret Code Request"* (Leo sends a request and gets a response), and *"The Great Treehouse Rescue"* (Sparky uses multimodal powers to find hidden clues). Each panel is AI-generated with consistent character art across all chapters.
4. **Review and share** — the completed 3-chapter story tracks concept coverage (4 Concepts Used) and awards a mastery badge. A "Read Aloud" button triggers Gemini TTS to narrate the story. Children can share their illustrated story or create another one.

This targets **Create** (producing something new that demonstrates understanding). The child isn't regurgitating facts — they're constructing a narrative that only works if they understand the underlying concepts well enough to use them in context.

### Bloom's Taxonomy Progression

```
                    ┌─────────┐
                    │ CREATE  │  Story Studio
                    ├─────────┤  (produce original narratives)
                    │EVALUATE │  Mystery Lab + Wonder Lab
                    ├─────────┤  (judge evidence, assess predictions)
                    │ ANALYZE │  Mystery Lab
                    ├─────────┤  (examine clues, find patterns)
                    │  APPLY  │  Wonder Lab
                    ├─────────┤  (predict outcomes in new contexts)
                    │UNDERSTAND│  Slideshow
                    ├─────────┤  (explain concepts)
                    │REMEMBER │  Slideshow
                    └─────────┘  (recall facts)
```

The slideshow provides the foundation. Each game mode then exercises progressively higher cognitive skills — from analyzing evidence, to evaluating predictions, to creating original work. A child who completes all three modes on a topic has engaged with the material across the full spectrum of Bloom's Taxonomy.

### Technical Pattern

Each game mode follows the same architectural pattern:

1. **Input:** Takes lesson slides and topic name from the completed slideshow
2. **Generation:** Calls Gemini to generate mode-specific content (mystery scenario, what-if predictions, story chapters)
3. **State Machine:** Frontend manages mode progression through a `useReducer` state machine
4. **Two-Phase Loading:** Some modes (Wonder Lab, Story Studio) use a two-phase generation strategy — load the initial scenario first, then generate reveal assets (images + TTS) after user interaction, hiding generation time behind gameplay

Story Studio additionally supports a **batch generation mode** where all chapter illustrations are generated in a single API call during the FINALIZING phase, rather than one-by-one after each chapter choice. This reduces the number of round-trips and improves reliability under rate limits.

The modes are architecturally independent. Each is a self-contained module that takes lesson content as input and produces a completely different interactive experience. This design means new AI-native game modes can be added without modifying existing ones.

## Knowledge Constellation

![Knowledge Constellation](screenshots/constellation.png)

The Knowledge Constellation is an AI-powered knowledge graph with no hardcoded curriculum. The screenshot above shows a child's constellation after exploring 17 topics across 8 categories. None of the relationships or category assignments were manually defined — Gemini discovered them all.

1. **Topic Placement:** When a child asks a question, `gemini-2.5-flash-lite` classifies the topic and determines where it attaches in the existing graph. For example, asking about "Satellite Orbit" automatically places it near "General Relativity" and "Event Horizon" because Gemini recognizes the gravitational physics connection.
2. **Relationship Discovery:** Gemini discovers semantic connections between topics and renders them as dashed-line edges in the graph. In the screenshot, lines connect "General Relativity" → "Event Horizon" → "Black Hole Fall" → "Gravitational Lensing", forming a coherent physics knowledge chain. Cross-domain connections also emerge — "Jellyfish Brains" connects to both "Bioluminescence" (biology) and "Marine Exploration" (ocean science), showing how the graph captures interdisciplinary relationships.
3. **Category Clustering:** Topics are automatically grouped by subject area, and each category is instantly identifiable by color. The expanded legend in the screenshot shows all 8 AI-assigned categories: Artificial Intelligence (cyan), Arts (pink), Astronomy (green), Biology (blue), Geography (teal), Marine Biology (dark teal), and Physics (yellow-green). As the child explores new domains, new categories appear automatically.
4. **Gap Discovery:** The "Discover" button triggers Gemini to analyze the existing graph and suggest missing knowledge between connected topics. Suggested topics appear as **transparent dots with dashed outlines** — visually distinct from solid learned-topic stars — so the child can immediately see where gaps exist and what to explore next. For example, if a child has learned "Machine Learning" and "Reinforcement Learning" but not "Neural Networks", Gemini suggests it as a gap, rendered as a ghosted node connected to both existing topics.
5. **Learning Paths:** The graph computes optimal paths from current knowledge to target topics, using edge relationships to suggest the most natural learning sequence.

Every child's constellation is unique — it reflects what they've asked, how topics relate to each other, and where their knowledge gaps are.

## Bilingual Support

The entire platform supports English and Simplified Chinese. Language detection uses character-level analysis (`/[\u4E00-\u9FFF]/g`). When Chinese is detected, all downstream generation — scripts, image labels, TTS (using `cmn-CN` locale), mystery scenarios, and story chapters — generates in Chinese. No separate content pipeline exists; the same Gemini calls produce both languages.

## Adaptive Difficulty

Three explanation levels adjust the experience across every feature:

| | Simple (ages 6-9) | Standard (ages 9-14) | Deep (ages 14+) |
|---|---|---|---|
| Language | Short sentences, simple words | Balanced complexity | Technical vocabulary |
| Game mode XP | Lower base XP | Moderate base XP | Higher base XP |
| Slide complexity | Fewer slides, simpler diagrams | Balanced detail | In-depth with technical diagrams |
| Mystery clues | More clues, simpler evidence | Balanced | Fewer clues, complex evidence chains |

## Gemini Usage Summary

| Gemini Feature | Model | What It Powers | Scale |
|---|---|---|---|
| Speech-to-Text | gemini-3-flash-preview | Voice query transcription | 1 endpoint |
| Text Generation | gemini-3-flash-preview | Scripts, mysteries, what-ifs, stories, Socratic Q&A | 15+ functions |
| Image Generation | gemini-3-pro-image-preview | Diagrams, learn mode scenes, consequence reveals | 5+ functions |
| Text-to-Speech | gemini-2.5-pro-preview-tts | Slide narration, mode narration, feedback | All content |
| Fast Inference | gemini-2.5-flash-lite | Classification, graph ops, topic naming | 10+ functions |
| Bilingual | All models | English + Simplified Chinese | All features |
