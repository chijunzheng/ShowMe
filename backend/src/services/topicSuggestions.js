/**
 * Topic Suggestions Service
 * WB024: Smart topic suggestions for World Builder gamification
 *
 * Provides personalized topic recommendations based on:
 * 1. World Gaps - Zones with few topics that need filling
 * 2. Knowledge Bridges - Topics that connect isolated clusters
 * 3. Trending - Seasonal and popular topics
 */

import logger from '../utils/logger.js'

// Minimum topics per zone before it's considered "weak"
const WEAK_ZONE_THRESHOLD = 3

// Trending topics by season (can be expanded/curated)
const TRENDING_TOPICS = {
  winter: [
    { topic: 'Aurora Borealis', zone: 'arcane', reason: 'Winter sky phenomenon!' },
    { topic: 'Hibernation', zone: 'nature', reason: 'How animals survive winter' },
    { topic: 'Hot Chocolate History', zone: 'civilization', reason: 'Cozy winter drink origins' },
  ],
  spring: [
    { topic: 'Metamorphosis', zone: 'nature', reason: 'Caterpillars becoming butterflies!' },
    { topic: 'Cherry Blossoms', zone: 'nature', reason: 'Spring flower festival season' },
    { topic: 'Ancient Calendars', zone: 'civilization', reason: 'How cultures tracked seasons' },
  ],
  summer: [
    { topic: 'Coral Reefs', zone: 'nature', reason: 'Ocean exploration season!' },
    { topic: 'Space Exploration', zone: 'arcane', reason: 'Star gazing nights' },
    { topic: 'Ancient Olympics', zone: 'civilization', reason: 'Summer games history' },
  ],
  fall: [
    { topic: 'Migration Patterns', zone: 'nature', reason: 'Birds flying south!' },
    { topic: 'Harvest Festivals', zone: 'civilization', reason: 'Cultural celebrations' },
    { topic: 'Fractals in Nature', zone: 'arcane', reason: 'Math in falling leaves' },
  ],
}

// Topic clusters for knowledge bridge detection
// Each cluster has related topics that form a coherent knowledge area
const TOPIC_CLUSTERS = [
  {
    id: 'geology',
    topics: ['Volcanoes', 'Earthquakes', 'Plate Tectonics', 'Rocks and Minerals', 'Fossils'],
    zone: 'nature',
  },
  {
    id: 'astronomy',
    topics: ['Stars', 'Planets', 'Black Holes', 'Galaxies', 'The Moon', 'Solar System'],
    zone: 'arcane',
  },
  {
    id: 'biology',
    topics: ['Cells', 'DNA', 'Evolution', 'Ecosystems', 'Photosynthesis'],
    zone: 'nature',
  },
  {
    id: 'ancient_civs',
    topics: ['Ancient Egypt', 'Ancient Rome', 'Ancient Greece', 'Mesopotamia', 'Pyramids'],
    zone: 'civilization',
  },
  {
    id: 'physics',
    topics: ['Gravity', 'Light', 'Electricity', 'Magnetism', 'Sound Waves'],
    zone: 'arcane',
  },
  {
    id: 'weather',
    topics: ['Clouds', 'Rain', 'Hurricanes', 'Tornadoes', 'Lightning', 'Climate'],
    zone: 'nature',
  },
  {
    id: 'ocean',
    topics: ['Whales', 'Coral Reefs', 'Deep Sea', 'Tides', 'Marine Life'],
    zone: 'nature',
  },
  {
    id: 'inventions',
    topics: ['Printing Press', 'Steam Engine', 'Electricity', 'Computers', 'Wheel'],
    zone: 'civilization',
  },
  {
    id: 'math_concepts',
    topics: ['Prime Numbers', 'Geometry', 'Fibonacci', 'Infinity', 'Zero'],
    zone: 'arcane',
  },
]

// Bridge topics that connect different clusters
const BRIDGE_TOPICS = [
  {
    topic: 'Ring of Fire',
    bridges: ['geology', 'ocean'],
    zone: 'nature',
    reason: 'Connects volcanoes with ocean geography',
  },
  {
    topic: 'Dinosaurs',
    bridges: ['geology', 'biology'],
    zone: 'nature',
    reason: 'Links fossils with evolution',
  },
  {
    topic: 'Sundials',
    bridges: ['astronomy', 'ancient_civs'],
    zone: 'civilization',
    reason: 'Ancient timekeeping using the sun',
  },
  {
    topic: 'Telescopes',
    bridges: ['astronomy', 'inventions'],
    zone: 'civilization',
    reason: 'Invention that unlocked space',
  },
  {
    topic: 'Navigation',
    bridges: ['astronomy', 'ocean'],
    zone: 'civilization',
    reason: 'Stars guided ocean explorers',
  },
  {
    topic: 'Water Cycle',
    bridges: ['weather', 'ocean'],
    zone: 'nature',
    reason: 'Connects rain to ocean systems',
  },
  {
    topic: 'Renewable Energy',
    bridges: ['physics', 'weather'],
    zone: 'civilization',
    reason: 'Harnessing natural forces',
  },
  {
    topic: 'Music Theory',
    bridges: ['physics', 'math_concepts'],
    zone: 'arcane',
    reason: 'Math hidden in sound waves',
  },
  {
    topic: 'Pyramids',
    bridges: ['ancient_civs', 'math_concepts'],
    zone: 'civilization',
    reason: 'Ancient geometry and construction',
  },
  {
    topic: 'Bioluminescence',
    bridges: ['biology', 'ocean'],
    zone: 'nature',
    reason: 'Living lights in the deep sea',
  },
]

// Fallback suggestions per zone when algorithms don't produce enough
const FALLBACK_SUGGESTIONS = {
  nature: [
    { topic: 'Rainforests', reason: 'Explore Earth\'s lungs' },
    { topic: 'Volcanoes', reason: 'Mountains of fire' },
    { topic: 'Ocean Creatures', reason: 'Deep sea mysteries' },
    { topic: 'Seasons', reason: 'Why does weather change?' },
    { topic: 'Animal Habitats', reason: 'Where creatures live' },
  ],
  civilization: [
    { topic: 'Ancient Egypt', reason: 'Pharaohs and pyramids' },
    { topic: 'Inventions', reason: 'Ideas that changed the world' },
    { topic: 'World Cultures', reason: 'How people live differently' },
    { topic: 'Famous Explorers', reason: 'Adventures across the globe' },
    { topic: 'Buildings and Architecture', reason: 'Amazing structures' },
  ],
  arcane: [
    { topic: 'Black Holes', reason: 'Space\'s biggest mystery' },
    { topic: 'Prime Numbers', reason: 'Math\'s hidden patterns' },
    { topic: 'Time', reason: 'What is it really?' },
    { topic: 'Infinity', reason: 'A number without end' },
    { topic: 'Light', reason: 'The fastest thing ever' },
  ],
}

/**
 * Get current season for trending topics
 */
function getCurrentSeason() {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'fall'
  return 'winter'
}

/**
 * Normalize a topic name for comparison
 */
function normalizeTopic(topic) {
  return topic.toLowerCase().trim()
}

/**
 * Check if a topic is already learned
 */
function isTopicLearned(topic, learnedTopics) {
  const normalized = normalizeTopic(topic)
  return learnedTopics.some((t) => normalizeTopic(t) === normalized)
}

/**
 * Find world gaps - zones that need more topics
 */
function findWorldGaps(zones, learnedTopics) {
  const suggestions = []

  for (const [zone, count] of Object.entries(zones)) {
    if (count < WEAK_ZONE_THRESHOLD) {
      // Find topics for this weak zone that haven't been learned
      const fallbacks = FALLBACK_SUGGESTIONS[zone] || []
      const available = fallbacks.filter((f) => !isTopicLearned(f.topic, learnedTopics))

      if (available.length > 0) {
        const suggestion = available[0]
        suggestions.push({
          type: 'world_gap',
          topic: suggestion.topic,
          reason: `Grow your ${zone} zone! ${suggestion.reason}`,
          zone,
          priority: WEAK_ZONE_THRESHOLD - count, // Higher priority for emptier zones
        })
      }
    }
  }

  // Sort by priority (emptier zones first)
  return suggestions.sort((a, b) => b.priority - a.priority)
}

/**
 * Find which topic clusters the user has partially explored
 */
function findExploredClusters(learnedTopics) {
  const explored = []

  for (const cluster of TOPIC_CLUSTERS) {
    const learnedInCluster = cluster.topics.filter((t) => isTopicLearned(t, learnedTopics))
    if (learnedInCluster.length > 0) {
      explored.push({
        ...cluster,
        learnedCount: learnedInCluster.length,
        remaining: cluster.topics.filter((t) => !isTopicLearned(t, learnedTopics)),
      })
    }
  }

  return explored
}

/**
 * Find knowledge bridges - topics that connect explored clusters
 */
function findKnowledgeBridges(learnedTopics) {
  const explored = findExploredClusters(learnedTopics)
  const exploredIds = new Set(explored.map((c) => c.id))

  const suggestions = []

  for (const bridge of BRIDGE_TOPICS) {
    // Skip if already learned
    if (isTopicLearned(bridge.topic, learnedTopics)) continue

    // Check if this bridge connects explored clusters
    const connectedClusters = bridge.bridges.filter((b) => exploredIds.has(b))

    if (connectedClusters.length >= 2) {
      // Bridge connects multiple explored areas - high value!
      suggestions.push({
        type: 'knowledge_bridge',
        topic: bridge.topic,
        reason: bridge.reason,
        zone: bridge.zone,
        priority: connectedClusters.length,
      })
    } else if (connectedClusters.length === 1) {
      // Bridge expands from one explored cluster
      const fromCluster = explored.find((c) => c.id === connectedClusters[0])
      if (fromCluster && fromCluster.learnedCount >= 2) {
        suggestions.push({
          type: 'knowledge_bridge',
          topic: bridge.topic,
          reason: `Expand from ${fromCluster.topics[0]}! ${bridge.reason}`,
          zone: bridge.zone,
          priority: 1,
        })
      }
    }
  }

  return suggestions.sort((a, b) => b.priority - a.priority)
}

/**
 * Get trending topic suggestions
 */
function getTrendingSuggestions(learnedTopics) {
  const season = getCurrentSeason()
  const trending = TRENDING_TOPICS[season] || []

  return trending
    .filter((t) => !isTopicLearned(t.topic, learnedTopics))
    .map((t) => ({
      type: 'trending',
      topic: t.topic,
      reason: t.reason,
      zone: t.zone,
      priority: 0, // Trending is lowest priority
    }))
}

/**
 * Generate personalized topic suggestions
 *
 * @param {Object} params
 * @param {string[]} params.learnedTopics - Topics the user has already learned
 * @param {Object} params.zones - Topic count per zone { nature: N, civilization: N, arcane: N }
 * @param {number} [params.limit=5] - Maximum suggestions to return
 * @returns {Object} { suggestions: Array<Suggestion>, meta: Object }
 */
export function generateSuggestions({ learnedTopics = [], zones = {}, limit = 5 }) {
  try {
    // Normalize zones with defaults
    const normalizedZones = {
      nature: zones.nature || 0,
      civilization: zones.civilization || 0,
      arcane: zones.arcane || 0,
    }

    // Collect suggestions from all sources
    const gaps = findWorldGaps(normalizedZones, learnedTopics)
    const bridges = findKnowledgeBridges(learnedTopics)
    const trending = getTrendingSuggestions(learnedTopics)

    // Interleave suggestions: gap, bridge, trending pattern
    const suggestions = []
    const sources = [gaps, bridges, trending]
    const indices = [0, 0, 0]

    while (suggestions.length < limit) {
      let added = false

      for (let i = 0; i < sources.length; i++) {
        if (indices[i] < sources[i].length) {
          const suggestion = sources[i][indices[i]]

          // Avoid duplicates
          if (!suggestions.some((s) => normalizeTopic(s.topic) === normalizeTopic(suggestion.topic))) {
            suggestions.push({
              type: suggestion.type,
              topic: suggestion.topic,
              reason: suggestion.reason,
              zone: suggestion.zone,
            })
            added = true

            if (suggestions.length >= limit) break
          }

          indices[i]++
        }
      }

      // If no more suggestions available, break
      if (!added) break
    }

    // If we still need more, add fallbacks
    if (suggestions.length < limit) {
      const weakestZone = Object.entries(normalizedZones)
        .sort(([, a], [, b]) => a - b)[0]?.[0] || 'nature'

      const fallbacks = FALLBACK_SUGGESTIONS[weakestZone] || []
      for (const fallback of fallbacks) {
        if (suggestions.length >= limit) break
        if (isTopicLearned(fallback.topic, learnedTopics)) continue
        if (suggestions.some((s) => normalizeTopic(s.topic) === normalizeTopic(fallback.topic))) continue

        suggestions.push({
          type: 'suggested',
          topic: fallback.topic,
          reason: fallback.reason,
          zone: weakestZone,
        })
      }
    }

    logger.debug('SUGGESTIONS', 'Generated suggestions', {
      learnedCount: learnedTopics.length,
      zones: normalizedZones,
      suggestionsCount: suggestions.length,
    })

    return {
      suggestions,
      meta: {
        season: getCurrentSeason(),
        weakestZone: Object.entries(normalizedZones)
          .sort(([, a], [, b]) => a - b)[0]?.[0] || null,
        exploredClusters: findExploredClusters(learnedTopics).map((c) => c.id),
      },
    }
  } catch (error) {
    logger.error('SUGGESTIONS', 'Error generating suggestions', { error: error.message })
    return {
      error: 'GENERATION_FAILED',
      suggestions: [],
      meta: {},
    }
  }
}

/**
 * Get a single quick suggestion for the smart prompt
 *
 * @param {Object} params
 * @param {string[]} params.learnedTopics - Topics the user has already learned
 * @param {Object} params.zones - Topic count per zone
 * @returns {Object|null} A single suggestion or null
 */
export function getQuickSuggestion({ learnedTopics = [], zones = {} }) {
  const result = generateSuggestions({ learnedTopics, zones, limit: 1 })
  return result.suggestions[0] || null
}

export {
  WEAK_ZONE_THRESHOLD,
  TOPIC_CLUSTERS,
  BRIDGE_TOPICS,
  FALLBACK_SUGGESTIONS,
  getCurrentSeason,
}
