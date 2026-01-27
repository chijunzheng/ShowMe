/**
 * useGraphClassification Hook
 * Handles topic classification for knowledge graph edges
 * Uses local keyword-based classification with optional backend LLM fallback
 */

import { useState, useCallback, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || ''

// Category keywords for local classification
const CATEGORY_KEYWORDS = {
  Technology: ['computer', 'software', 'hardware', 'internet', 'wifi', 'digital', 'code', 'programming', 'ai', 'machine', 'robot', 'data', 'network', 'cyber', 'tech', 'app', 'algorithm', 'rag', 'llm', 'language model'],
  Science: ['science', 'experiment', 'research', 'laboratory', 'hypothesis', 'theory', 'scientific', 'molecule', 'atom', 'particle', 'chemical', 'reaction'],
  Biology: ['biology', 'cell', 'dna', 'gene', 'organism', 'body', 'organ', 'tissue', 'blood', 'brain', 'heart', 'digestive', 'respiratory', 'nervous', 'immune', 'human', 'animal', 'plant', 'evolution', 'species', 'protein', 'enzyme', 'vitamin', 'mineral', 'nutrient', 'health', 'disease', 'virus', 'bacteria', 'reproduction', 'menstrual', 'hormone'],
  Physics: ['physics', 'force', 'energy', 'motion', 'gravity', 'light', 'sound', 'wave', 'electricity', 'magnetic', 'quantum', 'relativity', 'thermodynamic'],
  Space: ['space', 'planet', 'star', 'galaxy', 'universe', 'moon', 'sun', 'solar', 'cosmic', 'asteroid', 'orbit', 'astronaut', 'nasa', 'rocket', 'satellite'],
  History: ['history', 'ancient', 'war', 'civilization', 'empire', 'dynasty', 'revolution', 'century', 'medieval', 'renaissance', 'colonial', 'historical', 'emperor', 'king', 'queen', 'world war', 'qin', 'roman', 'greek', 'egypt'],
  Nature: ['nature', 'environment', 'climate', 'weather', 'rain', 'snow', 'ocean', 'mountain', 'forest', 'ecosystem', 'wildlife', 'conservation', 'earth', 'water', 'air', 'soil', 'formation', 'hail'],
  Math: ['math', 'number', 'equation', 'algebra', 'geometry', 'calculus', 'statistics', 'probability', 'arithmetic', 'fraction', 'decimal', 'graph', 'function', 'variable'],
  Art: ['art', 'paint', 'draw', 'sculpture', 'music', 'dance', 'theater', 'film', 'photograph', 'design', 'creative', 'artist', 'museum', 'gallery', 'tattoo', 'color', 'spin', 'rotation'],
  Health: ['health', 'medicine', 'doctor', 'hospital', 'treatment', 'symptom', 'diagnosis', 'therapy', 'nutrition', 'exercise', 'mental', 'wellness', 'drug', 'vaccine', 'milk', 'food', 'diet'],
  Engineering: ['engineering', 'build', 'construct', 'machine', 'mechanical', 'electrical', 'civil', 'structural', 'system', 'process', 'manufacture', 'industrial', 'regulator', 'function', 'computer function'],
  Economics: ['economics', 'economy', 'money', 'finance', 'market', 'trade', 'business', 'investment', 'bank', 'currency', 'inflation', 'gdp', 'federal', 'reserve', 'stock'],
  Psychology: ['psychology', 'mind', 'behavior', 'emotion', 'mental', 'cognitive', 'memory', 'learning', 'personality', 'therapy', 'consciousness'],
  Language: ['language', 'word', 'grammar', 'vocabulary', 'speak', 'write', 'read', 'communication', 'linguistic', 'translation'],
}

/**
 * Local classification based on topic name keywords
 */
function classifyTopicLocally(topicName) {
  const nameLower = topicName.toLowerCase()

  // Score each category based on keyword matches
  const scores = {}
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = keywords.filter(kw => nameLower.includes(kw)).length
  }

  // Find best matching category
  const bestCategory = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'General'

  return bestCategory
}

/**
 * Find related topics based on shared keywords and categories
 */
function findRelatedTopics(topic, allTopics, classifications) {
  const topicName = topic.name.toLowerCase()
  const topicWords = topicName.split(/\s+/).filter(w => w.length > 3)
  const topicCategory = classifications[topic.id] || classifyTopicLocally(topic.name)

  const related = []

  for (const other of allTopics) {
    if (other.id === topic.id) continue

    const otherName = other.name.toLowerCase()
    const otherCategory = classifications[other.id] || classifyTopicLocally(other.name)

    // Score relationship
    let score = 0

    // Same category = related
    if (topicCategory === otherCategory) {
      score += 2
    }

    // Shared keywords
    const otherWords = otherName.split(/\s+/).filter(w => w.length > 3)
    for (const word of topicWords) {
      if (otherName.includes(word) || otherWords.some(ow => ow.includes(word) || word.includes(ow))) {
        score += 3
      }
    }

    // Add if score is meaningful
    if (score >= 2) {
      related.push({ topic: other, score })
    }
  }

  // Return top related topics
  return related
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(r => r.topic)
}

/**
 * Build edges using local classification
 */
function buildLocalEdges(topics) {
  const edges = []
  const classifications = {}

  // First pass: classify all topics
  for (const topic of topics) {
    classifications[topic.id] = classifyTopicLocally(topic.name)
  }

  // Second pass: find relationships
  const edgeSet = new Set()

  for (const topic of topics) {
    const related = findRelatedTopics(topic, topics, classifications)

    for (const relatedTopic of related) {
      // Create normalized edge key to avoid duplicates
      const edgeKey = [topic.id, relatedTopic.id].sort().join('|')

      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey)
        edges.push({
          from: topic.id,
          to: relatedTopic.id,
          type: 'related',
        })
      }
    }
  }

  return { edges, classifications }
}

/**
 * Batch classify topics to build graph edges
 * @param {Object} options
 * @param {Function} options.onProgress - Callback with progress (0-1)
 */
export function useGraphClassification({ onProgress } = {}) {
  const [edges, setEdges] = useState([])
  const [classifications, setClassifications] = useState({})
  const [isClassifying, setIsClassifying] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  /**
   * Try to classify via backend API, fall back to local
   */
  const classifyTopic = useCallback(async (topicName, topicId, clientId) => {
    try {
      const response = await fetch(`${API_URL}/api/graph/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          topicName,
          topicId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Classification failed: ${response.status}`)
      }

      const data = await response.json()
      return {
        topicId,
        classification: data.classification,
        graph: data.graph,
        source: 'api',
      }
    } catch (err) {
      // Fall back to local classification
      return {
        topicId,
        classification: {
          category: classifyTopicLocally(topicName),
          relatedTo: [],
          parentConcept: null,
          childConcepts: [],
          suggestedNext: [],
        },
        error: err.message,
        source: 'local',
      }
    }
  }, [])

  /**
   * Batch classify all topics and build edges
   * Uses local classification for reliability, attempts API enhancement
   */
  const classifyAllTopics = useCallback(async (topics, clientId) => {
    if (!topics || topics.length === 0) {
      setEdges([])
      return
    }

    setIsClassifying(true)
    setError(null)

    try {
      // Use local classification for immediate results
      const { edges: localEdges, classifications: localClassifications } = buildLocalEdges(topics)

      setClassifications(localClassifications)
      setEdges(localEdges)

      onProgress?.(1)

      console.log(`[Graph] Built ${localEdges.length} edges from ${topics.length} topics using local classification`)

    } catch (err) {
      setError(err.message)
      console.error('Classification failed:', err)
    } finally {
      setIsClassifying(false)
    }
  }, [onProgress])

  /**
   * Add edges for a single new topic (incremental)
   */
  const addTopicEdges = useCallback(async (topic, existingTopics, clientId) => {
    // Classify the new topic
    const category = classifyTopicLocally(topic.name)

    setClassifications(prev => ({
      ...prev,
      [topic.id]: category,
    }))

    // Find related topics
    const related = findRelatedTopics(topic, existingTopics, classifications)

    if (related.length > 0) {
      setEdges(prev => {
        const existing = new Set(prev.map(e => [e.from, e.to].sort().join('|')))
        const newEdges = related
          .map(relatedTopic => ({
            from: topic.id,
            to: relatedTopic.id,
            type: 'related',
          }))
          .filter(e => !existing.has([e.from, e.to].sort().join('|')))

        return [...prev, ...newEdges]
      })
    }

    return { category, relatedTo: related.map(r => r.name) }
  }, [classifications])

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setEdges([])
    setClassifications({})
    setError(null)
  }, [])

  return {
    edges,
    classifications,
    isClassifying,
    error,
    classifyAllTopics,
    addTopicEdges,
    reset,
  }
}

export default useGraphClassification
