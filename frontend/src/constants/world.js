/**
 * World Constants
 *
 * Shared constants for World, Tree, and Progress tab components.
 * Centralizes zone icons, tier configuration, and visual constants.
 */

/**
 * Zone icons for topic categories
 */
export const ZONE_ICONS = {
  nature: '🌿',
  civilization: '🏛️',
  arcane: '✨',
}

/**
 * World tier configuration with icons, labels, and colors
 */
export const TIER_CONFIG = {
  barren: {
    icon: '🏜️',
    label: 'Barren',
    color: 'stone',
    description: 'No topics yet',
  },
  sprouting: {
    icon: '🌱',
    label: 'Sprouting',
    color: 'emerald',
    description: '1-4 topics',
  },
  growing: {
    icon: '🌿',
    label: 'Growing',
    color: 'green',
    description: '5-9 topics',
  },
  thriving: {
    icon: '🌳',
    label: 'Thriving',
    color: 'teal',
    description: '10-19 topics',
  },
  legendary: {
    icon: '🌟',
    label: 'Legendary',
    color: 'purple',
    description: '20+ topics',
  },
}

/**
 * Get tier icon by tier name
 * @param {string} tier - Tier name
 * @returns {string} Emoji icon
 */
export function getTierIcon(tier) {
  return TIER_CONFIG[tier]?.icon || TIER_CONFIG.barren.icon
}

/**
 * Get tier label by tier name
 * @param {string} tier - Tier name
 * @returns {string} Display label
 */
export function getTierLabel(tier) {
  return TIER_CONFIG[tier]?.label || tier || 'Barren'
}

/**
 * View modes for world display
 */
export const VIEW_MODES = {
  cinematic: 'cinematic',
  explore: 'explore',
}

/**
 * Toast/notification duration in milliseconds
 */
export const TOAST_DURATION_MS = 5200

/**
 * Default highlight region for panorama
 */
export const DEFAULT_HIGHLIGHT = {
  x: 0.5,
  y: 0.55,
  radius: 150,
}

/**
 * Golden ratio for procedural positioning
 */
export const GOLDEN_RATIO = 0.618033988749895
