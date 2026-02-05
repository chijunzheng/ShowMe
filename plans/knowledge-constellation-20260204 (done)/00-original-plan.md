# Original Plan: Knowledge Constellation

This is a copy of the original implementation plan for reference.

---

# Knowledge Constellation Feature Plan

## Overview

Replace the Living World and MagicalTree with a unified **Knowledge Constellation** - a Gemini-powered interactive graph that visualizes learning progress, topic relationships, and suggests new explorations.

## Goals

1. **Visualize knowledge as interconnected stars** - Topics become stars, relationships become lines
2. **Gemini-powered intelligence** - Auto-discover relationships, identify gaps, suggest paths
3. **Improve follow-up navigation** - Chapter-based segments in slideshow view
4. **New progression system** - Explorer ranks replace tree levels
5. **Remove legacy debt** - Clean removal of World and Tree systems

---

## Data Structures

### Knowledge Node (Topic as Star)
```javascript
interface KnowledgeNode {
  id: string
  name: string
  concepts: string[]           // Key concepts covered (for relationship matching)
  mastery: number              // 0-1 based on quiz performance
  brightness: 'dim' | 'glow' | 'bright' | 'brilliant'  // Visual state
  position?: { x: number, y: number }  // For constellation layout
  followUps: string[]          // Child node IDs
  unlockedAt: number
  lastReviewedAt: number
}
```

### Knowledge Edge (Relationship)
```javascript
interface KnowledgeEdge {
  id: string
  from: string                 // Node ID
  to: string                   // Node ID
  type: 'prerequisite' | 'extends' | 'contrasts' | 'applies' | 'bridges'
  strength: number             // 0-1 confidence from Gemini
  discovered: boolean          // Has user explored this connection?
  explanation: string          // Why these connect
}
```

### Knowledge Cluster (Constellation)
```javascript
interface KnowledgeCluster {
  id: string
  name: string                 // Gemini-generated name
  icon: string                 // Emoji
  nodeIds: string[]
  color: string                // Hex color for visualization
}
```

### Knowledge Gap (Suggested Topic)
```javascript
interface KnowledgeGap {
  id: string
  suggestedTopic: string
  type: 'bridge' | 'deepen' | 'unlock'
  connectsTo: string[]         // Existing node IDs
  reasoning: string
  curiosityHook: string        // Intriguing question to spark interest
}
```

### Explorer Rank System
```javascript
const EXPLORER_RANKS = [
  { level: 1, title: 'Stargazer', icon: '🔭', minTopics: 0 },
  { level: 2, title: 'Observer', icon: '👁️', minTopics: 3 },
  { level: 3, title: 'Navigator', icon: '🧭', minTopics: 8 },
  { level: 4, title: 'Cartographer', icon: '🗺️', minTopics: 15 },
  { level: 5, title: 'Astronomer', icon: '⭐', minTopics: 25 },
  { level: 6, title: 'Cosmologist', icon: '🌌', minTopics: 40 },
  { level: 7, title: 'Pioneer', icon: '🚀', minTopics: 60 },
]
```

---

## Visual Design

### Star Brightness (based on mastery)
- dim (0-0.25):      ○  faint, barely visible
- glow (0.25-0.5):   ✧  soft glow
- bright (0.5-0.75): ✦  clear star
- brilliant (0.75+): ★  bright with rays

### Edge Styles (based on type)
- prerequisite: solid line →
- extends: dashed line --→
- contrasts: dotted line ···
- bridges: thick line ═══

### Gap Stars
- Pulsing dim star with "?"
- Tooltip shows curiosity hook
- Tap to start learning

---

## Gemini Intelligence Functions

1. `discoverRelationships(newTopic, existingNodes)` - Find connections when new topic added
2. `identifyKnowledgeGaps(graph)` - Analyze gaps periodically
3. `clusterKnowledge(nodes)` - Group topics into constellations
4. `determineFollowUpPlacement(query, context)` - Decide where follow-ups attach
5. `suggestLearningPath(graph, userGoal)` - Generate learning path to goal

---

## Legacy Removal

### Delete Entirely
- `frontend/src/components/LivingWorld/*`
- `frontend/src/components/MagicalTree/*`
- `frontend/src/hooks/useLivingWorld.js`
- `frontend/src/components/FollowUpPanel.jsx`
- `frontend/src/components/FollowUpDrawer.jsx`
- `frontend/src/components/ProgressDots.jsx`
- `backend/src/routes/world.js`

### Update References
- `frontend/src/App.jsx` - Remove world/tree state and imports
- `frontend/src/components/ProgressTab/ProgressTab.jsx` - Replace with Constellation
- `backend/src/index.js` - Remove world routes
