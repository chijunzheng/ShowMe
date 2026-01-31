/**
 * useQuizRecommendations - Smart recommendation engine for Quiz tab
 *
 * Analyzes world pieces and returns prioritized recommendations based on:
 * - Spaced repetition (days since last review)
 * - Weakness (low review scores)
 * - Evolution opportunities (pieces near tier threshold)
 */
import { useMemo } from 'react'

/**
 * Calculate days since a piece was last reviewed
 * @param {Object} piece - World piece object
 * @returns {number} Days since last review
 */
function daysSinceReview(piece) {
  const reviewDate = piece.lastReviewedAt || piece.unlockedAt
  if (!reviewDate) return 999 // Treat as very old if no date
  return Math.floor((Date.now() - new Date(reviewDate).getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Check if piece is near evolution threshold
 * @param {Object} piece - World piece object
 * @returns {boolean} True if near evolution
 */
function isNearEvolution(piece) {
  const relatedCount = piece.relatedTopics?.length || 0
  const tier = piece.evolutionTier || 'seedling'

  // Thresholds: seedling->growing (3), growing->flourishing (5), flourishing->legendary (10)
  if (tier === 'seedling' && relatedCount >= 2) return true
  if (tier === 'growing' && relatedCount >= 4) return true
  if (tier === 'flourishing' && relatedCount >= 8) return true
  return false
}

/**
 * Calculate recommendation priority score (0-100)
 * Higher score = higher priority for review
 * @param {Object} piece - World piece object
 * @returns {number} Priority score
 */
export function calculateRecommendationScore(piece) {
  let score = 0
  const days = daysSinceReview(piece)

  // 1. URGENCY: Days since review (max 40 points)
  if (days > 30) score += 40
  else if (days > 14) score += 30
  else if (days > 7) score += 20
  else if (days > 3) score += 10

  // 2. WEAKNESS: Low review scores (max 30 points)
  const reviewScore = piece.lastReviewScore
  if (reviewScore !== undefined) {
    if (reviewScore < 60) score += 30
    else if (reviewScore < 70) score += 20
    else if (reviewScore < 80) score += 10
  }

  // 3. GROWTH OPPORTUNITY: Near evolution (max 20 points)
  if (isNearEvolution(piece)) score += 20

  // 4. REVIEW COUNT: Less reviewed pieces get priority (max 10 points)
  const reviewCount = piece.reviewCount || 0
  if (reviewCount === 0) score += 10
  else if (reviewCount < 3) score += 5

  // 5. FRESHNESS PENALTY: Recently reviewed (negative)
  if (days < 2) score -= 50 // Hide very recently reviewed
  if (days < 1) score -= 100 // Hide reviewed today

  return Math.max(0, Math.min(100, score))
}

/**
 * useQuizRecommendations hook
 * @param {Array} worldPieces - Array of world pieces
 * @returns {Object} Categorized recommendations and metadata
 */
export function useQuizRecommendations(worldPieces = []) {
  const recommendations = useMemo(() => {
    if (!worldPieces || worldPieces.length === 0) {
      return {
        readyForReview: [],
        weakSpots: [],
        levelUpSoon: [],
        allSorted: [],
      }
    }

    // Calculate scores for all pieces
    const scoredPieces = worldPieces.map(piece => ({
      ...piece,
      recommendationScore: calculateRecommendationScore(piece),
      daysSinceReview: daysSinceReview(piece),
    }))

    // Sort by score (highest first)
    const allSorted = [...scoredPieces].sort((a, b) =>
      b.recommendationScore - a.recommendationScore
    )

    // Ready for Review: pieces older than 7 days, sorted by oldest first
    const readyForReview = scoredPieces
      .filter(p => p.daysSinceReview > 7)
      .sort((a, b) => b.daysSinceReview - a.daysSinceReview)
      .slice(0, 5)

    // Weak Spots: pieces with low scores
    const weakSpots = scoredPieces
      .filter(p => p.lastReviewScore !== undefined && p.lastReviewScore < 70)
      .sort((a, b) => (a.lastReviewScore || 0) - (b.lastReviewScore || 0))
      .slice(0, 3)

    // Level Up Soon: pieces near evolution threshold
    const levelUpSoon = scoredPieces
      .filter(p => isNearEvolution(p))
      .slice(0, 3)

    return {
      readyForReview,
      weakSpots,
      levelUpSoon,
      allSorted,
    }
  }, [worldPieces])

  // Summary stats
  const stats = useMemo(() => ({
    totalPieces: worldPieces.length,
    needingReview: recommendations.readyForReview.length,
    weakCount: recommendations.weakSpots.length,
    isEmpty: worldPieces.length === 0,
  }), [worldPieces, recommendations])

  return {
    recommendations,
    stats,
    calculateRecommendationScore,
  }
}

export default useQuizRecommendations
