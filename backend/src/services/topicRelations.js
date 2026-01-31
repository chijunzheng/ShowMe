/**
 * Topic Relations Service
 * WB020: Piece Evolution and Topic Relationship Detection
 *
 * Provides functions to find related topics and manage piece evolution:
 * - findRelatedTopics: Use Gemini to detect semantic relationships between topics
 * - calculateEvolutionTier: Determine evolution tier based on related topic count
 * - checkPieceEvolutions: Check if existing pieces should evolve after new unlock
 *
 * Evolution Tiers:
 * - seedling: 1-2 related topics (default when piece is unlocked)
 * - growing: 3-4 related topics
 * - flourishing: 5-9 related topics
 * - legendary: 10+ related topics
 */

import { GoogleGenAI } from '@google/genai'
import logger from '../utils/logger.js'
import { extractJSONSimple as extractJSON } from '../utils/json.js'

// Use fast model for relationship detection (same pattern as gemini.js)
const FAST_MODEL = 'gemini-2.5-flash-lite'

// Get or create AI client (follows same pattern as gemini.js)
let aiClient = null

/**
 * Get or initialize the Gemini AI client
 * @returns {GoogleGenAI|null} The AI client or null if no API key
 */
function getAIClient() {
  if (aiClient) {
    return aiClient
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    logger.warn('TOPIC_RELATIONS', 'No valid API key found. Topic relation features will be limited.')
    return null
  }

  try {
    aiClient = new GoogleGenAI({ apiKey })
    logger.info('TOPIC_RELATIONS', 'AI client initialized successfully')
    return aiClient
  } catch (error) {
    logger.error('TOPIC_RELATIONS', 'Failed to initialize AI client', { error: error.message })
    return null
  }
}

/**
 * Evolution tier thresholds
 * Maps the minimum number of related topics to each tier
 */
export const EVOLUTION_TIERS = {
  seedling: 1,    // Default tier when piece is first unlocked
  growing: 3,     // 3+ related topics
  flourishing: 5, // 5+ related topics
  legendary: 10   // 10+ related topics
}

/**
 * Ordered list of tiers for progression tracking
 */
export const TIER_ORDER = ['seedling', 'growing', 'flourishing', 'legendary']

/**
 * Calculate the evolution tier based on the number of related topics
 *
 * @param {number} relatedCount - Number of semantically related topics
 * @returns {string} Evolution tier: 'seedling' | 'growing' | 'flourishing' | 'legendary'
 */
export function calculateEvolutionTier(relatedCount) {
  if (typeof relatedCount !== 'number' || relatedCount < 0) {
    return 'seedling'
  }

  if (relatedCount >= EVOLUTION_TIERS.legendary) {
    return 'legendary'
  }
  if (relatedCount >= EVOLUTION_TIERS.flourishing) {
    return 'flourishing'
  }
  if (relatedCount >= EVOLUTION_TIERS.growing) {
    return 'growing'
  }

  return 'seedling'
}

/**
 * Check if a tier upgrade is available
 *
 * @param {string} currentTier - Current evolution tier
 * @param {number} relatedCount - New count of related topics
 * @returns {{ upgraded: boolean, newTier: string }}
 */
export function checkTierUpgrade(currentTier, relatedCount) {
  const newTier = calculateEvolutionTier(relatedCount)
  const currentIndex = TIER_ORDER.indexOf(currentTier || 'seedling')
  const newIndex = TIER_ORDER.indexOf(newTier)

  return {
    upgraded: newIndex > currentIndex,
    newTier
  }
}

/**
 * Find which existing topics are semantically related to a new topic
 * Uses Gemini to analyze relationships considering:
 * - Same category or subject area
 * - Cause/effect relationships
 * - Historical connections
 * - Scientific relationships
 *
 * @param {string} newTopic - The new topic name to find relations for
 * @param {string[]} existingTopics - Array of existing topic names to check against
 * @returns {Promise<{
 *   relatedTopics: string[],
 *   category: string,
 *   error: string | null
 * }>}
 */
export async function findRelatedTopics(newTopic, existingTopics) {
  // Validate inputs
  if (!newTopic || typeof newTopic !== 'string') {
    return { relatedTopics: [], category: '', error: 'INVALID_NEW_TOPIC' }
  }

  if (!Array.isArray(existingTopics) || existingTopics.length === 0) {
    return { relatedTopics: [], category: '', error: null }
  }

  const ai = getAIClient()
  if (!ai) {
    // Without AI, we cannot determine relationships
    // Return empty to allow the system to function without this feature
    logger.warn('TOPIC_RELATIONS', 'AI not available, returning empty relations')
    return { relatedTopics: [], category: 'unknown', error: null }
  }

  // Build the prompt for Gemini
  const topicList = existingTopics.map(t => `- ${t}`).join('\n')

  const prompt = `You are an educational topic analyzer for a children's learning app.

Given these topics the user has learned:
${topicList}

Which topics are semantically related to "${newTopic}"?

Consider these types of relationships:
1. **Same category**: Both are about animals, both are about ancient history, etc.
2. **Same subject area**: Both are physics topics, both are biology topics, etc.
3. **Cause/effect relationships**: Volcanoes and earthquakes, pollution and climate change, etc.
4. **Historical connections**: World War I and World War II, Ancient Egypt and pyramids, etc.
5. **Scientific relationships**: Atoms and molecules, DNA and genetics, etc.
6. **Geographic relationships**: Rainforests and Amazon, deserts and camels, etc.

Be generous but meaningful - if topics are in the same broad educational domain, they can be related.

Return JSON:
{
  "relatedTopics": ["topic1", "topic2"],
  "category": "brief category name for the new topic"
}

IMPORTANT:
- Only include topics from the provided list that are genuinely related
- The category should be a short, child-friendly term (e.g., "Animals", "Ancient History", "Math", "Space")
- If no topics are related, return an empty relatedTopics array`

  try {
    logger.time('TOPIC_RELATIONS', 'find-related-topics')

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        temperature: 0.2, // Low temperature for consistent classification
        maxOutputTokens: 256,
        responseMimeType: 'application/json',
      }
    })

    const text = response.text || ''
    const jsonStr = extractJSON(text)
    const parsed = JSON.parse(jsonStr)

    logger.timeEnd('TOPIC_RELATIONS', 'find-related-topics')

    // Validate and sanitize response
    const relatedTopics = Array.isArray(parsed.relatedTopics)
      ? parsed.relatedTopics.filter(t =>
          typeof t === 'string' && existingTopics.includes(t)
        )
      : []

    const category = typeof parsed.category === 'string'
      ? parsed.category.slice(0, 50) // Limit category length
      : 'General'

    logger.info('TOPIC_RELATIONS', 'Found related topics', {
      newTopic,
      relatedCount: relatedTopics.length,
      category
    })

    return {
      relatedTopics,
      category,
      error: null
    }
  } catch (error) {
    logger.error('TOPIC_RELATIONS', 'Failed to find related topics', {
      error: error.message,
      newTopic
    })

    // Handle specific error types
    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { relatedTopics: [], category: '', error: 'RATE_LIMITED' }
    }
    if (error.message?.includes('JSON')) {
      return { relatedTopics: [], category: '', error: 'PARSE_ERROR' }
    }

    return { relatedTopics: [], category: '', error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Check if any existing pieces should evolve after a new piece is unlocked
 * This function finds all pieces that are now related to more topics
 * and returns their new evolution states
 *
 * @param {Object} newPiece - The newly unlocked piece
 * @param {string} newPiece.topicName - Name of the new topic
 * @param {string} newPiece.id - ID of the new piece
 * @param {Object[]} allPieces - Array of all existing pieces
 * @param {string} allPieces[].id - Piece ID
 * @param {string} allPieces[].topicName - Topic name
 * @param {string} allPieces[].evolutionTier - Current evolution tier
 * @param {string[]} allPieces[].relatedTopics - Currently known related topics
 * @returns {Promise<{
 *   evolutions: Array<{
 *     pieceId: string,
 *     topicName: string,
 *     oldTier: string,
 *     newTier: string,
 *     newRelatedTopics: string[]
 *   }>,
 *   newPieceRelations: {
 *     relatedTopics: string[],
 *     category: string,
 *     evolutionTier: string
 *   },
 *   error: string | null
 * }>}
 */
export async function checkPieceEvolutions(newPiece, allPieces) {
  // Validate inputs
  if (!newPiece || !newPiece.topicName) {
    return { evolutions: [], newPieceRelations: null, error: 'INVALID_NEW_PIECE' }
  }

  if (!Array.isArray(allPieces)) {
    return { evolutions: [], newPieceRelations: null, error: 'INVALID_PIECES_ARRAY' }
  }

  // Filter out the new piece from existing pieces
  const existingPieces = allPieces.filter(p => p.id !== newPiece.id)

  if (existingPieces.length === 0) {
    // First piece - no evolutions to check, return default tier
    return {
      evolutions: [],
      newPieceRelations: {
        relatedTopics: [],
        category: '',
        evolutionTier: 'seedling'
      },
      error: null
    }
  }

  // Get all existing topic names
  const existingTopicNames = existingPieces.map(p => p.topicName)

  // Find which existing topics are related to the new one
  const relationResult = await findRelatedTopics(newPiece.topicName, existingTopicNames)

  if (relationResult.error) {
    // If we can't determine relations, return gracefully
    return {
      evolutions: [],
      newPieceRelations: {
        relatedTopics: [],
        category: relationResult.category || '',
        evolutionTier: 'seedling'
      },
      error: relationResult.error
    }
  }

  const evolutions = []

  // Check each existing piece that is related to the new topic
  for (const relatedTopicName of relationResult.relatedTopics) {
    const existingPiece = existingPieces.find(p => p.topicName === relatedTopicName)
    if (!existingPiece) continue

    // Calculate new related topics for this piece
    // It gains a relationship with the new topic
    const currentRelated = existingPiece.relatedTopics || []
    const newRelatedTopics = [...new Set([...currentRelated, newPiece.topicName])]
    const newRelatedCount = newRelatedTopics.length

    // Check if this causes an evolution
    const currentTier = existingPiece.evolutionTier || 'seedling'
    const { upgraded, newTier } = checkTierUpgrade(currentTier, newRelatedCount)

    if (upgraded) {
      evolutions.push({
        pieceId: existingPiece.id,
        topicName: existingPiece.topicName,
        oldTier: currentTier,
        newTier,
        newRelatedTopics
      })

      logger.info('TOPIC_RELATIONS', 'Piece evolution detected', {
        pieceId: existingPiece.id,
        topicName: existingPiece.topicName,
        oldTier: currentTier,
        newTier,
        relatedCount: newRelatedCount
      })
    }
  }

  // Calculate the new piece's evolution tier based on its relations
  const newPieceEvolutionTier = calculateEvolutionTier(relationResult.relatedTopics.length)

  return {
    evolutions,
    newPieceRelations: {
      relatedTopics: relationResult.relatedTopics,
      category: relationResult.category,
      evolutionTier: newPieceEvolutionTier
    },
    error: null
  }
}

/**
 * Get tier display information for UI
 *
 * @param {string} tier - Evolution tier name
 * @returns {{ name: string, icon: string, color: string, minRelated: number }}
 */
export function getTierDisplayInfo(tier) {
  const info = {
    seedling: {
      name: 'Seedling',
      icon: 'seedling',
      color: '#4ade80', // green-400
      minRelated: EVOLUTION_TIERS.seedling
    },
    growing: {
      name: 'Growing',
      icon: 'leaf',
      color: '#22c55e', // green-500
      minRelated: EVOLUTION_TIERS.growing
    },
    flourishing: {
      name: 'Flourishing',
      icon: 'tree',
      color: '#16a34a', // green-600
      minRelated: EVOLUTION_TIERS.flourishing
    },
    legendary: {
      name: 'Legendary',
      icon: 'crown',
      color: '#f59e0b', // amber-500
      minRelated: EVOLUTION_TIERS.legendary
    }
  }

  return info[tier] || info.seedling
}

export default {
  findRelatedTopics,
  calculateEvolutionTier,
  checkPieceEvolutions,
  checkTierUpgrade,
  getTierDisplayInfo,
  EVOLUTION_TIERS,
  TIER_ORDER
}
