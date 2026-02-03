/**
 * Comeback Config - Comeback System Configuration
 *
 * Defines trigger conditions, challenge parameters, timing, rewards,
 * and utility functions for the Comeback System gamification feature.
 * Comeback offers a second chance to users who narrowly fail a quiz.
 *
 * Trigger Conditions:
 * - Score must be within marginPercent of pass threshold
 * - Only one attempt per quiz allowed
 *
 * Challenge Rules:
 * - 3 quick questions with 15 seconds each
 * - Need 2/3 correct to pass
 * - Early termination: 2 correct = immediate success, 2 wrong = immediate failure
 *
 * Rewards (reduced from normal pass):
 * - 70% of base XP
 * - Bronze mystery box tier
 * - Still grants piece unlock
 */

/**
 * Comeback system configuration.
 * All values are frozen for immutability.
 */
export const COMEBACK_CONFIG = Object.freeze({
  /**
   * Trigger conditions for comeback offer
   */
  trigger: Object.freeze({
    enabled: true,
    marginPercent: 10, // Score must be within 10% of pass threshold
    maxAttemptsPerQuiz: 1, // Only one comeback attempt allowed
  }),

  /**
   * Challenge parameters
   */
  challenge: Object.freeze({
    questionCount: 3, // Number of questions in comeback challenge
    timePerQuestion: 15, // Seconds per question
    requiredCorrect: 2, // Need 2/3 to pass
  }),

  /**
   * Timing configuration (milliseconds)
   */
  timing: Object.freeze({
    offerDelay: 0, // Delay before showing offer modal
    questionTransition: 300, // Transition time between questions
    resultDelay: 500, // Delay before showing result
    celebrationDuration: 3000, // Success celebration duration
    failMessageDuration: 2000, // Failure message duration
  }),

  /**
   * Reward configuration (reduced from normal pass)
   */
  rewards: Object.freeze({
    xpMultiplier: 0.7, // 70% of base XP
    mysteryBoxTier: 'bronze', // Bronze tier mystery box
    grantsPiece: true, // Still unlocks a piece
  }),

  /**
   * Level-specific visual styles
   */
  styles: Object.freeze({
    simple: Object.freeze({
      icon: '\u{26A1}', // Lightning bolt
      title: 'Quick Comeback',
      bgGradient: 'from-emerald-500/95 to-green-600/95',
      borderColor: 'border-emerald-400',
      glowColor: 'shadow-emerald-500/50',
    }),
    standard: Object.freeze({
      icon: '\u{1F525}', // Fire
      title: 'Lightning Round',
      bgGradient: 'from-cyan-500/95 to-blue-600/95',
      borderColor: 'border-cyan-400',
      glowColor: 'shadow-cyan-500/50',
    }),
    deep: Object.freeze({
      icon: '\u{1F31F}', // Glowing star
      title: 'Epic Comeback',
      bgGradient: 'from-violet-500/95 to-purple-600/95',
      borderColor: 'border-violet-400',
      glowColor: 'shadow-violet-500/50',
    }),
  }),

  /**
   * Message configurations
   */
  messages: Object.freeze({
    offer: Object.freeze({
      title: 'Second Chance!',
      subtitle: 'You were so close! Try a quick lightning round to pass.',
      acceptLabel: "Let's Go!",
      declineLabel: 'No Thanks',
    }),
    success: Object.freeze([
      'Comeback Complete!',
      'You Did It!',
      'Amazing Recovery!',
      'Never Give Up!',
      'What a Turnaround!',
    ]),
    failure: Object.freeze([
      'Nice Try!',
      'Great Effort!',
      'Keep Practicing!',
      "You'll Get It Next Time!",
      'Almost There!',
    ]),
  }),
})

/**
 * Gets the style configuration for a given difficulty level.
 *
 * @param {string} level - The difficulty level ('simple', 'standard', 'deep')
 * @returns {Object} Style configuration object
 */
export function getStyleForLevel(level) {
  if (!level || typeof level !== 'string' || !COMEBACK_CONFIG.styles[level]) {
    return COMEBACK_CONFIG.styles.simple
  }
  return COMEBACK_CONFIG.styles[level]
}

/**
 * Checks if a score is eligible for a comeback attempt.
 * Score must be below pass threshold but within the margin range.
 *
 * @param {number} score - The user's quiz score (percentage)
 * @param {number} passThreshold - The passing threshold (percentage)
 * @param {number} [marginPercent] - The margin below threshold that qualifies
 * @returns {boolean} True if eligible for comeback
 */
export function checkComebackEligibility(score, passThreshold, marginPercent) {
  // Handle invalid inputs
  if (score === undefined || score === null || typeof score !== 'number') {
    return false
  }
  if (passThreshold === undefined || passThreshold === null || typeof passThreshold !== 'number') {
    return false
  }

  // Use default margin if not provided
  const margin = typeof marginPercent === 'number' ? marginPercent : COMEBACK_CONFIG.trigger.marginPercent

  // Zero or negative margin means no eligibility window
  if (margin <= 0) {
    return false
  }

  // Must be below threshold (if at or above, they passed)
  if (score >= passThreshold) {
    return false
  }

  // Calculate the lower bound of the eligibility window
  const lowerBound = passThreshold - margin

  // Score must be at or above the lower bound
  return score >= lowerBound
}

/**
 * Calculates comeback rewards based on base XP.
 *
 * @param {number} baseXp - The base XP that would have been earned
 * @returns {Object} Rewards object with xp, tier, and grantsPiece
 */
export function calculateComebackRewards(baseXp) {
  // Handle invalid inputs
  const validXp = typeof baseXp === 'number' && baseXp > 0 ? baseXp : 0

  const xp = Math.round(validXp * COMEBACK_CONFIG.rewards.xpMultiplier)

  return {
    xp,
    tier: COMEBACK_CONFIG.rewards.mysteryBoxTier,
    grantsPiece: COMEBACK_CONFIG.rewards.grantsPiece,
  }
}
