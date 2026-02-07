# Learning Modes: Quiz Replacement Plan

**Status:** ✅ Completed (5/5 features)

## Problem

Traditional quizzes (MCQ, fill-blank, true/false) feel like school tests. Replace entirely with 3 new modes that feel like **play**.

## Solution

| Mode | Description | Learning Type |
|------|-------------|---------------|
| Mystery Lab | Solve puzzles using lesson knowledge | Applied reasoning |
| Wonder Lab | "What if?" predictions | Predictive thinking |
| Story Studio | Create illustrated stories | Creative synthesis |

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌──────────────────────┐                                      │
│   │  01-foundation       │  ◄── START HERE                      │
│   │  (Mode Selector UI)  │                                      │
│   └──────────┬───────────┘                                      │
│              │                                                  │
│              │ BLOCKS                                           │
│              ▼                                                  │
│   ┌──────────────────────┬──────────────────┬────────────────┐ │
│   │                      │                  │                │ │
│   │  02-mystery-lab      │  03-wonder-lab   │  04-story      │ │
│   │  (Detective Mode)    │  (What If?)      │  (Stories)     │ │
│   │                      │                  │                │ │
│   └──────────┬───────────┴────────┬─────────┴───────┬────────┘ │
│              │                    │                 │          │
│              │ CAN RUN IN PARALLEL ──────────────────          │
│              │                    │                 │          │
│              └────────────────────┼─────────────────┘          │
│                                   │                            │
│                                   │ ALL BLOCK                  │
│                                   ▼                            │
│                        ┌──────────────────────┐                │
│                        │  05-integration      │                │
│                        │  (XP, World, Polish) │                │
│                        └──────────────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Files

| File | Feature | Dependencies | Can Parallel? |
|------|---------|--------------|---------------|
| `01-foundation.md` | Mode Selector UI | None | - |
| `02-mystery-lab.md` | Detective Mode | 01-foundation | Yes (with 03, 04) |
| `03-wonder-lab.md` | What If Scenarios | 01-foundation | Yes (with 02, 04) |
| `04-story-studio.md` | Story Creation | 01-foundation | Yes (with 02, 03) |
| `05-integration.md` | XP, Gamification, World | 02, 03, 04 | No |

---

## Recommended Build Order

**Option A: Sequential (Safer)**
```
01 → 02 → 03 → 04 → 05
```

**Option B: Parallel After Foundation (Faster)**
```
01 → [02 + 03 + 04 in parallel] → 05
```

---

## Key Decisions

- **Traditional quiz:** Replace entirely (remove all 12 question types)
- **Goal:** Balanced engagement + learning outcomes

---

## Technical Summary

**New Backend Endpoints:**
- `POST /api/learn/mystery` - Generate mystery
- `POST /api/learn/whatif` - Generate scenario
- `POST /api/learn/story` - Generate story prompt
- `POST /api/learn/evaluate` - Evaluate responses

**New Frontend Structure:**
```
src/components/LearnModes/
├── ModeSelector.jsx
├── Mystery/
├── WhatIf/
└── Story/
```

**Reusable Code:**
- Voice recording: `VoiceQuestion.jsx` pattern
- Gamification: `useQuizGamification.js`
- Celebrations: `MicroCelebration.jsx`
