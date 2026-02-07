/**
 * Category Utility Functions
 *
 * Pure utility functions for calculating tree level and grouping topics by zone.
 * Migrated from MagicalTree/treeUtils.js during Knowledge Constellation feature.
 */

/**
 * Tree level constants
 */
export const TREE_LEVELS = {
  SEED: 'seed',
  SPROUT: 'sprout',
  SAPLING: 'sapling',
  YOUNG: 'young',
  MATURE: 'mature',
  MAGICAL: 'magical',
}

/**
 * Zone constants for category groupings
 */
export const ZONES = {
  NATURE: 'nature',
  CIVILIZATION: 'civilization',
  ARCANE: 'arcane',
}

/**
 * Category to zone mapping
 * Categories are case-insensitive and matched by lowercase comparison
 */
const NATURE_CATEGORIES = [
  'animals',
  'plants',
  'weather',
  'geography',
  'ocean',
  'dinosaurs',
  'biology',
  'earth science',
  'ecosystems',
  'nature',
]

const CIVILIZATION_CATEGORIES = [
  'history',
  'technology',
  'society',
  'art',
  'music',
  'food',
  'people',
  'inventions',
  'engineering',
  'architecture',
  'economics',
  'culture',
]

const ARCANE_CATEGORIES = [
  'science',
  'space',
  'math',
  'physics',
  'chemistry',
  'astronomy',
  'mathematics',
  'magic',
  'mythology',
  'philosophy',
  'abstract',
]

/**
 * Calculate tree level based on topic count
 *
 * Thresholds:
 * - 0 topics = 'seed'
 * - 1-2 topics = 'sprout'
 * - 3-5 topics = 'sapling'
 * - 6-10 topics = 'young'
 * - 11-20 topics = 'mature'
 * - 21+ topics = 'magical'
 *
 * @param {number} topicCount - Number of learned topics
 * @returns {string} Tree level name
 */
export function calculateTreeLevel(topicCount) {
  // Handle edge cases: null, undefined, NaN, non-numeric strings
  let count = topicCount

  // Handle string input by parsing
  if (typeof count === 'string') {
    count = parseFloat(count)
  }

  // Handle invalid values (null, undefined, NaN, non-numeric)
  if (count === null || count === undefined || Number.isNaN(count)) {
    return TREE_LEVELS.SEED
  }

  // Floor the value for floating point numbers
  count = Math.floor(count)

  // Handle negative numbers
  if (count < 0) {
    return TREE_LEVELS.SEED
  }

  // Apply thresholds
  if (count === 0) {
    return TREE_LEVELS.SEED
  }
  if (count <= 2) {
    return TREE_LEVELS.SPROUT
  }
  if (count <= 5) {
    return TREE_LEVELS.SAPLING
  }
  if (count <= 10) {
    return TREE_LEVELS.YOUNG
  }
  if (count <= 20) {
    return TREE_LEVELS.MATURE
  }
  return TREE_LEVELS.MAGICAL
}

/**
 * Get zone for a category name
 *
 * Zones:
 * - nature: Animals, Plants, Weather, Geography, Ocean, Dinosaurs
 * - civilization: History, Technology, Society, Art, Music, Food
 * - arcane: Science, Space, Math, Physics, Chemistry
 *
 * @param {string} category - Category name
 * @returns {string} Zone name ('nature', 'civilization', or 'arcane')
 */
export function getZoneForCategory(category) {
  // Handle null, undefined, empty string
  if (!category || typeof category !== 'string') {
    return ZONES.NATURE
  }

  const lowerCategory = category.toLowerCase().trim()

  // Check nature categories
  if (NATURE_CATEGORIES.some((cat) => lowerCategory === cat || lowerCategory.includes(cat))) {
    return ZONES.NATURE
  }

  // Check civilization categories
  if (CIVILIZATION_CATEGORIES.some((cat) => lowerCategory === cat || lowerCategory.includes(cat))) {
    return ZONES.CIVILIZATION
  }

  // Check arcane categories
  if (ARCANE_CATEGORIES.some((cat) => lowerCategory === cat || lowerCategory.includes(cat))) {
    return ZONES.ARCANE
  }

  // Default to nature for unknown categories
  return ZONES.NATURE
}

/**
 * Group topics by zone
 *
 * @param {Array} topics - Array of topic objects with { id, name, category }
 * @returns {Object} Object with nature, civilization, and arcane arrays
 */
export function groupTopicsByZone(topics) {
  // Initialize empty zones
  const result = {
    nature: [],
    civilization: [],
    arcane: [],
  }

  // Handle null or undefined topics
  if (!topics || !Array.isArray(topics)) {
    return result
  }

  // Group each topic into its zone
  topics.forEach((topic) => {
    const zone = getZoneForCategory(topic?.category)
    const topicWithZone = { ...topic, zone }
    result[zone].push(topicWithZone)
  })

  return result
}
