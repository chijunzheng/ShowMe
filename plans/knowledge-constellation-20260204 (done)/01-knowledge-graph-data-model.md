# Feature 01: Knowledge Graph Data Model

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Create the foundational data model for the Knowledge Graph system. This includes type definitions for nodes (topics as stars), edges (relationships), clusters (constellations), and gaps (suggested topics). Also includes the Explorer Rank system that replaces tree levels.

## Acceptance Criteria

- [ ] KnowledgeNode interface defined with all required fields
- [ ] KnowledgeEdge interface with relationship types
- [ ] KnowledgeCluster interface for constellation groupings
- [ ] KnowledgeGap interface for suggested topics
- [ ] KnowledgeGraph aggregate type combining all structures
- [ ] ExplorerRank system with 7 levels defined
- [ ] Utility functions for brightness calculation
- [ ] Utility functions for rank determination
- [ ] TypeScript types exported for frontend use

## Implementation Details

### Files to Create

| File | Purpose |
|------|---------|
| `backend/src/models/knowledgeGraph.js` | Backend type definitions and constants |
| `backend/src/services/knowledgeGraph.js` | Graph operations (CRUD, traversal) |
| `frontend/src/types/knowledgeGraph.ts` | Frontend TypeScript types |

### Key Data Structures

#### KnowledgeNode
```javascript
{
  id: string,
  name: string,
  concepts: string[],           // For relationship matching
  mastery: number,              // 0-1 from quiz performance
  brightness: 'dim' | 'glow' | 'bright' | 'brilliant',
  position: { x: number, y: number },
  followUps: string[],          // Child node IDs
  unlockedAt: number,
  lastReviewedAt: number
}
```

#### KnowledgeEdge
```javascript
{
  id: string,
  from: string,
  to: string,
  type: 'prerequisite' | 'extends' | 'contrasts' | 'applies' | 'bridges',
  strength: number,             // 0-1 Gemini confidence
  discovered: boolean,
  explanation: string
}
```

#### Explorer Ranks
```javascript
[
  { level: 1, title: 'Stargazer', icon: '🔭', minTopics: 0 },
  { level: 2, title: 'Observer', icon: '👁️', minTopics: 3 },
  { level: 3, title: 'Navigator', icon: '🧭', minTopics: 8 },
  { level: 4, title: 'Cartographer', icon: '🗺️', minTopics: 15 },
  { level: 5, title: 'Astronomer', icon: '⭐', minTopics: 25 },
  { level: 6, title: 'Cosmologist', icon: '🌌', minTopics: 40 },
  { level: 7, title: 'Pioneer', icon: '🚀', minTopics: 60 }
]
```

### Utility Functions

```javascript
// Calculate brightness from mastery score
function calculateBrightness(mastery: number): Brightness

// Get rank from topic count
function getExplorerRank(topicCount: number): ExplorerRank

// Calculate progress to next rank
function getRankProgress(topicCount: number): { current: ExplorerRank, next: ExplorerRank, progress: number }

// Create new node from topic
function createNodeFromTopic(topic: Topic): KnowledgeNode

// Create edge between nodes
function createEdge(from: string, to: string, type: EdgeType, strength: number): KnowledgeEdge
```

## Dependencies

### Depends On
- None (foundation feature)

### Blocks
- **Feature 02:** Gemini Graph Intelligence needs these types
- **Feature 03:** API Endpoints need these types
- **Feature 04:** Constellation UI needs these types
- **Feature 05:** Chapter Navigation needs node structure
- **Feature 06:** Explorer Ranks need rank definitions
- **Feature 07:** Migration needs target types

## Testing Requirements

- [ ] Unit tests for brightness calculation (all 4 levels)
- [ ] Unit tests for rank determination (all 7 levels)
- [ ] Unit tests for rank progress calculation
- [ ] Unit tests for node/edge creation utilities
- [ ] Type validation tests

## Implementation Checklist

- [x] Create `backend/src/models/knowledgeGraph.js` with all interfaces
- [x] Create `backend/src/services/knowledgeGraph.js` with utility functions
- [x] Create `frontend/src/types/knowledgeGraph.ts` with TypeScript types
- [x] Write unit tests for all utility functions
- [x] Verify types are correctly exported and importable

## Notes

- Brightness thresholds: dim (0-0.25), glow (0.25-0.5), bright (0.5-0.75), brilliant (0.75+)
- Edge types determine visual styling in constellation
- Position field is optional - used for saved layout state

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
