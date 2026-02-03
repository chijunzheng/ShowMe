/**
 * Boss Battle Config - Boss Battle System Configuration
 *
 * Defines timing, rewards, styles, and intro messages for the
 * Boss Battle gamification feature. Boss battles occur on the
 * final question of each quiz for added engagement.
 *
 * Level-Specific Styling:
 * - simple: Green/emerald theme, friendly boss
 * - standard: Blue/cyan theme, challenging boss
 * - deep: Purple/violet theme, formidable boss
 */

/**
 * Boss battle configuration with all settings.
 * Object is deeply frozen for immutability.
 */
export const BOSS_BATTLE_CONFIG = Object.freeze({
  /**
   * Timing configuration in milliseconds.
   */
  timing: Object.freeze({
    introDelay: 500,
    introDuration: 2500,
    answerRevealDelay: 800,
    victoryDuration: 3000,
    defeatDuration: 2000,
  }),

  /**
   * Reward values for defeating bosses.
   */
  rewards: Object.freeze({
    victoryXpBonus: 25,
    mysteryBoxUpgrade: 1,
  }),

  /**
   * Visual styles for each difficulty level.
   */
  styles: Object.freeze({
    simple: Object.freeze({
      icon: '\uD83D\uDC09', // Dragon emoji
      name: 'Puzzle Dragon',
      bgGradient: 'bg-gradient-to-br from-emerald-500 to-green-600',
      borderColor: 'border-emerald-400',
      glowColor: 'shadow-emerald-500/50',
    }),
    standard: Object.freeze({
      icon: '\uD83E\uDD89', // Owl emoji
      name: 'Wisdom Owl',
      bgGradient: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      borderColor: 'border-cyan-400',
      glowColor: 'shadow-cyan-500/50',
    }),
    deep: Object.freeze({
      icon: '\uD83E\uDDDE', // Genie emoji
      name: 'Mystery Sphinx',
      bgGradient: 'bg-gradient-to-br from-violet-500 to-purple-600',
      borderColor: 'border-violet-400',
      glowColor: 'shadow-violet-500/50',
    }),
  }),

  /**
   * Intro messages shown before boss battles.
   * Randomly selected for variety.
   */
  introMessages: Object.freeze({
    simple: Object.freeze([
      'A wild Puzzle Dragon appears!',
      'The Puzzle Dragon wants to play!',
      "Here comes the Puzzle Dragon! Let's go!",
    ]),
    standard: Object.freeze([
      'The Wisdom Owl challenges you!',
      'A wise Wisdom Owl blocks your path!',
      'The Wisdom Owl tests your knowledge!',
    ]),
    deep: Object.freeze([
      'The Mystery Sphinx awakens!',
      'Behold! The Mystery Sphinx rises!',
      'The ancient Mystery Sphinx appears!',
    ]),
  }),
})

/**
 * Gets the style configuration for a difficulty level.
 *
 * Falls back to simple level for invalid or missing level IDs.
 *
 * @param {string} level - The difficulty level ('simple' | 'standard' | 'deep')
 * @returns {Object} Style configuration for the level
 */
export function getBossStyle(level) {
  // Validate input is a string and exists in styles
  if (typeof level === 'string' && BOSS_BATTLE_CONFIG.styles[level]) {
    return BOSS_BATTLE_CONFIG.styles[level]
  }

  // Fallback to simple for invalid inputs
  return BOSS_BATTLE_CONFIG.styles.simple
}

/**
 * Gets the intro messages array for a difficulty level.
 *
 * Falls back to simple level for invalid or missing level IDs.
 *
 * @param {string} level - The difficulty level ('simple' | 'standard' | 'deep')
 * @returns {Array<string>} Array of intro messages for the level
 */
export function getIntroMessages(level) {
  // Validate input is a string and exists in introMessages
  if (typeof level === 'string' && BOSS_BATTLE_CONFIG.introMessages[level]) {
    return BOSS_BATTLE_CONFIG.introMessages[level]
  }

  // Fallback to simple for invalid inputs
  return BOSS_BATTLE_CONFIG.introMessages.simple
}

/**
 * Gets the rewards configuration for boss victories.
 *
 * @returns {Object} Rewards configuration object
 */
export function getBossRewards() {
  return BOSS_BATTLE_CONFIG.rewards
}
