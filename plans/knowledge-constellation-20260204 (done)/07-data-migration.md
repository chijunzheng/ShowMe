# Feature 07: Data Migration Utility

**ID:** 07
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01

## Description

Create a migration utility that converts existing topic data to the new Knowledge Graph format. This ensures existing users don't lose their progress when the new system launches. Handles topics, relationships, quiz scores, and review history.

## Acceptance Criteria

- [ ] Migrates existing topics to KnowledgeNode format
- [ ] Converts `relatedTopics` arrays to KnowledgeEdge format
- [ ] Preserves quiz scores as mastery values
- [ ] Preserves timestamps (createdAt, lastAccessedAt)
- [ ] Creates initial clusters from old zone assignments
- [ ] Migration runs automatically on first load after update
- [ ] Graceful fallback if migration fails
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Logs migration status for debugging

## Implementation Details

### Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/utils/graphMigration.js` | Migration logic |

### Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/utils/topicStorage.js` | Call migration on load |
| `frontend/src/App.jsx` | Trigger migration check |

### Migration Logic

```javascript
// graphMigration.js

const MIGRATION_VERSION = 1
const MIGRATION_KEY = 'knowledgeGraph_migrationVersion'

// Check if migration needed
function needsMigration() {
  const currentVersion = localStorage.getItem(MIGRATION_KEY)
  return !currentVersion || parseInt(currentVersion) < MIGRATION_VERSION
}

// Run migration
function migrateToGraphModel(oldTopics) {
  if (!oldTopics || oldTopics.length === 0) {
    return { nodes: [], edges: [], clusters: [], gaps: [] }
  }

  // 1. Convert topics to nodes
  const nodes = oldTopics.map(topic => ({
    id: topic.id,
    name: topic.name,
    concepts: extractConcepts(topic),
    mastery: calculateMastery(topic),
    brightness: calculateBrightness(calculateMastery(topic)),
    position: null,  // Will be computed by layout
    followUps: extractFollowUpIds(topic.slides),
    unlockedAt: topic.createdAt || Date.now(),
    lastReviewedAt: topic.lastAccessedAt || Date.now()
  }))

  // 2. Convert relatedTopics to edges
  const edges = []
  oldTopics.forEach(topic => {
    const relatedTopics = topic.relatedTopics || []
    relatedTopics.forEach(relatedName => {
      const targetNode = nodes.find(n =>
        n.name.toLowerCase() === relatedName.toLowerCase()
      )
      if (targetNode && topic.id !== targetNode.id) {
        // Avoid duplicate edges
        const existingEdge = edges.find(e =>
          (e.from === topic.id && e.to === targetNode.id) ||
          (e.from === targetNode.id && e.to === topic.id)
        )
        if (!existingEdge) {
          edges.push({
            id: `edge_${topic.id}_${targetNode.id}`,
            from: topic.id,
            to: targetNode.id,
            type: 'extends',
            strength: 0.5,  // Unknown, Gemini will refine
            discovered: true,
            explanation: 'Migrated from related topics'
          })
        }
      }
    })
  })

  // 3. Create initial clusters from zones
  const clusters = createClustersFromZones(nodes, oldTopics)

  // 4. Mark migration complete
  localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION.toString())

  return { nodes, edges, clusters, gaps: [] }
}

// Extract concepts from topic slides
function extractConcepts(topic) {
  const concepts = []
  // Extract from topic name
  concepts.push(topic.name)

  // Extract key terms from slide subtitles
  if (topic.slides) {
    topic.slides.forEach(slide => {
      if (slide.subtitle) {
        // Simple extraction: first 3 nouns/key phrases
        // In production, could use NLP
        const words = slide.subtitle.split(' ').slice(0, 5)
        concepts.push(...words.filter(w => w.length > 4))
      }
    })
  }

  return [...new Set(concepts)].slice(0, 10)
}

// Calculate mastery from quiz performance
function calculateMastery(topic) {
  if (topic.quizScore !== undefined) {
    return topic.quizScore / 100  // Assuming 0-100 score
  }
  if (topic.correctAnswers !== undefined && topic.totalQuestions > 0) {
    return topic.correctAnswers / topic.totalQuestions
  }
  // Default: 0.5 if topic was viewed but not quizzed
  return topic.slides && topic.slides.length > 0 ? 0.3 : 0
}

// Extract follow-up slide IDs
function extractFollowUpIds(slides) {
  if (!slides) return []
  return slides
    .filter(s => s.parentId)
    .map(s => s.id)
}

// Create clusters from old zone system
function createClustersFromZones(nodes, oldTopics) {
  const zoneMap = {
    nature: { name: 'Natural World', icon: '🌿', color: '#10B981' },
    civilization: { name: 'Human World', icon: '🏛️', color: '#F59E0B' },
    arcane: { name: 'Abstract Realm', icon: '🔮', color: '#8B5CF6' }
  }

  const clusters = []

  Object.entries(zoneMap).forEach(([zone, config]) => {
    const zoneTopics = oldTopics.filter(t => t.zone === zone)
    if (zoneTopics.length > 0) {
      clusters.push({
        id: `cluster_${zone}`,
        name: config.name,
        icon: config.icon,
        nodeIds: zoneTopics.map(t => t.id),
        color: config.color
      })
    }
  })

  // Handle topics without zone
  const unzonedTopics = oldTopics.filter(t => !t.zone)
  if (unzonedTopics.length > 0) {
    clusters.push({
      id: 'cluster_uncategorized',
      name: 'Uncategorized',
      icon: '✨',
      nodeIds: unzonedTopics.map(t => t.id),
      color: '#6B7280'
    })
  }

  return clusters
}

// Rollback migration if needed
function rollbackMigration() {
  localStorage.removeItem(MIGRATION_KEY)
  // Keep old data intact - it's not deleted during migration
}

export {
  needsMigration,
  migrateToGraphModel,
  rollbackMigration,
  MIGRATION_VERSION
}
```

### Integration with App

```javascript
// In App.jsx or topicStorage.js

import { needsMigration, migrateToGraphModel } from './utils/graphMigration'

// On app load
useEffect(() => {
  if (needsMigration()) {
    console.log('Migrating to Knowledge Graph model...')
    try {
      const oldTopics = loadLegacyTopics()
      const graph = migrateToGraphModel(oldTopics)
      saveKnowledgeGraph(graph)
      console.log('Migration complete:', graph.nodes.length, 'nodes')
    } catch (error) {
      console.error('Migration failed:', error)
      // Continue with empty graph, old data preserved
    }
  }
}, [])
```

## Dependencies

### Depends On
- **Feature 01:** Knowledge Graph Data Model (target types)

### Blocks
- **Feature 08:** Legacy removal requires migration to be working

## Testing Requirements

- [ ] Unit tests for `extractConcepts()`
- [ ] Unit tests for `calculateMastery()` with various inputs
- [ ] Unit tests for `migrateToGraphModel()` with sample data
- [ ] Test idempotency (running migration twice)
- [ ] Test with empty topics array
- [ ] Test with topics missing optional fields
- [ ] Test edge deduplication
- [ ] Test zone-to-cluster mapping
- [ ] Integration test with localStorage

## Security Considerations

- [ ] Validate data before migration
- [ ] Don't delete old data until migration verified
- [ ] Log but don't expose errors to UI

## Implementation Checklist

- [x] Create `graphMigration.js` with all functions
- [x] Implement `extractConcepts()`
- [x] Implement `calculateMastery()`
- [x] Implement `migrateToGraphModel()`
- [x] Implement `createClustersFromZones()`
- [x] Add migration check to app startup
- [x] Add migration logging
- [x] Write unit tests
- [x] Test with real user data (manually)

## Notes

- Keep old localStorage keys intact during migration
- Migration should be fast (<100ms for typical user)
- Consider showing migration progress for large datasets
- May need to trigger Gemini relationship discovery after migration

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
