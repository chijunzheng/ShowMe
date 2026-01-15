import express from 'express'
import { sanitizeQuery } from '../utils/sanitize.js'
// import { classifyQuery } from '../services/gemini.js'

const router = express.Router()

/**
 * Topic-specific keywords for classification
 * Each topic category has keywords that indicate relevance
 */
const topicKeywords = {
  heart: ['heart', 'cardiac', 'blood', 'circulatory', 'pulse', 'artery', 'vein', 'ventricle', 'atrium', 'valve', 'beat', 'cardiovascular'],
  brain: ['brain', 'neuron', 'mind', 'cognitive', 'thinking', 'memory', 'cerebral', 'cortex', 'synapse', 'neural', 'mental'],
  space: ['space', 'universe', 'cosmos', 'galaxy', 'planet', 'star', 'sun', 'moon', 'orbit', 'celestial', 'solar', 'astronomical'],
  blackHole: ['black hole', 'event horizon', 'singularity', 'gravitational'],
  photosynthesis: ['photosynthesis', 'plant', 'chlorophyll', 'leaves', 'oxygen', 'carbon dioxide', 'sunlight', 'chloroplast'],
  weather: ['weather', 'rain', 'cloud', 'storm', 'thunder', 'lightning', 'climate', 'precipitation', 'atmospheric', 'forecast'],
  airplane: ['airplane', 'flight', 'fly', 'aircraft', 'jet', 'wing', 'aviation', 'pilot', 'runway', 'takeoff', 'landing'],
  gravity: ['gravity', 'gravitational', 'weight', 'mass', 'falling', 'newton', 'attraction'],
  electricity: ['electricity', 'electric', 'current', 'voltage', 'circuit', 'electron', 'charge', 'power', 'amp', 'watt'],
  computer: ['computer', 'processor', 'cpu', 'software', 'hardware', 'memory', 'ram', 'digital', 'program', 'code'],
  ocean: ['ocean', 'sea', 'marine', 'wave', 'tide', 'underwater', 'coral', 'fish', 'aquatic'],
  dna: ['dna', 'gene', 'genetic', 'chromosome', 'heredity', 'mutation', 'genome', 'rna'],
}

/**
 * Extract keywords from topic name and find matching keyword set
 * @param {string} topicName - The topic name from activeTopic
 * @returns {string[]} Array of related keywords
 */
function getKeywordsForTopic(topicName) {
  if (!topicName) return []

  const normalizedName = topicName.toLowerCase()

  // Direct match lookup
  for (const [category, keywords] of Object.entries(topicKeywords)) {
    // Check if topic name matches the category or any keyword
    if (normalizedName.includes(category.toLowerCase()) ||
        keywords.some(kw => normalizedName.includes(kw.toLowerCase()))) {
      return keywords
    }
  }

  // Fallback: extract words from topic name as keywords
  return normalizedName.split(/\s+/).filter(word => word.length > 2)
}

/**
 * Check if a query is related to the active topic using keyword matching
 * In production, this would use Gemini for semantic understanding
 * @param {string} query - The user's new question
 * @param {object} activeTopic - The current active topic with name and keywords
 * @param {Array} conversationHistory - Previous Q&A context
 * @returns {{isFollowUp: boolean, reasoning: string}}
 */
function classifyQueryRelation(query, activeTopic, conversationHistory = []) {
  const normalizedQuery = query.toLowerCase()

  // Get keywords related to the active topic
  const topicKeywordList = getKeywordsForTopic(activeTopic?.name)

  // Check for follow-up indicators in the query itself
  const followUpPhrases = [
    'tell me more',
    'what about',
    'how about',
    'and what',
    'more about',
    'can you explain',
    'what else',
    'why does',
    'how does that',
    'related to',
    'in that case',
    'following up',
    'regarding',
    'about that',
    'on that note',
    'speaking of',
    'same topic',
    'continue',
  ]

  const hasFollowUpPhrase = followUpPhrases.some(phrase =>
    normalizedQuery.includes(phrase)
  )

  // Check if query contains topic-related keywords
  const matchingKeywords = topicKeywordList.filter(keyword =>
    normalizedQuery.includes(keyword.toLowerCase())
  )

  const hasTopicKeywords = matchingKeywords.length > 0

  // Determine classification based on signals
  if (hasFollowUpPhrase) {
    return {
      isFollowUp: true,
      reasoning: `Query contains follow-up language and appears to continue the current topic "${activeTopic?.name || 'Unknown'}".`
    }
  }

  if (hasTopicKeywords) {
    return {
      isFollowUp: true,
      reasoning: `Query contains keywords related to the current topic "${activeTopic?.name || 'Unknown'}": ${matchingKeywords.slice(0, 3).join(', ')}.`
    }
  }

  // Check if query might be about a completely different subject
  // by looking for topic keywords from other categories
  for (const [category, keywords] of Object.entries(topicKeywords)) {
    const categoryMatch = keywords.some(kw => normalizedQuery.includes(kw.toLowerCase()))
    if (categoryMatch && !hasTopicKeywords) {
      return {
        isFollowUp: false,
        reasoning: `Query appears to be about a new subject (${category}) unrelated to the current topic "${activeTopic?.name || 'Unknown'}".`
      }
    }
  }

  // Default to new topic if no clear connection found
  return {
    isFollowUp: false,
    reasoning: `Query does not appear to be directly related to the current topic "${activeTopic?.name || 'Unknown'}".`
  }
}

/**
 * POST /api/classify
 * Classify query as follow_up or new_topic based on context
 *
 * Request body:
 * - query (required): The user's new question
 * - activeTopicId (optional): ID of the currently active topic
 * - activeTopic (optional): Topic object with name and metadata
 * - conversationHistory (optional): Previous Q&A context
 * - topicCount (optional): Number of topics currently in session
 * - oldestTopicId (optional): ID of oldest topic for eviction
 *
 * Response:
 * - classification: 'follow_up' | 'new_topic'
 * - reasoning: Human-readable explanation of the classification
 * - shouldEvictOldest: Whether the oldest topic should be evicted
 * - evictTopicId: ID of topic to evict (if shouldEvictOldest is true)
 */
router.post('/', async (req, res) => {
  try {
    const {
      query,
      activeTopicId,
      activeTopic,
      conversationHistory = [],
      topicCount = 0,
      oldestTopicId = null
    } = req.body

    // F004: Sanitize and validate query input
    const { sanitized: sanitizedQuery, error: queryError } = sanitizeQuery(query)
    if (queryError) {
      return res.status(400).json({
        error: queryError,
        field: 'query'
      })
    }

    // If no active topic, it's always a new topic
    if (!activeTopicId) {
      return res.json({
        classification: 'new_topic',
        reasoning: 'No active topic exists. This will create a new topic.',
        shouldEvictOldest: false,
        evictTopicId: null,
      })
    }

    // Classify the query against the active topic (using sanitized input)
    const { isFollowUp, reasoning } = classifyQueryRelation(
      sanitizedQuery,
      activeTopic,
      conversationHistory
    )

    // Determine if we need to evict the oldest topic
    // Only evict if: new topic, and we're at the max topic limit (3)
    const shouldEvictOldest = !isFollowUp && topicCount >= 3

    const response = {
      classification: isFollowUp ? 'follow_up' : 'new_topic',
      reasoning,
      shouldEvictOldest,
      evictTopicId: shouldEvictOldest ? oldestTopicId : null,
    }

    res.json(response)
  } catch (error) {
    console.error('Classification error:', error)
    res.status(500).json({ error: 'Failed to classify query' })
  }
})

export default router
