/**
 * useCelebrations Hook
 * Manages all celebration-related state for gamification feedback
 *
 * Handles:
 * - Confetti display
 * - Achievement toasts
 * - Piece unlock celebrations
 * - Tier upgrade celebrations
 * - Evolution celebrations
 * - Connection scene reveals
 * - Quick XP toasts
 */

import { useState, useCallback } from 'react'

export function useCelebrations() {
  // Confetti and badge toasts
  const [showConfetti, setShowConfetti] = useState(false)
  const [currentToastBadge, setCurrentToastBadge] = useState(null)

  // Piece unlock celebration
  const [unlockedPiece, setUnlockedPiece] = useState(null)
  const [showPieceCelebration, setShowPieceCelebration] = useState(false)

  // Tier upgrade celebration
  const [showTierCelebration, setShowTierCelebration] = useState(false)
  const [tierUpgradeInfo, setTierUpgradeInfo] = useState(null)

  // Quick XP toast
  const [showQuickXpToast, setShowQuickXpToast] = useState(false)
  const [quickXpEarned, setQuickXpEarned] = useState(0)

  // Connection scene reveal
  const [pendingSceneReveal, setPendingSceneReveal] = useState(null)

  /**
   * Show a badge achievement celebration
   * Note: Sound effect should be played by caller if needed
   */
  const showBadgeCelebration = useCallback((badge) => {
    setCurrentToastBadge(badge)
    setShowConfetti(true)
  }, [])

  /**
   * Handle badge toast dismissal
   */
  const handleToastDismiss = useCallback(() => {
    setCurrentToastBadge(null)
  }, [])

  /**
   * Handle confetti animation completion
   */
  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false)
  }, [])

  /**
   * Show piece unlock celebration
   */
  const showPieceUnlock = useCallback((piece) => {
    setUnlockedPiece(piece)
    setShowPieceCelebration(true)
  }, [])

  /**
   * Dismiss piece unlock celebration
   */
  const dismissPieceCelebration = useCallback(() => {
    setShowPieceCelebration(false)
    setUnlockedPiece(null)
  }, [])

  /**
   * Show tier upgrade celebration
   */
  const showTierUpgrade = useCallback((upgradeInfo) => {
    setTierUpgradeInfo(upgradeInfo)
    setShowTierCelebration(true)
  }, [])

  /**
   * Dismiss tier upgrade celebration
   */
  const dismissTierCelebration = useCallback(() => {
    setShowTierCelebration(false)
    setTierUpgradeInfo(null)
  }, [])

  /**
   * Show quick XP earned toast
   */
  const showQuickXp = useCallback((xpAmount) => {
    setQuickXpEarned(xpAmount)
    setShowQuickXpToast(true)
  }, [])

  /**
   * Dismiss quick XP toast
   */
  const dismissQuickXpToast = useCallback(() => {
    setShowQuickXpToast(false)
  }, [])

  /**
   * Show connection scene reveal celebration
   */
  const showSceneReveal = useCallback((params) => {
    if (!params?.scene?.imageUrl) return
    setPendingSceneReveal({
      scene: params.scene,
      pocketName: params.pocketName,
      pocketIcon: params.pocketIcon,
      pieceCount: params.pieceCount,
    })
  }, [])

  /**
   * Dismiss connection scene reveal
   */
  const dismissSceneReveal = useCallback(() => {
    setPendingSceneReveal(null)
  }, [])

  return {
    // Confetti state
    showConfetti,
    currentToastBadge,
    showBadgeCelebration,
    handleToastDismiss,
    handleConfettiComplete,

    // Piece unlock state
    unlockedPiece,
    showPieceCelebration,
    showPieceUnlock,
    dismissPieceCelebration,

    // Tier upgrade state
    showTierCelebration,
    tierUpgradeInfo,
    showTierUpgrade,
    dismissTierCelebration,

    // Quick XP state
    showQuickXpToast,
    quickXpEarned,
    showQuickXp,
    dismissQuickXpToast,

    // Scene reveal state
    pendingSceneReveal,
    showSceneReveal,
    dismissSceneReveal,
  }
}

export default useCelebrations
