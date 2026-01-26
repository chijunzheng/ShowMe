/**
 * useUserProgress Hook
 * GAMIFY-003: Manages user progress state and API interactions
 * v2.0: Added XP tracking, level info, and XP earned notifications
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

// Generate or retrieve a persistent client ID
function getClientId() {
  const storageKey = 'showme_client_id'
  let clientId = localStorage.getItem(storageKey)

  if (!clientId) {
    clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(storageKey, clientId)
  }

  return clientId
}

export default function useUserProgress() {
  const [progress, setProgress] = useState(null)
  const [levelInfo, setLevelInfo] = useState(null)
  const [badges, setBadges] = useState({})
  const [xpConfig, setXpConfig] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newBadges, setNewBadges] = useState([])
  // XP earned notification state
  const [xpEarned, setXpEarned] = useState(null) // { amount, breakdown }
  const [leveledUp, setLeveledUp] = useState(false)

  const clientId = useRef(getClientId()).current

  // Load progress on mount
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(
          `${API_BASE}/api/user/progress?clientId=${encodeURIComponent(clientId)}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch progress')
        }

        const data = await response.json()
        setProgress(data.progress)
        setLevelInfo(data.levelInfo)
        setBadges(data.badges || {})
        setXpConfig(data.xpConfig || {})
        setError(null)
      } catch (err) {
        console.error('Failed to load user progress:', err)
        setError(err.message)
        // Set default progress on error
        setProgress({
          clientId,
          totalQuestions: 0,
          totalSocraticAnswers: 0,
          streakCount: 0,
          longestStreak: 0,
          points: 0,
          badges: []
        })
        setLevelInfo({
          level: 1,
          name: 'Curious',
          currentXP: 0,
          nextLevelXP: 20,
          totalXP: 0,
          progress: 0
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProgress()
  }, [clientId])

  // Record an activity and update progress
  const recordActivity = useCallback(async (action) => {
    try {
      const response = await fetch(`${API_BASE}/api/user/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, action })
      })

      if (!response.ok) {
        throw new Error('Failed to record activity')
      }

      const data = await response.json()
      setProgress(data.progress)
      setLevelInfo(data.levelInfo)

      // Track XP earned for popup notification
      if (data.xpEarned > 0) {
        setXpEarned({ amount: data.xpEarned, breakdown: data.xpBreakdown || [] })
      }

      // Track level up
      if (data.leveledUp) {
        setLeveledUp(true)
      }

      // Track newly unlocked badges for toast notifications
      if (data.newBadges && data.newBadges.length > 0) {
        setNewBadges(data.newBadgeDetails || [])
      }

      return {
        success: true,
        xpEarned: data.xpEarned,
        xpBreakdown: data.xpBreakdown,
        levelInfo: data.levelInfo,
        leveledUp: data.leveledUp,
        newBadges: data.newBadges || []
      }
    } catch (err) {
      console.error('Failed to record activity:', err)
      return { success: false, error: err.message }
    }
  }, [clientId])

  // Clear new badges (after showing toasts)
  const clearNewBadges = useCallback(() => {
    setNewBadges([])
  }, [])

  // Clear XP earned notification (after showing popup)
  const clearXpEarned = useCallback(() => {
    setXpEarned(null)
  }, [])

  // Clear level up notification
  const clearLeveledUp = useCallback(() => {
    setLeveledUp(false)
  }, [])

  // Convenience methods for common actions
  const recordQuestionAsked = useCallback(() => {
    return recordActivity('question_asked')
  }, [recordActivity])

  const recordSocraticAnswered = useCallback((score) => {
    // Use socratic_perfect for 5-star answers
    const action = score >= 5 ? 'socratic_perfect' : 'socratic_answered'
    return recordActivity(action)
  }, [recordActivity])

  const recordDeepLevelUsed = useCallback(() => {
    return recordActivity('deep_level_used')
  }, [recordActivity])

  return {
    // State
    progress,
    levelInfo,
    badges,
    xpConfig,
    isLoading,
    error,
    clientId,
    // Notifications
    newBadges,
    xpEarned,
    leveledUp,
    // Clear functions
    clearNewBadges,
    clearXpEarned,
    clearLeveledUp,
    // Actions
    recordActivity,
    recordQuestionAsked,
    recordSocraticAnswered,
    recordDeepLevelUsed
  }
}
