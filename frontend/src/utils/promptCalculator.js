/**
 * promptCalculator - Smart prompt calculation for World Builder Journey
 *
 * Determines which contextual prompt to show on the World tab based on:
 * 1. Sleepy pieces needing urgent review (14+ days)
 * 2. Streak maintenance (if user has active streak)
 * 3. Near evolution opportunities
 * 4. World gaps (weak zones)
 * 5. General encouragement
 *
 * @module utils/promptCalculator
 */

/**
 * Prompt types in priority order
 */
export const PROMPT_TYPES = {
  REVIEW_URGENT: 'review_urgent',
  STREAK: 'streak',
  NEAR_EVOLUTION: 'near_evolution',
  WORLD_GAP: 'world_gap',
  ZONE_ENCOURAGEMENT: 'zone_encouragement',
  GENERAL: 'general',
}

/**
 * Zone configuration with names and icons
 */
const ZONE_CONFIG = {
  nature: { name: 'Nature', icon: '🌿', minForHealthy: 3 },
  civilization: { name: 'Civilization', icon: '🏛️', minForHealthy: 3 },
  arcane: { name: 'Arcane', icon: '✨', minForHealthy: 3, unlockThreshold: 20 },
}

/**
 * Calculate days since a piece was last reviewed
 * @param {Object} piece - World piece object
 * @returns {number} Days since last review
 */
function getDaysSinceReview(piece) {
  const reviewDate = piece.lastReviewedAt || piece.unlockedAt
  if (!reviewDate) return 999
  return Math.floor((Date.now() - new Date(reviewDate).getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get freshness state based on days since review
 * @param {number} days - Days since last review
 * @returns {'fresh' | 'fading' | 'sleepy'}
 */
function getFreshnessState(days) {
  if (days <= 7) return 'fresh'
  if (days <= 14) return 'fading'
  return 'sleepy'
}

/**
 * Check if piece is near evolution threshold
 * @param {Object} piece - World piece object
 * @returns {boolean}
 */
function isNearEvolution(piece) {
  const relatedCount = piece.relatedTopics?.length || 0
  const tier = piece.evolutionTier || 'seedling'

  if (tier === 'seedling' && relatedCount >= 2) return true
  if (tier === 'growing' && relatedCount >= 4) return true
  if (tier === 'flourishing' && relatedCount >= 8) return true
  return false
}

/**
 * Count pieces per zone
 * @param {Array} pieces - World pieces
 * @returns {Object} Zone counts
 */
function countByZone(pieces) {
  return pieces.reduce((acc, piece) => {
    const zone = piece.zone || 'nature'
    acc[zone] = (acc[zone] || 0) + 1
    return acc
  }, { nature: 0, civilization: 0, arcane: 0 })
}

/**
 * Find the weakest zone (fewest pieces)
 * @param {Object} zoneCounts - Counts per zone
 * @param {number} totalPieces - Total piece count
 * @returns {string|null} Weakest zone name or null
 */
function findWeakestZone(zoneCounts, totalPieces) {
  // Arcane requires 20+ total pieces to unlock
  const zones = totalPieces >= 20
    ? ['nature', 'civilization', 'arcane']
    : ['nature', 'civilization']

  let weakest = null
  let minCount = Infinity

  for (const zone of zones) {
    const count = zoneCounts[zone] || 0
    const config = ZONE_CONFIG[zone]

    // Only consider a zone "weak" if it has fewer than minForHealthy pieces
    if (count < config.minForHealthy && count < minCount) {
      minCount = count
      weakest = zone
    }
  }

  return weakest
}

/**
 * Calculate the top prompt to show based on world state
 *
 * @param {Object} options - Calculation options
 * @param {Array} options.pieces - World pieces array
 * @param {Object} options.streak - Streak info { current: number, todayCompleted: boolean }
 * @param {string} options.tier - Current world tier
 * @param {number} options.totalPieces - Total piece count
 * @returns {Object} Prompt object with type, message, action, icon, and payload
 */
export function calculateTopPrompt({ pieces = [], streak = {}, tier, totalPieces = 0 }) {
  // Priority 1: Sleepy pieces (14+ days without review)
  const sleepyPieces = pieces.filter(p => getDaysSinceReview(p) > 14)
  if (sleepyPieces.length >= 1) {
    const count = sleepyPieces.length
    return {
      type: PROMPT_TYPES.REVIEW_URGENT,
      message: count === 1
        ? `"${sleepyPieces[0].topicName || sleepyPieces[0].name}" needs review!`
        : `${count} topics are getting sleepy!`,
      action: 'Review Now',
      icon: '😴',
      payload: {
        pieces: sleepyPieces.slice(0, 3),
        actionType: 'review',
      },
    }
  }

  // Priority 2: Streak maintenance
  if (streak.current > 0 && !streak.todayCompleted) {
    return {
      type: PROMPT_TYPES.STREAK,
      message: `Keep your ${streak.current}-day streak going!`,
      action: 'Test Me',
      icon: '🧠',
      payload: {
        streakDays: streak.current,
        actionType: 'quick_quiz',
      },
    }
  }

  // Priority 3: Pieces near evolution
  const nearEvolutionPieces = pieces.filter(isNearEvolution)
  if (nearEvolutionPieces.length > 0) {
    const piece = nearEvolutionPieces[0]
    return {
      type: PROMPT_TYPES.NEAR_EVOLUTION,
      message: `"${piece.topicName || piece.name}" is ready to evolve!`,
      action: 'Level Up',
      icon: '⬆️',
      payload: {
        piece,
        actionType: 'quiz',
      },
    }
  }

  // Priority 4: Fading pieces (7-14 days)
  const fadingPieces = pieces.filter(p => {
    const days = getDaysSinceReview(p)
    return days > 7 && days <= 14
  })
  if (fadingPieces.length >= 2) {
    return {
      type: PROMPT_TYPES.REVIEW_URGENT,
      message: `${fadingPieces.length} topics need attention`,
      action: 'Review',
      icon: '💭',
      payload: {
        pieces: fadingPieces.slice(0, 3),
        actionType: 'review',
      },
    }
  }

  // Priority 5: Weak zones
  const zoneCounts = countByZone(pieces)
  const weakZone = findWeakestZone(zoneCounts, totalPieces)
  if (weakZone && totalPieces >= 3) {
    const zoneConfig = ZONE_CONFIG[weakZone]
    return {
      type: PROMPT_TYPES.ZONE_ENCOURAGEMENT,
      message: `Your ${zoneConfig.name} zone needs attention!`,
      action: 'Explore',
      icon: zoneConfig.icon,
      payload: {
        zone: weakZone,
        actionType: 'learn',
      },
    }
  }

  // Priority 6: General encouragement (varies by state)
  if (totalPieces === 0) {
    return {
      type: PROMPT_TYPES.GENERAL,
      message: 'Start learning to build your world!',
      action: 'Ask a Question',
      icon: '🌱',
      payload: {
        actionType: 'learn',
      },
    }
  }

  if (totalPieces < 5) {
    return {
      type: PROMPT_TYPES.GENERAL,
      message: 'Keep exploring to grow your world!',
      action: 'Learn More',
      icon: '🌍',
      payload: {
        actionType: 'learn',
      },
    }
  }

  // Default: World is thriving
  return {
    type: PROMPT_TYPES.GENERAL,
    message: 'Your world is thriving!',
    action: 'Explore',
    icon: '✨',
    payload: {
      actionType: 'explore',
    },
  }
}

/**
 * Get prompt urgency level for styling
 * @param {string} promptType - Prompt type
 * @returns {'high' | 'medium' | 'low'}
 */
export function getPromptUrgency(promptType) {
  switch (promptType) {
    case PROMPT_TYPES.REVIEW_URGENT:
      return 'high'
    case PROMPT_TYPES.STREAK:
    case PROMPT_TYPES.NEAR_EVOLUTION:
      return 'medium'
    default:
      return 'low'
  }
}

export default calculateTopPrompt
