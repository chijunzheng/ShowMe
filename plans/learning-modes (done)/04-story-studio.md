# Feature: Story Studio

## Dependencies

```
Depends on: 01-foundation
Blocks: 05-integration
Can parallel with: 02-mystery-lab, 03-wonder-lab
```

---

## Goal

Kid becomes a storyteller, creating their own narrative using learned concepts. AI generates illustrations in real-time as they speak.

---

## User Flow

**Screen 1: Story Prompt**
- Mission card: "Create a story about a water droplet's journey"
- Concept checklist: ☐ Evaporation ☐ Cloud ☐ Rain
- Blank canvas area
- Starter suggestion: "Once upon a time..."

**Screen 2: Recording (Real-time)**
- Live transcription appears
- Illustrations generate as they speak
- Checklist updates: ✓ Evaporation ☐ Cloud ☐ Rain
- Encouragement: "Nice! You described evaporation!"

**Screen 3: Story Complete**
- "Your Story is Ready!" with title
- Mini slideshow of their illustrated story
- Concepts used summary
- Play / Share / Try Again buttons

---

## Real-time Pipeline

```
Kid speaks
    ↓ (streaming)
Transcription
    ↓ (every 20s or pause)
Scene extraction (AI)
    ↓
Image generation
    ↓
Display illustration + update concept checklist
```

---

## Backend API

### POST /api/learn/story

```json
// Request
{ "slides": [...], "topicName": "Water Cycle" }

// Response
{
  "storyPrompt": "Create a story about a water droplet's journey",
  "conceptChecklist": ["evaporation", "condensation", "precipitation"],
  "starterSuggestion": "Once upon a time, there was a little water droplet named...",
  "imageStyle": "children's book illustration, colorful, friendly"
}
```

### POST /api/learn/story/scene

```json
// Request
{
  "transcript": "...named Drippy who lived in the ocean. One sunny day, Drippy felt warm and started floating up...",
  "topicName": "Water Cycle",
  "conceptChecklist": ["evaporation", "condensation", "precipitation"],
  "previousScenes": []
}

// Response
{
  "sceneDescription": "Drippy floating up from ocean",
  "imagePrompt": "Cute cartoon water droplet with happy face, floating up from blue ocean, sunny sky, children's book style",
  "conceptsFound": ["evaporation"],
  "narrativeText": "One sunny day, Drippy felt warm and started floating up into the sky..."
}
```

---

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `StoryStudio.jsx` | Main container, state machine |
| `StoryPrompt.jsx` | Mission card + concept checklist |
| `LiveCanvas.jsx` | Real-time illustration display |
| `VoiceStoryRecorder.jsx` | Voice recording with transcript |
| `ConceptTracker.jsx` | Checklist that updates live |
| `StoryPlayback.jsx` | Final slideshow player |
| `ShareStory.jsx` | Export/share options |

---

## Scoring

| Achievement | XP |
|-------------|-----|
| Completed story | 20 base |
| Per concept used | +10 each |
| All concepts used | +15 bonus |
| "Master Storyteller" badge | All concepts |

---

## Technical Notes

**Image Generation:**
- Use lower resolution for speed (512x512)
- Queue scenes, generate in background
- Show placeholder while generating
- Limit to 4-6 scenes max

**Voice Processing:**
- Streaming transcription
- Detect natural pauses (>2s silence)
- Trigger scene extraction on pause or 20s chunks

---

## Verification

- [ ] Story prompt generated from topic
- [ ] Concept checklist displays correctly
- [ ] Voice recording works with natural pauses
- [ ] Transcription appears in real-time
- [ ] Scenes extract correctly from transcript
- [ ] Images generate and display
- [ ] Concepts detected and checked off live
- [ ] Final slideshow plays correctly
- [ ] Share functionality works
- [ ] XP awarded based on concepts used
