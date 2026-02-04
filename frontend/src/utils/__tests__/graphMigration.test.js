/**
 * Graph Migration Utility Tests
 *
 * TDD tests for the graphMigration utility that converts existing topic data
 * to the new Knowledge Graph format.
 *
 * Tests cover:
 * - Concept extraction from topics
 * - Mastery calculation from quiz data
 * - Category determination
 * - Topic to node conversion
 * - Edge creation from relationships
 * - Cluster creation by category
 * - Full migration workflow
 * - Storage operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  extractConcepts,
  calculateMastery,
  calculateBrightnessFromMastery,
  determineCategory,
  topicToNode,
  createInitialEdges,
  createInitialClusters,
  migrateToGraphModel,
  needsMigration,
  migrateFromStorage,
  rollbackMigration,
  hasGraphInStorage,
  loadGraphFromStorage,
  saveGraphToStorage,
} from '../graphMigration'

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a mock topic with configurable properties
 *
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock topic
 */
function createMockTopic(overrides = {}) {
  const now = Date.now()
  // Use override name for topicName if provided, otherwise use 'Test Topic'
  const displayName = overrides.name || overrides.topicName || 'Test Topic'
  return {
    id: `topic_${now}_${Math.random().toString(36).substring(2, 9)}`,
    name: displayName,
    topicName: displayName,
    slides: [
      { id: 'slide_1', subtitle: 'This is slide content' },
      { id: 'slide_2', subtitle: 'More content here' },
    ],
    createdAt: now - 86400000, // 1 day ago
    lastAccessedAt: now,
    ...overrides,
  }
}

/**
 * Create mock localStorage for testing
 */
function createMockLocalStorage() {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
  }
}

// ============================================================================
// TESTS: extractConcepts
// ============================================================================

describe('extractConcepts', () => {
  describe('basic extraction', () => {
    it('extracts concepts from topic name', () => {
      const topic = createMockTopic({ name: 'Photosynthesis Process', topicName: 'Photosynthesis Process' })
      const concepts = extractConcepts(topic)

      expect(concepts).toContain('photosynthesis')
      expect(concepts).toContain('process')
    })

    it('extracts concepts from slide content', () => {
      const topic = createMockTopic({
        slides: [
          { id: 'slide_1', subtitle: 'Plants convert sunlight energy' },
          { id: 'slide_2', narration: 'Chlorophyll is essential for the reaction' },
        ],
      })
      const concepts = extractConcepts(topic)

      expect(concepts).toContain('plants')
      expect(concepts).toContain('sunlight')
      expect(concepts).toContain('energy')
      expect(concepts).toContain('chlorophyll')
    })

    it('limits concepts to 10 items', () => {
      const topic = createMockTopic({
        name: 'Very Long Topic Name With Many Words That Exceed Limit',
        slides: [
          {
            id: 'slide_1',
            subtitle: 'Additional content terms appear here for testing purposes',
            narration: 'More narration content with many unique technical terms',
          },
        ],
      })
      const concepts = extractConcepts(topic)

      expect(concepts.length).toBeLessThanOrEqual(10)
    })

    it('filters out short words (3 or fewer characters)', () => {
      const topic = createMockTopic({ name: 'The Cat And Dog', topicName: 'The Cat And Dog' })
      const concepts = extractConcepts(topic)

      expect(concepts).not.toContain('the')
      expect(concepts).not.toContain('cat')
      expect(concepts).not.toContain('and')
      expect(concepts).not.toContain('dog')
    })

    it('filters out stop words', () => {
      const topic = createMockTopic({
        name: 'Understanding Through Learning',
        topicName: 'Understanding Through Learning',
      })
      const concepts = extractConcepts(topic)

      expect(concepts).not.toContain('through')
      expect(concepts).toContain('understanding')
      expect(concepts).toContain('learning')
    })
  })

  describe('edge cases', () => {
    it('returns empty array for null topic', () => {
      expect(extractConcepts(null)).toEqual([])
    })

    it('returns empty array for undefined topic', () => {
      expect(extractConcepts(undefined)).toEqual([])
    })

    it('returns empty array for topic without name or slides', () => {
      expect(extractConcepts({})).toEqual([])
    })

    it('handles topic with empty slides array', () => {
      const topic = createMockTopic({ slides: [] })
      const concepts = extractConcepts(topic)

      expect(Array.isArray(concepts)).toBe(true)
    })

    it('handles slides with null entries', () => {
      const topic = createMockTopic({
        slides: [null, { id: 'slide_1', subtitle: 'Valid content' }, undefined],
      })
      const concepts = extractConcepts(topic)

      expect(concepts).toContain('valid')
      expect(concepts).toContain('content')
    })
  })
})

// ============================================================================
// TESTS: calculateMastery
// ============================================================================

describe('calculateMastery', () => {
  describe('quiz score sources', () => {
    it('uses quizScore property (0-100 range)', () => {
      const topic = createMockTopic({ quizScore: 80 })
      expect(calculateMastery(topic)).toBeCloseTo(0.8, 2)
    })

    it('uses quizScore property (0-1 range)', () => {
      const topic = createMockTopic({ quizScore: 0.75 })
      expect(calculateMastery(topic)).toBeCloseTo(0.75, 2)
    })

    it('uses quizResults.score property (0-100 range)', () => {
      const topic = createMockTopic({ quizResults: { score: 90 } })
      expect(calculateMastery(topic)).toBeCloseTo(0.9, 2)
    })

    it('uses quizResults.score property (0-1 range)', () => {
      const topic = createMockTopic({ quizResults: { score: 0.65 } })
      expect(calculateMastery(topic)).toBeCloseTo(0.65, 2)
    })

    it('uses mastery property directly', () => {
      const topic = createMockTopic({ mastery: 0.85 })
      expect(calculateMastery(topic)).toBeCloseTo(0.85, 2)
    })

    it('uses correctAnswers/totalQuestions ratio', () => {
      const topic = createMockTopic({ correctAnswers: 7, totalQuestions: 10 })
      expect(calculateMastery(topic)).toBeCloseTo(0.7, 2)
    })

    it('averages multiple sources when available', () => {
      const topic = createMockTopic({
        quizScore: 80, // 0.8
        mastery: 0.6,
      })
      const mastery = calculateMastery(topic)
      expect(mastery).toBeCloseTo(0.7, 2) // (0.8 + 0.6) / 2
    })
  })

  describe('default values', () => {
    it('returns 0.25 for topic with slides but no quiz data', () => {
      const topic = createMockTopic()
      expect(calculateMastery(topic)).toBeCloseTo(0.25, 2)
    })

    it('returns 0 for topic without slides and no quiz data', () => {
      const topic = createMockTopic({ slides: [] })
      expect(calculateMastery(topic)).toBe(0)
    })

    it('returns 0.25 for null topic', () => {
      expect(calculateMastery(null)).toBeCloseTo(0.25, 2)
    })

    it('returns 0.25 for undefined topic', () => {
      expect(calculateMastery(undefined)).toBeCloseTo(0.25, 2)
    })
  })

  describe('value clamping', () => {
    it('clamps scores above 1 (when normalized)', () => {
      const topic = createMockTopic({ quizScore: 150 })
      expect(calculateMastery(topic)).toBeLessThanOrEqual(1)
    })

    it('clamps negative scores to 0', () => {
      const topic = createMockTopic({ quizScore: -10 })
      expect(calculateMastery(topic)).toBeGreaterThanOrEqual(0)
    })
  })

  describe('edge cases', () => {
    it('handles totalQuestions of 0 (avoids division by zero)', () => {
      const topic = createMockTopic({ correctAnswers: 5, totalQuestions: 0 })
      // Should use default since division by zero is avoided
      expect(calculateMastery(topic)).toBeCloseTo(0.25, 2)
    })
  })
})

// ============================================================================
// TESTS: calculateBrightnessFromMastery
// ============================================================================

describe('calculateBrightnessFromMastery', () => {
  describe('brightness levels', () => {
    it('returns dim for mastery < 0.25', () => {
      expect(calculateBrightnessFromMastery(0)).toBe('dim')
      expect(calculateBrightnessFromMastery(0.1)).toBe('dim')
      expect(calculateBrightnessFromMastery(0.24)).toBe('dim')
    })

    it('returns glow for mastery 0.25-0.5', () => {
      expect(calculateBrightnessFromMastery(0.25)).toBe('glow')
      expect(calculateBrightnessFromMastery(0.35)).toBe('glow')
      expect(calculateBrightnessFromMastery(0.49)).toBe('glow')
    })

    it('returns bright for mastery 0.5-0.75', () => {
      expect(calculateBrightnessFromMastery(0.5)).toBe('bright')
      expect(calculateBrightnessFromMastery(0.6)).toBe('bright')
      expect(calculateBrightnessFromMastery(0.74)).toBe('bright')
    })

    it('returns brilliant for mastery >= 0.75', () => {
      expect(calculateBrightnessFromMastery(0.75)).toBe('brilliant')
      expect(calculateBrightnessFromMastery(0.9)).toBe('brilliant')
      expect(calculateBrightnessFromMastery(1)).toBe('brilliant')
    })
  })

  describe('edge cases', () => {
    it('returns dim for NaN', () => {
      expect(calculateBrightnessFromMastery(NaN)).toBe('dim')
    })

    it('returns dim for non-number input', () => {
      expect(calculateBrightnessFromMastery('high')).toBe('dim')
      expect(calculateBrightnessFromMastery(null)).toBe('dim')
      expect(calculateBrightnessFromMastery(undefined)).toBe('dim')
    })
  })
})

// ============================================================================
// TESTS: determineCategory
// ============================================================================

describe('determineCategory', () => {
  describe('explicit category/zone', () => {
    it('uses existing category property', () => {
      const topic = createMockTopic({ category: 'science' })
      expect(determineCategory(topic)).toBe('science')
    })

    it('uses existing zone property as fallback', () => {
      const topic = createMockTopic({ zone: 'nature' })
      expect(determineCategory(topic)).toBe('nature')
    })

    it('normalizes category to lowercase', () => {
      const topic = createMockTopic({ category: 'MATHEMATICS' })
      expect(determineCategory(topic)).toBe('mathematics')
    })
  })

  describe('keyword inference', () => {
    it('infers mathematics from keywords', () => {
      expect(determineCategory({ name: 'Algebra basics' })).toBe('mathematics')
      expect(determineCategory({ topicName: 'Geometry shapes' })).toBe('mathematics')
      expect(determineCategory({ name: 'Number theory' })).toBe('mathematics')
    })

    it('infers science from keywords', () => {
      expect(determineCategory({ name: 'Cell biology' })).toBe('science')
      expect(determineCategory({ topicName: 'Chemical reactions' })).toBe('science')
      expect(determineCategory({ name: 'Atomic structure' })).toBe('science')
    })

    it('infers history from keywords', () => {
      expect(determineCategory({ name: 'Ancient civilizations' })).toBe('history')
      expect(determineCategory({ topicName: 'World War II' })).toBe('history')
      expect(determineCategory({ name: 'Medieval Europe' })).toBe('history')
    })

    it('infers astronomy from keywords', () => {
      expect(determineCategory({ name: 'Planet formation' })).toBe('astronomy')
      expect(determineCategory({ topicName: 'Galaxy types' })).toBe('astronomy')
      expect(determineCategory({ name: 'Star lifecycle' })).toBe('astronomy')
    })

    it('infers technology from keywords', () => {
      expect(determineCategory({ name: 'Computer programming' })).toBe('technology')
      expect(determineCategory({ topicName: 'Robot design' })).toBe('technology')
      expect(determineCategory({ name: 'Software engineering' })).toBe('technology')
    })
  })

  describe('fallback behavior', () => {
    it('returns general for unknown topic', () => {
      const topic = createMockTopic({ name: 'Random thoughts' })
      expect(determineCategory(topic)).toBe('general')
    })

    it('returns general for null topic', () => {
      expect(determineCategory(null)).toBe('general')
    })

    it('returns general for undefined topic', () => {
      expect(determineCategory(undefined)).toBe('general')
    })
  })
})

// ============================================================================
// TESTS: topicToNode
// ============================================================================

describe('topicToNode', () => {
  describe('basic conversion', () => {
    it('converts topic to node with correct structure', () => {
      const topic = createMockTopic({
        id: 'topic_123',
        name: 'Photosynthesis',
        topicName: 'Photosynthesis',
        quizScore: 80,
        category: 'science',
      })

      const node = topicToNode(topic)

      expect(node).toMatchObject({
        id: 'topic_123',
        name: 'Photosynthesis',
        mastery: 0.8,
        brightness: 'brilliant',
        category: 'science',
      })
      expect(node.position).toBeNull()
      expect(Array.isArray(node.concepts)).toBe(true)
      expect(Array.isArray(node.followUps)).toBe(true)
      expect(typeof node.unlockedAt).toBe('number')
      expect(typeof node.lastReviewedAt).toBe('number')
    })

    it('uses topicName over name when both present', () => {
      const topic = createMockTopic({ name: 'Short', topicName: 'Full Topic Name' })
      const node = topicToNode(topic)

      expect(node.name).toBe('Full Topic Name')
    })

    it('falls back to name when topicName missing', () => {
      const topic = createMockTopic({ name: 'Topic Name' })
      delete topic.topicName
      const node = topicToNode(topic)

      expect(node.name).toBe('Topic Name')
    })

    it('generates ID when missing', () => {
      const topic = createMockTopic()
      delete topic.id
      delete topic.topicId
      const node = topicToNode(topic)

      expect(node.id).toMatch(/^node_\d+_[a-z0-9]+$/)
    })
  })

  describe('timestamp handling', () => {
    it('preserves createdAt as unlockedAt', () => {
      const timestamp = Date.now() - 100000
      const topic = createMockTopic({ createdAt: timestamp })
      const node = topicToNode(topic)

      expect(node.unlockedAt).toBe(timestamp)
    })

    it('preserves lastAccessedAt as lastReviewedAt', () => {
      const timestamp = Date.now() - 50000
      const topic = createMockTopic({ lastAccessedAt: timestamp })
      const node = topicToNode(topic)

      expect(node.lastReviewedAt).toBe(timestamp)
    })

    it('uses current time as fallback for missing timestamps', () => {
      const before = Date.now()
      const topic = createMockTopic()
      delete topic.createdAt
      delete topic.lastAccessedAt
      const node = topicToNode(topic)
      const after = Date.now()

      expect(node.unlockedAt).toBeGreaterThanOrEqual(before)
      expect(node.unlockedAt).toBeLessThanOrEqual(after)
    })
  })

  describe('edge cases', () => {
    it('returns null for null topic', () => {
      expect(topicToNode(null)).toBeNull()
    })

    it('returns null for undefined topic', () => {
      expect(topicToNode(undefined)).toBeNull()
    })

    it('handles topic with minimal data', () => {
      const node = topicToNode({})

      expect(node.name).toBe('Unknown Topic')
      expect(node.id).toMatch(/^node_/)
    })
  })
})

// ============================================================================
// TESTS: createInitialEdges
// ============================================================================

describe('createInitialEdges', () => {
  describe('basic edge creation', () => {
    it('creates edges from relatedTopics array', () => {
      const topics = [
        createMockTopic({ id: 'topic_1', name: 'Math', relatedTopics: ['Science'] }),
        createMockTopic({ id: 'topic_2', name: 'Science' }),
      ]
      const nodes = topics.map((t) => topicToNode(t))

      const edges = createInitialEdges(topics, nodes)

      expect(edges.length).toBe(1)
      expect(edges[0]).toMatchObject({
        from: 'topic_1',
        to: 'topic_2',
        type: 'extends',
        strength: 0.5,
        discovered: true,
      })
    })

    it('deduplicates bidirectional edges', () => {
      const topics = [
        createMockTopic({ id: 'topic_1', name: 'A', relatedTopics: ['B'] }),
        createMockTopic({ id: 'topic_2', name: 'B', relatedTopics: ['A'] }),
      ]
      const nodes = topics.map((t) => topicToNode(t))

      const edges = createInitialEdges(topics, nodes)

      // Should only have one edge, not two
      expect(edges.length).toBe(1)
    })

    it('does not create self-referential edges', () => {
      const topics = [createMockTopic({ id: 'topic_1', name: 'A', relatedTopics: ['A'] })]
      const nodes = topics.map((t) => topicToNode(t))

      const edges = createInitialEdges(topics, nodes)

      expect(edges.length).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('returns empty array for empty topics', () => {
      expect(createInitialEdges([], [])).toEqual([])
    })

    it('returns empty array for null inputs', () => {
      expect(createInitialEdges(null, null)).toEqual([])
    })

    it('handles topics with no relatedTopics', () => {
      const topics = [createMockTopic({ id: 'topic_1', name: 'Solo' })]
      const nodes = topics.map((t) => topicToNode(t))

      const edges = createInitialEdges(topics, nodes)

      expect(edges.length).toBe(0)
    })

    it('ignores related topics that do not exist as nodes', () => {
      const topics = [createMockTopic({ id: 'topic_1', name: 'A', relatedTopics: ['NonExistent'] })]
      const nodes = topics.map((t) => topicToNode(t))

      const edges = createInitialEdges(topics, nodes)

      expect(edges.length).toBe(0)
    })
  })
})

// ============================================================================
// TESTS: createInitialClusters
// ============================================================================

describe('createInitialClusters', () => {
  describe('basic clustering', () => {
    it('groups nodes by category', () => {
      const nodes = [
        { id: 'node_1', category: 'science' },
        { id: 'node_2', category: 'science' },
        { id: 'node_3', category: 'mathematics' },
      ]

      const clusters = createInitialClusters(nodes)

      expect(clusters.length).toBe(2)

      const scienceCluster = clusters.find((c) => c.id === 'cluster_science')
      expect(scienceCluster.nodeIds).toEqual(['node_1', 'node_2'])

      const mathCluster = clusters.find((c) => c.id === 'cluster_mathematics')
      expect(mathCluster.nodeIds).toEqual(['node_3'])
    })

    it('includes icon and color for known categories', () => {
      const nodes = [{ id: 'node_1', category: 'science' }]

      const clusters = createInitialClusters(nodes)

      expect(clusters[0].icon).toBeDefined()
      expect(clusters[0].color).toMatch(/^#[A-F0-9]{6}$/i)
    })

    it('uses general category for unknown categories', () => {
      const nodes = [{ id: 'node_1', category: 'unknown_category' }]

      const clusters = createInitialClusters(nodes)

      expect(clusters[0].id).toBe('cluster_unknown_category')
    })
  })

  describe('edge cases', () => {
    it('returns empty array for empty nodes', () => {
      expect(createInitialClusters([])).toEqual([])
    })

    it('returns empty array for null input', () => {
      expect(createInitialClusters(null)).toEqual([])
    })

    it('handles nodes without category (uses general)', () => {
      const nodes = [{ id: 'node_1' }]

      const clusters = createInitialClusters(nodes)

      expect(clusters[0].id).toBe('cluster_general')
    })

    it('skips null nodes in array', () => {
      const nodes = [{ id: 'node_1', category: 'science' }, null, undefined]

      const clusters = createInitialClusters(nodes)

      expect(clusters.length).toBe(1)
      expect(clusters[0].nodeIds).toEqual(['node_1'])
    })
  })
})

// ============================================================================
// TESTS: migrateToGraphModel
// ============================================================================

describe('migrateToGraphModel', () => {
  describe('basic migration', () => {
    it('converts topics array to graph structure', () => {
      const topics = [
        createMockTopic({ id: 'topic_1', name: 'Topic 1', category: 'science', quizScore: 80 }),
        createMockTopic({ id: 'topic_2', name: 'Topic 2', category: 'science', quizScore: 60 }),
      ]

      const graph = migrateToGraphModel(topics)

      expect(graph.nodes.length).toBe(2)
      expect(graph.clusters.length).toBeGreaterThan(0)
      expect(Array.isArray(graph.edges)).toBe(true)
      expect(Array.isArray(graph.gaps)).toBe(true)
      expect(graph.explorerRank).toBeDefined()
    })

    it('includes explorer rank based on topic count', () => {
      const topics = Array.from({ length: 5 }, (_, i) =>
        createMockTopic({ id: `topic_${i}`, name: `Topic ${i}` })
      )

      const graph = migrateToGraphModel(topics)

      expect(graph.explorerRank.level).toBe(2) // Observer rank (3+ topics)
      expect(graph.explorerRank.title).toBe('Observer')
    })

    it('preserves all node data during migration', () => {
      const timestamp = Date.now()
      const topics = [
        createMockTopic({
          id: 'topic_1',
          name: 'Test Topic',
          topicName: 'Test Topic',
          quizScore: 75,
          createdAt: timestamp - 1000,
          lastAccessedAt: timestamp,
        }),
      ]

      const graph = migrateToGraphModel(topics)
      const node = graph.nodes[0]

      expect(node.id).toBe('topic_1')
      expect(node.name).toBe('Test Topic')
      expect(node.mastery).toBeCloseTo(0.75, 2)
      expect(node.unlockedAt).toBe(timestamp - 1000)
      expect(node.lastReviewedAt).toBe(timestamp)
    })
  })

  describe('edge cases', () => {
    it('returns empty graph for empty array', () => {
      const graph = migrateToGraphModel([])

      expect(graph.nodes).toEqual([])
      expect(graph.edges).toEqual([])
      expect(graph.clusters).toEqual([])
      expect(graph.gaps).toEqual([])
      expect(graph.explorerRank.level).toBe(1)
    })

    it('returns empty graph for null input', () => {
      const graph = migrateToGraphModel(null)

      expect(graph.nodes).toEqual([])
      expect(graph.explorerRank.level).toBe(1)
    })

    it('returns empty graph for undefined input', () => {
      const graph = migrateToGraphModel(undefined)

      expect(graph.nodes).toEqual([])
    })

    it('filters out null topics from array', () => {
      const topics = [createMockTopic({ id: 'topic_1' }), null, undefined]

      const graph = migrateToGraphModel(topics)

      expect(graph.nodes.length).toBe(1)
    })
  })
})

// ============================================================================
// TESTS: needsMigration
// ============================================================================

describe('needsMigration', () => {
  describe('data format detection', () => {
    it('returns false for null/undefined data', () => {
      expect(needsMigration(null)).toBe(false)
      expect(needsMigration(undefined)).toBe(false)
    })

    it('returns false for already migrated graph format', () => {
      const graphData = {
        nodes: [{ id: 'node_1' }],
        edges: [],
        clusters: [],
        gaps: [],
      }

      expect(needsMigration(graphData)).toBe(false)
    })

    it('returns true for old topic array format', () => {
      const oldData = [{ topicName: 'Topic 1', slides: [] }]

      expect(needsMigration(oldData)).toBe(true)
    })

    it('returns true for wrapped topics format', () => {
      const wrappedData = {
        topics: [{ name: 'Topic 1', slides: [] }],
      }

      expect(needsMigration(wrappedData)).toBe(true)
    })

    it('returns false for empty array', () => {
      expect(needsMigration([])).toBe(false)
    })

    it('returns false for wrapped format with empty topics', () => {
      expect(needsMigration({ topics: [] })).toBe(false)
    })
  })
})

// ============================================================================
// TESTS: Storage Operations
// ============================================================================

describe('Storage Operations', () => {
  let mockLocalStorage

  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage()
    vi.stubGlobal('localStorage', mockLocalStorage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('migrateFromStorage', () => {
    it('returns migrated=false when no data exists', () => {
      const result = migrateFromStorage('test_key')

      expect(result.migrated).toBe(false)
      expect(result.graph).toBeNull()
      expect(result.error).toBeNull()
    })

    it('migrates old format data to graph', () => {
      const oldData = [
        { id: 'topic_1', topicName: 'Test', slides: [] },
      ]
      mockLocalStorage.setItem('test_key', JSON.stringify(oldData))

      const result = migrateFromStorage('test_key')

      expect(result.migrated).toBe(true)
      expect(result.graph).not.toBeNull()
      expect(result.graph.nodes.length).toBe(1)
    })

    it('creates backup of old data', () => {
      const oldData = [{ id: 'topic_1', topicName: 'Test', slides: [] }]
      mockLocalStorage.setItem('test_key', JSON.stringify(oldData))

      migrateFromStorage('test_key')

      expect(mockLocalStorage.getItem('test_key_backup')).toBe(JSON.stringify(oldData))
    })

    it('saves migrated graph to new storage key', () => {
      const oldData = [{ id: 'topic_1', topicName: 'Test', slides: [] }]
      mockLocalStorage.setItem('test_key', JSON.stringify(oldData))

      const result = migrateFromStorage('test_key')

      const savedGraph = JSON.parse(mockLocalStorage.getItem('test_key_graph'))
      expect(savedGraph.nodes.length).toBe(1)
      expect(savedGraph).toEqual(result.graph)
    })

    it('returns existing graph without migrating', () => {
      const existingGraph = { nodes: [{ id: 'n1' }], edges: [], clusters: [] }
      mockLocalStorage.setItem('test_key', JSON.stringify(existingGraph))

      const result = migrateFromStorage('test_key')

      expect(result.migrated).toBe(false)
      expect(result.graph).toEqual(existingGraph)
    })

    it('handles invalid JSON gracefully', () => {
      mockLocalStorage.setItem('test_key', 'not valid json')

      const result = migrateFromStorage('test_key')

      expect(result.migrated).toBe(false)
      expect(result.error).toContain('parse')
    })
  })

  describe('rollbackMigration', () => {
    it('removes migrated graph from storage', () => {
      mockLocalStorage.setItem('test_key_graph', JSON.stringify({ nodes: [] }))

      rollbackMigration('test_key')

      expect(mockLocalStorage.getItem('test_key_graph')).toBeNull()
    })
  })

  describe('hasGraphInStorage', () => {
    it('returns false when no graph exists', () => {
      expect(hasGraphInStorage('test_key')).toBe(false)
    })

    it('returns true when valid graph exists', () => {
      const graph = { nodes: [], edges: [], clusters: [] }
      mockLocalStorage.setItem('test_key_graph', JSON.stringify(graph))

      expect(hasGraphInStorage('test_key')).toBe(true)
    })

    it('returns false for invalid graph structure', () => {
      mockLocalStorage.setItem('test_key_graph', JSON.stringify({ invalid: true }))

      expect(hasGraphInStorage('test_key')).toBe(false)
    })
  })

  describe('loadGraphFromStorage', () => {
    it('returns null when no graph exists', () => {
      expect(loadGraphFromStorage('test_key')).toBeNull()
    })

    it('returns graph when valid data exists', () => {
      const graph = { nodes: [{ id: 'n1' }], edges: [], clusters: [] }
      mockLocalStorage.setItem('test_key_graph', JSON.stringify(graph))

      const loaded = loadGraphFromStorage('test_key')

      expect(loaded).toEqual(graph)
    })

    it('returns null for invalid data', () => {
      mockLocalStorage.setItem('test_key_graph', 'invalid')

      expect(loadGraphFromStorage('test_key')).toBeNull()
    })
  })

  describe('saveGraphToStorage', () => {
    it('saves valid graph to storage', () => {
      const graph = { nodes: [{ id: 'n1' }], edges: [], clusters: [], gaps: [] }

      const result = saveGraphToStorage(graph, 'test_key')

      expect(result).toBe(true)
      const saved = JSON.parse(mockLocalStorage.getItem('test_key_graph'))
      expect(saved).toEqual(graph)
    })

    it('returns false for invalid graph', () => {
      expect(saveGraphToStorage(null, 'test_key')).toBe(false)
      expect(saveGraphToStorage({}, 'test_key')).toBe(false)
      expect(saveGraphToStorage({ nodes: [] }, 'test_key')).toBe(false)
    })
  })
})

// ============================================================================
// TESTS: Idempotency
// ============================================================================

describe('Migration Idempotency', () => {
  it('produces same result when run multiple times', () => {
    const topics = [
      createMockTopic({ id: 'topic_1', name: 'Topic 1', quizScore: 80 }),
      createMockTopic({ id: 'topic_2', name: 'Topic 2', quizScore: 60 }),
    ]

    const graph1 = migrateToGraphModel(topics)
    const graph2 = migrateToGraphModel(topics)

    // Compare node IDs and names (timestamps may differ slightly)
    expect(graph1.nodes.map((n) => n.id)).toEqual(graph2.nodes.map((n) => n.id))
    expect(graph1.nodes.map((n) => n.name)).toEqual(graph2.nodes.map((n) => n.name))
    expect(graph1.nodes.map((n) => n.mastery)).toEqual(graph2.nodes.map((n) => n.mastery))
    expect(graph1.clusters.length).toBe(graph2.clusters.length)
    expect(graph1.edges.length).toBe(graph2.edges.length)
  })
})

// ============================================================================
// TESTS: Immutability
// ============================================================================

describe('Immutability', () => {
  it('does not mutate original topics array', () => {
    const topics = [
      createMockTopic({ id: 'topic_1', name: 'Topic 1' }),
      createMockTopic({ id: 'topic_2', name: 'Topic 2' }),
    ]
    const originalTopics = JSON.parse(JSON.stringify(topics))

    migrateToGraphModel(topics)

    expect(topics).toEqual(originalTopics)
  })

  it('does not mutate individual topic objects', () => {
    const topic = createMockTopic({ id: 'topic_1', name: 'Topic 1' })
    const originalTopic = JSON.parse(JSON.stringify(topic))

    topicToNode(topic)

    expect(topic).toEqual(originalTopic)
  })
})
