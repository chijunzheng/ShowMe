/**
 * useUserProgress Hook
 * GAMIFY-003: Manages user progress state and API interactions
 * T010: Loads progress on mount
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
  const [badges, setBadges] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newBadges, setNewBadges] = useState([])

  const clientId = useRef(getClientId()).current

  // Load progress on mount (T010)
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
        setBadges(data.badges || {})
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

      // Track newly unlocked badges for toast notifications
      if (data.newBadges && data.newBadges.length > 0) {
        setNewBadges(data.newBadgeDetails || [])
      }

      return { success: true, newBadges: data.newBadges || [] }
    } catch (err) {
      console.error('Failed to record activity:', err)
      return { success: false, error: err.message }
    }
  }, [clientId])

  // Clear new badges (after showing toasts)
  const clearNewBadges = useCallback(() => {
    setNewBadges([])
  }, [])

  // Convenience methods for common actions
  const recordQuestionAsked = useCallback(() => {
    return recordActivity('question_asked')
  }, [recordActivity])

  const recordSocraticAnswered = useCallback(() => {
    return recordActivity('socratic_answered')
  }, [recordActivity])

  const recordDeepLevelUsed = useCallback(() => {
    return recordActivity('deep_level_used')
  }, [recordActivity])

  return {
    progress,
    badges,
    isLoading,
    error,
    clientId,
    newBadges,
    clearNewBadges,
    recordActivity,
    recordQuestionAsked,
    recordSocraticAnswered,
    recordDeepLevelUsed
  }
}
