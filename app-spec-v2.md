# ShowMe v2.0 - Product Specification

## Vision

**ShowMe** transforms curious questions into visual learning journeys. With v2.0, we're introducing a **Knowledge Graph** that visualizes your learning journey, making every exploration feel like building a personal tree of understanding.

**New Tagline:** "Watch your curiosity grow into a forest of knowledge"

---

## What's New in v2.0

### 🌳 Knowledge Graph (Core Feature)
Replace the chronological topic sidebar with an **interactive knowledge graph** that:
- Auto-connects related topics using AI classification
- Grows as user explores (like a tree branching out)
- Shows unexplored "frontier" nodes as suggestions
- Creates a unique, personalized learning map

### 🎮 Enhanced Gamification
- XP & Leveling system
- Enhanced streaks with freeze/recovery
- Daily goals & challenges
- Expanded achievement badges
- Category mastery tracking

### 📚 Learning Improvements
- Spaced repetition review
- "Explain It Back" voice mode
- Visual memory cards
- Learning paths / courses

---

## Target Users

### Primary: K-12 Students (Ages 6-18)
- Curious learners with questions about the world
- Students needing homework help and concept explanations
- Visual learners who benefit from diagrams over text

### Secondary: Parents & Educators
- Parents wanting to encourage curiosity
- Teachers seeking supplementary visual content
- Homeschool families

---

## Core Value Proposition

1. **Voice-First**: Natural interaction - just speak your question
2. **30-Second Explanations**: AI-generated slideshows with narration
3. **Knowledge Graph**: See how your learning connects and grows
4. **Active Learning**: Socratic questions + "Explain It Back" mode
5. **Gamified Engagement**: XP, levels, streaks, and badges

---

## Feature Specifications

### 1. Knowledge Graph System

#### 1.1 Topic Classification (Backend)
When user explores a topic, AI classifies it into:

```javascript
// POST /api/topic/classify
{
  topic: "How does WiFi work?",
  existingTopics: ["Internet", "Bluetooth"]
}

// Response
{
  category: "Technology",
  relatedTo: ["Internet", "Bluetooth", "Radio Waves"],
  parentConcept: "Wireless Communication",
  childConcepts: ["WiFi 6", "WiFi Security"],
  suggestedNext: ["How do routers work?", "What is 5G?"]
}
```

#### 1.2 Graph Data Structure
```javascript
const knowledgeGraph = {
  nodes: [
    { id: 'wifi', label: 'WiFi', explored: true, category: 'tech', xp: 15 },
    { id: 'bluetooth', label: 'Bluetooth', explored: true, category: 'tech', xp: 10 },
    { id: 'routers', label: 'Routers', explored: false, suggested: true },
  ],
  edges: [
    { from: 'wifi', to: 'bluetooth', type: 'related' },
    { from: 'wifi', to: 'routers', type: 'suggested' },
  ]
}
```

#### 1.3 Node States
| State | Appearance | Description |
|-------|------------|-------------|
| Explored | Solid color, full opacity | User has learned this |
| Suggested | Dashed outline, 50% opacity | AI recommends exploring |
| Locked | Grayed out, lock icon | Requires prerequisite |
| Current | Pulsing highlight | Currently viewing |

#### 1.4 Interactions
- **Tap explored node** → View/replay that topic
- **Tap suggested node** → "Learn about [X]?" → Start new slideshow
- **Pinch/zoom** → Navigate large graphs
- **Double-tap** → Center and focus on node

#### 1.5 Suggestion Engine
Based on the graph, intelligently suggest next topics:

| Suggestion Type | Description |
|----------------|-------------|
| Bridge topics | "You know WiFi and Encryption separately - learn how they connect!" |
| Deeper dive | "Go deeper into WiFi → WiFi 6, WiFi Security" |
| Broader context | "Zoom out to Wireless Communication" |
| Adjacent interest | "Based on your tech interests, try: How does GPS work?" |

---

### 2. XP & Leveling System

#### 2.1 XP Rewards
| Action | XP Reward |
|--------|-----------|
| Complete a topic slideshow | +10 XP |
| Answer Socratic question (any score) | +15 XP |
| Perfect Socratic answer (5 stars) | +25 XP |
| Use "Deep" explanation level | +20 XP |
| Daily login | +5 XP |
| First question of the day | +10 XP bonus |
| Connect 2 related topics | +15 XP |
| Complete a review session | +10 XP |

#### 2.2 Level Progression
| Level | Name | XP Required |
|-------|------|-------------|
| 1-5 | Curious | 0 - 100 |
| 6-10 | Explorer | 100 - 500 |
| 11-15 | Scholar | 500 - 1,500 |
| 16-20 | Expert | 1,500 - 5,000 |
| 21+ | Master | 5,000+ |

---

### 3. Enhanced Streak System

#### 3.1 Streak Features
- **Basic Streak**: Consecutive days of learning
- **Streak Freeze**: Allow 1 "streak freeze" per week (keeps streak if you miss a day)
- **Streak Recovery**: Pay 50 XP to restore a broken streak within 24 hours
- **Weekend Warrior**: Double XP on weekends

#### 3.2 Streak Milestones
| Milestone | Badge | Bonus |
|-----------|-------|-------|
| 7 days | Week Warrior | +50 XP |
| 30 days | Monthly Master | +200 XP |
| 100 days | Century Scholar | +500 XP |
| 365 days | Year of Wonder | +2000 XP |

---

### 4. Daily Goals & Challenges

#### 4.1 Daily Learning Goal
Customizable daily target (default: 3 topics)
```
┌─────────────────────────────────────┐
│  Today's Goal: 3/5 topics explored  │
│  ████████░░░░░░░░░░░░  60%         │
│                                     │
│  🎯 Complete 2 more to earn bonus!  │
└─────────────────────────────────────┘
```

#### 4.2 Daily Challenges (Random)
| Challenge | Reward |
|-----------|--------|
| Explore a Science topic | +15 XP |
| Answer 3 Socratic questions | +20 XP |
| Try a Deep explanation | +15 XP |
| Learn something in a new category | +25 XP |
| Connect 2 topics in your graph | +20 XP |

---

### 5. Expanded Achievement Badges

#### 5.1 Existing Badges
| Badge ID | Name | Criteria |
|----------|------|----------|
| CURIOUS_MIND | Curious Mind | Asked first question |
| STREAK_3 | Getting Started | 3-day streak |
| STREAK_7 | Dedicated Learner | 7-day streak |
| STREAK_30 | Knowledge Seeker | 30-day streak |
| DEEP_THINKER | Deep Thinker | Used Deep explanation |
| QUESTION_10 | Question Champion | Asked 10 questions |
| SOCRATIC_5 | Critical Thinker | 5 Socratic answers |

#### 5.2 New Badges
| Badge ID | Name | Criteria | Rarity |
|----------|------|----------|--------|
| EARLY_BIRD | Early Bird | Learn before 7am | Common |
| NIGHT_OWL | Night Owl | Learn after 10pm | Common |
| SCIENCE_FAN | Science Fan | 10 science topics | Common |
| TECH_WIZARD | Tech Wizard | 10 technology topics | Common |
| HISTORY_BUFF | History Buff | 10 history topics | Common |
| POLYMATH | Polymath | Topics in 5+ categories | Rare |
| PERFECT_SCORE | Perfect Score | 5 stars on Socratic 10x | Rare |
| VOICE_MASTER | Voice Master | 100 voice questions | Rare |
| DEEP_DIVER | Deep Diver | 20 "Deep" explanations | Epic |
| CONNECTOR | Connector | Connect 10 topics in graph | Rare |
| KNOWLEDGE_TREE | Knowledge Tree | 50 nodes in graph | Epic |
| COMPLETIONIST | Completionist | All other badges | Legendary |

---

### 6. Spaced Repetition Review

#### 6.1 Review Schedule
| Time Since Learning | Prompt |
|---------------------|--------|
| 1 day | "Quick refresh?" |
| 3 days | "Time to review!" |
| 7 days | "Remember this?" |
| 30 days | "Long-term check" |

#### 6.2 Review UI
```
┌─────────────────────────────────────┐
│  📖 Time to Review!                 │
│                                     │
│  You learned "How WiFi works"       │
│  3 days ago. Quick refresh?         │
│                                     │
│  [Review Now +15 XP]  [Later]       │
└─────────────────────────────────────┘
```

---

### 7. "Explain It Back" Mode

#### 7.1 Flow
1. After slideshow: "Can you explain [concept] in your own words?"
2. User speaks their explanation
3. AI evaluates understanding and gives feedback
4. Higher XP for verbal explanations vs. skip (+30 XP)

#### 7.2 Evaluation Criteria
- Key concepts mentioned
- Accuracy of explanation
- Completeness
- Use of proper terminology

---

### 8. Visual Memory Cards

#### 8.1 Auto-Generation
Each topic creates 3-5 visual flashcards:
- Cards have the AI diagram + key point
- "Swipe right" = I remember
- "Swipe left" = Review again
- Spaced repetition scheduling

```
┌─────────────────────────────────────┐
│  [AI-generated diagram here]        │
│                                     │
│  What makes WiFi signals slow       │
│  through walls?                     │
│                                     │
│  [Tap to reveal answer]             │
└─────────────────────────────────────┘
```

---

## UI Design Specifications

### Layout Strategy

**Mobile**: Graph-Centric Home
- Knowledge graph is the centerpiece
- Slideshow is full-screen overlay
- Bottom sheet for graph during slideshow

**Desktop**: Split-Screen
- Graph always visible on left
- Content on right
- Responsive: collapses to mobile layout on small screens

### Option A: Graph-Centric Home (Primary)

```
┌────────────────────────────────────────────────────────────────────┐
│  🔥 12-day streak    ⭐ Level 15: Scholar    🎯 2,340 XP           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                    YOUR KNOWLEDGE MAP                              │
│                                                                    │
│              ○ Quantum Physics                                     │
│               ╲                                                    │
│          ●━━━━●━━━━○ 5G                                           │
│        Atoms  │  Radio                                             │
│               │                                                    │
│      ●━━━━━━━━┼━━━━━━━━●                                          │
│   Electricity │        WiFi ← YOU ARE HERE                         │
│               │         │                                          │
│               ●━━━━━━━━━┼━━━━○ Routers                             │
│            Internet     │                                          │
│                        ○ Encryption                                │
│                                                                    │
│    [Pinch to zoom]   [+ -]   [🔍 Search]   [📋 List View]         │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│    🌱 SUGGESTED NEXT                                               │
│    ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│    │ How do routers   │ │ What is          │ │ How does GPS     │ │
│    │ actually work?   │ │ encryption?      │ │ work?            │ │
│    │ [Explore →]      │ │ [Explore →]      │ │ [Explore →]      │ │
│    └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                    ┌─────────────────────┐                         │
│                    │    🎤 ASK ANYTHING   │                         │
│                    │    Tap to speak      │                         │
│                    └─────────────────────┘                         │
│                    "can't talk? type here"                         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Option B: Split-Screen (Desktop)

```
┌────────────────────────────────┬───────────────────────────────────┐
│                                │                                   │
│     KNOWLEDGE MAP              │     SLIDESHOW / CONTENT           │
│                                │                                   │
│    [Interactive Graph]         │    ┌─────────────────────────┐   │
│                                │    │                         │   │
│         ●━━━●━━━○              │    │   [AI Diagram Here]     │   │
│         │   │                  │    │                         │   │
│         ●━━━┼━━━●              │    └─────────────────────────┘   │
│             │                  │                                   │
│             ○                  │    WiFi works by transmitting     │
│                                │    radio waves at 2.4GHz...       │
│                                │                                   │
│  ─────────────────────────     │    ● ● ○ ○ ○  [▶] [◀] [▶▶]       │
│  🔥 12 days  ⭐ Lv15  🎯 2340  │                                   │
│  ─────────────────────────     │    Level: 📚 Standard  [↻]       │
│                                │                                   │
│  🌱 Suggested:                 ├───────────────────────────────────┤
│  • How do routers work?        │                                   │
│  • What is encryption?         │         🎤 ASK FOLLOW-UP          │
│                                │                                   │
└────────────────────────────────┴───────────────────────────────────┘
```

### Progress Dashboard

```
┌─────────────────────────────────────────────────────┐
│  Your Learning Journey                              │
│                                                     │
│  🔥 Streak: 12 days     ⭐ Level: Scholar (Lv 15)  │
│  📚 Topics: 47          🎯 XP: 2,340               │
│                                                     │
│  This Week                                          │
│  ████████████████░░░░░░░░ 67% of goal              │
│                                                     │
│  Categories Explored                                │
│  Science ████████░░ 80%                            │
│  History █████░░░░░ 50%                            │
│  Tech    ███████░░░ 70%                            │
│                                                     │
│  [View All Badges]  [See Knowledge Map]            │
└─────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Frontend Components

```
/frontend/src/components/
  Layout/
    AppShell.jsx         - Main responsive layout
    TopBar.jsx           - Stats (streak, level, XP)
    BottomNav.jsx        - Mobile tab navigation

  KnowledgeGraph/
    index.jsx            - Main graph container
    GraphCanvas.jsx      - Interactive force-directed graph
    GraphNode.jsx        - Node rendering (explored/suggested)
    GraphEdge.jsx        - Connection lines
    GraphOverlay.jsx     - Bottom sheet version for mobile
    SuggestionPanel.jsx  - Recommended next topics
    GraphControls.jsx    - Zoom, pan, view toggle

  Home/
    HomeScreen.jsx       - Graph-centric home view
    SuggestionCards.jsx  - "What to learn next" cards
    VoiceButton.jsx      - Central mic button
    DailyChallenge.jsx   - Daily goal card
    DailyGoal.jsx        - Progress toward daily goal

  Slideshow/
    SlideView.jsx        - Main slide display
    SlideControls.jsx    - Play/pause, navigation
    SocraticOverlay.jsx  - Socratic question mode
    ExplainBack.jsx      - "Explain It Back" mode

  Progress/
    ProgressDashboard.jsx - XP, badges, streaks
    BadgeGrid.jsx        - Achievement collection
    CategoryMastery.jsx  - Per-category progress bars
    LevelProgress.jsx    - XP bar to next level
    StreakCalendar.jsx   - Visual streak history

  Gamification/
    XPPopup.jsx          - "+15 XP" floating animation
    LevelUpModal.jsx     - Level up celebration
    BadgeUnlock.jsx      - Badge unlock animation
    StreakMilestone.jsx  - Streak milestone celebration

  Review/
    ReviewPrompt.jsx     - Spaced repetition prompt
    MemoryCard.jsx       - Visual flashcard
    ReviewSession.jsx    - Review mode container
```

### API Endpoints

#### Existing
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate` | POST | Generate slideshow from query |
| `/api/generate/follow-up` | POST | Generate follow-up slides |
| `/api/classify` | POST | Classify query type |
| `/api/transcribe` | POST | Speech-to-text |
| `/api/voice/speak` | POST | Text-to-speech |
| `/api/socratic/question` | POST | Generate probing question |
| `/api/socratic/evaluate` | POST | Evaluate user's answer |

#### New - Knowledge Graph
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/graph` | GET | Fetch user's knowledge graph |
| `/api/graph/classify` | POST | Classify new topic & connections |
| `/api/graph/suggestions` | GET | Get AI suggestions based on graph |
| `/api/graph/node` | POST | Add/update node in graph |

#### New - Enhanced Gamification
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/xp` | POST | Award XP for action |
| `/api/user/level` | GET | Get current level & progress |
| `/api/user/streak/freeze` | POST | Use streak freeze |
| `/api/user/streak/recover` | POST | Pay XP to recover streak |
| `/api/user/challenges` | GET | Get daily challenges |
| `/api/user/challenges/complete` | POST | Mark challenge complete |

#### New - Review System
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/review/due` | GET | Get topics due for review |
| `/api/review/complete` | POST | Mark review complete |
| `/api/review/cards` | GET | Get memory cards for topic |

---

## Design System

### Colors by Category
| Category | Node Color | Icon |
|----------|------------|------|
| Science | 🟣 Purple #8B5CF6 | 🔬 |
| Technology | 🔵 Blue #3B82F6 | 💻 |
| History | 🟤 Brown #A16207 | 📜 |
| Art | 🟡 Yellow #EAB308 | 🎨 |
| Nature | 🟢 Green #22C55E | 🌿 |
| Space | ⚫ Dark Blue #1E3A8A | 🚀 |
| Math | 🔴 Red #EF4444 | ➗ |
| Language | 🟠 Orange #F97316 | 📝 |

### Animation Principles
1. **Node Growth**: New topics animate "sprouting" from connected nodes
2. **Connection Lines**: Animate drawing when relationships form
3. **XP Pop**: "+15 XP" floats up when earned
4. **Badge Unlock**: Celebratory animation + confetti
5. **Level Up**: Full-screen celebration with new level badge
6. **Graph Pulse**: Gentle pulse on current/active node

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. ✅ Fix Socratic feedback (provide correct answers when wrong)
2. Implement XP system with basic rewards
3. Add level progression UI
4. Enhanced streak with freeze option
5. Daily goal counter on home screen

### Phase 2: Knowledge Graph (Week 3-4)
1. Backend topic classification API
2. Graph data structure and storage
3. Basic force-directed graph visualization
4. Node states (explored, suggested, current)
5. Replace sidebar with graph view (mobile)

### Phase 3: Enhanced UI (Week 5-6)
1. Graph-centric home screen
2. Split-screen desktop layout
3. Suggestion cards based on graph
4. Graph overlay during slideshow
5. Responsive layout transitions

### Phase 4: Learning Features (Week 7-8)
1. Spaced repetition review system
2. Review prompts and scheduling
3. "Explain It Back" voice mode
4. Visual memory cards
5. Review session UI

### Phase 5: Polish (Week 9-10)
1. Expanded badge collection
2. Daily challenges
3. Category mastery tracking
4. Animations and celebrations
5. Performance optimization

---

## Success Metrics

### Engagement
- Daily Active Users (DAU)
- Average session length
- Knowledge graph node count per user
- Streak retention rate (7-day, 30-day)
- Daily goal completion rate

### Learning
- Topics explored per session
- Review completion rate
- "Explain It Back" participation rate
- Socratic answer quality scores
- Cross-category exploration

### Growth
- Graph node growth rate
- XP earning velocity
- Badge unlock rate
- Level progression speed

---

## Differentiation vs. Competitors

| Other Apps | ShowMe v2.0 |
|------------|------------|
| Flat topic list | Visual, connected knowledge graph |
| No relationships | AI-detected topic connections |
| Manual exploration | Intelligent suggestions based on graph |
| No sense of progress | Watch your tree grow |
| Generic suggestions | Graph-based recommendations |
| Passive learning | Voice-first active learning |
| Text explanations | AI-generated visual diagrams |
| Fixed curriculum | Learn anything you're curious about |

---

## Out of Scope (Future v3.0)

- Classroom Mode / Teacher Dashboard
- Social leaderboards
- Challenge a friend
- Learning paths / curated courses
- Parent progress reports
- Offline mode
- Widget for home screen
