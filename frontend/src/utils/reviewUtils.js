/**
 * Review Status Utilities
 *
 * Shared utilities for calculating review status across the app.
 * Used by LivingWorldView, TreeTab, ProgressTab, and other components
 * that need to determine when topics are due for review.
 */

/**
 * Days before a topic needs review (shows "fading" indicator)
 */
export const REVIEW_THRESHOLD_DAYS = 7

/**
 * Days before a topic is overdue (shows "due" indicator)
 */
export const REVIEW_OVERDUE_DAYS = 14

/**
 * Review status enum
 */
export const REVIEW_STATUS = {
  FRESH: 'fresh',
  FADING: 'fading',
  DUE: 'due',
}

/**
 * Calculate days since a given date
 *
 * @param {Date|string|null} date - Date to calculate from
 * @returns {number} Days since the date (Infinity if no date)
 */
export function getDaysSinceDate(date) {
  if (!date) return Infinity

  const dateObj = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(dateObj.getTime())) return Infinity

  const diffMs = Date.now() - dateObj.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Calculate days since a piece was last reviewed
 * Falls back to unlockedAt if no lastReviewedAt exists
 *
 * @param {Object} piece - Piece object with lastReviewedAt and/or unlockedAt
 * @returns {number} Days since last review (0 if no dates available)
 */
export function getDaysSinceReview(piece) {
  if (!piece) return 0

  const dateStr = piece.lastReviewedAt || piece.unlockedAt
  if (!dateStr) return 0

  return getDaysSinceDate(dateStr)
}

/**
 * Get review status for a piece
 *
 * @param {Object} piece - Piece object with lastReviewedAt and/or unlockedAt
 * @returns {'fresh'|'fading'|'due'} Review status
 */
export function getReviewStatus(piece) {
  const days = getDaysSinceReview(piece)

  if (days > REVIEW_OVERDUE_DAYS) return REVIEW_STATUS.DUE
  if (days > REVIEW_THRESHOLD_DAYS) return REVIEW_STATUS.FADING
  return REVIEW_STATUS.FRESH
}

/**
 * Get review status from explicit dates
 *
 * @param {Date|string|null} lastReviewedAt - Last review date
 * @param {Date|string|null} unlockedAt - Unlock date (fallback)
 * @returns {'fresh'|'fading'|'due'} Review status
 */
export function getReviewStatusFromDates(lastReviewedAt, unlockedAt) {
  const days = getDaysSinceDate(lastReviewedAt || unlockedAt)

  if (days > REVIEW_OVERDUE_DAYS) return REVIEW_STATUS.DUE
  if (days > REVIEW_THRESHOLD_DAYS) return REVIEW_STATUS.FADING
  return REVIEW_STATUS.FRESH
}

/**
 * Check if a piece needs review (fading or due)
 *
 * @param {Object} piece - Piece object
 * @returns {boolean} True if piece needs review
 */
export function needsReview(piece) {
  const status = getReviewStatus(piece)
  return status === REVIEW_STATUS.FADING || status === REVIEW_STATUS.DUE
}

/**
 * Check if a piece is overdue for review
 *
 * @param {Object} piece - Piece object
 * @returns {boolean} True if piece is overdue
 */
export function isOverdue(piece) {
  return getReviewStatus(piece) === REVIEW_STATUS.DUE
}
