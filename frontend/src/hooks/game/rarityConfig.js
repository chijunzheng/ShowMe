/**
 * Rarity Config - Question Rarity System Configuration
 *
 * Defines rarity tiers, probabilities, and XP multipliers for the
 * question rarity gamification feature.
 *
 * Probability Distribution:
 * - Common: 70% (0.00 - 0.70)
 * - Rare: 20% (0.70 - 0.90)
 * - Epic: 8% (0.90 - 0.98)
 * - Legendary: 2% (0.98 - 1.00)
 */

/**
 * Rarity tier definitions with all configuration properties.
 * Object is frozen for immutability.
 */
export const RARITY_TIERS = Object.freeze({
  common: Object.freeze({
    id: 'common',
    name: 'Common',
    icon: '',
    xpMultiplier: 1,
    probability: 0.7,
    color: 'gray',
  }),
  rare: Object.freeze({
    id: 'rare',
    name: 'Rare',
    icon: '\uD83D\uDC8E', // Diamond emoji
    xpMultiplier: 1.5,
    probability: 0.2,
    color: 'blue',
  }),
  epic: Object.freeze({
    id: 'epic',
    name: 'Epic',
    icon: '\uD83D\uDD2E', // Crystal ball emoji
    xpMultiplier: 2,
    probability: 0.08,
    color: 'purple',
  }),
  legendary: Object.freeze({
    id: 'legendary',
    name: 'Legendary',
    icon: '\uD83D\uDC51', // Crown emoji
    xpMultiplier: 3,
    probability: 0.02,
    color: 'gold',
  }),
})

/**
 * Selects a random rarity based on probability distribution.
 *
 * Uses cumulative probability ranges:
 * - 0.00 to 0.70: common
 * - 0.70 to 0.90: rare
 * - 0.90 to 0.98: epic
 * - 0.98 to 1.00: legendary
 *
 * @returns {string} Rarity ID: 'common' | 'rare' | 'epic' | 'legendary'
 */
export function selectRandomRarity() {
  const roll = Math.random()

  // Common: 0.00 - 0.70 (70%)
  if (roll < 0.7) {
    return 'common'
  }

  // Rare: 0.70 - 0.90 (20%)
  if (roll < 0.9) {
    return 'rare'
  }

  // Epic: 0.90 - 0.98 (8%)
  if (roll < 0.98) {
    return 'epic'
  }

  // Legendary: 0.98 - 1.00 (2%)
  return 'legendary'
}

/**
 * Gets the configuration object for a rarity tier.
 *
 * Falls back to common tier for invalid or missing rarity IDs.
 *
 * @param {string} rarityId - The rarity ID to look up
 * @returns {Object} Rarity tier configuration
 */
export function getRarityConfig(rarityId) {
  // Validate input is a string and exists in RARITY_TIERS
  if (typeof rarityId === 'string' && RARITY_TIERS[rarityId]) {
    return RARITY_TIERS[rarityId]
  }

  // Fallback to common for invalid inputs
  return RARITY_TIERS.common
}

/**
 * Applies rarity multiplier to base XP.
 *
 * Returns the XP value multiplied by the rarity tier's multiplier,
 * rounded to the nearest integer.
 *
 * @param {number} baseXp - Base XP amount
 * @param {string} rarityId - The rarity ID for multiplier lookup
 * @returns {number} XP with multiplier applied (rounded)
 */
export function applyRarityMultiplier(baseXp, rarityId) {
  const config = getRarityConfig(rarityId)
  const multipliedXp = baseXp * config.xpMultiplier

  return Math.round(multipliedXp)
}
