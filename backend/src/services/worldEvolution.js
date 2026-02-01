/**
 * World Evolution Service
 * Living World feature: Manages world state and orchestrates evolution
 *
 * The world transforms as users learn topics:
 * - Each completed topic adds one new "evolution" step to the living world
 * - Tier progresses based on total topics learned
 *
 * Data Schema (evolutionWorldState):
 * - clientId: string
 * - worldImageUrl: string | null
 * - styleDescriptor: string (base style for image generation)
 * - topicsLearned: string[]
 * - evolutions: Array<{ topicName, summary, elementAdded, placementHint, model, addedAt }>
 * - tier: 'barren' | 'sprouting' | 'growing' | 'thriving' | 'legendary'
 * - totalTopics: number
 * - createdAt: Date
 * - updatedAt: Date
 */

import logger from '../utils/logger.js'

/**
 * World style descriptor for consistent visual generation
 */
export const WORLD_STYLE = {
  base: 'Whimsical illustrated landscape in soft watercolor style, ' +
    'fantasy world-building aesthetic, warm natural lighting, ' +
    'cohesive color palette with earth tones and subtle magical accents'
}

/**
 * Tier thresholds based on topic count
 */
const TIER_THRESHOLDS = {
  barren: 0,
  sprouting: 5,
  growing: 15,
  thriving: 30,
  legendary: 50
}

/**
 * In-memory store for evolution world state
 * In production, this would use Firestore like worldState.js
 */
const evolutionWorldStates = new Map()

/**
 * Create a new initial world state for a client
 * @param {string} clientId - Unique client identifier
 * @returns {Object} Initial world state object
 */
export function createInitialWorldState(clientId) {
  const now = new Date()

  return {
    clientId,
    worldImageUrl: null,
    styleDescriptor: WORLD_STYLE.base,
    topicsLearned: [],
    evolutions: [],
    tier: 'barren',
    totalTopics: 0,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Calculate world tier based on total topic count
 * @param {number} totalTopics - Total number of topics completed
 * @returns {'barren' | 'sprouting' | 'growing' | 'thriving' | 'legendary'}
 */
export function calculateTier(totalTopics) {
  // Handle edge cases
  if (totalTopics < 0) {
    return 'barren'
  }

  if (totalTopics >= TIER_THRESHOLDS.legendary) {
    return 'legendary'
  }
  if (totalTopics >= TIER_THRESHOLDS.thriving) {
    return 'thriving'
  }
  if (totalTopics >= TIER_THRESHOLDS.growing) {
    return 'growing'
  }
  if (totalTopics >= TIER_THRESHOLDS.sprouting) {
    return 'sprouting'
  }

  return 'barren'
}

/**
 * Get world state for a client, creating a new one if it doesn't exist
 * @param {string} clientId - Unique client identifier
 * @returns {Object} World state object
 */
function getOrCreateWorldState(clientId) {
  if (!evolutionWorldStates.has(clientId)) {
    const initialState = createInitialWorldState(clientId)
    evolutionWorldStates.set(clientId, initialState)
  }

  return evolutionWorldStates.get(clientId)
}

/**
 * Evolve the world state by recording a new topic as learned.
 *
 * NOTE: This module does NOT attempt to classify topics into zones/terrain
 * using heuristics. Topic-to-visual translation is handled by Gemini in the
 * Living World route, and the resulting element metadata can be stored here.
 *
 * @param {string} clientId - Unique client identifier
 * @param {string} topicName - Name of the topic
 * @param {string} summary - Summary of the topic
 * @param {Object} [meta]
 * @param {string|null} [meta.elementAdded]
 * @param {string|null} [meta.placementHint]
 * @param {string|null} [meta.model]
 * @returns {Promise<{
 *   worldImageUrl: string | null,
 *   changesApplied: Object,
 *   tier: string,
 *   tierUpgrade: { from: string, to: string } | null
 * }>}
 */
export async function evolveWorld(clientId, topicName, summary, meta = {}) {
  try {
    // Get or create world state
    const worldState = getOrCreateWorldState(clientId)
    const previousTier = worldState.tier

    const normalizedTopicName = typeof topicName === 'string' ? topicName.trim() : ''
    const safeTopicName = normalizedTopicName || 'Unknown topic'
    const safeSummary = typeof summary === 'string' ? summary.trim() : ''

    // Normalize optional fields for older saved states
    if (!Array.isArray(worldState.topicsLearned)) {
      worldState.topicsLearned = []
    }
    if (!Array.isArray(worldState.evolutions)) {
      worldState.evolutions = []
    }

    // Skip duplicates (case-insensitive) to avoid re-adding the same element repeatedly
    if (normalizedTopicName) {
      const alreadyLearned = worldState.topicsLearned.some(
        (t) => typeof t === 'string' && t.toLowerCase() === normalizedTopicName.toLowerCase()
      )
      if (alreadyLearned) {
        logger.info('WORLD', 'Topic already applied to living world (skipping)', {
          clientId,
          topicName: normalizedTopicName,
        })
        return {
          worldImageUrl: worldState.worldImageUrl,
          changesApplied: {
            skipped: true,
            reason: 'TOPIC_ALREADY_APPLIED',
          },
          tier: worldState.tier,
          tierUpgrade: null,
        }
      }
    }

    if (normalizedTopicName) {
      worldState.topicsLearned.push(normalizedTopicName)
    }

    const previousTotalTopics = Number.isFinite(Number(worldState.totalTopics))
      ? Number(worldState.totalTopics)
      : worldState.topicsLearned.length - 1
    const safePreviousTotalTopics = Math.max(previousTotalTopics, worldState.topicsLearned.length - 1)
    worldState.totalTopics = safePreviousTotalTopics + 1

    // Calculate new tier
    const newTier = calculateTier(worldState.totalTopics)
    worldState.tier = newTier

    // Check for tier upgrade
    let tierUpgrade = null
    if (newTier !== previousTier) {
      tierUpgrade = {
        from: previousTier,
        to: newTier
      }
    }

    // Update timestamp
    worldState.updatedAt = new Date()

    worldState.evolutions.push({
      topicName: safeTopicName,
      summary: safeSummary,
      elementAdded: typeof meta?.elementAdded === 'string' ? meta.elementAdded.trim() : null,
      placementHint: typeof meta?.placementHint === 'string' ? meta.placementHint.trim() : null,
      model: typeof meta?.model === 'string' ? meta.model.trim() : null,
      addedAt: new Date(),
    })

    // Save updated state
    evolutionWorldStates.set(clientId, worldState)

    logger.info('WORLD', 'World evolved', {
      clientId,
      topicName,
      totalTopics: worldState.totalTopics,
      tier: newTier,
      tierUpgrade: tierUpgrade ? `${tierUpgrade.from} -> ${tierUpgrade.to}` : null
    })

    return {
      worldImageUrl: worldState.worldImageUrl,
      changesApplied: {
        tierChanged: newTier !== previousTier,
        previousTier,
        newTier,
        elementAdded: typeof meta?.elementAdded === 'string' ? meta.elementAdded.trim() : null,
        placementHint: typeof meta?.placementHint === 'string' ? meta.placementHint.trim() : null,
      },
      tier: newTier,
      tierUpgrade
    }
  } catch (error) {
    logger.error('WORLD', 'Failed to evolve world', {
      clientId,
      topicName,
      error: error.message
    })

    throw error
  }
}

/**
 * Get the current evolution world state for a client
 * @param {string} clientId - Unique client identifier
 * @returns {{ worldState: Object | null, error: string | null }}
 */
export function getEvolutionWorldState(clientId) {
  if (!evolutionWorldStates.has(clientId)) {
    return { worldState: null, error: null }
  }

  return {
    worldState: evolutionWorldStates.get(clientId),
    error: null
  }
}

/**
 * Reset evolution world state for a client (useful for testing)
 * @param {string} clientId - Unique client identifier
 */
export function resetEvolutionWorldState(clientId) {
  evolutionWorldStates.delete(clientId)
}

/**
 * Set/replace evolution world state for a client.
 * Used by routes to hydrate persisted state into the in-memory cache.
 *
 * @param {string} clientId
 * @param {Object} worldState
 */
export function setEvolutionWorldState(clientId, worldState) {
  if (!clientId) return
  if (!worldState || typeof worldState !== 'object') return
  evolutionWorldStates.set(clientId, worldState)
}

export default {
  createInitialWorldState,
  calculateTier,
  evolveWorld,
  getEvolutionWorldState,
  resetEvolutionWorldState,
  setEvolutionWorldState,
  WORLD_STYLE,
}
