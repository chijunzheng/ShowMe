/**
 * Game Configuration
 *
 * Defines missions and power-ups for the gamification system.
 */

export const MISSIONS = {
  daily: [
    {
      id: 'daily_3_quizzes',
      title: 'Quiz Champion',
      description: 'Complete 3 missions today',
      target: 3,
      reward: { xp: 50 },
    },
    {
      id: 'daily_streak_5',
      title: 'Streak Master',
      description: 'Get a 5-answer streak',
      target: 5,
      reward: { xp: 30 },
    },
    {
      id: 'daily_perfect',
      title: 'Perfectionist',
      description: 'Get 100% on any mission',
      target: 1,
      reward: { xp: 75 },
    },
  ],
  weekly: [
    {
      id: 'weekly_topics_5',
      title: 'Explorer',
      description: 'Learn about 5 different topics',
      target: 5,
      reward: { xp: 200 },
    },
  ],
}

export const POWER_UPS = {
  extra_time: {
    id: 'extra_time',
    name: 'Extra Time',
    description: '+30 seconds',
    icon: '\u23F1\uFE0F',
    effect: { type: 'time_bonus', value: 30 },
  },
  skip_question: {
    id: 'skip_question',
    name: 'Skip',
    description: 'Skip one challenge',
    icon: '\u23ED\uFE0F',
    effect: { type: 'skip', value: 1 },
  },
  hint: {
    id: 'hint',
    name: 'Hint',
    description: 'Reveal one wrong answer',
    icon: '\uD83D\uDCA1',
    effect: { type: 'hint', value: 1 },
  },
}

/**
 * Quick Wins Configuration
 *
 * Configuration for Phase 6 engagement features:
 * - Dramatic pause for suspense before answer reveal
 * - Streak flames for celebrating answer streaks
 * - Contextual feedback based on quiz difficulty level
 */
export const QUICK_WINS = {
  /**
   * Dramatic pause configuration for suspense before answer reveal.
   */
  dramaticPause: {
    duration: 800,
    showSuspenseText: true,
    soundEnabled: true,
  },

  /**
   * Streak milestones that trigger flame celebrations.
   * Each milestone shows progressively more intense flames.
   */
  streakMilestones: [3, 5, 7, 10],

  /**
   * Flame intensity mapping for each streak milestone.
   * Higher streaks = more intense visual effect.
   */
  flameIntensity: {
    3: 'low',
    5: 'medium',
    7: 'high',
    10: 'inferno',
  },

  /**
   * Contextual feedback configuration per difficulty level.
   * Celebration intensity increases with difficulty.
   */
  contextualFeedback: {
    simple: {
      celebrationIntensity: 'low',
    },
    standard: {
      celebrationIntensity: 'medium',
    },
    deep: {
      celebrationIntensity: 'high',
    },
  },
}
