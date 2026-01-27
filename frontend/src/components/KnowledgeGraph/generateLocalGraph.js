/**
 * Generate Knowledge Graph from Local Topics
 * Creates a force-directed graph structure from the app's topics data
 * Works offline without needing backend API
 */

// Category colors for visualization - rich, distinctive palette
const CATEGORY_COLORS = {
  Science: '#8B5CF6',    // Violet
  Technology: '#0EA5E9', // Sky blue
  History: '#D97706',    // Amber
  Art: '#F59E0B',        // Yellow
  Nature: '#10B981',     // Emerald
  Space: '#6366F1',      // Indigo
  Math: '#EF4444',       // Red
  Language: '#F97316',   // Orange
  Health: '#EC4899',     // Pink
  Society: '#8B5CF6',    // Purple
  Physics: '#3B82F6',    // Blue
  Biology: '#22C55E',    // Green
  Chemistry: '#A855F7',  // Purple
  Engineering: '#64748B', // Slate
  Music: '#F472B6',      // Pink
  Philosophy: '#A78BFA', // Light purple
  Geography: '#2DD4BF',  // Teal
  Economics: '#FBBF24',  // Amber
  Psychology: '#FB7185', // Rose
  General: '#6B7280',    // Gray
}

// Keywords to category mapping for classification
const CATEGORY_KEYWORDS = {
  Science: ['science', 'scientific', 'research', 'experiment', 'theory', 'hypothesis'],
  Technology: ['tech', 'computer', 'software', 'digital', 'internet', 'ai', 'robot', 'code', 'programming', '5g', 'wifi', 'network'],
  History: ['history', 'ancient', 'war', 'civilization', 'empire', 'medieval', 'century'],
  Art: ['art', 'painting', 'sculpture', 'design', 'creative', 'artist', 'museum'],
  Nature: ['nature', 'animal', 'plant', 'ecosystem', 'environment', 'wildlife', 'forest'],
  Space: ['space', 'planet', 'star', 'galaxy', 'universe', 'cosmic', 'asteroid', 'moon', 'mars', 'earth'],
  Math: ['math', 'mathematics', 'equation', 'calculus', 'algebra', 'geometry', 'number'],
  Language: ['language', 'grammar', 'writing', 'literature', 'word', 'speech'],
  Health: ['health', 'medical', 'body', 'disease', 'medicine', 'doctor', 'hospital'],
  Physics: ['physics', 'gravity', 'energy', 'force', 'quantum', 'relativity', 'atom', 'electron'],
  Biology: ['biology', 'cell', 'dna', 'gene', 'evolution', 'organism', 'life', 'human', 'vision', 'eye'],
  Chemistry: ['chemistry', 'chemical', 'molecule', 'element', 'reaction', 'compound'],
  Engineering: ['engineering', 'build', 'construct', 'machine', 'system', 'rag'],
  Music: ['music', 'song', 'instrument', 'rhythm', 'melody', 'sound'],
  Philosophy: ['philosophy', 'think', 'mind', 'consciousness', 'ethics', 'logic'],
  Geography: ['geography', 'map', 'country', 'continent', 'ocean', 'mountain'],
  Economics: ['economy', 'money', 'market', 'trade', 'business', 'finance'],
  Psychology: ['psychology', 'brain', 'behavior', 'emotion', 'cognitive', 'mental'],
}

/**
 * Classify a topic into a category based on its name
 */
export function classifyTopic(topicName) {
  const lowerName = topicName.toLowerCase()

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category
      }
    }
  }

  return 'General'
}

/**
 * Find related topics based on shared words or categories
 */
function findRelatedTopics(topic, allTopics) {
  const related = []
  const topicWords = new Set(topic.name.toLowerCase().split(/\s+/).filter(w => w.length > 3))
  const topicCategory = classifyTopic(topic.name)

  for (const other of allTopics) {
    if (other.id === topic.id) continue

    const otherCategory = classifyTopic(other.name)
    const otherWords = new Set(other.name.toLowerCase().split(/\s+/).filter(w => w.length > 3))

    // Check for shared words
    const sharedWords = [...topicWords].filter(w => otherWords.has(w))

    // Same category or shared words = related
    if (topicCategory === otherCategory || sharedWords.length > 0) {
      related.push(other.id)
    }
  }

  return related.slice(0, 3) // Max 3 connections per node
}

/**
 * Generate graph nodes and edges from topics array
 * @param {Array} topics - Array of topic objects { id, name, icon }
 * @returns {{ nodes: Array, edges: Array, stats: Object }}
 */
export function generateGraphFromTopics(topics = []) {
  if (!topics || topics.length === 0) {
    return {
      nodes: [],
      edges: [],
      stats: {
        totalNodes: 0,
        exploredCount: 0,
        suggestedCount: 0,
        edgeCount: 0,
        categoryBreakdown: {},
      }
    }
  }

  const nodes = []
  const edges = []
  const categoryCount = {}

  // Create nodes from topics
  for (const topic of topics) {
    const category = classifyTopic(topic.name)
    const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.General

    categoryCount[category] = (categoryCount[category] || 0) + 1

    nodes.push({
      id: topic.id,
      label: topic.name,
      category,
      color,
      explored: true,
      icon: topic.icon || null,
    })
  }

  // Create edges based on relationships
  const addedEdges = new Set()

  for (const topic of topics) {
    const relatedIds = findRelatedTopics(topic, topics)

    for (const relatedId of relatedIds) {
      // Create unique edge key to avoid duplicates
      const edgeKey = [topic.id, relatedId].sort().join('|')

      if (!addedEdges.has(edgeKey)) {
        addedEdges.add(edgeKey)
        edges.push({
          from: topic.id,
          to: relatedId,
          type: 'related'
        })
      }
    }
  }

  return {
    nodes,
    edges,
    stats: {
      totalNodes: nodes.length,
      exploredCount: nodes.length,
      suggestedCount: 0,
      edgeCount: edges.length,
      categoryBreakdown: categoryCount,
      topCategory: Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    }
  }
}

/**
 * Generate suggested topics based on explored topics
 * @param {Array} topics - Array of explored topics
 * @returns {Array} - Array of suggested topic objects
 */
export function generateSuggestions(topics = []) {
  if (!topics || topics.length === 0) return []

  const suggestions = []
  const existingNames = new Set(topics.map(t => t.name.toLowerCase()))

  // Suggestion templates by category
  const SUGGESTION_TEMPLATES = {
    Technology: [
      { label: 'How does encryption work?', type: 'deeper' },
      { label: 'What is cloud computing?', type: 'broader' },
      { label: 'How do databases store data?', type: 'adjacent' },
    ],
    Science: [
      { label: 'What is the scientific method?', type: 'deeper' },
      { label: 'How do vaccines work?', type: 'adjacent' },
      { label: 'What causes earthquakes?', type: 'broader' },
    ],
    Space: [
      { label: 'How do rockets work?', type: 'deeper' },
      { label: 'What is a black hole?', type: 'adjacent' },
      { label: 'Is there life on Mars?', type: 'broader' },
    ],
    Biology: [
      { label: 'How does DNA replication work?', type: 'deeper' },
      { label: 'What is natural selection?', type: 'adjacent' },
      { label: 'How do neurons communicate?', type: 'broader' },
    ],
    Physics: [
      { label: 'What is quantum entanglement?', type: 'deeper' },
      { label: 'How does gravity work?', type: 'adjacent' },
      { label: 'What is dark matter?', type: 'broader' },
    ],
    General: [
      { label: 'Explore something new', type: 'broader' },
      { label: 'Go deeper on recent topic', type: 'deeper' },
    ],
  }

  // Get category distribution from topics
  const categoryCounts = {}
  for (const topic of topics) {
    const cat = classifyTopic(topic.name)
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  }

  // Get top categories
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([cat]) => cat)

  // Add suggestions from top categories
  for (const category of topCategories) {
    const templates = SUGGESTION_TEMPLATES[category] || SUGGESTION_TEMPLATES.General
    for (const template of templates) {
      if (!existingNames.has(template.label.toLowerCase())) {
        suggestions.push({
          id: `suggestion_${suggestions.length}`,
          ...template,
        })
        if (suggestions.length >= 4) break
      }
    }
    if (suggestions.length >= 4) break
  }

  return suggestions.slice(0, 4)
}

export { CATEGORY_COLORS }

export default {
  generateGraphFromTopics,
  generateSuggestions,
  classifyTopic,
  CATEGORY_COLORS,
}
