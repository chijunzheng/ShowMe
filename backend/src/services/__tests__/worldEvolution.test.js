/**
 * World Evolution Service Tests
 *
 * Living World state is persisted elsewhere; this module owns the in-memory
 * representation and tier/topic bookkeeping.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import {
  createInitialWorldState,
  calculateTier,
  evolveWorld,
  getEvolutionWorldState,
  resetEvolutionWorldState,
  setEvolutionWorldState,
  WORLD_STYLE,
} from '../worldEvolution.js'

describe('worldEvolution', () => {
  const clientId = 'test-client-123'

  beforeEach(() => {
    resetEvolutionWorldState(clientId)
  })

  afterEach(() => {
    resetEvolutionWorldState(clientId)
  })

  describe('createInitialWorldState', () => {
    it('returns a minimal valid structure', () => {
      const state = createInitialWorldState(clientId)

      expect(state.clientId).toBe(clientId)
      expect(state.worldImageUrl).toBeNull()
      expect(state.styleDescriptor).toBe(WORLD_STYLE.base)

      expect(Array.isArray(state.topicsLearned)).toBe(true)
      expect(state.topicsLearned).toEqual([])
      expect(Array.isArray(state.evolutions)).toBe(true)
      expect(state.evolutions).toEqual([])

      expect(state.tier).toBe('barren')
      expect(state.totalTopics).toBe(0)

      expect(state.createdAt).toBeInstanceOf(Date)
      expect(state.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('calculateTier', () => {
    it('progresses tiers at expected thresholds', () => {
      expect(calculateTier(0)).toBe('barren')
      expect(calculateTier(4)).toBe('barren')
      expect(calculateTier(5)).toBe('sprouting')
      expect(calculateTier(14)).toBe('sprouting')
      expect(calculateTier(15)).toBe('growing')
      expect(calculateTier(29)).toBe('growing')
      expect(calculateTier(30)).toBe('thriving')
      expect(calculateTier(49)).toBe('thriving')
      expect(calculateTier(50)).toBe('legendary')
      expect(calculateTier(500)).toBe('legendary')
    })
  })

  describe('getEvolutionWorldState / setEvolutionWorldState', () => {
    it('returns null for a new client', () => {
      const result = getEvolutionWorldState('missing-client')
      expect(result.worldState).toBeNull()
      expect(result.error).toBeNull()
    })

    it('hydrates state into the in-memory cache', () => {
      const now = new Date()
      const stored = {
        clientId,
        worldImageUrl: 'data:image/png;base64,abc',
        styleDescriptor: WORLD_STYLE.base,
        topicsLearned: ['Topic A'],
        evolutions: [
          {
            topicName: 'Topic A',
            summary: 'Summary',
            elementAdded: 'a small landmark',
            placementHint: 'midground center',
            model: 'gemini-3-pro-image-preview',
            addedAt: now,
          },
        ],
        tier: 'barren',
        totalTopics: 1,
        createdAt: now,
        updatedAt: now,
      }

      setEvolutionWorldState(clientId, stored)
      const result = getEvolutionWorldState(clientId)
      expect(result.worldState).toBeDefined()
      expect(result.worldState.clientId).toBe(clientId)
      expect(result.worldState.totalTopics).toBe(1)
    })
  })

  describe('evolveWorld', () => {
    it('records a topic and increments totalTopics', async () => {
      const result = await evolveWorld(clientId, 'LTE Network', 'Wireless radio access', {
        elementAdded: 'a small cell tower with antennas',
        placementHint: 'midground right near rocks',
        model: 'gemini-3-pro-image-preview',
      })

      expect(result.tier).toBe('barren')
      expect(result.tierUpgrade).toBeNull()
      expect(result.changesApplied.tierChanged).toBe(false)
      expect(result.changesApplied.elementAdded).toBe('a small cell tower with antennas')
      expect(result.changesApplied.placementHint).toBe('midground right near rocks')

      const state = getEvolutionWorldState(clientId).worldState
      expect(state).toBeDefined()
      expect(state.totalTopics).toBe(1)
      expect(state.topicsLearned).toEqual(['LTE Network'])
      expect(state.evolutions.length).toBe(1)
      expect(state.evolutions[0].topicName).toBe('LTE Network')
      expect(state.evolutions[0].elementAdded).toBe('a small cell tower with antennas')
    })

    it('skips duplicate topics (case-insensitive)', async () => {
      await evolveWorld(clientId, 'Ocean Life', 'Sea creatures')
      const result = await evolveWorld(clientId, 'ocean life', 'Duplicate casing')

      expect(result.changesApplied.skipped).toBe(true)
      expect(result.changesApplied.reason).toBe('TOPIC_ALREADY_APPLIED')

      const state = getEvolutionWorldState(clientId).worldState
      expect(state.totalTopics).toBe(1)
      expect(state.topicsLearned).toEqual(['Ocean Life'])
      expect(state.evolutions.length).toBe(1)
    })
  })
})

