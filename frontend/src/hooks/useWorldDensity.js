/**
 * useWorldDensity Hook
 *
 * Analyzes pieces by zone and returns density classifications, visible pieces,
 * stats, and indicators for overflow.
 *
 * Density Thresholds:
 * - Sparse: < 8 pieces per zone
 * - Moderate: 8-15 pieces per zone
 * - Dense: 16-25 pieces per zone
 * - Crowded: 26+ pieces per zone
 *
 * Freshness States:
 * - Fresh: 0-7 days since last review
 * - Fading: 8-14 days since last review
 * - Sleepy: 15+ days since last review
 */

import { useMemo } from 'react'

/**
 * Density threshold constants
 */
export const DENSITY_THRESHOLDS = {
  SPARSE_MAX: 7,
  MODERATE_MAX: 15,
  DENSE_MAX: 25,
}

/**
 * Freshness threshold constants (days)
 */
const FRESHNESS_THRESHOLDS = {
  FRESH: 7,
  FADING: 14,
}

/**
 * Maximum visible pieces per density mode
 */
const MAX_VISIBLE = {
  sparse: Infinity,
  moderate: 12,
  dense: 10,
  crowded: 12,
}

/**
 * Valid zone names
 */
const ZONES = ['nature', 'civilization', 'arcane']

/**
 * Calculate days since a piece was last reviewed
 *
 * @param {Object} piece - The piece object
 * @returns {number} Days since review (0 if no date available)
 */
function getDaysSinceReview(piece) {
  if (!piece) return 0

  const dateStr = piece.lastReviewedAt || piece.unlockedAt
  if (!dateStr) return 0

  const reviewDate = new Date(dateStr)
  if (isNaN(reviewDate.getTime())) return 0

  const now = new Date()
  const diffMs = now.getTime() - reviewDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Calculate freshness category for a piece
 *
 * @param {Object} piece - The piece object
 * @returns {string} 'fresh' | 'fading' | 'sleepy'
 */
export function calculateFreshness(piece) {
  const days = getDaysSinceReview(piece)

  if (days <= FRESHNESS_THRESHOLDS.FRESH) {
    return 'fresh'
  }
  if (days <= FRESHNESS_THRESHOLDS.FADING) {
    return 'fading'
  }
  return 'sleepy'
}

/**
 * Group pieces by topic similarity using common word detection
 * Returns an array of piece arrays, where similar pieces are grouped together
 *
 * @param {Array} pieces - Array of pieces to group
 * @returns {Array} Array of pieces (potentially with some combined as representatives)
 */
export function groupByTopicSimilarity(pieces) {
  if (!Array.isArray(pieces) || pieces.length === 0) {
    return []
  }

  if (pieces.length === 1) {
    return pieces
  }

  // Extract significant words from topic name
  const extractWords = (name) => {
    if (!name) return []
    return name
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3) // Only significant words
  }

  // Create clusters based on shared significant words
  const clusters = []
  const used = new Set()

  for (let i = 0; i < pieces.length; i++) {
    if (used.has(i)) continue

    const piece = pieces[i]
    const words = extractWords(piece.name)
    const cluster = [piece]
    used.add(i)

    // Find pieces with overlapping words
    for (let j = i + 1; j < pieces.length; j++) {
      if (used.has(j)) continue

      const otherPiece = pieces[j]
      const otherWords = extractWords(otherPiece.name)

      // Check for common significant words
      const hasCommon = words.some((w) => otherWords.includes(w))

      if (hasCommon) {
        cluster.push(otherPiece)
        used.add(j)
      }
    }

    clusters.push(cluster)
  }

  // For moderate density, return representative pieces from each cluster
  // preferring the first (or most recently reviewed) piece from each cluster
  return clusters.map((cluster) => cluster[0])
}

/**
 * Smart sampling that prioritizes based on evolution tier and freshness
 * Prioritizes: sleepy > fading > fresh (for review urgency)
 * Also maintains tier diversity
 *
 * @param {Array} pieces - Array of pieces to sample
 * @param {number} maxPieces - Maximum number of pieces to return
 * @returns {Array} Sampled pieces
 */
export function smartSamplePieces(pieces, maxPieces) {
  if (!Array.isArray(pieces) || pieces.length === 0) {
    return []
  }

  if (pieces.length <= maxPieces) {
    return pieces
  }

  // Define tier priority (higher = more important to include)
  const tierPriority = {
    legendary: 4,
    flourishing: 3,
    growing: 2,
    seedling: 1,
  }

  // Calculate a score for each piece based on tier and freshness
  const scoredPieces = pieces.map((piece) => {
    const tierScore = tierPriority[piece.evolutionTier] || 1
    const freshness = calculateFreshness(piece)

    // Fresh pieces get higher priority (we want to show recent progress)
    let freshnessScore
    if (freshness === 'fresh') {
      freshnessScore = 3
    } else if (freshness === 'fading') {
      freshnessScore = 2
    } else {
      freshnessScore = 1
    }

    return {
      piece,
      score: tierScore * 2 + freshnessScore,
      tier: piece.evolutionTier || 'seedling',
      freshness,
    }
  })

  // Sort by score (highest first)
  scoredPieces.sort((a, b) => b.score - a.score)

  // Select pieces ensuring tier diversity if possible
  const selected = []
  const tierCounts = {}

  // First pass: ensure we get at least one of each tier if available
  const tierOrder = ['legendary', 'flourishing', 'growing', 'seedling']
  for (const tier of tierOrder) {
    const pieceOfTier = scoredPieces.find(
      (sp) => sp.tier === tier && !selected.includes(sp)
    )
    if (pieceOfTier && selected.length < maxPieces) {
      selected.push(pieceOfTier)
      tierCounts[tier] = (tierCounts[tier] || 0) + 1
    }
  }

  // Second pass: fill remaining slots with highest scored pieces
  for (const scored of scoredPieces) {
    if (selected.length >= maxPieces) break
    if (!selected.includes(scored)) {
      selected.push(scored)
    }
  }

  return selected.map((s) => s.piece)
}

/**
 * DensityManager utility class
 * Provides static methods for density calculations
 */
export const DensityManager = {
  /**
   * Get density level based on piece count
   *
   * @param {number} count - Number of pieces
   * @returns {string} 'sparse' | 'moderate' | 'dense' | 'crowded'
   */
  getDensityLevel(count) {
    const n = Math.floor(count ?? 0)
    if (n < 0 || n <= DENSITY_THRESHOLDS.SPARSE_MAX) return 'sparse'
    if (n <= DENSITY_THRESHOLDS.MODERATE_MAX) return 'moderate'
    if (n <= DENSITY_THRESHOLDS.DENSE_MAX) return 'dense'
    return 'crowded'
  },

  /**
   * Get visible pieces based on density mode
   *
   * @param {Array} pieces - All pieces in a zone
   * @param {string} density - Density level
   * @returns {Array} Visible pieces
   */
  getVisiblePieces(pieces, density) {
    if (!Array.isArray(pieces) || pieces.length === 0) {
      return []
    }

    switch (density) {
      case 'sparse':
        // Show all pieces
        return pieces

      case 'moderate':
        // Apply topic grouping
        return groupByTopicSimilarity(pieces)

      case 'dense':
        // Use smart sampling with limit
        return smartSamplePieces(pieces, MAX_VISIBLE.dense)

      case 'crowded':
        // Use smart sampling with tighter limit
        return smartSamplePieces(pieces, MAX_VISIBLE.crowded)

      default:
        return pieces
    }
  },

  /**
   * Group pieces by zone
   *
   * @param {Array} pieces - All pieces
   * @returns {Object} Pieces grouped by zone { nature: [], civilization: [], arcane: [] }
   */
  groupPiecesByZone(pieces) {
    const grouped = {
      nature: [],
      civilization: [],
      arcane: [],
    }

    if (!Array.isArray(pieces)) {
      return grouped
    }

    for (const piece of pieces) {
      const zone = piece?.zone
      if (zone && grouped[zone]) {
        grouped[zone].push(piece)
      }
    }

    return grouped
  },
}

/**
 * useWorldDensity Hook
 *
 * Analyzes pieces and returns density-aware display data for each zone.
 *
 * @param {Array} pieces - Array of piece objects
 * @returns {Object} Density analysis result
 */
export default function useWorldDensity(pieces) {
  const result = useMemo(() => {
    // Handle null/undefined input
    const safePieces = Array.isArray(pieces) ? pieces : []

    // Group pieces by zone
    const piecesByZone = DensityManager.groupPiecesByZone(safePieces)

    // Calculate density per zone
    const zoneDensities = {}
    const visiblePieces = {}
    const showMoreIndicator = {}

    for (const zone of ZONES) {
      const zonePieces = piecesByZone[zone]
      const count = zonePieces.length
      const density = DensityManager.getDensityLevel(count)

      zoneDensities[zone] = density
      visiblePieces[zone] = DensityManager.getVisiblePieces(zonePieces, density)
      showMoreIndicator[zone] = visiblePieces[zone].length < count
    }

    // Calculate freshness stats across all pieces
    let freshCount = 0
    let fadingCount = 0
    let sleepyCount = 0

    for (const piece of safePieces) {
      const freshness = calculateFreshness(piece)
      if (freshness === 'fresh') {
        freshCount++
      } else if (freshness === 'fading') {
        fadingCount++
      } else {
        sleepyCount++
      }
    }

    return {
      zoneDensities,
      visiblePieces,
      stats: {
        total: safePieces.length,
        freshCount,
        fadingCount,
        sleepyCount,
      },
      showMoreIndicator,
    }
  }, [pieces])

  return result
}
