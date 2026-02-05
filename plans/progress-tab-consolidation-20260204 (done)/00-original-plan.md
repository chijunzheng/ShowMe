# Learning Modes Access & Tab Consolidation Plan

## Problem Statement
1. Learning modes (Mystery Lab, Wonder Lab, Story Studio) only accessible after slideshow completion
2. World and Tree tabs have functional overlap
3. Need quick access to learning modes without re-watching slideshows

---

## Final Recommendation: Unified "Progress" Tab

Consolidate World + Tree + Learning Mode Access into a single **Progress** tab with clear information hierarchy.

### Tab Structure
```
[Learn]  [Progress]
   │          │
   │          └── Everything: World preview, Topics, Recommendations, Learning Modes
   │
   └── Voice input, Slideshow generation & playback
```

**Why 2 tabs instead of 3:**
- Learn = Active learning (new content)
- Progress = Everything else (review, practice, explore)
- Cleaner, simpler navigation

---

## Progress Tab Design

### Information Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Stats + Mini World Preview                     │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [XP: 450] [Streak: 5🔥] [Topics: 12]               ││
│  │  ┌─────────────────────┐                            ││
│  │  │   🌍 Mini World     │  ← Tap to expand fullscreen││
│  │  │   Tier: Sprouting   │    See your world grow     ││
│  │  └─────────────────────┘                            ││
│  └─────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│  SECTION 1: Due for Review (urgent, always visible)     │
│  "3 topics need review" → shows fading/due topics       │
├─────────────────────────────────────────────────────────┤
│  SECTION 2: Quick Practice (NEW - learning modes)       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │ Mystery │ │ Wonder  │ │ Story   │  ← Pick mode      │
│  │   Lab   │ │   Lab   │ │ Studio  │                   │
│  └─────────┘ └─────────┘ └─────────┘                   │
│  [Random Topic] or pick from list below                 │
├─────────────────────────────────────────────────────────┤
│  SECTION 3: Your Topics (Tree-style zones)              │
│  ┌─ Nature (5) ─────────────────────────────────────┐  │
│  │  🦋 Caterpillar  🐦 Bird Nav  🌸 Pollinators     │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌─ Civilization (4) ───────────────────────────────┐  │
│  │  🏛️ History  🎨 Art  🍕 Food                     │  │
│  └──────────────────────────────────────────────────┘  │
│  (Click topic → bottom sheet with ALL actions)          │
├─────────────────────────────────────────────────────────┤
│  SECTION 4: Recommended Next (AI suggestions)           │
│  "Build on your Nature knowledge:"                      │
│  → Butterfly Migration, Ecosystem Balance               │
└─────────────────────────────────────────────────────────┘
```

### Topic Action Sheet (when topic selected)

```
┌──────────────────────────────────────────┐
│  🦋 Caterpillar to Butterfly             │
│  Reviewed 3 days ago • Zone: Nature      │
├──────────────────────────────────────────┤
│  WATCH AGAIN                             │
│  [▶ Review Slideshow]                    │
├──────────────────────────────────────────┤
│  PRACTICE MODES                          │
│  [🔍 Mystery Lab]  [🌟 Wonder Lab]       │
│  [📖 Story Studio] [⚡ Quick Quiz]       │
├──────────────────────────────────────────┤
│  CONNECTIONS                             │
│  Related: Bird Migration, Ecosystems     │
└──────────────────────────────────────────┘
```

---

## World Experience: Preserved as "Reward View"

The World panorama becomes a **reward celebration**, not a daily-use tool:

1. **Mini preview** in Progress header - always visible, shows tier
2. **Tap to expand** into fullscreen immersive mode
3. **Evolution animation** plays when new topic learned
4. **Fullscreen view** keeps all current features (pan/zoom, hotspots, explore mode)

**Key insight:** World serves an *emotional* purpose (see progress visualized). It doesn't need its own tab - it needs a *moment* when users feel rewarded.

### World Display Triggers
- New topic learned → Evolution animation + fullscreen reveal
- Tier upgrade → Celebration + world transformation
- User taps mini-preview → Fullscreen exploration mode
- Background: World regenerates as topics accumulate

---

## Quick Practice Section: Learning Modes Hub

### Design

```
┌─────────────────────────────────────────────────────┐
│  Quick Practice                                     │
│  ─────────────────────────────────────────────────  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │     🔍      │ │     🌟      │ │     📖      │   │
│  │  Mystery    │ │   Wonder    │ │   Story     │   │
│  │    Lab      │ │    Lab      │ │   Studio    │   │
│  └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                     │
│  Pick a topic:  [Random 🎲] or select below         │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🦋 Caterpillar   🐦 Bird Nav   🧭 Compass    │  │
│  │ 🐠 Fish Resp     🌸 Pollinators  🔊 Echo     │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Flow
1. User selects a mode (Mystery/Wonder/Story)
2. User picks topic (or hits Random)
3. Immediately launches that mode for that topic
4. No slideshow required - uses stored topic data

### Topic Data Requirement
Learning modes need:
- Topic name
- Slides array (for content reference)
- Explanation level (simple/standard/deep)

All stored in session state when topic was originally learned.

---

## Design Decisions

### Random Mode Behavior
**"Surprise Me!" picks both topic AND mode** - delivers delightful surprise.
- User can override: Select mode first → then only topic is randomized
- Flow: [Mystery] → [Random 🎲] = random topic for Mystery
- Flow: [Surprise Me! 🎲] = random topic + random mode

### Tab Structure
**Commit to 2 tabs** (Learn + Progress)
- Cleaner navigation, forces good design discipline
- 3rd tab can be added later when clear use case emerges (achievements, social)
- Don't reserve empty slots

### Due-for-Review Highlighting
Topics due for review show **amber ring** in topic chips (consistent with World hotspot styling).
- "Due for Review" section at top ensures visibility
- Topics also appear in main list with visual indicator
