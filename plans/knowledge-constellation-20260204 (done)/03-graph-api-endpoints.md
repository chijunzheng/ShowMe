# Feature 03: Graph API Endpoints

**ID:** 03
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01, 02

## Description

Create REST API endpoints for the Knowledge Graph system. These endpoints expose graph operations to the frontend: fetching the full graph, discovering relationships, analyzing gaps, re-clustering, and generating learning paths.

## Acceptance Criteria

- [ ] `GET /api/graph` returns full knowledge graph for user
- [ ] `POST /api/graph/discover` finds relationships for new topic
- [ ] `POST /api/graph/gaps` analyzes and returns knowledge gaps
- [ ] `POST /api/graph/cluster` re-clusters all topics
- [ ] `POST /api/graph/path` generates learning path to goal
- [ ] All endpoints have proper error handling
- [ ] Input validation on all POST endpoints
- [ ] Routes registered in main Express app

## Implementation Details

### Files to Create

| File | Purpose |
|------|---------|
| `backend/src/routes/graph.js` | All graph-related API endpoints |

### Files to Modify

| File | Changes |
|------|---------|
| `backend/src/index.js` | Register graph routes |
| `backend/src/routes/classify.js` | Integrate `determineFollowUpPlacement()` into classification flow |
| `backend/src/routes/generate.js` | Use placement info to attach slides correctly |

### API Endpoints

#### GET /api/graph

**Purpose:** Fetch complete knowledge graph for the user.

**Request:** No body required (user identified by session/clientId)

**Response:**
```javascript
{
  success: true,
  data: {
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[],
    clusters: KnowledgeCluster[],
    gaps: KnowledgeGap[],
    explorerRank: {
      level: number,
      title: string,
      icon: string,
      progress: number  // 0-1 to next rank
    }
  }
}
```

#### POST /api/graph/discover

**Purpose:** Discover relationships when a new topic is added.

**Request:**
```javascript
{
  newTopic: {
    id: string,
    name: string,
    concepts: string[]
  },
  existingNodeIds: string[]  // Or fetch from stored graph
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    relationships: KnowledgeEdge[],
    suggestedCluster: string
  }
}
```

#### POST /api/graph/gaps

**Purpose:** Analyze knowledge graph and identify gaps.

**Request:**
```javascript
{
  clientId: string  // To fetch user's graph
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    gaps: KnowledgeGap[]
  }
}
```

#### POST /api/graph/cluster

**Purpose:** Re-cluster all topics into constellations.

**Request:**
```javascript
{
  clientId: string
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    clusters: KnowledgeCluster[]
  }
}
```

#### POST /api/graph/path

**Purpose:** Generate learning path to reach a goal.

**Request:**
```javascript
{
  clientId: string,
  goal: string  // What user wants to understand
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    path: [{ topic: string, reason: string }],
    newTopicsNeeded: string[],
    estimatedSteps: number
  }
}
```

### Route Structure

```javascript
// backend/src/routes/graph.js
const express = require('express')
const router = express.Router()
const {
  discoverRelationships,
  identifyKnowledgeGaps,
  clusterKnowledge,
  suggestLearningPath
} = require('../services/geminiGraph')
const {
  getGraphForUser,
  updateGraphEdges,
  updateGraphClusters
} = require('../services/knowledgeGraph')

router.get('/', async (req, res) => { ... })
router.post('/discover', async (req, res) => { ... })
router.post('/gaps', async (req, res) => { ... })
router.post('/cluster', async (req, res) => { ... })
router.post('/path', async (req, res) => { ... })

module.exports = router
```

### Error Handling

All endpoints should:
1. Validate required fields
2. Return consistent error format
3. Log errors for debugging
4. Handle Gemini rate limits gracefully

```javascript
// Error response format
{
  success: false,
  error: string,
  code: 'VALIDATION_ERROR' | 'RATE_LIMITED' | 'INTERNAL_ERROR'
}
```

## Dependencies

### Depends On
- **Feature 01:** Knowledge Graph Data Model (types)
- **Feature 02:** Gemini Graph Intelligence Service (functions)

### Blocks
- **Feature 04:** Constellation UI needs these endpoints

## Testing Requirements

- [ ] Integration tests for each endpoint
- [ ] Test input validation
- [ ] Test error responses
- [ ] Test rate limiting behavior
- [ ] Mock Gemini service for unit tests

## Integration: Enhanced Classification Flow

The existing `/api/classify` endpoint is enhanced to use Gemini for smarter follow-up placement:

### Current Flow
```
User asks question
    ↓
POST /api/classify
    ↓
classifyQuery() → "follow_up" | "new_topic" | "slide_question"
    ↓
POST /api/generate or /api/generate/follow-up
    ↓
Slides attached with basic parentId logic
```

### New Flow
```
User asks question
    ↓
POST /api/classify
    ↓
classifyQuery() → basic classification
    ↓
IF follow_up: determineFollowUpPlacement() → smart placement decision
    ↓
Return: { type, placement, reasoning, suggestedBranchName, shouldMerge }
    ↓
POST /api/generate/follow-up with placement info
    ↓
Slides attached according to Gemini's placement decision:
  - child: parentId = current slide
  - sibling: parentId = null (topic level)
  - new_branch: create section divider with suggestedBranchName
  - new_topic: redirect to /api/generate (fresh topic)
```

### Modified `/api/classify` Response

```javascript
// Enhanced response for follow-ups
{
  type: 'follow_up',
  complexity: 'simple' | 'moderate' | 'complex',
  placement: 'child' | 'sibling' | 'new_branch' | 'new_topic',
  reasoning: 'This question digs deeper into chlorophyll specifically',
  suggestedBranchName: 'Plant Pigments',  // Only if new_branch
  shouldMerge: false,
  mergeTargetId: null
}
```

### Modified `/api/generate/follow-up` Request

```javascript
// Enhanced request with placement info
{
  query: string,
  topicId: string,
  placement: 'child' | 'sibling' | 'new_branch',
  parentId: string | null,        // Set based on placement
  branchName: string | null,      // For section divider if new_branch
  complexity: string,
  conversationHistory: [],
  clientId: string
}
```

## Security Considerations

- [ ] Validate all input parameters
- [ ] Sanitize goal text in /path endpoint
- [ ] Rate limit expensive endpoints (/gaps, /cluster)
- [ ] Ensure users can only access their own graph

## Implementation Checklist

- [x] Create `backend/src/routes/graph.js`
- [x] Implement GET /api/graph
- [x] Implement POST /api/graph/discover
- [x] Implement POST /api/graph/gaps
- [x] Implement POST /api/graph/cluster
- [x] Implement POST /api/graph/path
- [x] Add input validation to all endpoints
- [x] Add error handling
- [x] Register routes in `backend/src/index.js`
- [x] Write integration tests

## Notes

- Consider caching GET /api/graph responses (invalidate on topic add)
- /gaps and /cluster are expensive - consider background processing
- /discover should be called automatically when topic is created

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
