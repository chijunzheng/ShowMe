# Feature 02: Gemini Graph Intelligence Service

**ID:** 02
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 01

## Description

Create a Gemini-powered service that provides intelligent graph operations: discovering relationships between topics, identifying knowledge gaps, clustering topics into constellations, determining follow-up placement, and suggesting learning paths.

## Acceptance Criteria

- [ ] `discoverRelationships()` finds connections when new topic is added
- [ ] `identifyKnowledgeGaps()` analyzes graph and suggests bridging topics
- [ ] `clusterKnowledge()` groups related topics into constellations
- [ ] `determineFollowUpPlacement()` decides where follow-ups should attach
- [ ] `suggestLearningPath()` generates path to reach a learning goal
- [ ] All functions use appropriate Gemini models (flash-lite for fast, flash for creative)
- [ ] Proper error handling and fallbacks
- [ ] JSON response parsing with repair logic

## Implementation Details

### Files to Create

| File | Purpose |
|------|---------|
| `backend/src/services/geminiGraph.js` | All Gemini graph intelligence functions |

### Files to Modify

| File | Changes |
|------|---------|
| `backend/src/services/gemini.js` | Add helper functions if needed |

### Key Functions

#### 1. discoverRelationships(newTopic, existingNodes)

**Purpose:** When a user learns a new topic, find relationships to existing knowledge.

**Model:** `gemini-2.5-flash-lite` (fast, cheap)

**Returns:**
```javascript
{
  relationships: [
    {
      targetTopicId: string,
      type: 'prerequisite' | 'extends' | 'contrasts' | 'applies' | 'bridges',
      strength: number,        // 0-1
      explanation: string
    }
  ],
  suggestedCluster: string    // Which constellation this belongs to
}
```

#### 2. identifyKnowledgeGaps(graph)

**Purpose:** Periodically analyze user's knowledge graph and suggest topics that would strengthen understanding.

**Model:** `gemini-3-flash-preview` (more reasoning needed)

**Returns:**
```javascript
{
  gaps: [
    {
      suggestedTopic: string,
      type: 'bridge' | 'deepen' | 'unlock',
      connectsTo: string[],    // Node IDs
      reasoning: string,
      curiosityHook: string    // Intriguing question
    }
  ]
}
```

#### 3. clusterKnowledge(nodes)

**Purpose:** Group topics into natural constellations (not hardcoded zones).

**Model:** `gemini-3-flash-preview`

**Returns:**
```javascript
{
  clusters: [
    {
      name: string,
      icon: string,
      nodeIds: string[],
      color: string           // Suggested hex color
    }
  ]
}
```

#### 4. determineFollowUpPlacement(query, context)

**Purpose:** Decide where a follow-up question should attach in the graph. This **replaces/enhances** the current `classifyQuery()` logic in `/api/classify`.

**Model:** `gemini-2.5-flash-lite` (fast decision)

**Input Context:**
```javascript
{
  query: string,                    // User's follow-up question
  currentTopicName: string,         // Active topic
  currentSlideSubtitle: string,     // What user is viewing
  conversationPath: [               // How user got here
    { question: string, slideSubtitle: string }
  ],
  existingFollowUps: string[],      // Already asked follow-ups
  knowledgeGraph: {                 // User's knowledge state
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[]
  }
}
```

**Returns:**
```javascript
{
  placement: 'child' | 'sibling' | 'new_branch' | 'new_topic',
  reasoning: string,
  suggestedBranchName?: string,     // If new_branch
  relatedTopicId?: string,          // If connects to existing topic
  shouldMerge?: boolean,            // If very similar to existing follow-up
  mergeTargetId?: string            // Which follow-up to merge with
}
```

**Placement Meanings:**
- `child`: Directly related to current slide → nest under it
- `sibling`: Related to topic but not current slide → add at topic level
- `new_branch`: Significant sub-topic → create named branch
- `new_topic`: Unrelated → start fresh topic

**Integration Point:** Called from `/api/classify` route BEFORE generation:

```javascript
// backend/src/routes/classify.js - MODIFIED FLOW

// Current: classifyQuery() → follow_up | new_topic | slide_question
// New: classifyQuery() → then determineFollowUpPlacement() for follow_ups

async function handleClassification(query, context) {
  // Step 1: Basic classification (existing logic)
  const basicClass = await classifyQuery(query, context)

  // Step 2: If follow-up, determine placement
  if (basicClass.type === 'follow_up') {
    const placement = await determineFollowUpPlacement(query, {
      currentTopicName: context.topicName,
      currentSlideSubtitle: context.slideSubtitle,
      conversationPath: context.conversationPath,
      existingFollowUps: context.existingFollowUps,
      knowledgeGraph: context.graph
    })

    return {
      ...basicClass,
      placement: placement.placement,
      reasoning: placement.reasoning,
      suggestedBranchName: placement.suggestedBranchName,
      shouldMerge: placement.shouldMerge,
      mergeTargetId: placement.mergeTargetId
    }
  }

  return basicClass
}
```

#### 5. suggestLearningPath(graph, userGoal)

**Purpose:** Generate optimal learning sequence to reach a goal.

**Model:** `gemini-3-flash-preview`

**Returns:**
```javascript
{
  path: [
    { topic: string, reason: string }
  ],
  newTopicsNeeded: string[],
  estimatedSteps: number
}
```

### Prompt Templates

Each function should have well-crafted prompts that:
- Provide clear context about the user's knowledge state
- Request structured JSON output
- Include examples of expected responses
- Handle edge cases (empty graph, single node, etc.)

## Dependencies

### Depends On
- **Feature 01:** Knowledge Graph Data Model (types and structures)

### Blocks
- **Feature 03:** API Endpoints need these functions
- **Feature 04:** Constellation UI uses gap suggestions

## Testing Requirements

- [ ] Unit tests with mocked Gemini responses
- [ ] Integration tests with real Gemini calls (rate-limited)
- [ ] Test JSON repair logic for malformed responses
- [ ] Test error handling for API failures
- [ ] Test fallback behavior when rate-limited

## Security Considerations

- [ ] Sanitize user input before including in prompts
- [ ] Don't expose internal graph IDs in error messages
- [ ] Rate limit gap analysis to prevent API abuse

## Implementation Checklist

- [x] Create `backend/src/services/geminiGraph.js`
- [x] Implement `discoverRelationships()` with prompt
- [x] Implement `identifyKnowledgeGaps()` with prompt
- [x] Implement `clusterKnowledge()` with prompt
- [x] Implement `determineFollowUpPlacement()` with prompt
- [x] Implement `suggestLearningPath()` with prompt
- [x] Add JSON repair/parsing utilities
- [x] Add error handling and fallbacks
- [x] Write unit tests with mocked responses
- [x] Write integration test (optional, requires API key)

## Notes

- Use `temperature: 0.1` for deterministic functions (placement, relationships)
- Use `temperature: 0.5-0.7` for creative functions (gaps, clustering)
- Consider caching cluster results (expensive operation)
- Gap analysis should be triggered sparingly (e.g., after 3+ new topics)

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
