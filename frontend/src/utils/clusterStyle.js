/**
 * Shared category style utilities for constellation and topic grouping.
 *
 * Provides deterministic icon/color styles for known and dynamic categories.
 */

export const CLUSTER_CONFIG = {
  mathematics: { icon: '\u{1F522}', color: '#3B82F6' },
  science: { icon: '\u{1F52C}', color: '#10B981' },
  history: { icon: '\u{1F4DC}', color: '#F59E0B' },
  geography: { icon: '\u{1F30D}', color: '#06B6D4' },
  language: { icon: '\u{1F4DA}', color: '#A855F7' },
  arts: { icon: '\u{1F3A8}', color: '#EC4899' },
  technology: { icon: '\u{1F4BB}', color: '#6366F1' },
  astronomy: { icon: '\u{1F30C}', color: '#2DD4BF' },
  nature: { icon: '\u{1F33F}', color: '#84CC16' },
  'marine biology': { icon: '\u{1F433}', color: '#0EA5E9' },
  civilization: { icon: '\u{1F3DB}\u{FE0F}', color: '#F97316' },
  general: { icon: '\u{1F4A1}', color: '#64748B' },
}

const DYNAMIC_COLOR_POOL = [
  '#F97316', '#D946EF', '#2DD4BF', '#84CC16', '#A855F7',
  '#FB923C', '#14B8A6', '#E879F9', '#FACC15', '#38BDF8',
]

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * Normalize category string to a stable key.
 *
 * @param {string} category
 * @returns {string}
 */
export function normalizeCategoryKey(category) {
  const normalized = String(category || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
  return normalized || 'general'
}

/**
 * Format category key for display labels.
 *
 * @param {string} category
 * @returns {string}
 */
export function formatCategoryLabel(category) {
  return normalizeCategoryKey(category)
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Resolve icon/color style for a category.
 * Unknown categories get deterministic dynamic colors.
 *
 * @param {string} category
 * @returns {{icon: string, color: string}}
 */
export function getClusterStyle(category) {
  const key = normalizeCategoryKey(category)
  if (CLUSTER_CONFIG[key]) {
    return CLUSTER_CONFIG[key]
  }
  return {
    icon: '\u{1F4CC}',
    color: DYNAMIC_COLOR_POOL[hashString(key) % DYNAMIC_COLOR_POOL.length],
  }
}
