/**
 * Tree Reaction Config - Quiz Reaction System Configuration
 *
 * Defines how the Magical Tree visually reacts to quiz results.
 * Each reaction type has specific colors, animations, particles,
 * sounds, and messages to provide engaging feedback.
 *
 * Reaction Types:
 * - pass: Standard correct answer celebration (emerald, shimmer)
 * - perfect: 100% score celebration (amber, growth)
 * - boss_victory: Boss battle victory (purple, dance)
 * - streak: Answer streak milestone (cyan, glow)
 * - fail: Encouraging feedback for incorrect (slate, gentle_droop)
 */

/**
 * Tree reaction configuration for all quiz result types.
 * Object is deeply frozen for immutability.
 */
export const TREE_REACTIONS = Object.freeze({
  /**
   * Pass reaction - Standard correct answer
   * Celebratory but not overwhelming
   */
  pass: Object.freeze({
    color: 'emerald',
    animation: 'shimmer',
    duration: 2000,
    particles: 'leaves',
    sound: 'playEvolutionSound',
    message: 'Your tree is growing!',
  }),

  /**
   * Perfect reaction - 100% score achievement
   * More elaborate celebration for excellence
   */
  perfect: Object.freeze({
    color: 'amber',
    animation: 'growth',
    duration: 3000,
    particles: 'sparkles',
    sound: 'playTierUpSound',
    message: 'Perfect! Your tree shines!',
  }),

  /**
   * Boss Victory reaction - Defeated a boss
   * Maximum celebration for this achievement
   */
  boss_victory: Object.freeze({
    color: 'purple',
    animation: 'dance',
    duration: 3500,
    particles: 'fireworks',
    sound: 'playBossVictorySound',
    message: 'Boss defeated! Tree power!',
  }),

  /**
   * Streak reaction - Answer streak milestone
   * Quick, non-intrusive positive feedback
   */
  streak: Object.freeze({
    color: 'cyan',
    animation: 'glow',
    duration: 1500,
    particles: 'streaks',
    sound: 'playStreakSound',
    message: null, // No message for non-intrusive feedback
  }),

  /**
   * Fail reaction - Incorrect answer
   * Gentle, encouraging feedback (not punishing)
   * Shortest duration to minimize negative experience
   */
  fail: Object.freeze({
    color: 'slate',
    animation: 'gentle_droop',
    duration: 1200,
    particles: null, // No particles for sympathetic response
    sound: null, // No sound to avoid discouragement
    message: 'Keep learning! Your tree believes in you!',
  }),
})

/**
 * Particle configuration for different effect types.
 * Defines count, colors, and animation speed for each particle system.
 */
export const PARTICLE_CONFIGS = Object.freeze({
  /**
   * Leaves - Used for pass reactions
   * Green-ish nature theme, moderate count
   */
  leaves: Object.freeze({
    count: 12,
    colors: ['#22C55E', '#16A34A', '#15803D', '#14532D'], // Emerald/green shades
    speed: 1.5,
  }),

  /**
   * Sparkles - Used for perfect reactions
   * Gold/yellow celebration theme, more particles
   */
  sparkles: Object.freeze({
    count: 20,
    colors: ['#F59E0B', '#FBBF24', '#FCD34D', '#FEF3C7'], // Amber/gold shades
    speed: 2.0,
  }),

  /**
   * Fireworks - Used for boss_victory reactions
   * Multi-color celebration, maximum particles
   */
  fireworks: Object.freeze({
    count: 30,
    colors: ['#8B5CF6', '#A855F7', '#C084FC', '#E879F9', '#F472B6', '#FB7185'], // Purple + pink variety
    speed: 2.5,
  }),

  /**
   * Streaks - Used for streak reactions
   * Cyan theme, minimal count for quick feedback
   */
  streaks: Object.freeze({
    count: 8,
    colors: ['#06B6D4', '#22D3EE', '#67E8F9'], // Cyan shades
    speed: 3.0, // Faster for streak feel
  }),
})

/**
 * Gets the reaction configuration for a given type.
 *
 * Falls back to pass reaction for invalid or missing types.
 * This ensures the tree always has a valid reaction to display.
 *
 * @param {string} type - The reaction type ('pass' | 'perfect' | 'boss_victory' | 'streak' | 'fail')
 * @returns {Object} Reaction configuration object
 */
export function getReactionConfig(type) {
  // Validate input is a string and exists in TREE_REACTIONS
  if (typeof type === 'string' && TREE_REACTIONS[type]) {
    return TREE_REACTIONS[type]
  }

  // Fallback to pass for invalid inputs (null, undefined, unknown types, wrong case)
  return TREE_REACTIONS.pass
}
