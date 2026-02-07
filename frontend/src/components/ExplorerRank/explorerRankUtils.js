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
    minXP: 0,
    description: 'Begin your cosmic journey',
  },
  {
    level: 2,
    id: 'cadet',
    title: 'Space Cadet',
    icon: '\uD83D\uDE80', // rocket
    minTopics: 3,
    minXP: 150,
    description: 'Ready for launch!',
  },
  {
    level: 3,
    id: 'navigator',
    title: 'Navigator',
    icon: '\uD83E\uDDED', // compass
    minTopics: 8,
    minXP: 350,
    description: 'Charting new courses',
  },
  {
    level: 4,
    id: 'explorer',
    title: 'Explorer',
    icon: '\uD83C\uDF0C', // milky way
    minTopics: 15,
    minXP: 600,
    description: 'Venturing into the unknown',
  },
  {
    level: 5,
    id: 'voyager',
    title: 'Voyager',
    icon: '\uD83D\uDEF8', // flying saucer
    minTopics: 25,
    minXP: 900,
    description: 'Traveling between stars',
  },
  {
    level: 6,
    id: 'astronaut',
    title: 'Astronaut',
    icon: '\uD83E\uDDD1\u200D\uD83D\uDE80', // astronaut
    minTopics: 38,
    minXP: 1300,
    description: 'Master of the cosmos',
  },
  {
    level: 7,
    id: 'pioneer',
    title: 'Pioneer',
    icon: '\u2B50', // star
    minTopics: 52,
    minXP: 1800,
    description: 'Legendary space pioneer',
  },
  {
    level: 8,
    id: 'captain',
    title: 'Star Captain',
    icon: '\uD83D\uDEF0\uFE0F', // satellite
    minTopics: 68,
    minXP: 2500,
    description: 'Leading missions across the stars',
  },
  {
    level: 9,
    id: 'sage',
    title: 'Celestial Sage',
    icon: '\uD83C\uDF20', // shooting star
    minTopics: 84,
    minXP: 3400,
    description: 'Wisdom among constellations',
  },
  {
    level: 10,
    id: 'cosmic',
    title: 'Cosmic Pioneer',
    icon: '\uD83E\uDE90', // ringed planet
    minTopics: 100,
    minXP: 4600,
    description: 'Opening new cosmic frontiers',
  },
  {
    level: 11,
    id: 'legend',
    title: 'Galactic Legend',
    icon: '\uD83C\uDF0C', // milky way
    minTopics: 110,
    minXP: 6200,
    description: 'A legendary force of discovery',
  },
  {
    level: 12,
    id: 'luminary',
    title: 'Legendary Luminary',
    icon: '\u2600\uFE0F', // sun
    minTopics: 120,
    minXP: 9000,
    description: 'A beacon of knowledge',
  },
]

export const MAX_RANK_LEVEL = EXPLORER_RANKS[EXPLORER_RANKS.length - 1].level

/**
 * Get rank info for a given topic count
 *
 * @param {number} topicCount - Number of topics learned
 * @returns {Object} Current rank with additional computed fields
 */
export function getExplorerRank(topicCount, totalXP = 0) {
  // Handle edge cases
  let count = topicCount
  let xp = totalXP

  // Handle string input by parsing
  if (typeof count === 'string') {
    count = parseFloat(count)
  }

  // Handle invalid values (null, undefined, NaN, non-numeric)
  if (count === null || count === undefined || Number.isNaN(count)) {
    count = 0
  }
  if (xp === null || xp === undefined || Number.isNaN(xp)) {
    xp = 0
  }

  // Floor the value for floating point numbers
  count = Math.floor(count)
  xp = Math.floor(xp)

  // Handle negative numbers
  if (count < 0) {
    count = 0
  }

  let currentRank = EXPLORER_RANKS[0]
  let nextRank = EXPLORER_RANKS[1] || null

  // Find the highest rank the user has achieved
  for (let i = EXPLORER_RANKS.length - 1; i >= 0; i--) {
    const rank = EXPLORER_RANKS[i]
    if (count >= rank.minTopics && xp >= rank.minXP) {
      currentRank = rank
      nextRank = EXPLORER_RANKS[i + 1] || null
      break
    }
  }

  return {
    ...currentRank,
    topicsToNextRank: nextRank ? Math.max(0, nextRank.minTopics - count) : 0,
    xpToNextRank: nextRank ? Math.max(0, nextRank.minXP - xp) : 0,
    nextRank,
  }
}

/**
 * Get rank info based on topics only (ignores XP gating)
 *
 * @param {number} topicCount - Number of topics learned
 * @returns {Object} Current rank with progress info (topics-only)
 */
export function getExplorerRankByTopics(topicCount) {
  let count = topicCount

  if (typeof count === 'string') {
    count = parseFloat(count)
  }

  if (count === null || count === undefined || Number.isNaN(count)) {
    count = 0
  }

  count = Math.floor(count)
  if (count < 0) {
    count = 0
  }

  let currentRank = EXPLORER_RANKS[0]
  let nextRank = EXPLORER_RANKS[1] || null

  for (let i = EXPLORER_RANKS.length - 1; i >= 0; i--) {
    const rank = EXPLORER_RANKS[i]
    if (count >= rank.minTopics) {
      currentRank = rank
      nextRank = EXPLORER_RANKS[i + 1] || null
      break
    }
  }

  return {
    ...currentRank,
    topicsToNextRank: nextRank ? Math.max(0, nextRank.minTopics - count) : 0,
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
export function checkRankUp(oldTopicCount, newTopicCount, oldXP = 0, newXP = 0) {
  const oldRank = getExplorerRank(oldTopicCount, oldXP)
  const newRank = getExplorerRank(newTopicCount, newXP)

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
export function getRankProgress(topicCount, totalXP = 0) {
  const rank = getExplorerRank(topicCount, totalXP)

  // Max rank reached
  if (!rank.nextRank) {
    return 100
  }

  const currentTopicsMin = rank.minTopics
  const nextTopicsMin = rank.nextRank.minTopics
  const topicsRange = Math.max(1, nextTopicsMin - currentTopicsMin)
  const topicsProgress = Math.min(1, Math.max(0, (topicCount - currentTopicsMin) / topicsRange))

  const currentXpMin = rank.minXP
  const nextXpMin = rank.nextRank.minXP
  const xpRange = Math.max(1, nextXpMin - currentXpMin)
  const xpProgress = Math.min(1, Math.max(0, (totalXP - currentXpMin) / xpRange))

  const combinedProgress = Math.min(topicsProgress, xpProgress)

  return Math.min(100, Math.round(combinedProgress * 100))
}

/**
 * Get progress percentage toward next rank using topics only
 *
 * @param {number} topicCount - Current topic count
 * @returns {number} 0-100 percentage toward next rank
 */
export function getRankProgressByTopics(topicCount) {
  const rank = getExplorerRankByTopics(topicCount)

  if (!rank.nextRank) {
    return 100
  }

  const currentTopicsMin = rank.minTopics
  const nextTopicsMin = rank.nextRank.minTopics
  const topicsRange = Math.max(1, nextTopicsMin - currentTopicsMin)
  const topicsProgress = Math.min(1, Math.max(0, (topicCount - currentTopicsMin) / topicsRange))

  return Math.min(100, Math.round(topicsProgress * 100))
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
    8: { primary: '#14B8A6', secondary: '#2DD4BF', glow: '#14B8A6' }, // Teal - Star Captain
    9: { primary: '#6366F1', secondary: '#818CF8', glow: '#6366F1' }, // Indigo - Celestial Sage
    10: { primary: '#F97316', secondary: '#FDBA74', glow: '#F97316' }, // Orange - Cosmic Pioneer
    11: { primary: '#A855F7', secondary: '#C084FC', glow: '#A855F7' }, // Violet - Galactic Legend
    12: { primary: '#FACC15', secondary: '#FDE68A', glow: '#FACC15' }, // Gold - Legendary Luminary
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
    8: {
      bg: 'bg-teal-100 dark:bg-teal-900/30',
      text: 'text-teal-600 dark:text-teal-300',
      border: 'border-teal-300 dark:border-teal-600',
      gradient: 'from-teal-400 to-cyan-600',
    },
    9: {
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      text: 'text-indigo-600 dark:text-indigo-300',
      border: 'border-indigo-300 dark:border-indigo-600',
      gradient: 'from-indigo-400 to-violet-600',
    },
    10: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-600',
      gradient: 'from-orange-400 to-amber-600',
    },
    11: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-300',
      border: 'border-purple-300 dark:border-purple-600',
      gradient: 'from-purple-400 to-fuchsia-600',
    },
    12: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-600 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-600',
      gradient: 'from-yellow-400 to-amber-500',
    },
  }

  return colorMap[level] || colorMap[1]
}
