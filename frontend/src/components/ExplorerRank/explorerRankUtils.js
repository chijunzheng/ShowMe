/**
 * Explorer Rank Utility Functions
 *
 * Pure utility functions for calculating explorer rank and progression.
 * Replaces tree levels from MagicalTree with space exploration themed ranks.
 */

/**
 * Explorer rank definitions
 * Each rank has a minimum topic threshold and visual configuration
 */
export const EXPLORER_RANKS = [
  {
    level: 1,
    id: 'stargazer',
    title: 'Stargazer',
    icon: '\uD83D\uDD2D', // telescope
    minTopics: 0,
    description: 'Begin your cosmic journey',
  },
  {
    level: 2,
    id: 'cadet',
    title: 'Space Cadet',
    icon: '\uD83D\uDE80', // rocket
    minTopics: 3,
    description: 'Ready for launch!',
  },
  {
    level: 3,
    id: 'navigator',
    title: 'Navigator',
    icon: '\uD83E\uDDED', // compass
    minTopics: 8,
    description: 'Charting new courses',
  },
  {
    level: 4,
    id: 'explorer',
    title: 'Explorer',
    icon: '\uD83C\uDF0C', // milky way
    minTopics: 15,
    description: 'Venturing into the unknown',
  },
  {
    level: 5,
    id: 'voyager',
    title: 'Voyager',
    icon: '\uD83D\uDEF8', // flying saucer
    minTopics: 25,
    description: 'Traveling between stars',
  },
  {
    level: 6,
    id: 'astronaut',
    title: 'Astronaut',
    icon: '\uD83E\uDDD1\u200D\uD83D\uDE80', // astronaut
    minTopics: 40,
    description: 'Master of the cosmos',
  },
  {
    level: 7,
    id: 'pioneer',
    title: 'Pioneer',
    icon: '\u2B50', // star
    minTopics: 60,
    description: 'Legendary space pioneer',
  },
]

/**
 * Get rank info for a given topic count
 *
 * @param {number} topicCount - Number of topics learned
 * @returns {Object} Current rank with additional computed fields
 */
export function getExplorerRank(topicCount) {
  // Handle edge cases
  let count = topicCount

  // Handle string input by parsing
  if (typeof count === 'string') {
    count = parseFloat(count)
  }

  // Handle invalid values (null, undefined, NaN, non-numeric)
  if (count === null || count === undefined || Number.isNaN(count)) {
    count = 0
  }

  // Floor the value for floating point numbers
  count = Math.floor(count)

  // Handle negative numbers
  if (count < 0) {
    count = 0
  }

  let currentRank = EXPLORER_RANKS[0]
  let nextRank = EXPLORER_RANKS[1] || null

  // Find the highest rank the user has achieved
  for (let i = EXPLORER_RANKS.length - 1; i >= 0; i--) {
    if (count >= EXPLORER_RANKS[i].minTopics) {
      currentRank = EXPLORER_RANKS[i]
      nextRank = EXPLORER_RANKS[i + 1] || null
      break
    }
  }

  return {
    ...currentRank,
    topicsToNextRank: nextRank ? nextRank.minTopics - count : 0,
    nextRank,
  }
}

/**
 * Check if a rank up occurred
 *
 * @param {number} oldTopicCount - Previous topic count
 * @param {number} newTopicCount - New topic count
 * @returns {Object} Result with rankUp flag and rank info if promotion occurred
 */
export function checkRankUp(oldTopicCount, newTopicCount) {
  const oldRank = getExplorerRank(oldTopicCount)
  const newRank = getExplorerRank(newTopicCount)

  if (newRank.level > oldRank.level) {
    return {
      rankUp: true,
      newRank,
      previousRank: oldRank,
    }
  }

  return { rankUp: false }
}

/**
 * Get progress percentage toward next rank
 *
 * @param {number} topicCount - Current topic count
 * @returns {number} 0-100 percentage toward next rank
 */
export function getRankProgress(topicCount) {
  const rank = getExplorerRank(topicCount)

  // Max rank reached
  if (!rank.nextRank) {
    return 100
  }

  const currentMin = rank.minTopics
  const nextMin = rank.nextRank.minTopics
  const range = nextMin - currentMin
  const progress = topicCount - currentMin

  return Math.min(100, Math.round((progress / range) * 100))
}

/**
 * Get rank color theme for visual styling
 *
 * @param {number} level - Rank level (1-7)
 * @returns {Object} Color configuration with primary, secondary, and glow colors
 */
export function getRankColors(level) {
  const colors = {
    1: { primary: '#6B7280', secondary: '#9CA3AF', glow: '#6B7280' }, // Gray - Stargazer
    2: { primary: '#3B82F6', secondary: '#60A5FA', glow: '#3B82F6' }, // Blue - Space Cadet
    3: { primary: '#10B981', secondary: '#34D399', glow: '#10B981' }, // Green - Navigator
    4: { primary: '#F59E0B', secondary: '#FBBF24', glow: '#F59E0B' }, // Amber - Explorer
    5: { primary: '#8B5CF6', secondary: '#A78BFA', glow: '#8B5CF6' }, // Purple - Voyager
    6: { primary: '#EC4899', secondary: '#F472B6', glow: '#EC4899' }, // Pink - Astronaut
    7: { primary: '#EF4444', secondary: '#F87171', glow: '#EF4444' }, // Red - Pioneer
  }

  return colors[level] || colors[1]
}

/**
 * Get Tailwind color classes for a rank level
 *
 * @param {number} level - Rank level (1-7)
 * @returns {Object} Tailwind class names for styling
 */
export function getRankTailwindColors(level) {
  const colorMap = {
    1: {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-300',
      border: 'border-slate-300 dark:border-slate-600',
      gradient: 'from-slate-400 to-slate-600',
    },
    2: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-600',
      gradient: 'from-blue-400 to-blue-600',
    },
    3: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-600 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-600',
      gradient: 'from-emerald-400 to-teal-600',
    },
    4: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-600 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-600',
      gradient: 'from-amber-400 to-orange-600',
    },
    5: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-300',
      border: 'border-purple-300 dark:border-purple-600',
      gradient: 'from-purple-400 to-indigo-600',
    },
    6: {
      bg: 'bg-pink-100 dark:bg-pink-900/30',
      text: 'text-pink-600 dark:text-pink-300',
      border: 'border-pink-300 dark:border-pink-600',
      gradient: 'from-pink-400 to-rose-600',
    },
    7: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-300',
      border: 'border-red-300 dark:border-red-600',
      gradient: 'from-red-400 to-rose-600',
    },
  }

  return colorMap[level] || colorMap[1]
}
