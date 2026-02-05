# Feature: Mystery Lab (Detective Mode)

## Dependencies

```
Depends on: 01-foundation
Blocks: 05-integration
Can parallel with: 03-wonder-lab, 04-story-studio
```

---

## Goal

Detective-style learning where kids solve mysteries using knowledge from their lesson.

---

## User Flow

**Screen 1: Mystery Introduction**
- Show mystery scene image + setup text
- Display clues extracted from slides
- Voice button to explain theory

**Screen 2: Recording Theory**
- Live transcription as kid speaks
- Release to submit

**Screen 3: Result**
- Full solution → "Case Solved!" + badge + 50 XP
- Partial → "Getting Warmer!" + new clue + 15 XP + retry
- Wrong → Hint + 5 XP + retry

---

## Backend API

### POST /api/learn/mystery

```json
// Request
{ "slides": [...], "topicName": "Photosynthesis", "explanationLevel": "standard" }

// Response
{
  "mysteryTitle": "The Case of the Dying Plants",
  "mysterySetup": "The plants are dying, but they get plenty of sun!",
  "imagePrompt": "greenhouse with wilting plants, sunny day",
  "clues": [{ "text": "The greenhouse is sealed", "slideRef": 2 }],
  "expectedConcepts": ["carbon dioxide", "photosynthesis"],
  "solutionExplanation": "Plants need CO2..."
}
```

### POST /api/learn/mystery/evaluate

```json
// Request
{ "userTheory": "...", "expectedConcepts": [...] }

// Response
{ "result": "solved|partial|retry", "matchedConcepts": [...], "xpEarned": 50 }
```

---

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `MysteryLab.jsx` | Main container, state machine |
| `MysteryScene.jsx` | Mystery image + setup display |
| `CluePanel.jsx` | Collapsible clues list |
| `TheorySolver.jsx` | Voice recording + transcription |
| `DetectiveReward.jsx` | Success celebration |

---

## Evaluation Logic

```javascript
// Match concepts with fuzzy logic
// "greenhouse is closed" → matches "sealed environment"
// "can't breathe" → partial match for "carbon dioxide"

const matchRate = matchedConcepts.length / expectedConcepts.length
if (matchRate >= 0.8) return 'solved'      // 50 XP
if (matchRate >= 0.4) return 'partial'     // 15 XP + new clue
return 'retry'                              // 5 XP + hint
```

---

## Verification

- [ ] Mystery generates based on slide content
- [ ] Image displays correctly
- [ ] Clues reference actual slides
- [ ] Voice recording works
- [ ] Live transcription displays
- [ ] Concept matching evaluates correctly
- [ ] Partial solutions encourage retry
- [ ] XP awards correctly
