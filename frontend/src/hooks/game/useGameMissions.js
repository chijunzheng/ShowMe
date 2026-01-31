/**
 * useGameMissions Hook
 *
 * Manages mission tracking, progress, and rewards for the gamification system.
 * Persists data to localStorage with automatic daily/weekly reset logic.
 */

import { useState, useCallback, useEffect } from 'react'
import { MISSIONS } from './gameConfig'

const STORAGE_KEY = 'showme_missions'

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Check if today is Monday (day 1 in JS Date)
 */
function isMonday() {
  return new Date().getDay() === 1
}

/**
 * Get the Monday of the current week as a date string
 */
function getCurrentWeekMonday() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}

/**
 * Create initial progress state for all missions
 */
function createInitialProgress() {
  const progress = {
    lastDailyReset: getTodayString(),
    lastWeeklyReset: getCurrentWeekMonday(),
  }

  MISSIONS.daily.forEach((mission) => {
    progress[mission.id] = { current: 0, claimed: false }
  })

  MISSIONS.weekly.forEach((mission) => {
    progress[mission.id] = { current: 0, claimed: false, topics: [] }
  })

  return progress
}

/**
 * Load progress from localStorage with error handling
 */
function loadProgress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return createInitialProgress()
    }
    return JSON.parse(stored)
  } catch {
    return createInitialProgress()
  }
}

/**
 * Save progress to localStorage with error handling
 */
function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Silently fail on quota exceeded or other errors
  }
}

/**
 * Check and perform daily reset if needed
 */
function checkDailyReset(progress) {
  const today = getTodayString()
  if (progress.lastDailyReset === today) {
    return progress
  }

  // Reset daily missions
  const newProgress = { ...progress, lastDailyReset: today }
  MISSIONS.daily.forEach((mission) => {
    newProgress[mission.id] = { current: 0, claimed: false }
  })

  return newProgress
}

/**
 * Check and perform weekly reset if needed (on Monday)
 */
function checkWeeklyReset(progress) {
  const currentMonday = getCurrentWeekMonday()

  // If last reset was before this week's Monday, reset
  if (progress.lastWeeklyReset < currentMonday) {
    const newProgress = { ...progress, lastWeeklyReset: currentMonday }
    MISSIONS.weekly.forEach((mission) => {
      newProgress[mission.id] = { current: 0, claimed: false, topics: [] }
    })
    return newProgress
  }

  return progress
}

/**
 * Find mission definition by ID
 */
function findMission(missionId) {
  const dailyMission = MISSIONS.daily.find((m) => m.id === missionId)
  if (dailyMission) {
    return { mission: dailyMission, type: 'daily' }
  }

  const weeklyMission = MISSIONS.weekly.find((m) => m.id === missionId)
  if (weeklyMission) {
    return { mission: weeklyMission, type: 'weekly' }
  }

  return null
}

/**
 * Hook for managing game missions
 */
export function useGameMissions() {
  const [missionProgress, setMissionProgress] = useState(() => {
    let progress = loadProgress()
    progress = checkDailyReset(progress)
    progress = checkWeeklyReset(progress)
    saveProgress(progress)
    return progress
  })

  // Persist progress changes to localStorage
  useEffect(() => {
    saveProgress(missionProgress)
  }, [missionProgress])

  /**
   * Record an event and update relevant mission progress
   */
  const recordEvent = useCallback((type, data) => {
    setMissionProgress((prev) => {
      const newProgress = { ...prev }

      switch (type) {
        case 'quiz_complete': {
          const missionData = newProgress.daily_3_quizzes || { current: 0, claimed: false }
          newProgress.daily_3_quizzes = {
            ...missionData,
            current: missionData.current + 1,
          }
          break
        }

        case 'streak': {
          const { streak } = data
          const missionData = newProgress.daily_streak_5 || { current: 0, claimed: false }
          // Only update if new streak is higher
          if (streak > missionData.current) {
            newProgress.daily_streak_5 = {
              ...missionData,
              current: streak,
            }
          }
          break
        }

        case 'perfect_score': {
          const missionData = newProgress.daily_perfect || { current: 0, claimed: false }
          newProgress.daily_perfect = {
            ...missionData,
            current: missionData.current + 1,
          }
          break
        }

        case 'topic_learned': {
          const { topic } = data
          const missionData = newProgress.weekly_topics_5 || {
            current: 0,
            claimed: false,
            topics: [],
          }
          const topics = missionData.topics || []

          // Only count unique topics
          if (!topics.includes(topic)) {
            newProgress.weekly_topics_5 = {
              ...missionData,
              current: missionData.current + 1,
              topics: [...topics, topic],
            }
          }
          break
        }

        default:
          // Unknown event type, no-op
          break
      }

      return newProgress
    })
  }, [])

  /**
   * Claim reward for a completed mission
   * Returns the reward if successful, null otherwise
   */
  const claimReward = useCallback(
    (missionId) => {
      const missionInfo = findMission(missionId)
      if (!missionInfo) {
        return null
      }

      const { mission } = missionInfo
      const missionData = missionProgress[missionId]

      if (!missionData) {
        return null
      }

      // Check if mission is complete and not claimed
      if (missionData.current < mission.target || missionData.claimed) {
        return null
      }

      // Mission is complete and unclaimed - grant reward
      setMissionProgress((prev) => ({
        ...prev,
        [missionId]: {
          ...prev[missionId],
          claimed: true,
        },
      }))

      return mission.reward
    },
    [missionProgress]
  )

  /**
   * Get all active (unclaimed) missions with their progress
   */
  const getActiveMissions = useCallback(() => {
    const activeMissions = []

    MISSIONS.daily.forEach((mission) => {
      const progress = missionProgress[mission.id] || { current: 0, claimed: false }
      if (!progress.claimed) {
        activeMissions.push({
          ...mission,
          current: progress.current,
          claimed: progress.claimed,
          type: 'daily',
        })
      }
    })

    MISSIONS.weekly.forEach((mission) => {
      const progress = missionProgress[mission.id] || { current: 0, claimed: false }
      if (!progress.claimed) {
        activeMissions.push({
          ...mission,
          current: progress.current,
          claimed: progress.claimed,
          type: 'weekly',
        })
      }
    })

    return activeMissions
  }, [missionProgress])

  return {
    missionProgress,
    recordEvent,
    claimReward,
    getActiveMissions,
  }
}
