/**
 * Mystery Box Config - Mystery Box Rewards System Configuration
 *
 * Defines tiers, power-ups, timing, and utility functions for the
 * Mystery Box gamification feature. Mystery boxes are awarded based
 * on quiz performance (60%+ correct answers).
 *
 * Tier System:
 * - Bronze (60-74%): Basic rewards, no power-ups
 * - Silver (75-89%): Better rewards, 30% power-up chance
 * - Gold (90-99%): Great rewards, 60% power-up chance
 * - Legendary (100%): Maximum rewards, guaranteed power-up
 *
 * Power-ups:
 * - Streak Shield: Protects streak from wrong answer
 * - Time Freeze: Extra time on next question
 * - Hint Token: Reveals helpful hint
 */

/**
 * Mystery box tier definitions.
 * Each tier has score range, rewards, power-up chance, and styling.
 */
export const MYSTERY_BOX_TIERS = Object.freeze({
  bronze: Object.freeze({
    id: 'bronze',
    name: 'Bronze',
    icon: '\u{1F949}', // Bronze medal emoji
    scoreRange: Object.freeze({ min: 60, max: 74 }),
    rewards: Object.freeze({
      xpMin: 10,
      xpMax: 20,
    }),
    powerUpChance: 0,
    colors: Object.freeze({
      primary: '#CD7F32',
      glow: 'rgba(205, 127, 50, 0.5)',
    }),
  }),
  silver: Object.freeze({
    id: 'silver',
    name: 'Silver',
    icon: '\u{1F948}', // Silver medal emoji
    scoreRange: Object.freeze({ min: 75, max: 89 }),
    rewards: Object.freeze({
      xpMin: 20,
      xpMax: 35,
    }),
    powerUpChance: 0.3,
    colors: Object.freeze({
      primary: '#C0C0C0',
      glow: 'rgba(192, 192, 192, 0.5)',
    }),
  }),
  gold: Object.freeze({
    id: 'gold',
    name: 'Gold',
    icon: '\u{1F947}', // Gold medal emoji
    scoreRange: Object.freeze({ min: 90, max: 99 }),
    rewards: Object.freeze({
      xpMin: 35,
      xpMax: 50,
    }),
    powerUpChance: 0.6,
    colors: Object.freeze({
      primary: '#FFD700',
      glow: 'rgba(255, 215, 0, 0.5)',
    }),
  }),
  legendary: Object.freeze({
    id: 'legendary',
    name: 'Legendary',
    icon: '\u{1F451}', // Crown emoji
    scoreRange: Object.freeze({ min: 100, max: 100 }),
    rewards: Object.freeze({
      xpMin: 50,
      xpMax: 75,
    }),
    powerUpChance: 1.0,
    colors: Object.freeze({
      primary: '#9B59B6',
      glow: 'rgba(155, 89, 182, 0.6)',
    }),
  }),
})

/**
 * Power-up definitions with weighted probability.
 * Weights sum to 100 for easy percentage calculation.
 */
export const MYSTERY_BOX_POWER_UPS = Object.freeze({
  streak_shield: Object.freeze({
    id: 'streak_shield',
    name: 'Streak Shield',
    icon: '\u{1F6E1}\uFE0F', // Shield emoji
    description: 'Protects your streak from one wrong answer',
    effect: Object.freeze({
      type: 'streak_protection',
      uses: 1,
    }),
    weight: 40,
  }),
  time_freeze: Object.freeze({
    id: 'time_freeze',
    name: 'Time Freeze',
    icon: '\u{23F1}\uFE0F', // Stopwatch emoji
    description: 'Adds extra time on your next timed question',
    effect: Object.freeze({
      type: 'time_extension',
      seconds: 10,
    }),
    weight: 35,
  }),
  hint_token: Object.freeze({
    id: 'hint_token',
    name: 'Hint Token',
    icon: '\u{1F4A1}', // Lightbulb emoji
    description: 'Reveals a helpful hint for a tough question',
    effect: Object.freeze({
      type: 'hint_reveal',
      uses: 1,
    }),
    weight: 25,
  }),
})

/**
 * Timing configuration for mystery box animations.
 * All values in milliseconds.
 */
export const MYSTERY_BOX_TIMING = Object.freeze({
  appearDelay: 500,
  shakesDuration: 1500,
  openDuration: 800,
  revealDelay: 300,
  celebrationDuration: 2000,
})

/**
 * Gets the appropriate tier for a given score percentage.
 *
 * @param {number} percentage - Score percentage (0-100+)
 * @returns {Object|null} The tier object, or null if below threshold
 */
export function getBoxTierFromScore(percentage) {
  // Validate input is a valid number
  if (typeof percentage !== 'number' || Number.isNaN(percentage)) {
    return null
  }

  // Clamp scores above 100 to legendary tier
  const normalizedScore = percentage > 100 ? 100 : percentage

  // No mystery box below 60%
  if (normalizedScore < 60) {
    return null
  }

  // Check tiers in order from highest to lowest
  if (normalizedScore >= 100) {
    return MYSTERY_BOX_TIERS.legendary
  }
  if (normalizedScore >= 90) {
    return MYSTERY_BOX_TIERS.gold
  }
  if (normalizedScore >= 75) {
    return MYSTERY_BOX_TIERS.silver
  }
  if (normalizedScore >= 60) {
    return MYSTERY_BOX_TIERS.bronze
  }

  return null
}

/**
 * Calculates a random XP bonus within the tier's reward range.
 *
 * @param {Object} tier - A tier object from MYSTERY_BOX_TIERS
 * @returns {number} Random XP bonus as an integer, or 0 for invalid tier
 */
export function calculateXpBonus(tier) {
  // Validate tier has rewards
  if (!tier || !tier.rewards || typeof tier.rewards.xpMin !== 'number') {
    return 0
  }

  const { xpMin, xpMax } = tier.rewards
  const randomXp = Math.random() * (xpMax - xpMin) + xpMin

  return Math.floor(randomXp)
}

/**
 * Selects a power-up based on tier's power-up chance and weighted probability.
 *
 * @param {Object} tier - A tier object from MYSTERY_BOX_TIERS
 * @returns {Object|null} Selected power-up or null if none awarded
 */
export function selectPowerUp(tier) {
  // Validate tier has power-up chance
  if (!tier || typeof tier.powerUpChance !== 'number') {
    return null
  }

  // Check if power-up is awarded based on tier chance
  const chanceRoll = Math.random()
  if (chanceRoll >= tier.powerUpChance) {
    return null
  }

  // Select power-up based on weighted probability
  const weightRoll = Math.random() * 100
  let cumulativeWeight = 0

  const powerUps = Object.values(MYSTERY_BOX_POWER_UPS)

  for (const powerUp of powerUps) {
    cumulativeWeight += powerUp.weight
    if (weightRoll < cumulativeWeight) {
      return powerUp
    }
  }

  // Fallback to last power-up (shouldn't happen with correct weights)
  return powerUps[powerUps.length - 1]
}

/**
 * Upgrades a tier to the next level (e.g., for boss victory bonus).
 *
 * @param {Object} tier - Current tier object (or object with id property)
 * @returns {Object} Upgraded tier, or bronze if invalid/missing
 */
export function upgradeTier(tier) {
  // Handle null, undefined, or invalid tier
  if (!tier || !tier.id) {
    return MYSTERY_BOX_TIERS.bronze
  }

  const tierOrder = ['bronze', 'silver', 'gold', 'legendary']
  const currentIndex = tierOrder.indexOf(tier.id)

  // Invalid tier ID, start at bronze
  if (currentIndex === -1) {
    return MYSTERY_BOX_TIERS.bronze
  }

  // Already at max tier
  if (currentIndex >= tierOrder.length - 1) {
    return MYSTERY_BOX_TIERS.legendary
  }

  // Return next tier
  const nextTierId = tierOrder[currentIndex + 1]
  return MYSTERY_BOX_TIERS[nextTierId]
}
