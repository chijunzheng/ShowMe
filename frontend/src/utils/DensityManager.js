/**
 * DensityManager Utility
 *
 * Handles piece density calculations, freshness tracking, and smart sampling
 * for world builder zones. Provides intelligent piece selection based on
 * review urgency and zone representation.
 *
 * Density modes:
 * - sparse: < 8 pieces (show all)
 * - moderate: 8-15 pieces (max 12 sampled)
 * - dense: 16-25 pieces (max 10 sampled)
 * - crowded: > 25 pieces (max 8 sampled)
 *
 * Freshness categories (based on days since last review):
 * - fresh: reviewed within 7 days
 * - fading: 7-14 days since review
 * - sleepy: 14+ days (urgent review needed)
 */

/**
 * Density mode constants
 */
export const DENSITY_MODES = Object.freeze({
  SPARSE: 'sparse',
  MODERATE: 'moderate',
  DENSE: 'dense',
  CROWDED: 'crowded',
})

/**
 * Freshness threshold constants (in days)
 */
export const FRESHNESS_THRESHOLDS = Object.freeze({
  FRESH: 7,
  FADING: 14,
})

/**
 * Maximum pieces to sample per density mode
 */
const MAX_SAMPLES = Object.freeze({
  [DENSITY_MODES.SPARSE]: Infinity,
  [DENSITY_MODES.MODERATE]: 12,
  [DENSITY_MODES.DENSE]: 10,
  [DENSITY_MODES.CROWDED]: 8,
})

/**
 * Target freshness distribution for sampling
 * Prioritizes balanced representation across freshness categories
 */
const FRESHNESS_TARGETS = Object.freeze({
  fresh: { min: 3, max: 5 },
  fading: { min: 3, max: 5 },
  sleepy: { min: 2, max: 3 },
})

/**
 * Determine the density mode based on piece count.
 *
 * @param {number} pieceCount - Number of pieces in a zone
 * @returns {string} Density mode: 'sparse', 'moderate', 'dense', or 'crowded'
 */
export function getDensityMode(pieceCount) {
  // Handle edge cases: null, undefined, NaN, negative numbers
  const count = Math.floor(Number(pieceCount) || 0)

  if (count < 0) {
    return DENSITY_MODES.SPARSE
  }

  if (count < 8) {
    return DENSITY_MODES.SPARSE
  }

  if (count <= 15) {
    return DENSITY_MODES.MODERATE
  }

  if (count <= 25) {
    return DENSITY_MODES.DENSE
  }

  return DENSITY_MODES.CROWDED
}

/**
 * Calculate the number of days since a piece was last reviewed.
 * Falls back to unlockedAt if lastReviewedAt is not available.
 * Returns 0 if no dates are available (treated as fresh).
 *
 * @param {Object|null|undefined} piece - Piece object with lastReviewedAt or unlockedAt
 * @returns {number} Days since last review (floored to integer)
 */
export function getDaysSinceReview(piece) {
  // Handle null/undefined piece
  if (!piece) {
    return 0
  }

  // Try lastReviewedAt first, then fall back to unlockedAt
  const dateStr = piece.lastReviewedAt || piece.unlockedAt

  if (!dateStr) {
    return 0
  }

  const reviewDate = new Date(dateStr)

  // Handle invalid date strings
  if (isNaN(reviewDate.getTime())) {
    return 0
  }

  const now = new Date()
  const diffMs = now.getTime() - reviewDate.getTime()

  // Handle future dates (return 0)
  if (diffMs < 0) {
    return 0
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Determine the freshness category based on days since review.
 *
 * @param {number} days - Days since last review
 * @returns {string} Freshness category: 'fresh', 'fading', or 'sleepy'
 */
export function getFreshnessCategory(days) {
  // Handle edge cases: null, undefined, NaN, negative numbers
  const dayCount = Number(days)

  if (isNaN(dayCount) || dayCount < 0) {
    return 'fresh'
  }

  if (dayCount < FRESHNESS_THRESHOLDS.FRESH) {
    return 'fresh'
  }

  if (dayCount < FRESHNESS_THRESHOLDS.FADING) {
    return 'fading'
  }

  return 'sleepy'
}

/**
 * Group pieces by their freshness category.
 * Does not mutate the input array.
 *
 * @param {Array} pieces - Array of piece objects
 * @returns {Object} Object with fresh, fading, and sleepy arrays
 */
function groupByFreshness(pieces) {
  const groups = {
    fresh: [],
    fading: [],
    sleepy: [],
  }

  for (const piece of pieces) {
    const days = getDaysSinceReview(piece)
    const category = getFreshnessCategory(days)
    groups[category].push(piece)
  }

  return groups
}

/**
 * Sample pieces from a category, respecting min/max targets.
 * Returns a new array without mutating the input.
 *
 * @param {Array} pieces - Pieces in a category
 * @param {number} min - Minimum pieces to take
 * @param {number} max - Maximum pieces to take
 * @param {number} remaining - Remaining budget
 * @returns {Array} Sampled pieces
 */
function sampleFromCategory(pieces, min, max, remaining) {
  if (pieces.length === 0 || remaining <= 0) {
    return []
  }

  // Take at least min, at most max, but respect remaining budget
  const takeCount = Math.min(pieces.length, max, Math.max(min, remaining))

  // Sort deterministically by id to ensure consistent results
  const sorted = [...pieces].sort((a, b) => {
    const idA = String(a.id || '')
    const idB = String(b.id || '')
    return idA.localeCompare(idB)
  })

  return sorted.slice(0, takeCount)
}

/**
 * Ensure zone representation in sampled pieces.
 * Tries to include at least one piece from each zone if possible.
 *
 * @param {Array} sampled - Currently sampled pieces
 * @param {Array} allPieces - All available pieces
 * @param {number} maxSamples - Maximum sample size
 * @returns {Array} Sampled pieces with zone representation
 */
function ensureZoneRepresentation(sampled, allPieces, maxSamples) {
  const sampledIds = new Set(sampled.map((p) => p.id))
  const sampledZones = new Set(sampled.map((p) => p.zone))

  // Find all unique zones
  const allZones = new Set(allPieces.map((p) => p.zone))

  // Find zones not yet represented
  const missingZones = [...allZones].filter((zone) => !sampledZones.has(zone))

  if (missingZones.length === 0 || sampled.length >= maxSamples) {
    return sampled
  }

  const result = [...sampled]

  for (const zone of missingZones) {
    if (result.length >= maxSamples) {
      break
    }

    // Find a piece from this zone that isn't already sampled
    const zoneRep = allPieces.find(
      (p) => p.zone === zone && !sampledIds.has(p.id)
    )

    if (zoneRep) {
      result.push(zoneRep)
      sampledIds.add(zoneRep.id)
    }
  }

  return result
}

/**
 * Calculate allocation for each freshness category based on available pieces and budget.
 * Ensures balanced representation when all categories have pieces.
 *
 * @param {Object} groups - Grouped pieces by freshness
 * @param {number} maxSamples - Maximum total samples allowed
 * @returns {Object} Allocation per category { fresh, fading, sleepy }
 */
function calculateAllocation(groups, maxSamples) {
  const allocation = { fresh: 0, fading: 0, sleepy: 0 }

  // Count available pieces per category
  const available = {
    fresh: groups.fresh.length,
    fading: groups.fading.length,
    sleepy: groups.sleepy.length,
  }

  // If total available is less than max, take all
  const totalAvailable = available.fresh + available.fading + available.sleepy
  if (totalAvailable <= maxSamples) {
    return { ...available }
  }

  // Determine which categories have pieces
  const categoriesWithPieces = ['fresh', 'fading', 'sleepy'].filter(
    (cat) => available[cat] > 0
  )

  // Calculate proportional allocation based on targets and availability
  // Start with minimum targets, respecting available pieces
  let remaining = maxSamples

  // First pass: allocate minimums to each category
  for (const cat of categoriesWithPieces) {
    const minTarget = FRESHNESS_TARGETS[cat].min
    const toAllocate = Math.min(minTarget, available[cat], remaining)
    allocation[cat] = toAllocate
    remaining -= toAllocate
  }

  // Second pass: distribute remaining slots up to max targets
  // Prioritize categories that still have pieces and haven't hit max
  for (const cat of categoriesWithPieces) {
    if (remaining <= 0) break

    const currentAlloc = allocation[cat]
    const maxTarget = FRESHNESS_TARGETS[cat].max
    const canAdd = Math.min(
      maxTarget - currentAlloc,
      available[cat] - currentAlloc,
      remaining
    )

    if (canAdd > 0) {
      allocation[cat] += canAdd
      remaining -= canAdd
    }
  }

  // Third pass: if still remaining, allocate proportionally to categories with more pieces
  if (remaining > 0) {
    for (const cat of categoriesWithPieces) {
      if (remaining <= 0) break

      const canAdd = Math.min(available[cat] - allocation[cat], remaining)
      if (canAdd > 0) {
        allocation[cat] += canAdd
        remaining -= canAdd
      }
    }
  }

  return allocation
}

/**
 * Smart sampling of pieces based on freshness distribution.
 * Prioritizes pieces needing review while maintaining balance.
 *
 * Sampling strategy:
 * - Returns all pieces for sparse mode (< 8 pieces)
 * - For other modes, samples based on freshness:
 *   - 3-5 fresh pieces (recently reviewed)
 *   - 3-5 fading pieces (need review soon)
 *   - 2-3 sleepy pieces (urgent review needed)
 * - Ensures zone representation when possible
 * - Returns deterministic results for same input
 *
 * @param {Array|null|undefined} pieces - Array of piece objects
 * @param {string} [mode] - Optional density mode override (auto-calculated if not provided)
 * @returns {Array} Sampled pieces (new array, never mutates input)
 */
export function samplePieces(pieces, mode) {
  // Handle null/undefined/empty input
  if (!pieces || !Array.isArray(pieces) || pieces.length === 0) {
    return []
  }

  // Determine density mode
  const densityMode = mode || getDensityMode(pieces.length)
  const maxSamples = MAX_SAMPLES[densityMode] || MAX_SAMPLES[DENSITY_MODES.CROWDED]

  // For sparse mode, return all pieces
  if (densityMode === DENSITY_MODES.SPARSE) {
    return [...pieces]
  }

  // Group pieces by freshness
  const groups = groupByFreshness(pieces)

  // Calculate balanced allocation for each category
  const allocation = calculateAllocation(groups, maxSamples)

  // Sample from each category based on calculated allocation
  const sampled = []

  // Sort each group deterministically before sampling
  const sortedGroups = {
    fresh: [...groups.fresh].sort((a, b) =>
      String(a.id || '').localeCompare(String(b.id || ''))
    ),
    fading: [...groups.fading].sort((a, b) =>
      String(a.id || '').localeCompare(String(b.id || ''))
    ),
    sleepy: [...groups.sleepy].sort((a, b) =>
      String(a.id || '').localeCompare(String(b.id || ''))
    ),
  }

  // Take allocated amount from each category
  sampled.push(...sortedGroups.sleepy.slice(0, allocation.sleepy))
  sampled.push(...sortedGroups.fading.slice(0, allocation.fading))
  sampled.push(...sortedGroups.fresh.slice(0, allocation.fresh))

  // Ensure zone representation by swapping if needed
  const sampledWithZones = ensureZoneRepresentationWithSwap(
    sampled,
    pieces,
    maxSamples
  )

  // Final sort for deterministic results
  const sorted = [...sampledWithZones].sort((a, b) => {
    const idA = String(a.id || '')
    const idB = String(b.id || '')
    return idA.localeCompare(idB)
  })

  return sorted.slice(0, maxSamples)
}

/**
 * Ensure zone representation by swapping pieces if necessary.
 * Replaces pieces from over-represented zones with pieces from missing zones.
 *
 * @param {Array} sampled - Currently sampled pieces
 * @param {Array} allPieces - All available pieces
 * @param {number} maxSamples - Maximum sample size
 * @returns {Array} Sampled pieces with improved zone representation
 */
function ensureZoneRepresentationWithSwap(sampled, allPieces, maxSamples) {
  const sampledIds = new Set(sampled.map((p) => p.id))

  // Count zones in sampled pieces
  const zoneCountMap = new Map()
  for (const p of sampled) {
    const zone = p.zone || 'default'
    zoneCountMap.set(zone, (zoneCountMap.get(zone) || 0) + 1)
  }

  // Find all unique zones in original pieces
  const allZones = new Set(allPieces.map((p) => p.zone || 'default'))

  // Find zones not yet represented
  const missingZones = [...allZones].filter((zone) => !zoneCountMap.has(zone))

  if (missingZones.length === 0) {
    return sampled
  }

  // Sort missing zones for deterministic order
  missingZones.sort()

  const result = [...sampled]

  for (const missingZone of missingZones) {
    // Find a piece from the missing zone that isn't already sampled
    const candidates = allPieces.filter(
      (p) => (p.zone || 'default') === missingZone && !sampledIds.has(p.id)
    )

    if (candidates.length === 0) {
      continue
    }

    // Sort candidates for deterministic selection
    const sortedCandidates = [...candidates].sort((a, b) =>
      String(a.id || '').localeCompare(String(b.id || ''))
    )
    const replacement = sortedCandidates[0]

    // If we're at max capacity, swap out a piece from an over-represented zone
    if (result.length >= maxSamples) {
      // Find zone with most pieces to swap from
      let maxZoneCount = 0
      let zoneToSwap = null
      for (const [zone, count] of zoneCountMap) {
        if (count > maxZoneCount) {
          maxZoneCount = count
          zoneToSwap = zone
        }
      }

      if (zoneToSwap && maxZoneCount > 1) {
        // Find the first piece from this zone to swap out
        const swapIndex = result.findIndex(
          (p) => (p.zone || 'default') === zoneToSwap
        )
        if (swapIndex >= 0) {
          const removed = result[swapIndex]
          sampledIds.delete(removed.id)
          result.splice(swapIndex, 1)
          zoneCountMap.set(zoneToSwap, maxZoneCount - 1)
        }
      } else {
        // Can't swap, skip this zone
        continue
      }
    }

    // Add the replacement piece
    result.push(replacement)
    sampledIds.add(replacement.id)
    zoneCountMap.set(missingZone, 1)
  }

  return result
}
