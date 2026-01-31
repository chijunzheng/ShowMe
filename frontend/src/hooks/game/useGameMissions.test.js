/**
 * useGameMissions Hook Tests
 *
 * Tests for the mission tracking and rewards system.
 * Uses mocked localStorage for persistence testing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameMissions } from './useGameMissions'
import { MISSIONS } from './gameConfig'

describe('useGameMissions', () => {
  let mockLocalStorage
  let originalDate

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {}
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      return mockLocalStorage[key] || null
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockLocalStorage[key] = value
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete mockLocalStorage[key]
    })

    // Store original Date
    originalDate = global.Date
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.Date = originalDate
  })

  describe('initialization', () => {
    it('initializes with empty progress when no localStorage data exists', () => {
      const { result } = renderHook(() => useGameMissions())

      expect(result.current.missionProgress).toBeDefined()
      expect(typeof result.current.missionProgress).toBe('object')
    })

    it('loads existing progress from localStorage', () => {
      const existingProgress = {
        daily_3_quizzes: { current: 2, claimed: false },
        lastDailyReset: new Date().toISOString().split('T')[0],
      }
      mockLocalStorage['showme_missions'] = JSON.stringify(existingProgress)

      const { result } = renderHook(() => useGameMissions())

      expect(result.current.missionProgress.daily_3_quizzes.current).toBe(2)
    })

    it('provides required functions', () => {
      const { result } = renderHook(() => useGameMissions())

      expect(typeof result.current.recordEvent).toBe('function')
      expect(typeof result.current.claimReward).toBe('function')
      expect(typeof result.current.getActiveMissions).toBe('function')
    })
  })

  describe('recordEvent', () => {
    it('updates quiz_complete event for daily_3_quizzes mission', () => {
      const { result } = renderHook(() => useGameMissions())

      act(() => {
        result.current.recordEvent('quiz_complete', {})
      })

      expect(result.current.missionProgress.daily_3_quizzes.current).toBe(1)
    })

    it('increments progress on multiple quiz_complete events', () => {
      const { result } = renderHook(() => useGameMissions())

      act(() => {
        result.current.recordEvent('quiz_complete', {})
        result.current.recordEvent('quiz_complete', {})
      })

      expect(result.current.missionProgress.daily_3_quizzes.current).toBe(2)
    })

    it('updates streak event for daily_streak_5 mission', () => {
      const { result } = renderHook(() => useGameMissions())

      act(() => {
        result.current.recordEvent('streak', { streak: 5 })
      })

      expect(result.current.missionProgress.daily_streak_5.current).toBe(5)
    })

    it('updates streak with max value (does not decrease)', () => {
      const { result } = renderHook(() => useGameMissions())

      act(() => {
        result.current.recordEvent('streak', { streak: 5 })
        result.current.recordEvent('streak', { streak: 3 })
      })

      expect(result.current.missionProgress.daily_streak_5.current).toBe(5)
    })

    it('updates perfect_score event for daily_perfect mission', () => {
      const { result } = renderHook(() => useGameMissions())

      act(() => {
        result.current.recordEvent('perfect_score', {})
      })

      expect(result.current.missionProgress.daily_perfect.current).toBe(1)
    })

    it('updates topic_learned event for weekly_topics_5 mission', () => {
      const { result } = renderHook(() => useGameMissions())

      act(() => {
        result.current.recordEvent('topic_learned', { topic: 'science' })
      })

      expect(result.current.missionProgress.weekly_topics_5.current).toBe(1)
    })

    it('tracks unique topics for weekly mission', () => {
      const { result } = renderHook(() => useGameMissions())

      act(() => {
        result.current.recordEvent('topic_learned', { topic: 'science' })
        result.current.recordEvent('topic_learned', { topic: 'science' })
        result.current.recordEvent('topic_learned', { topic: 'history' })
      })

      expect(result.current.missionProgress.weekly_topics_5.current).toBe(2)
    })

    it('persists progress to localStorage', () => {
      const { result } = renderHook(() => useGameMissions())

      act(() => {
        result.current.recordEvent('quiz_complete', {})
      })

      const stored = JSON.parse(mockLocalStorage['showme_missions'])
      expect(stored.daily_3_quizzes.current).toBe(1)
    })

    it('handles unknown event types gracefully', () => {
      const { result } = renderHook(() => useGameMissions())

      expect(() => {
        act(() => {
          result.current.recordEvent('unknown_event', {})
        })
      }).not.toThrow()
    })
  })

  describe('claimReward', () => {
    it('returns reward for completed mission', () => {
      const { result } = renderHook(() => useGameMissions())

      // Complete the mission first
      act(() => {
        result.current.recordEvent('quiz_complete', {})
        result.current.recordEvent('quiz_complete', {})
        result.current.recordEvent('quiz_complete', {})
      })

      let reward
      act(() => {
        reward = result.current.claimReward('daily_3_quizzes')
      })

      expect(reward).toEqual({ xp: 50 })
    })

    it('marks mission as claimed', () => {
      const { result } = renderHook(() => useGameMissions())

      // Complete the mission
      act(() => {
        result.current.recordEvent('quiz_complete', {})
        result.current.recordEvent('quiz_complete', {})
        result.current.recordEvent('quiz_complete', {})
      })

      act(() => {
        result.current.claimReward('daily_3_quizzes')
      })

      expect(result.current.missionProgress.daily_3_quizzes.claimed).toBe(true)
    })

    it('returns null for incomplete mission', () => {
      const { result } = renderHook(() => useGameMissions())

      act(() => {
        result.current.recordEvent('quiz_complete', {})
      })

      let reward
      act(() => {
        reward = result.current.claimReward('daily_3_quizzes')
      })

      expect(reward).toBeNull()
    })

    it('returns null for already claimed mission', () => {
      const { result } = renderHook(() => useGameMissions())

      // Complete and claim
      act(() => {
        result.current.recordEvent('quiz_complete', {})
        result.current.recordEvent('quiz_complete', {})
        result.current.recordEvent('quiz_complete', {})
      })

      act(() => {
        result.current.claimReward('daily_3_quizzes')
      })

      // Try to claim again
      let secondReward
      act(() => {
        secondReward = result.current.claimReward('daily_3_quizzes')
      })

      expect(secondReward).toBeNull()
    })

    it('returns null for invalid mission ID', () => {
      const { result } = renderHook(() => useGameMissions())

      let reward
      act(() => {
        reward = result.current.claimReward('invalid_mission')
      })

      expect(reward).toBeNull()
    })

    it('persists claimed status to localStorage', () => {
      const { result } = renderHook(() => useGameMissions())

      act(() => {
        result.current.recordEvent('quiz_complete', {})
        result.current.recordEvent('quiz_complete', {})
        result.current.recordEvent('quiz_complete', {})
      })

      act(() => {
        result.current.claimReward('daily_3_quizzes')
      })

      const stored = JSON.parse(mockLocalStorage['showme_missions'])
      expect(stored.daily_3_quizzes.claimed).toBe(true)
    })
  })

  describe('getActiveMissions', () => {
    it('returns all unclaimed missions', () => {
      const { result } = renderHook(() => useGameMissions())

      const activeMissions = result.current.getActiveMissions()

      expect(Array.isArray(activeMissions)).toBe(true)
      expect(activeMissions.length).toBe(MISSIONS.daily.length + MISSIONS.weekly.length)
    })

    it('includes progress data for each mission', () => {
      const { result } = renderHook(() => useGameMissions())

      act(() => {
        result.current.recordEvent('quiz_complete', {})
      })

      const activeMissions = result.current.getActiveMissions()
      const quizMission = activeMissions.find((m) => m.id === 'daily_3_quizzes')

      expect(quizMission.current).toBe(1)
      expect(quizMission.target).toBe(3)
      expect(quizMission.claimed).toBe(false)
    })

    it('excludes claimed missions', () => {
      const { result } = renderHook(() => useGameMissions())

      // Complete and claim a mission
      act(() => {
        result.current.recordEvent('quiz_complete', {})
        result.current.recordEvent('quiz_complete', {})
        result.current.recordEvent('quiz_complete', {})
      })

      act(() => {
        result.current.claimReward('daily_3_quizzes')
      })

      const activeMissions = result.current.getActiveMissions()
      const quizMission = activeMissions.find((m) => m.id === 'daily_3_quizzes')

      expect(quizMission).toBeUndefined()
    })

    it('includes mission type (daily/weekly)', () => {
      const { result } = renderHook(() => useGameMissions())

      const activeMissions = result.current.getActiveMissions()
      const dailyMission = activeMissions.find((m) => m.id === 'daily_3_quizzes')
      const weeklyMission = activeMissions.find((m) => m.id === 'weekly_topics_5')

      expect(dailyMission.type).toBe('daily')
      expect(weeklyMission.type).toBe('weekly')
    })
  })

  describe('daily reset', () => {
    it('resets daily missions at midnight', () => {
      // Set up yesterday's progress
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      mockLocalStorage['showme_missions'] = JSON.stringify({
        daily_3_quizzes: { current: 2, claimed: false },
        daily_streak_5: { current: 3, claimed: false },
        lastDailyReset: yesterdayStr,
      })

      const { result } = renderHook(() => useGameMissions())

      // Daily missions should be reset
      expect(result.current.missionProgress.daily_3_quizzes.current).toBe(0)
      expect(result.current.missionProgress.daily_streak_5.current).toBe(0)
    })

    it('preserves weekly missions on daily reset', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      mockLocalStorage['showme_missions'] = JSON.stringify({
        daily_3_quizzes: { current: 2, claimed: false },
        weekly_topics_5: { current: 3, claimed: false, topics: ['a', 'b', 'c'] },
        lastDailyReset: yesterdayStr,
        lastWeeklyReset: new Date().toISOString().split('T')[0],
      })

      const { result } = renderHook(() => useGameMissions())

      expect(result.current.missionProgress.weekly_topics_5.current).toBe(3)
    })

    it('does not reset if already reset today', () => {
      const todayStr = new Date().toISOString().split('T')[0]

      mockLocalStorage['showme_missions'] = JSON.stringify({
        daily_3_quizzes: { current: 2, claimed: false },
        lastDailyReset: todayStr,
      })

      const { result } = renderHook(() => useGameMissions())

      expect(result.current.missionProgress.daily_3_quizzes.current).toBe(2)
    })

    it('updates lastDailyReset after reset', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      mockLocalStorage['showme_missions'] = JSON.stringify({
        daily_3_quizzes: { current: 2, claimed: false },
        lastDailyReset: yesterdayStr,
      })

      renderHook(() => useGameMissions())

      const stored = JSON.parse(mockLocalStorage['showme_missions'])
      const todayStr = new Date().toISOString().split('T')[0]
      expect(stored.lastDailyReset).toBe(todayStr)
    })
  })

  describe('weekly reset', () => {
    it('resets weekly missions on Monday', () => {
      // Mock current date as Monday
      const mockMonday = new Date('2025-01-27T10:00:00Z') // This is a Monday
      vi.setSystemTime(mockMonday)

      // Last reset was last week
      const lastWeek = new Date('2025-01-20T10:00:00Z')
      const lastWeekStr = lastWeek.toISOString().split('T')[0]

      mockLocalStorage['showme_missions'] = JSON.stringify({
        weekly_topics_5: { current: 3, claimed: false, topics: ['a', 'b', 'c'] },
        lastWeeklyReset: lastWeekStr,
        lastDailyReset: mockMonday.toISOString().split('T')[0],
      })

      const { result } = renderHook(() => useGameMissions())

      expect(result.current.missionProgress.weekly_topics_5.current).toBe(0)
    })

    it('does not reset weekly missions if already reset this week', () => {
      // Mock current date as Wednesday
      const mockWednesday = new Date('2025-01-29T10:00:00Z')
      vi.setSystemTime(mockWednesday)

      // Last reset was Monday (this week)
      const thisMonday = new Date('2025-01-27T10:00:00Z')
      const thisMondayStr = thisMonday.toISOString().split('T')[0]

      mockLocalStorage['showme_missions'] = JSON.stringify({
        weekly_topics_5: { current: 3, claimed: false, topics: ['a', 'b', 'c'] },
        lastWeeklyReset: thisMondayStr,
        lastDailyReset: mockWednesday.toISOString().split('T')[0],
      })

      const { result } = renderHook(() => useGameMissions())

      expect(result.current.missionProgress.weekly_topics_5.current).toBe(3)
    })

    it('preserves daily missions on weekly reset', () => {
      // Mock current date as Monday
      const mockMonday = new Date('2025-01-27T10:00:00Z')
      vi.setSystemTime(mockMonday)

      const lastWeek = new Date('2025-01-20T10:00:00Z')

      mockLocalStorage['showme_missions'] = JSON.stringify({
        daily_3_quizzes: { current: 2, claimed: false },
        weekly_topics_5: { current: 3, claimed: false },
        lastWeeklyReset: lastWeek.toISOString().split('T')[0],
        lastDailyReset: mockMonday.toISOString().split('T')[0],
      })

      const { result } = renderHook(() => useGameMissions())

      expect(result.current.missionProgress.daily_3_quizzes.current).toBe(2)
    })
  })

  describe('error handling', () => {
    it('handles corrupted localStorage data gracefully', () => {
      mockLocalStorage['showme_missions'] = 'invalid json{'

      expect(() => {
        renderHook(() => useGameMissions())
      }).not.toThrow()
    })

    it('handles localStorage quota exceeded gracefully', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      const { result } = renderHook(() => useGameMissions())

      expect(() => {
        act(() => {
          result.current.recordEvent('quiz_complete', {})
        })
      }).not.toThrow()
    })
  })
})
