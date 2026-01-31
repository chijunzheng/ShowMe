/**
 * Game Config Tests
 *
 * Tests for game configuration constants including missions and power-ups.
 */

import { describe, it, expect } from 'vitest'
import { MISSIONS, POWER_UPS } from './gameConfig'

describe('gameConfig', () => {
  describe('MISSIONS', () => {
    it('exports MISSIONS object with daily and weekly categories', () => {
      expect(MISSIONS).toBeDefined()
      expect(MISSIONS.daily).toBeDefined()
      expect(MISSIONS.weekly).toBeDefined()
      expect(Array.isArray(MISSIONS.daily)).toBe(true)
      expect(Array.isArray(MISSIONS.weekly)).toBe(true)
    })

    describe('daily missions', () => {
      it('contains expected daily missions', () => {
        expect(MISSIONS.daily.length).toBeGreaterThan(0)
      })

      it('each daily mission has required properties', () => {
        MISSIONS.daily.forEach((mission) => {
          expect(mission.id).toBeDefined()
          expect(typeof mission.id).toBe('string')
          expect(mission.title).toBeDefined()
          expect(typeof mission.title).toBe('string')
          expect(mission.description).toBeDefined()
          expect(typeof mission.description).toBe('string')
          expect(mission.target).toBeDefined()
          expect(typeof mission.target).toBe('number')
          expect(mission.target).toBeGreaterThan(0)
          expect(mission.reward).toBeDefined()
          expect(mission.reward.xp).toBeDefined()
          expect(typeof mission.reward.xp).toBe('number')
        })
      })

      it('includes quiz champion mission', () => {
        const quizChampion = MISSIONS.daily.find((m) => m.id === 'daily_3_quizzes')
        expect(quizChampion).toBeDefined()
        expect(quizChampion.title).toBe('Quiz Champion')
        expect(quizChampion.target).toBe(3)
        expect(quizChampion.reward.xp).toBe(50)
      })

      it('includes streak master mission', () => {
        const streakMaster = MISSIONS.daily.find((m) => m.id === 'daily_streak_5')
        expect(streakMaster).toBeDefined()
        expect(streakMaster.title).toBe('Streak Master')
        expect(streakMaster.target).toBe(5)
        expect(streakMaster.reward.xp).toBe(30)
      })

      it('includes perfectionist mission', () => {
        const perfectionist = MISSIONS.daily.find((m) => m.id === 'daily_perfect')
        expect(perfectionist).toBeDefined()
        expect(perfectionist.title).toBe('Perfectionist')
        expect(perfectionist.target).toBe(1)
        expect(perfectionist.reward.xp).toBe(75)
      })
    })

    describe('weekly missions', () => {
      it('contains expected weekly missions', () => {
        expect(MISSIONS.weekly.length).toBeGreaterThan(0)
      })

      it('each weekly mission has required properties', () => {
        MISSIONS.weekly.forEach((mission) => {
          expect(mission.id).toBeDefined()
          expect(typeof mission.id).toBe('string')
          expect(mission.title).toBeDefined()
          expect(mission.description).toBeDefined()
          expect(mission.target).toBeDefined()
          expect(typeof mission.target).toBe('number')
          expect(mission.reward).toBeDefined()
          expect(mission.reward.xp).toBeDefined()
        })
      })

      it('includes explorer mission', () => {
        const explorer = MISSIONS.weekly.find((m) => m.id === 'weekly_topics_5')
        expect(explorer).toBeDefined()
        expect(explorer.title).toBe('Explorer')
        expect(explorer.target).toBe(5)
        expect(explorer.reward.xp).toBe(200)
      })
    })

    it('all mission IDs are unique', () => {
      const allMissions = [...MISSIONS.daily, ...MISSIONS.weekly]
      const ids = allMissions.map((m) => m.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('POWER_UPS', () => {
    it('exports POWER_UPS object', () => {
      expect(POWER_UPS).toBeDefined()
      expect(typeof POWER_UPS).toBe('object')
    })

    it('contains expected power-ups', () => {
      expect(POWER_UPS.extra_time).toBeDefined()
      expect(POWER_UPS.skip_question).toBeDefined()
      expect(POWER_UPS.hint).toBeDefined()
    })

    it('each power-up has required properties', () => {
      Object.values(POWER_UPS).forEach((powerUp) => {
        expect(powerUp.id).toBeDefined()
        expect(typeof powerUp.id).toBe('string')
        expect(powerUp.name).toBeDefined()
        expect(typeof powerUp.name).toBe('string')
        expect(powerUp.description).toBeDefined()
        expect(typeof powerUp.description).toBe('string')
        expect(powerUp.icon).toBeDefined()
        expect(typeof powerUp.icon).toBe('string')
        expect(powerUp.effect).toBeDefined()
        expect(powerUp.effect.type).toBeDefined()
        expect(powerUp.effect.value).toBeDefined()
      })
    })

    describe('extra_time power-up', () => {
      it('has correct configuration', () => {
        const extraTime = POWER_UPS.extra_time
        expect(extraTime.id).toBe('extra_time')
        expect(extraTime.name).toBe('Extra Time')
        expect(extraTime.description).toBe('+30 seconds')
        expect(extraTime.effect.type).toBe('time_bonus')
        expect(extraTime.effect.value).toBe(30)
      })
    })

    describe('skip_question power-up', () => {
      it('has correct configuration', () => {
        const skip = POWER_UPS.skip_question
        expect(skip.id).toBe('skip_question')
        expect(skip.name).toBe('Skip')
        expect(skip.description).toBe('Skip one challenge')
        expect(skip.effect.type).toBe('skip')
        expect(skip.effect.value).toBe(1)
      })
    })

    describe('hint power-up', () => {
      it('has correct configuration', () => {
        const hint = POWER_UPS.hint
        expect(hint.id).toBe('hint')
        expect(hint.name).toBe('Hint')
        expect(hint.description).toBe('Reveal one wrong answer')
        expect(hint.effect.type).toBe('hint')
        expect(hint.effect.value).toBe(1)
      })
    })

    it('all power-up IDs match their keys', () => {
      Object.entries(POWER_UPS).forEach(([key, powerUp]) => {
        expect(powerUp.id).toBe(key)
      })
    })
  })
})
