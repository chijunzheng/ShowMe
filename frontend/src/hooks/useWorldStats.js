/**
 * useWorldStats Hook
 * UI002: Fetches world state with XP, tier, and piece data for the home screen stats display.
 *
 * This hook provides:
 * - Total XP earned
 * - Current tier and progress to next tier
 * - Piece count for world preview
 * - Loading and error states
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

/**
 * Tier thresholds and XP requirements
 * Tiers are based on piece count, but we track XP for progress bars
 */
const TIER_CONFIG = {
  barren: {
    minPieces: 0,
    xpPerPiece: 50,
    nextTier: 'sprouting',
    icon: '🏜️',
    label: 'Barren',
  },
  sprouting: {
    minPieces: 5,
    xpPerPiece: 50,
    nextTier: 'growing',
    icon: '🌱',
    label: 'Sprouting',
  },
  growing: {
    minPieces: 15,
    xpPerPiece: 50,
    nextTier: 'thriving',
    icon: '🌿',
    label: 'Growing',
  },
  thriving: {
    minPieces: 30,
    xpPerPiece: 50,
    nextTier: 'legendary',
    icon: '🌳',
    label: 'Thriving',
  },
  legendary: {
    minPieces: 50,
    xpPerPiece: 50,
    nextTier: null,
    icon: '✨',
    label: 'Legendary',
  },
}

/**
 * Calculate tier based on piece count
 */
function calculateTier(pieceCount) {
  if (pieceCount >= 50) return 'legendary'
  if (pieceCount >= 30) return 'thriving'
  if (pieceCount >= 15) return 'growing'
  if (pieceCount >= 5) return 'sprouting'
  return 'barren'
}

/**
 * Calculate XP progress within current tier
 */
function calculateXPProgress(pieceCount, tier) {
  const tierConfig = TIER_CONFIG[tier]
  const currentTierXP = pieceCount * tierConfig.xpPerPiece
  const currentTierMinPieces = tierConfig.minPieces

  if (!tierConfig.nextTier) {
    // At max tier, show total XP
    return {
      current: currentTierXP,
      target: currentTierXP,
      percentage: 100,
    }
  }

  const nextTierConfig = TIER_CONFIG[tierConfig.nextTier]
  const piecesInCurrentTier = pieceCount - currentTierMinPieces
  const piecesToNextTier = nextTierConfig.minPieces - currentTierMinPieces

  const current = piecesInCurrentTier * tierConfig.xpPerPiece
  const target = piecesToNextTier * tierConfig.xpPerPiece

  return {
    current,
    target,
    percentage: Math.min(100, (current / target) * 100),
  }
}

/**
 * useWorldStats - Hook to fetch and manage world stats for home screen
 *
 * @param {string} clientId - User's client ID for API calls
 * @returns {Object} World stats including XP, tier, and pieces
 */
export default function useWorldStats(clientId) {
  const [worldStats, setWorldStats] = useState({
    totalXP: 0,
    tier: 'barren',
    tierConfig: TIER_CONFIG.barren,
    xpProgress: { current: 0, target: 250, percentage: 0 },
    pieceCount: 0,
    pieces: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true)

  /**
   * Fetch world state from API
   */
  const fetchWorldStats = useCallback(async () => {
    if (!clientId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(
        `${API_BASE}/api/world?clientId=${encodeURIComponent(clientId)}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch world stats')
      }

      const data = await response.json()
      const worldState = data.worldState || {}

      if (!isMountedRef.current) return

      const pieceCount = worldState.pieces?.length || 0
      const tier = worldState.tier || calculateTier(pieceCount)
      const tierConfig = TIER_CONFIG[tier]
      const xpProgress = calculateXPProgress(pieceCount, tier)
      const totalXP = pieceCount * tierConfig.xpPerPiece

      setWorldStats({
        totalXP,
        tier,
        tierConfig,
        xpProgress,
        pieceCount,
        pieces: worldState.pieces || [],
      })
    } catch (err) {
      if (!isMountedRef.current) return

      console.error('Failed to load world stats:', err)
      setError(err.message)

      // Set default stats on error
      setWorldStats({
        totalXP: 0,
        tier: 'barren',
        tierConfig: TIER_CONFIG.barren,
        xpProgress: { current: 0, target: 250, percentage: 0 },
        pieceCount: 0,
        pieces: [],
      })
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [clientId])

  /**
   * Fetch stats on mount and when clientId changes
   */
  useEffect(() => {
    isMountedRef.current = true
    fetchWorldStats()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchWorldStats])

  /**
   * Manual refresh function
   */
  const refresh = useCallback(() => {
    fetchWorldStats()
  }, [fetchWorldStats])

  return {
    ...worldStats,
    isLoading,
    error,
    refresh,
    TIER_CONFIG,
  }
}
