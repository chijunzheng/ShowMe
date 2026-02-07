# **App Specification: ShowMe**

A comprehensive specification for the ShowMe voice-activated educational explainer application.

---

## **Project Overview**

**Project Name:** ShowMe

**Description:**  
ShowMe is a voice-first educational app that transforms spoken questions into visual explanations. Users ask any question by voice, and the app generates an AI-created slideshow with custom diagrams, narration, and subtitles—delivering Khan Academy-style explanations in under 30 seconds.

**Target Users:**  
- Students (K-12 and university) seeking quick concept explanations
- Curious learners who prefer visual/audio learning
- Parents helping children with homework
- Anyone who learns better through visual explanations than reading

**Key Value Proposition:**  
Instant visual explanations for any question. No typing, no searching, no watching 10-minute videos for a simple concept. Just ask and watch.

---

## **Technology Stack**

### **Frontend**

| Component | Technology |
| ----- | ----- |
| Framework | React 18 with Vite |
| Styling | Tailwind CSS |
| State Management | React hooks + Context API |
| Routing | React Router (minimal - single page app) |
| Audio | Web Audio API + HTMLAudioElement |
| Microphone | MediaRecorder API / Web Speech API |
| Port | 5173 (development) |

### **Backend**

| Component | Technology |
| ----- | ----- |
| Runtime | Node.js with Express |
| Database | None required for MVP (stateless) |
| Authentication | None for MVP |
| Real-time | WebSocket for streaming generation status |

### **External Integrations**

| Service | Purpose |
| ----- | ----- |
| Gemini 3 Pro | Speech-to-text, script generation, topic classification |
| Nano Banana Pro (Gemini 3 Pro Image) | Educational diagram/infographic generation |
| Gemini TTS | Natural voice narration generation |
| Google Search Grounding | Fact-accurate diagram generation |

### **Environment Setup**

- Node.js 18+
- Google Cloud Project with Gemini API access
- HTTPS required for microphone access (use Vercel/Netlify for deploy)
- Environment variables:
  - `GEMINI_API_KEY` - API key for Gemini services
  - `VITE_API_URL` - Backend API URL

### **Deployment**

| Component | Platform |
| ----- | ----- |
| Frontend | Vercel (recommended) or Netlify |
| Backend | Vercel Serverless Functions or Railway |
| Alternative | Single Vercel deployment with API routes |

---

## **Core Features**

### **Voice Input**

- Always-on voice listening when app is active
- Visual waveform animation during listening
- Live transcription preview shows what the app is hearing
- Support for natural language questions ("How does photosynthesis work?", "Explain black holes", "Why is the sky blue?")
- Interrupt capability during slideshow playback
- Text input fallback below waveform (for when mic fails)

### **Cold Start Experience**

- Example questions displayed on first load
- Three clickable suggestions to guide users
- Pre-tested questions that produce great results
- Disappear after first question asked
- Help judges and new users know what to try

### **Slideshow Generation**

- AI-generated slide structure (3-6 slides per explanation)
- Custom diagram/infographic per slide via Nano Banana Pro
- Synchronized TTS narration per slide
- Auto-generated subtitles matching narration
- 15-30 second total generation time

### **Slideshow Playback**

- Auto-play on generation completion
- Manual swipe navigation (left/right)
- Play/pause control for auto-advance
- Audio restart on slide selection
- Progress indicator dots
- Persistent microphone access during playback

### **Follow-up Questions**

- Voice input available during/after playback
- Related questions append new slides to existing slideshow
- Unrelated questions append as new topic section
- Visual divider between question segments
- Topic header cards separate different topics
- Full navigation across all generated slides

### **Topic Management**

- All topics live in one continuous slideshow stream
- Topic header cards visually separate different subjects
- Maximum 3 topics retained at once
- Oldest topic auto-clears when 4th topic is asked
- User can swipe through entire learning session history
- Each topic maintains its own conversation context for follow-ups

### **Conversation Context**

- Maintains topic context for follow-ups within same topic
- Gemini classifies queries as "follow_up" or "new_topic"
- Follow-ups reference previous explanations naturally
- New topics start fresh context but preserve previous slides
- Topic context resets when that topic is auto-cleared

### **Loading Engagement**

- Fun fact related to user's question displays during generation
- Three suggested follow-up questions shown as tappable cards
- Tapping a suggestion adds it to question queue
- Queued questions auto-trigger after current slideshow completes
- Fun fact and suggestions generated in parallel (~1-2s) while slides generate
- Keeps users engaged during 15-30 second generation wait
- Primes users to explore topic more deeply

---

## **Database Schema**

*No persistent database for MVP - all state is session-based*

### **In-Memory Session State**

| Field | Type | Description |
| ----- | ----- | ----- |
| sessionId | string | Unique session identifier |
| slides | Slide[] | Array of all generated slides (all topics) |
| topics | Topic[] | Array of topics (max 3) |
| currentIndex | number | Currently displayed slide |
| isPlaying | boolean | Auto-play state |
| activeTopicId | string | Currently active topic for follow-ups |
| questionQueue | string[] | Queued follow-up questions from suggestions |
| currentEngagement | Engagement | Fun fact + suggestions for current generation |
| isColdStart | boolean | True until first question asked (shows examples) |
| liveTranscription | string | Current partial transcription while listening |

### **Example Questions (Hardcoded)**

```javascript
const EXAMPLE_QUESTIONS = [
  "How do black holes work?",
  "Why do we dream?",
  "How does WiFi work?"
];
```

These should be pre-tested to produce great diagrams and explanations.

### **Engagement Object**

| Field | Type | Description |
| ----- | ----- | ----- |
| funFact | object | { emoji: string, text: string } |
| suggestedQuestions | string[] | Three related questions |
| queuedIndices | number[] | Which suggestions user has tapped |

### **Topic Object**

| Field | Type | Description |
| ----- | ----- | ----- |
| id | string | Unique topic identifier |
| name | string | Display name (e.g., "How the Heart Works") |
| startIndex | number | First slide index for this topic |
| endIndex | number | Last slide index for this topic |
| conversationHistory | Message[] | Context for follow-ups within topic |
| createdAt | number | Timestamp for LRU eviction |

### **Slide Object**

| Field | Type | Description |
| ----- | ----- | ----- |
| id | string | Unique slide identifier |
| topicId | string | Parent topic identifier |
| imageUrl | string | Generated diagram URL (base64 or hosted) |
| audioUrl | string | TTS audio URL (base64 or hosted) |
| subtitle | string | Full narration text |
| duration | number | Audio duration in seconds |
| segmentId | string | Groups slides by question within topic |
| isTopicHeader | boolean | True if this is a topic divider card |

### **Message Object**

| Field | Type | Description |
| ----- | ----- | ----- |
| role | "user" \| "assistant" | Message sender |
| content | string | Question or summary |
| timestamp | number | Unix timestamp |

---

## **API Endpoints**

### **Generation**

| Method | Endpoint | Description |
| ----- | ----- | ----- |
| POST | `/api/generate` | Generate slideshow from text query |
| POST | `/api/generate/follow-up` | Generate appended slides with context |
| POST | `/api/generate/engagement` | Generate fun fact + suggested questions (fast) |
| POST | `/api/classify` | Classify query as follow_up or new_topic |
| POST | `/api/topic/header` | Generate topic header card (icon + name) |

### **Streaming**

| Method | Endpoint | Description |
| ----- | ----- | ----- |
| WS | `/ws/generation` | Real-time generation progress updates |

### **Request/Response Schemas**

#### POST `/api/generate`

**Request:**
```json
{
  "query": "How does photosynthesis work?",
  "topicId": "topic_1",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "slides": [
    {
      "id": "slide_1",
      "topicId": "topic_1",
      "imageUrl": "data:image/png;base64,...",
      "audioUrl": "data:audio/mp3;base64,...",
      "subtitle": "Photosynthesis is the process by which plants convert sunlight into energy...",
      "duration": 8.5,
      "segmentId": "seg_1",
      "isTopicHeader": false
    }
  ],
  "topic": {
    "id": "topic_1",
    "name": "How Photosynthesis Works",
    "icon": "🌱"
  },
  "segmentId": "seg_1"
}
```

#### POST `/api/classify`

**Request:**
```json
{
  "query": "What about at night?",
  "activeTopicId": "topic_1",
  "activeTopic": "photosynthesis",
  "conversationHistory": [...]
}
```

**Response:**
```json
{
  "classification": "follow_up",
  "reasoning": "Query relates to photosynthesis timing",
  "shouldEvictOldest": false
}
```

**Response (new topic, overflow):**
```json
{
  "classification": "new_topic",
  "reasoning": "Query about airplanes is unrelated to photosynthesis",
  "shouldEvictOldest": true,
  "evictTopicId": "topic_0"
}
```

#### POST `/api/generate/engagement`

**Request:**
```json
{
  "query": "How does the heart pump blood?"
}
```

**Response:**
```json
{
  "funFact": {
    "emoji": "💡",
    "text": "The human heart beats about 100,000 times per day — that's 35 million times a year!"
  },
  "suggestedQuestions": [
    "Why does heart rate increase during exercise?",
    "How do pacemakers work?",
    "What makes a heartbeat sound?"
  ]
}
```

**Latency:** ~1-2 seconds (returns while slides still generating)

---

## **UI Layout**

### **Main Structure - Three States**

#### State 1: Listening (Cold Start)
```
┌─────────────────────────────────────────┐
│                                         │
│         ∿∿∿ [Waveform] ∿∿∿              │
│                                         │
│          "Ask me anything..."           │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Or type your question here...    │  │  ← Text fallback
│  └───────────────────────────────────┘  │
│                                         │
│   Try asking:                           │
│   ┌─────────────────────────────────┐   │
│   │ "How do black holes work?"      │   │  ← Clickable
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │ "Why do we dream?"              │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │ "How does WiFi work?"           │   │
│   └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

#### State 1b: Listening (Active - With Transcription)
```
┌─────────────────────────────────────────┐
│                                         │
│         ∿∿∿ [Listening...] ∿∿∿          │
│                                         │
│   "How does photosynthesis..."          │  ← Live transcription
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Or type your question here...    │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

#### State 1c: Listening (Return User - No Examples)
```
┌─────────────────────────────────────────┐
│                                         │
│         ∿∿∿ [Waveform] ∿∿∿              │
│                                         │
│          "Ask me anything..."           │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Or type your question here...    │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

#### State 2: Generating (Desktop)
```
┌─────────────────────────────────────────┐
│                                         │
│         [Animated Loader]               │
│                                         │
│    "Creating your explanation..."       │
│         [2/4 slides ready]              │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  💡 Did you know?                 │  │
│  │                                   │  │
│  │  The human heart beats about     │  │
│  │  100,000 times per day — that's  │  │
│  │  35 million times a year!        │  │
│  └───────────────────────────────────┘  │
│                                         │
│  You might also wonder...               │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Why does heart rate increase    │    │
│  │ during exercise?            [+] │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ How do pacemakers work?     [+] │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ What makes a heartbeat sound?[+]│    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

#### State 2: Generating (Mobile)
```
┌───────────────────────┐
│                       │
│   [Animated Loader]   │
│                       │
│ "Creating your        │
│  explanation..."      │
│    [2/4 slides]       │
│                       │
│ ┌───────────────────┐ │
│ │ 💡 Did you know?  │ │
│ │                   │ │
│ │ The human heart   │ │
│ │ beats 100,000     │ │
│ │ times per day...  │ │
│ └───────────────────┘ │
│                       │
│ You might also wonder │
│                       │
│ ◀ [Card 1] [Card 2] ▶ │  ← Horizontal scroll
│                       │
│        [🎤]           │  ← Fixed bottom
└───────────────────────┘
```

#### State 3: Slideshow
```
┌─────────────────────────────────────────┐
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │                                   │  │
│  │        [Diagram/Image]            │  │
│  │                                   │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  "The Earth orbits the sun in an..."    │
│                                         │
│    ◀   ● ● ● │ ○ ○   ▶      ▶❚❚        │
│                                         │
│              [🎤]                       │
└─────────────────────────────────────────┘
```

#### State 3b: Topic Header Card (between topics)
```
┌─────────────────────────────────────────┐
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │      ✈️                           │  │
│  │                                   │  │
│  │    How Airplanes Fly              │  │
│  │                                   │  │
│  │    ──────────────────             │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Swipe to continue →                    │
│                                         │
│  ● ● ● [●] ○ ○ ○                        │
│                                         │
│              [🎤]                       │
└─────────────────────────────────────────┘
```

### **Responsive Breakpoints**

| Breakpoint | Layout |
| ----- | ----- |
| Desktop (>1024px) | **Primary demo target** - Centered card layout, max-width 800px |
| Tablet (640-1024px) | Centered content with padding, same flow |
| Mobile (<640px) | Full-width, touch-friendly sizing, fixed mic button |

### **Mobile Adaptations**

- Viewport meta tag for proper scaling
- Touch targets minimum 44px
- Mic button fixed to bottom of screen
- Suggestions scroll horizontally (not stacked)
- Keyboard shortcut hints hidden
- Navigation arrows larger for touch

### **Slideshow Components**

- **Image Container:** 16:9 aspect ratio, rounded corners, subtle shadow
- **Subtitle Area:** Below image, 2-3 lines max, auto-scroll for long text
- **Progress Dots:** Horizontal, clickable, visual divider for segments
- **Controls:** Play/pause button, navigation arrows, mic button
- **Keyboard Navigation:** Left/Right arrows, Space for play/pause (desktop only)
- **Touch Navigation:** Swipe left/right on slideshow (mobile)
- **Mic Button:** Fixed position bottom-center, pulsing when listening
- **Click/Drag:** Click arrows or drag slideshow to navigate

### **Overlays/Modals**

- **Error Modal:** Network/generation failures with retry option
- **Timeout Modal:** "Still working..." for long generations (>45s)

---

## **Design System**

### **Color Palette**

| Role | Light Mode | Dark Mode |
| ----- | ----- | ----- |
| Primary | #6366F1 (Indigo) | #818CF8 |
| Background | #FFFFFF | #0F172A |
| Surface | #F8FAFC | #1E293B |
| Text | #0F172A | #F8FAFC |
| Text Secondary | #64748B | #94A3B8 |
| Border | #E2E8F0 | #334155 |
| Accent | #10B981 (Green) | #34D399 |
| Error | #EF4444 | #F87171 |
| Success | #22C55E | #4ADE80 |

### **Typography**

| Element | Style |
| ----- | ----- |
| Font Family | Inter, system-ui, sans-serif |
| Headings | 600 weight, 1.5rem - 2rem |
| Body/Subtitles | 400 weight, 1.125rem, 1.6 line-height |
| Status Text | 500 weight, 0.875rem |

### **Components**

#### **Mic Button**
- **Idle:** 64px circle, primary color, mic icon white
- **Listening:** Pulsing animation, waveform replaces icon
- **Disabled:** Grayed out during generation
- **Mobile:** Fixed position bottom-center (24px from bottom), with safe area padding

#### **Text Input Fallback**
- Position: Below waveform, centered
- Style: Subtle, secondary text color placeholder
- Border: 1px solid border color, rounded
- On focus: Border becomes primary color
- Submit: Enter key or submit button
- Purpose: Backup when mic fails during demo

#### **Example Question Cards**
- Display: Only on cold start (before first question)
- Style: Clickable pills/cards, surface background
- Hover: Background darken, cursor pointer
- Click: Triggers that question immediately
- Content: Pre-tested questions that produce great results
- Disappear: After first question is asked

#### **Live Transcription**
- Position: Below waveform, replaces "Ask me anything..."
- Style: Body text, slightly transparent (0.8 opacity)
- Animation: Text appears word-by-word or streaming
- Behavior: Shows partial transcription while user speaks
- Clear: Resets when generation starts

#### **Progress Dots**
- **Inactive:** 8px circle, border only
- **Active:** 8px circle, filled primary
- **Segment Divider:** 2px vertical line between dot groups

#### **Fun Fact Card**
- Background: Primary color at 10% opacity
- Border radius: 12px
- Padding: 16px
- Emoji: 24px, top-left
- Text: Body style, secondary text color
- Appears ~1s into generation (after engagement API returns)

#### **Suggestion Card**
- Background: Surface color
- Border: 1px solid border color
- Border radius: 8px
- Padding: 12px 16px
- Text: Body style, primary text color
- Right side: [+] icon (idle) or [✓] icon (queued)
- Click state: Brief scale down (0.98), icon swap
- Hover: Background slightly darker, cursor pointer
- **Mobile:** Min-width 280px, horizontal scroll container, snap scrolling

#### **Queue Toast**
- Position: Bottom center, above mic button
- Background: Surface color with shadow
- Border radius: 20px (pill shape)
- Text: "Queued: {truncated question}..."
- Auto-dismiss: 2 seconds
- Stacks if multiple tapped quickly

#### **Slide Image Container**
- Border radius: 12px
- Shadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1)`
- Background: Surface color (loading state)

#### **Topic Header Card**
- Full slide dimensions, centered content
- Large emoji/icon at top (auto-selected based on topic)
- Topic name in heading style (600 weight, 1.5rem)
- Horizontal divider line below
- Subtle gradient background (primary color at 5% opacity)
- No audio plays (silent card)
- "Swipe to continue →" hint text

#### **Subtitle Text**
- Max 3 lines visible
- Fade gradient at bottom if overflow
- Current word highlight (optional enhancement)

### **Animations**

- Transition duration: 200ms default, 300ms for slides
- **Waveform:** Continuous sine wave, amplitude responds to audio input
- **Slide transition:** Horizontal slide with fade
- **Mic pulse:** Scale 1.0 → 1.1 → 1.0, 1.5s duration, infinite
- **Loader:** Rotating gradient ring + slide count increment
- **Dot activation:** Scale pop (1.0 → 1.2 → 1.0)
- **Fun fact appear:** Fade in + slide up, 300ms, after engagement loads
- **Suggestion cards:** Stagger fade in (100ms delay each)
- **Suggestion tap:** Scale 0.98 → 1.0, icon swap with fade
- **Toast appear:** Slide up from bottom, fade in
- **Toast dismiss:** Fade out, slide down
- **Live transcription:** Fade in word-by-word or typing effect
- **Example questions:** Stagger fade in on cold start (150ms delay each)
- **Example questions exit:** Fade out when first question asked

---

## **Key User Flows**

### **Flow 1: First Question (Voice)**

1. User opens app → Cold start state with example questions
2. User speaks: "How does the heart pump blood?"
3. Live transcription shows: "How does the heart..."
4. User stops speaking → transcription finalizes
5. System shows generating state with progress
6. Example questions disappear (isColdStart = false)
7. System generates 4 slides (diagram + audio each)
8. Slideshow auto-plays from slide 1
9. User watches/listens through all slides
10. Returns to listening state (no examples, mic still visible)

### **Flow 1b: First Question (Text Fallback)**

1. User opens app → Cold start state with example questions
2. User clicks text input, types: "How does the heart pump blood?"
3. User presses Enter or clicks submit
4. System shows generating state with progress
5. Flow continues same as voice input

### **Flow 1c: First Question (Example Click)**

1. User opens app → Cold start state with example questions
2. User clicks "How do black holes work?"
3. Question immediately triggers generation
4. Flow continues same as voice input

### **Flow 2: Follow-up Question**

1. User is viewing slideshow (any slide)
2. User taps mic or just speaks: "What about the valves?"
3. System classifies as "follow_up"
4. System generates 2 new slides
5. New slides appended (slides 5-6)
6. Auto-jumps to slide 5, plays new content
7. User can swipe back to slides 1-4

### **Flow 3: New Topic**

1. User is viewing slideshow about the heart (slides 1-4)
2. User asks: "How do airplanes fly?"
3. System classifies as "new_topic"
4. Topic header card inserted as slide 5
5. New explanation slides appended (slides 6-9)
6. Auto-jumps to slide 5 (topic header), then plays new content
7. User can still swipe back to heart slides (1-4)
8. New topic becomes active context for follow-ups

### **Flow 4: Topic Overflow (4th Topic)**

1. User has 3 topics: Heart (1-4), Airplanes (5-9), Weather (10-14)
2. User asks: "How do computers work?"
3. System classifies as "new_topic"
4. Oldest topic (Heart) is evicted
5. Slides 1-4 removed, indices shift
6. New topic appended at end
7. User retains access to Airplanes, Weather, and Computers

### **Flow 5: Manual Navigation**

1. Slideshow auto-playing on slide 2
2. User presses Left arrow or clicks back button
3. Auto-play pauses
4. Slide 1 audio restarts from beginning
5. User presses Space or clicks play → auto-advance resumes
6. User presses Right arrow → jumps to slide 2, audio restarts
7. User can navigate across topic boundaries seamlessly

### **Flow 6: Question Queue from Suggestions**

1. User asks "How does the heart work?"
2. Loading screen shows fun fact + 3 suggestions
3. User clicks "How do pacemakers work?" → [+] becomes [✓]
4. Toast appears: "Queued: How do pacemakers work?"
5. User clicks another: "What makes a heartbeat sound?"
6. Slideshow finishes playing
7. System auto-triggers first queued question
8. New slides append as follow-up
9. After completion, next queued question triggers
10. User can speak or click mic to interrupt queue anytime

---

## **Generation Pipeline (Internal)**

### **Step 1: Speech-to-Text**
```
Input: Audio stream
Model: Gemini 3 Pro
Output: Transcribed question text
Latency: ~1-2s
```

### **Step 1.5: Engagement Content (Parallel)**
```
Input: Question text
Model: Gemini 3 Pro (fast, low token)
Output: Fun fact + 3 suggested questions
Latency: ~1-2s (runs in parallel with Step 2-3)
```

**Prompt Template:**
```
Given this question: "{query}"

Provide:
1. One surprising, fun, or mind-blowing fact related to this topic 
   (1-2 sentences, suitable for a curious learner)
2. Three follow-up questions the user might want to explore next
   (phrased as natural questions they might ask)

Output as JSON:
{
  "funFact": {
    "emoji": "💡",
    "text": "..."
  },
  "suggestedQuestions": ["...", "...", "..."]
}
```

### **Step 2: Script Generation**
```
Input: Question + conversation history
Model: Gemini 3 Pro
Output: Structured JSON
  - slides[]: { concept, diagramPrompt, narration }
  - topic: string
Latency: ~2-4s
```

**Prompt Template:**
```
You are an educational content creator. Given this question, create a 
slideshow explanation with 3-6 slides.

Question: {query}
Previous context: {conversationHistory}

For each slide, provide:
1. concept: The key idea for this slide
2. diagramPrompt: A detailed prompt for Nano Banana Pro to generate 
   an educational diagram. Be specific about layout, labels, arrows,
   and visual style. Request infographic style with clear text labels.
3. narration: Natural spoken explanation (2-3 sentences, ~8-15 seconds 
   when spoken)

Output as JSON:
{
  "topic": "main topic",
  "slides": [
    {
      "concept": "...",
      "diagramPrompt": "...",
      "narration": "..."
    }
  ]
}
```

### **Step 3: Parallel Generation**
```
For each slide (concurrent):
  - Nano Banana Pro: diagramPrompt → image
  - Gemini TTS: narration → audio + duration

Latency: ~5-10s (parallel, not sequential)
```

**Diagram Prompt Enhancement:**
```
Base prompt from script +
"Create an educational infographic style diagram. Use clear labels, 
arrows showing flow/relationships, and a clean white background. 
Text should be large and readable. Style: modern, minimalist, 
professional educational material."
```

### **Step 4: Assembly**
```
Combine: images + audio + subtitles
Calculate: total duration per slide
Package: response JSON
Latency: ~1s
```

**Total Pipeline: ~15-30 seconds**

---

## **Implementation Phases**

### **Phase 1: Foundation (Days 1-3)**

**Estimated Time:** 3 days

- [ ] Initialize React + Vite project with Tailwind
- [ ] Set up Express backend with Gemini SDK
- [ ] Implement `/api/generate` endpoint (text input only)
- [ ] Test Nano Banana Pro diagram generation
- [ ] Test Gemini TTS audio generation
- [ ] Basic response assembly

### **Phase 2: Core UI (Days 4-7)**

**Estimated Time:** 4 days

- [ ] Build three-state UI (Listening, Generating, Slideshow)
- [ ] Text input fallback component
- [ ] Example questions for cold start
- [ ] Implement slideshow carousel with swipe
- [ ] Add audio playback with slide sync
- [ ] Subtitle display component
- [ ] Progress dots with segment dividers
- [ ] Play/pause controls

### **Phase 3: Voice Integration (Days 8-11)**

**Estimated Time:** 4 days

- [ ] Integrate Gemini STT for voice input
- [ ] Live transcription preview (streaming partial results)
- [ ] Waveform visualization component
- [ ] Voice activity detection
- [ ] Mic button states and animations
- [ ] Voice during slideshow playback

### **Phase 4: Engagement Features (Days 12-14)**

**Estimated Time:** 3 days

- [ ] Implement `/api/generate/engagement` endpoint
- [ ] Fun fact card component with animation
- [ ] Suggestion cards with tap-to-queue
- [ ] Question queue state management
- [ ] Queue toast notifications
- [ ] Auto-trigger queued questions after slideshow

### **Phase 5: Follow-up Logic (Days 15-17)**

**Estimated Time:** 3 days

- [ ] Implement `/api/classify` endpoint
- [ ] Conversation history management
- [ ] Slide append logic
- [ ] Segment divider UI
- [ ] Context-aware generation prompts

### **Phase 6: Polish (Days 18-21)**

**Estimated Time:** 4 days

- [ ] Loading animations and progress feedback
- [ ] Error handling and retry logic
- [ ] Responsive design optimization
- [ ] Dark mode support
- [ ] Performance optimization (image compression, audio streaming)
- [ ] Edge case handling
- [ ] Mobile viewport meta tag
- [ ] Touch-friendly button sizes (min 44px tap targets)
- [ ] Fixed mic button positioning on mobile
- [ ] Horizontal scroll for suggestions on mobile
- [ ] Hide keyboard shortcut hints on touch devices
- [ ] Test on actual phone before demo

### **Phase 7: Demo Prep (Days 22-24)**

**Estimated Time:** 3 days

- [ ] Demo script preparation
- [ ] Test with diverse question types
- [ ] Record backup demo video
- [ ] Deployment to hosting platform
- [ ] Final bug fixes

---

## **Success Criteria**

### **Functionality**

- [ ] Voice input correctly transcribes questions
- [ ] Text input fallback works when mic fails
- [ ] Example questions trigger correctly on click
- [ ] Live transcription shows while speaking
- [ ] Diagrams are relevant and educational
- [ ] TTS audio is clear and well-paced
- [ ] Slideshow plays smoothly with sync
- [ ] Follow-ups correctly append slides within topic
- [ ] New topics append with header card
- [ ] Topic eviction works at 4th topic
- [ ] Navigation works across all topics
- [ ] Keyboard shortcuts work (arrows, space)

### **User Experience**

- [ ] End-to-end flow completes in <30 seconds
- [ ] UI state is always clear to user
- [ ] Manual navigation feels responsive
- [ ] Voice input works during playback
- [ ] No jarring transitions or loading flashes
- [ ] Fun fact appears within 2s of generation start
- [ ] Suggestion taps feel responsive with queue feedback
- [ ] Queued questions trigger smoothly after slideshow
- [ ] Usable on mobile Chrome (touch targets, scrolling)

### **Technical Quality**

- [ ] No crashes during demo
- [ ] Handles network errors gracefully
- [ ] Audio/image sync maintained
- [ ] Memory efficient (no leaks on long sessions)

### **Demo Impact**

- [ ] "Wow factor" in first 10 seconds
- [ ] Clear value proposition understood immediately
- [ ] Works reliably for 3+ consecutive queries
- [ ] Handles at least one follow-up question smoothly
- [ ] Example questions guide judges to best demos
- [ ] Text fallback available if voice fails
- [ ] Live transcription shows app is "listening"

---

## **Non-Functional Requirements**

### **Performance**

- Total generation time: <30 seconds
- UI state transition: <100ms
- Audio playback start: <200ms after slide display
- Swipe response: <50ms

### **Reliability**

- Handle Gemini API rate limits gracefully
- Retry logic for transient failures
- Timeout handling (>45s generation)
- Fallback messaging for API errors

### **Compatibility**

- Chrome 90+ Desktop (primary — demo target)
- Chrome 90+ Mobile (functional, touch-optimized)
- Edge 90+ (Chromium-based, should work)
- Firefox/Safari: Not prioritized for hackathon
- Requires microphone permissions (HTTPS or localhost)

---

## **Out of Scope (v1 / Hackathon)**

- Native mobile app (React Native / Flutter)
- Mobile-first design (responsive is sufficient)
- User accounts and saved slideshows
- Offline support
- Multiple language support
- Slide editing/customization
- Sharing/export functionality
- Voice selection for TTS
- Accessibility features (screen reader, captions download)
- Analytics and usage tracking
- Firefox/Safari optimization

---

## **Risk Mitigation**

| Risk | Mitigation |
| ----- | ----- |
| Nano Banana Pro generates poor diagrams | Pre-test prompts extensively, have fallback to simpler infographic style |
| Generation takes >45 seconds | Show granular progress, consider reducing to 3 slides max |
| Voice recognition fails in demo | **Text input fallback always visible**, example questions as backup |
| Judge doesn't know what to ask | **Example questions on cold start** guide to best demos |
| API rate limits during demo | Pre-warm API, have recorded backup video |
| Audio/slide desync | Calculate durations server-side, add buffer time |
| Mobile mic permissions fail | Test on actual phone before demo day, have desktop backup |

---

## **Demo Script (Suggested)**

*Demo runs in Chrome browser, fullscreen recommended*

1. **Open app** - Show clean cold start with example questions
2. **Point out:** "Users see suggested questions to get started"
3. **Click example:** "How do black holes work?" (proves click works)
4. **Wait state:** Point out fun fact + suggestions appearing
5. **Click suggestion:** "What about event horizons?" → show queue toast
6. **Watch:** Slideshow plays through 4-5 slides
7. **Auto follow-up:** Queued question triggers automatically
8. **Voice input:** Ask "How does WiFi work?" — show live transcription
9. **Show:** Topic header card appears, new slides play
10. **Keyboard nav:** Use arrow keys to go back, Space to pause
11. **Navigate:** Click back through slides - "All your learning stays here"
12. **Text fallback:** (If time) Show typing a question works too
13. **Close:** Emphasize speed, engagement, multiple input methods

**Backup: If mic fails during demo:**
- Stay calm, say "Let me show the text input option"
- Type question in text field
- Continue demo normally

**Backup Questions (pre-tested, in example cards):**
- "How do black holes work?"
- "Why do we dream?"
- "How does WiFi work?"

---

## **Debug Logging System**

A comprehensive logging system for debugging in Chrome DevTools console.

### **Logger Utility**

Both frontend and backend have matching logger utilities with consistent API:

```javascript
// Frontend: frontend/src/utils/logger.js
// Backend: backend/src/utils/logger.js

import logger from './utils/logger'

logger.debug('AUDIO', 'Starting recording', { sampleRate: 44100 })
logger.info('API', 'Request sent', { endpoint: '/api/generate' })
logger.warn('WS', 'Connection unstable', { attempts: 3 })
logger.error('STATE', 'Invalid state transition', { from, to })
```

### **Log Levels**

| Level | Color | Icon | Use Case |
| ----- | ----- | ----- | ----- |
| debug | Gray (#9CA3AF) | 🔍 | Verbose debugging, data dumps |
| info | Blue (#3B82F6) | ℹ️ | Normal operations, API calls |
| warn | Orange (#F59E0B) | ⚠️ | Recoverable issues, retries |
| error | Red (#EF4444) | ❌ | Failures, exceptions |

### **Categories**

| Category | Color | Purpose |
| ----- | ----- | ----- |
| AUDIO | Purple (#8B5CF6) | Recording, playback, audio analysis |
| API | Cyan (#06B6D4) | HTTP requests, responses |
| WS | Green (#10B981) | WebSocket connection, messages |
| STATE | Indigo (#6366F1) | UI state changes, topic management |
| GENERATION | Pink (#EC4899) | Slideshow generation pipeline |
| UI | Amber (#F59E0B) | User interactions, navigation |
| PERF | Emerald (#059669) | Performance timing |

### **Console Output Format**

```
[10:23:45.123] 🔍 DEBUG [AUDIO] Starting audio capture
└─ { sampleRate: 44100, channels: 1 }

[10:23:46.456] ℹ️ INFO [API] POST /api/generate
└─ { query: "How do black holes work?", timing: "2.3s" }

[10:23:47.789] ⚠️ WARN [WS] Reconnection attempt
└─ { attempt: 2, maxAttempts: 5 }

[10:23:48.012] ❌ ERROR [STATE] Generation failed
└─ { error: "Network timeout", stack: "..." }
```

### **Runtime Configuration**

Enable/disable logging dynamically in Chrome DevTools console:

```javascript
// Enable all debug logs
window.LOG_LEVEL = 'debug'

// Only warnings and errors
window.LOG_LEVEL = 'warn'

// Disable all logging
window.LOG_LEVEL = 'none'

// Filter by specific categories
window.LOG_CATEGORIES = ['API', 'WS']

// Show all categories
window.LOG_CATEGORIES = ['*']

// Helper function
window.enableLogging()  // Sets debug level, all categories
```

### **Environment Variables**

```bash
# Frontend (.env)
VITE_LOG_LEVEL=debug        # Default log level
VITE_LOG_CATEGORIES=*       # Default categories

# Backend (.env)
LOG_LEVEL=info              # Server log level
LOG_CATEGORIES=*            # Server categories
```

### **Performance Timing**

```javascript
// Measure operation duration
logger.time('API', 'generate-request')
const response = await fetch('/api/generate', ...)
logger.timeEnd('API', 'generate-request')
// Output: [10:23:45.123] ℹ️ INFO [API] generate-request: 2345ms
```

### **What Gets Logged**

| Event | Category | Level | Data |
| ----- | ----- | ----- | ----- |
| State transition | STATE | info | { from, to } |
| API request | API | debug | { method, url, body } |
| API response | API | info | { status, timing } |
| WS connect/disconnect | WS | info | { clientId } |
| WS message | WS | debug | { type, data } |
| Recording start/stop | AUDIO | info | { } |
| Audio analysis | AUDIO | debug | { level, isSilent } |
| Slide navigation | UI | debug | { from, to } |
| Topic created | STATE | info | { id, name } |
| Topic evicted | STATE | info | { id, name } |
| Queue change | STATE | info | { action, question } |
| Generation stage | GENERATION | info | { stage, timing } |
| Error occurred | * | error | { error, stack } |

### **Security**

- Logging is **disabled by default in production**
- API keys and sensitive data are **never logged**
- Request/response bodies are **truncated** (max 200 chars)
- Stack traces only shown for error level

### **DevTools Features**

- **Collapsible groups** - Related logs grouped with `console.group()`
- **Tables** - Array data displayed with `console.table()`
- **Styled output** - CSS colors for visual scanning
- **Expandable objects** - Context data is expandable

---

## **Appendix**

### **Glossary**

| Term | Definition |
| ----- | ----- |
| Nano Banana Pro | Google's Gemini 3 Pro Image model for diagram generation |
| Topic | A subject area containing one or more segments (max 3 retained) |
| Segment | A group of slides generated from a single question within a topic |
| Topic Header | A divider card showing the topic name when switching subjects |
| Follow-up | A related question that appends to existing topic |
| New Topic | An unrelated question that creates a new topic section |
| Topic Eviction | Automatic removal of oldest topic when 4th topic is added |
| Question Queue | List of suggested questions user tapped to ask next |
| Engagement Content | Fun fact + suggestions shown during generation wait |
| Cold Start | First app load before any question asked (shows examples) |
| Live Transcription | Real-time display of speech being recognized |
| Text Fallback | Typed input option when voice fails |
| STT | Speech-to-text conversion |
| TTS | Text-to-speech audio generation |

### **API References**

- Gemini API: https://ai.google.dev/gemini-api/docs
- Nano Banana Pro: https://ai.google.dev/gemini-api/docs/image-generation
- Gemini TTS: https://ai.google.dev/gemini-api/docs/text-to-speech

### **Design Inspiration**

- Khan Academy video explanations
- Duolingo lesson flow
- Apple's voice memo waveform
- Notion's minimal UI aesthetic