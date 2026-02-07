/**
 * ExplorerRank Component Exports
 *
 * Central export point for all ExplorerRank components and utilities.
 * Replaces tree levels from MagicalTree with space exploration themed ranks.
 */

export { default as ExplorerRankBadge } from './ExplorerRankBadge'
export { default as ExplorerRankProgress } from './ExplorerRankProgress'
export { default as RankUpCelebration } from './RankUpCelebration'
export {
  EXPLORER_RANKS,
  getExplorerRank,
  checkRankUp,
  getRankProgress,
  getRankColors,
  getRankTailwindColors,
} from './explorerRankUtils'
