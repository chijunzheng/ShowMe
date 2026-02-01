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
 * Backend tiers are based on total XP, not piece count.
 */
const TIER_CONFIG = {
  barren: {
    icon: '🏜️',
    label: 'Barren',
  },
  sprouting: {
    icon: '🌱',
    label: 'Sprouting',
  },
  growing: {
    icon: '🌿',
    label: 'Growing',
  },
  thriving: {
    icon: '🌳',
    label: 'Thriving',
  },
  legendary: {
    icon: '✨',
    label: 'Legendary',
  },
}

const DEFAULT_TIER_THRESHOLDS = {
  barren: 0,
  sprouting: 100,
  growing: 300,
  thriving: 600,
  legendary: 1000,
}

const DEFAULT_TIER_ORDER = ['barren', 'sprouting', 'growing', 'thriving', 'legendary']

/**
 * Calculate tier based on total XP thresholds
 */
function calculateTierFromXP(totalXP, thresholds, order) {
  const safeXP = Number.isFinite(totalXP) ? totalXP : 0
  const tierOrder = Array.isArray(order) && order.length > 0 ? order : DEFAULT_TIER_ORDER
  const tierThresholds = thresholds && typeof thresholds === 'object' ? thresholds : DEFAULT_TIER_THRESHOLDS

  let currentTier = tierOrder[0] || 'barren'
  for (const tier of tierOrder) {
    const threshold = Number.isFinite(tierThresholds[tier]) ? tierThresholds[tier] : 0
    if (safeXP >= threshold) {
      currentTier = tier
    } else {
      break
    }
  }

  return currentTier
}

/**
 * Calculate XP progress within current tier
 */
function calculateXPProgress(totalXP, thresholds, order) {
  const safeXP = Number.isFinite(totalXP) ? totalXP : 0
  const tierOrder = Array.isArray(order) && order.length > 0 ? order : DEFAULT_TIER_ORDER
  const tierThresholds = thresholds && typeof thresholds === 'object' ? thresholds : DEFAULT_TIER_THRESHOLDS

  const currentTier = calculateTierFromXP(safeXP, tierThresholds, tierOrder)
  const currentIndex = tierOrder.indexOf(currentTier)
  const currentThreshold = Number.isFinite(tierThresholds[currentTier]) ? tierThresholds[currentTier] : 0
  const nextTier = currentIndex >= 0 && currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null

  if (!nextTier) {
    const current = Math.max(0, safeXP)
    return {
      current,
      target: Math.max(current, 1),
      percentage: 100,
      tier: currentTier,
    }
  }

  const nextThreshold = Number.isFinite(tierThresholds[nextTier]) ? tierThresholds[nextTier] : currentThreshold
  const target = Math.max(1, nextThreshold - currentThreshold)
  const current = Math.max(0, safeXP - currentThreshold)

  return {
    current,
    target,
    percentage: Math.min(100, (current / target) * 100),
    tier: currentTier,
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
    xpProgress: { current: 0, target: 100, percentage: 0 },
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
      const tierInfo = data.tiers || {}
      const tierThresholds = tierInfo.tiers || DEFAULT_TIER_THRESHOLDS
      const tierOrder = tierInfo.order || DEFAULT_TIER_ORDER

      if (!isMountedRef.current) return

      const pieceCount = worldState.pieces?.length || 0
      const totalXP = Number.isFinite(worldState.totalXP) ? worldState.totalXP : 0
      const xpProgress = calculateXPProgress(totalXP, tierThresholds, tierOrder)
      const tier = worldState.tier || xpProgress.tier
      const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.barren

      setWorldStats({
        totalXP,
        tier,
        tierConfig,
        xpProgress: {
          current: xpProgress.current,
          target: xpProgress.target,
          percentage: xpProgress.percentage,
        },
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
        xpProgress: { current: 0, target: 100, percentage: 0 },
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
