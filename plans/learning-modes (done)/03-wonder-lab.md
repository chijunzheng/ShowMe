# Feature: Wonder Lab (What If? Scenarios)

## Dependencies

```
Depends on: 01-foundation
Blocks: 05-integration
Can parallel with: 02-mystery-lab, 04-story-studio
```

---

## Goal

Present counterfactual scenarios that require understanding to reason about. No wrong answers - it's about thinking through consequences.

---

## User Flow

**Screen 1: Scenario Introduction**
- Dramatic visual of the scenario
- "What if the Earth had TWO moons?"
- Thinking prompts to guide reasoning
- Voice button to share prediction

**Screen 2: Recording Prediction**
- Live transcription
- Release to submit

**Screen 3: Science Reveal**
- Compare kid's predictions to actual consequences
- ✓ = "You got this right!"
- ★ = "Interesting thought! Actually..."
- Show bonus mind-expanding fact

---

## Key Differentiator

**Non-judgmental evaluation** - Every prediction gets validated or expanded upon. No "wrong" answers, only learning moments.

---

## Backend API

### POST /api/learn/whatif

```json
// Request
{ "slides": [...], "topicName": "The Moon", "explanationLevel": "standard" }

// Response
{
  "scenario": "What if the Earth had two moons?",
  "imagePrompt": "Earth from space with two moons orbiting",
  "thinkAboutHints": [
    "How does our moon affect Earth now?",
    "What would change with two moons?"
  ],
  "expectedConsequences": [
    { "concept": "tides", "consequence": "Much stronger, possibly dangerous" },
    { "concept": "moonlight", "consequence": "Brighter nights" },
    { "concept": "orbits", "consequence": "Complex gravitational dance" }
  ],
  "bonusFact": "Scientists think coastal cities couldn't exist!"
}
```

### POST /api/learn/whatif/evaluate

```json
// Request
{ "userPrediction": "bigger tides and brighter nights", "expectedConsequences": [...] }

// Response
{
  "matchedPredictions": [
    { "concept": "tides", "userPhrase": "bigger tides", "feedback": "Yes! Two moons = stronger pull" },
    { "concept": "moonlight", "userPhrase": "brighter nights", "feedback": "Correct!" }
  ],
  "missedConsequences": [{ "concept": "orbits", "reveal": "Complex gravitational dance" }],
  "xpEarned": 35
}
```

---

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `WonderLab.jsx` | Main container |
| `WhatIfScene.jsx` | Scenario + dramatic image |
| `ThinkPrompts.jsx` | Guiding questions |
| `PredictionRecorder.jsx` | Voice recording |
| `ConsequenceReveal.jsx` | Animated comparison |
| `BonusFactCard.jsx` | Mind-expanding extra |

---

## Scoring (Encouragement-based)

| Predictions Matched | XP | Message |
|---------------------|-----|---------|
| 3+ | 50 | "Amazing scientific thinking!" |
| 2 | 35 | "Great predictions!" |
| 1 | 20 | "Good start! Here's more..." |
| 0 | 10 | "Interesting ideas! Let's see..." |

Every attempt earns XP. No penalties.

---

## Verification

- [ ] Scenario is interesting and topic-relevant
- [ ] Image generates correctly
- [ ] Hints help without giving away
- [ ] Voice prediction recorded
- [ ] Predictions matched to consequences
- [ ] Non-judgmental feedback for all
- [ ] Missed consequences revealed educationally
- [ ] Bonus fact displays
- [ ] XP awarded (always positive)
