# **App Specification: ShowMe v2**

### Voice-First AI Tutor with Visual Explanations

**Version:** 2.0 (Hackathon Edition)  
**Last Updated:** January 15, 2026  
**Target Submission:** February 7, 2026

---

## **Table of Contents**

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Core Features](#core-features)
4. [Data Models](#data-models)
5. [Smart Follow-Up System](#smart-follow-up-system)
6. [API Endpoints](#api-endpoints)
7. [Voice & Audio System](#voice--audio-system)
8. [UI Layout & Components](#ui-layout--components)
9. [Design System](#design-system)
10. [Key User Flows](#key-user-flows)
11. [Generation Pipeline](#generation-pipeline)
12. [Implementation Phases](#implementation-phases)
13. [Demo Script](#demo-script)

---

## **Project Overview**

### Description

ShowMe is a **voice-first AI tutor** that transforms spoken questions into visual explanations with real-time narration. Unlike passive video players, ShowMe acts as an interactive tutor — greeting users, explaining concepts with annotated diagrams, and responding to interruptions and follow-up questions intelligently.

### What Makes This Different

| Traditional Education Apps | ShowMe |
|---------------------------|--------|
| Pre-recorded content | AI-generated on demand |
| Passive video watching | Active conversation |
| Type to search | Voice-first interaction |
| Generic explanations | Responds to YOUR questions |
| Linear playback | Interruptible, adaptive |

### Target Users

| Persona | Description | Key Need |
|---------|-------------|----------|
| **Curious Kids (8-12)** | Ask "why" constantly, visual learners | Quick, engaging answers |
| **Homework Helpers (10-14)** | Stuck on concepts, need it explained differently | "Make it click" |
| **Struggling Parents** | Can't explain modern curriculum | "Explain it for me" |
| **Visual Learners (all ages)** | Learn better seeing than reading | Diagrams > text |

### Key Value Proposition

> **"Your AI tutor that draws the answers."**
> 
> Ask any question. Get an instant visual explanation with narration. Interrupt anytime. Go deeper on anything.

---

## **Technology Stack**

### Frontend

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 + Vite | Fast development, modern tooling |
| Styling | Tailwind CSS | Rapid UI development |
| State Management | Zustand | Simple, performant state |
| Audio Playback | HTMLAudioElement + Web Audio API | TTS playback, VAD |
| Voice Input | Web Speech API | Browser-native STT |
| Routing | React Router (minimal) | Single page app |
| Storage | localStorage | Session persistence |

### Backend

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 18+ with Express | API server |
| AI Integration | Google Gemini 3 Pro | All AI features |
| Image Generation | Gemini 3 Pro Image (Nano Banana Pro) | Annotated diagrams |
| Text-to-Speech | Gemini 3 TTS | Natural narration |
| Real-time | WebSocket (optional) | Generation progress |

### External Integrations (All Gemini 3)

| Service | Model | Purpose |
|---------|-------|---------|
| Script Generation | Gemini 3 Pro | Lesson structure, classification |
| Image Generation | Gemini 3 Pro Image | Educational diagrams |
| Text-to-Speech | Gemini 3 TTS | Voice narration |
| Query Classification | Gemini 3 Pro | Smart follow-up routing |
| Engagement Content | Gemini 3 Pro | Pre-quiz, fun facts |

### Environment Variables

```bash
GEMINI_API_KEY=your_gemini_3_api_key
VITE_API_URL=http://localhost:3001
PORT=3001
```

### Deployment

| Component | Platform |
|-----------|----------|
| Frontend | Vercel |
| Backend | Vercel Serverless / Railway |
| Combined | Single Vercel deployment with API routes |

---

## **Core Features**

### 1. Voice-First Interaction

| Feature | Description |
|---------|-------------|
| **AI Greeting** | ShowMe greets users on app open with voice |
| **Always Listening** | Mic active when app is focused (with indicator) |
| **Live Transcription** | Shows what ShowMe is hearing in real-time |
| **Simulated Duplex** | User can interrupt AI narration (client-side VAD) |
| **Push-to-Talk Fallback** | Manual mic button for noisy environments |
| **Text Input Fallback** | Type questions when voice fails |

### 2. AI Tutor Behavior

| Behavior | Description |
|----------|-------------|
| **Conversational Wait** | AI chats with user during slide generation |
| **Pre-Quiz Engagement** | "What do YOU think?" questions while generating |
| **Narrated Explanations** | AI explains each slide with natural voice |
| **Annotation Callouts** | AI references specific parts: "See this red area?" |
| **Interrupt Handling** | Pauses narration, answers question, resumes |
| **Context Awareness** | Remembers what was just explained |

### 3. Visual Explanations

| Feature | Description |
|---------|-------------|
| **AI-Generated Diagrams** | Custom infographics per slide via Gemini 3 Pro Image |
| **Baked-In Annotations** | Circles, arrows, labels generated in image |
| **Synchronized Narration** | TTS audio matches slide content |
| **Auto-Generated Subtitles** | Text display of narration |
| **Progress Indicators** | Dots showing slide position |

### 4. Smart Follow-Up System

| Query Type | Response |
|------------|----------|
| **Slide Question** | Verbal answer + highlight (no new slides) |
| **Topic Follow-Up** | Generate new slides, append to topic |
| **New Topic** | Create new topic cluster |
| **Return to Topic** | Navigate to existing topic |

### 5. Topic Persistence

| Feature | Description |
|---------|-------------|
| **Topic Sidebar** | List of all explored topics |
| **Expandable Topics** | Click to see slides within topic |
| **Follow-Up Nesting** | Sub-questions shown indented |
| **Cross-Session** | Topics persist via localStorage |
| **Quick Navigation** | Click any slide to jump to it |

### 6. Tap-to-Inquire

| Feature | Description |
|---------|-------------|
| **Tap on Image** | Tap any part of diagram to ask about it |
| **Region Detection** | AI identifies what user tapped |
| **Contextual Answer** | Explains that specific part |
| **No New Slides** | Quick verbal response |

---

## **Data Models**

### Application State

```typescript
interface AppState {
  // Session
  session: Session;
  
  // Navigation
  navigation: NavigationState;
  
  // Voice
  voice: VoiceState;
  
  // Generation
  generation: GenerationState;
  
  // UI
  ui: UIState;
}
```

### Session & Topics

```typescript
interface Session {
  id: string;
  createdAt: number;
  lastAccessedAt: number;
  topics: Topic[];
  activeTopicId: string | null;
}

interface Topic {
  id: string;
  name: string;                      // "How Volcanoes Work"
  icon: string;                      // "🌋"
  createdAt: number;
  lastAccessedAt: number;
  slides: Slide[];
  conversationContext: Message[];    // For follow-up awareness
  isExpanded: boolean;               // UI state for sidebar
}

interface Slide {
  id: string;
  topicId: string;
  
  // Content
  query: string;                     // Question that created this
  imageUrl: string;                  // Generated diagram (base64)
  audioUrl: string;                  // TTS narration (base64)
  narration: string;                 // Text of narration
  duration: number;                  // Audio length in seconds
  
  // Annotations (for tap-to-inquire context)
  annotations: Annotation[];
  
  // Follow-up tracking
  isFollowUp: boolean;
  parentSlideId: string | null;
  depth: number;                     // 0 = main, 1+ = follow-up depth
  
  // Metadata
  createdAt: number;
}

interface Annotation {
  id: string;
  type: 'circle' | 'arrow' | 'label' | 'region';
  x: number;                         // Percentage (0-100)
  y: number;                         // Percentage (0-100)
  width?: number;                    // For regions
  height?: number;                   // For regions
  label: string;                     // What this annotation represents
  description: string;               // Brief explanation
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  slideId?: string;                  // Associated slide if any
  type: 'question' | 'answer' | 'narration' | 'follow_up';
}
```

### Navigation State

```typescript
interface NavigationState {
  currentTopicId: string | null;
  currentSlideIndex: number;
  isPlaying: boolean;                // Auto-advancing through slides
  playbackPosition: number;          // Current audio time
  viewMode: 'slideshow' | 'listening' | 'generating';
}
```

### Voice State

```typescript
interface VoiceState {
  isListening: boolean;              // Mic is active
  isSpeaking: boolean;               // AI is narrating
  isInterrupted: boolean;            // User interrupted AI
  liveTranscription: string;         // What user is saying
  vadActive: boolean;                // Voice activity detection on
  pushToTalkMode: boolean;           // Manual mode enabled
}
```

### Generation State

```typescript
interface GenerationState {
  isGenerating: boolean;
  currentQuery: string;
  progress: number;                  // 0-100
  stage: 'classifying' | 'scripting' | 'imaging' | 'audio' | 'complete';
  engagement: EngagementContent | null;
  preQuizAnswer: string | null;      // User's prediction
}

interface EngagementContent {
  funFact: {
    emoji: string;
    text: string;
  };
  preQuiz: {
    question: string;
    options: { id: string; text: string }[];
    correctAnswer: string;
    explanation: string;
  };
  suggestedQuestions: string[];
}
```

### UI State

```typescript
interface UIState {
  sidebarOpen: boolean;
  sidebarWidth: number;
  theme: 'light' | 'dark';
  isMobile: boolean;
  showSubtitles: boolean;
  audioVolume: number;
}
```

---

## **Smart Follow-Up System**

This is the core intelligence that decides how to respond to user queries.

### Classification Categories

| Type | Trigger | Response | Creates Slides? |
|------|---------|----------|-----------------|
| `SLIDE_QUESTION` | Asking about visible content | Verbal answer + highlight | ❌ No |
| `TOPIC_FOLLOWUP` | Related to current topic, needs visual | Generate slides, append | ✅ Yes |
| `EXISTING_TOPIC` | References previous topic | Navigate to topic | ❌ No |
| `NEW_TOPIC` | Completely new subject | Create topic + slides | ✅ Yes |

### Classification Logic

```typescript
// Smart Follow-Up Decision Tree
interface ClassificationResult {
  type: 'SLIDE_QUESTION' | 'TOPIC_FOLLOWUP' | 'EXISTING_TOPIC' | 'NEW_TOPIC';
  confidence: number;                // 0.0 - 1.0
  reasoning: string;                 // Why this classification
  
  // Type-specific data
  slideQuestionData?: {
    targetAnnotation: string | null; // Which annotation they're asking about
    canAnswerVerbally: boolean;      // Simple enough for voice-only?
    suggestedHighlight: { x: number; y: number } | null;
  };
  
  topicFollowupData?: {
    suggestedSlideCount: number;     // How many slides needed
    parentSlideId: string;           // Which slide spawned this
    subtopic: string;                // What aspect to explore
  };
  
  existingTopicData?: {
    matchedTopicId: string;
    matchedTopicName: string;
  };
  
  newTopicData?: {
    suggestedName: string;
    suggestedIcon: string;
    estimatedSlideCount: number;
  };
}
```

### Classification Prompt

```typescript
const CLASSIFICATION_PROMPT = `
You are the routing brain for ShowMe, an AI tutor. Classify user queries to determine the best response.

CURRENT CONTEXT:
- Active Topic: {activeTopic.name || "None"}
- Current Slide: {currentSlide.narration || "None"}
- Visible Annotations: {currentSlide.annotations.map(a => a.label).join(", ")}
- Recent Conversation: {recentMessages}
- All Topics: {allTopicNames.join(", ")}

USER QUERY: "{query}"

CLASSIFICATION RULES:

1. SLIDE_QUESTION - User is asking about something on the CURRENT slide
   Triggers:
   - "What's that?" / "What's the [color] part?"
   - "Explain the arrow" / "What does [label] mean?"
   - "Why is it [description]?"
   - Questions that can be answered in 1-3 sentences
   - References to visible elements
   
   Examples:
   - "What's the red stuff?" → SLIDE_QUESTION (about magma annotation)
   - "Why are there bubbles?" → SLIDE_QUESTION (about diagram element)

2. TOPIC_FOLLOWUP - Related to current topic but needs NEW visual explanation
   Triggers:
   - "Tell me more about [subtopic]"
   - "What happens next?" / "What happens after?"
   - "How does [related concept] work?"
   - "Why does that happen?"
   - Questions requiring visual explanation
   
   Examples:
   - "Tell me more about the magma chamber" → TOPIC_FOLLOWUP
   - "What happens when it erupts?" → TOPIC_FOLLOWUP

3. EXISTING_TOPIC - User wants to return to a previous topic
   Triggers:
   - "Go back to [topic]"
   - "What about [previous topic] again?"
   - "Earlier you mentioned [topic]"
   - References to non-active topic by name
   
   Examples:
   - "Go back to airplanes" → EXISTING_TOPIC
   - "What did you say about cells?" → EXISTING_TOPIC

4. NEW_TOPIC - Completely unrelated new subject
   Triggers:
   - Question about unrelated subject
   - No connection to current or previous topics
   - Clear topic shift
   
   Examples:
   - "How do airplanes fly?" (while on volcanoes) → NEW_TOPIC
   - "What are black holes?" → NEW_TOPIC

OUTPUT FORMAT (JSON):
{
  "type": "SLIDE_QUESTION" | "TOPIC_FOLLOWUP" | "EXISTING_TOPIC" | "NEW_TOPIC",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification",
  
  // Include ONE of these based on type:
  
  // For SLIDE_QUESTION:
  "slideQuestionData": {
    "targetAnnotation": "annotation label or null",
    "canAnswerVerbally": true/false,
    "suggestedHighlight": { "x": 0-100, "y": 0-100 } or null,
    "verbalAnswer": "2-3 sentence answer if canAnswerVerbally"
  }
  
  // For TOPIC_FOLLOWUP:
  "topicFollowupData": {
    "suggestedSlideCount": 1-4,
    "parentSlideId": "{currentSlide.id}",
    "subtopic": "What aspect to explore"
  }
  
  // For EXISTING_TOPIC:
  "existingTopicData": {
    "matchedTopicId": "topic_id",
    "matchedTopicName": "Topic Name"
  }
  
  // For NEW_TOPIC:
  "newTopicData": {
    "suggestedName": "Friendly topic name",
    "suggestedIcon": "relevant emoji",
    "estimatedSlideCount": 3-6
  }
}
`;
```

### Classification Handler

```typescript
async function handleUserQuery(query: string, state: AppState): Promise<void> {
  const classification = await classifyQuery(query, state);
  
  switch (classification.type) {
    case 'SLIDE_QUESTION':
      await handleSlideQuestion(query, classification, state);
      break;
      
    case 'TOPIC_FOLLOWUP':
      await handleTopicFollowup(query, classification, state);
      break;
      
    case 'EXISTING_TOPIC':
      await handleExistingTopic(classification, state);
      break;
      
    case 'NEW_TOPIC':
      await handleNewTopic(query, classification, state);
      break;
  }
}

// SLIDE_QUESTION: Verbal answer only
async function handleSlideQuestion(
  query: string,
  classification: ClassificationResult,
  state: AppState
): Promise<void> {
  const { slideQuestionData } = classification;
  
  // Pause any current narration
  pauseNarration();
  
  // Highlight relevant area if identified
  if (slideQuestionData.suggestedHighlight) {
    highlightRegion(slideQuestionData.suggestedHighlight);
  }
  
  // Generate and play verbal response
  if (slideQuestionData.canAnswerVerbally && slideQuestionData.verbalAnswer) {
    // Use pre-generated answer from classification
    const audioUrl = await generateTTS(slideQuestionData.verbalAnswer);
    await playAudio(audioUrl);
  } else {
    // Need to generate a more detailed verbal response
    const response = await generateVerbalResponse(query, state.currentSlide);
    const audioUrl = await generateTTS(response);
    await playAudio(audioUrl);
  }
  
  // Add to conversation context
  addToConversation(state.activeTopicId, {
    role: 'user',
    content: query,
    type: 'follow_up'
  });
  
  // Offer to continue or go deeper
  await offerContinuation();
}

// TOPIC_FOLLOWUP: Generate new slides, append
async function handleTopicFollowup(
  query: string,
  classification: ClassificationResult,
  state: AppState
): Promise<void> {
  const { topicFollowupData } = classification;
  const activeTopic = getActiveTopic(state);
  
  // Acknowledge the question
  await speak("Great question! Let me show you...");
  
  // Switch to generating state
  setGenerationState({
    isGenerating: true,
    currentQuery: query,
    stage: 'scripting'
  });
  
  // Generate engagement content in parallel
  const engagementPromise = generateEngagement(query);
  
  // Generate follow-up slides
  const newSlides = await generateSlides({
    query,
    topicId: activeTopic.id,
    isFollowUp: true,
    parentSlideId: topicFollowupData.parentSlideId,
    conversationContext: activeTopic.conversationContext,
    targetSlideCount: topicFollowupData.suggestedSlideCount
  });
  
  // Append slides to topic
  appendSlidesToTopic(activeTopic.id, newSlides);
  
  // Navigate to first new slide
  navigateToSlide(activeTopic.id, newSlides[0].id);
  
  // Start narration
  await narrateSlides(newSlides);
}

// EXISTING_TOPIC: Navigate back
async function handleExistingTopic(
  classification: ClassificationResult,
  state: AppState
): Promise<void> {
  const { existingTopicData } = classification;
  
  await speak(`Sure, let's go back to ${existingTopicData.matchedTopicName}.`);
  
  // Navigate to the topic
  navigateToTopic(existingTopicData.matchedTopicId);
  
  // Optionally re-narrate or ask what they want to know
  await speak("What would you like to know about this?");
}

// NEW_TOPIC: Create fresh topic
async function handleNewTopic(
  query: string,
  classification: ClassificationResult,
  state: AppState
): Promise<void> {
  const { newTopicData } = classification;
  
  // Acknowledge topic switch
  await speak(`Ooh, ${newTopicData.suggestedName}! Let me explain that for you.`);
  
  // Create new topic
  const newTopic = createTopic({
    name: newTopicData.suggestedName,
    icon: newTopicData.suggestedIcon
  });
  
  // Switch to generating state
  setGenerationState({
    isGenerating: true,
    currentQuery: query,
    stage: 'scripting'
  });
  
  // Generate slides
  const slides = await generateSlides({
    query,
    topicId: newTopic.id,
    isFollowUp: false,
    targetSlideCount: newTopicData.estimatedSlideCount
  });
  
  // Add slides to topic
  appendSlidesToTopic(newTopic.id, slides);
  
  // Set as active and navigate
  setActiveTopic(newTopic.id);
  navigateToSlide(newTopic.id, slides[0].id);
  
  // Start narration
  await narrateSlides(slides);
}
```

### Decision Flow Diagram

```
                         USER SPEAKS
                              │
                              ▼
                    ┌───────────────────┐
                    │  /api/classify    │
                    │                   │
                    │  Analyze query    │
                    │  against context  │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│SLIDE_QUESTION │    │TOPIC_FOLLOWUP │    │   NEW_TOPIC   │
│               │    │ or EXISTING   │    │               │
│ "What's the   │    │               │    │ "How do       │
│  red part?"   │    │ "Tell me more │    │  planes fly?" │
│               │    │  about magma" │    │               │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ VERBAL ONLY   │    │GENERATE SLIDES│    │ CREATE TOPIC  │
│               │    │               │    │               │
│ • Pause audio │    │ • Show loader │    │ • New cluster │
│ • Highlight   │    │ • Engagement  │    │ • Generate    │
│ • Speak answer│    │ • Append      │    │ • Navigate    │
│ • Resume/ask  │    │ • Narrate     │    │ • Narrate     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │  Continue or ask  │
                    │  "Want to know    │
                    │   more?"          │
                    └───────────────────┘
```

---

## **API Endpoints**

### Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/greet` | Generate greeting on app open |
| POST | `/api/classify` | Classify user query |
| POST | `/api/generate` | Generate slides for query |
| POST | `/api/generate/engagement` | Pre-quiz + fun facts |
| POST | `/api/respond` | Verbal response (no slides) |
| POST | `/api/inquire` | Handle tap-on-image |
| POST | `/api/tts` | Text-to-speech conversion |

---

### POST `/api/greet`

Generate AI greeting when app opens.

**Request:**
```json
{
  "timeOfDay": "morning" | "afternoon" | "evening",
  "isReturningUser": boolean,
  "lastTopicName": string | null
}
```

**Response:**
```json
{
  "greeting": "Hey there! I'm ShowMe, your learning buddy. What do you want to explore today?",
  "audioUrl": "data:audio/mp3;base64,...",
  "suggestedQuestions": [
    "How do volcanoes erupt?",
    "Why is the sky blue?",
    "How do airplanes fly?"
  ]
}
```

---

### POST `/api/classify`

Classify user query to determine response type.

**Request:**
```json
{
  "query": "What's the red stuff?",
  "context": {
    "activeTopic": {
      "id": "topic_1",
      "name": "How Volcanoes Work",
      "slides": [
        {
          "id": "slide_2",
          "query": "Inside the volcano",
          "narration": "This is a cross-section of a volcano...",
          "annotations": [
            { "id": "a1", "label": "Magma Chamber", "x": 50, "y": 70 },
            { "id": "a2", "label": "Vent", "x": 50, "y": 30 }
          ]
        }
      ],
      "conversationContext": [
        { "role": "user", "content": "How do volcanoes work?" },
        { "role": "assistant", "content": "Let me show you..." }
      ]
    },
    "currentSlideId": "slide_2",
    "allTopicNames": ["How Volcanoes Work", "How Cells Divide"]
  }
}
```

**Response:**
```json
{
  "type": "SLIDE_QUESTION",
  "confidence": 0.92,
  "reasoning": "User is asking about visible magma (red) on current slide",
  "slideQuestionData": {
    "targetAnnotation": "Magma Chamber",
    "canAnswerVerbally": true,
    "suggestedHighlight": { "x": 50, "y": 70 },
    "verbalAnswer": "That red stuff is magma — it's rock that's so hot it melted into liquid! It can reach over 2,000 degrees Fahrenheit. The magma collects in this chamber underground before an eruption pushes it up."
  }
}
```

---

### POST `/api/generate`

Generate slides for a query.

**Request:**
```json
{
  "query": "How do volcanoes erupt?",
  "topicId": "topic_1",
  "isFollowUp": false,
  "parentSlideId": null,
  "conversationContext": [],
  "targetSlideCount": 4
}
```

**Response:**
```json
{
  "topic": {
    "name": "How Volcanoes Erupt",
    "icon": "🌋"
  },
  "slides": [
    {
      "id": "slide_1",
      "query": "How do volcanoes erupt?",
      "imageUrl": "data:image/png;base64,...",
      "audioUrl": "data:audio/mp3;base64,...",
      "narration": "A volcano is like a giant pressure cooker in the Earth...",
      "duration": 12.5,
      "annotations": [
        {
          "id": "a1",
          "type": "circle",
          "x": 50,
          "y": 75,
          "label": "Magma Chamber",
          "description": "Underground pool of molten rock"
        },
        {
          "id": "a2",
          "type": "arrow",
          "x": 50,
          "y": 50,
          "label": "Rising Magma",
          "description": "Pressure pushes magma upward"
        }
      ],
      "isFollowUp": false,
      "parentSlideId": null,
      "depth": 0
    }
  ]
}
```

---

### POST `/api/generate/engagement`

Generate pre-quiz and fun facts during slide generation.

**Request:**
```json
{
  "query": "How do volcanoes erupt?"
}
```

**Response:**
```json
{
  "funFact": {
    "emoji": "🌋",
    "text": "There are over 1,500 active volcanoes on Earth — and about 80% of them are underwater!"
  },
  "preQuiz": {
    "question": "What do you think makes a volcano erupt?",
    "options": [
      { "id": "a", "text": "The moon's gravity pulling on Earth" },
      { "id": "b", "text": "Pressure from hot melted rock underground" },
      { "id": "c", "text": "Earthquakes shaking the mountain" },
      { "id": "d", "text": "I'm not sure — let's find out!" }
    ],
    "correctAnswer": "b",
    "explanation": "Magma builds up pressure until it bursts through the surface!"
  },
  "suggestedQuestions": [
    "What's inside a volcano?",
    "What happens after an eruption?",
    "Where are most volcanoes located?"
  ]
}
```

---

### POST `/api/respond`

Generate verbal-only response (no new slides).

**Request:**
```json
{
  "query": "What's the red stuff?",
  "currentSlide": {
    "id": "slide_2",
    "narration": "This is a cross-section showing...",
    "annotations": [...]
  },
  "conversationContext": [...]
}
```

**Response:**
```json
{
  "response": "That red stuff is magma — it's rock that got so hot it melted into liquid! It can be over 2,000 degrees.",
  "audioUrl": "data:audio/mp3;base64,...",
  "highlight": { "x": 50, "y": 70 },
  "duration": 5.2
}
```

---

### POST `/api/inquire`

Handle tap-on-image queries.

**Request:**
```json
{
  "tapCoordinates": { "x": 45, "y": 62 },
  "currentSlide": {
    "id": "slide_2",
    "imageUrl": "...",
    "annotations": [...],
    "narration": "..."
  },
  "topicContext": {
    "name": "How Volcanoes Work",
    "conversationContext": [...]
  }
}
```

**Response:**
```json
{
  "identifiedElement": "Magma Chamber",
  "response": "You tapped on the magma chamber! This is where molten rock collects deep underground. Think of it like a giant underground lake of liquid rock, waiting to burst out.",
  "audioUrl": "data:audio/mp3;base64,...",
  "duration": 8.1,
  "shouldCreateSlide": false,
  "offerDeeper": "Want me to explain how the magma forms?"
}
```

---

### POST `/api/tts`

Convert text to speech.

**Request:**
```json
{
  "text": "That's a great question! Let me show you...",
  "voice": "default",
  "speed": 1.0
}
```

**Response:**
```json
{
  "audioUrl": "data:audio/mp3;base64,...",
  "duration": 3.2
}
```

---

## **Voice & Audio System**

### Simulated Duplex Architecture

Since the hackathon requires Gemini 3 (not Gemini Live), we implement duplex-like behavior client-side.

```
┌─────────────────────────────────────────────────────────────┐
│                    AUDIO SYSTEM                             │
│                                                             │
│  ┌─────────────────┐         ┌─────────────────┐           │
│  │  VOICE INPUT    │         │  VOICE OUTPUT   │           │
│  │                 │         │                 │           │
│  │  Web Speech API │◄───────►│  Audio Element  │           │
│  │  (Recognition)  │   VAD   │  (TTS Playback) │           │
│  │                 │ Bridge  │                 │           │
│  └────────┬────────┘         └────────┬────────┘           │
│           │                           │                    │
│           ▼                           ▼                    │
│  ┌─────────────────────────────────────────────┐           │
│  │           VOICE ACTIVITY DETECTOR           │           │
│  │                                             │           │
│  │  • Monitor mic input during TTS playback    │           │
│  │  • Detect user speech above threshold       │           │
│  │  • Trigger interrupt on detection           │           │
│  └─────────────────────────────────────────────┘           │
│                         │                                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────┐           │
│  │           INTERRUPT HANDLER                 │           │
│  │                                             │           │
│  │  1. Pause TTS playback                      │           │
│  │  2. Capture user speech                     │           │
│  │  3. Send to /api/classify                   │           │
│  │  4. Handle response                         │           │
│  │  5. Resume or redirect                      │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Voice Manager Implementation

```typescript
// lib/voiceManager.ts

class VoiceManager {
  private recognition: SpeechRecognition | null = null;
  private audioElement: HTMLAudioElement;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private vadThreshold: number = 0.02;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  
  // Callbacks
  public onTranscript: (text: string, isFinal: boolean) => void = () => {};
  public onInterrupt: (transcript: string) => void = () => {};
  public onSpeakingChange: (isSpeaking: boolean) => void = () => {};
  public onListeningChange: (isListening: boolean) => void = () => {};
  
  constructor() {
    this.audioElement = new Audio();
    this.initRecognition();
  }
  
  private initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return;
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;
      
      // If AI is speaking and user starts talking, interrupt
      if (this.isSpeaking && transcript.length > 3) {
        this.handleInterrupt(transcript);
      } else {
        this.onTranscript(transcript, isFinal);
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        // Handle permission denied
      }
    };
  }
  
  // Start listening
  async startListening() {
    if (!this.recognition) return;
    
    try {
      await this.recognition.start();
      this.isListening = true;
      this.onListeningChange(true);
    } catch (error) {
      console.error('Failed to start recognition:', error);
    }
  }
  
  // Stop listening
  stopListening() {
    if (!this.recognition) return;
    
    this.recognition.stop();
    this.isListening = false;
    this.onListeningChange(false);
  }
  
  // Speak text (TTS)
  async speak(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isSpeaking = true;
      this.onSpeakingChange(true);
      
      this.audioElement.src = audioUrl;
      
      this.audioElement.onended = () => {
        this.isSpeaking = false;
        this.onSpeakingChange(false);
        resolve();
      };
      
      this.audioElement.onerror = (error) => {
        this.isSpeaking = false;
        this.onSpeakingChange(false);
        reject(error);
      };
      
      this.audioElement.play();
    });
  }
  
  // Pause speaking
  pauseSpeaking() {
    this.audioElement.pause();
    this.isSpeaking = false;
    this.onSpeakingChange(false);
  }
  
  // Resume speaking
  resumeSpeaking() {
    this.isSpeaking = true;
    this.onSpeakingChange(true);
    this.audioElement.play();
  }
  
  // Handle interrupt
  private handleInterrupt(transcript: string) {
    this.pauseSpeaking();
    this.onInterrupt(transcript);
  }
  
  // Get current playback position
  getPlaybackPosition(): number {
    return this.audioElement.currentTime;
  }
  
  // Set playback position
  setPlaybackPosition(time: number) {
    this.audioElement.currentTime = time;
  }
  
  // Cleanup
  destroy() {
    this.stopListening();
    this.audioElement.pause();
    this.audioElement.src = '';
  }
}

export const voiceManager = new VoiceManager();
```

### Push-to-Talk Fallback

```typescript
// For noisy environments or when continuous listening fails

interface PushToTalkProps {
  onResult: (transcript: string) => void;
  disabled: boolean;
}

function PushToTalkButton({ onResult, disabled }: PushToTalkProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const handleMouseDown = () => {
    setIsRecording(true);
    voiceManager.startListening();
    voiceManager.onTranscript = (text, isFinal) => {
      setTranscript(text);
      if (isFinal) {
        onResult(text);
      }
    };
  };
  
  const handleMouseUp = () => {
    setIsRecording(false);
    voiceManager.stopListening();
  };
  
  return (
    <button
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      disabled={disabled}
      className={`
        w-16 h-16 rounded-full flex items-center justify-center
        transition-all duration-200
        ${isRecording 
          ? 'bg-red-500 scale-110' 
          : 'bg-indigo-500 hover:bg-indigo-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <MicIcon className="w-8 h-8 text-white" />
    </button>
  );
}
```

---

## **UI Layout & Components**

### Main Application Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                    [🎤 Active]  │
│  ShowMe ✨                                                              │
├────────────────────┬────────────────────────────────────────────────────┤
│                    │                                                    │
│  TOPIC SIDEBAR     │              MAIN CONTENT AREA                     │
│  (240px)           │                                                    │
│                    │   ┌────────────────────────────────────────────┐   │
│  ┌──────────────┐  │   │                                            │   │
│  │ Your Topics  │  │   │                                            │   │
│  │ 3 explored   │  │   │          SLIDE / LISTENING VIEW            │   │
│  └──────────────┘  │   │                                            │   │
│                    │   │                                            │   │
│  ┌──────────────┐  │   │                                            │   │
│  │ 🌋 Volcanoes │  │   └────────────────────────────────────────────┘   │
│  │   ├─ Slide 1 │  │                                                    │
│  │   ├─ Slide 2 │  │   ┌────────────────────────────────────────────┐   │
│  │   │  ↳ Q&A   │  │   │           SUBTITLES / STATUS               │   │
│  │   └─ Slide 3 │  │   └────────────────────────────────────────────┘   │
│  └──────────────┘  │                                                    │
│                    │   ┌────────────────────────────────────────────┐   │
│  ┌──────────────┐  │   │        NAVIGATION / CONTROLS               │   │
│  │ ✈️ Airplanes │  │   │     ◀  ● ● ● ○ ○  ▶      ▶❚❚              │   │
│  │   3 slides ▶ │  │   └────────────────────────────────────────────┘   │
│  └──────────────┘  │                                                    │
│                    │   ┌────────────────────────────────────────────┐   │
│                    │   │         VOICE INPUT AREA                   │   │
│                    │   │      ∿∿∿ [🎤] ∿∿∿                          │   │
│                    │   │      "How does..."                         │   │
│                    │   └────────────────────────────────────────────┘   │
│                    │                                                    │
└────────────────────┴────────────────────────────────────────────────────┘
```

### View States

#### State 1: Listening (Cold Start)

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                    ∿∿∿ [🎤] ∿∿∿                            │
│                                                            │
│              "What do you want to learn?"                  │
│                                                            │
│     ┌──────────────────────────────────────────────┐       │
│     │  Or type your question here...              │       │
│     └──────────────────────────────────────────────┘       │
│                                                            │
│     Try asking:                                            │
│                                                            │
│     ┌──────────────────────────────────────────────┐       │
│     │  🌋 "How do volcanoes erupt?"                │       │
│     └──────────────────────────────────────────────┘       │
│     ┌──────────────────────────────────────────────┐       │
│     │  💭 "Why do we dream?"                       │       │
│     └──────────────────────────────────────────────┘       │
│     ┌──────────────────────────────────────────────┐       │
│     │  ✈️ "How do airplanes fly?"                  │       │
│     └──────────────────────────────────────────────┘       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### State 2: Listening (With Live Transcription)

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                    ∿∿∿ [🎤] ∿∿∿                            │
│                   (listening...)                           │
│                                                            │
│         "How do volcanoes..."                              │
│                  ↑                                         │
│           Live transcription                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### State 3: Generating (With Engagement)

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                  [Animated Spinner]                        │
│                                                            │
│           "Creating your explanation..."                   │
│               ━━━━━━━━━━━░░░░ 67%                          │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  💡 Did you know?                                    │  │
│  │                                                      │  │
│  │  There are over 1,500 active volcanoes on Earth —   │  │
│  │  and about 80% of them are underwater!              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🤔 What do YOU think makes a volcano erupt?        │  │
│  │                                                      │  │
│  │  ┌────────────────┐  ┌────────────────┐             │  │
│  │  │ A. Moon's      │  │ B. Hot melted  │             │  │
│  │  │    gravity     │  │    rock        │             │  │
│  │  └────────────────┘  └────────────────┘             │  │
│  │  ┌────────────────┐  ┌────────────────┐             │  │
│  │  │ C. Earthquakes │  │ D. Not sure!   │             │  │
│  │  └────────────────┘  └────────────────┘             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│              [🎤 Still listening...]                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### State 4: Slideshow (Playing)

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │                                                      │  │
│  │            [Annotated Volcano Diagram]               │  │
│  │                                                      │  │
│  │                  ①────→ Magma                       │  │
│  │                     ○                                │  │
│  │                  ②────→ Vent                        │  │
│  │                                                      │  │
│  │                                    (tap to ask)     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  "This is a cross-section of a volcano. See this    │  │
│  │   red area? That's the magma chamber..."            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│           ◀   ● ● ● ○ ○   ▶           ❚❚                  │
│                                                            │
│                    [🎤 Interrupt anytime]                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### State 5: Interrupted (AI Answering)

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │            [Volcano Diagram with Highlight]          │  │
│  │                                                      │  │
│  │                     ◉ ←── Highlighted                │  │
│  │                  (pulsing)                           │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  You: "What's the red stuff?"                        │  │
│  │                                                      │  │
│  │  ShowMe: "That's magma — rock so hot it melted      │  │
│  │  into liquid! It can reach 2,000°F..."              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│     ┌──────────────────┐  ┌──────────────────┐            │
│     │  ↩️ Continue      │  │  🔍 Tell me more │            │
│     └──────────────────┘  └──────────────────┘            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Topic Sidebar Component

```
┌────────────────────┐
│  YOUR TOPICS       │
│  3 explored        │
├────────────────────┤
│                    │
│  ▼ 🌋 Volcanoes    │  ← Active, expanded
│  │  4 slides       │
│  │                 │
│  ├─ ○ What is...   │
│  ├─ ● Inside the.. │  ← Currently viewing
│  │  └─ ↳ Magma Q&A │  ← Follow-up (nested)
│  ├─ ○ Eruption     │
│  └─ ○ Effects      │
│                    │
│  ▶ ✈️ Airplanes    │  ← Collapsed
│     3 slides       │
│                    │
│  ▶ 🧬 Cells        │  ← Collapsed
│     2 slides       │
│                    │
├────────────────────┤
│  [+ New Topic]     │
└────────────────────┘
```

### Mobile Layout

```
┌─────────────────────────┐
│ ☰  ShowMe        [🎤]   │
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │  [Slide Image]    │  │
│  │                   │  │
│  │     (tap to ask)  │  │
│  └───────────────────┘  │
│                         │
│  "This is the magma..." │
│                         │
│    ◀  ● ● ○  ▶    ❚❚    │
│                         │
│  ┌───────────────────┐  │
│  │  🎤 Ask something │  │
│  └───────────────────┘  │
│                         │
└─────────────────────────┘

[☰ opens topic drawer from left]
```

---

## **Design System**

### Color Palette

| Role | Light Mode | Dark Mode | Usage |
|------|------------|-----------|-------|
| Primary | `#6366F1` | `#818CF8` | Buttons, active states |
| Primary Hover | `#4F46E5` | `#A5B4FC` | Button hover |
| Background | `#FFFFFF` | `#0F172A` | Main background |
| Surface | `#F8FAFC` | `#1E293B` | Cards, sidebar |
| Text Primary | `#0F172A` | `#F8FAFC` | Main text |
| Text Secondary | `#64748B` | `#94A3B8` | Subtitles, hints |
| Border | `#E2E8F0` | `#334155` | Dividers, outlines |
| Success | `#22C55E` | `#4ADE80` | Correct answers |
| Warning | `#F59E0B` | `#FBBF24` | Generating state |
| Error | `#EF4444` | `#F87171` | Errors |
| Highlight | `#FCD34D` | `#FDE68A` | Annotation highlight |

### Typography

| Element | Font | Weight | Size | Line Height |
|---------|------|--------|------|-------------|
| H1 | Inter | 700 | 2rem | 1.2 |
| H2 | Inter | 600 | 1.5rem | 1.3 |
| Body | Inter | 400 | 1rem | 1.6 |
| Subtitle | Inter | 400 | 1.125rem | 1.5 |
| Caption | Inter | 500 | 0.875rem | 1.4 |
| Mono | JetBrains Mono | 400 | 0.875rem | 1.5 |

### Component Specifications

#### Mic Button

```css
/* Idle */
.mic-button {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* Listening */
.mic-button.listening {
  animation: pulse 1.5s ease-in-out infinite;
  background: var(--success);
}

/* Speaking (AI talking) */
.mic-button.speaking {
  background: var(--warning);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
```

#### Slide Image Container

```css
.slide-container {
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  background: var(--surface);
  position: relative;
}

.slide-container.tappable {
  cursor: pointer;
}

.slide-container .highlight {
  position: absolute;
  border: 3px solid var(--highlight);
  border-radius: 50%;
  animation: highlight-pulse 1s ease-in-out infinite;
}
```

#### Topic Sidebar Item

```css
.topic-item {
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.topic-item.active {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.topic-item .slide-list {
  padding-left: 12px;
  border-left: 2px solid var(--border);
  margin-left: 20px;
}

.topic-item .slide-item.follow-up {
  padding-left: 16px;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
```

### Animations

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| Fade In | 200ms | ease-out | Content appearing |
| Slide Transition | 300ms | ease-in-out | Slide changes |
| Pulse | 1500ms | ease-in-out | Mic listening |
| Highlight | 1000ms | ease-in-out | Annotation callout |
| Progress | 200ms | linear | Loading bar |
| Expand | 200ms | ease-out | Sidebar expand |

---

## **Key User Flows**

### Flow 1: First Question (Voice)

```
1. User opens app
   └─→ AI greeting plays: "Hey! What do you want to learn?"
   
2. User speaks: "How do volcanoes erupt?"
   └─→ Live transcription shows: "How do volcanoes..."
   
3. Speech ends, query sent
   └─→ AI responds: "Ooh, great question! Let me show you..."
   └─→ Screen transitions to generating state
   
4. Generation starts
   └─→ Fun fact appears (1-2s)
   └─→ Pre-quiz appears (2-3s)
   └─→ Progress bar advances
   
5. User answers pre-quiz: "B - Hot melted rock"
   └─→ Answer stored for callback
   
6. Slides ready (~15-25s)
   └─→ Transition to slideshow
   └─→ First slide appears
   
7. AI narrates with annotations
   └─→ "This is a cross-section of a volcano. See this red area?"
   └─→ Circle highlights magma chamber
   
8. Slideshow completes
   └─→ AI: "You guessed B - you were right! Want to know more?"
   └─→ Topic added to sidebar
```

### Flow 2: Slide Question (Verbal Only)

```
1. User viewing slide 2 (Inside Volcano)
   └─→ AI narrating: "The magma collects in this chamber..."
   
2. User interrupts: "What's the red stuff?"
   └─→ TTS pauses immediately
   └─→ Query classified as SLIDE_QUESTION
   
3. AI responds verbally (no new slides)
   └─→ Highlight appears on magma region
   └─→ "That red stuff is magma — it's rock so hot it melted!"
   
4. Response completes
   └─→ AI: "Want me to continue, or tell you more about magma?"
   
5a. User: "Continue"
    └─→ TTS resumes from pause point
    
5b. User: "Tell me more"
    └─→ Triggers TOPIC_FOLLOWUP flow
```

### Flow 3: Topic Follow-Up (New Slides)

```
1. User viewing volcano slides
   └─→ AI just explained magma chamber
   
2. User asks: "How does the magma form?"
   └─→ Query classified as TOPIC_FOLLOWUP
   
3. AI acknowledges
   └─→ "Great question! Let me show you how it forms..."
   └─→ Screen shows mini-loader
   
4. New slides generated (1-2 slides)
   └─→ Marked as isFollowUp: true
   └─→ parentSlideId: current slide
   
5. Slides appended to topic
   └─→ Sidebar updates: new nested item appears
   └─→ Navigation jumps to new slide
   
6. AI narrates new slides
   └─→ "Deep under the Earth's surface..."
   
7. Follow-up completes
   └─→ AI: "Back to where we were, or explore more?"
```

### Flow 4: New Topic

```
1. User viewing volcano slides
   
2. User asks: "How do airplanes fly?"
   └─→ Query classified as NEW_TOPIC
   
3. AI acknowledges topic switch
   └─→ "Airplanes! That's a cool topic. Let me explain..."
   
4. New topic created
   └─→ Name: "How Airplanes Fly"
   └─→ Icon: ✈️
   └─→ Added to sidebar
   
5. Slides generated
   └─→ Full generation flow
   └─→ 3-5 slides created
   
6. Navigation switches to new topic
   └─→ Slideshow begins
   └─→ Previous topic preserved in sidebar
```

### Flow 5: Tap-to-Inquire

```
1. User viewing slide with diagram
   
2. User taps on specific region (x: 45, y: 62)
   └─→ Tap coordinates captured
   └─→ Sent to /api/inquire with slide context
   
3. AI identifies tapped element
   └─→ "You tapped on the magma chamber!"
   
4. AI explains (verbal)
   └─→ "This is where molten rock collects..."
   └─→ Highlight pulses around tapped area
   
5. Response completes
   └─→ AI: "Want me to explain more about this part?"
```

### Flow 6: Return to Previous Topic

```
1. User on "Airplanes" topic
   
2. User asks: "Go back to volcanoes"
   └─→ Query classified as EXISTING_TOPIC
   └─→ matchedTopicId found
   
3. AI acknowledges
   └─→ "Sure! Let's go back to volcanoes."
   
4. Navigation switches
   └─→ Volcanoes topic becomes active
   └─→ Last viewed slide shown
   
5. AI offers continuation
   └─→ "Where were we... want to continue or ask something?"
```

---

## **Generation Pipeline**

### Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                       GENERATION PIPELINE                           │
│                                                                     │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐            │
│  │  INPUT  │──▶│ SCRIPT  │──▶│ VISUALS │──▶│  AUDIO  │──▶ OUTPUT  │
│  │         │   │         │   │         │   │         │            │
│  │ Query   │   │ Gemini  │   │ Gemini  │   │ Gemini  │   Slides   │
│  │ Context │   │ 3 Pro   │   │ 3 Image │   │ 3 TTS   │            │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘            │
│                                                                     │
│  Timeline:                                                          │
│  [0s]─────[3s]─────[8s]─────[15s]─────[20s]─────[25s]              │
│   │        │        │         │         │         │                │
│   Query    Script   Images    Images    Audio     Complete         │
│   sent     ready    start     done      done                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 1: Script Generation

**Input:** User query + conversation context
**Model:** Gemini 3 Pro
**Output:** Structured lesson plan

```typescript
const SCRIPT_PROMPT = `
You are an educational content creator for ShowMe, an AI tutor for kids and students.

Create a visual explanation for this question:
Question: {query}
Target audience: {audience || "students ages 8-14"}
Previous context: {conversationContext}

Generate a lesson with 3-5 slides. For each slide, provide:

1. concept: The key idea for this slide (1 sentence)
2. narration: Natural spoken explanation (2-4 sentences, 8-15 seconds when spoken)
   - Use simple, friendly language
   - Reference visual elements: "See this...", "Look at the..."
   - Connect to previous slides: "Remember when...", "Now..."
3. imagePrompt: Detailed prompt for diagram generation
   - Specify: layout, labels, colors, arrows, style
   - Request: "educational infographic style, clean, labeled"
   - Include: specific annotations to generate
4. annotations: List of key elements in the diagram
   - id: unique identifier
   - label: what it is
   - description: 1-sentence explanation
   - position: approximate (top-left, center, bottom-right, etc.)

Output as JSON:
{
  "topicName": "Friendly topic title",
  "topicIcon": "relevant emoji",
  "slides": [
    {
      "concept": "...",
      "narration": "...",
      "imagePrompt": "...",
      "annotations": [
        {
          "id": "a1",
          "label": "...",
          "description": "...",
          "position": "center"
        }
      ]
    }
  ]
}
`;
```

### Step 2: Parallel Generation

Once script is ready, generate images and audio in parallel:

```typescript
async function generateSlideContent(script: Script): Promise<Slide[]> {
  const slides = await Promise.all(
    script.slides.map(async (slideScript, index) => {
      // Generate image and audio in parallel
      const [imageResult, audioResult] = await Promise.all([
        generateImage(slideScript.imagePrompt),
        generateTTS(slideScript.narration)
      ]);
      
      return {
        id: generateId(),
        query: script.query,
        imageUrl: imageResult.imageUrl,
        audioUrl: audioResult.audioUrl,
        narration: slideScript.narration,
        duration: audioResult.duration,
        annotations: mapAnnotationPositions(slideScript.annotations),
        isFollowUp: script.isFollowUp,
        parentSlideId: script.parentSlideId,
        depth: script.depth,
        createdAt: Date.now()
      };
    })
  );
  
  return slides;
}
```

### Step 3: Image Generation

**Model:** Gemini 3 Pro Image (Nano Banana Pro)

```typescript
const IMAGE_PROMPT_TEMPLATE = `
Create an educational diagram:

{slideScript.imagePrompt}

Style requirements:
- Clean, modern infographic style
- White or light gradient background
- Bold, readable labels (minimum 14pt equivalent)
- Use arrows to show flow/relationships
- Include numbered callouts for key parts
- Color-coded elements for clarity
- Child-friendly but not childish
- No text smaller than clearly readable

Annotations to include:
{slideScript.annotations.map(a => `- ${a.label}: ${a.description}`).join('\n')}

Output: High-quality PNG, 1920x1080 resolution
`;
```

### Step 4: Audio Generation

**Model:** Gemini 3 TTS

```typescript
async function generateTTS(text: string): Promise<{ audioUrl: string; duration: number }> {
  const response = await gemini.generateContent({
    model: 'gemini-3-tts',
    contents: [{
      parts: [{
        text: text
      }]
    }],
    generationConfig: {
      voice: 'friendly-educator',  // or 'young-teacher', 'storyteller'
      speakingRate: 0.95,          // Slightly slower for clarity
      pitch: 0,                     // Neutral
      audioFormat: 'mp3'
    }
  });
  
  const audioData = response.audio;
  const duration = response.audioDuration;
  
  return {
    audioUrl: `data:audio/mp3;base64,${audioData}`,
    duration
  };
}
```

### Step 5: Annotation Position Mapping

Convert semantic positions to coordinates:

```typescript
function mapAnnotationPositions(annotations: SemanticAnnotation[]): Annotation[] {
  const positionMap: Record<string, { x: number; y: number }> = {
    'top-left': { x: 20, y: 20 },
    'top-center': { x: 50, y: 20 },
    'top-right': { x: 80, y: 20 },
    'center-left': { x: 20, y: 50 },
    'center': { x: 50, y: 50 },
    'center-right': { x: 80, y: 50 },
    'bottom-left': { x: 20, y: 80 },
    'bottom-center': { x: 50, y: 80 },
    'bottom-right': { x: 80, y: 80 },
  };
  
  return annotations.map(a => ({
    id: a.id,
    type: 'region' as const,
    x: positionMap[a.position]?.x || 50,
    y: positionMap[a.position]?.y || 50,
    width: 15,
    height: 15,
    label: a.label,
    description: a.description
  }));
}
```

---

## **Implementation Phases**

### Week 1 (Jan 15-21): Foundation

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Project setup | Vite + React + Tailwind, Express backend, Gemini 3 SDK integration, Basic folder structure |
| 3-4 | Slide generation pipeline | `/api/generate` endpoint, Image generation with Nano Banana Pro, TTS generation, Slide data model |
| 5-6 | Voice input + greeting | Web Speech API integration, `/api/greet` endpoint, Mic button component, Live transcription display |
| 7 | Basic UI shell | Three-state layout (listening/generating/slideshow), Slide viewer component, Progress indicators, Basic navigation |

### Week 2 (Jan 22-28): Core Tutor

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 8-9 | Narration with annotations | TTS playback system, Annotation rendering (baked-in), Subtitle display, Play/pause controls |
| 10-11 | Push-to-talk interrupt | Voice manager class, Interrupt detection, `/api/respond` endpoint, Pause/resume logic |
| 12 | Topic classification | `/api/classify` endpoint, Classification prompt, Routing logic, Decision handling |
| 13 | Slide appending (follow-ups) | Follow-up detection, Slide append logic, Parent-child relationships, Conversation context tracking |
| 14 | Topic sidebar | Topic list component, Expandable items, Navigation by click, localStorage persistence |

### Week 3 (Jan 29 - Feb 6): Polish & Differentiation

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 15-16 | Simulated duplex | Client-side VAD, Continuous listening during TTS, Interrupt handling refinement, Push-to-talk fallback toggle |
| 17-18 | Tap-to-inquire | Tap coordinate capture, `/api/inquire` endpoint, Highlight animation, Contextual responses |
| 19 | Pre-quiz engagement | `/api/generate/engagement` endpoint, Quiz UI component, Answer tracking, Callback after slideshow |
| 20 | Bug fixes & edge cases | Error handling, Loading states, Empty states, Mobile responsiveness |
| 21 | Demo prep | Demo script practice, Backup video recording, Deployment to Vercel, Final testing |

### Feb 7: Submit 🚀

---

## **Demo Script**

### Setup
- Chrome browser, fullscreen
- Quiet environment (or headphones)
- Have backup video ready

### Script (3-4 minutes)

```
[APP OPENS]

NARRATOR: "This is ShowMe — your AI tutor that draws the answers."

[AI GREETING PLAYS]
ShowMe: "Hey there! I'm ShowMe. What do you want to learn today?"

NARRATOR: "It's completely voice-first. Let's ask something."

[SPEAK TO APP]
User: "How do volcanoes erupt?"

[GENERATING STATE - show pre-quiz]
NARRATOR: "While it creates the explanation, ShowMe engages you with 
          a prediction question. Let's guess..."

[TAP ANSWER B]
User: [taps "Hot melted rock"]

[SLIDESHOW PLAYS]
ShowMe: "This is a cross-section of a volcano. See this red area?
        That's the magma chamber..."

[INTERRUPT MID-NARRATION]
User: "Wait, what's magma?"

[AI PAUSES, ANSWERS]
ShowMe: "Great question! Magma is rock that got so hot it melted into
        liquid — over 2,000 degrees!"

[HIGHLIGHT PULSES ON MAGMA]

NARRATOR: "I can also tap on anything to ask about it."

[TAP ON DIAGRAM]
ShowMe: "You tapped on the vent — that's like the volcano's chimney..."

[CONTINUE SLIDESHOW]
NARRATOR: "Follow-ups automatically create new slides..."

[ASK FOLLOW-UP]
User: "What happens when it erupts?"

[NEW SLIDES GENERATED & SHOWN]
ShowMe: "When pressure gets too high, boom! The magma shoots up..."

[SHOW SIDEBAR]
NARRATOR: "All topics are saved. I can switch anytime..."

User: "How do airplanes fly?"

[NEW TOPIC CREATED]
ShowMe: "Airplanes! Let me show you..."

[SHOW TOPIC LIST]
NARRATOR: "ShowMe remembers everything — volcanoes, airplanes, whatever
          you explore. Voice-first, visual-first, always ready to teach."

[END SCREEN]
NARRATOR: "ShowMe — ask anything, see it explained."

[END]
```

### Backup Questions (Pre-tested)
- "How do volcanoes erupt?" ← Primary demo
- "Why is the sky blue?"
- "How do airplanes fly?"
- "What are black holes?"

### If Voice Fails
1. Stay calm
2. "Let me show the text input option"
3. Type the question
4. Continue demo

---

## **Success Criteria**

### Functionality
- [ ] Voice input correctly transcribes
- [ ] AI greeting plays on app open
- [ ] Slides generate with annotations
- [ ] TTS narration plays in sync
- [ ] Interrupt pauses and responds
- [ ] Classification routes correctly
- [ ] Follow-ups append to topic
- [ ] New topics create properly
- [ ] Tap-to-inquire works
- [ ] Sidebar shows all topics
- [ ] Persistence survives refresh

### User Experience
- [ ] End-to-end in <30 seconds
- [ ] Interrupt feels responsive
- [ ] Voice feels conversational
- [ ] Visual answers are clear
- [ ] Navigation is intuitive
- [ ] Mobile is usable

### Technical
- [ ] All AI calls use Gemini 3
- [ ] No crashes during demo
- [ ] Graceful error handling
- [ ] Works in Chrome + Edge

---

## **Appendix**

### A. File Structure

```
showme/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SlideViewer.tsx
│   │   │   ├── TopicSidebar.tsx
│   │   │   ├── VoiceInput.tsx
│   │   │   ├── GeneratingState.tsx
│   │   │   ├── PreQuiz.tsx
│   │   │   └── MicButton.tsx
│   │   ├── hooks/
│   │   │   ├── useAppState.ts
│   │   │   ├── useVoice.ts
│   │   │   └── useNavigation.ts
│   │   ├── lib/
│   │   │   ├── voiceManager.ts
│   │   │   ├── api.ts
│   │   │   └── storage.ts
│   │   ├── store/
│   │   │   └── appStore.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── greet.ts
│   │   │   ├── classify.ts
│   │   │   ├── generate.ts
│   │   │   ├── respond.ts
│   │   │   └── inquire.ts
│   │   ├── services/
│   │   │   ├── gemini.ts
│   │   │   ├── scriptGenerator.ts
│   │   │   ├── imageGenerator.ts
│   │   │   └── ttsGenerator.ts
│   │   ├── prompts/
│   │   │   ├── classification.ts
│   │   │   ├── script.ts
│   │   │   └── response.ts
│   │   └── index.ts
│   └── package.json
│
├── shared/
│   └── types.ts
│
└── README.md
```

### B. Environment Setup

```bash
# Clone and install
git clone <repo>
cd showme

# Frontend
cd frontend
npm install
cp .env.example .env.local
# Add: VITE_API_URL=http://localhost:3001

# Backend
cd ../backend
npm install
cp .env.example .env
# Add: GEMINI_API_KEY=your_key

# Run development
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

### C. Gemini 3 API Quick Reference

```typescript
// Text generation
const response = await genai.models.generateContent({
  model: 'gemini-3-pro',
  contents: [{ parts: [{ text: prompt }] }]
});

// Image generation
const response = await genai.models.generateContent({
  model: 'gemini-3-pro-image',
  contents: [{ parts: [{ text: imagePrompt }] }],
  generationConfig: { responseType: 'image' }
});

// TTS
const response = await genai.models.generateContent({
  model: 'gemini-3-tts',
  contents: [{ parts: [{ text: narration }] }],
  generationConfig: { audioFormat: 'mp3' }
});
```

---

**End of Specification**

*Version 2.0 — Hackathon Edition*
*Target: February 7, 2026*
