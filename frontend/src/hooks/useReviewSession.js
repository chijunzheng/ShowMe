/**
 * useReviewSession Hook
 * Manages spaced repetition review sessions for world pieces
 *
 * Features:
 * - Calculates which pieces need review (older than threshold)
 * - Manages review queue and current piece
 * - Tracks review session state
 * - Calls API to record review results
 *
 * T001: Calculate pieces needing review based on lastReviewedAt
 * T002: Start review session with queue of pieces
 * T003: Complete review and move to next piece
 * T004: Record review results via API
 */

import { useState, useCallback, useMemo } from 'react'
import { getClientId } from '../utils/clientId'
import { toApiUrl } from '../utils/api'

/**
 * Number of days before a piece needs review
 * Pieces older than this threshold will appear in the "Strengthen" section
 */
const REVIEW_THRESHOLD_DAYS = 7

/**
 * useReviewSession - Hook for managing spaced repetition review sessions
 *
 * @param {Array} worldPieces - Array of world pieces from user's collection
 * @returns {Object} Hook state and methods
 */
export function useReviewSession(worldPieces = []) {
  // Queue of pieces to review (excluding current)
  const [reviewQueue, setReviewQueue] = useState([])

  // Currently displayed piece for review
  const [currentReviewPiece, setCurrentReviewPiece] = useState(null)

  // Whether a review session is active
  const [isReviewing, setIsReviewing] = useState(false)

  // Loading state for API calls
  const [isRecording, setIsRecording] = useState(false)

  // Error state
  const [reviewError, setReviewError] = useState(null)

  /**
   * Calculate pieces needing review (T001)
   * Filters pieces where lastReviewedAt or unlockedAt is older than threshold
   * Sorts by oldest first (most urgent)
   */
  const piecesNeedingReview = useMemo(() => {
    return worldPieces
      .filter(piece => {
        // Use lastReviewedAt if available, otherwise fall back to unlockedAt
        const reviewDate = piece.lastReviewedAt || piece.unlockedAt
        if (!reviewDate) return false

        // Calculate days since last review
        const daysSince = (Date.now() - new Date(reviewDate).getTime()) / (1000 * 60 * 60 * 24)
        return daysSince > REVIEW_THRESHOLD_DAYS
      })
      .sort((a, b) => {
        // Sort by date (oldest first = most urgent)
        const dateA = new Date(a.lastReviewedAt || a.unlockedAt)
        const dateB = new Date(b.lastReviewedAt || b.unlockedAt)
        return dateA - dateB
      })
  }, [worldPieces])

  /**
   * Start a review session with given pieces (T002)
   * If no pieces provided, uses piecesNeedingReview
   *
   * @param {Array} pieces - Optional specific pieces to review
   */
  const startReviewSession = useCallback((pieces = piecesNeedingReview) => {
    if (pieces.length === 0) {
      console.log('No pieces to review')
      return
    }

    // Set first piece as current, rest as queue
    setCurrentReviewPiece(pieces[0])
    setReviewQueue(pieces.slice(1))
    setIsReviewing(true)
    setReviewError(null)
  }, [piecesNeedingReview])

  /**
   * Start a single piece review (convenience method)
   *
   * @param {Object} piece - Single piece to review
   */
  const startSingleReview = useCallback((piece) => {
    if (!piece) return
    startReviewSession([piece])
  }, [startReviewSession])

  /**
   * Record review result and move to next piece (T003, T004)
   *
   * @param {number} score - Score achieved (0-100 or 0-3)
   * @param {boolean} passed - Whether the review was passed (typically 2/3+)
   */
  const completeCurrentReview = useCallback(async (score, passed) => {
    if (!currentReviewPiece) return

    setIsRecording(true)
    setReviewError(null)

    try {
      // Call API to record review result
      const response = await fetch(toApiUrl('/api/world/piece/review'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: getClientId(),
          pieceId: currentReviewPiece.id,
          score,
          passed,
        }),
      })

      if (!response.ok) {
        console.warn('Failed to record review:', response.status)
        // Still continue to next review but return failure status
        return { success: false, error: 'API error', status: response.status }
      }
    } catch (error) {
      // Log but don't block - review can still continue
      console.error('Failed to record review:', error)
    } finally {
      setIsRecording(false)
    }

    // Move to next piece in queue or end session
    if (reviewQueue.length > 0) {
      setCurrentReviewPiece(reviewQueue[0])
      setReviewQueue(prev => prev.slice(1))
    } else {
      // No more pieces - end session
      setCurrentReviewPiece(null)
      setIsReviewing(false)
    }
  }, [currentReviewPiece, reviewQueue])

  /**
   * End the review session early
   * Clears queue and current piece without recording
   */
  const endReviewSession = useCallback(() => {
    setReviewQueue([])
    setCurrentReviewPiece(null)
    setIsReviewing(false)
    setReviewError(null)
  }, [])

  /**
   * Skip current piece without recording result
   * Moves to next piece in queue
   */
  const skipCurrentPiece = useCallback(() => {
    if (reviewQueue.length > 0) {
      setCurrentReviewPiece(reviewQueue[0])
      setReviewQueue(prev => prev.slice(1))
    } else {
      setCurrentReviewPiece(null)
      setIsReviewing(false)
    }
  }, [reviewQueue])

  return {
    // State
    piecesNeedingReview,
    reviewCount: piecesNeedingReview.length,
    isReviewing,
    currentReviewPiece,
    reviewQueue,
    isRecording,
    reviewError,

    // Actions
    startReviewSession,
    startSingleReview,
    completeCurrentReview,
    endReviewSession,
    skipCurrentPiece,

    // Constants (for external reference)
    REVIEW_THRESHOLD_DAYS,
  }
}

export default useReviewSession
